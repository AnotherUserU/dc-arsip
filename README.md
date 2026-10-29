# Arsip Discord

Arsip mentah pesan dari channel Discord, ditampilkan sebagai situs statis. Tiap 30 menit
GitHub Actions mengambil pesan baru lewat bot, menyimpannya apa adanya ke
`public/data/YYYY-MM-DD.json` (hari dihitung dalam WIB), lalu push. Push itu memicu Vercel
men-deploy ulang situs. Tidak ada ringkasan atau AI; teks, embed, dan lampiran disimpan verbatim.

## 1. Buat bot Discord

1. https://discord.com/developers/applications → **New Application**.
2. Menu **Bot**: **Reset Token** dan salin tokennya; nyalakan **Message Content Intent**;
   matikan **Public Bot**.
3. Menu **OAuth2 → URL Generator**: scope `bot`, permission **View Channels** +
   **Read Message History**. Buka URL-nya dan masukkan bot ke server.
4. Discord → User Settings → Advanced → **Developer Mode**. Klik kanan channel →
   **Copy Channel ID**.

## 2. Repo GitHub

Buat repo baru (misalnya `dc-arsip`), push folder ini, lalu di **Settings → Secrets and
variables → Actions** tambahkan:

| Secret | Isi |
|---|---|
| `DISCORD_BOT_TOKEN` | token bot dari langkah 1 |
| `DISCORD_CHANNEL_IDS` | ID channel; beberapa channel dipisah koma |

Lalu buka tab **Actions → Arsip Discord → Run workflow**. Run pertama mengambil seluruh
riwayat channel; run berikutnya hanya pesan baru.

## 3. Vercel

**Add New → Project**, impor repo ini, biarkan semua pengaturan default (`vercel.json`
sudah mengatur folder `public`). Selesai.

## Uji lokal

```bash
python -m unittest -v
```

```bash
python -m http.server 8000 --directory public
```

## Catatan

- Pesan yang diedit atau dihapus setelah diarsipkan tidak ikut berubah; arsip menyimpan
  versi saat pesan diambil.
- Gambar lampiran Discord diunduh ke `public/media/` karena URL CDN Discord kedaluwarsa.
  Gambar dari situs lain (misalnya thumbnail berita) tetap ditautkan ke sumber aslinya.
- Untuk mengarsip ulang dari awal, hapus `state.json` dan isi `public/data/`.
