import {
  computeCashFlowStatement,
  computeDirectOperatingCashFlow,
  reclassifyInterestPaid,
} from "./fin_model.js";
import { renderFinTable } from "./fin_table.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFINITION_IDS = {
  net_income: ["6.3.9"],
  depreciation_and_amortization: ["6.3.7"],
  increase_in_accounts_receivable: ["6.3.8"],
  increase_in_inventory: ["6.3.8"],
  increase_in_accounts_payable: ["6.3.8"],
  cash_flow_from_operating_activities: ["6.3.2"],
  cash_received_from_customers: ["6.3.5", "6.4.3"],
  cash_paid_to_suppliers: ["6.3.5", "6.4.3"],
  cash_paid_for_operating_expenses: ["6.3.5", "6.4.3"],
  interest_paid: ["6.3.5", "6.4.2"],
  interest_paid_financing: ["6.4.2"],
  interest_reclassified_from_operations: ["6.4.2"],
  income_taxes_paid: ["6.3.5", "6.4.3"],
  capital_expenditure: ["6.3.3"],
  cash_flow_from_investing_activities: ["6.3.3"],
  debt_repaid: ["6.3.4"],
  dividends_paid: ["6.3.4"],
  debt_issued: ["6.3.4"],
  debt_flow: ["6.3.4"],
  cash_flow_from_financing_activities: ["6.3.4"],
  net_change_in_cash: ["6.3.1"],
  ending_cash: ["6.3.11", "6.4.1"],
  free_cash_flow: ["6.3.10"],
  beginning_cash: ["6.4.1", "6.4.5"],
  reconciliation_to_balance_sheet: ["6.4.5"],
};
const CONCEPT_HIGHLIGHTS = {
  "6.3.1": ["all"],
  "6.3.2": ["cash_flow_from_operating_activities"],
  "6.3.3": ["capital_expenditure", "cash_flow_from_investing_activities"],
  "6.3.4": ["debt_repaid", "dividends_paid", "cash_flow_from_financing_activities"],
  "6.3.5": ["presentation_direct"],
  "6.3.6": ["presentation_indirect"],
  "6.3.7": ["depreciation_and_amortization"],
  "6.3.8": ["increase_in_accounts_receivable", "increase_in_inventory", "increase_in_accounts_payable"],
  "6.3.9": ["net_income", "cash_flow_from_operating_activities"],
  "6.3.10": ["free_cash_flow"],
  "6.3.11": ["ending_cash"],
  "6.4.1": ["ending_cash"],
  "6.4.2": ["interest_classification"],
  "6.4.3": ["presentation_direct"],
  "6.4.4": ["presentation_indirect"],
};

const whole = value => Math.round(Number(value) || 0);
const amountText = value => whole(value).toLocaleString("en-US");
const setText = (element, value) => {
  if (element) element.textContent = String(value);
};

function svgElement(name, attrs = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  return element;
}

function template() {
  const root = document.createElement("section");
  root.className = "cash-flow-widget";
  root.innerHTML = `
    <style>
      .cash-flow-widget { color: var(--text); }
      .cash-flow-widget * { box-sizing: border-box; }
      .cash-flow-widget button,
      .cash-flow-widget input { font: inherit; }
      .cash-flow-widget button:focus-visible,
      .cash-flow-widget input:focus-visible,
      .cash-flow-widget .cf-bar:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
      .cash-flow-widget .cf-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .8rem 1rem; margin-bottom: 1rem; }
      .cash-flow-widget .cf-button-group { display: flex; flex-wrap: wrap; gap: .45rem; }
      .cash-flow-widget .cf-button-group button,
      .cash-flow-widget .cf-ifrs button { border: 1px solid var(--border); border-radius: 999px; background: var(--bg); color: var(--text); cursor: pointer; padding: .5rem .8rem; }
      .cash-flow-widget button[aria-pressed="true"] { border-color: var(--primary); background: var(--primary); color: var(--bg); }
      .cash-flow-widget button.is-concept-match,
      .cash-flow-widget .cf-control.is-concept-match { box-shadow: 0 0 0 3px var(--accent); }
      .cash-flow-widget .cf-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: .8rem 1rem; margin: 1rem 0; }
      .cash-flow-widget .cf-control { padding: .7rem; border: 1px solid var(--border); border-radius: .7rem; }
      .cash-flow-widget .cf-control label { display: flex; justify-content: space-between; gap: .7rem; margin-bottom: .45rem; color: var(--muted); font-size: .88rem; font-weight: 650; }
      .cash-flow-widget .cf-control input { width: 100%; accent-color: var(--primary); }
      .cash-flow-widget .cf-control output { color: var(--text); font-variant-numeric: tabular-nums; }
      .cash-flow-widget .cf-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .7rem; margin: 1rem 0; }
      .cash-flow-widget .cf-metric { min-width: 0; padding: .8rem; border: 1px solid var(--border); border-radius: .75rem; background: color-mix(in srgb, var(--primary) 7%, var(--bg)); }
      .cash-flow-widget .cf-metric-label { display: block; color: var(--muted); font-size: .84rem; }
      .cash-flow-widget .cf-metric-value { display: block; margin-top: .2rem; font-size: 1.18rem; font-weight: 750; }
      .cash-flow-widget .cf-not-cash { margin: 1rem 0; padding: .85rem 1rem; border-left: 4px solid var(--accent); background: color-mix(in srgb, var(--accent) 9%, var(--bg)); }
      .cash-flow-widget .cf-not-cash h3 { margin: 0 0 .6rem; color: var(--primary); font-size: 1.1rem; }
      .cash-flow-widget .cf-not-cash-values { display: flex; flex-wrap: wrap; gap: 1rem 2rem; }
      .cash-flow-widget .cf-reason { margin: .55rem 0 0; line-height: 1.5; }
      .cash-flow-widget .cf-ifrs { margin: 1rem 0; padding: .8rem 1rem; border: 1px solid var(--border); border-radius: .8rem; }
      .cash-flow-widget .cf-ifrs h3 { margin: 0 0 .5rem; color: var(--primary); font-size: 1.05rem; }
      .cash-flow-widget .cf-ifrs-note { margin: .55rem 0 0; color: var(--muted); font-size: .9rem; }
      .cash-flow-widget .cf-chart-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: .9rem; background: var(--bg); padding: .5rem; }
      .cash-flow-widget .cf-table-section { margin-top: 1rem; }
      .cash-flow-widget .cf-table-section h3 { margin: 0 0 .6rem; color: var(--primary); font-size: 1.1rem; }
      .cash-flow-widget .cf-chart { display: block; width: 100%; min-width: 1120px; height: auto; }
      .cash-flow-widget .cf-grid { stroke: var(--border); stroke-width: 1; }
      .cash-flow-widget .cf-axis { stroke: var(--text); stroke-width: 1.2; }
      .cash-flow-widget .cf-label,
      .cash-flow-widget .cf-value { fill: var(--text); font-family: inherit; font-size: 11px; }
      .cash-flow-widget .cf-value { font-weight: 750; }
      .cash-flow-widget .cf-rect { fill: var(--primary); stroke: var(--primary); stroke-width: 1; }
      .cash-flow-widget .cf-negative .cf-rect { fill: color-mix(in srgb, var(--accent) 72%, var(--primary)); stroke: var(--accent); }
      .cash-flow-widget .cf-total .cf-rect { fill: var(--accent); stroke: var(--accent); }
      .cash-flow-widget .cf-bar { cursor: pointer; transform-box: fill-box; transform-origin: center bottom; transition: opacity .15s ease; }
      .cash-flow-widget .cf-bar:hover { opacity: .86; }
      .cash-flow-widget .cf-bar.is-concept-match .cf-rect { stroke: var(--text); stroke-width: 4; }
      .cash-flow-widget .cf-definition { min-height: 4rem; margin-top: .9rem; padding: .8rem 1rem; border-left: 3px solid var(--primary); background: color-mix(in srgb, var(--primary) 7%, var(--bg)); }
      .cash-flow-widget .cf-definition h3 { margin: 0 0 .3rem; color: var(--primary); font-size: 1rem; }
      .cash-flow-widget .cf-definition p { margin: .2rem 0; line-height: 1.5; }
      .cash-flow-widget .cf-error { margin: .7rem 0; color: var(--accent); font-weight: 700; }
      .cash-flow-widget .cf-caption { margin: .75rem 0 0; color: var(--muted); font-size: .9rem; }
      @media (prefers-reduced-motion: reduce) { .cash-flow-widget .cf-bar { transition: none; } }
      @media (max-width: 600px) { .cash-flow-widget .cf-summary { grid-template-columns: 1fr; } }
    </style>
    <div class="cf-toolbar">
      <div class="cf-button-group" role="group" aria-label="Choose example year">
        <button type="button" data-year="year_1" aria-pressed="true">Year 1</button>
        <button type="button" data-year="year_2" aria-pressed="false">Year 2</button>
      </div>
      <div class="cf-button-group" role="group" aria-label="Cash flow presentation">
        <button type="button" data-presentation="indirect" data-definition-id="6.3.6" aria-pressed="true">Indirect method</button>
        <button type="button" data-presentation="direct" data-definition-id="6.3.5" aria-pressed="false">Direct method</button>
      </div>
    </div>
    <p class="cf-caption">Direct operating expense payments use the example's aggregate operating-expense figure, excluding non-cash D&amp;A; employee costs are not separated in the source data.</p>
    <div class="cf-controls" aria-label="Cash flow adjustments">
      <div class="cf-control"><label for="cf-receivables">Change in receivables <output data-output="accounts_receivable_change"></output></label><input id="cf-receivables" data-input="accounts_receivable_change" data-definition-id="6.3.8" type="range" min="-200" max="500" step="1"></div>
      <div class="cf-control"><label for="cf-inventory">Change in inventory <output data-output="inventory_change"></output></label><input id="cf-inventory" data-input="inventory_change" data-definition-id="6.3.8" type="range" min="-200" max="500" step="1"></div>
      <div class="cf-control"><label for="cf-payables">Change in payables <output data-output="accounts_payable_change"></output></label><input id="cf-payables" data-input="accounts_payable_change" data-definition-id="6.3.8" type="range" min="-200" max="500" step="1"></div>
      <div class="cf-control"><label for="cf-capex">Capital expenditure <output data-output="capital_expenditure"></output></label><input id="cf-capex" data-input="capital_expenditure" data-definition-id="6.3.3" type="range" min="0" max="500" step="1"></div>
      <div class="cf-control"><label for="cf-debt">Debt repayment <output data-output="debt_repaid"></output></label><input id="cf-debt" data-input="debt_repaid" data-definition-id="6.3.4" type="range" min="0" max="500" step="1"></div>
      <div class="cf-control"><label for="cf-dividends">Dividends paid <output data-output="dividends_paid"></output></label><input id="cf-dividends" data-input="dividends_paid" data-definition-id="6.3.4" type="range" min="0" max="500" step="1"></div>
    </div>
    <section class="cf-ifrs" aria-labelledby="cf-ifrs-heading">
      <h3 id="cf-ifrs-heading">Interest classification</h3>
      <div class="cf-button-group" role="group" aria-label="Classify interest paid">
        <button type="button" data-interest-class="operating" data-definition-id="6.4.2" aria-pressed="true">Interest in operating</button>
        <button type="button" data-interest-class="financing" data-definition-id="6.4.2" aria-pressed="false">Interest in financing</button>
      </div>
      <p class="cf-ifrs-note">IFRS allows a policy choice; confirm against the current IAS 7.</p>
    </section>
    <div class="cf-summary" aria-label="Cash flow results">
      <div class="cf-metric"><span class="cf-metric-label">Free cash flow (CFO − CapEx)</span><span class="cf-metric-value" data-free-cash-flow>—</span></div>
      <div class="cf-metric"><span class="cf-metric-label">Direct CFO</span><span class="cf-metric-value" data-direct-cfo>—</span></div>
      <div class="cf-metric"><span class="cf-metric-label">Indirect CFO</span><span class="cf-metric-value" data-indirect-cfo>—</span></div>
    </div>
    <section class="cf-not-cash" data-not-cash aria-labelledby="cf-not-cash-heading" data-definition-id="6.3.9">
      <h3 id="cf-not-cash-heading">Net income is not cash</h3>
      <div class="cf-not-cash-values"><span>Net income: <strong data-net-income>—</strong></span><span>Cash flow from operating activities: <strong data-cfo>—</strong></span></div>
      <p class="cf-reason" data-net-income-reason></p>
    </section>
    <div class="cf-chart-wrap"><svg class="cf-chart" role="img" aria-label="Indirect-method cash flow waterfall"></svg></div>
    <section class="cf-table-section" aria-labelledby="cf-table-heading"><h3 id="cf-table-heading">Interactive cash flow table</h3><div class="cf-table-container"></div></section>
    <section class="cf-definition" id="cf-definition" aria-live="polite" aria-atomic="true">
      <h3 data-definition-title>Line definition</h3><div data-definition-content><p>Focus a line to read its source definition.</p></div>
    </section>
    <p class="cf-error" role="alert" hidden></p>
    <p class="cf-caption">Illustrative model, fictional company, not real data</p>
  `;
  return root;
}

function waterfallBars(state, presentation, classification) {
  const { income, cashFlow, direct } = state.calculation;
  if (presentation === "direct") {
    let running = 0;
    const bars = [];
    const addStep = (key, label, amount, definitionKey = key) => {
      const signedAmount = whole(amount);
      bars.push({ key, definitionKey, label, amount: signedAmount, start: running, end: running + signedAmount, kind: signedAmount < 0 ? "negative" : "step" });
      running += signedAmount;
    };
    bars.push({ key: "cash_received_from_customers", definitionKey: "cash_received_from_customers", label: "Cash from customers", amount: direct.cash_received_from_customers, start: 0, end: direct.cash_received_from_customers, kind: "step" });
    running = direct.cash_received_from_customers;
    addStep("cash_paid_to_suppliers", "Paid to suppliers", direct.cash_paid_to_suppliers);
    addStep("cash_paid_for_operating_expenses", "Operating costs paid", direct.cash_paid_for_operating_expenses);
    if (classification === "operating") addStep("interest_paid", "Interest paid", direct.interest_paid_in_operating_activities);
    addStep("income_taxes_paid", "Income taxes paid", direct.income_taxes_paid);
    bars.push({ key: "cash_flow_from_operating_activities", definitionKey: "cash_flow_from_operating_activities", label: "Cash from operations", amount: cashFlow.cash_flow_from_operating_activities, start: 0, end: cashFlow.cash_flow_from_operating_activities, kind: "total" });
    addStep("capital_expenditure", "CapEx · investing", cashFlow.capital_expenditure);
    bars.push({ key: "cash_flow_from_investing_activities", definitionKey: "cash_flow_from_investing_activities", label: "Investing total", amount: cashFlow.cash_flow_from_investing_activities, start: 0, end: cashFlow.cash_flow_from_investing_activities, kind: "total" });
    addStep("debt_issued", "Debt issued", cashFlow.debt_issued);
    addStep("debt_repaid", "Debt repaid", cashFlow.debt_repaid);
    addStep("dividends_paid", "Dividends", cashFlow.dividends_paid);
    if (classification === "financing") addStep("interest_paid", "Interest paid · financing", direct.interest_paid_in_financing_activities);
    bars.push({ key: "cash_flow_from_financing_activities", definitionKey: "cash_flow_from_financing_activities", label: "Financing total", amount: cashFlow.cash_flow_from_financing_activities, start: 0, end: cashFlow.cash_flow_from_financing_activities, kind: "total" });
    bars.push({ key: "net_change_in_cash", definitionKey: "net_change_in_cash", label: "Net change in cash", amount: cashFlow.net_change_in_cash, start: 0, end: cashFlow.net_change_in_cash, kind: "total" });
    bars.push({ key: "ending_cash", definitionKey: "ending_cash", label: "Ending cash", amount: cashFlow.ending_cash, start: 0, end: cashFlow.ending_cash, kind: "total" });
    return bars;
  }

  let running = income.net_income;
  const bars = [
    { key: "net_income", definitionKey: "net_income", label: "Net income", amount: income.net_income, start: 0, end: income.net_income, kind: "step" },
  ];
  const addStep = (key, label, amount) => {
    const signedAmount = whole(amount);
    bars.push({ key, definitionKey: key, label, amount: signedAmount, start: running, end: running + signedAmount, kind: signedAmount < 0 ? "negative" : "step" });
    running += signedAmount;
  };
  addStep("depreciation_and_amortization", "D&A add-back", cashFlow.depreciation_and_amortization);
  addStep("increase_in_accounts_receivable", "Receivables change", cashFlow.increase_in_accounts_receivable);
  addStep("increase_in_inventory", "Inventory change", cashFlow.increase_in_inventory);
  addStep("increase_in_accounts_payable", "Payables change", cashFlow.increase_in_accounts_payable);
  if (classification === "financing") {
    addStep("interest_paid", "Interest moved out of operations", income.interest_expense);
  }
  bars.push({ key: "cash_flow_from_operating_activities", definitionKey: "cash_flow_from_operating_activities", label: "Cash from operations", amount: cashFlow.cash_flow_from_operating_activities, start: 0, end: cashFlow.cash_flow_from_operating_activities, kind: "total" });
  addStep("capital_expenditure", "CapEx · investing", cashFlow.capital_expenditure);
  bars.push({ key: "cash_flow_from_investing_activities", definitionKey: "cash_flow_from_investing_activities", label: "Investing total", amount: cashFlow.cash_flow_from_investing_activities, start: 0, end: cashFlow.cash_flow_from_investing_activities, kind: "total" });
  addStep("debt_issued", "Debt issued", cashFlow.debt_issued);
  addStep("debt_repaid", "Debt repaid", cashFlow.debt_repaid);
  addStep("dividends_paid", "Dividends", cashFlow.dividends_paid);
  if (classification === "financing") addStep("interest_paid", "Interest paid · financing", -Math.abs(income.interest_expense));
  bars.push({ key: "cash_flow_from_financing_activities", definitionKey: "cash_flow_from_financing_activities", label: "Financing total", amount: cashFlow.cash_flow_from_financing_activities, start: 0, end: cashFlow.cash_flow_from_financing_activities, kind: "total" });
  bars.push({ key: "net_change_in_cash", definitionKey: "net_change_in_cash", label: "Net change in cash", amount: cashFlow.net_change_in_cash, start: 0, end: cashFlow.net_change_in_cash, kind: "total" });
  bars.push({ key: "ending_cash", definitionKey: "ending_cash", label: "Ending cash", amount: cashFlow.ending_cash, start: 0, end: cashFlow.ending_cash, kind: "total" });
  return bars;
}

function drawChart(svg, bars, conceptId, presentation) {
  const width = 1440;
  const height = 430;
  const margin = { top: 34, right: 24, bottom: 94, left: 82 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const levels = bars.flatMap(bar => [bar.start, bar.end]);
  const min = Math.min(0, ...levels);
  const max = Math.max(0, ...levels);
  const spread = Math.max(1, max - min);
  const low = min < 0 ? min - spread * .08 : 0;
  const high = max > 0 ? max + spread * .12 : spread;
  const y = value => margin.top + ((high - value) / (high - low)) * plotHeight;
  const zeroY = y(0);
  const slot = plotWidth / bars.length;
  const barWidth = Math.min(58, slot * .58);
  const highlights = CONCEPT_HIGHLIGHTS[conceptId] || [];

  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-label", `${presentation} cash flow waterfall. CFO ${amountText(bars.find(bar => bar.key === "cash_flow_from_operating_activities")?.amount || 0)}.`);
  const title = svgElement("title");
  title.textContent = `${presentation === "indirect" ? "Indirect" : "Direct"} method cash flow waterfall`;
  const description = svgElement("desc");
  description.textContent = "Cash flow lines are shown as additions, deductions, and subtotals. Focus a line to read its source definition.";
  svg.append(title, description);

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = high - (high - low) * tick / 4;
    const tickY = y(value);
    const grid = svgElement("line", { x1: margin.left, y1: tickY, x2: width - margin.right, y2: tickY, class: tick === 4 && low === 0 ? "cf-axis" : "cf-grid" });
    const label = svgElement("text", { x: margin.left - 10, y: tickY + 4, "text-anchor": "end", class: "cf-label" });
    label.textContent = amountText(value);
    svg.append(grid, label);
  }
  svg.append(svgElement("line", { x1: margin.left, y1: zeroY, x2: width - margin.right, y2: zeroY, class: "cf-axis" }));

  bars.forEach((bar, index) => {
    const centerX = margin.left + slot * (index + .5);
    const x = centerX - barWidth / 2;
    const top = y(Math.max(bar.start, bar.end));
    const bottom = y(Math.min(bar.start, bar.end));
    const heightPx = Math.max(2, bottom - top);
    const selected = highlights.includes("all") || highlights.includes(bar.key)
      || (bar.key === "net_income" && highlights.includes("net_income"))
      || (bar.key === "cash_flow_from_operating_activities" && highlights.includes("cash_flow_from_operating_activities"));
    const group = svgElement("g", {
      class: `cf-bar cf-${bar.kind}${selected ? " is-concept-match" : ""}`,
      tabindex: "0",
      role: "button",
      "data-line": bar.definitionKey,
      "data-label": bar.label,
      "aria-describedby": "cf-definition",
      "aria-label": `${bar.label}: ${bar.amount < 0 ? "minus " : ""}${amountText(Math.abs(bar.amount))}`,
    });
    const rect = svgElement("rect", { x, y: top, width: barWidth, height: heightPx, rx: 3, class: "cf-rect" });
    const value = svgElement("text", { x: centerX, y: Math.max(margin.top + 14, top - 7), "text-anchor": "middle", class: "cf-value" });
    value.textContent = `${bar.amount < 0 ? "−" : ""}${amountText(Math.abs(bar.amount))}`;
    const label = svgElement("text", { x: centerX, y: zeroY + 22, "text-anchor": "middle", class: "cf-label" });
    const words = bar.label.split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      if (current && `${current} ${word}`.length > 12) {
        lines.push(current);
        current = word;
      } else current = current ? `${current} ${word}` : word;
    }
    if (current) lines.push(current);
    lines.forEach((line, lineIndex) => {
      const tspan = svgElement("tspan", { x: centerX, dy: lineIndex ? 13 : 0 });
      tspan.textContent = line;
      label.append(tspan);
    });
    group.append(rect, value, label);
    svg.append(group);
  });
}

export async function init(widgetContainer) {
  const root = template();
  widgetContainer.replaceChildren(root);
  const get = selector => root.querySelector(selector);
  const state = {
    example: null,
    definitions: new Map(),
    year: "year_1",
    presentation: "indirect",
    interestClassification: "operating",
    calculation: null,
    periodInputs: {},
    tableView: "year_1",
  };
  const conceptId = String(widgetContainer.dataset.conceptId || "");
  const svg = get(".cf-chart");
  const error = get(".cf-error");
  const definitionTitle = get("[data-definition-title]");
  const definitionContent = get("[data-definition-content]");
  const definitionByLine = {
    ending_cash: ["6.3.11", "6.4.1"],
    cash_received_from_customers: ["6.3.5", "6.4.3"],
    cash_paid_to_suppliers: ["6.3.5", "6.4.3"],
    cash_paid_for_operating_expenses: ["6.3.5", "6.4.3"],
    interest_paid: ["6.3.5", "6.4.2"],
  };

  function showDefinition(lineKey, label = "Line definition") {
    definitionContent.replaceChildren();
    const ids = state.definitions.has(lineKey)
      ? [lineKey]
      : definitionByLine[lineKey] || DEFINITION_IDS[lineKey] || [];
    const concepts = ids.map(id => state.definitions.get(id)).filter(Boolean);
    definitionTitle.textContent = concepts[0]?.title.replace(/^6\.[34]\.\d+\s*/, "") || label;
    if (!concepts.length) {
      const message = document.createElement("p");
      message.textContent = "No matching source definition is available.";
      definitionContent.append(message);
      return;
    }
    for (const concept of concepts) {
      const paragraph = document.createElement("p");
      paragraph.textContent = concept.definition;
      paragraph.dataset.definitionSource = concept.source_id;
      definitionContent.append(paragraph);
    }
  }

  let exampleResponse;
  try {
    exampleResponse = await fetch("/api/financial-example", { headers: { Accept: "application/json" } });
    if (!exampleResponse.ok) throw new Error(`HTTP ${exampleResponse.status}`);
    state.example = await exampleResponse.json();
  } catch (loadError) {
    error.hidden = false;
    error.textContent = `Could not load the financial example. ${loadError.message}`;
    return;
  }

  try {
    const response = await fetch("/api/concepts", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const concepts = Array.isArray(payload) ? payload : payload?.concepts;
    if (!Array.isArray(concepts)) throw new Error("Unexpected concepts API response.");
    for (const concept of concepts) {
      if (/^6\.(?:3\.(?:[1-9]|10|11)|4\.[1-5])$/.test(concept.source_id || "")) {
        state.definitions.set(concept.source_id, concept);
      }
    }
    const gapConcept = state.definitions.get("6.3.9");
    if (gapConcept) setText(get("[data-net-income-reason]"), gapConcept.definition);
  } catch (loadError) {
    error.hidden = false;
    error.textContent = `Definitions could not be loaded from /api/concepts. ${loadError.message}`;
  }

  const yearButtons = [...root.querySelectorAll("[data-year]")];
  const presentationButtons = [...root.querySelectorAll("[data-presentation]")];
  const interestButtons = [...root.querySelectorAll("[data-interest-class]")];
  const sliders = Object.fromEntries([...root.querySelectorAll("[data-input]")].map(input => [input.dataset.input, input]));

  function sampleInputs(year) {
    const data = state.example.cash_flow_statement[year];
    return {
      accounts_receivable_change: -data.increase_in_accounts_receivable,
      inventory_change: -data.increase_in_inventory,
      accounts_payable_change: data.increase_in_accounts_payable,
      capital_expenditure: -data.capital_expenditure,
      debt_repaid: -data.debt_repaid,
      debt_issued: data.debt_issued || 0,
      dividends_paid: -data.dividends_paid,
      depreciation_and_amortization: data.depreciation_and_amortization,
    };
  }

  state.periodInputs = {
    year_1: sampleInputs("year_1"),
    year_2: sampleInputs("year_2"),
  };

  function currentInputs() {
    return Object.fromEntries(Object.entries(sliders).map(([key, input]) => [key, whole(input.value)]));
  }

  function loadPeriodControls(year) {
    const values = state.periodInputs[year];
    for (const [key, input] of Object.entries(sliders)) input.value = values[key];
  }

  function calculateYear(year) {
    const income = state.example.income_statement[year];
    const sourceCash = state.example.cash_flow_statement[year];
    const controls = state.periodInputs[year];
    const baseCashFlow = computeCashFlowStatement({
      net_income: income.net_income,
      depreciation_and_amortization: controls.depreciation_and_amortization,
      accounts_receivable_change: controls.accounts_receivable_change,
      inventory_change: controls.inventory_change,
      accounts_payable_change: controls.accounts_payable_change,
      capital_expenditure: controls.capital_expenditure,
      debt_repaid: controls.debt_repaid,
      debt_issued: controls.debt_issued,
      dividends_paid: controls.dividends_paid,
      beginning_cash: sourceCash.beginning_cash,
    });
    const cashFlow = reclassifyInterestPaid(baseCashFlow, income.interest_expense, state.interestClassification);
    const direct = computeDirectOperatingCashFlow({
      revenue: income.revenue,
      cogs: income.cogs,
      operating_expenses: income.operating_expenses,
      depreciation_and_amortization: controls.depreciation_and_amortization,
      interest_expense: income.interest_expense,
      income_taxes: income.income_taxes,
      accounts_receivable_change: controls.accounts_receivable_change,
      inventory_change: controls.inventory_change,
      accounts_payable_change: controls.accounts_payable_change,
      interest_classification: state.interestClassification,
    });
    return { income, cashFlow, direct, controls };
  }

  function tableRows(calculations) {
    const years = ["year_1", "year_2"];
    const values = (section, transform = value => value) => Object.fromEntries(years.map(year => [year, transform(calculations[year][section], year)]));
    const formatted = amount => amountText(amount);
    const workingCapitalRows = [
      { key: "increase_in_accounts_receivable", label: "Change in receivables", note: "An increase in receivables reduces operating cash flow.", concept: "6.3.8", value: controls => -controls.accounts_receivable_change, write: value => ({ accounts_receivable_change: -value }) },
      { key: "increase_in_inventory", label: "Change in inventory", note: "An increase in inventory reduces operating cash flow.", concept: "6.3.8", value: controls => -controls.inventory_change, write: value => ({ inventory_change: -value }) },
      { key: "increase_in_accounts_payable", label: "Change in payables", note: "An increase in accounts payable increases operating cash flow.", concept: "6.3.8", value: controls => controls.accounts_payable_change, write: value => ({ accounts_payable_change: value }) },
    ].map(row => ({
      key: row.key,
      label: row.label,
      note: row.note,
      kind: "input",
      format: "number",
      definitionId: row.concept,
      values: Object.fromEntries(years.map(year => [year, row.value(state.periodInputs[year])])),
    }));
    const rows = [
      { key: "net_income", label: "Net income (linked from income statement)", kind: "formula", format: "number", definitionId: "6.3.9", values: values("income", result => result.net_income), formula: ({ columnKey }) => `Income statement example · net income ${formatted(calculations[columnKey].income.net_income)}` },
      { key: "depreciation_and_amortization", label: "Depreciation and amortization", kind: "input", format: "number", definitionId: "6.3.7", values: values("controls", controls => controls.depreciation_and_amortization) },
      ...workingCapitalRows,
      { key: "capital_expenditure", label: "Capital expenditure", kind: "input", format: "number", definitionId: "6.3.3", values: values("controls", controls => -controls.capital_expenditure) },
      { key: "debt_flow", label: "Debt issued / (repaid)", kind: "input", format: "signed", definitionId: "6.3.4", values: values("controls", controls => controls.debt_issued - controls.debt_repaid) },
      { key: "dividends_paid", label: "Dividends paid", kind: "input", format: "number", definitionId: "6.3.4", values: values("controls", controls => -controls.dividends_paid) },
    ];
    if (state.presentation === "indirect" && state.interestClassification === "financing") {
      rows.push({
        key: "interest_reclassified_from_operations",
        label: "Interest reclassified out of operating activities",
        kind: "formula",
        format: "number",
        definitionId: "6.4.2",
        values: values("income", result => result.interest_expense),
        formula: ({ columnKey }) => `Financing classification adds back interest to CFO = ${formatted(calculations[columnKey].income.interest_expense)}`,
      });
    }
    if (state.presentation === "direct") {
      rows.push(
        { key: "cash_received_from_customers", label: "Cash received from customers", kind: "formula", format: "number", definitionId: "6.3.5", values: values("direct", result => result.cash_received_from_customers), formula: ({ columnKey }) => `Revenue less the receivables increase = ${formatted(calculations[columnKey].direct.cash_received_from_customers)}` },
        { key: "cash_paid_to_suppliers", label: "Cash paid to suppliers", kind: "formula", format: "number", definitionId: "6.3.5", values: values("direct", result => result.cash_paid_to_suppliers), formula: ({ columnKey }) => `Supplier cash payments = ${formatted(calculations[columnKey].direct.cash_paid_to_suppliers)}` },
        { key: "cash_paid_for_operating_expenses", label: "Operating expenses paid", kind: "formula", format: "number", definitionId: "6.3.5", values: values("direct", result => result.cash_paid_for_operating_expenses), formula: ({ columnKey }) => `Operating expense cash payments, excluding non-cash D&A = ${formatted(calculations[columnKey].direct.cash_paid_for_operating_expenses)}` },
      );
      if (state.interestClassification === "operating") rows.push(
        { key: "interest_paid", label: "Interest paid in operating activities", kind: "formula", format: "number", definitionId: "6.4.2", values: values("direct", result => result.interest_paid_in_operating_activities), formula: ({ columnKey }) => `Operating interest classification = ${formatted(calculations[columnKey].direct.interest_paid_in_operating_activities)}` },
      );
      rows.push({ key: "income_taxes_paid", label: "Income taxes paid", kind: "formula", format: "number", definitionId: "6.3.5", values: values("direct", result => result.income_taxes_paid), formula: ({ columnKey }) => `Cash taxes paid = ${formatted(calculations[columnKey].direct.income_taxes_paid)}` });
    }
    rows.push(
      { key: "cash_flow_from_operating_activities", label: "Cash flow from operations (CFO)", kind: "subtotal", format: "number", definitionId: "6.3.2", values: values("cashFlow", (result, year) => state.presentation === "direct" ? calculations[year].direct.cash_flow_from_operating_activities : result.cash_flow_from_operating_activities), dependsOn: ["net_income", "depreciation_and_amortization", "increase_in_accounts_receivable", "increase_in_inventory", "increase_in_accounts_payable"], formula: ({ columnKey }) => `${state.presentation === "direct" ? "Direct" : "Indirect"} method CFO = ${formatted(state.presentation === "direct" ? calculations[columnKey].direct.cash_flow_from_operating_activities : calculations[columnKey].cashFlow.cash_flow_from_operating_activities)}` },
      { key: "cash_flow_from_investing_activities", label: "Cash flow from investing (CFI)", kind: "subtotal", format: "number", definitionId: "6.3.3", values: values("cashFlow", result => result.cash_flow_from_investing_activities), dependsOn: ["capital_expenditure"], formula: ({ columnKey }) => `CFI = ${formatted(calculations[columnKey].cashFlow.cash_flow_from_investing_activities)}` },
      { key: "cash_flow_from_financing_activities", label: "Cash flow from financing (CFF)", kind: "subtotal", format: "number", definitionId: "6.3.4", values: values("cashFlow", result => result.cash_flow_from_financing_activities), dependsOn: ["debt_flow", "dividends_paid", ...(state.interestClassification === "financing" ? ["interest_paid_financing"] : [])], formula: ({ columnKey }) => `CFF = ${formatted(calculations[columnKey].cashFlow.cash_flow_from_financing_activities)}` },
      { key: "net_change_in_cash", label: "Net change in cash", kind: "subtotal", format: "number", definitionId: "6.3.1", values: values("cashFlow", result => result.net_change_in_cash), dependsOn: ["cash_flow_from_operating_activities", "cash_flow_from_investing_activities", "cash_flow_from_financing_activities"], formula: ({ columnKey }) => `CFO + CFI + CFF = ${formatted(calculations[columnKey].cashFlow.net_change_in_cash)}` },
      { key: "beginning_cash", label: "Beginning cash", kind: "formula", format: "number", definitionId: "6.4.1", values: values("cashFlow", result => result.beginning_cash), formula: ({ columnKey }) => `Beginning cash = ${formatted(calculations[columnKey].cashFlow.beginning_cash)}` },
      { key: "ending_cash", label: "Ending cash", kind: "subtotal", format: "number", definitionId: "6.3.11", values: values("cashFlow", result => result.ending_cash), dependsOn: ["beginning_cash", "net_change_in_cash"], formula: ({ columnKey }) => `Beginning cash + net change = ${formatted(calculations[columnKey].cashFlow.ending_cash)}` },
      { key: "free_cash_flow", label: "Free cash flow", kind: "formula", format: "number", definitionId: "6.3.10", values: values("cashFlow", result => result.free_cash_flow), formula: ({ columnKey }) => `CFO minus capital expenditure = ${formatted(calculations[columnKey].cashFlow.free_cash_flow)}` },
      { key: "reconciliation_to_balance_sheet", label: "Reconciles to balance sheet", kind: "check", format: "signed", definitionId: "6.4.5", balancedLabel: "Reconciles", values: values("cashFlow", (result, year) => result.ending_cash - state.example.balance_sheet[year === "year_1" ? "end_y1" : "end_y2"].cash_and_equivalents), formula: ({ columnKey }) => `Ending cash compared with balance-sheet cash = ${formatted(calculations[columnKey].cashFlow.ending_cash)} - ${formatted(state.example.balance_sheet[columnKey === "year_1" ? "end_y1" : "end_y2"].cash_and_equivalents)}` },
    );
    if (state.interestClassification === "financing") {
      const financingIndex = rows.findIndex(row => row.key === "cash_flow_from_financing_activities");
      rows.splice(financingIndex, 0, {
        key: "interest_paid_financing",
        label: "Interest paid in financing activities",
        kind: "formula",
        format: "number",
        definitionId: "6.4.2",
        values: values("direct", result => result.interest_paid_in_financing_activities),
        formula: ({ columnKey }) => `Financing interest classification = ${formatted(calculations[columnKey].direct.interest_paid_in_financing_activities)}`,
      });
    }
    return rows;
  }

  function renderTable(calculations) {
    renderFinTable(get(".cf-table-container"), {
      title: `Cash flow statement · ${state.presentation === "direct" ? "Direct" : "Indirect"} method`,
      columns: [{ key: "year_1", label: "Year 1" }, { key: "year_2", label: "Year 2" }],
      rows: tableRows(calculations),
      view: state.tableView,
      onViewChange: view => {
        state.tableView = view;
        if (view === "year_1" || view === "year_2") setYear(view);
        else update();
      },
      onChange: ({ rowKey, columnKey, value }) => {
        state.year = columnKey;
        for (const button of yearButtons) button.setAttribute("aria-pressed", String(button.dataset.year === columnKey));
        const period = state.periodInputs[columnKey];
        if (rowKey === "increase_in_accounts_receivable") period.accounts_receivable_change = -value;
        else if (rowKey === "increase_in_inventory") period.inventory_change = -value;
        else if (rowKey === "increase_in_accounts_payable") period.accounts_payable_change = value;
        else if (rowKey === "capital_expenditure") period.capital_expenditure = -value;
        else if (rowKey === "debt_flow") {
          period.debt_issued = Math.max(0, value);
          period.debt_repaid = Math.max(0, -value);
        } else if (rowKey === "dividends_paid") period.dividends_paid = -value;
        else if (rowKey === "depreciation_and_amortization") period.depreciation_and_amortization = value;
        loadPeriodControls(columnKey);
        update();
      },
      onRowFocus: key => {
        const row = tableRows(calculations).find(item => item.key === key);
        showDefinition(row?.definitionId || key);
      },
      onReset: () => {
        state.periodInputs[state.year] = sampleInputs(state.year);
        loadPeriodControls(state.year);
        update();
      },
    });
  }

  function update() {
    const calculations = {
      year_1: calculateYear("year_1"),
      year_2: calculateYear("year_2"),
    };
    const active = calculations[state.year];
    const { income, cashFlow, direct, controls } = active;
    state.calculation = active;

    setText(get("[data-free-cash-flow]"), amountText(cashFlow.free_cash_flow));
    setText(get("[data-direct-cfo]"), amountText(direct.cash_flow_from_operating_activities));
    setText(get("[data-indirect-cfo]"), amountText(cashFlow.cash_flow_from_operating_activities));
    setText(get("[data-net-income]"), amountText(income.net_income));
    setText(get("[data-cfo]"), amountText(cashFlow.cash_flow_from_operating_activities));
    for (const [key, input] of Object.entries(sliders)) {
      const output = get(`[data-output="${key}"]`);
      if (output) output.textContent = amountText(input.value);
    }
    const totalsMatch = direct.cash_flow_from_operating_activities === cashFlow.cash_flow_from_operating_activities;
    get("[data-direct-cfo]").closest(".cf-metric").classList.toggle("is-concept-match", conceptId === "6.3.2" || conceptId === "6.3.9");
    get("[data-indirect-cfo]").closest(".cf-metric").classList.toggle("is-concept-match", conceptId === "6.3.2" || conceptId === "6.3.9");
    if (!totalsMatch) {
      error.hidden = false;
      error.textContent = "Direct and indirect operating cash flow totals do not match; check the inputs.";
    } else if (!error.textContent.startsWith("Definitions could not be loaded")) {
      error.hidden = true;
    }
    const bars = waterfallBars({ ...state, calculation: active }, state.presentation, state.interestClassification);
    drawChart(svg, bars, conceptId, state.presentation);
    renderTable(calculations);
  }

  function setYear(year) {
    state.year = year;
    state.tableView = year;
    for (const button of yearButtons) button.setAttribute("aria-pressed", String(button.dataset.year === year));
    loadPeriodControls(year);
    update();
  }

  function setPresentation(presentation) {
    state.presentation = presentation;
    for (const button of presentationButtons) {
      const isCurrent = button.dataset.presentation === presentation;
      button.setAttribute("aria-pressed", String(isCurrent));
      button.classList.toggle("is-concept-match", (conceptId === "6.3.5" || conceptId === "6.4.3") && presentation === "direct"
        || (conceptId === "6.3.6" || conceptId === "6.4.4") && presentation === "indirect");
    }
    update();
  }

  function setInterestClassification(classification) {
    state.interestClassification = classification;
    for (const button of interestButtons) {
      const isCurrent = button.dataset.interestClass === classification;
      button.setAttribute("aria-pressed", String(isCurrent));
      button.classList.toggle("is-concept-match", conceptId === "6.4.2" && isCurrent);
    }
    update();
  }

  for (const button of yearButtons) button.addEventListener("click", () => setYear(button.dataset.year));
  for (const button of presentationButtons) button.addEventListener("click", () => setPresentation(button.dataset.presentation));
  for (const button of interestButtons) button.addEventListener("click", () => setInterestClassification(button.dataset.interestClass));
  for (const input of Object.values(sliders)) input.addEventListener("input", () => {
    Object.assign(state.periodInputs[state.year], currentInputs());
    update();
  });

  root.addEventListener("focusin", event => {
    const target = event.target.closest("[data-definition-id]");
    if (target) showDefinition(target.dataset.definitionId, target.getAttribute("aria-label") || "Line definition");
    const bar = event.target.closest(".cf-bar");
    if (bar) showDefinition(bar.dataset.line, bar.dataset.label);
  });
  root.addEventListener("click", event => {
    const target = event.target.closest("[data-definition-id]");
    if (target) showDefinition(target.dataset.definitionId, target.getAttribute("aria-label") || "Line definition");
    const bar = event.target.closest(".cf-bar");
    if (bar) showDefinition(bar.dataset.line, bar.dataset.label);
  });
  svg.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".cf-bar")) {
      event.preventDefault();
      event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });

  const conceptHighlights = CONCEPT_HIGHLIGHTS[conceptId] || [];
  if (conceptHighlights.includes("presentation_direct")) setPresentation("direct");
  else if (conceptHighlights.includes("presentation_indirect")) setPresentation("indirect");
  else if (conceptHighlights.includes("interest_classification")) setInterestClassification("operating");
  else setYear("year_1");
  if (state.definitions.has(conceptId)) showDefinition(conceptId);
}
