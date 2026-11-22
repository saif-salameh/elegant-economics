/*
 * Pure statement formulas:
 * gross profit = revenue - COGS
 * operating income = gross profit - operating expenses
 * pre-tax income = operating income - interest expense + other income/expense
 * tax = Math.round(pre-tax income * tax rate); net income = pre-tax income - tax
 * EPS = net income / shares outstanding
 * CFO = net income + D&A - increase in receivables - increase in inventory
 *       + increase in payables
 * CFI = signed asset-sale proceeds + signed other flows - capital expenditure
 * CFF = debt issued + shares issued - debt repaid - dividends - buybacks
 * net change in cash = CFO + CFI + CFF; ending cash = beginning cash + net change
 * Balance sheet totals: assets = current assets + PP&E; liabilities = current
 * liabilities + long-term debt; equity = share capital + retained earnings.
 * Year-end roll-forwards: cash = prior cash + net change; retained earnings =
 * prior retained earnings + net income - dividends; PP&E = prior PP&E + CapEx
 * - D&A; debt = prior debt - repayment. Cash-flow outflows are negative.
 * Paired balance-sheet transactions move equal amounts between assets,
 * liabilities, or equity; a sale on credit increases retained earnings by
 * sale proceeds less the carrying cost removed from inventory.
 * Direct CFO = cash from customers - cash to suppliers - cash operating costs
 *               - interest paid in operations - taxes paid; financing interest
 * is reclassified by adding it to CFO and subtracting it from CFF, with no
 * change in total net cash.
 */

const whole = value => Math.round(Number(value) || 0);
const positiveAmount = value => Math.abs(whole(value));

export function computeIncomeStatement(inputs = {}) {
  const revenue = whole(inputs.revenue);
  const cogs = whole(inputs.cogs);
  const operatingExpenses = whole(inputs.operating_expenses);
  const depreciation = whole(
    inputs.depreciation_and_amortization_included_in_operating_expenses
      ?? inputs.depreciation_and_amortization,
  );
  const interestExpense = whole(inputs.interest_expense);
  const otherIncomeOrExpense = whole(inputs.other_income_or_expense);
  const sharesOutstanding = whole(inputs.shares_outstanding);
  const grossProfit = whole(revenue - cogs);
  const operatingIncome = whole(grossProfit - operatingExpenses);
  const preTaxIncome = whole(operatingIncome - interestExpense + otherIncomeOrExpense);
  const taxRate = Number(inputs.tax_rate ?? inputs.income_tax_rate ?? 0);
  const incomeTaxes = Math.round(preTaxIncome * taxRate);
  const netIncome = whole(preTaxIncome - incomeTaxes);

  return {
    revenue,
    cogs,
    gross_profit: grossProfit,
    operating_expenses: operatingExpenses,
    depreciation_and_amortization_included_in_operating_expenses: depreciation,
    operating_income: operatingIncome,
    interest_expense: interestExpense,
    pre_tax_income: preTaxIncome,
    income_taxes: incomeTaxes,
    net_income: netIncome,
    earnings_per_share: sharesOutstanding
      ? Math.round((netIncome / sharesOutstanding) * 100) / 100
      : 0,
  };
}

export function computeBalanceSheetTotals(inputs = {}) {
  const balance = {
    cash_and_equivalents: whole(inputs.cash_and_equivalents),
    accounts_receivable: whole(inputs.accounts_receivable),
    inventory: whole(inputs.inventory),
    ppe_net: whole(inputs.ppe_net),
    accounts_payable: whole(inputs.accounts_payable),
    current_debt: whole(inputs.current_debt),
    long_term_debt: whole(inputs.long_term_debt),
    share_capital: whole(inputs.share_capital),
    retained_earnings: whole(inputs.retained_earnings),
  };
  balance.total_current_assets = whole(
    balance.cash_and_equivalents + balance.accounts_receivable + balance.inventory,
  );
  balance.total_assets = whole(balance.total_current_assets + balance.ppe_net);
  balance.total_current_liabilities = whole(balance.accounts_payable + balance.current_debt);
  balance.total_liabilities = whole(balance.total_current_liabilities + balance.long_term_debt);
  balance.total_equity = whole(balance.share_capital + balance.retained_earnings);
  balance.total_liabilities_and_equity = whole(balance.total_liabilities + balance.total_equity);
  balance.balanced = balance.total_assets === balance.total_liabilities_and_equity;
  return balance;
}

export function applyBalanceSheetTransaction(balanceSheet = {}, transaction = {}, options = {}) {
  const starting = computeBalanceSheetTotals(balanceSheet);
  if (!starting.balanced && !options.allowUnbalanced) {
    throw new Error("The starting balance sheet is not balanced.");
  }

  const next = { ...starting };
  const rawAmount = Number(transaction.amount);
  const rawCost = Number(transaction.cost ?? 0);
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    throw new RangeError("Enter a transaction amount greater than zero.");
  }
  if (!Number.isFinite(rawCost) || rawCost < 0) {
    throw new RangeError("Transaction cost cannot be negative.");
  }
  const amount = whole(rawAmount);
  const cost = whole(rawCost);
  if (!amount) throw new RangeError("Enter a transaction amount greater than zero.");

  switch (transaction.type) {
    case "borrow_cash":
      next.cash_and_equivalents += amount;
      next.long_term_debt += amount;
      break;
    case "buy_equipment_with_cash":
      if (amount > next.cash_and_equivalents) throw new RangeError("There is not enough cash for this equipment purchase.");
      next.cash_and_equivalents -= amount;
      next.ppe_net += amount;
      break;
    case "buy_inventory_on_credit":
      next.inventory += amount;
      next.accounts_payable += amount;
      break;
    case "sell_on_credit":
      if (cost > next.inventory) throw new RangeError("The sale cost cannot exceed current inventory.");
      next.accounts_receivable += amount;
      next.inventory -= cost;
      next.retained_earnings += amount - cost;
      break;
    case "collect_from_customers":
      if (amount > next.accounts_receivable) throw new RangeError("The collection cannot exceed accounts receivable.");
      next.cash_and_equivalents += amount;
      next.accounts_receivable -= amount;
      break;
    case "pay_dividend":
      if (amount > next.cash_and_equivalents || amount > next.retained_earnings) {
        throw new RangeError("The dividend cannot exceed cash or retained earnings.");
      }
      next.cash_and_equivalents -= amount;
      next.retained_earnings -= amount;
      break;
    case "issue_shares":
      next.cash_and_equivalents += amount;
      next.share_capital += amount;
      break;
    default:
      throw new TypeError(`Unknown balance-sheet transaction: ${transaction.type || "(missing type)"}`);
  }

  const result = computeBalanceSheetTotals(next);
  if (starting.balanced && !result.balanced) {
    throw new Error("Transaction rejected because it would unbalance the sheet.");
  }
  if (!starting.balanced && options.allowUnbalanced
    && result.total_assets - result.total_liabilities_and_equity
      !== starting.total_assets - starting.total_liabilities_and_equity) {
    throw new Error("Transaction rejected because it changed the existing imbalance.");
  }
  return result;
}

export function computeCashFlowStatement(inputs = {}) {
  const netIncome = whole(inputs.net_income);
  const depreciation = whole(inputs.depreciation_and_amortization);
  const receivablesChange = whole(inputs.accounts_receivable_change);
  const inventoryChange = whole(inputs.inventory_change);
  const payablesChange = whole(inputs.accounts_payable_change);
  const capex = positiveAmount(inputs.capital_expenditure);
  const debtRepaid = positiveAmount(inputs.debt_repaid);
  const dividendsPaid = positiveAmount(inputs.dividends_paid);
  const debtIssued = whole(inputs.debt_issued);
  const sharesIssued = whole(inputs.shares_issued);
  const shareRepurchases = positiveAmount(inputs.share_repurchases);
  const assetSaleProceeds = whole(inputs.asset_sale_proceeds);
  const otherInvestingFlows = whole(inputs.other_investing_flows);
  const otherFinancingFlows = whole(inputs.other_financing_flows);
  const beginningCash = whole(inputs.beginning_cash);

  const signedReceivablesChange = whole(-receivablesChange);
  const signedInventoryChange = whole(-inventoryChange);
  const signedPayablesChange = payablesChange;
  const cfo = whole(netIncome + depreciation + signedReceivablesChange
    + signedInventoryChange + signedPayablesChange);
  const signedCapex = -capex;
  const cfi = whole(assetSaleProceeds + otherInvestingFlows + signedCapex);
  const signedDebtRepayment = -debtRepaid;
  const signedDividends = -dividendsPaid;
  const signedRepurchases = -shareRepurchases;
  const cff = whole(debtIssued + sharesIssued + signedDebtRepayment
    + signedDividends + signedRepurchases + otherFinancingFlows);
  const netChange = whole(cfo + cfi + cff);

  return {
    net_income: netIncome,
    depreciation_and_amortization: depreciation,
    increase_in_accounts_receivable: signedReceivablesChange,
    increase_in_inventory: signedInventoryChange,
    increase_in_accounts_payable: signedPayablesChange,
    cash_flow_from_operating_activities: cfo,
    capital_expenditure: signedCapex,
    cash_flow_from_investing_activities: cfi,
    debt_repaid: signedDebtRepayment,
    debt_issued: debtIssued,
    dividends_paid: signedDividends,
    shares_issued: sharesIssued,
    share_repurchases: signedRepurchases,
    cash_flow_from_financing_activities: cff,
    net_change_in_cash: netChange,
    beginning_cash: beginningCash,
    ending_cash: whole(beginningCash + netChange),
    free_cash_flow: whole(cfo - capex),
  };
}

export function computeDirectOperatingCashFlow(inputs = {}) {
  const revenue = whole(inputs.revenue);
  const cogs = whole(inputs.cogs);
  const operatingExpenses = whole(inputs.operating_expenses);
  const depreciation = whole(inputs.depreciation_and_amortization);
  const interestPaid = positiveAmount(inputs.interest_paid ?? inputs.interest_expense);
  const incomeTaxesPaid = positiveAmount(inputs.income_taxes_paid ?? inputs.income_taxes);
  const receivablesChange = whole(inputs.accounts_receivable_change);
  const inventoryChange = whole(inputs.inventory_change);
  const payablesChange = whole(inputs.accounts_payable_change);
  const interestClassification = inputs.interest_classification === "financing"
    ? "financing"
    : "operating";

  const cashReceivedFromCustomers = whole(revenue - receivablesChange);
  const cashPaidToSuppliers = whole(-(cogs + inventoryChange - payablesChange));
  const cashPaidForOperatingExpenses = whole(-(operatingExpenses - depreciation));
  const signedInterestPaid = interestClassification === "operating" ? -interestPaid : 0;
  const signedIncomeTaxesPaid = -incomeTaxesPaid;
  const cfo = whole(cashReceivedFromCustomers + cashPaidToSuppliers
    + cashPaidForOperatingExpenses + signedInterestPaid + signedIncomeTaxesPaid);

  return {
    cash_received_from_customers: cashReceivedFromCustomers,
    cash_paid_to_suppliers: cashPaidToSuppliers,
    cash_paid_for_operating_expenses: cashPaidForOperatingExpenses,
    interest_paid_in_operating_activities: signedInterestPaid,
    income_taxes_paid: signedIncomeTaxesPaid,
    interest_paid_in_financing_activities: interestClassification === "financing" ? -interestPaid : 0,
    cash_flow_from_operating_activities: cfo,
  };
}

export function reclassifyInterestPaid(cashFlowStatement = {}, interestPaid = 0, classification = "operating") {
  const baseCfo = whole(cashFlowStatement.cash_flow_from_operating_activities);
  const baseCff = whole(cashFlowStatement.cash_flow_from_financing_activities);
  const interest = positiveAmount(interestPaid);
  const financing = classification === "financing";
  const cfo = whole(baseCfo + (financing ? interest : 0));
  const cff = whole(baseCff - (financing ? interest : 0));
  const cfi = whole(cashFlowStatement.cash_flow_from_investing_activities);
  const netChange = whole(cfo + cfi + cff);
  const capex = positiveAmount(cashFlowStatement.capital_expenditure);
  return {
    ...cashFlowStatement,
    cash_flow_from_operating_activities: cfo,
    cash_flow_from_financing_activities: cff,
    net_change_in_cash: netChange,
    ending_cash: whole(cashFlowStatement.beginning_cash + netChange),
    free_cash_flow: whole(cfo - capex),
  };
}

export function buildYear2(prevBalanceSheet = {}, inputs = {}) {
  const incomeInputs = inputs.income_statement ?? inputs.incomeStatement ?? inputs;
  const cashInputs = inputs.cash_flow ?? inputs.cashFlow ?? inputs;
  const incomeStatement = computeIncomeStatement({
    ...incomeInputs,
    shares_outstanding: incomeInputs.shares_outstanding ?? inputs.shares_outstanding,
  });
  const cashFlowStatement = computeCashFlowStatement({
    ...cashInputs,
    net_income: incomeStatement.net_income,
    depreciation_and_amortization:
      incomeStatement.depreciation_and_amortization_included_in_operating_expenses,
    beginning_cash: prevBalanceSheet.cash_and_equivalents,
  });

  const endingBalanceSheet = computeBalanceSheetTotals({
    cash_and_equivalents: cashFlowStatement.ending_cash,
    accounts_receivable: whole(prevBalanceSheet.accounts_receivable)
      + whole(cashInputs.accounts_receivable_change),
    inventory: whole(prevBalanceSheet.inventory) + whole(cashInputs.inventory_change),
    ppe_net: whole(prevBalanceSheet.ppe_net)
      + positiveAmount(cashInputs.capital_expenditure)
      - cashFlowStatement.depreciation_and_amortization,
    accounts_payable: whole(prevBalanceSheet.accounts_payable)
      + whole(cashInputs.accounts_payable_change),
    current_debt: whole(prevBalanceSheet.current_debt)
      + whole(cashInputs.current_debt_change),
    long_term_debt: whole(prevBalanceSheet.long_term_debt)
      + cashFlowStatement.debt_repaid,
    share_capital: whole(prevBalanceSheet.share_capital)
      + cashFlowStatement.shares_issued,
    retained_earnings: whole(prevBalanceSheet.retained_earnings)
      + incomeStatement.net_income
      + cashFlowStatement.dividends_paid,
  });

  return {
    income_statement: incomeStatement,
    cash_flow_statement: cashFlowStatement,
    balance_sheet: endingBalanceSheet,
    balanced: endingBalanceSheet.balanced,
  };
}

// Roll a sequence of period inputs forward from one opening balance sheet.
// Each period's statements use the prior period's calculated ending balance.
export function buildStatementSeries(openingBalanceSheet = {}, periodInputs = []) {
  let priorBalanceSheet = openingBalanceSheet;
  const results = [];
  for (const inputs of periodInputs) {
    const result = buildYear2(priorBalanceSheet, inputs);
    results.push(result);
    priorBalanceSheet = result.balance_sheet;
  }
  return results;
}
