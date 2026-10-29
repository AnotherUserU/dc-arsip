// Halaman perbandingan unit: satu tabel per faksi. Data diisi tangan di units.json.
// Unit yang setara antarfaksi punya "category" yang sama (mis. Arrow 3, S-500, Aquila),
// jadi filter kategori menampilkan tiga unit itu berdampingan.

// Tabel dibalik: kolom = unit, baris = statistik, supaya 7 statistik tetap muat saat
// tiga tabel berjajar. "better" menentukan angka mana yang ditebalkan; "empty" adalah
// teks untuk nilai null (tidak punya senjata itu, atau datanya belum ada).
const GROUPS = [
  { title: "Jangkauan (meter)", empty: "tidak", rows: [
    { key: "drones", label: "Drone", better: "high" },
    { key: "missiles", label: "Rudal", better: "high" },
    { key: "guns", label: "Meriam", better: "high" },
    { key: "altitude", label: "Tinggi maks", better: "high" },
  ] },
  { title: "Tembakan", empty: "?", rows: [
    { key: "ammo", label: "Amunisi", better: "high" },
    { key: "rearm", label: "Isi ulang", better: "low", unit: " dtk" },
    { key: "cooldown", label: "Jeda tembak", better: "low", unit: " dtk" },
  ] },
];
const ROWS = GROUPS.flatMap((g) => g.rows);

const $ = (id) => document.getElementById(id);
const els = { type: $("type"), category: $("category"), sort: $("sort"), tables: $("tables"), title: $("units-title"), status: $("status") };
const numbers = new Intl.NumberFormat("id-ID");
let types = [];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const currentType = () => types.find((t) => t.id === els.type.value) || types[0];
const unique = (values) => [...new Set(values)];

function cell(value, row, best, empty) {
  if (value == null) return `<td class="none">${empty}</td>`;
  return `<td${value === best[row.key] ? ` class="best"` : ""}>${numbers.format(value)}${row.unit || ""}</td>`;
}

function renderTable(faction, units, best) {
  const head = units.map((u) => `<th scope="col">${esc(u.name)}<small>${esc(u.category)}</small></th>`).join("");
  const body = GROUPS.map((g) => `
      <tr class="group"><th scope="colgroup" colspan="${units.length + 1}">${g.title}</th></tr>
      ${g.rows.map((row) => `<tr><th scope="row">${row.label}</th>${units.map((u) => cell(u[row.key], row, best, g.empty)).join("")}</tr>`).join("")}`).join("");
  return `<section class="sheet faction-sheet" aria-label="Faksi ${esc(faction)}">
    <h3>${esc(faction)}</h3>
    <table class="unit-table">
      <thead><tr><td></td>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  </section>`;
}

// Nilai terbaik per statistik dari semua unit yang tampil, lintas tabel. Kalau semua
// sama (mis. isi ulang 45 dtk untuk ketiganya), tidak ada yang ditebalkan.
function bestValues(units) {
  return Object.fromEntries(ROWS.map((row) => {
    const values = units.map((u) => u[row.key]).filter((v) => v != null);
    if (new Set(values).size < 2) return [row.key, null];
    return [row.key, row.better === "low" ? Math.min(...values) : Math.max(...values)];
  }));
}

function render() {
  const type = currentType();
  const category = els.category.value;
  const sortKey = els.sort.value;
  let units = type.units.filter((u) => !category || u.category === category);
  if (sortKey) units = [...units].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

  const best = bestValues(units);
  const factions = unique(type.units.map((u) => u.faction));
  els.title.textContent = `${type.name}${category ? ` · ${category}` : ""}`;
  els.tables.innerHTML = factions
    .map((f) => [f, units.filter((u) => u.faction === f)])
    .filter(([, list]) => list.length)
    .map(([f, list]) => renderTable(f, list, best))
    .join("");
  saveState();
}

function fillCategories() {
  const current = els.category.value;
  const categories = unique(currentType().units.map((u) => u.category));
  els.category.innerHTML = `<option value="">Semua</option>` +
    categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  els.category.value = categories.includes(current) ? current : "";
}

// Pilihan disimpan di URL supaya tampilan tertentu bisa dibagikan di Discord.
function saveState() {
  const params = new URLSearchParams();
  if (els.type.value !== types[0].id) params.set("j", els.type.value);
  if (els.category.value) params.set("k", els.category.value);
  if (els.sort.value) params.set("u", els.sort.value);
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function loadState() {
  const params = new URLSearchParams(location.search);
  const pick = (select, value) => {
    if (value && [...select.options].some((o) => o.value === value)) select.value = value;
  };
  pick(els.type, params.get("j"));
  fillCategories();
  pick(els.category, params.get("k"));
  pick(els.sort, params.get("u"));
}

async function init() {
  try {
    const res = await fetch("units.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    types = (await res.json()).types;
  } catch {
    els.title.textContent = "Data unit gagal dimuat";
    els.status.textContent = "Muat ulang halaman untuk mencoba lagi.";
    els.tables.innerHTML = "";
    return;
  }
  els.type.innerHTML = types.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
  loadState();
  render();
  els.type.addEventListener("change", () => { fillCategories(); render(); });
  els.category.addEventListener("change", render);
  els.sort.addEventListener("change", render);
}

init();
