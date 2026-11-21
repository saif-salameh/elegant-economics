import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const example = JSON.parse(
  await readFile(path.join(root, "content", "zayd_trading_example.json"), "utf8"),
);
const {
  computeCashFlowStatement,
  computeDirectOperatingCashFlow,
  reclassifyInterestPaid,
} = await import(pathToFileURL(path.join(root, "frontend", "js", "widgets", "fin_model.js")));

for (const year of ["year_1", "year_2"]) {
  const data = example.cash_flow_statement[year];
  const income = example.income_statement[year];
  const inputs = {
    net_income: data.net_income,
    depreciation_and_amortization: data.depreciation_and_amortization,
    accounts_receivable_change: -data.increase_in_accounts_receivable,
    inventory_change: -data.increase_in_inventory,
    accounts_payable_change: data.increase_in_accounts_payable,
    capital_expenditure: -data.capital_expenditure,
    debt_repaid: -data.debt_repaid,
    dividends_paid: -data.dividends_paid,
    beginning_cash: data.beginning_cash,
  };
  const indirectBase = computeCashFlowStatement(inputs);
  const directInputs = {
    revenue: income.revenue,
    cogs: income.cogs,
    operating_expenses: income.operating_expenses,
    depreciation_and_amortization: data.depreciation_and_amortization,
    interest_expense: income.interest_expense,
    income_taxes: income.income_taxes,
    accounts_receivable_change: inputs.accounts_receivable_change,
    inventory_change: inputs.inventory_change,
    accounts_payable_change: inputs.accounts_payable_change,
  };

  for (const classification of ["operating", "financing"]) {
    const indirect = reclassifyInterestPaid(indirectBase, income.interest_expense, classification);
    const direct = computeDirectOperatingCashFlow({
      ...directInputs,
      interest_classification: classification,
    });
    assert.equal(
      direct.cash_flow_from_operating_activities,
      indirect.cash_flow_from_operating_activities,
      `${year} ${classification} direct and indirect CFO must match`,
    );
    assert.equal(indirect.net_change_in_cash, data.net_change_in_cash);
    assert.equal(indirect.ending_cash, data.ending_cash);
    if (classification === "operating") {
      assert.equal(direct.cash_flow_from_operating_activities, data.cash_flow_from_operating_activities);
      assert.equal(indirect.cash_flow_from_financing_activities, data.cash_flow_from_financing_activities);
    }
  }
}

assert.equal(
  reclassifyInterestPaid(example.cash_flow_statement.year_1, 10, "financing").net_change_in_cash,
  example.cash_flow_statement.year_1.net_change_in_cash,
);

console.log("PASS  Direct and indirect CFO match for Year 1 (135) and Year 2 (212)");
console.log("PASS  Financing-classified interest changes CFO/CFF only; net change and ending cash are unchanged");
