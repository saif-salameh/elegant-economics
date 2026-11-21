# Financial statements: widget-ready data

*Prepared for the planned income statement, balance sheet and cash flow statement widgets. Line items and identities come from the Perplexity research (sources 6.1 to 6.5 in the library). The worked example was recomputed and corrected by the editor on 20 Nov 2026; every number below is generated from one set of inputs and all checks pass. The company is fictional. All figures are **illustrative, not real**, and this is not investment advice.*

**Corrections made to the research assistant's draft:** (1) Year 2 operating cash flow is 212, not 202; (2) so Year 2 net change in cash is 50 (not 40) and free cash flow is 132 (not 122); the draft's own check '130 + 40 = 180' did not add up; (3) Year 1 depreciation and amortization on the income statement is 60 (the draft said 50 but used 60 in the cash flow statement and PP&E); (4) the draft's JSON contained expressions such as `770 == 300 + 470`, which are not valid JSON, so the checks are now true/false values.

## Income statement

### Line items

| Line item | Section | What it represents | Formula or sign convention |
|---|---|---|---|
| Revenue | Top | Income from goods sold or services provided | Input; also called sales |
| Cost of goods sold | Direct costs | Direct costs of goods sold or services delivered | Input; subtracted from revenue |
| Gross profit | Subtotal | Profit after direct costs | Revenue - COGS |
| Operating expenses | Operating costs | Indirect costs of running the business | Input; includes SG&A and may include D&A |
| Depreciation and amortization | Operating cost | Allocation of long-lived asset cost over time | Input or schedule-driven; non-cash expense |
| Operating income | Subtotal | Profit from regular operations (EBIT) | Gross profit - Operating expenses |
| Interest expense | Non-operating | Cost of borrowing | Input; subtracted |
| Other income or expense | Non-operating | Items outside core operations | Input; sign depends on income or expense |
| Pre-tax income | Subtotal | Income before income taxes | Operating income - Interest expense + Other income/expense |
| Income taxes | Tax | Taxes on pre-tax income | Input or effective-tax-rate calculation |
| Net income | Bottom line | Final profit or loss for the period | Pre-tax income - Income taxes |
| Earnings per share | Per-share measure | Net income per weighted average share | Net income / Weighted average shares outstanding |

### Identities and checks

- Gross profit = Revenue - COGS.
- Operating income = Gross profit - Operating expenses.
- Pre-tax income = Operating income - Interest expense + Other income/expense.
- Net income = Pre-tax income - Income taxes.
- EPS = Net income / Weighted average shares outstanding.
- A multi-step statement shows gross profit and operating income; a single-step statement need not.

## Balance sheet

### Line items

| Line item | Section | What it represents | Formula or sign convention |
|---|---|---|---|
| Cash and equivalents | Current assets | Cash on hand and highly liquid short-term investments | Input; must equal ending cash on the cash flow statement |
| Accounts receivable | Current assets | Credit sales not yet collected | Input; an increase generally reduces operating cash flow |
| Inventory | Current assets | Raw materials, work in progress and finished goods | Input; an increase generally reduces operating cash flow |
| Total current assets | Current assets | Short-term resources | Sum of current asset lines |
| Property, plant and equipment, net | Non-current assets | Tangible long-lived assets after accumulated depreciation | Prior net PP&E + CapEx - Depreciation - Disposals |
| Intangible assets | Non-current assets | Identifiable and unidentifiable non-physical assets | Input; may include goodwill |
| Total assets | Assets | All resources controlled by the company | Current assets + Non-current assets |
| Accounts payable | Current liabilities | Amounts owed to suppliers | Input; an increase generally increases operating cash flow |
| Current debt | Current liabilities | Borrowings due within one year | Input |
| Current portion of long-term debt | Current liabilities | Long-term debt due within the coming year | Input or debt-schedule output |
| Total current liabilities | Current liabilities | Short-term obligations | Sum of current liability lines |
| Long-term debt | Non-current liabilities | Borrowings due after one year | Prior balance + New borrowing - Repayment |
| Total liabilities | Liabilities | All obligations owed | Current liabilities + Non-current liabilities |
| Share capital | Equity | Funds invested by shareholders | Input; increases with share issuance |
| Retained earnings | Equity | Cumulative profit kept in the business | Prior retained earnings + Net income - Dividends |
| Total equity | Equity | Owners' residual interest | Share capital + Retained earnings + Other equity |
| Total liabilities and equity | Liabilities and equity | Claims against assets | Total liabilities + Total equity |

### Identities and checks

- Assets = Liabilities + Equity.
- Total assets = Total current assets + Total non-current assets.
- Total liabilities = Total current liabilities + Total non-current liabilities.
- Total equity = Share capital + Retained earnings + Other equity.
- Retained earnings = Prior retained earnings + Net income - Dividends.
- Current ratio = Current assets / Current liabilities.
- Debt-to-equity = Total debt / Total equity.
- Balance-sheet cash must equal cash flow statement ending cash.

## Cash flow statement

### Line items

| Line item | Section | What it represents | Formula or sign convention |
|---|---|---|---|
| Net income | Operating activities | Accounting profit for the period | Input from the income statement |
| Depreciation and amortization | Operating adjustment | Non-cash allocation of asset cost | Add back |
| Change in accounts receivable | Operating adjustment | Change in uncollected credit sales | Increase: subtract; decrease: add |
| Change in inventory | Operating adjustment | Change in goods held | Increase: subtract; decrease: add |
| Change in accounts payable | Operating adjustment | Change in unpaid supplier bills | Increase: add; decrease: subtract |
| Cash flow from operating activities | Operating subtotal | Cash generated or used by core operations | Net income + D&A + Working-capital adjustments |
| Capital expenditure | Investing activities | Cash spent on property, plant and equipment | Negative cash outflow |
| Proceeds from asset sales | Investing activities | Cash received from selling long-term assets | Positive cash inflow |
| Cash flow from investing activities | Investing subtotal | Cash used for or received from long-term assets and investments | Sum of investing lines |
| Debt issued | Financing activities | Cash received from new borrowing | Positive cash inflow |
| Debt repaid | Financing activities | Cash used to repay borrowing | Negative cash outflow |
| Shares issued | Financing activities | Cash received from issuing equity | Positive cash inflow |
| Share repurchases | Financing activities | Cash used to buy back shares | Negative cash outflow |
| Dividends paid | Financing activities | Cash distributed to shareholders | Negative cash outflow (IFRS also permits operating) |
| Cash flow from financing activities | Financing subtotal | Cash from capital-structure changes | Sum of financing lines |
| Net change in cash | Total | Overall cash movement | CFO + CFI + CFF |
| Beginning cash | Cash reconciliation | Cash at the start of the period | Prior-period ending cash |
| Ending cash | Cash reconciliation | Cash at the end of the period | Beginning cash + Net change in cash |

### Identities and checks

- CFO = Net income + D&A + Working-capital adjustments.
- CFI = Proceeds from asset sales - Capital expenditure + Other investing flows.
- CFF = Debt issued - Debt repaid + Shares issued - Share repurchases - Dividends paid.
- Net change in cash = CFO + CFI + CFF.
- Ending cash = Beginning cash + CFO + CFI + CFF, and must equal balance-sheet cash.
- Free cash flow = CFO - Capital expenditure (an analytical measure, not a required line item).
- Classification of interest and dividends differs: IFRS lets companies choose where to show interest and dividends received (operating or investing) and paid (operating or financing); U.S. GAAP is more restrictive. Confirm against the current IAS 7 and the relevant GAAP before building a toggle.

## Illustrative company: Zayd Trading Co.

All figures are illustrative, not real. Currency units are generic. The company has 100 shares in both years. Assumptions: all depreciation is inside operating expenses, no asset disposals, no share issues or buybacks, no tax timing differences.

### Income statement

| Line item | Year 1 | Year 2 |
|---|---:|---:|
| Revenue | 1,000 | 1,200 |
| Cost of goods sold | 600 | 660 |
| Gross profit | 400 | 540 |
| Operating expenses (includes D&A) | 250 | 300 |
| Depreciation and amortization, included above | 60 | 60 |
| Operating income | 150 | 240 |
| Interest expense | 10 | 10 |
| Pre-tax income | 140 | 230 |
| Income taxes | 35 | 58 |
| Net income | 105 | 172 |
| Earnings per share | 1.05 | 1.72 |

### Balance sheet

| Line item | Beginning of Year 1 | End of Year 1 | End of Year 2 |
|---|---:|---:|---:|
| Cash and equivalents | 100 | 130 | 180 |
| Accounts receivable | 80 | 100 | 120 |
| Inventory | 120 | 140 | 150 |
| Total current assets | 300 | 370 | 450 |
| PP&E, net | 400 | 400 | 420 |
| Total assets | 700 | 770 | 870 |
| Accounts payable | 70 | 80 | 90 |
| Current debt | 30 | 30 | 30 |
| Total current liabilities | 100 | 110 | 120 |
| Long-term debt | 200 | 190 | 180 |
| Total liabilities | 300 | 300 | 300 |
| Share capital | 250 | 250 | 250 |
| Retained earnings | 150 | 220 | 320 |
| Total equity | 400 | 470 | 570 |
| Total liabilities and equity | 700 | 770 | 870 |

### Cash flow statement

| Line item | Year 1 | Year 2 |
|---|---:|---:|
| Net income | 105 | 172 |
| Depreciation and amortization | 60 | 60 |
| Change in accounts receivable | (20) | (20) |
| Change in inventory | (20) | (10) |
| Change in accounts payable | 10 | 10 |
| Cash flow from operating activities | 135 | 212 |
| Capital expenditure | (60) | (80) |
| Cash flow from investing activities | (60) | (80) |
| Debt repaid | (10) | (10) |
| Dividends paid | (35) | (72) |
| Cash flow from financing activities | (45) | (82) |
| Net change in cash | 30 | 50 |
| Beginning cash | 100 | 130 |
| Ending cash | 130 | 180 |
| Free cash flow (CFO - CapEx) | 75 | 132 |

### How the checks work (all pass)

- Year 1: 1,000 - 600 = 400; 400 - 250 = 150; 150 - 10 = 140; 140 - 35 = 105 net income.
- Year 2: 1,200 - 660 = 540; 540 - 300 = 240; 240 - 10 = 230; 230 - 58 = 172 net income.
- Balance sheets balance: 700 = 300 + 400; 770 = 300 + 470; 870 = 300 + 570.
- Retained earnings: 150 + 105 - 35 = 220; 220 + 172 - 72 = 320.
- PP&E: 400 + 60 - 60 = 400; 400 + 80 - 60 = 420.
- Year 1 cash: CFO 105 + 60 - 20 - 20 + 10 = 135; 135 - 60 - 45 = 30; 100 + 30 = 130.
- Year 2 cash: CFO 172 + 60 - 20 - 10 + 10 = 212; 212 - 80 - 82 = 50; 130 + 50 = 180, matching the balance sheet.
- The full set of true/false checks is in zayd_trading_example.json under reconciliation_checks.
