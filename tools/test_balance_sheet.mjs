import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = JSON.parse(
  await readFile(path.join(root, "content", "zayd_trading_example.json"), "utf8"),
);
const { applyBalanceSheetTransaction, computeBalanceSheetTotals } = await import(
  pathToFileURL(path.join(root, "frontend", "js", "widgets", "fin_model.js"))
);

const baselineKeys = [
  "cash_and_equivalents",
  "accounts_receivable",
  "inventory",
  "ppe_net",
  "accounts_payable",
  "current_debt",
  "long_term_debt",
  "share_capital",
  "retained_earnings",
];
const checkpoints = [
  example.balance_sheet.begin_y1,
  example.balance_sheet.end_y1,
  example.balance_sheet.end_y2,
].map(checkpoint => Object.fromEntries(baselineKeys.map(key => [key, checkpoint[key]])));

const transactions = [
  { type: "borrow_cash", amount: 10 },
  { type: "buy_equipment_with_cash", amount: 10 },
  { type: "buy_inventory_on_credit", amount: 10 },
  { type: "sell_on_credit", amount: 10, cost: 6 },
  { type: "collect_from_customers", amount: 10 },
  { type: "pay_dividend", amount: 10 },
  { type: "issue_shares", amount: 10 },
];

let checkedPairs = 0;
for (const baseline of checkpoints) {
  const starting = computeBalanceSheetTotals(baseline);
  assert.equal(starting.balanced, true, "example checkpoint should balance");
  for (const transaction of transactions) {
    const updated = applyBalanceSheetTransaction(starting, transaction);
    assert.equal(updated.balanced, true, `${transaction.type} should preserve balance`);
    assert.equal(updated.total_assets, updated.total_liabilities_and_equity);
    assert.deepEqual(starting, computeBalanceSheetTotals(baseline), "transaction must not mutate its input");
    checkedPairs += 1;
  }
}

const y1 = computeBalanceSheetTotals(checkpoints[0]);
assert.throws(
  () => applyBalanceSheetTransaction(y1, { type: "buy_equipment_with_cash", amount: y1.cash_and_equivalents + 1 }),
  /not enough cash/i,
);
assert.throws(
  () => applyBalanceSheetTransaction(y1, { type: "collect_from_customers", amount: y1.accounts_receivable + 1 }),
  /cannot exceed accounts receivable/i,
);
assert.throws(
  () => applyBalanceSheetTransaction(y1, { type: "borrow_cash", amount: -1 }),
  /greater than zero/i,
);

console.log(`PASS  All seven transactions preserve balance at all three example checkpoints (${checkedPairs} cases)`);
console.log("PASS  Invalid transactions are rejected before changing a balance sheet");
