import { buildStatementSeries } from "./fin_model.js";
import { renderFinTable } from "./fin_table.js";
import { fetchConcepts, fetchFinancialExample } from "../api.js";

const SOURCE_IDS = ["6.4.5", "6.5.1", "6.5.2", "6.5.3", "6.5.4"];
const COLUMNS = [{ key: "year_1", label: "Year 1" }, { key: "year_2", label: "Year 2" }];
const whole = value => Math.round(Number(value) || 0);
const fmt = value => whole(value).toLocaleString("en-US");

function inputsFromExample(example, yearKey) {
  const income = example.income_statement[yearKey];
  const cash = example.cash_flow_statement[yearKey];
  return {
    revenue: income.revenue,
    cogs: income.cogs,
    operating_expenses: income.operating_expenses,
    depreciation: income.depreciation_and_amortization_included_in_operating_expenses,
    interest: income.interest_expense,
    tax_rate: 25,
    receivables_change: -cash.increase_in_accounts_receivable,
    inventory_change: -cash.increase_in_inventory,
    payables_change: cash.increase_in_accounts_payable,
    capital_expenditure: -cash.capital_expenditure,
    debt_repaid: -cash.debt_repaid,
    dividends: -cash.dividends_paid,
  };
}

export function calculateThreeStatementModel(example, overrides = {}, extraCreditSale = 0) {
  const state = {
    year_1: { ...inputsFromExample(example, "year_1"), ...overrides.year_1 },
    year_2: { ...inputsFromExample(example, "year_2"), ...overrides.year_2 },
  };
  const periods = ["year_1", "year_2"].map(year => {
    const value = state[year];
    return {
      income_statement: {
        revenue: value.revenue + (year === "year_2" ? extraCreditSale : 0),
        cogs: value.cogs,
        operating_expenses: value.operating_expenses,
        depreciation_and_amortization_included_in_operating_expenses: value.depreciation,
        interest_expense: value.interest,
        tax_rate: Number(value.tax_rate) / 100,
        shares_outstanding: example.shares_outstanding,
      },
      cash_flow: {
        accounts_receivable_change: value.receivables_change + (year === "year_2" ? extraCreditSale : 0),
        inventory_change: value.inventory_change,
        accounts_payable_change: value.payables_change,
        capital_expenditure: value.capital_expenditure,
        debt_repaid: value.debt_repaid,
        dividends_paid: value.dividends,
      },
    };
  });
  const [year1, year2] = buildStatementSeries(example.balance_sheet.begin_y1, periods);
  const results = { year_1: year1, year_2: year2 };
  return { state, results };
}

const line = (key, label, kind, values, extra = {}) => ({ key, label, kind, values, ...extra });
const input = (key, label, stateKey, modelKey, values, format = "number", extra = {}) =>
  line(key, label, "input", values, { stateKey, modelKey, format, ...extra });
const formula = (key, label, values, text, extra = {}) =>
  line(key, label, "formula", values, { formula: text, ...extra });
const subtotal = (key, label, values, text, extra = {}) =>
  line(key, label, "subtotal", values, { formula: text, ...extra });

function createTemplate() {
  const root = document.createElement("section");
  root.className = "three-statements-widget";
  root.innerHTML = `
    <style>
      .three-statements-widget { color: var(--text); }
      .three-statements-widget * { box-sizing: border-box; }
      .three-statements-widget button { font: inherit; }
      .three-statements-widget button:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
      .three-statements-widget .ts-tools { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; margin-bottom: .8rem; }
      .three-statements-widget .ts-tools button { border: 1px solid var(--primary); border-radius: 999px; background: var(--primary); color: var(--bg); padding: .5rem .9rem; cursor: pointer; }
      .three-statements-widget .ts-status, .three-statements-widget .ts-change { margin: .7rem 0; padding: .7rem .9rem; border: 1px solid var(--border); border-radius: .7rem; }
      .three-statements-widget .ts-status[data-state="balanced"] { color: var(--success); border-color: var(--success); }
      .three-statements-widget .ts-status[data-state="unbalanced"] { color: var(--danger); border-color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, var(--bg)); }
      .three-statements-widget .ts-change { color: var(--muted); background: color-mix(in srgb, var(--accent) 8%, var(--bg)); }
      .three-statements-widget .ts-tables { display: grid; gap: 1rem; }
      .three-statements-widget .ts-table { min-width: 0; }
      .three-statements-widget .ts-table h3 { margin: 0 0 .3rem; color: var(--primary); }
      .three-statements-widget .ts-table .fin-table-toolbar [data-reset] { display: none; }
      .three-statements-widget .ts-definitions { min-height: 4rem; margin-top: 1rem; padding: .75rem .9rem; border-left: 3px solid var(--primary); background: color-mix(in srgb, var(--primary) 7%, var(--bg)); }
      .three-statements-widget .ts-definitions h3 { margin: 0 0 .35rem; color: var(--primary); font-size: 1rem; }
      .three-statements-widget .ts-definitions p { margin: .25rem 0; line-height: 1.45; }
      .three-statements-widget .ts-caption { color: var(--muted); font-size: .88rem; }
      @media (max-width: 700px) { .three-statements-widget .ts-table { overflow-x: auto; } }
    </style>
    <p>Year 1 and Year 2 are connected. Edit an input in any statement to recalculate all three.</p>
    <div class="ts-tools"><button type="button" data-reset>Reset all three tables to example</button><button type="button" data-what-if aria-pressed="false">Add 100 units of credit sales</button><span data-what-if-result></span></div>
    <p class="ts-status" data-status role="status" aria-live="polite">Loading example…</p>
    <p class="ts-change" data-change aria-live="polite">Edit an input to see which linked values changed.</p>
    <div class="ts-tables">
      <section class="ts-table"><h3>Income statement</h3><div data-table="income"></div></section>
      <section class="ts-table"><h3>Cash flow statement</h3><div data-table="cash"></div></section>
      <section class="ts-table"><h3>Balance sheet</h3><div data-table="balance"></div></section>
    </div>
    <section class="ts-definitions" aria-live="polite" aria-atomic="true"><h3 data-definition-title>Statement links</h3><div data-definition-body><p>Focus a row to read its matching source definition.</p></div></section>
    <p class="ts-caption">Illustrative model, fictional company, not real data</p>
    <p data-error role="alert" hidden></p>
  `;
  return root;
}

function makeRows(type, results, state, balanceExamples) {
  const vals = getter => Object.fromEntries(COLUMNS.map(column => [column.key, getter(results[column.key], state[column.key])]));
  if (type === "income") {
    const rows = [
      input("revenue", "Revenue", "revenue", "revenue", vals((r, s) => s.revenue), "number", { concepts: "6.5.4" }),
      input("cogs", "Cost of goods sold", "cogs", "cogs", vals((r, s) => s.cogs), "number", { concepts: "6.5.1" }),
      subtotal("gross_profit", "Gross profit", vals(r => r.income_statement.gross_profit), "Gross profit = revenue - cost of goods sold", { concepts: "6.5.1", dependsOn: ["revenue", "cogs"] }),
      input("operating_expenses", "Operating expenses", "operating_expenses", "operating_expenses", vals((r, s) => s.operating_expenses), "number", { concepts: "6.5.1" }),
      input("depreciation", "D&A (memo, included above)", "depreciation", "depreciation", vals((r, s) => s.depreciation), "number", { concepts: "6.5.1,6.5.3", note: "Also added back in operating cash flow." }),
      subtotal("operating_income", "Operating income", vals(r => r.income_statement.operating_income), "Operating income = gross profit - operating expenses", { concepts: "6.5.1", dependsOn: ["gross_profit", "operating_expenses"] }),
      input("interest", "Interest expense", "interest", "interest", vals((r, s) => s.interest), "number", { concepts: "6.5.1" }),
      input("tax_rate", "Tax rate (%)", "tax_rate", "tax_rate", vals((r, s) => s.tax_rate), "number", { concepts: "6.5.1", format: "percent" }),
      formula("income_taxes", "Income taxes", vals(r => r.income_statement.income_taxes), "Income taxes = rounded pre-tax income × tax rate", { concepts: "6.5.1" }),
      subtotal("net_income", "Net income", vals(r => r.income_statement.net_income), "Net income = pre-tax income - income taxes", { concepts: "6.5.1,6.5.2,6.5.3", dependsOn: ["operating_income", "interest", "income_taxes"] }),
    ];
    return rows;
  }
  if (type === "cash") {
    return [
      formula("net_income", "Net income", vals(r => r.income_statement.net_income), "Linked from the income statement", { concepts: "6.5.1,6.5.3" }),
      input("depreciation", "Depreciation and amortization", "depreciation", "depreciation", vals((r, s) => s.depreciation), "number", { concepts: "6.5.1,6.5.3" }),
      input("receivables_change", "Increase in receivables", "receivables_change", "receivables_change", vals((r, s) => s.receivables_change), "number", { concepts: "6.5.4" }),
      input("inventory_change", "Increase in inventory", "inventory_change", "inventory_change", vals((r, s) => s.inventory_change), "number", { concepts: "6.5.1" }),
      input("payables_change", "Increase in payables", "payables_change", "payables_change", vals((r, s) => s.payables_change), "number", { concepts: "6.5.1" }),
      subtotal("cfo", "Cash flow from operations", vals(r => r.cash_flow_statement.cash_flow_from_operating_activities), "CFO = net income + D&A - receivables - inventory + payables", { concepts: "6.5.1", dependsOn: ["net_income", "depreciation", "receivables_change", "inventory_change", "payables_change"] }),
      input("capital_expenditure", "Capital expenditure", "capital_expenditure", "capital_expenditure", vals((r, s) => -s.capital_expenditure), "signed", { concepts: "6.5.1" }),
      formula("cfi", "Cash flow from investing", vals(r => r.cash_flow_statement.cash_flow_from_investing_activities), "CFI = signed capital expenditure", { concepts: "6.5.1" }),
      input("debt_repaid", "Debt issued / (repaid)", "debt_repaid", "debt_repaid", vals((r, s) => -s.debt_repaid), "signed", { concepts: "6.5.1" }),
      input("dividends", "Dividends paid", "dividends", "dividends", vals((r, s) => -s.dividends), "signed", { concepts: "6.5.2" }),
      formula("cff", "Cash flow from financing", vals(r => r.cash_flow_statement.cash_flow_from_financing_activities), "CFF = debt repayment + dividends", { concepts: "6.5.1,6.5.2" }),
      subtotal("net_change", "Net change in cash", vals(r => r.cash_flow_statement.net_change_in_cash), "Net change = CFO + CFI + CFF", { concepts: "6.4.5", dependsOn: ["cfo", "cfi", "cff"] }),
      formula("beginning_cash", "Beginning cash", vals(r => r.cash_flow_statement.beginning_cash), "Beginning cash is prior-period balance-sheet cash", { concepts: "6.4.5" }),
      subtotal("ending_cash", "Ending cash", vals(r => r.cash_flow_statement.ending_cash), "Ending cash = beginning cash + net change", { concepts: "6.4.5", dependsOn: ["beginning_cash", "net_change"] }),
      formula("free_cash_flow", "Free cash flow", vals(r => r.cash_flow_statement.free_cash_flow), "Free cash flow = CFO + signed capital expenditure", { concepts: "6.5.1" }),
    ];
  }
  return [
    formula("cash", "Cash and equivalents", vals(r => r.balance_sheet.cash_and_equivalents), "Cash equals the cash-flow statement ending balance", { concepts: "6.4.5" }),
    formula("receivables", "Accounts receivable", vals(r => r.balance_sheet.accounts_receivable), "Prior receivables + increase in receivables", { concepts: "6.5.4" }),
    formula("inventory", "Inventory", vals(r => r.balance_sheet.inventory), "Prior inventory + increase in inventory", { concepts: "6.5.1" }),
    formula("ppe", "PP&E, net", vals(r => r.balance_sheet.ppe_net), "Prior PP&E + capital expenditure - D&A", { concepts: "6.5.1,6.5.3" }),
    subtotal("assets", "Total assets", vals(r => r.balance_sheet.total_assets), "Total assets = cash + receivables + inventory + PP&E", { concepts: "6.5.1", dependsOn: ["cash", "receivables", "inventory", "ppe"] }),
    formula("payables", "Accounts payable", vals(r => r.balance_sheet.accounts_payable), "Prior payables + increase in payables", { concepts: "6.5.1" }),
    formula("debt", "Long-term debt", vals(r => r.balance_sheet.long_term_debt), "Prior debt - debt repaid", { concepts: "6.5.1" }),
    formula("share_capital", "Share capital", vals(r => r.balance_sheet.share_capital), "Carried forward from the prior balance sheet", { concepts: "6.5.1" }),
    formula("retained_earnings", "Retained earnings", vals(r => r.balance_sheet.retained_earnings), "Prior retained earnings + net income - dividends", { concepts: "6.5.1,6.5.2" }),
    subtotal("liabilities_equity", "Liabilities + equity", vals(r => r.balance_sheet.total_liabilities_and_equity), "Liabilities + equity = payables + debt + share capital + retained earnings", { concepts: "6.5.1", dependsOn: ["payables", "debt", "share_capital", "retained_earnings"] }),
    line("check", "Assets - (liabilities + equity)", "check", vals(r => r.balance_sheet.total_assets - r.balance_sheet.total_liabilities_and_equity), { concepts: "6.5.1", balancedLabel: "Balanced" }),
    formula("example_cash", "Example balance-sheet cash", vals((r, s) => balanceExamples[s === state.year_1 ? "year_1" : "year_2"].cash_and_equivalents), "Compare the linked ending cash to the supplied example", { concepts: "6.4.5" }),
  ];
}

export async function init(widgetContainer) {
  const root = createTemplate();
  widgetContainer.replaceChildren(root);
  const $ = selector => root.querySelector(selector);
  const status = $(`[data-status]`);
  const error = $(`[data-error]`);
  const definitions = new Map();
  let example;
  let sourceConcepts;
  let state;
  let lastEdited = "";
  let whatIf = false;
  try {
    [example, sourceConcepts] = await Promise.all([fetchFinancialExample(), fetchConcepts()]);
    sourceConcepts.filter(concept => SOURCE_IDS.includes(concept.source_id)).forEach(concept => definitions.set(concept.source_id, concept));
    const missing = SOURCE_IDS.filter(id => !definitions.has(id));
    if (missing.length) throw new Error(`Missing source concepts: ${missing.join(", ")}`);
    state = calculateThreeStatementModel(example).state;
  } catch (loadError) {
    error.hidden = false;
    error.textContent = `Could not load the statements or source definitions. ${loadError.message}`;
    status.dataset.state = "unbalanced";
    status.textContent = "The model is unavailable until its source data loads.";
    return;
  }

  const viewState = new Map([["income", "both"], ["cash", "both"], ["balance", "both"]]);
  function explain(ids) {
    const title = $(`[data-definition-title]`);
    const body = $(`[data-definition-body]`);
    body.replaceChildren();
    const matching = ids.map(id => definitions.get(id)).filter(Boolean);
    title.textContent = matching.length === 1 ? matching[0].title.replace(/^6\.[45]\.\d+\s*/, "") : "Statement links";
    matching.forEach(concept => {
      const p = document.createElement("p");
      p.textContent = concept.definition;
      p.dataset.sourceId = concept.source_id;
      body.append(p);
    });
  }

  function imbalance(results) {
    const problems = [];
    for (const year of ["year_1", "year_2"]) {
      const result = results[year];
      const opening = year === "year_1" ? example.balance_sheet.begin_y1 : results.year_1.balance_sheet;
      const s = state[year];
      if (result.balance_sheet.retained_earnings !== opening.retained_earnings + result.income_statement.net_income - s.dividends) problems.push("net income to retained earnings");
      if (result.balance_sheet.ppe_net !== opening.ppe_net + s.capital_expenditure - s.depreciation) problems.push("D&A to PP&E");
      if (result.cash_flow_statement.cash_flow_from_operating_activities !== result.income_statement.net_income + s.depreciation - s.receivables_change - s.inventory_change + s.payables_change) problems.push("working capital to cash");
      if (result.balance_sheet.cash_and_equivalents !== result.cash_flow_statement.ending_cash) problems.push("ending cash to balance-sheet cash");
    }
    return [...new Set(problems)];
  }

  function changeCaption(model, driver, year) {
    if (!driver) return "Edit an input to see which linked values changed.";
    const prefix = `${year.replace("_", " ")}: `;
    if (["revenue", "cogs", "operating_expenses", "interest", "tax_rate"].includes(driver)) return `${prefix}Net income changed, so retained earnings and the start of cash flow from operations changed.`;
    if (driver === "depreciation") return `${prefix}D&A changed, so PP&E and the non-cash add-back in operating cash flow changed.`;
    if (["receivables_change", "inventory_change", "payables_change"].includes(driver)) return `${prefix}Working capital changed, so operating cash flow and ending cash changed.`;
    if (driver === "capital_expenditure") return `${prefix}Capital expenditure changed, so investing cash flow and PP&E changed.`;
    if (driver === "debt_repaid") return `${prefix}Debt repayment changed, so financing cash flow and debt changed.`;
    if (driver === "dividends") return `${prefix}Dividends changed, so financing cash flow and retained earnings changed.`;
    return "Linked statements recalculated from the shared model.";
  }

  function render() {
    const model = calculateThreeStatementModel(example, state, whatIf ? 100 : 0);
    const { results } = model;
    const issues = imbalance(results);
    status.dataset.state = issues.length ? "unbalanced" : "balanced";
    status.textContent = issues.length ? `Imbalance — broken link: ${issues.join("; ")}.` : "Balanced — both years reconcile across income, cash flow, and balance sheet.";
    const [changedDriver, changedPeriod] = lastEdited.split(":");
    $(`[data-change]`).textContent = changeCaption(model, changedDriver || "", changedPeriod || "");
    const baseline = calculateThreeStatementModel(example, state);
    const whatIfButton = $(`[data-what-if]`);
    whatIfButton.setAttribute("aria-pressed", String(whatIf));
    whatIfButton.textContent = whatIf ? "Remove extra credit sale" : "Add 100 units of credit sales";
    $(`[data-what-if-result]`).textContent = whatIf
      ? `Year 2: revenue ${fmt(baseline.results.year_2.income_statement.revenue)} → ${fmt(results.year_2.income_statement.revenue)}, net income ${fmt(baseline.results.year_2.income_statement.net_income)} → ${fmt(results.year_2.income_statement.net_income)}, CFO ${fmt(baseline.results.year_2.cash_flow_statement.cash_flow_from_operating_activities)} → ${fmt(results.year_2.cash_flow_statement.cash_flow_from_operating_activities)}.`
      : "";
    for (const type of ["income", "cash", "balance"]) {
      const rows = makeRows(type, results, state, {
        year_1: example.balance_sheet.end_y1,
        year_2: example.balance_sheet.end_y2,
      });
      renderFinTable($(`[data-table="${type}"]`), {
        title: `${type === "income" ? "Income statement" : type === "cash" ? "Cash flow statement" : "Balance sheet"} — Zayd Trading Co.`,
        columns: COLUMNS,
        rows,
        view: viewState.get(type),
        onViewChange: view => { viewState.set(type, view); render(); },
        onChange: ({ rowKey, columnKey, value }) => {
          const row = rows.find(item => item.key === rowKey);
          if (!row?.stateKey) return;
          const next = Math.round(Number(value));
          state[columnKey][row.stateKey] = row.stateKey === "capital_expenditure" || row.stateKey === "debt_repaid" || row.stateKey === "dividends"
            ? Math.abs(next) : next;
          lastEdited = `${row.stateKey}:${columnKey}`;
          render();
        },
        onRowFocus: rowKey => {
          const row = rows.find(item => item.key === rowKey);
          const ids = String(row?.concepts || "6.5.1").split(",").filter(Boolean);
          explain(ids);
        },
        onReset: reset,
      });
    }
  }

  function reset() {
    state = calculateThreeStatementModel(example).state;
    lastEdited = "";
    whatIf = false;
    render();
    explain(["6.5.1"]);
  }
  $(`[data-reset]`).addEventListener("click", reset);
  $(`[data-what-if]`).addEventListener("click", () => { whatIf = !whatIf; render(); });
  render();
  explain(["6.5.1"]);
}
