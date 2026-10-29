"use strict";
// Bahasa antarmuka ID/EN. Hanya teks situs yang diterjemahkan; isi pesan Discord dan
// nama dari game (unit, faksi, jenis) tetap apa adanya.
// Teks statis di HTML ditandai data-i18n (isi), data-i18n-placeholder, data-i18n-label
// (aria-label), dan data-i18n-content (meta). Kunci berakhiran _one dipakai saat n = 1.

const STRINGS = {
  id: {
    archiveTitle: "Build And Conqueror · Arsip Siaran",
    archiveDescription: "Arsip siaran server Discord Build And Conqueror.",
    archiveSubtitle: "Arsip siaran server",
    archiveLink: "Arsip siaran",
    unitsTitle: "Build And Conqueror · Perbandingan Unit",
    unitsDescription: "Perbandingan jangkauan, ketinggian, dan amunisi unit Build And Conqueror.",
    unitsLink: "Perbandingan unit",
    pages: "Halaman",
    language: "Bahasa",

    opening: "Membuka arsip…",
    search: "Cari laporan",
    searchHint: "faksi, perang, nama…",
    channel: "Channel",
    allChannels: "Semua channel",
    archiveDates: "Tanggal arsip",
    loadMore: "Muat hari sebelumnya",
    attachmentImage: "Gambar lampiran",
    openOriginal: "Buka file asli",
    close: "Tutup",
    user: "pengguna",
    enlarge: "Perbesar gambar {name}",
    attachment: "Lampiran:",
    linkToReport: "Tautan ke laporan ini",
    copyLink: "Salin tautan",
    copied: "Tersalin",
    copyFailed: "Gagal menyalin",
    reports: "{n} laporan",
    matching: "{n} laporan cocok.",
    searching: "Mencari di seluruh arsip…",
    meta: "{reports} dari {days} · diperbarui {time} WIB",
    days: "{n} hari",
    emptyTitle: "Meja masih kosong.",
    emptyText: "Laporan pertama akan muncul setelah bot mengarsipkan pesan.",
    noMatchTitle: "Tidak ada laporan yang cocok.",
    noMatchText: "Coba kata lain, atau pilih Semua channel.",
    noArchive: "Arsip belum tersedia.",
    noDataTitle: "Belum ada data.",
    noDataText: "Jalankan workflow arsip sekali dulu.",
    loadError: "Gagal memuat sebagian arsip. Coba muat ulang halaman.",

    type: "Jenis",
    category: "Kategori",
    sortBy: "Urutkan",
    all: "Semua",
    sortMissiles: "Jangkauan rudal",
    sortDrones: "Jangkauan drone",
    sortAltitude: "Ketinggian",
    sortAmmo: "Amunisi",
    loading: "Memuat…",
    unitsNote: "Angka tebal = terbaik di antara unit yang tampil. Tanda ? = datanya belum ada.",
    faction: "Faksi {name}",
    groupRange: "Jangkauan (meter)",
    groupFiring: "Tembakan",
    drones: "Drone",
    missiles: "Rudal",
    guns: "Meriam",
    altitude: "Tinggi maks",
    ammo: "Amunisi",
    rearm: "Isi ulang",
    cooldown: "Jeda tembak",
    cannot: "tidak",
    seconds: " dtk",
    unitsError: "Data unit gagal dimuat",
    retry: "Muat ulang halaman untuk mencoba lagi.",
  },
  en: {
    archiveTitle: "Build And Conqueror · Broadcast Archive",
    archiveDescription: "Broadcast archive of the Build And Conqueror Discord server.",
    archiveSubtitle: "Server broadcast archive",
    archiveLink: "Broadcast archive",
    unitsTitle: "Build And Conqueror · Unit Comparison",
    unitsDescription: "Range, altitude, and ammo comparison of Build And Conqueror units.",
    unitsLink: "Unit comparison",
    pages: "Pages",
    language: "Language",

    opening: "Opening archive…",
    search: "Search reports",
    searchHint: "faction, war, name…",
    channel: "Channel",
    allChannels: "All channels",
    archiveDates: "Archive dates",
    loadMore: "Load earlier days",
    attachmentImage: "Attached image",
    openOriginal: "Open original file",
    close: "Close",
    user: "user",
    enlarge: "Enlarge image {name}",
    attachment: "Attachment:",
    linkToReport: "Link to this report",
    copyLink: "Copy link",
    copied: "Copied",
    copyFailed: "Copy failed",
    reports: "{n} reports",
    reports_one: "{n} report",
    matching: "{n} matching reports.",
    matching_one: "{n} matching report.",
    searching: "Searching the whole archive…",
    meta: "{reports} from {days} · updated {time} WIB",
    days: "{n} days",
    days_one: "{n} day",
    emptyTitle: "The table is still empty.",
    emptyText: "The first report appears once the bot archives a message.",
    noMatchTitle: "No matching reports.",
    noMatchText: "Try another word, or choose All channels.",
    noArchive: "Archive not available yet.",
    noDataTitle: "No data yet.",
    noDataText: "Run the archive workflow once first.",
    loadError: "Part of the archive failed to load. Try reloading the page.",

    type: "Type",
    category: "Category",
    sortBy: "Sort by",
    all: "All",
    sortMissiles: "Missile range",
    sortDrones: "Drone range",
    sortAltitude: "Altitude",
    sortAmmo: "Ammo",
    loading: "Loading…",
    unitsNote: "Bold = best among the units shown. ? = no data yet.",
    faction: "{name} faction",
    groupRange: "Range (meters)",
    groupFiring: "Firing",
    drones: "Drones",
    missiles: "Missiles",
    guns: "Guns",
    altitude: "Max altitude",
    ammo: "Ammo",
    rearm: "Rearm time",
    cooldown: "Fire cooldown",
    cannot: "no",
    seconds: " s",
    unitsError: "Unit data failed to load",
    retry: "Reload the page to try again.",
  },
};

const LANG_KEY = "lang";
const LANG = (() => {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "id";
  } catch {
    return "id";
  }
})();
const LOCALE = LANG === "en" ? "en-GB" : "id-ID";

function t(key, vars = {}) {
  const table = STRINGS[LANG];
  const text = (vars.n === 1 && table[`${key}_one`]) || table[key] || STRINGS.id[key] || key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

function applyStaticText() {
  document.documentElement.lang = LANG;
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) node.placeholder = t(node.dataset.i18nPlaceholder);
  for (const node of document.querySelectorAll("[data-i18n-label]")) node.setAttribute("aria-label", t(node.dataset.i18nLabel));
  for (const node of document.querySelectorAll("[data-i18n-content]")) node.content = t(node.dataset.i18nContent);
}

// Ganti bahasa = simpan pilihan lalu muat ulang; filter halaman unit ada di URL dan
// posisi arsip di hash, jadi keduanya ikut bertahan.
function setupLanguageSwitch() {
  for (const button of document.querySelectorAll("[data-lang]")) {
    button.setAttribute("aria-pressed", String(button.dataset.lang === LANG));
    button.addEventListener("click", () => {
      if (button.dataset.lang === LANG) return;
      try {
        localStorage.setItem(LANG_KEY, button.dataset.lang);
      } catch {
        return; // penyimpanan diblokir browser: tetap di bahasa sekarang
      }
      location.reload();
    });
  }
}

applyStaticText();
setupLanguageSwitch();
