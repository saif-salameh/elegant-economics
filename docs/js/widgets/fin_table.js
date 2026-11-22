const previousValues = new WeakMap();
const highlightTimers = new WeakMap();
const latestRows = new WeakMap();
let nextNoteId = 0;

function numericFormat(value, style = "number") {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (style === "percent") return number < 0 ? `(${Math.abs(number).toFixed(1)}%)` : `${number.toFixed(1)}%`;
  if (style === "eps") return number < 0 ? `(${Math.abs(number).toFixed(2)})` : number.toFixed(2);
  if (style === "ratio") return number < 0 ? `(${Math.abs(number).toFixed(2)})` : number.toFixed(2);
  const absolute = Math.abs(Math.round(number)).toLocaleString("en-US");
  if (style === "signed") return number > 0 ? `+${absolute}` : number < 0 ? `(${absolute})` : "0";
  return number < 0 ? `(${absolute})` : absolute;
}

function valueFor(row, columnKey) {
  return row.values && Object.hasOwn(row.values, columnKey)
    ? row.values[columnKey]
    : row.value;
}

function formulaFor(row, column, rows, columnKey, value) {
  if (typeof row.formula === "function") {
    return row.formula({ row, column, rows, columnKey, value });
  }
  return typeof row.formula === "string" ? row.formula : "Calculated from the related statement inputs.";
}

function cellSnapshot(rows, columns) {
  const snapshot = new Map();
  for (const row of rows) {
    for (const column of columns) snapshot.set(`${row.key}:${column.key}`, valueFor(row, column.key));
    if (columns.length === 2) {
      const first = Number(valueFor(row, columns[0].key));
      const second = Number(valueFor(row, columns[1].key));
      snapshot.set(`${row.key}:change`, second - first);
      snapshot.set(`${row.key}:change_percent`, first === 0 ? null : (second - first) / Math.abs(first) * 100);
    }
  }
  return snapshot;
}

function visibleColumns(columns, view) {
  return view === "both" ? columns : columns.filter(column => column.key === view);
}

export function renderFinTable(container, {
  title,
  columns,
  rows,
  onChange = () => {},
  onViewChange = () => {},
  onRowFocus = () => {},
  onReset = () => {},
  view = columns?.[0]?.key || "both",
} = {}) {
  if (!container || !Array.isArray(columns) || columns.length === 0 || !Array.isArray(rows)) {
    throw new TypeError("renderFinTable needs a container, columns, and rows.");
  }
  if (columns.length < 2) throw new TypeError("Financial tables need at least two period columns.");

  const oldSnapshot = previousValues.get(container) || new Map();
  const newSnapshot = cellSnapshot(rows, columns);
  const changed = new Set([...newSnapshot.keys()].filter(key => oldSnapshot.has(key)
    && newSnapshot.get(key) !== oldSnapshot.get(key)));
  previousValues.set(container, newSnapshot);
  const selectedColumns = view === "all" || view === "both" ? columns : visibleColumns(columns, view);
  const showChanges = view === "both" && columns.length === 2;
  container.replaceChildren();
  const root = document.createElement("section");
  root.className = "fin-table-component";
  root.innerHTML = `
    <style>
      .fin-table-component { color: var(--text); }
      .fin-table-component * { box-sizing: border-box; }
      .fin-table-component button, .fin-table-component input { font: inherit; }
      .fin-table-component button:focus-visible, .fin-table-component input:focus-visible,
      .fin-table-component td[tabindex]:focus-visible, .fin-table-component th[tabindex]:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
      .fin-table-component .fin-table-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .7rem; margin-bottom: .65rem; }
      .fin-table-component .fin-table-actions, .fin-table-component .fin-table-views { display: flex; flex-wrap: wrap; gap: .4rem; }
      .fin-table-component .fin-table-toolbar button { border: 1px solid var(--border); border-radius: 999px; background: var(--bg); color: var(--text); cursor: pointer; padding: .45rem .75rem; }
      .fin-table-component .fin-table-toolbar button[aria-pressed="true"] { border-color: var(--primary); background: var(--primary); color: var(--bg); }
      .fin-table-component .fin-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: .75rem; }
      .fin-table-component table { width: 100%; min-width: 540px; border-collapse: collapse; background: var(--bg); }
      .fin-table-component caption { padding: .7rem .8rem; color: var(--primary); font-weight: 750; text-align: left; }
      .fin-table-component th, .fin-table-component td { padding: .5rem .65rem; border-top: 1px solid var(--border); text-align: right; vertical-align: middle; }
      .fin-table-component thead th { background: color-mix(in srgb, var(--primary) 8%, var(--bg)); color: var(--text); font-size: .85rem; }
      .fin-table-component thead th:first-child, .fin-table-component tbody th[scope="row"] { text-align: left; }
      .fin-table-component tbody th[scope="row"] { color: var(--text); font-weight: 600; }
      .fin-table-component .fin-table-row-note { display: block; margin-top: .2rem; color: var(--muted); font-size: .74rem; font-weight: 400; line-height: 1.3; }
      .fin-table-component tr[data-kind="formula"] td { background: color-mix(in srgb, var(--primary) 5%, var(--bg)); color: var(--muted); }
      .fin-table-component tr[data-kind="subtotal"] th, .fin-table-component tr[data-kind="subtotal"] td { border-top: 2px solid var(--primary); font-weight: 750; }
      .fin-table-component .fin-table-check-balanced { background: color-mix(in srgb, var(--success) 12%, var(--bg)); color: var(--success); font-weight: 750; }
      .fin-table-component .fin-table-check-unbalanced { background: color-mix(in srgb, var(--danger) 12%, var(--bg)); color: var(--danger); font-weight: 750; }
      .fin-table-component .fin-table-cell { min-width: 5.2rem; border: 1px solid transparent; border-radius: .3rem; background: transparent; color: var(--text); cursor: text; padding: .2rem .3rem; text-align: right; font-variant-numeric: tabular-nums; }
      .fin-table-component .fin-table-formula { display: block; width: 100%; min-height: 1.4rem; border: 0; background: transparent; color: inherit; cursor: help; padding: 0; text-align: right; }
      .fin-table-component .fin-table-cell.is-changed, .fin-table-component .fin-table-formula.is-changed { background: color-mix(in srgb, var(--accent) 24%, var(--bg)); }
      .fin-table-component .fin-table-feeds { outline: 2px solid var(--accent); outline-offset: -2px; }
      .fin-table-component .fin-table-editor { width: 7rem; border: 1px solid var(--primary); border-radius: .3rem; background: var(--bg); color: var(--text); padding: .25rem .35rem; text-align: right; }
      .fin-table-component .fin-table-invalid { display: block; color: var(--accent); font-size: .75rem; text-align: left; }
      .fin-table-component .fin-table-legend { display: flex; flex-wrap: wrap; gap: .5rem 1rem; margin: .55rem 0; color: var(--muted); font-size: .8rem; }
      .fin-table-component .fin-table-legend span::before { display: inline-block; width: .65rem; height: .65rem; margin-right: .35rem; border: 1px solid var(--border); border-radius: .15rem; background: var(--bg); content: ""; }
      .fin-table-component .fin-legend-formula::before { background: color-mix(in srgb, var(--primary) 18%, var(--bg)) !important; }
      .fin-table-component .fin-legend-total::before { border-top: 2px solid var(--primary) !important; }
      .fin-table-component .fin-table-message, .fin-table-component .fin-table-live { min-height: 1.25rem; margin: .35rem 0; color: var(--muted); font-size: .82rem; }
      .fin-table-component .fin-table-message { color: var(--accent); }
      .fin-table-component .fin-table-formula-note { min-height: 1.4rem; margin: .5rem 0; padding: .45rem .6rem; border-left: 3px solid var(--accent); background: color-mix(in srgb, var(--accent) 7%, var(--bg)); }
      @media (prefers-reduced-motion: reduce) { .fin-table-component *, .fin-table-component *::before, .fin-table-component *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
    </style>
    <div class="fin-table-toolbar">
      <div class="fin-table-views" role="group" aria-label="Choose table columns" data-views></div>
      <div class="fin-table-actions"><button type="button" data-reset>Reset to example</button><button type="button" data-copy>Copy as CSV</button></div>
    </div>
    <div class="fin-table-wrap"><table><caption></caption><thead></thead><tbody></tbody></table></div>
    <div class="fin-table-legend" aria-label="Table cell legend"><span class="fin-legend-input">Input cells</span><span class="fin-legend-formula">Calculated cells</span><span class="fin-legend-total">Totals</span></div>
    <p class="fin-table-formula-note" data-formula-note aria-live="polite">Focus a calculated cell to see its formula.</p>
    <p class="fin-table-message" data-message role="alert" hidden></p>
    <p class="fin-table-live" data-live role="status" aria-live="polite" aria-atomic="true"></p>
  `;
  container.append(root);

  const table = root.querySelector("table");
  const caption = table.querySelector("caption");
  caption.textContent = title || "Financial statement";
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  const formulaNote = root.querySelector("[data-formula-note]");
  formulaNote.id = `fin-table-formula-note-${nextNoteId++}`;
  const message = root.querySelector("[data-message]");
  latestRows.set(container, { rows, columns });
  const views = root.querySelector("[data-views]");
  for (const column of columns) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.view = column.key;
    button.textContent = column.label;
    button.setAttribute("aria-pressed", String(view === column.key));
    button.addEventListener("click", () => onViewChange(column.key));
    views.append(button);
  }
  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.dataset.view = columns.length === 2 ? "both" : "all";
  allButton.textContent = columns.length === 2 ? "Both" : "All three";
  allButton.setAttribute("aria-pressed", String(view === "both" || view === "all"));
  allButton.addEventListener("click", () => onViewChange(allButton.dataset.view));
  views.append(allButton);
  const header = document.createElement("tr");
  const labelHeader = document.createElement("th");
  labelHeader.scope = "col";
  labelHeader.textContent = "Line item";
  header.append(labelHeader);
  for (const column of selectedColumns) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = column.label;
    header.append(th);
  }
  if (showChanges) {
    for (const label of ["Change", "Change %"]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      header.append(th);
    }
  }
  thead.append(header);

  function updateFormula(cell, row, columnKey, value) {
    formulaNote.textContent = formulaFor(row, columns.find(item => item.key === columnKey), rows, columnKey, value);
  }

  root.querySelector("[data-reset]").addEventListener("click", () => onReset());
  root.querySelector("[data-copy]").addEventListener("click", async () => {
    const lines = [];
    for (const tr of [header, ...tbody.querySelectorAll("tr")]) {
      const values = [...tr.children].map(cell => {
        if (cell.matches("th[scope='row']")) return cell.dataset.csvLabel || cell.textContent.trim();
        const control = cell.querySelector("button, input");
        return control ? (control.matches("input") ? control.value : control.textContent.trim()) : cell.textContent.trim();
      });
      lines.push(values.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","));
    }
    try {
      await navigator.clipboard.writeText(lines.join("\r\n"));
      message.hidden = false;
      message.textContent = "Table copied as CSV.";
    } catch {
      message.hidden = false;
      message.textContent = "Clipboard access is unavailable in this context.";
    }
  });

  rows.forEach(row => {
    const tr = document.createElement("tr");
    tr.dataset.rowKey = row.key;
    tr.dataset.kind = row.kind;
    const rowHeader = document.createElement("th");
    rowHeader.scope = "row";
    rowHeader.dataset.csvLabel = row.label;
    const rowTitle = document.createElement("span");
    rowTitle.textContent = row.label;
    rowHeader.append(rowTitle);
    if (row.note) {
      const note = document.createElement("small");
      note.className = "fin-table-row-note";
      note.textContent = row.note;
      rowHeader.append(note);
    }
    if (row.kind === "subtotal") {
      rowHeader.tabIndex = 0;
      rowHeader.dataset.dependsOn = (row.dependsOn || []).join(",");
      rowHeader.setAttribute("aria-label", `${row.label}, highlight its inputs`);
    }
    tr.append(rowHeader);
    for (const column of selectedColumns) {
      const value = valueFor(row, column.key);
      const td = document.createElement("td");
      td.dataset.rowKey = row.key;
      td.dataset.columnKey = column.key;
      const snapshotKey = `${row.key}:${column.key}`;
      if (row.kind === "input") {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `fin-table-cell${changed.has(snapshotKey) ? " is-changed" : ""}`;
        button.dataset.editCell = "true";
        button.dataset.rowKey = row.key;
        button.dataset.columnKey = column.key;
        button.textContent = numericFormat(value, row.format);
        button.setAttribute("aria-label", `Edit ${row.label}, ${column.label}: ${numericFormat(value, row.format)}`);
        td.append(button);
      } else if ((row.kind === "formula" || row.kind === "subtotal") && row.formula) {
        td.tabIndex = 0;
        const formulaButton = document.createElement("button");
        formulaButton.type = "button";
        formulaButton.className = `fin-table-formula${changed.has(snapshotKey) ? " is-changed" : ""}`;
        formulaButton.dataset.formulaCell = "true";
        formulaButton.dataset.rowKey = row.key;
        formulaButton.dataset.columnKey = column.key;
        formulaButton.textContent = numericFormat(value, row.format);
        formulaButton.setAttribute("aria-label", `${row.label}: ${numericFormat(value, row.format)}. Show formula.`);
        formulaButton.setAttribute("aria-describedby", formulaNote.id);
        formulaButton.addEventListener("focus", () => updateFormula(formulaButton, row, column.key, value));
        formulaButton.addEventListener("mouseenter", () => updateFormula(formulaButton, row, column.key, value));
        td.append(formulaButton);
      } else {
        td.textContent = row.kind === "check"
          ? (Number(value) === 0 ? (row.balancedLabel || "Balanced") : numericFormat(value, row.format))
          : numericFormat(value, row.format);
        if (row.kind === "check") td.classList.add(Number(value) === 0 ? "fin-table-check-balanced" : "fin-table-check-unbalanced");
      }
      if (changed.has(snapshotKey)) td.classList.add("is-changed");
      tr.append(td);
    }

    if (showChanges) {
      const first = Number(valueFor(row, columns[0].key));
      const second = Number(valueFor(row, columns[1].key));
      const difference = second - first;
      const differencePercent = first === 0 ? null : difference / Math.abs(first) * 100;
      for (const [suffix, value, format] of [["change", difference, row.format], ["change_percent", differencePercent, "percent"]]) {
        const td = document.createElement("td");
        td.dataset.rowKey = row.key;
        td.dataset.columnKey = suffix;
        td.textContent = value === null ? "—" : numericFormat(value, format);
        if (changed.has(`${row.key}:${suffix}`)) td.classList.add("is-changed");
        tr.append(td);
      }
    }
    tbody.append(tr);
  });

  function clearHighlights() {
    const timers = highlightTimers.get(container) || [];
    timers.forEach(timer => clearTimeout(timer));
    const timer = setTimeout(() => root.querySelectorAll(".is-changed").forEach(cell => cell.classList.remove("is-changed")), 1100);
    highlightTimers.set(container, [timer]);
  }
  if (changed.size) clearHighlights();

  function startEdit(button) {
    if (!button?.isConnected) return;
    const { rowKey, columnKey } = button.dataset;
    const row = rows.find(item => item.key === rowKey);
    const cell = button.closest("td");
    const editor = document.createElement("input");
    editor.type = "text";
    editor.inputMode = "numeric";
    editor.className = "fin-table-editor";
    editor.value = String(valueFor(row, columnKey));
    editor.setAttribute("aria-label", `Edit ${row.label}, ${columnKey}`);
    const invalid = document.createElement("span");
    invalid.className = "fin-table-invalid";
    invalid.hidden = true;
    invalid.textContent = "Enter a whole number.";
    cell.replaceChildren(editor, invalid);
    editor.focus();
    editor.select();
    const cancel = () => { cell.replaceChildren(button); button.focus(); };
    const focusEditCell = (targetRow, targetColumn) => {
      setTimeout(() => [...root.querySelectorAll("[data-edit-cell]")]
        .find(item => item.dataset.rowKey === targetRow && item.dataset.columnKey === targetColumn)?.focus(), 0);
    };
    const commit = () => {
      if (!/^-?\d+$/.test(editor.value.trim())) {
        invalid.hidden = false;
        editor.setAttribute("aria-invalid", "true");
        editor.focus();
        return false;
      }
      const value = Number(editor.value.trim());
      message.hidden = true;
      onChange({ rowKey, columnKey, value });
      const liveRegion = container.querySelector("[data-live]");
      const latest = latestRows.get(container);
      const currentSnapshot = previousValues.get(container) || new Map();
      const announcements = [];
      for (const changedKey of currentSnapshot.keys()) {
        if (!changedKey.endsWith(`:${columnKey}`)) continue;
        const changedRowKey = changedKey.slice(0, -columnKey.length - 1);
        const changedRow = latest?.rows.find(item => item.key === changedRowKey);
        if (changedRow && currentSnapshot.get(changedKey) !== oldSnapshot.get(changedKey)) {
          announcements.push(`${changedRow.label} is now ${numericFormat(valueFor(changedRow, columnKey), changedRow.format)}.`);
        }
      }
      if (!announcements.length) announcements.push(`${row.label} is now ${numericFormat(value, row.format)}.`);
      if (liveRegion) liveRegion.textContent = announcements.join(" ");
      return true;
    };
    editor.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (commit()) focusEditCell(rowKey, columnKey);
      }
      if (event.key === "Escape") { event.preventDefault(); cancel(); }
      if (event.key === "Tab") {
        const cells = [...root.querySelectorAll("[data-edit-cell]")];
        const index = cells.findIndex(item => item.dataset.rowKey === rowKey && item.dataset.columnKey === columnKey);
        const targetIndex = (index + (event.shiftKey ? -1 : 1) + cells.length) % cells.length;
        event.preventDefault();
        if (commit()) setTimeout(() => root.querySelectorAll("[data-edit-cell]")[targetIndex]?.focus(), 0);
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        const cells = [...root.querySelectorAll("[data-edit-cell]")];
        const currentIndex = cells.findIndex(item => item.dataset.rowKey === rowKey && item.dataset.columnKey === columnKey);
        const target = cells[currentIndex + direction];
        if (target && commit()) focusEditCell(target.dataset.rowKey, target.dataset.columnKey);
      }
    });
    editor.addEventListener("blur", () => {
      if (!cell.contains(editor)) return;
      if (editor.value === String(valueFor(row, columnKey))) cancel();
      else commit();
    });
  }

  root.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-cell]");
    if (editButton) { startEdit(editButton); return; }
    const subtotal = event.target.closest("tr[data-kind='subtotal']");
    if (subtotal) {
      const subtotalHeader = subtotal.querySelector("th[scope='row'][data-depends-on]");
      const dependencies = subtotalHeader.dataset.dependsOn.split(",").filter(Boolean);
      root.querySelectorAll(".fin-table-feeds").forEach(cell => cell.classList.remove("fin-table-feeds"));
      for (const key of dependencies) root.querySelectorAll(`[data-row-key="${key}"]`).forEach(cell => cell.classList.add("fin-table-feeds"));
    }
  });
  root.addEventListener("focusin", event => {
    const line = event.target.closest("tr[data-row-key]");
    if (line) onRowFocus(line.dataset.rowKey);
  });
  root.addEventListener("mouseover", event => {
    const line = event.target.closest("tr[data-row-key]");
    if (line && !line.contains(event.relatedTarget)) onRowFocus(line.dataset.rowKey);
  });
  root.addEventListener("keydown", event => {
    const subtotalHeader = event.target.closest("th[scope='row'][data-depends-on]");
    if (subtotalHeader && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      subtotalHeader.closest("tr").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      return;
    }
    const current = event.target.closest("[data-edit-cell], [data-formula-cell], th[scope='row'][data-depends-on]");
    if (!current || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const cells = [...root.querySelectorAll("[data-edit-cell], [data-formula-cell], th[scope='row'][data-depends-on]")];
    const index = cells.indexOf(current);
    const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
    cells[index + direction]?.focus();
  });

  return { view, rows, columns };
}
