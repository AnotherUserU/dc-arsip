---
version: 1
slug: "public-index-html"
primary_target: "public/index.html"
related_targets: ["public/app.js","public/style.css"]
---

## Scope
Halaman arsip (`public/index.html`), mode Read. Anggota server membaca ulang siaran panjang `#bc` (BCBN) dan mencari kabar lama, di HP dan desktop. Gambar lampiran harus tampil utuh dan bisa diperbesar.

## Direction contract
THESIS: Arsip sebagai meja peta komando: tiap siaran adalah lembar laporan yang tergeletak di atas peta kampanye. Menolak tampilan koran krem-serif dan tiruan Discord.
OWN-WORLD: Meja hijau-batu gelap dengan kontur topografi samar; lembar laporan kertas dingin terang; huruf grotesk sempit untuk kepala dan cap; sans tenang untuk isi; merah pensil gemuk hanya untuk jejak tindakan (fokus, pesan tertaut, sorotan); koordinat grid nyata sebagai indeks tanggal.
STORY: Pembaca melihat laporan terbaru, membacanya nyaman, melompat ke tanggal lain lewat koordinat, mencari, membuka gambar besar, menyalin tautan pesan.
FIRST VIEWPORT: Blok judul peta di atas (Build And Conqueror, jumlah laporan, waktu pembaruan, pencarian + filter channel). Di bawahnya rel koordinat tanggal kiri (desktop) dan lembar laporan terbaru selebar ~68ch dengan jam dan cap channel di kepalanya. Di HP rel menjadi strip koordinat horizontal yang bisa digeser.
FORM: Meja Peta Komando, posisi 4 dari daftar berurutan, seed dbe9623a.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction
Lembar laporan tertaut (`#m-…`) diberi lingkaran pensil merah; gambar lampiran dibuka di lightbox `<dialog>` seperti foto pengintaian yang ditarik ke depan.
