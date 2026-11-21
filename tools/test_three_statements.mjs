import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = JSON.parse(await readFile(path.join(root, "content", "zayd_trading_example.json"), "utf8"));
const { buildYear2 } = await import(pathToFileURL(path.join(root, "frontend", "js", "widgets", "fin_model.js")));
const { calculateThreeStatementModel } = await import(pathToFileURL(path.join(root, "frontend", "js", "widgets", "three_statements.js")));
const previous = example.balance_sheet.end_y1;
const sampleIncome = example.income_statement.year_2;
const sampleCash = example.cash_flow_statement.year_2;

function calculate({ extraCreditSale = 0 } = {}) {
  const receivablesChange = Math.round(-sampleCash.increase_in_accounts_receivable) + extraCreditSale;
  return buildYear2(previous, {
    income_statement: {
      revenue: sampleIncome.revenue + extraCreditSale,
      cogs: sampleIncome.cogs,
      operating_expenses: sampleIncome.operating_expenses,
      depreciation_and_amortization_included_in_operating_expenses:
        sampleIncome.depreciation_and_amortization_included_in_operating_expenses,
      interest_expense: sampleIncome.interest_expense,
      tax_rate: 0.25,
      shares_outstanding: example.shares_outstanding,
    },
    cash_flow: {
      accounts_receivable_change: receivablesChange,
      inventory_change: -sampleCash.increase_in_inventory,
      accounts_payable_change: sampleCash.increase_in_accounts_payable,
      capital_expenditure: -sampleCash.capital_expenditure,
      debt_repaid: -sampleCash.debt_repaid,
      dividends_paid: -sampleCash.dividends_paid,
    },
  });
}

const result = calculate();
for (const [key, expected] of Object.entries(sampleIncome)) {
  assert.equal(result.income_statement[key], expected, `Year 2 income-statement ${key}`);
}
for (const [key, expected] of Object.entries(sampleCash)) {
  assert.equal(result.cash_flow_statement[key], expected, `Year 2 cash-flow ${key}`);
}
for (const [key, expected] of Object.entries(example.balance_sheet.end_y2)) {
  assert.equal(result.balance_sheet[key], expected, `Year 2 balance-sheet ${key}`);
}
assert.equal(result.balanced, true);

const whatIf = calculate({ extraCreditSale: 100 });
assert.ok(whatIf.income_statement.revenue > result.income_statement.revenue);
assert.ok(whatIf.income_statement.net_income > result.income_statement.net_income);
assert.ok(whatIf.cash_flow_statement.cash_flow_from_operating_activities
  < result.cash_flow_statement.cash_flow_from_operating_activities);

console.log("PASS  Three statements reproduce all checked Year 2 example values and balance");
console.log("PASS  Adding 100 units of credit sales raises revenue and net income while reducing CFO");

const shared = calculateThreeStatementModel(example);
for (const [year, sourceKey] of [["year_1", "year_1"], ["year_2", "year_2"]]) {
  const modeled = shared.results[year];
  for (const [key, expected] of Object.entries(example.income_statement[sourceKey])) {
    assert.equal(modeled.income_statement[key], expected, `${year} income ${key}`);
  }
  for (const [key, expected] of Object.entries(example.cash_flow_statement[sourceKey])) {
    assert.equal(modeled.cash_flow_statement[key], expected, `${year} cash flow ${key}`);
  }
  assert.equal(modeled.balance_sheet.balanced, true, `${year} balance`);
}
const revenueEdit = calculateThreeStatementModel(example, { year_2: { revenue: sampleIncome.revenue + 100 } });
assert.equal(revenueEdit.results.year_2.income_statement.revenue, sampleIncome.revenue + 100);
assert.equal(revenueEdit.results.year_2.balance_sheet.balanced, true, "Year 2 revenue edit remains balanced");
assert.equal(revenueEdit.results.year_2.balance_sheet.cash_and_equivalents,
  revenueEdit.results.year_2.cash_flow_statement.ending_cash, "Year 2 ending cash link after revenue edit");
assert.equal(revenueEdit.results.year_2.balance_sheet.retained_earnings,
  revenueEdit.results.year_1.balance_sheet.retained_earnings
    + revenueEdit.results.year_2.income_statement.net_income
    - revenueEdit.state.year_2.dividends, "Year 2 net income to retained earnings link after revenue edit");
console.log("PASS  Shared Year 1 and Year 2 inputs reproduce the example; editing Year 2 revenue keeps all statements balanced");
