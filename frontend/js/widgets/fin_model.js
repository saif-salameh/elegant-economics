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
