# Arsip Discord

Arsip **mentah** pesan dari server Discord game milik user (untuk seru-seruan), tampil sebagai
situs statis di Vercel. Bukan proyek berita dan tidak berhubungan dengan bot ringkasan
Telegram di `D:\telegram`. Jangan tambahkan ringkasan, AI, atau pengolahan isi: pesan
disimpan dan ditampilkan apa adanya.

Bahasa: user berbahasa Indonesia; komentar kode, teks UI, dan pesan commit pakai bahasa Indonesia.

## Cara kerja

- `fetch_discord.py`: hanya stdlib, tanpa `pip install`. Lewat REST API bot (tanpa gateway),
  mengambil pesan setelah id terakhir per channel (`state.json`), lalu menggabungkannya
  (dedup per id) ke `public/data/YYYY-MM-DD.json` dengan batas hari WIB. `public/data/index.json`
  hanya ditulis ulang kalau ada pesan baru, supaya run kosong tidak membuat commit.
- Lampiran gambar dari CDN Discord diunduh ke `public/media/` karena URL-nya kedaluwarsa (~24 jam).
  URL dari host lain dibiarkan apa adanya.
- `public/`: HTML/CSS/JS polos, tanpa build. `app.js` merender markdown Discord dengan escape
  HTML dulu; tautan hanya http/https/`media/`. Pertahankan ini, karena isi pesan berasal dari
  pengguna (risiko XSS).
- `.github/workflows/arsip.yml`: cron `*/30`, menjalankan tes lalu fetch, dan commit hanya kalau
  ada perubahan. Commit harus atas nama `AnotherUserU` (bukan bot), karena Vercel Hobby
  memblokir deploy dari commit bot.

## Status (2026-10-29)

- Kode selesai, 7 unit test lolos (`python -m unittest -v`), tampilan sudah dicek dengan data
  contoh di desktop dan di lebar HP.
- **Belum**: commit pertama, repo GitHub, secrets (`DISCORD_BOT_TOKEN`, `DISCORD_CHANNEL_IDS`),
  impor ke Vercel, dan uji dengan bot asli. Langkah setup ada di `README.md`.
- User sedang membuat bot di Discord Developer Portal (server milik user sendiri).
  Token jangan pernah diminta lewat chat; masuknya lewat GitHub Secrets.

## Batasan yang disengaja

- Pesan yang diedit atau dihapus setelah diarsipkan tidak ikut berubah.
- Bukan real-time: jeda sampai ~30 menit.
- Pencarian memuat semua berkas harian di browser. Ini cukup untuk arsip kecil; kalau arsipnya
  sudah ribuan hari, pertimbangkan indeks pencarian.
