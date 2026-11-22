import {
  applyBalanceSheetTransaction,
  computeBalanceSheetTotals,
} from "./fin_model.js";
import { renderFinTable } from "./fin_table.js";
import { fetchConcepts, fetchFinancialExample } from "../api.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFINITION_FOR_KEY = {
  cash_and_equivalents: "6.2.3",
  accounts_receivable: "6.2.3",
  inventory: "6.2.3",
  current_assets: "6.2.4",
  ppe_net: "6.2.5",
  current_liabilities: "6.2.7",
  long_term_debt: "6.2.8",
  share_capital: "6.2.9",
  retained_earnings: "6.2.10",
  total_current_assets: "6.2.4",
  total_assets: "6.2.1",
  total_current_liabilities: "6.2.7",
  total_liabilities: "6.2.6",
  total_equity: "6.2.9",
  total_liabilities_and_equity: "6.2.2",
  current_ratio: "6.2.12",
  debt_to_equity: "6.2.12",
  check: "6.2.2",
  total_current_assets: "6.2.4",
  total_assets: "6.2.1",
  total_current_liabilities: "6.2.7",
  total_liabilities: "6.2.6",
  total_equity: "6.2.9",
  total_liabilities_and_equity: "6.2.2",
  current_ratio: "6.2.12",
  debt_to_equity: "6.2.12",
  check: "6.2.2",
};
const CONCEPT_HIGHLIGHTS = {
  "6.2.1": ["all"],
  "6.2.2": ["equation"],
  "6.2.3": ["all_assets"],
  "6.2.4": ["current_assets"],
  "6.2.5": ["ppe_net"],
  "6.2.6": ["liabilities"],
  "6.2.7": ["current_liabilities"],
  "6.2.8": ["long_term_debt"],
  "6.2.9": ["equity"],
  "6.2.10": ["retained_earnings"],
  "6.2.11": ["liquidity"],
  "6.2.12": ["ratios"],
};

const whole = value => Math.round(Number(value) || 0);
const displayAmount = value => whole(value).toLocaleString("en-US");

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function pickBalance(source) {
  return computeBalanceSheetTotals({
    cash_and_equivalents: source.cash_and_equivalents,
    accounts_receivable: source.accounts_receivable,
    inventory: source.inventory,
    ppe_net: source.ppe_net,
    accounts_payable: source.accounts_payable,
    current_debt: source.current_debt,
    long_term_debt: source.long_term_debt,
    share_capital: source.share_capital,
    retained_earnings: source.retained_earnings,
  });
}

function makeTemplate() {
  const root = document.createElement("section");
  root.className = "balance-sheet-widget";
  root.innerHTML = `
    <style>
      .balance-sheet-widget { color: var(--text); }
      .balance-sheet-widget * { box-sizing: border-box; }
      .balance-sheet-widget button,
      .balance-sheet-widget select,
      .balance-sheet-widget input { font: inherit; }
      .balance-sheet-widget button:focus-visible,
      .balance-sheet-widget select:focus-visible,
      .balance-sheet-widget input:focus-visible,
      .balance-sheet-widget .bs-block:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
      .balance-sheet-widget .bs-toolbar { display: flex; align-items: end; flex-wrap: wrap; gap: 1rem 1.4rem; margin-bottom: 1rem; }
      .balance-sheet-widget .bs-select-wrap { display: grid; gap: .35rem; }
      .balance-sheet-widget .bs-select-wrap label,
      .balance-sheet-widget .bs-transaction-input label { color: var(--muted); font-size: .9rem; font-weight: 650; }
      .balance-sheet-widget select,
      .balance-sheet-widget input[type="number"] { min-height: 42px; border: 1px solid var(--border); border-radius: .6rem; padding: .45rem .65rem; background: var(--bg); color: var(--text); }
      .balance-sheet-widget .bs-liquidity-toggle { display: inline-flex; align-items: center; gap: .55rem; min-height: 42px; }
      .balance-sheet-widget .bs-liquidity-toggle input { accent-color: var(--primary); width: 1rem; height: 1rem; }
      .balance-sheet-widget .bs-order-note { margin: -.25rem 0 1rem; color: var(--muted); font-size: .9rem; }
      .balance-sheet-widget .bs-equation { width: 100%; margin: 0 0 .9rem; padding: .75rem 1rem; border: 1px solid var(--border); border-left: 4px solid var(--primary); border-radius: .7rem; background: color-mix(in srgb, var(--primary) 7%, var(--bg)); color: var(--text); text-align: left; cursor: pointer; }
      .balance-sheet-widget .bs-equation.is-concept-match { box-shadow: 0 0 0 3px var(--accent); }
      .balance-sheet-widget .bs-equation-line { display: block; font-weight: 750; }
      .balance-sheet-widget .bs-balance-status { display: block; margin-top: .2rem; color: var(--muted); }
      .balance-sheet-widget .bs-balance-status.is-balanced { color: var(--success); font-weight: 750; }
      .balance-sheet-widget .bs-balance-status.is-unbalanced { color: var(--danger); font-weight: 800; }
      .balance-sheet-widget .bs-ratios { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .7rem; margin: 0 0 1rem; }
      .balance-sheet-widget .bs-ratio { border: 1px solid var(--border); border-radius: .75rem; background: var(--bg); color: var(--text); padding: .75rem; text-align: left; cursor: pointer; }
      .balance-sheet-widget .bs-ratio.is-concept-match { outline: 3px solid var(--accent); outline-offset: 2px; }
      .balance-sheet-widget .bs-ratio-label { display: block; color: var(--muted); font-size: .84rem; }
      .balance-sheet-widget .bs-ratio-value { display: block; margin-top: .2rem; font-size: 1.2rem; font-weight: 750; }
      .balance-sheet-widget .bs-chart-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: .9rem; background: var(--bg); padding: .5rem; }
      .balance-sheet-widget .bs-table-section { margin-top: 1rem; }
      .balance-sheet-widget .bs-table-section h3 { margin: 0 0 .6rem; color: var(--primary); font-size: 1.1rem; }
      .balance-sheet-widget .bs-check-explanation { min-height: 1.4rem; margin: .65rem 0; color: var(--muted); font-size: .9rem; }
      .balance-sheet-widget .bs-fix-hint { margin: .2rem 0 .9rem; border: 1px solid var(--border); border-radius: 999px; background: var(--bg); color: var(--text); cursor: pointer; padding: .5rem .8rem; }
      .balance-sheet-widget .bs-fix-message { margin: .4rem 0; color: var(--muted); }
      .balance-sheet-widget .bs-chart { display: block; width: 100%; min-width: 680px; height: auto; }
      .balance-sheet-widget .bs-grid { stroke: var(--border); stroke-width: 1; }
      .balance-sheet-widget .bs-axis { stroke: var(--text); stroke-width: 1.2; }
      .balance-sheet-widget .bs-chart-label,
      .balance-sheet-widget .bs-chart-value { fill: var(--text); font-family: inherit; font-size: 12px; }
      .balance-sheet-widget .bs-chart-value { font-size: 11px; font-weight: 750; }
      .balance-sheet-widget .bs-block { cursor: pointer; transform-box: fill-box; transform-origin: center bottom; }
      .balance-sheet-widget .bs-block.is-changed { animation: bs-block-change .42s ease-out; }
      .balance-sheet-widget .bs-block-rect { stroke: var(--bg); stroke-width: 1.5; }
      .balance-sheet-widget .bs-assets .bs-block-rect { fill: var(--primary); }
      .balance-sheet-widget .bs-liabilities .bs-block-rect { fill: var(--accent); }
      .balance-sheet-widget .bs-equity .bs-block-rect { fill: color-mix(in srgb, var(--primary) 55%, var(--accent)); }
      .balance-sheet-widget .bs-block-label { fill: var(--bg); font-family: inherit; font-size: 11px; font-weight: 700; pointer-events: none; }
      .balance-sheet-widget .bs-block.is-concept-match .bs-block-rect { stroke: var(--text); stroke-width: 4; }
      .balance-sheet-widget .bs-column-total { fill: var(--text); font-family: inherit; font-size: 14px; font-weight: 800; }
      .balance-sheet-widget .bs-definition { min-height: 4rem; margin-top: .9rem; padding: .8rem 1rem; border-left: 3px solid var(--primary); background: color-mix(in srgb, var(--primary) 7%, var(--bg)); }
      .balance-sheet-widget .bs-definition h3 { margin: 0 0 .35rem; color: var(--primary); font-size: 1rem; }
      .balance-sheet-widget .bs-definition p { margin: 0; line-height: 1.5; }
      .balance-sheet-widget .bs-transactions { margin-top: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: .9rem; }
      .balance-sheet-widget .bs-transactions h3 { margin: 0 0 .75rem; color: var(--primary); font-size: 1.1rem; }
      .balance-sheet-widget .bs-transaction-inputs { display: flex; flex-wrap: wrap; gap: .8rem; margin-bottom: .8rem; }
      .balance-sheet-widget .bs-transaction-input { display: grid; gap: .3rem; min-width: 170px; }
      .balance-sheet-widget .bs-transaction-input input { width: 100%; }
      .balance-sheet-widget .bs-transaction-buttons { display: flex; flex-wrap: wrap; gap: .55rem; }
      .balance-sheet-widget .bs-transaction-buttons button,
      .balance-sheet-widget .bs-reset { border: 1px solid var(--border); border-radius: 999px; background: var(--bg); color: var(--text); cursor: pointer; padding: .55rem .85rem; }
      .balance-sheet-widget .bs-transaction-buttons button:hover,
      .balance-sheet-widget .bs-reset:hover { border-color: var(--primary); }
      .balance-sheet-widget .bs-transaction-message { min-height: 2.8rem; margin: .8rem 0; padding: .65rem .8rem; border-radius: .55rem; background: color-mix(in srgb, var(--accent) 9%, var(--bg)); }
      .balance-sheet-widget .bs-transaction-message[hidden] { display: none; }
      .balance-sheet-widget .bs-error { margin: .6rem 0; color: var(--accent); font-weight: 700; }
      .balance-sheet-widget .bs-caption { margin: .8rem 0 0; color: var(--muted); font-size: .9rem; }
      @keyframes bs-block-change { from { opacity: .55; transform: scaleY(.86); } to { opacity: 1; transform: scaleY(1); } }
      @media (prefers-reduced-motion: reduce) { .balance-sheet-widget .bs-block.is-changed { animation: none; } }
      @media (max-width: 560px) { .balance-sheet-widget .bs-ratios { grid-template-columns: 1fr; } }
    </style>
    <div class="bs-toolbar">
      <div class="bs-select-wrap">
        <label for="bs-year">Balance sheet date</label>
        <select id="bs-year" data-year>
          <option value="begin_y1">Beginning of Year 1</option>
          <option value="end_y1">End of Year 1</option>
          <option value="end_y2">End of Year 2</option>
        </select>
      </div>
      <label class="bs-liquidity-toggle" data-definition-id="6.2.11">
        <input type="checkbox" data-liquidity>
        <span>Show assets in liquidity order</span>
      </label>
    </div>
    <p class="bs-order-note" data-order-note hidden></p>
    <button type="button" class="bs-equation" data-definition-id="6.2.2">
      <span class="bs-equation-line">Assets = Liabilities + Equity</span>
      <span class="bs-balance-status" data-balance-status aria-live="polite">Waiting for example…</span>
    </button>
    <div class="bs-ratios" data-definition-id="6.2.12">
      <button type="button" class="bs-ratio" data-definition-id="6.2.12">
        <span class="bs-ratio-label">Current ratio</span><span class="bs-ratio-value" data-current-ratio>—</span>
      </button>
      <button type="button" class="bs-ratio" data-definition-id="6.2.12">
        <span class="bs-ratio-label">Debt-to-equity</span><span class="bs-ratio-value" data-debt-equity>—</span>
      </button>
    </div>
    <div class="bs-chart-wrap"><svg class="bs-chart" role="img" aria-label="Assets compared with liabilities and equity"></svg></div>
    <section class="bs-table-section" aria-labelledby="bs-table-heading">
      <h3 id="bs-table-heading">Interactive balance sheet</h3>
      <div class="bs-table-container"></div>
      <p class="bs-check-explanation" data-check-explanation aria-live="polite"></p>
      <button type="button" class="bs-fix-hint" data-fix-hint>Fix the balance</button>
      <p class="bs-fix-message" data-fix-message role="status" aria-live="polite"></p>
    </section>
    <section class="bs-definition" aria-live="polite" aria-atomic="true">
      <h3 data-definition-title>Line definition</h3>
      <p data-definition-text>Focus a block to read its source definition.</p>
    </section>
    <section class="bs-transactions" aria-labelledby="bs-transaction-heading">
      <h3 id="bs-transaction-heading">Try a transaction</h3>
      <div class="bs-transaction-inputs">
        <div class="bs-transaction-input"><label for="bs-transaction-amount">Transaction amount</label><input id="bs-transaction-amount" type="number" min="1" max="1000000" step="1" value="10"></div>
        <div class="bs-transaction-input"><label for="bs-sale-cost">Inventory cost for credit sale</label><input id="bs-sale-cost" type="number" min="0" max="1000000" step="1" value="6"></div>
      </div>
      <div class="bs-transaction-buttons" role="group" aria-label="Balance sheet transactions">
        <button type="button" data-transaction="borrow_cash">Borrow cash</button>
        <button type="button" data-transaction="buy_equipment_with_cash">Buy equipment with cash</button>
        <button type="button" data-transaction="buy_inventory_on_credit">Buy inventory on credit</button>
        <button type="button" data-transaction="sell_on_credit">Sell on credit</button>
        <button type="button" data-transaction="collect_from_customers">Collect from customers</button>
        <button type="button" data-transaction="pay_dividend">Pay a dividend</button>
        <button type="button" data-transaction="issue_shares">Issue shares</button>
      </div>
      <p class="bs-transaction-message" data-transaction-message role="status" aria-live="polite" hidden></p>
      <button type="button" class="bs-reset" data-reset>Reset to selected date</button>
    </section>
    <p class="bs-error" role="alert" hidden></p>
    <p class="bs-caption">Illustrative model, fictional company, not real data</p>
  `;
  return root;
}

function chartSegments(balance, showLiquidityOrder) {
  const assets = showLiquidityOrder
    ? [
      { key: "cash_and_equivalents", label: "Cash", amount: balance.cash_and_equivalents, kind: "assets", def: "6.2.3" },
      { key: "accounts_receivable", label: "Receivables", amount: balance.accounts_receivable, kind: "assets", def: "6.2.3" },
      { key: "inventory", label: "Inventory", amount: balance.inventory, kind: "assets", def: "6.2.3" },
      { key: "ppe_net", label: "PP&E", amount: balance.ppe_net, kind: "assets", def: "6.2.5" },
    ]
    : [
      { key: "current_assets", label: "Current assets", amount: balance.total_current_assets, kind: "assets", def: "6.2.4" },
      { key: "ppe_net", label: "Non-current assets", amount: balance.ppe_net, kind: "assets", def: "6.2.5" },
    ];
  const liabilitiesAndEquity = [
    { key: "current_liabilities", label: "Current liabilities", amount: balance.total_current_liabilities, kind: "liabilities", def: "6.2.7" },
    { key: "long_term_debt", label: "Non-current liabilities", amount: balance.long_term_debt, kind: "liabilities", def: "6.2.8" },
    { key: "share_capital", label: "Share capital", amount: balance.share_capital, kind: "equity", def: "6.2.9" },
    { key: "retained_earnings", label: "Retained earnings", amount: balance.retained_earnings, kind: "equity", def: "6.2.10" },
  ];
  return { assets, liabilitiesAndEquity };
}

function drawChart(svg, balance, showLiquidityOrder, conceptId, changedKeys) {
  const { assets, liabilitiesAndEquity } = chartSegments(balance, showLiquidityOrder);
  const width = 960;
  const height = 410;
  const plotTop = 62;
  const plotBottom = 346;
  const plotHeight = plotBottom - plotTop;
  const maximum = Math.max(balance.total_assets, balance.total_liabilities_and_equity, 1);
  const scaleTop = maximum * 1.08;
  const scale = plotHeight / scaleTop;
  const assetX = 190;
  const rhsX = 570;
  const columnWidth = 200;
  const totalAsset = balance.total_assets;
  const totalRhs = balance.total_liabilities_and_equity;
  const highlights = CONCEPT_HIGHLIGHTS[conceptId] || [];
  const assetAll = highlights.includes("all") || highlights.includes("all_assets");
  const liabilityAll = highlights.includes("all") || highlights.includes("liabilities");
  const equityAll = highlights.includes("all") || highlights.includes("equity");

  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("aria-label", `Assets ${displayAmount(totalAsset)} compared with liabilities and equity ${displayAmount(totalRhs)}.`);
  const title = svgElement("title");
  title.textContent = "Balance sheet assets compared with liabilities and equity";
  const description = svgElement("desc");
  description.textContent = "Two vertical columns are scaled to their totals. Focus a block to show its source definition.";
  svg.append(title, description);

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = scaleTop * (1 - tick / 4);
    const y = plotBottom - value * scale;
    const grid = svgElement("line", {
      x1: 92,
      y1: y,
      x2: 870,
      y2: y,
      class: tick === 4 ? "bs-axis" : "bs-grid",
    });
    const label = svgElement("text", {
      x: 82,
      y: y + 4,
      "text-anchor": "end",
      class: "bs-chart-label",
    });
    label.textContent = displayAmount(value);
    svg.append(grid, label);
  }
  const assetHeading = svgElement("text", { x: assetX + columnWidth / 2, y: 34, "text-anchor": "middle", class: "bs-column-total" });
  assetHeading.textContent = `Assets · ${displayAmount(totalAsset)}`;
  const rhsHeading = svgElement("text", { x: rhsX + columnWidth / 2, y: 34, "text-anchor": "middle", class: "bs-column-total" });
  rhsHeading.textContent = `Liabilities + Equity · ${displayAmount(totalRhs)}`;
  svg.append(assetHeading, rhsHeading);

  const renderStack = (segments, x, side) => {
    let cumulative = 0;
    for (const segment of segments) {
      const amount = Math.max(0, whole(segment.amount));
      const y = plotBottom - (cumulative + amount) * scale;
      const blockHeight = amount * scale;
      const isHighlighted = highlights.includes(segment.key)
        || (segment.key === "current_assets" && highlights.includes("current_assets"))
        || (showLiquidityOrder && ["cash_and_equivalents", "accounts_receivable", "inventory"].includes(segment.key) && highlights.includes("current_assets"))
        || (side === "assets" && assetAll)
        || (side === "liabilities" && liabilityAll && segment.kind === "liabilities")
        || (side === "liabilities" && equityAll && segment.kind === "equity");
      const isChanged = changedKeys.has(segment.key)
        || (segment.key === "current_assets" && ["cash_and_equivalents", "accounts_receivable", "inventory"].some(key => changedKeys.has(key)))
        || (segment.key === "current_liabilities" && ["accounts_payable", "current_debt"].some(key => changedKeys.has(key)));
      const group = svgElement("g", {
        class: `bs-block bs-${segment.kind}${isHighlighted ? " is-concept-match" : ""}${isChanged ? " is-changed" : ""}`,
        tabindex: "0",
        role: "button",
        "data-definition-id": segment.def,
        "data-line-key": segment.key,
        "aria-describedby": "bs-definition-text",
        "aria-label": `${segment.label}, ${displayAmount(amount)}`,
      });
      const rect = svgElement("rect", {
        x,
        y,
        width: columnWidth,
        height: Math.max(1, blockHeight),
        rx: 2,
        class: "bs-block-rect",
      });
      group.append(rect);
      if (blockHeight >= 22) {
        const label = svgElement("text", {
          x: x + columnWidth / 2,
          y: y + blockHeight / 2 + 4,
          "text-anchor": "middle",
          class: "bs-block-label",
        });
        label.textContent = `${segment.label} · ${displayAmount(amount)}`;
        group.append(label);
      }
      svg.append(group);
      cumulative += amount;
    }
  };

  renderStack(assets, assetX, "assets");
  renderStack(liabilitiesAndEquity, rhsX, "liabilities");
  const axis = svgElement("line", { x1: 92, y1: plotBottom, x2: 870, y2: plotBottom, class: "bs-axis" });
  svg.append(axis);
}

function transactionDescription(type, amount, cost) {
  const saleProfit = amount - cost;
  switch (type) {
    case "borrow_cash":
      return `Assets: cash increased by ${displayAmount(amount)}. Liabilities: long-term debt increased by ${displayAmount(amount)}.`;
    case "buy_equipment_with_cash":
      return `Assets: cash decreased by ${displayAmount(amount)} and PP&E increased by ${displayAmount(amount)}. Total assets and the liabilities-plus-equity side are unchanged.`;
    case "buy_inventory_on_credit":
      return `Assets: inventory increased by ${displayAmount(amount)}. Liabilities: accounts payable increased by ${displayAmount(amount)}.`;
    case "sell_on_credit":
      return `Assets: accounts receivable increased by ${displayAmount(amount)} and inventory decreased by ${displayAmount(cost)}. Equity: retained earnings ${saleProfit < 0 ? "decreased" : "increased"} by ${displayAmount(Math.abs(saleProfit))}.`;
    case "collect_from_customers":
      return `Assets: cash increased by ${displayAmount(amount)} and accounts receivable decreased by ${displayAmount(amount)}. Total assets and the liabilities-plus-equity side are unchanged.`;
    case "pay_dividend":
      return `Assets: cash decreased by ${displayAmount(amount)}. Equity: retained earnings decreased by ${displayAmount(amount)}.`;
    case "issue_shares":
      return `Assets: cash increased by ${displayAmount(amount)}. Equity: share capital increased by ${displayAmount(amount)}.`;
    default:
      return "";
  }
}

const CHANGED_KEYS = {
  borrow_cash: ["cash_and_equivalents", "long_term_debt"],
  buy_equipment_with_cash: ["cash_and_equivalents", "ppe_net"],
  buy_inventory_on_credit: ["inventory", "accounts_payable", "current_liabilities"],
  sell_on_credit: ["accounts_receivable", "inventory", "retained_earnings"],
  collect_from_customers: ["cash_and_equivalents", "accounts_receivable"],
  pay_dividend: ["cash_and_equivalents", "retained_earnings"],
  issue_shares: ["cash_and_equivalents", "share_capital"],
};

export async function init(widgetContainer) {
  const root = makeTemplate();
  widgetContainer.replaceChildren(root);
  const get = selector => root.querySelector(selector);
  const state = {
    example: null,
    year: "begin_y1",
    balance: null,
    periodBalances: {},
    tableView: "all",
    definitions: new Map(),
    showLiquidityOrder: false,
    changedKeys: new Set(),
  };
  const conceptId = String(widgetContainer.dataset.conceptId || "");
  const yearSelect = get("[data-year]");
  const liquidityInput = get("[data-liquidity]");
  const svg = get(".bs-chart");
  const status = get("[data-balance-status]");
  const definitionTitle = get("[data-definition-title]");
  const definitionText = get("[data-definition-text]");
  const error = get(".bs-error");
  const transactionMessage = get("[data-transaction-message]");
  const checkExplanation = get("[data-check-explanation]");
  const fixMessage = get("[data-fix-message]");

  const balanceColumns = [
    { key: "begin_y1", label: "Beginning of Year 1" },
    { key: "end_y1", label: "End of Year 1" },
    { key: "end_y2", label: "End of Year 2" },
  ];

  function tableRows() {
    const balances = Object.fromEntries(balanceColumns.map(column => [column.key, state.periodBalances[column.key]]));
    const values = key => Object.fromEntries(balanceColumns.map(column => [column.key, balances[column.key][key]]));
    const inputRows = [
      ["cash_and_equivalents", "Cash and equivalents", "6.2.3"],
      ["accounts_receivable", "Accounts receivable", "6.2.3"],
      ["inventory", "Inventory", "6.2.3"],
      ["ppe_net", "PP&E (net)", "6.2.5"],
      ["accounts_payable", "Accounts payable", "6.2.7"],
      ["current_debt", "Current debt", "6.2.7"],
      ["long_term_debt", "Long-term debt", "6.2.8"],
      ["share_capital", "Share capital", "6.2.9"],
      ["retained_earnings", "Retained earnings", "6.2.10"],
    ].map(([key, label, definitionId]) => ({
      key, label, kind: "input", format: "number", values: values(key), definitionId,
    }));
    const currentRatio = Object.fromEntries(balanceColumns.map(column => {
      const balance = balances[column.key];
      return [column.key, balance.total_current_liabilities
        ? balance.total_current_assets / balance.total_current_liabilities : null];
    }));
    const debtToEquity = Object.fromEntries(balanceColumns.map(column => {
      const balance = balances[column.key];
      const debt = balance.current_debt + balance.long_term_debt;
      return [column.key, balance.total_equity ? debt / balance.total_equity : null];
    }));
    const checkValues = Object.fromEntries(balanceColumns.map(column => {
      const balance = balances[column.key];
      return [column.key, balance.total_assets - balance.total_liabilities_and_equity];
    }));
    return [
      ...inputRows,
      { key: "total_current_assets", label: "Total current assets", kind: "subtotal", format: "number", values: values("total_current_assets"), definitionId: "6.2.4", dependsOn: ["cash_and_equivalents", "accounts_receivable", "inventory"], formula: ({ columnKey }) => `Current assets = ${displayAmount(balances[columnKey].cash_and_equivalents)} + ${displayAmount(balances[columnKey].accounts_receivable)} + ${displayAmount(balances[columnKey].inventory)} = ${displayAmount(balances[columnKey].total_current_assets)}` },
      { key: "total_assets", label: "Total assets", kind: "subtotal", format: "number", values: values("total_assets"), definitionId: "6.2.1", dependsOn: ["total_current_assets", "ppe_net"], formula: ({ columnKey }) => `Assets = ${displayAmount(balances[columnKey].total_current_assets)} + ${displayAmount(balances[columnKey].ppe_net)} = ${displayAmount(balances[columnKey].total_assets)}` },
      { key: "total_current_liabilities", label: "Total current liabilities", kind: "subtotal", format: "number", values: values("total_current_liabilities"), definitionId: "6.2.7", dependsOn: ["accounts_payable", "current_debt"], formula: ({ columnKey }) => `Current liabilities = ${displayAmount(balances[columnKey].accounts_payable)} + ${displayAmount(balances[columnKey].current_debt)} = ${displayAmount(balances[columnKey].total_current_liabilities)}` },
      { key: "total_liabilities", label: "Total liabilities", kind: "subtotal", format: "number", values: values("total_liabilities"), definitionId: "6.2.6", dependsOn: ["total_current_liabilities", "long_term_debt"], formula: ({ columnKey }) => `Liabilities = ${displayAmount(balances[columnKey].total_current_liabilities)} + ${displayAmount(balances[columnKey].long_term_debt)} = ${displayAmount(balances[columnKey].total_liabilities)}` },
      { key: "total_equity", label: "Total equity", kind: "subtotal", format: "number", values: values("total_equity"), definitionId: "6.2.9", dependsOn: ["share_capital", "retained_earnings"], formula: ({ columnKey }) => `Equity = ${displayAmount(balances[columnKey].share_capital)} + ${displayAmount(balances[columnKey].retained_earnings)} = ${displayAmount(balances[columnKey].total_equity)}` },
      { key: "total_liabilities_and_equity", label: "Total liabilities and equity", kind: "subtotal", format: "number", values: values("total_liabilities_and_equity"), definitionId: "6.2.2", dependsOn: ["total_liabilities", "total_equity"], formula: ({ columnKey }) => `Liabilities + equity = ${displayAmount(balances[columnKey].total_liabilities)} + ${displayAmount(balances[columnKey].total_equity)} = ${displayAmount(balances[columnKey].total_liabilities_and_equity)}` },
      { key: "current_ratio", label: "Current ratio", kind: "formula", format: "ratio", values: currentRatio, definitionId: "6.2.12", formula: ({ columnKey }) => `Current ratio = ${displayAmount(balances[columnKey].total_current_assets)} ÷ ${displayAmount(balances[columnKey].total_current_liabilities)} = ${currentRatio[columnKey]?.toFixed(2) ?? "Not defined"}` },
      { key: "debt_to_equity", label: "Debt-to-equity", kind: "formula", format: "ratio", values: debtToEquity, definitionId: "6.2.12", formula: ({ columnKey }) => `Debt-to-equity = ${displayAmount(balances[columnKey].current_debt + balances[columnKey].long_term_debt)} ÷ ${displayAmount(balances[columnKey].total_equity)} = ${debtToEquity[columnKey]?.toFixed(2) ?? "Not defined"}` },
      { key: "check", label: "Check · Assets − (Liabilities + Equity)", kind: "check", format: "signed", values: checkValues, definitionId: "6.2.2", balancedLabel: "Balanced", formula: ({ columnKey }) => `Assets minus liabilities and equity = ${displayAmount(balances[columnKey].total_assets)} - ${displayAmount(balances[columnKey].total_liabilities_and_equity)} = ${checkValues[columnKey]}` },
    ];
  }

  function renderTable() {
    renderFinTable(get(".bs-table-container"), {
      title: "Balance sheet · Zayd Trading Co.",
      columns: balanceColumns,
      rows: tableRows(),
      view: state.tableView,
      onViewChange: view => {
        state.tableView = view;
        if (view !== "all") {
          state.year = view;
          yearSelect.value = view;
          state.balance = state.periodBalances[view];
        }
        updateView();
      },
      onChange: ({ rowKey, columnKey, value }) => {
        state.year = columnKey;
        yearSelect.value = columnKey;
        state.balance = pickBalance({ ...state.periodBalances[columnKey], [rowKey]: value });
        state.periodBalances[columnKey] = state.balance;
        state.changedKeys = new Set([rowKey]);
        updateView();
      },
      onRowFocus: rowKey => showDefinition(DEFINITION_FOR_KEY[rowKey] || "6.2.2"),
      onReset: () => resetToYear(state.year),
    });
  }

  function showDefinition(id, label = "Line definition") {
    const concept = state.definitions.get(id);
    definitionTitle.textContent = concept ? concept.title.replace(/^6\.2\.\d+\s*/, "") : label;
    definitionText.textContent = concept?.definition || "No matching concept definition is available.";
  }

  function updateView() {
    if (!state.balance) return;
    const balance = state.balance;
    const isBalanced = balance.total_assets === balance.total_liabilities_and_equity;
    status.textContent = `Assets ${displayAmount(balance.total_assets)} = Liabilities ${displayAmount(balance.total_liabilities)} + Equity ${displayAmount(balance.total_equity)} · ${isBalanced ? "Balanced" : "Not balanced"}`;
    status.classList.toggle("is-balanced", isBalanced);
    status.classList.toggle("is-unbalanced", !isBalanced);

    const currentRatio = balance.total_current_liabilities
      ? balance.total_current_assets / balance.total_current_liabilities
      : null;
    const totalDebt = balance.current_debt + balance.long_term_debt;
    const debtEquity = balance.total_equity ? totalDebt / balance.total_equity : null;
    get("[data-current-ratio]").textContent = currentRatio === null ? "Not defined" : currentRatio.toFixed(2);
    get("[data-debt-equity]").textContent = debtEquity === null ? "Not defined" : debtEquity.toFixed(2);
    get("[data-current-ratio]").closest("button").classList.toggle("is-concept-match", CONCEPT_HIGHLIGHTS[conceptId]?.includes("ratios") || false);
    get("[data-debt-equity]").closest("button").classList.toggle("is-concept-match", CONCEPT_HIGHLIGHTS[conceptId]?.includes("ratios") || false);
    get("[data-order-note]").hidden = !state.showLiquidityOrder;
    get("[data-order-note]").textContent = "Assets are shown from most liquid to least liquid, bottom to top: cash, accounts receivable, inventory, then PP&E.";
    get("[data-liquidity]").closest("label").classList.toggle("is-concept-match", CONCEPT_HIGHLIGHTS[conceptId]?.includes("liquidity") || false);
    drawChart(svg, balance, state.showLiquidityOrder, conceptId, state.changedKeys);
    const accountingEquation = state.definitions.get("6.2.2");
    checkExplanation.textContent = accountingEquation?.definition || "The accounting equation explanation is unavailable until its source definition loads.";
    renderTable();
    state.changedKeys.clear();
  }

  try {
    state.example = await fetchFinancialExample();
  } catch (loadError) {
    error.hidden = false;
    error.textContent = `Could not load the financial example. ${loadError.message}`;
    return;
  }

  try {
    const concepts = await fetchConcepts();
    for (const concept of concepts) {
      if (/^6\.2\.(?:[1-9]|1[0-2])$/.test(concept.source_id || "")) {
        state.definitions.set(concept.source_id, concept);
      }
    }
  } catch (loadError) {
    error.hidden = false;
    error.textContent = `Definitions could not be loaded from data/concepts.json. ${loadError.message}`;
  }

  function resetToYear(year) {
    state.year = year;
    const checkpoint = state.example.balance_sheet[year];
    state.balance = pickBalance(checkpoint);
    state.periodBalances[year] = state.balance;
    state.changedKeys = new Set([
      "cash_and_equivalents", "accounts_receivable", "inventory", "ppe_net",
      "accounts_payable", "current_debt", "long_term_debt", "share_capital", "retained_earnings",
    ]);
    transactionMessage.hidden = true;
    updateView();
  }

  function selectYear(year) {
    state.year = year;
    state.tableView = year;
    state.balance = state.periodBalances[year];
    transactionMessage.hidden = true;
    updateView();
  }

  function executeTransaction(type) {
    const amount = whole(get("#bs-transaction-amount").value);
    const cost = whole(get("#bs-sale-cost").value);
    try {
      const updated = applyBalanceSheetTransaction(state.balance, { type, amount, cost }, { allowUnbalanced: true });
      state.balance = updated;
      state.periodBalances[state.year] = updated;
      state.changedKeys = new Set(CHANGED_KEYS[type] || []);
      transactionMessage.textContent = transactionDescription(type, amount, cost);
      transactionMessage.hidden = false;
      error.hidden = true;
      updateView();
    } catch (transactionError) {
      error.textContent = transactionError.message;
      error.hidden = false;
      transactionMessage.hidden = true;
    }
  }

  yearSelect.addEventListener("change", () => selectYear(yearSelect.value));
  liquidityInput.addEventListener("change", () => {
    state.showLiquidityOrder = liquidityInput.checked;
    updateView();
  });
  for (const button of root.querySelectorAll("[data-transaction]")) {
    button.addEventListener("click", () => executeTransaction(button.dataset.transaction));
  }
  get("[data-reset]").addEventListener("click", () => resetToYear(yearSelect.value));
  get("[data-fix-hint]").addEventListener("click", () => {
    const balance = state.balance;
    const difference = balance.total_assets - balance.total_liabilities_and_equity;
    if (difference === 0) {
      fixMessage.textContent = "The selected balance sheet is already balanced; no line change is needed.";
      return;
    }
    const assetKeys = ["cash_and_equivalents", "accounts_receivable", "inventory", "ppe_net"];
    const rhsKeys = ["accounts_payable", "current_debt", "long_term_debt", "share_capital", "retained_earnings"];
    const candidates = difference > 0
      ? [...rhsKeys.map(key => [key, balance[key] + difference]), ...assetKeys.map(key => [key, balance[key] - difference])]
      : [...assetKeys.map(key => [key, balance[key] - difference]), ...rhsKeys.map(key => [key, balance[key] + difference])];
    const [key, proposed] = candidates.find(([, value]) => value >= 0) || candidates[0];
    const labels = {
      cash_and_equivalents: "cash", accounts_receivable: "accounts receivable", inventory: "inventory",
      ppe_net: "PP&E (net)", accounts_payable: "accounts payable", current_debt: "current debt",
      long_term_debt: "long-term debt", share_capital: "share capital", retained_earnings: "retained earnings",
    };
    fixMessage.textContent = `One possible fix: change ${labels[key]} from ${displayAmount(balance[key])} to ${displayAmount(proposed)}. No value was changed.`;
  });

  root.addEventListener("focusin", event => {
    const target = event.target.closest("[data-definition-id]");
    if (target) showDefinition(target.dataset.definitionId);
    const block = event.target.closest(".bs-block");
    if (block) showDefinition(block.dataset.definitionId, block.getAttribute("aria-label"));
  });
  root.addEventListener("click", event => {
    const target = event.target.closest("[data-definition-id]");
    if (target) showDefinition(target.dataset.definitionId);
    const block = event.target.closest(".bs-block");
    if (block) showDefinition(block.dataset.definitionId, block.getAttribute("aria-label"));
  });
  svg.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".bs-block")) {
      event.preventDefault();
      event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });

  const initialHighlights = CONCEPT_HIGHLIGHTS[conceptId] || [];
  get(".bs-equation").classList.toggle("is-concept-match", initialHighlights.includes("equation"));
  state.periodBalances = {
    begin_y1: pickBalance(state.example.balance_sheet.begin_y1),
    end_y1: pickBalance(state.example.balance_sheet.end_y1),
    end_y2: pickBalance(state.example.balance_sheet.end_y2),
  };
  yearSelect.value = "begin_y1";
  resetToYear("begin_y1");
  if (state.definitions.has(conceptId)) showDefinition(conceptId);
}
