"""Ubah data datamine terpilih di bc-data/ (lokal, tidak di-commit) menjadi public/data/game.json.

Hanya tabel statistik yang dipublikasikan. Yang sengaja tidak ikut: source hasil decompile,
script, log pertempuran (BC Combat Ledger.json, BC Air Defense Intel.html), dan kolom pengenal
internal dari kode game (id, template, atribut stok, kunci unlock). Teks tooltip dibersihkan dari
angka milik akun pengambil data, misalnya "(you have 12000)".

Jalankan ulang setiap kali bc-data diperbarui:  python build_game_data.py
"""

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "bc-data"
OUT = ROOT / "public" / "data" / "game.json"

# Label kolom dalam dua bahasa. Kolom yang tidak ada di sini memakai teks header aslinya.
LABELS_ID = {
    "Name": "Nama", "Building": "Bangunan", "Cost": "Harga", "Price": "Harga", "Base price": "Harga dasar",
    "Menu price": "Harga menu", "Population": "Penduduk", "Happiness": "Happiness", "Income/cycle": "Income/cycle",
    "Upkeep": "Upkeep", "Net income/cycle": "Bersih/cycle", "Net per $1000 cost": "Bersih per $1000",
    "Net per worker": "Bersih per pekerja", "Workers": "Pekerja", "Energy use": "Energi", "Needs water": "Butuh air",
    "Steel": "Steel", "Serves citizens": "Melayani penduduk", "Footprint (stud)": "Tapak (stud)",
    "Footprint (jalan)": "Tapak (ubin jalan)", "Road studs": "Jarak jalan (stud)", "Unlock level": "Level buka",
    "Other": "Lainnya", "Category": "Kategori", "Subcategory": "Subkategori",
    "Width X (stud)": "Lebar X (stud)", "Depth Z (stud)": "Dalam Z (stud)",
    "Width X (road tiles)": "Lebar X (ubin jalan)", "Depth Z (road tiles)": "Dalam Z (ubin jalan)",
    "From level": "Dari level", "To level": "Ke level", "Cost (x building price)": "Biaya (× harga bangunan)",
    "Cumulative (x price)": "Kumulatif (× harga)", "Income at new level": "Income di level baru",
    "Shop income/payout": "Shop income/payout", "Citizen support": "Dukungan penduduk", "Maintenance": "Perawatan",
    "New copy payback (payouts, gross)": "Balik modal copy baru (payout)", "Upgrade 0->1 cost": "Upgrade 0→1",
    "0->1 payback (payouts)": "Balik modal 0→1 (payout)", "Upgrade 4->5 cost": "Upgrade 4→5",
    "Upgrade 9->10 cost": "Upgrade 9→10", "9->10 payback (payouts)": "Balik modal 9→10 (payout)",
    "Cost to max (0->10)": "Biaya sampai maks (0→10)", "Max-out payback (payouts)": "Balik modal maks (payout)",
    "Income at lvl 10": "Income level 10",
    "Air range": "Jangkauan udara", "Air ceiling": "Ketinggian udara", "Close range": "Jarak dekat",
    "Missile range": "Jangkauan rudal", "Missile ceiling": "Ketinggian rudal",
    "Battery template": "Baterai", "Interceptor": "Interceptor", "Batteries seen": "Baterai terlihat",
    "Shots": "Tembakan", "Kills": "Kena", "Misses": "Meleset", "Lost target": "Kehilangan target",
    "No result": "Tanpa hasil", "Hit rate %": "Hit rate %", "Kills on drones": "Kena drone",
    "Kills on cruise": "Kena cruise", "Kills on ballistic": "Kena balistik", "Kills on hypersonic": "Kena hipersonik",
    "Kills unmatched": "Kena (jenis tak dikenali)", "Median time to result (s)": "Median waktu hasil (dtk)",
    "Top speed": "Kecepatan maks",
    "Attacker missile": "Rudal penyerang", "Launched": "Diluncurkan", "Intercepted": "Dicegat", "Leak %": "Lolos %",
    "Kills by battery": "Dicegat oleh baterai", "Missile": "Rudal", "Class": "Kelas", "Samples": "Sampel",
    "Start speed": "Kecepatan awal", "End (terminal) speed": "Kecepatan akhir",
    "Avg ground speed (straight line/flight time)": "Kecepatan rata-rata", "Flight time (s)": "Waktu terbang (dtk)",
    "Distance (studs)": "Jarak (stud)", "Arc height": "Tinggi lengkung", "Leak % (this war)": "Lolos % (perang ini)",
    "unitName": "Unit", "combatRole": "Peran", "maxHealth": "HP maks", "moneyCost": "Harga",
    "cycleTime": "Waktu produksi (dtk)", "engageRange": "Jarak serang", "disengageRange": "Jarak lepas",
    "infantryDamage": "Damage infanteri", "vehicleDamage": "Damage kendaraan", "infantryRadius": "Radius infanteri",
    "shotInterval": "Jeda tembak", "projectileSpeed": "Kecepatan proyektil", "missChance": "Peluang meleset",
    "infantryMissChance": "Meleset ke infanteri", "cargoDamageFraction": "Damage ke muatan", "maxSpeed": "Kecepatan maks",
    "acceleration": "Akselerasi", "range": "Jangkauan", "reloadSeconds": "Isi ulang (dtk)", "rockets": "Roket",
    "militaryPack": "Military pack", "name": "Nama", "detail": "Keterangan", "health": "HP", "accel": "Akselerasi",
    "turnRadius": "Radius belok", "sonarRange": "Jangkauan sonar", "airChannels": "Kanal udara",
    "interceptorGap": "Jeda interceptor", "gun": "Meriam", "CIWS mounts": "CIWS", "torpedo": "Torpedo",
    "torpedo count": "Jumlah torpedo", "chaff": "Chaff", "decoys": "Decoy", "VLS loadout": "Isi VLS",
    "skins (France / Russia)": "Skin (Prancis / Rusia)", "kind": "Jenis", "role": "Peran", "minRange": "Jarak min",
    "airRange": "Jangkauan udara", "speed": "Kecepatan", "shellSpeed": "Kecepatan peluru", "chance": "Peluang kena",
    "airChance": "Kena udara", "ballisticChance": "Kena balistik", "damage": "Damage", "unitDamage": "Damage unit",
    "buildingDamage": "Damage bangunan", "radius": "Radius", "unitRadius": "Radius unit",
    "buildingRadius": "Radius bangunan", "reload": "Isi ulang", "cooldown": "Jeda", "burst": "Burst",
    "ripple": "Ripple", "salvo": "Salvo", "missileModel": "Model rudal", "payload": "Muatan", "seeker": "Seeker",
    "turnRate": "Laju belok", "Role": "Peran", "Kind": "Jenis", "Range": "Jangkauan", "Min range": "Jarak min",
    "Speed": "Kecepatan", "Hit chance": "Peluang kena", "Ballistic chance": "Kena balistik",
    "Unit damage": "Damage unit", "Unit radius": "Radius unit", "Building damage": "Damage bangunan",
    "Building radius": "Radius bangunan", "Ripple (s)": "Ripple (dtk)", "Missile model": "Model rudal",
    "Notes": "Catatan", "Cycle (s)": "Waktu produksi (dtk)", "Output/cycle": "Hasil/produksi", "Damage": "Damage",
    "Health": "HP", "Military pack": "Military pack", "Research": "Riset", "Research cost": "Biaya riset",
    "Research time (s)": "Waktu riset (dtk)", "Item": "Barang", "Money": "Uang", "Fuel": "Fuel", "Factory": "Pabrik",
    "Tooltip (in-game text)": "Teks tooltip (dari game)",
}

# Kolom pengenal internal dari kode game: tidak berguna untuk pembaca dan tidak dipublikasikan.
DROP_COLUMNS = {"id", "Template", "Stock attribute", "Unlock"}
YOU_HAVE = re.compile(r"\s*\(you have [\d.,]+\)", re.I)


def tr(id_text, en_text):
    return {"id": id_text, "en": en_text}


def to_number(value):
    """Angka biasa jadi float/int; selain itu None (teks seperti '4 x 4' atau 'x1.06' tetap teks)."""
    text = value.strip().replace("$", "")
    if not re.fullmatch(r"-?\d+(\.\d+)?", text):
        return None
    number = float(text)
    return int(number) if number.is_integer() else number


def clean_text(value):
    return YOU_HAVE.sub("", value).strip()


def table_from_csv(path, table_id, title, note=None, drop=(), best=()):
    """Baca CSV jadi tabel: kolom bernomor otomatis kalau semua isinya angka.

    best: daftar (header, "low"/"high", jumlah) untuk menyorot nilai terbaik di kolom itu.
    """
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        raw_rows = [row for row in reader if any(cell.strip() for cell in row)]
    keep = [i for i, h in enumerate(header) if h not in DROP_COLUMNS and h not in drop]
    columns = []
    for i in keep:
        values = [row[i].strip() for row in raw_rows if i < len(row) and row[i].strip()]
        numeric = bool(values) and all(to_number(v) is not None for v in values)
        columns.append({"label": tr(LABELS_ID.get(header[i], header[i]), header[i]), "num": numeric})
    rows = []
    for row in raw_rows:
        cells = []
        for col, i in zip(columns, keep):
            value = clean_text(row[i]) if i < len(row) else ""
            cells.append(to_number(value) if col["num"] and value else (value or None))
        rows.append(cells)
    table = {"id": table_id, "title": title, "columns": columns, "rows": rows}
    if note:
        table["note"] = note
    marks = []
    for col_header, order, top in best:
        index = [header[i] for i in keep].index(col_header)
        marks.append({"col": index, "order": order, "top": top})
    if marks:
        table["best"] = marks
    return table


ZONES = [
    tr("Jenis zona tengah: Uranium Mine, Airport, City, Oil Field, Mining Site, Industrial Zone, "
       "dan Nuclear Power Plant.",
       "Central zone types: Uranium Mine, Airport, City, Oil Field, Mining Site, Industrial Zone, "
       "and Nuclear Power Plant."),
    tr("Ada 3 Oil Rig yang hanya bisa direbut dengan kapal.", "There are 3 Oil Rigs that can only be captured by ships."),
    tr("Aturan capture: zona direbut kalau unitmu satu-satunya unit di dalam batas zona.",
       "Capture rule: a zone is captured when your units are the only units inside its boundary."),
    tr("Perk zona yang dikuasai (datamine): energi ×1,35, industri ×1,35, biaya produksi senjata ×0,8.",
       "Perks of a held zone (datamine): energy ×1.35, industry ×1.35, weapon production cost ×0.8."),
]

POLITICS = [
    tr("Shuffle kandidat: biaya 25 PP, pool 5 kandidat.", "Candidate shuffle: costs 25 PP, pool of 5 candidates."),
    tr("Peluang bintang 1–5: 30% / 30% / 22% / 13% / 5%.", "Star chances 1–5: 30% / 30% / 22% / 13% / 5%."),
    tr("Kandidat langka Augustus Vale (0,01%): Visionary, bonus jabatan 2×, masa jabatan 7 hari.",
       "Rare candidate Augustus Vale (0.01%): Visionary, 2× office bonus, 7-day term."),
    tr("Kandidat langka Dark Horse (0,01%): Nationalism.", "Rare candidate Dark Horse (0.01%): Nationalism."),
    tr("Presiden: +1,5% semua stat per bintang dan +0,5 happiness.",
       "President: +1.5% to all stats per star and +0.5 happiness."),
    tr("Menteri: +2% per bintang. Interior: +1 happiness per bintang.",
       "Minister: +2% per star. Interior: +1 happiness per star."),
    tr("Bonus yang menumpuk berkurang 50%.", "Stacked bonuses are reduced by 50%."),
    tr("Pool nama Russia, France, dan USA hanya beda nama; tidak memengaruhi stat.",
       "The Russia, France, and USA name pools only differ in names; they do not affect stats."),
]


def build():
    f = lambda name: SRC / name  # noqa: E731
    payout = tr("1 payout = 30 detik.", "1 payout = 30 seconds.")
    sections = [
        {"id": "bangunan", "title": tr("Bangunan", "Buildings"), "tables": [
            table_from_csv(f("BC Building Stats + Grid.csv"), "bangunan-stat", tr("Statistik bangunan kota", "City building stats"),
                           tr("Income dan upkeep per payout (30 detik).", "Income and upkeep per payout (30 seconds).")),
            table_from_csv(f("BC Footprints.csv"), "bangunan-tapak", tr("Ukuran tapak", "Footprints"),
                           tr("Posisi tanpa rotasi; putar 90° = tukar X dan Z. 1 ubin jalan = 2 × 2 stud.",
                              "Unrotated; rotating 90° swaps X and Z. 1 road tile = 2 × 2 studs.")),
        ]},
        {"id": "upgrade", "title": tr("Upgrade", "Upgrades"), "tables": [
            table_from_csv(f("BC Upgrade Curve.csv"), "upgrade-kurva", tr("Kurva upgrade toko", "Shop upgrade curve"),
                           tr("+6% shop income per level, maks level 10 (×1,6).", "+6% shop income per level, max level 10 (×1.6).")),
            table_from_csv(f("BC Upgrade Payback.csv"), "upgrade-balik-modal", tr("Balik modal upgrade", "Upgrade payback"),
                           tr("Yang disorot = paling cepat balik modal. " + payout["id"],
                              "Highlighted = fastest payback. " + payout["en"]),
                           best=[("0->1 payback (payouts)", "low", 5), ("Max-out payback (payouts)", "low", 5),
                                 ("New copy payback (payouts, gross)", "low", 5)]),
        ]},
        {"id": "air-defense", "title": tr("Air Defense", "Air Defense"), "tables": [
            table_from_csv(f("BC Air Defense.csv"), "ad-jangkauan", tr("Jangkauan dan ketinggian", "Range and ceiling")),
            table_from_csv(f("BC Air Defense Combat Stats.csv"), "ad-tempur", tr("Hasil tempur per baterai", "Combat results per battery"),
                           tr("Diukur dari perang nyata; perkiraan ±5–10 poin.", "Measured in real wars; roughly ±5–10 points."),
                           best=[("Hit rate %", "high", 3)]),
            table_from_csv(f("BC Attacker Leak Rates.csv"), "ad-lolos", tr("Rudal penyerang yang lolos", "Attacking missile leak rates"),
                           best=[("Leak %", "high", 3)]),
            table_from_csv(f("BC Attacker Missile Speeds.csv"), "ad-kecepatan", tr("Kecepatan rudal penyerang", "Attacking missile speeds")),
        ]},
        {"id": "militer", "title": tr("Militer", "Military"), "tables": [
            table_from_csv(f("BC Ground Units.csv"), "militer-darat", tr("Unit darat", "Ground units")),
            table_from_csv(f("BC Ship Classes.csv"), "militer-kapal", tr("Kelas kapal", "Ship classes")),
            table_from_csv(f("BC Ship Weapons.csv"), "militer-senjata-kapal", tr("Senjata kapal", "Ship weapons")),
            table_from_csv(f("BC Naval Weapons.csv"), "militer-senjata-laut", tr("Interceptor dan senjata laut", "Naval interceptors and weapons")),
            table_from_csv(f("BC Weapon Catalog.csv"), "militer-katalog", tr("Katalog senjata", "Weapon catalog")),
            table_from_csv(f("BC Weapon Recipes.csv"), "militer-resep", tr("Resep senjata", "Weapon recipes")),
        ]},
        {"id": "zona", "title": tr("Zona", "Zones"), "items": ZONES},
        {"id": "politik", "title": tr("Politik", "Politics"), "items": POLITICS},
        {"id": "glosarium", "title": tr("Glosarium", "Glossary"), "tables": [
            table_from_csv(f("BC Tooltips.csv"), "glosarium-tooltip", tr("Teks tooltip menu build", "Build menu tooltips"),
                           tr("Teks asli dari game (bahasa Inggris).", "Original in-game text.")),
        ]},
    ]
    used = [SRC / name for name in (
        "BC Building Stats + Grid.csv", "BC Footprints.csv", "BC Upgrade Curve.csv", "BC Upgrade Payback.csv",
        "BC Air Defense.csv", "BC Air Defense Combat Stats.csv", "BC Attacker Leak Rates.csv",
        "BC Attacker Missile Speeds.csv", "BC Ground Units.csv", "BC Ship Classes.csv", "BC Ship Weapons.csv",
        "BC Naval Weapons.csv", "BC Weapon Catalog.csv", "BC Weapon Recipes.csv", "BC Tooltips.csv")]
    newest = max(p.stat().st_mtime for p in used)
    updated = datetime.fromtimestamp(newest, timezone.utc).strftime("%Y-%m-%d")
    return {"updated": updated, "sections": sections}


def main():
    data = build()
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    rows = sum(len(t["rows"]) for s in data["sections"] for t in s.get("tables", []))
    print(f"{OUT.relative_to(ROOT)}: {len(data['sections'])} bagian, {rows} baris, per {data['updated']}")


if __name__ == "__main__":
    main()
