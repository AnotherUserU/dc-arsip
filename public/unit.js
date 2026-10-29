// Halaman perbandingan unit. Data diisi tangan di units.json.
// Skala batang dihitung dari seluruh kategori, bukan hasil filter, supaya panjang batang
// tetap sama saat faksi diganti dan bisa dibandingkan antarfaksi.

const RANGES = [
  ["drones", "Drone"],
  ["missiles", "Rudal"],
  ["guns", "Meriam"],
];

const $ = (id) => document.getElementById(id);
const els = { category: $("category"), faction: $("faction"), sort: $("sort"), rows: $("unit-rows"), title: $("units-title"), status: $("status") };
const meters = new Intl.NumberFormat("id-ID");
let categories = [];

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const pct = (value, max) => `${Math.max(2, (value / max) * 100).toFixed(1)}%`;

function bar(kind, label, value, max) {
  if (value == null) {
    return `<div class="bar-row is-none"><span class="bar-label">${label}</span><span class="bar-none">tidak bisa</span></div>`;
  }
  return `<div class="bar-row"><span class="bar-label">${label}</span>
    <span class="bar-track"><i class="bar bar-${kind}" style="--w:${pct(value, max)}"></i><b>${meters.format(value)} m</b></span></div>`;
}

function renderRow(unit, rangeMax, altitudeMax) {
  // Meriam hanya ditampilkan untuk unit yang punya; Drone dan Rudal selalu, supaya
  // "tidak bisa menembak drone" terlihat jelas.
  const ranges = RANGES.filter(([key]) => key !== "guns" || unit.guns != null)
    .map(([key, label]) => bar(key, label, unit[key], rangeMax)).join("");
  return `<tr>
    <th scope="row"><span class="unit-name">${esc(unit.name)}</span><span class="stamp">${esc(unit.faction)}</span></th>
    <td>${ranges}</td>
    <td>${bar("altitude", "Tinggi", unit.altitude, altitudeMax)}</td>
  </tr>`;
}

function render() {
  const category = categories.find((c) => c.id === els.category.value) || categories[0];
  const faction = els.faction.value;
  const sortKey = els.sort.value;
  const rangeMax = Math.max(...category.units.flatMap((u) => RANGES.map(([k]) => u[k] || 0)));
  const altitudeMax = Math.max(...category.units.map((u) => u.altitude));

  let units = category.units.filter((u) => !faction || u.faction === faction);
  if (sortKey) units = [...units].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

  els.title.textContent = `${category.name} · ${units.length} unit`;
  els.rows.innerHTML = units.map((u) => renderRow(u, rangeMax, altitudeMax)).join("");
  saveState();
}

function fillFactions() {
  const category = categories.find((c) => c.id === els.category.value) || categories[0];
  const current = els.faction.value;
  const factions = [...new Set(category.units.map((u) => u.faction))];
  els.faction.innerHTML = `<option value="">Semua faksi</option>` +
    factions.map((f) => `<option value="${esc(f)}">${esc(f)}</option>`).join("");
  els.faction.value = factions.includes(current) ? current : "";
}

// Pilihan disimpan di URL supaya tampilan tertentu bisa dibagikan di Discord.
function saveState() {
  const params = new URLSearchParams();
  if (els.category.value !== categories[0].id) params.set("k", els.category.value);
  if (els.faction.value) params.set("f", els.faction.value);
  if (els.sort.value) params.set("u", els.sort.value);
  const query = params.toString();
  history.replaceState(null, "", query ? `?${query}` : location.pathname);
}

function loadState() {
  const params = new URLSearchParams(location.search);
  const pick = (select, value) => {
    if (value && [...select.options].some((o) => o.value === value)) select.value = value;
  };
  pick(els.category, params.get("k"));
  fillFactions();
  pick(els.faction, params.get("f"));
  pick(els.sort, params.get("u"));
}

async function init() {
  try {
    const res = await fetch("units.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    categories = (await res.json()).categories;
  } catch {
    els.title.textContent = "Data unit gagal dimuat";
    els.status.textContent = "Muat ulang halaman untuk mencoba lagi.";
    return;
  }
  els.category.innerHTML = categories.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  loadState();
  render();
  els.category.addEventListener("change", () => { fillFactions(); render(); });
  els.faction.addEventListener("change", render);
  els.sort.addEventListener("change", render);
}

init();
