import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = JSON.parse(
  await readFile(path.join(root, "content", "zayd_trading_example.json"), "utf8"),
);
const { buildYear2 } = await import(
  pathToFileURL(path.join(root, "frontend", "js", "widgets", "fin_model.js"))
);

function assertMatches(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(actual[key], value, `${label}.${key}`);
  }
}

function inputsForPeriod(periodKey, previousBalanceKey, endingBalanceKey) {
  const income = example.income_statement[periodKey];
  const previous = example.balance_sheet[previousBalanceKey];
  const ending = example.balance_sheet[endingBalanceKey];
  const depreciation = income.depreciation_and_amortization_included_in_operating_expenses;
  const taxRate = example.income_statement.year_1.income_taxes
    / example.income_statement.year_1.pre_tax_income;

  return {
    shares_outstanding: example.shares_outstanding,
    income_statement: {
      revenue: income.revenue,
      cogs: income.cogs,
      operating_expenses: income.operating_expenses,
      depreciation_and_amortization_included_in_operating_expenses: depreciation,
      interest_expense: income.interest_expense,
      tax_rate: taxRate,
      shares_outstanding: example.shares_outstanding,
    },
    cash_flow: {
      accounts_receivable_change: ending.accounts_receivable - previous.accounts_receivable,
      inventory_change: ending.inventory - previous.inventory,
      accounts_payable_change: ending.accounts_payable - previous.accounts_payable,
      capital_expenditure: ending.ppe_net - previous.ppe_net + depreciation,
      debt_repaid: previous.long_term_debt - ending.long_term_debt,
      dividends_paid: previous.retained_earnings + income.net_income - ending.retained_earnings,
    },
  };
}

const year1 = buildYear2(
  example.balance_sheet.begin_y1,
  inputsForPeriod("year_1", "begin_y1", "end_y1"),
);
const year2 = buildYear2(
  year1.balance_sheet,
  inputsForPeriod("year_2", "end_y1", "end_y2"),
);

assertMatches(year1.income_statement, example.income_statement.year_1, "year_1.income_statement");
assertMatches(year1.cash_flow_statement, example.cash_flow_statement.year_1, "year_1.cash_flow_statement");
assertMatches(year1.balance_sheet, example.balance_sheet.end_y1, "year_1.balance_sheet");
assertMatches(year2.income_statement, example.income_statement.year_2, "year_2.income_statement");
assertMatches(year2.cash_flow_statement, example.cash_flow_statement.year_2, "year_2.cash_flow_statement");
assertMatches(year2.balance_sheet, example.balance_sheet.end_y2, "year_2.balance_sheet");
assert.equal(year1.balanced, true, "Year 1 balance sheet should balance");
assert.equal(year2.balanced, true, "Year 2 balance sheet should balance");
assert.equal(year1.cash_flow_statement.cash_flow_from_operating_activities, 135);
assert.equal(year2.cash_flow_statement.cash_flow_from_operating_activities, 212);
assert.equal(year1.cash_flow_statement.net_change_in_cash, 30);
assert.equal(year2.cash_flow_statement.net_change_in_cash, 50);
assert.equal(year1.cash_flow_statement.ending_cash, 130);
assert.equal(year2.cash_flow_statement.ending_cash, 180);
assert.equal(year1.cash_flow_statement.free_cash_flow, 75);
assert.equal(year2.cash_flow_statement.free_cash_flow, 132);

console.log("PASS  Year 1 income statement, cash flow, and balance sheet match the example");
console.log("PASS  Year 2 income statement, cash flow, and balance sheet match the example");
console.log("PASS  Both balance sheets balance; Year 2 tax rounds 57.5 to 58");
