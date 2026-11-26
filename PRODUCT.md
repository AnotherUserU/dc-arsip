# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Anggota server Discord game Build And Conqueror. Mereka membuka arsip untuk membaca ulang
pengumuman yang terlewat atau mencari kabar lama. Dibuka di HP dan desktop dengan porsi
yang seimbang.

## Product Purpose
Arsip mentah pesan dari channel Discord server, ditampilkan sebagai situs statis yang
diperbarui tiap ~30 menit. Berhasil kalau anggota bisa menemukan dan membaca pengumuman
lama dengan nyaman, tanpa harus menggulir Discord.

Di halaman yang sama ada tampilan **Data Game**: tabel statistik game hasil datamine
(bangunan, upgrade, air defense, militer, zona, politik, glosarium) sebagai acuan cepat
anggota saat bermain.

## Positioning
Satu-satunya catatan permanen siaran server: Discord mudah tenggelam, arsip ini tidak.

## Operating Context
Channel utama saat ini `#bc`, berisi siaran berita roleplay dari dalam game (jaringan
berita BCBN): judul "BREAKING: ...", beberapa paragraf panjang, kadang gambar lampiran.
Pesan biasanya disalin dari channel lain, jadi baris pertamanya kadang berupa sisa salinan
(nama pengirim, jam, mention role).

## Capabilities and Constraints
- Pesan ditampilkan apa adanya: tanpa ringkasan, AI, atau pengubahan isi.
- HTML/CSS/JS polos tanpa build, di-host di Vercel. Markdown Discord dirender setelah
  escape HTML; tautan hanya http/https/`media/`.
- Gambar lampiran dari CDN Discord diunduh ke `public/media/`.
- Fitur: daftar per hari (WIB), pencarian seluruh arsip, filter channel, tautan permanen
  ke pesan atau tanggal, muat hari sebelumnya.
- Pesan yang diedit atau dihapus di Discord tidak ikut berubah.
- Data Game: pilihan tampilan "Arsip | Data Game" di blok judul. Tabel bisa diurutkan dan
  digeser ke samping di HP; upgrade yang paling cepat balik modal disorot. Tautan permanen
  per bagian (`#data`, `#data-politik`, …). Pencarian mencari di arsip dan Data Game
  sekaligus; hasil Data Game diberi label asalnya.
- Data Game (`public/data/game.json`) dibuat dari folder datamine lokal `bc-data/` lewat
  `build_game_data.py`. Hanya tabel statistik yang dipublikasikan: tanpa source decompile,
  script, log pertempuran, kolom pengenal internal, atau data pemain lain. Dimuat hanya saat
  Data Game atau pencarian dipakai, supaya arsip tetap cepat dibuka.

## Brand Commitments
Nama yang tampil: **Build And Conqueror**. Bahasa antarmuka: Indonesia (utama) dan Inggris.
Isi pesan Discord dan teks dari game (nama, tooltip) tetap apa adanya.

## Evidence on Hand
Data asli di `public/data/` (saat ini 1 pesan dari `#bc`). Belum ada logo, ikon, atau
aset visual resmi; jangan mengarang lambang faksi atau klaim tentang game.

## Product Principles
- Isi pesan adalah tokoh utama; antarmuka mundur.
- Teks panjang harus nyaman dibaca di HP.
- Gambar lampiran tampil utuh dan bisa diperbesar.
- Setiap pesan bisa ditautkan dan ditemukan lewat pencarian.
- Angka Data Game selalu disertai tanggal datamine-nya; angka bisa berubah saat game update.
