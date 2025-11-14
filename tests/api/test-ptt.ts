/**
 * Quick test to fetch PTT stock data from SETSmart API
 */

import {
  fetchStockQuoteBySymbol,
  fetchFinancialDataBySymbol,
} from './server/services/setsmartApi';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1_000_000_000_000) {
    return `${(num / 1_000_000_000_000).toFixed(2)} Trillion`;
  } else if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)} Billion`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)} Million`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)} Thousand`;
  }
  return num.toFixed(2);
}

function printSection(title: string) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + title.toUpperCase() + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
}

async function fetchPTTData() {
  console.log(colors.bright + colors.yellow);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         PTT Stock Data - SETSmart API                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  try {
    // Fetch last 10 trading days
    printSection('📊 PTT Stock Price History (Last 10 Days)');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // Go back 14 days to get ~10 trading days

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`${colors.blue}Fetching data from ${startDateStr} to ${endDateStr}...${colors.reset}\n`);

    const quotes = await fetchStockQuoteBySymbol('PTT', startDateStr, endDateStr, 'Y');

    if (quotes.length === 0) {
      console.log(`${colors.yellow}⚠️  No trading data available for this period${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✓ Found ${quotes.length} trading days${colors.reset}\n`);

    // Display all quotes in a table format
    console.log(colors.bright + '┌────────────┬─────────┬─────────┬─────────┬─────────┬──────────────┬──────────────┐' + colors.reset);
    console.log(colors.bright + '│    Date    │  Open   │  High   │   Low   │  Close  │    Volume    │     Value    │' + colors.reset);
    console.log(colors.bright + '├────────────┼─────────┼─────────┼─────────┼─────────┼──────────────┼──────────────┤' + colors.reset);

    quotes.forEach((quote) => {
      const priceChange = quote.prior ? (quote.close || 0) - quote.prior : 0;
      const changeColor = priceChange > 0 ? colors.green : priceChange < 0 ? '\x1b[31m' : colors.reset;

      console.log(
        `│ ${quote.date} │ ` +
        `${formatNumber(quote.open)?.padStart(7)} │ ` +
        `${formatNumber(quote.high)?.padStart(7)} │ ` +
        `${formatNumber(quote.low)?.padStart(7)} │ ` +
        `${changeColor}${formatNumber(quote.close)?.padStart(7)}${colors.reset} │ ` +
        `${formatLargeNumber(quote.totalVolume)?.padStart(12)} │ ` +
        `${formatLargeNumber(quote.totalValue)?.padStart(12)} │`
      );
    });

    console.log(colors.bright + '└────────────┴─────────┴─────────┴─────────┴─────────┴──────────────┴──────────────┘' + colors.reset);

    // Latest quote details
    const latest = quotes[quotes.length - 1];
    const priceChange = latest.prior ? (latest.close || 0) - latest.prior : 0;
    const percentChange = latest.prior ? (priceChange / latest.prior) * 100 : 0;
    const changeColor = priceChange > 0 ? colors.green : priceChange < 0 ? '\x1b[31m' : colors.reset;

    printSection('📈 Latest Trading Day - ' + latest.date);

    console.log(colors.bright + 'Price Information:' + colors.reset);
    console.log(`  Current Price:      ${colors.bright}${formatNumber(latest.close)} THB${colors.reset}`);
    console.log(`  Price Change:       ${changeColor}${priceChange >= 0 ? '+' : ''}${formatNumber(priceChange)} THB (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)${colors.reset}`);
    console.log(`  Previous Close:     ${formatNumber(latest.prior)} THB`);
    console.log(`  Day's Range:        ${formatNumber(latest.low)} - ${formatNumber(latest.high)} THB`);
    console.log(`  Opening Price:      ${formatNumber(latest.open)} THB`);
    console.log(`  Average Price:      ${formatNumber(latest.average)} THB`);

    console.log('\n' + colors.bright + 'Trading Volume:' + colors.reset);
    console.log(`  Total Volume:       ${formatLargeNumber(latest.totalVolume)} shares`);
    console.log(`  Total Value:        ${formatLargeNumber(latest.totalValue)} THB`);
    console.log(`  AOM Volume:         ${formatLargeNumber(latest.aomVolume)} shares`);
    console.log(`  AOM Value:          ${formatLargeNumber(latest.aomValue)} THB`);
    console.log(`  Volume Turnover:    ${formatNumber(latest.volumeTurnover)}%`);

    console.log('\n' + colors.bright + 'Valuation Metrics:' + colors.reset);
    console.log(`  Market Cap:         ${formatLargeNumber(latest.marketCap)} THB`);
    console.log(`  P/E Ratio:          ${formatNumber(latest.pe)}`);
    console.log(`  P/BV Ratio:         ${formatNumber(latest.pbv)}`);
    console.log(`  Book Value/Share:   ${formatNumber(latest.bvps)} THB`);
    console.log(`  Dividend Yield:     ${formatNumber(latest.dividendYield)}%`);

    // Fetch financial data
    printSection('💰 Financial Data (Latest Quarter)');

    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    console.log(`${colors.blue}Fetching Q4 ${lastYear} financial data...${colors.reset}\n`);

    const financialData = await fetchFinancialDataBySymbol('PTT', lastYear.toString(), 4);

    if (financialData.length > 0) {
      const latest = financialData[financialData.length - 1];

      console.log(colors.bright + 'Company Overview:' + colors.reset);
      console.log(`  Symbol:             ${latest.symbol}`);
      console.log(`  Period:             ${latest.year} Q${latest.quarter} (${latest.accountPeriod === 'F' ? 'Fiscal' : 'Calendar'} Year)`);
      console.log(`  Report Date:        ${latest.dateAsof}`);
      console.log(`  Statement Type:     ${latest.financialStatementType === 'C' ? 'Consolidated' : 'Separate'}`);

      console.log('\n' + colors.bright + 'Balance Sheet (in Billion THB):' + colors.reset);
      console.log(`  Total Assets:       ${formatLargeNumber((latest.totalAssets || 0) * 1000)} THB`);
      console.log(`  Total Liabilities:  ${formatLargeNumber((latest.totalLiabilities || 0) * 1000)} THB`);
      console.log(`  Shareholder Equity: ${formatLargeNumber((latest.shareholderEquity || 0) * 1000)} THB`);
      console.log(`  Total Equity:       ${formatLargeNumber((latest.totalEquity || 0) * 1000)} THB`);
      console.log(`  Paid-up Capital:    ${formatLargeNumber((latest.paidupShareCapital || 0) * 1000)} THB`);

      console.log('\n' + colors.bright + 'Income Statement (in Billion THB):' + colors.reset);
      console.log(`  Revenue (Quarter):  ${formatLargeNumber((latest.totalRevenueQuarter || 0) * 1000)} THB`);
      console.log(`  Revenue (YTD):      ${formatLargeNumber((latest.totalRevenueAccum || 0) * 1000)} THB`);
      console.log(`  EBIT (Quarter):     ${formatLargeNumber((latest.ebitQuarter || 0) * 1000)} THB`);
      console.log(`  EBIT (YTD):         ${formatLargeNumber((latest.ebitAccum || 0) * 1000)} THB`);
      console.log(`  Net Profit (Quarter): ${formatLargeNumber((latest.netProfitQuarter || 0) * 1000)} THB`);
      console.log(`  Net Profit (YTD):   ${formatLargeNumber((latest.netProfitAccum || 0) * 1000)} THB`);

      console.log('\n' + colors.bright + 'Per Share Metrics:' + colors.reset);
      console.log(`  EPS (Quarter):      ${formatNumber(latest.epsQuarter)} THB`);
      console.log(`  EPS (YTD):          ${formatNumber(latest.epsAccum)} THB`);

      console.log('\n' + colors.bright + 'Financial Ratios:' + colors.reset);
      console.log(`  Return on Equity:   ${formatNumber(latest.roe)}%`);
      console.log(`  Return on Assets:   ${formatNumber(latest.roa)}%`);
      console.log(`  Debt to Equity:     ${formatNumber(latest.de)}`);
      console.log(`  Fixed Asset TO:     ${formatNumber(latest.fixedAssetTurnover)}`);
      console.log(`  Total Asset TO:     ${formatNumber(latest.totalAssetTurnover)}`);
    } else {
      console.log(`${colors.yellow}⚠️  No financial data available for this period${colors.reset}`);
    }

    console.log('\n' + colors.green + colors.bright + '✅ PTT data fetch complete!' + colors.reset + '\n');

  } catch (error: any) {
    console.error(colors.bright + '\x1b[31m' + '❌ Error fetching PTT data:' + colors.reset, error.message);
    process.exit(1);
  }
}

// Run the script
fetchPTTData();
