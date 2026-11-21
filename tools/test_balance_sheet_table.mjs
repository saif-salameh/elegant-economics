import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = JSON.parse(await readFile(path.join(root, "content", "zayd_trading_example.json"), "utf8"));
const { applyBalanceSheetTransaction, computeBalanceSheetTotals } = await import(
  pathToFileURL(path.join(root, "frontend", "js", "widgets", "fin_model.js"))
);

const periods = ["begin_y1", "end_y1", "end_y2"];
for (const period of periods) {
  const actual = computeBalanceSheetTotals(example.balance_sheet[period]);
  const expected = example.balance_sheet[period];
  for (const key of [
    "cash_and_equivalents", "accounts_receivable", "inventory", "total_current_assets", "ppe_net",
    "total_assets", "accounts_payable", "current_debt", "total_current_liabilities", "long_term_debt",
    "total_liabilities", "share_capital", "retained_earnings", "total_equity",
    "total_liabilities_and_equity",
  ]) assert.equal(actual[key], expected[key], `${period}.${key}`);
  assert.equal(actual.total_assets - actual.total_liabilities_and_equity, 0, `${period} check row`);
}

const starting = computeBalanceSheetTotals(example.balance_sheet.begin_y1);
const transactions = [
  ["borrow_cash", 10, 0],
  ["buy_equipment_with_cash", 10, 0],
  ["buy_inventory_on_credit", 10, 0],
  ["sell_on_credit", 10, 6],
  ["collect_from_customers", 10, 0],
  ["pay_dividend", 10, 0],
  ["issue_shares", 10, 0],
];
for (const [type, amount, cost] of transactions) {
  const result = applyBalanceSheetTransaction(starting, { type, amount, cost }, { allowUnbalanced: true });
  assert.equal(result.total_assets - result.total_liabilities_and_equity, 0, `${type} check row`);
}

const intentionallyUnbalanced = computeBalanceSheetTotals({ ...starting, cash_and_equivalents: starting.cash_and_equivalents + 5 });
const afterTransaction = applyBalanceSheetTransaction(
  intentionallyUnbalanced,
  { type: "borrow_cash", amount: 10 },
  { allowUnbalanced: true },
);
assert.equal(afterTransaction.total_assets - afterTransaction.total_liabilities_and_equity, 5,
  "a paired transaction preserves the user's existing imbalance");

console.log("PASS  Beginning Year 1, End Year 1, and End Year 2 match the example and each check is zero");
console.log("PASS  All seven transaction types keep a balanced sheet at zero");
console.log("PASS  Transactions preserve, rather than block, an existing user-created imbalance");
