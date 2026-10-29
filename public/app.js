"use strict";

const PAGE_DAYS = 5;          // jumlah hari yang dimuat sekali klik
const SEARCH_DELAY_MS = 250;

const $ = (id) => document.getElementById(id);
const els = {
  meta: $("meta"), q: $("q"), channel: $("channel"), dayList: $("day-list"),
  status: $("status"), feed: $("feed"), more: $("more"),
};

const state = { index: null, loaded: new Map(), shown: 0 };

const dayLabel = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});
const timeLabel = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
});
const stampLabel = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
});

// --- Data ---------------------------------------------------------------

async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

async function loadDay(date) {
  if (!state.loaded.has(date)) state.loaded.set(date, await getJSON(`data/${date}.json`));
  return state.loaded.get(date);
}

async function loadAllDays() {
  await Promise.all(state.index.days.map((d) => loadDay(d.date)));
}

// --- Teks Discord → HTML aman --------------------------------------------

function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function safeUrl(url) {
  return /^(https:\/\/|http:\/\/|media\/)/.test(url || "") ? url : null;
}

// Hanya sebagian kecil markdown Discord yang dipakai berita: tautan, tebal, miring,
// kode, kutipan, judul, teks kecil (-#), dan cap waktu <t:...>.
function inline(text) {
  return esc(text)
    .replace(/&lt;t:(\d+)(?::[a-zA-Z])?&gt;/g, (_, s) => stampLabel.format(new Date(s * 1000)))
    .replace(/&lt;(@[!&]?|#)\d+&gt;/g, (_, p) => (p === "#" ? "#channel" : "@pengguna"))
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|&lt;(https?:\/\/[^\s]+?)&gt;|(https?:\/\/[^\s<]+)/g,
      (_, label, href, angled, bare) => {
        const url = href || angled || bare;
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${label || url}</a>`;
      })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
}

function line(text) {
  if (text.startsWith("-# ")) return `<span class="sub">${inline(text.slice(3))}</span>`;
  const h = text.match(/^#{1,3} (.*)/);
  return h ? `<strong>${inline(h[1])}</strong>` : inline(text);
}

// Paragraf dipisah baris kosong; baris berawalan "> " yang berurutan jadi satu kutipan.
function markdown(text) {
  if (!text) return "";
  return text.split(/\n{2,}/).map((block) => {
    const groups = [];
    for (const raw of block.split("\n")) {
      const quoted = /^>\s?/.test(raw);
      const last = groups[groups.length - 1];
      const content = line(quoted ? raw.replace(/^>\s?/, "") : raw);
      if (last && last.quoted === quoted) last.lines.push(content);
      else groups.push({ quoted, lines: [content] });
    }
    return groups.map((g) => (g.quoted
      ? `<blockquote>${g.lines.join("<br>")}</blockquote>`
      : `<p>${g.lines.join("<br>")}</p>`)).join("");
  }).join("");
}

function highlight(html, query) {
  if (!query) return html;
  const pattern = new RegExp(`(${esc(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  // Hanya sorot teks di luar tag supaya atribut href tidak rusak.
  return html.replace(/(^|>)([^<]+)/g, (_, gt, txt) => gt + txt.replace(pattern, "<mark>$1</mark>"));
}

// --- Tampilan -----------------------------------------------------------

function el(tag, attrs = {}, html) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function renderEmbed(embed, query) {
  const box = el("div", { class: "embed" });
  if (embed.color) box.style.setProperty("--embed-color", `#${embed.color.toString(16).padStart(6, "0")}`);
  const thumb = safeUrl(embed.thumbnail);
  if (thumb) box.append(el("img", { class: "thumb", src: thumb, alt: "", loading: "lazy" }));
  if (embed.author) box.append(el("p", { class: "embed-author" }, highlight(esc(embed.author), query)));
  if (embed.title) {
    const link = safeUrl(embed.url);
    const title = highlight(inline(embed.title), query);
    box.append(el("h3", { class: "embed-title" },
      link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title));
  }
  if (embed.description) box.append(el("div", { class: "body" }, highlight(markdown(embed.description), query)));
  if (embed.fields?.length) {
    const fields = el("div", { class: "embed-fields" });
    for (const f of embed.fields) {
      fields.append(el("div", {}, `<b>${highlight(inline(f.name), query)}</b>${highlight(markdown(f.value), query)}`));
    }
    box.append(fields);
  }
  const image = safeUrl(embed.image);
  if (image) box.append(el("img", { class: "image", src: image, alt: embed.title || "", loading: "lazy" }));
  if (embed.footer) box.append(el("p", { class: "embed-footer" }, highlight(inline(embed.footer), query)));
  return box;
}

function renderItem(item, query) {
  const node = el("article", { class: "item", id: `m-${item.id}` });
  node.append(el("a", { class: "time", href: `#m-${item.id}`, title: "Tautan ke pesan ini" },
    timeLabel.format(new Date(item.ts))));
  const main = el("div");
  main.append(el("p", { class: "byline" },
    `<span class="ch">#${esc(item.channel)}</span> · ${esc(item.author)}`));
  if (item.content) main.append(el("div", { class: "body" }, highlight(markdown(item.content), query)));
  for (const embed of item.embeds || []) main.append(renderEmbed(embed, query));
  if (item.attachments?.length) {
    const box = el("div", { class: "attachments" });
    for (const att of item.attachments) {
      const url = safeUrl(att.url);
      if (!url) continue;
      box.append(att.image
        ? el("img", { src: url, alt: att.name, loading: "lazy" })
        : el("a", { href: url, target: "_blank", rel: "noopener noreferrer" }, esc(att.name)));
    }
    main.append(box);
  }
  node.append(main);
  return node;
}

function renderDay(date, items, query) {
  const section = el("section", { class: "day", id: `d-${date}` });
  section.append(el("div", { class: "day-head" },
    `<h2>${dayLabel.format(new Date(`${date}T00:00:00Z`))}</h2><span>${items.length} pesan</span>`));
  // Terbaru di atas, sama seperti urutan hari.
  for (const item of [...items].reverse()) section.append(renderItem(item, query));
  return section;
}

function matches(item, query, channel) {
  if (channel && item.channel_id !== channel) return false;
  if (!query) return true;
  const haystack = [item.content, item.author, ...(item.embeds || []).flatMap((e) =>
    [e.title, e.description, e.author, e.footer, ...(e.fields || []).flatMap((f) => [f.name, f.value])])]
    .join("\n").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

// --- Alur ---------------------------------------------------------------

function filters() {
  return { query: els.q.value.trim(), channel: els.channel.value };
}

async function render() {
  const { query, channel } = filters();
  const filtering = Boolean(query || channel);
  els.feed.replaceChildren();
  if (filtering) {
    els.status.textContent = "Mencari di seluruh arsip…";
    await loadAllDays();
  }
  const days = filtering ? state.index.days : state.index.days.slice(0, state.shown);
  let total = 0;
  for (const { date } of days) {
    const items = (await loadDay(date)).filter((it) => matches(it, query, channel));
    if (!items.length) continue;
    total += items.length;
    els.feed.append(renderDay(date, items, query));
  }
  els.more.hidden = filtering || state.shown >= state.index.days.length;
  els.status.textContent = filtering
    ? (total ? `${total} pesan cocok.` : "Tidak ada pesan yang cocok.")
    : (state.index.days.length ? "" : "Belum ada pesan yang diarsipkan.");
}

function renderSidebar() {
  els.dayList.replaceChildren(...state.index.days.map(({ date, count }) => {
    const li = el("li");
    li.append(el("a", { href: `#d-${date}` }, `${date}<span>${count}</span>`));
    return li;
  }));
  for (const [id, name] of Object.entries(state.index.channels || {})) {
    els.channel.append(el("option", { value: id }, `#${esc(name)}`));
  }
}

// Tautan ke tanggal/pesan yang belum dimuat: muat sampai hari itu ikut tampil.
async function revealHash() {
  const hash = location.hash.slice(1);
  if (!hash || !state.index) return;
  let date = hash.startsWith("d-") ? hash.slice(2) : null;
  if (hash.startsWith("m-") && !document.getElementById(hash)) {
    await loadAllDays();
    date = state.index.days.find((d) => state.loaded.get(d.date).some((it) => `m-${it.id}` === hash))?.date;
  }
  const pos = state.index.days.findIndex((d) => d.date === date);
  if (pos >= state.shown && !filters().query && !filters().channel) {
    state.shown = pos + 1;
    await render();
  }
  document.getElementById(hash)?.scrollIntoView();
}

async function init() {
  try {
    state.index = await getJSON("data/index.json");
  } catch {
    els.meta.textContent = "Arsip belum tersedia.";
    els.status.textContent = "Belum ada data. Jalankan workflow arsip sekali dulu.";
    return;
  }
  const total = state.index.days.reduce((n, d) => n + d.count, 0);
  els.meta.textContent = `${total} pesan · ${state.index.days.length} hari · diperbarui ${
    stampLabel.format(new Date(state.index.updated))} WIB`;
  state.shown = PAGE_DAYS;
  renderSidebar();
  await render();
  await revealHash();
}

let searchTimer;
els.q.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => render().catch(showError), SEARCH_DELAY_MS);
});
els.channel.addEventListener("change", () => render().catch(showError));
els.more.addEventListener("click", () => {
  state.shown += PAGE_DAYS;
  render().catch(showError);
});
window.addEventListener("hashchange", () => revealHash().catch(showError));

function showError(err) {
  els.status.textContent = "Gagal memuat sebagian arsip. Coba muat ulang halaman.";
  console.error(err);
}

init().catch(showError);
