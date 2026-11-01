// Peta konflik: siapa lawan siapa. Data ditulis tangan di conflicts.json dari berita BCBN;
// tiap kejadian menaut ke pesan sumbernya di arsip (#m-id), jadi teks asli tetap rujukannya.

const STATUS_KEYS = { active: "statusActive", ended: "statusEnded" };
const FACTION_KEYS = { active: "factionActive", withdrew: "factionWithdrew", disbanded: "factionDisbanded", peace: "factionPeace" };

const $ = (id) => document.getElementById(id);
const els = { list: $("conflicts"), note: $("note"), status: $("status") };
const dayLabel = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const fullDay = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Teks dwibahasa dari data: {id, en}.
const pick = (text) => (text ? text[LANG] || text.id : "");
const date = (iso, format = dayLabel) => format.format(new Date(`${iso}T00:00:00Z`));

function renderFaction(faction) {
  const note = pick(faction.note);
  return `<li class="faction is-${esc(faction.status)}">
    <span class="faction-name">${esc(faction.name)}</span>
    <span class="chip">${t(FACTION_KEYS[faction.status])}</span>
    ${note ? `<small>${esc(note)}</small>` : ""}
  </li>`;
}

function renderSide(side) {
  return `<section class="side">
    <h3>${esc(pick(side.label))}</h3>
    <ul>${side.factions.map(renderFaction).join("")}</ul>
  </section>`;
}

function renderEvent(event) {
  return `<li>
    <time datetime="${esc(event.date)}">${date(event.date)}</time>
    <span>${esc(pick(event.text))} <a href="./#m-${esc(event.source)}">${t("source")}</a></span>
  </li>`;
}

function renderConflict(conflict) {
  const [first, second] = conflict.sides;
  return `<article class="sheet conflict is-${esc(conflict.status)}" id="${esc(conflict.id)}">
    <header class="conflict-head">
      <h2>${esc(pick(conflict.name))}</h2>
      <span class="stamp">${t(STATUS_KEYS[conflict.status])}</span>
    </header>
    <p class="conflict-summary">${esc(pick(conflict.summary))}</p>
    <div class="versus">
      ${renderSide(first)}
      <p class="vs" aria-hidden="true">${t("versus")}</p>
      ${renderSide(second)}
    </div>
    <h3 class="timeline-title">${t("timeline")}</h3>
    <ol class="timeline">${conflict.events.map(renderEvent).join("")}</ol>
  </article>`;
}

async function init() {
  let data;
  try {
    const res = await fetch("conflicts.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch {
    els.list.innerHTML = "";
    els.status.textContent = `${t("conflictsError")}. ${t("retry")}`;
    return;
  }
  els.note.textContent = t("conflictsNote", { from: date(data.period.from, fullDay), to: date(data.period.to, fullDay) });
  els.list.innerHTML = data.conflicts.map(renderConflict).join("");
}

init();
