"""Tarik pesan baru dari channel Discord dan simpan sebagai arsip JSON per hari.

Dijalankan berkala oleh GitHub Actions. Bot tidak perlu online terus: tiap run cukup
meminta pesan setelah id terakhir yang sudah tersimpan lewat REST API Discord.
Hanya pakai pustaka standar supaya runner tidak perlu `pip install`.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

API = "https://discord.com/api/v10"
WIB = timezone(timedelta(hours=7))

ROOT = Path(__file__).parent
PUBLIC = ROOT / "public"
DATA_DIR = PUBLIC / "data"
MEDIA_DIR = PUBLIC / "media"
INDEX_FILE = DATA_DIR / "index.json"
STATE_FILE = ROOT / "state.json"

PAGE_SIZE = 100  # maksimum yang diizinkan Discord per permintaan
MAX_MEDIA_BYTES = 8 * 1024 * 1024
MAX_RETRIES = 5
USER_AGENT = "DiscordBot (https://github.com/AnotherUserU/dc-arsip, 1.0)"

# Lampiran Discord memakai URL bertanda tangan yang kedaluwarsa (~24 jam), jadi gambar
# dari host ini diunduh ke repo. URL dari situs lain dibiarkan apa adanya.
DISCORD_CDN_HOSTS = {"cdn.discordapp.com", "media.discordapp.net"}

# 0 = pesan biasa, 19 = balasan, 20 = hasil slash command. Sisanya pesan sistem.
ARCHIVED_TYPES = {0, 19, 20}


class DiscordError(RuntimeError):
    pass


def _request(path: str, token: str) -> object:
    req = urllib.request.Request(
        f"{API}{path}",
        headers={"Authorization": f"Bot {token}", "User-Agent": USER_AGENT},
    )
    for _ in range(MAX_RETRIES):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 429:
                retry_after = json.loads(err.read() or b"{}").get("retry_after", 1)
                time.sleep(float(retry_after) + 0.5)
                continue
            body = err.read().decode("utf-8", "replace")[:300]
            hint = {
                401: "token bot salah atau sudah di-reset",
                403: "bot belum punya izin View Channel / Read Message History di channel ini",
                404: "ID channel tidak ditemukan atau bot belum masuk server",
            }.get(err.code, "")
            raise DiscordError(f"{err.code} untuk {path}: {hint} {body}".strip()) from err
    raise DiscordError(f"Terus kena rate limit untuk {path}")


def fetch_new_messages(channel_id: str, after: str, token: str) -> list[dict]:
    """Semua pesan setelah id `after`, urut lama → baru.

    Dengan parameter `after`, Discord mengembalikan 100 pesan tertua setelah id itu,
    jadi halaman berikutnya dimulai dari id terbesar halaman sebelumnya.
    """
    collected: list[dict] = []
    cursor = after
    while True:
        query = urllib.parse.urlencode({"after": cursor, "limit": PAGE_SIZE})
        page = _request(f"/channels/{channel_id}/messages?{query}", token)
        if not page:
            break
        page.sort(key=lambda m: int(m["id"]))
        collected.extend(page)
        cursor = page[-1]["id"]
        if len(page) < PAGE_SIZE:
            break
    return collected


def _safe_name(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]", "_", name)[-80:] or "berkas"


def keep_media(url: str | None, message_id: str, name: str | None = None) -> str | None:
    """Unduh gambar dari CDN Discord ke public/media dan kembalikan path lokalnya.

    URL dari host lain dikembalikan apa adanya. Kalau unduhan gagal, URL asli tetap
    dipakai supaya pesannya tidak hilang dari arsip hanya karena gambarnya.
    """
    if not url:
        return None
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in DISCORD_CDN_HOSTS:
        return url
    filename = f"{message_id}-{_safe_name(name or Path(parsed.path).name)}"
    target = MEDIA_DIR / filename
    if target.exists():
        return f"media/{filename}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read(MAX_MEDIA_BYTES + 1)
    except (urllib.error.URLError, TimeoutError) as err:
        print(f"  ! gagal unduh {filename}: {err}", file=sys.stderr)
        return url
    if len(data) > MAX_MEDIA_BYTES:
        print(f"  ! {filename} lebih dari 8 MB, tidak diunduh", file=sys.stderr)
        return url
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return f"media/{filename}"


def _clean_embed(embed: dict, message_id: str) -> dict:
    image = (embed.get("image") or {}).get("url")
    thumb = (embed.get("thumbnail") or {}).get("url")
    out = {
        "title": embed.get("title"),
        "description": embed.get("description"),
        "url": embed.get("url"),
        "color": embed.get("color"),
        "author": (embed.get("author") or {}).get("name"),
        "footer": (embed.get("footer") or {}).get("text"),
        "image": keep_media(image, message_id),
        "thumbnail": keep_media(thumb, message_id),
        "fields": [
            {"name": f.get("name", ""), "value": f.get("value", "")}
            for f in embed.get("fields") or []
        ],
    }
    return {k: v for k, v in out.items() if v not in (None, "", [])}


def is_archivable(message: dict) -> bool:
    """Lewati pesan sistem (join, pin, boost) dan pesan kosong."""
    if message.get("type", 0) not in ARCHIVED_TYPES:
        return False
    return bool(message.get("content") or message.get("embeds") or message.get("attachments"))


def normalize(message: dict, channel_name: str) -> dict:
    """Ambil hanya bagian pesan yang perlu ditampilkan di situs."""
    msg_id = message["id"]
    author = message.get("author") or {}
    attachments = []
    for att in message.get("attachments") or []:
        is_image = (att.get("content_type") or "").startswith("image/")
        attachments.append({
            "name": att.get("filename", "berkas"),
            "url": keep_media(att.get("url"), msg_id, att.get("filename")) if is_image else att.get("url"),
            "image": is_image,
        })
    return {
        "id": msg_id,
        "channel_id": message.get("channel_id"),
        "channel": channel_name,
        "ts": message["timestamp"],
        "author": author.get("global_name") or author.get("username") or "?",
        "content": message.get("content", ""),
        "embeds": [_clean_embed(e, msg_id) for e in message.get("embeds") or []],
        "attachments": attachments,
    }


def wib_day(iso_ts: str) -> str:
    return datetime.fromisoformat(iso_ts).astimezone(WIB).strftime("%Y-%m-%d")


def _read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def merge_into_days(entries: list[dict]) -> set[str]:
    """Gabungkan entri ke berkas harian (dedup per id). Kembalikan tanggal yang berubah."""
    by_day: dict[str, list[dict]] = {}
    for entry in entries:
        by_day.setdefault(wib_day(entry["ts"]), []).append(entry)
    for day, new in by_day.items():
        path = DATA_DIR / f"{day}.json"
        merged = {e["id"]: e for e in _read_json(path, [])}
        merged.update({e["id"]: e for e in new})
        _write_json(path, sorted(merged.values(), key=lambda e: int(e["id"])))
    return set(by_day)


def rebuild_index(channels: dict[str, str]) -> None:
    days = []
    for path in sorted(DATA_DIR.glob("????-??-??.json"), reverse=True):
        days.append({"date": path.stem, "count": len(_read_json(path, []))})
    _write_json(INDEX_FILE, {
        "updated": datetime.now(WIB).isoformat(timespec="seconds"),
        "channels": channels,
        "days": days,
    })


def main() -> int:
    token = os.environ.get("DISCORD_BOT_TOKEN", "").strip()
    channel_ids = [c.strip() for c in os.environ.get("DISCORD_CHANNEL_IDS", "").split(",") if c.strip()]
    if not token or not channel_ids:
        print("Isi DISCORD_BOT_TOKEN dan DISCORD_CHANNEL_IDS (pisahkan dengan koma).", file=sys.stderr)
        return 2
    if not all(c.isdigit() for c in channel_ids):
        print("DISCORD_CHANNEL_IDS harus berisi angka ID channel.", file=sys.stderr)
        return 2

    state = _read_json(STATE_FILE, {})
    known_channels = _read_json(INDEX_FILE, {}).get("channels", {})
    channels = dict(known_channels)
    total = 0
    for channel_id in channel_ids:
        info = _request(f"/channels/{channel_id}", token)
        name = info.get("name") or channel_id
        channels[channel_id] = name
        raw = fetch_new_messages(channel_id, state.get(channel_id, "0"), token)
        if not raw:
            print(f"#{name}: tidak ada pesan baru")
            continue
        entries = [normalize(m, name) for m in raw if is_archivable(m)]
        merge_into_days(entries)
        state[channel_id] = raw[-1]["id"]
        total += len(entries)
        print(f"#{name}: {len(entries)} pesan baru")

    # Index hanya ditulis ulang kalau ada isi baru. Kalau tiap run menulis cap waktu baru,
    # tiap run (tiap 30 menit) menghasilkan commit dan deploy Vercel walau tidak ada berita.
    if total or channels != known_channels:
        rebuild_index(channels)
    _write_json(STATE_FILE, state)
    print(f"Selesai, {total} pesan diarsipkan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
