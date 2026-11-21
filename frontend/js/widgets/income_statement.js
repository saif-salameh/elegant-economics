import { computeIncomeStatement } from "./fin_model.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const FORMAT_DEFINITION_IDS = ["6.1.3", "6.1.5", "6.1.7", "6.1.8"];
const LINE_DEFINITION_IDS = {
  revenue: ["6.1.2"],
  cogs: ["6.1.3"],
  gross_profit: ["6.1.4"],
  operating_expenses: ["6.1.5"],
  operating_income: ["6.1.6"],
  interest_expense: ["6.1.7"],
  pretax_income: [],
  income_taxes: ["6.1.8"],
  net_income: ["6.1.9"],
  earnings_per_share: ["6.1.10"],
  total_expenses: FORMAT_DEFINITION_IDS,
};
const CONCEPT_HIGHLIGHTS = {
  "6.1.1": ["all"],
  "6.1.2": ["revenue"],
  "6.1.3": ["cogs"],
  "6.1.4": ["gross_profit"],
  "6.1.5": ["operating_expenses"],
  "6.1.6": ["operating_income"],
  "6.1.7": ["interest_expense"],
  "6.1.8": ["income_taxes"],
  "6.1.9": ["net_income"],
  "6.1.10": ["earnings_per_share"],
  "6.1.11": ["format"],
  "6.1.12": ["all"],
};

const money = value => Math.round(Number(value) || 0);
const formatMoney = value => money(value).toLocaleString("en-US");
const formatPercent = value => `${(Number(value) || 0).toFixed(1)}%`;

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function setText(element, value) {
  element.textContent = String(value);
}

function makeTemplate() {
  const section = document.createElement("section");
  section.className = "income-statement-widget";
  section.innerHTML = `
    <style>
      .income-statement-widget { color: var(--text); }
      .income-statement-widget * { box-sizing: border-box; }
      .income-statement-widget .is-toolbar,
      .income-statement-widget .is-year-toggle,
      .income-statement-widget .is-format-toggle { display: flex; flex-wrap: wrap; gap: .55rem; align-items: center; }
      .income-statement-widget .is-toolbar { justify-content: space-between; gap: 1rem; margin-bottom: 1.1rem; }
      .income-statement-widget .is-year-toggle button,
      .income-statement-widget .is-format-toggle button,
      .income-statement-widget .is-metric-button { border: 1px solid var(--border); border-radius: 999px; background: var(--bg); color: var(--text); cursor: pointer; font: inherit; padding: .5rem .85rem; }
      .income-statement-widget button[aria-pressed="true"] { border-color: var(--primary); background: var(--primary); color: var(--bg); }
      .income-statement-widget button:focus-visible,
      .income-statement-widget input:focus-visible,
      .income-statement-widget .waterfall-bar:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
      .income-statement-widget .is-format-toggle.is-concept-match { border-radius: 1rem; box-shadow: 0 0 0 3px var(--accent); padding: .35rem; }
      .income-statement-widget .is-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: .8rem 1rem; margin: 1rem 0; }
      .income-statement-widget .is-control { display: grid; gap: .35rem; }
      .income-statement-widget .is-control label { color: var(--muted); font-size: .88rem; font-weight: 650; }
      .income-statement-widget .is-control input { width: 100%; min-height: 42px; border: 1px solid var(--border); border-radius: .6rem; padding: .45rem .65rem; background: var(--bg); color: var(--text); font: inherit; }
      .income-statement-widget .is-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: .65rem; margin: 1.1rem 0; }
      .income-statement-widget .is-metric { min-width: 0; border: 1px solid var(--border); border-radius: .8rem; background: color-mix(in srgb, var(--primary) 7%, var(--bg)); padding: .75rem; }
      .income-statement-widget .is-metric-label { display: block; color: var(--muted); font-size: .82rem; }
      .income-statement-widget .is-metric-value { display: block; margin-top: .15rem; color: var(--text); font-size: 1.2rem; font-weight: 750; }
      .income-statement-widget .is-metric-button { width: 100%; border-radius: .8rem; text-align: left; }
      .income-statement-widget .is-metric.is-concept-match { outline: 3px solid var(--accent); outline-offset: 2px; }
      .income-statement-widget .is-chart-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: .9rem; background: var(--bg); padding: .6rem; }
      .income-statement-widget .is-chart { display: block; width: 100%; min-width: 720px; height: auto; }
      .income-statement-widget .chart-grid { stroke: var(--border); stroke-width: 1; }
      .income-statement-widget .chart-axis { stroke: var(--text); stroke-width: 1.2; }
      .income-statement-widget .chart-label,
      .income-statement-widget .chart-value { fill: var(--text); font-family: inherit; font-size: 12px; }
      .income-statement-widget .chart-value { font-size: 11px; font-weight: 700; }
      .income-statement-widget .bar-rect { fill: var(--primary); stroke: var(--primary); stroke-width: 1; }
      .income-statement-widget .bar-revenue .bar-rect,
      .income-statement-widget .bar-result .bar-rect { fill: var(--accent); stroke: var(--accent); }
      .income-statement-widget .bar-deduction .bar-rect { fill: color-mix(in srgb, var(--accent) 72%, var(--primary)); stroke: var(--accent); }
      .income-statement-widget .waterfall-bar { cursor: pointer; transition: opacity .16s ease, filter .16s ease; }
      .income-statement-widget .waterfall-bar:hover { filter: brightness(1.08); }
      .income-statement-widget .waterfall-bar.is-concept-match .bar-rect { stroke: var(--text); stroke-width: 4; }
      .income-statement-widget .is-definition { min-height: 4.5rem; margin-top: .9rem; padding: .8rem 1rem; border-left: 3px solid var(--primary); background: color-mix(in srgb, var(--primary) 7%, var(--bg)); }
      .income-statement-widget .is-definition h3 { margin: 0 0 .35rem; color: var(--primary); font-size: 1rem; }
      .income-statement-widget .is-definition p { margin: .25rem 0; line-height: 1.5; }
      .income-statement-widget .is-da-note,
      .income-statement-widget .is-caption { margin: .7rem 0 0; color: var(--muted); font-size: .9rem; }
      .income-statement-widget .is-error { margin: .7rem 0; color: var(--accent); font-weight: 650; }
      .income-statement-widget .is-highlight-all .waterfall-bar:not(.is-concept-match) { opacity: .78; }
      @media (prefers-reduced-motion: reduce) {
        .income-statement-widget .waterfall-bar { transition: none; }
      }
    </style>
    <div class="is-toolbar">
      <div class="is-year-toggle" role="group" aria-label="Choose statement year">
        <button type="button" data-year="year_1" aria-pressed="true">Year 1</button>
        <button type="button" data-year="year_2" aria-pressed="false">Year 2</button>
      </div>
      <div class="is-format-toggle" role="group" aria-label="Income statement format">
        <button type="button" data-format="multi" aria-pressed="true">Multi-step</button>
        <button type="button" data-format="single" aria-pressed="false">Single-step</button>
      </div>
    </div>
    <div class="is-controls" aria-label="Income statement inputs">
      <div class="is-control"><label for="is-revenue">Revenue</label><input id="is-revenue" data-input="revenue" type="number" min="0" max="10000000" step="1" inputmode="numeric"></div>
      <div class="is-control"><label for="is-cogs">Cost of goods sold</label><input id="is-cogs" data-input="cogs" type="number" min="0" max="10000000" step="1" inputmode="numeric"></div>
      <div class="is-control"><label for="is-operating-expenses">Operating expenses</label><input id="is-operating-expenses" data-input="operating_expenses" type="number" min="0" max="10000000" step="1" inputmode="numeric"></div>
      <div class="is-control"><label for="is-interest">Interest expense</label><input id="is-interest" data-input="interest_expense" type="number" min="0" max="10000000" step="1" inputmode="numeric"></div>
      <div class="is-control"><label for="is-tax-rate">Tax rate (%)</label><input id="is-tax-rate" data-input="tax_rate_percent" type="number" min="0" max="100" step="0.1" inputmode="decimal"></div>
    </div>
    <div class="is-metrics" aria-label="Margins and per-share results">
      <div class="is-metric"><span class="is-metric-label">Gross margin</span><span class="is-metric-value" data-metric="gross_margin">—</span></div>
      <div class="is-metric"><span class="is-metric-label">Operating margin</span><span class="is-metric-value" data-metric="operating_margin">—</span></div>
      <div class="is-metric"><span class="is-metric-label">Net margin</span><span class="is-metric-value" data-metric="net_margin">—</span></div>
      <button type="button" class="is-metric is-metric-button" data-line="earnings_per_share" aria-describedby="is-definition">
        <span class="is-metric-label">Earnings per share · 100 shares</span><span class="is-metric-value" data-metric="earnings_per_share">—</span>
      </button>
    </div>
    <div class="is-chart-wrap"><svg class="is-chart" role="img" aria-label="Income statement waterfall chart"></svg></div>
    <p class="is-da-note" data-da-note></p>
    <section class="is-definition" id="is-definition" aria-live="polite" aria-atomic="true">
      <h3 data-definition-title>Line definition</h3>
      <div data-definition-content><p>Focus a bar to read its source definition.</p></div>
    </section>
    <p class="is-caption">Illustrative model, fictional company, not real data</p>
    <p class="is-error" role="alert" hidden></p>
  `;
  return section;
}

function chartBars(statement, format) {
  if (format === "single") {
    const totalExpenses = money(statement.revenue - statement.net_income);
    return [
      { key: "revenue", label: ["Revenue"], amount: statement.revenue, start: 0, end: statement.revenue, kind: "revenue" },
      { key: "total_expenses", label: ["Total", "expenses"], amount: -totalExpenses, start: statement.revenue, end: statement.net_income, kind: "deduction", includes: ["cogs", "operating_expenses", "interest_expense", "income_taxes"] },
      { key: "net_income", label: ["Net", "income"], amount: statement.net_income, start: 0, end: statement.net_income, kind: "result" },
    ];
  }

  return [
    { key: "revenue", label: ["Revenue"], amount: statement.revenue, start: 0, end: statement.revenue, kind: "revenue" },
    { key: "cogs", label: ["Cost of", "goods sold"], amount: -statement.cogs, start: statement.revenue, end: statement.gross_profit, kind: "deduction" },
    { key: "gross_profit", label: ["Gross", "profit"], amount: statement.gross_profit, start: 0, end: statement.gross_profit, kind: "subtotal" },
    { key: "operating_expenses", label: ["Operating", "expenses"], amount: -statement.operating_expenses, start: statement.gross_profit, end: statement.operating_income, kind: "deduction" },
    { key: "operating_income", label: ["Operating", "income"], amount: statement.operating_income, start: 0, end: statement.operating_income, kind: "subtotal" },
    { key: "interest_expense", label: ["Interest"], amount: -statement.interest_expense, start: statement.operating_income, end: statement.pre_tax_income, kind: "deduction" },
    { key: "pretax_income", label: ["Pre-tax", "income"], amount: statement.pre_tax_income, start: 0, end: statement.pre_tax_income, kind: "subtotal" },
    { key: "income_taxes", label: ["Income", "taxes"], amount: -statement.income_taxes, start: statement.pre_tax_income, end: statement.net_income, kind: "deduction" },
    { key: "net_income", label: ["Net", "income"], amount: statement.net_income, start: 0, end: statement.net_income, kind: "result" },
  ];
}

function createBarDefinitionHandler(definitions, content, title) {
  return (lineKey, lineLabel) => {
    content.replaceChildren();
    setText(title, lineLabel);
    const ids = LINE_DEFINITION_IDS[lineKey] || [];
    const found = ids.map(id => definitions.get(id)).filter(Boolean);
    if (!found.length) {
      const empty = document.createElement("p");
      empty.textContent = "No matching concept definition is available for this line.";
      content.append(empty);
      return;
    }
    for (const concept of found) {
      const paragraph = document.createElement("p");
      paragraph.textContent = concept.definition;
      paragraph.setAttribute("data-definition-source", concept.source_id);
      content.append(paragraph);
    }
  };
}

function drawWaterfall(svg, statement, format, currentConceptId) {
  const bars = chartBars(statement, format);
  const width = 1040;
  const height = 430;
  const margin = { top: 28, right: 28, bottom: 82, left: 76 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const levels = bars.flatMap(bar => [bar.start, bar.end]);
  const minValue = Math.min(0, ...levels);
  const maxValue = Math.max(0, ...levels);
  const spread = Math.max(1, maxValue - minValue);
  const low = minValue < 0 ? minValue - spread * 0.08 : 0;
  const high = maxValue > 0 ? maxValue + spread * 0.1 : spread;
  const y = value => margin.top + ((high - value) / (high - low)) * plotHeight;
  const zeroY = y(0);
  const slotWidth = plotWidth / bars.length;
  const barWidth = Math.min(68, slotWidth * 0.58);
  const selectedLines = CONCEPT_HIGHLIGHTS[currentConceptId] || [];
  const highlighted = selectedLines.includes("all");

  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-label", `${format === "multi" ? "Multi-step" : "Single-step"} income statement waterfall. Net income ${formatMoney(statement.net_income)}.`);

  const titleElement = svgElement("title");
  titleElement.textContent = `${format === "multi" ? "Multi-step" : "Single-step"} income statement waterfall`;
  const desc = svgElement("desc");
  desc.textContent = "Revenue minus expenses leads to net income. Select or focus a bar to show its source definition.";
  svg.append(titleElement, desc);

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = high - ((high - low) * tick) / 4;
    const tickY = y(value);
    const grid = svgElement("line", {
      x1: margin.left,
      y1: tickY,
      x2: width - margin.right,
      y2: tickY,
      class: tick === 4 && low === 0 ? "chart-axis" : "chart-grid",
    });
    const label = svgElement("text", {
      x: margin.left - 10,
      y: tickY + 4,
      "text-anchor": "end",
      class: "chart-label",
    });
    label.textContent = formatMoney(value);
    svg.append(grid, label);
  }

  const baseline = svgElement("line", {
    x1: margin.left,
    y1: zeroY,
    x2: width - margin.right,
    y2: zeroY,
    class: "chart-axis",
  });
  svg.append(baseline);

  bars.forEach((bar, index) => {
    const centerX = margin.left + slotWidth * (index + 0.5);
    const x = centerX - barWidth / 2;
    const top = y(Math.max(bar.start, bar.end));
    const bottom = y(Math.min(bar.start, bar.end));
    const barHeight = Math.max(2, bottom - top);
    const isHighlighted = highlighted || selectedLines.includes(bar.key)
      || (bar.includes || []).some(line => selectedLines.includes(line));
    const group = svgElement("g", {
      class: `waterfall-bar bar-${bar.kind}${isHighlighted ? " is-concept-match" : ""}`,
      tabindex: "0",
      role: "button",
      "data-line": bar.key,
      "data-label": bar.label.join(" "),
      "aria-describedby": "is-definition",
      "aria-pressed": "false",
    });
    group.setAttribute("aria-label", `${bar.label.join(" ")}: ${bar.amount < 0 ? "minus " : ""}${formatMoney(Math.abs(bar.amount))}`);
    const rect = svgElement("rect", {
      x,
      y: top,
      width: barWidth,
      height: barHeight,
      rx: 3,
      class: "bar-rect",
    });
    const valueLabel = svgElement("text", {
      x: centerX,
      y: Math.max(margin.top + 14, top - 7),
      "text-anchor": "middle",
      class: "chart-value",
    });
    valueLabel.textContent = `${bar.amount < 0 ? "−" : ""}${formatMoney(Math.abs(bar.amount))}`;
    const categoryLabel = svgElement("text", {
      x: centerX,
      y: zeroY + (zeroY < margin.top + plotHeight / 2 ? 25 : 22),
      "text-anchor": "middle",
      class: "chart-label",
    });
    bar.label.forEach((part, lineIndex) => {
      const span = svgElement("tspan", {
        x: centerX,
        dy: lineIndex === 0 ? 0 : 14,
      });
      span.textContent = part;
      categoryLabel.append(span);
    });
    group.append(rect, valueLabel, categoryLabel);
    svg.append(group);
  });
}

export async function init(widgetContainer) {
  const root = makeTemplate();
  widgetContainer.replaceChildren(root);

  const get = selector => root.querySelector(selector);
  const inputs = Object.fromEntries(
    [...root.querySelectorAll("[data-input]")].map(input => [input.dataset.input, input]),
  );
  const yearButtons = [...root.querySelectorAll("[data-year]")];
  const formatButtons = [...root.querySelectorAll("[data-format]")];
  const svg = get(".is-chart");
  const error = get(".is-error");
  const definitionContent = get("[data-definition-content]");
  const definitionTitle = get("[data-definition-title]");
  const state = { example: null, year: "year_1", format: "multi", definitions: new Map() };
  const conceptId = String(widgetContainer.dataset.conceptId || "");

  let exampleResponse;
  try {
    exampleResponse = await fetch("/api/financial-example", { headers: { Accept: "application/json" } });
    if (!exampleResponse.ok) throw new Error(`HTTP ${exampleResponse.status}`);
    state.example = await exampleResponse.json();
  } catch (loadError) {
    error.hidden = false;
    error.textContent = `Could not load the financial example. ${loadError.message}`;
    svg.setAttribute("aria-label", "Financial example unavailable");
    return;
  }

  const definitionView = createBarDefinitionHandler(state.definitions, definitionContent, definitionTitle);
  try {
    const conceptsResponse = await fetch("/api/concepts", { headers: { Accept: "application/json" } });
    if (!conceptsResponse.ok) throw new Error(`HTTP ${conceptsResponse.status}`);
    const payload = await conceptsResponse.json();
    const concepts = Array.isArray(payload) ? payload : payload?.concepts;
    if (!Array.isArray(concepts)) throw new Error("Unexpected concepts API response.");
    for (const concept of concepts) {
      if (/^6\.1\.(?:[2-9]|10)$/.test(concept.source_id || "")) {
        state.definitions.set(concept.source_id, concept);
      }
    }
  } catch (loadError) {
    error.hidden = false;
    error.textContent = `Definitions could not be loaded from /api/concepts. ${loadError.message}`;
  }

  function currentInputs() {
    return {
      revenue: inputs.revenue.value,
      cogs: inputs.cogs.value,
      operating_expenses: inputs.operating_expenses.value,
      interest_expense: inputs.interest_expense.value,
      tax_rate: Number(inputs.tax_rate_percent.value) / 100,
      shares_outstanding: state.example.shares_outstanding || 100,
      depreciation_and_amortization_included_in_operating_expenses:
        state.example.cash_flow_statement[state.year].depreciation_and_amortization,
    };
  }

  function showDefinition(lineKey, label) {
    definitionView(lineKey, label);
  }

  function update() {
    const statement = computeIncomeStatement(currentInputs());
    const denominator = statement.revenue;
    setText(get('[data-metric="gross_margin"]'), formatPercent(denominator ? statement.gross_profit / denominator * 100 : 0));
    setText(get('[data-metric="operating_margin"]'), formatPercent(denominator ? statement.operating_income / denominator * 100 : 0));
    setText(get('[data-metric="net_margin"]'), formatPercent(denominator ? statement.net_income / denominator * 100 : 0));
    setText(get('[data-metric="earnings_per_share"]'), statement.earnings_per_share.toFixed(2));
    setText(
      get("[data-da-note]"),
      `Depreciation and amortization of ${formatMoney(statement.depreciation_and_amortization_included_in_operating_expenses)} is included in operating expenses; it is a non-cash expense.`,
    );
    drawWaterfall(svg, statement, state.format, conceptId);
  }

  function setYear(year) {
    state.year = year;
    const source = state.example.income_statement[year];
    for (const button of yearButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.year === year));
    }
    inputs.revenue.value = source.revenue;
    inputs.cogs.value = source.cogs;
    inputs.operating_expenses.value = source.operating_expenses;
    inputs.interest_expense.value = source.interest_expense;
    const sampleYear1 = state.example.income_statement.year_1;
    const taxRate = sampleYear1.pre_tax_income
      ? sampleYear1.income_taxes / sampleYear1.pre_tax_income
      : 0;
    inputs.tax_rate_percent.value = (taxRate * 100).toFixed(1);
    update();
  }

  function setFormat(format) {
    state.format = format;
    for (const button of formatButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.format === format));
      button.classList.toggle(
        "is-concept-match",
        conceptId === "6.1.11" && button.dataset.format === format,
      );
    }
    update();
  }

  for (const button of yearButtons) {
    button.addEventListener("click", () => setYear(button.dataset.year));
  }
  for (const button of formatButtons) {
    button.addEventListener("click", () => setFormat(button.dataset.format));
  }
  for (const input of Object.values(inputs)) {
    input.addEventListener("input", update);
  }

  svg.addEventListener("focusin", event => {
    const bar = event.target.closest(".waterfall-bar");
    if (bar) showDefinition(bar.dataset.line, bar.dataset.label);
  });
  svg.addEventListener("click", event => {
    const bar = event.target.closest(".waterfall-bar");
    if (bar) {
      showDefinition(bar.dataset.line, bar.dataset.label);
      bar.setAttribute("aria-pressed", "true");
      for (const other of svg.querySelectorAll(".waterfall-bar")) {
        if (other !== bar) other.setAttribute("aria-pressed", "false");
      }
    }
  });
  svg.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".waterfall-bar")) {
      event.preventDefault();
      event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  get('[data-line="earnings_per_share"]').addEventListener("focus", () => {
    showDefinition("earnings_per_share", "Earnings per share");
  });
  get('[data-line="earnings_per_share"]').addEventListener("click", () => {
    showDefinition("earnings_per_share", "Earnings per share");
  });
  get('[data-line="earnings_per_share"]').classList.toggle(
    "is-concept-match",
    CONCEPT_HIGHLIGHTS[conceptId]?.includes("earnings_per_share") || false,
  );

  const matchingLine = CONCEPT_HIGHLIGHTS[conceptId]?.[0];
  if (matchingLine && matchingLine !== "all" && matchingLine !== "format") {
    showDefinition(matchingLine, "Concept definition");
  } else if (conceptId === "6.1.11") {
    showDefinition("format", "Single-step and multi-step formats");
  }
  setYear("year_1");
  setFormat(state.format);
}
