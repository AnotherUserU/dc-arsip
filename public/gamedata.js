"use strict";
// Tampilan "Data Game": tabel hasil datamine dari data/game.json (dibuat oleh build_game_data.py).
// File ini baru dimuat saat tampilan Data Game dibuka atau pencarian dipakai, supaya arsip
// tetap ringan. Label dan judul tersedia dalam dua bahasa di JSON; isi tabel apa adanya dari game.

(() => {
  const SEARCH_LIMIT = 40; // hasil Data Game yang ditampilkan di pencarian
  const numbers = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });
  const dateLabel = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  let data = null;
  let loading = null;

  const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
  const tr = (pair) => (pair ? pair[LANG] || pair.id : "");
  const cellText = (value) => (value == null ? "" : typeof value === "number" ? numbers.format(value) : String(value));

  function load() {
    loading ??= fetch("data/game.json", { cache: "no-cache" }).then((res) => {
      if (!res.ok) throw new Error(`data/game.json: ${res.status}`);
      return res.json();
    }).then((json) => { data = json; return json; }).catch((err) => { loading = null; throw err; });
    return loading;
  }

  // Sel yang masuk "terbaik" (mis. balik modal tercepat) per kolom yang ditandai di JSON.
  function bestCells(table) {
    const marked = new Set();
    for (const { col, order, top } of table.best || []) {
      const ranked = table.rows.map((row, i) => [row[col], i]).filter(([v]) => typeof v === "number")
        .sort((a, b) => (order === "low" ? a[0] - b[0] : b[0] - a[0])).slice(0, top);
      for (const [, i] of ranked) marked.add(`${i}:${col}`);
    }
    return marked;
  }

  function renderRows(table, order) {
    const best = bestCells(table);
    return order.map((i) => `<tr>${table.rows[i].map((value, col) => {
      const cls = [table.columns[col].num ? "num" : "", best.has(`${i}:${col}`) ? "best" : ""].filter(Boolean).join(" ");
      return `<td${cls ? ` class="${cls}"` : ""}>${esc(cellText(value))}</td>`;
    }).join("")}</tr>`).join("");
  }

  function renderTable(table) {
    const head = table.columns.map((c, col) => `<th scope="col" aria-sort="none"${c.num ? ' class="num"' : ""}>`
      + `<button type="button" data-col="${col}">${esc(tr(c.label))}</button></th>`).join("");
    const order = table.rows.map((_, i) => i);
    return `<div class="sheet game-sheet">
      <h3 id="t-${esc(table.id)}">${esc(tr(table.title))}</h3>
      ${table.note ? `<p class="game-note">${esc(tr(table.note))}</p>` : ""}
      <div class="table-scroll" tabindex="0" role="region" aria-labelledby="t-${esc(table.id)}">
        <table class="game-table" data-table="${esc(table.id)}">
          <thead><tr>${head}</tr></thead>
          <tbody>${renderRows(table, order)}</tbody>
        </table>
      </div>
    </div>`;
  }

  function renderSection(section) {
    const body = section.tables
      ? section.tables.map(renderTable).join("")
      : `<div class="sheet game-sheet"><ul class="game-list">${section.items.map((item) => `<li>${esc(tr(item))}</li>`).join("")}</ul></div>`;
    return `<section class="day game-section" id="data-${esc(section.id)}">
      <div class="day-head"><h2>${esc(tr(section.title))}</h2></div>${body}</section>`;
  }

  // Urutkan tabel lewat tombol di kepala kolom: klik pertama naik, klik berikutnya bergantian.
  function sortTable(button) {
    const tableEl = button.closest("table");
    const table = data.sections.flatMap((s) => s.tables || []).find((tb) => tb.id === tableEl.dataset.table);
    const col = Number(button.dataset.col);
    const th = button.parentElement;
    const dir = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
    for (const other of tableEl.querySelectorAll("th")) other.setAttribute("aria-sort", "none");
    th.setAttribute("aria-sort", dir);
    const sign = dir === "ascending" ? 1 : -1;
    const order = table.rows.map((_, i) => i).sort((a, b) => {
      const x = table.rows[a][col], y = table.rows[b][col];
      if (x == null || y == null) return (x == null) - (y == null); // kosong selalu di bawah
      return sign * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), LOCALE));
    });
    tableEl.tBodies[0].innerHTML = renderRows(table, order);
  }

  function render(target) {
    target.innerHTML = `<p class="game-source">${esc(t("gameNote", { date: dateLabel.format(new Date(`${data.updated}T00:00:00Z`)) }))}</p>`
      + data.sections.map(renderSection).join("");
    target.onclick = (event) => {
      const button = event.target.closest("th button");
      if (button) sortTable(button);
    };
  }

  // Bagian untuk rel di kiri (pengganti daftar tanggal saat tampilan Data Game).
  function sections() {
    return data.sections.map((s) => ({ id: `data-${s.id}`, title: tr(s.title) }));
  }

  // Baris yang memuat kata kunci, diberi label asal: Data Game · bagian · tabel.
  function search(query) {
    const q = query.toLowerCase();
    const hits = [];
    for (const section of data.sections) {
      const origin = tr(section.title);
      for (const item of section.items || []) {
        const text = tr(item);
        if (text.toLowerCase().includes(q)) hits.push({ href: `#data-${section.id}`, origin, title: origin, detail: text });
      }
      for (const table of section.tables || []) {
        for (const row of table.rows) {
          const cells = row.map(cellText);
          if (!cells.join(" ").toLowerCase().includes(q)) continue;
          const detail = table.columns.map((c, i) => (cells[i] ? `${tr(c.label)}: ${cells[i]}` : "")).filter(Boolean).slice(1, 6).join(" · ");
          hits.push({ href: `#data-${section.id}`, origin: `${origin} · ${tr(table.title)}`, title: cells[0], detail });
        }
      }
    }
    return hits;
  }

  window.GameData = { load, render, sections, search, SEARCH_LIMIT, esc };
})();
