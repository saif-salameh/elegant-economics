import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = JSON.parse(await readFile(path.join(root, "content", "zayd_trading_example.json"), "utf8"));
const { computeIncomeStatement } = await import(pathToFileURL(path.join(root, "frontend", "js", "widgets", "fin_model.js")));

function calculate(year, overrides = {}) {
  const source = example.income_statement[year];
  return computeIncomeStatement({
    revenue: source.revenue,
    cogs: source.cogs,
    operating_expenses: source.operating_expenses,
    interest_expense: source.interest_expense,
    tax_rate: 0.25,
    depreciation_and_amortization_included_in_operating_expenses:
      example.cash_flow_statement[year].depreciation_and_amortization,
    shares_outstanding: example.shares_outstanding,
    ...overrides,
  });
}

const year1 = calculate("year_1");
const year2 = calculate("year_2");
assert.equal(year1.net_income, 105);
assert.equal(year1.earnings_per_share, 1.05);
assert.equal(year2.net_income, 172);
assert.equal(year2.earnings_per_share, 1.72);

const edited = calculate("year_2", { revenue: 1300 });
const dependentRows = [
  "gross_profit", "operating_income", "pre_tax_income", "income_taxes", "net_income", "earnings_per_share",
];
for (const key of dependentRows) assert.notEqual(edited[key], year2[key], `${key} must recalculate after revenue edit`);
const margin = (statement, key) => statement.revenue ? statement[key] / statement.revenue * 100 : 0;
assert.notEqual(margin(edited, "gross_profit"), margin(year2, "gross_profit"));
assert.notEqual(margin(edited, "operating_income"), margin(year2, "operating_income"));
assert.notEqual(margin(edited, "net_income"), margin(year2, "net_income"));

console.log("PASS  Year 1/Year 2 reproduce net income 105/172 and EPS 1.05/1.72");
console.log("PASS  Editing revenue recalculates gross, operating, pre-tax, tax, net income, EPS, and all margins");
