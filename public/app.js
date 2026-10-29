"use strict";

const PAGE_DAYS = 5;          // jumlah hari yang dimuat sekali klik
const SEARCH_DELAY_MS = 250;
const COPY_RESET_MS = 1600;

const $ = (id) => document.getElementById(id);
const els = {
  meta: $("meta"), tools: $("tools"), q: $("q"), channel: $("channel"), dayList: $("day-list"),
  status: $("status"), feed: $("feed"), more: $("more"),
  lightbox: $("lightbox"), lightboxImg: $("lightbox-img"), lightboxName: $("lightbox-name"),
  lightboxOpen: $("lightbox-open"), lightboxClose: $("lightbox-close"),
};

const state = { index: null, loaded: new Map(), shown: 0 };

const dayLabel = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
});
const railLabel = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
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

// Hanya sebagian kecil markdown Discord yang dipakai siaran: tautan, tebal, miring,
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
  const box = el("div", { class: "clip" });
  if (embed.color) box.style.setProperty("--embed-color", `#${embed.color.toString(16).padStart(6, "0")}`);
  const thumb = safeUrl(embed.thumbnail);
  if (thumb) box.append(el("img", { class: "thumb", src: thumb, alt: "", loading: "lazy" }));
  if (embed.author) box.append(el("p", { class: "clip-author" }, highlight(esc(embed.author), query)));
  if (embed.title) {
    const link = safeUrl(embed.url);
    const title = highlight(inline(embed.title), query);
    box.append(el("h3", { class: "clip-title" },
      link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title));
  }
  if (embed.description) box.append(el("div", { class: "body" }, highlight(markdown(embed.description), query)));
  if (embed.fields?.length) {
    const fields = el("div", { class: "clip-fields" });
    for (const f of embed.fields) {
      fields.append(el("div", {}, `<b>${highlight(inline(f.name), query)}</b>${highlight(markdown(f.value), query)}`));
    }
    box.append(fields);
  }
  const image = safeUrl(embed.image);
  if (image) box.append(el("img", { class: "image", src: image, alt: embed.title || "", loading: "lazy" }));
  if (embed.footer) box.append(el("p", { class: "clip-footer" }, highlight(inline(embed.footer), query)));
  return box;
}

// Gambar jadi tombol yang membuka lightbox; lampiran lain jadi tautan unduhan.
function renderAttachments(attachments) {
  const images = attachments.filter((att) => att.image && safeUrl(att.url));
  const files = attachments.filter((att) => !att.image && safeUrl(att.url));
  const nodes = [];
  if (images.length) {
    const plates = el("div", { class: images.length > 1 ? "plates many" : "plates" });
    for (const att of images) {
      const button = el("button", {
        type: "button", class: "plate", "data-src": att.url, "data-name": att.name || "",
        "aria-label": `Perbesar gambar ${att.name || ""}`.trim(),
      });
      button.append(el("img", { src: att.url, alt: att.name || "", loading: "lazy" }));
      plates.append(button);
    }
    nodes.push(plates);
  }
  for (const att of files) {
    nodes.push(el("p", { class: "file" },
      `Lampiran: <a href="${esc(att.url)}" target="_blank" rel="noopener noreferrer">${esc(att.name)}</a>`));
  }
  return nodes;
}

function renderItem(item, query) {
  const node = el("article", { class: "sheet", id: `m-${item.id}` });
  node.append(el("header", { class: "sheet-head" },
    `<a class="clock" href="#m-${esc(item.id)}" title="Tautan ke laporan ini">`
    + `${timeLabel.format(new Date(item.ts))}<small>WIB</small></a>`
    + `<span class="stamp">#${esc(item.channel)}</span>`
    + `<span class="author">${esc(item.author)}</span>`
    + `<button class="copy" type="button" data-id="${esc(item.id)}">Salin tautan</button>`));
  if (item.content) node.append(el("div", { class: "body" }, highlight(markdown(item.content), query)));
  for (const embed of item.embeds || []) node.append(renderEmbed(embed, query));
  if (item.attachments?.length) node.append(...renderAttachments(item.attachments));
  return node;
}

function renderDay(date, items, query) {
  const section = el("section", { class: "day", id: `d-${date}`, "data-date": date });
  section.append(el("div", { class: "day-head" },
    `<h2>${dayLabel.format(new Date(`${date}T00:00:00Z`))}</h2><span>${items.length} laporan</span>`));
  // Terbaru di atas, sama seperti urutan hari.
  for (const item of [...items].reverse()) section.append(renderItem(item, query));
  return section;
}

function renderEmpty(title, text) {
  return el("div", { class: "empty" }, `<strong>${esc(title)}</strong>${esc(text)}`);
}

function matches(item, query, channel) {
  if (channel && item.channel_id !== channel) return false;
  if (!query) return true;
  const haystack = [item.content, item.author, ...(item.embeds || []).flatMap((e) =>
    [e.title, e.description, e.author, e.footer, ...(e.fields || []).flatMap((f) => [f.name, f.value])])]
    .join("\n").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

// Lingkaran pensil di sekitar laporan yang dibuka lewat tautan #m-….
function markTarget() {
  document.querySelectorAll(".pencil").forEach((svg) => svg.remove());
  const target = location.hash.startsWith("#m-") && document.getElementById(location.hash.slice(1));
  if (!target) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "pencil");
  svg.setAttribute("aria-hidden", "true");
  target.prepend(svg);
  // Digambar dalam piksel nyata supaya goresan tidak melar di lembar yang tinggi.
  const { width: w, height: h } = svg.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = [pencilLoop(w, h, 0), pencilLoop(w, h, 3)]
    .map((d) => `<path d="${d}" pathLength="1"/>`).join("");
}

// Satu putaran tangan di sekitar lembar, ujungnya sedikit kebablasan.
function pencilLoop(w, h, shift) {
  const p = 6 + shift;
  const r = 22;   // sudut membulat seperti tarikan tangan
  return `M ${p + r} ${p + 4} C ${w * 0.35} ${p - 5} ${w * 0.7} ${p + 7} ${w - p - r} ${p}`
    + ` Q ${w - p + 2} ${p - 1} ${w - p - 2} ${p + r}`
    + ` C ${w - p + 6} ${h * 0.35} ${w - p - 6} ${h * 0.7} ${w - p + 1} ${h - p - r}`
    + ` Q ${w - p + 3} ${h - p + 2} ${w - p - r} ${h - p - 1}`
    + ` C ${w * 0.65} ${h - p + 6} ${w * 0.3} ${h - p - 5} ${p + r} ${h - p + 2}`
    + ` Q ${p - 3} ${h - p} ${p + 1} ${h - p - r}`
    + ` C ${p - 5} ${h * 0.65} ${p + 5} ${h * 0.3} ${p - 1} ${p + r + 6}`
    + ` Q ${p - 2} ${p - 4} ${p + r + 40} ${p - 7}`;
}

// --- Alur ---------------------------------------------------------------

function filters() {
  return { query: els.q.value.trim(), channel: els.channel.value };
}

async function render() {
  const { query, channel } = filters();
  const filtering = Boolean(query || channel);
  if (filtering) {
    els.status.textContent = "Mencari di seluruh arsip…";
    await loadAllDays();
  }
  const days = filtering ? state.index.days : state.index.days.slice(0, state.shown);
  const sections = [];
  let total = 0;
  for (const { date } of days) {
    const items = (await loadDay(date)).filter((it) => matches(it, query, channel));
    if (!items.length) continue;
    total += items.length;
    sections.push(renderDay(date, items, query));
  }
  if (!state.index.days.length) {
    sections.push(renderEmpty("Meja masih kosong.", "Laporan pertama akan muncul setelah bot mengarsipkan pesan."));
  } else if (filtering && !total) {
    sections.push(renderEmpty("Tidak ada laporan yang cocok.", "Coba kata lain, atau pilih Semua channel."));
  }
  els.feed.replaceChildren(...sections);
  els.feed.setAttribute("aria-busy", "false");
  els.more.hidden = filtering || state.shown >= state.index.days.length;
  els.status.textContent = filtering && total ? `${total} laporan cocok.` : "";
  observeDays();
  markTarget();
}

function renderRail() {
  els.dayList.replaceChildren(...state.index.days.map(({ date, count }) => {
    const parts = Object.fromEntries(railLabel.formatToParts(new Date(`${date}T00:00:00Z`))
      .map((p) => [p.type, p.value]));
    const li = el("li");
    li.append(el("a", { href: `#d-${date}`, "aria-label": `${date}, ${count} laporan` },
      `<span class="d">${esc(parts.day)}</span><span class="m">${esc(parts.month)}</span>`
      + `<span class="n">${count} laporan</span>`));
    return li;
  }));
  for (const [id, name] of Object.entries(state.index.channels || {})) {
    els.channel.append(el("option", { value: id }, `#${esc(name)}`));
  }
}

// Tandai tanggal di rel sesuai hari yang sedang dibaca.
let dayObserver;
function observeDays() {
  dayObserver?.disconnect();
  dayObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target.dataset.date);
    if (!visible.length) return;
    for (const link of els.dayList.querySelectorAll("a")) {
      link.setAttribute("aria-current", String(link.getAttribute("href") === `#d-${visible[0]}`));
    }
  }, { rootMargin: "0px 0px -70% 0px" });
  els.feed.querySelectorAll(".day").forEach((section) => dayObserver.observe(section));
}

// Tautan ke tanggal/pesan yang belum dimuat: muat sampai hari itu ikut tampil.
async function revealHash() {
  const hash = location.hash.slice(1);
  if (!hash || !state.index) return markTarget();
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
  markTarget();
  document.getElementById(hash)?.scrollIntoView();
}

async function init() {
  try {
    state.index = await getJSON("data/index.json");
  } catch {
    els.meta.textContent = "Arsip belum tersedia.";
    els.feed.replaceChildren(renderEmpty("Belum ada data.", "Jalankan workflow arsip sekali dulu."));
    els.feed.setAttribute("aria-busy", "false");
    return;
  }
  const total = state.index.days.reduce((n, d) => n + d.count, 0);
  els.meta.textContent = `${total} laporan dari ${state.index.days.length} hari · diperbarui ${
    stampLabel.format(new Date(state.index.updated))} WIB`;
  state.shown = PAGE_DAYS;
  renderRail();
  await render();
  await revealHash();
}

function openLightbox(src, name) {
  els.lightboxImg.src = src;
  els.lightboxImg.alt = name;
  els.lightboxName.textContent = name;
  els.lightboxOpen.href = src;
  els.lightbox.showModal();
}

async function copyLink(button) {
  const url = `${location.origin}${location.pathname}#m-${button.dataset.id}`;
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = "Tersalin";
  } catch {
    button.textContent = "Gagal menyalin";
  }
  setTimeout(() => { button.textContent = "Salin tautan"; }, COPY_RESET_MS);
}

let searchTimer;
els.q.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => render().catch(showError), SEARCH_DELAY_MS);
});
els.tools.addEventListener("submit", (event) => event.preventDefault());
els.channel.addEventListener("change", () => render().catch(showError));
els.more.addEventListener("click", () => {
  state.shown += PAGE_DAYS;
  render().catch(showError);
});
els.feed.addEventListener("click", (event) => {
  const plate = event.target.closest(".plate");
  if (plate) return openLightbox(plate.dataset.src, plate.dataset.name);
  const copy = event.target.closest(".copy");
  if (copy) copyLink(copy);
});
els.lightboxClose.addEventListener("click", () => els.lightbox.close());
els.lightbox.addEventListener("click", (event) => {
  if (event.target === els.lightbox) els.lightbox.close();
});
window.addEventListener("hashchange", () => revealHash().catch(showError));

function showError(err) {
  els.status.textContent = "Gagal memuat sebagian arsip. Coba muat ulang halaman.";
  console.error(err);
}

init().catch(showError);
