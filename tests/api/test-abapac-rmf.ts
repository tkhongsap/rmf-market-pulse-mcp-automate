/**
 * Test script to fetch ABAPAC-RMF fund data from SETSmart API
 */

import {
  fetchStockQuoteBySymbol,
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
  return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1_000_000_000) {
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

async function fetchABAPACRMFData() {
  console.log(colors.bright + colors.yellow);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    ABAPAC-RMF Fund Data - SETSmart API                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  try {
    // Fetch last 10 trading days
    printSection('📊 ABAPAC-RMF NAV History (Last 10 Days)');

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 14); // Go back 14 days to get ~10 trading days

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`${colors.blue}Fetching ABAPAC-RMF data from ${startDateStr} to ${endDateStr}...${colors.reset}\n`);

    const quotes = await fetchStockQuoteBySymbol('ABAPAC-RMF', startDateStr, endDateStr, 'N');

    if (quotes.length === 0) {
      console.log(`${colors.yellow}⚠️  No trading data available for this period${colors.reset}`);
      console.log(`${colors.yellow}Note: ABAPAC-RMF might not be actively traded or may use a different symbol${colors.reset}\n`);

      // Try alternative symbol formats
      console.log(`${colors.blue}Trying alternative symbol: ABAPAC...${colors.reset}\n`);
      const altQuotes = await fetchStockQuoteBySymbol('ABAPAC', startDateStr, endDateStr, 'N');

      if (altQuotes.length === 0) {
        console.log(`${colors.yellow}⚠️  No data found for ABAPAC either${colors.reset}\n`);
        console.log(`${colors.magenta}Suggestions:${colors.reset}`);
        console.log(`  1. The fund might be delisted or inactive`);
        console.log(`  2. The symbol might be different (check SET website)`);
        console.log(`  3. RMF funds might not be available in the stock quote API`);
        console.log(`  4. Try searching for the fund's AMC code instead\n`);
        return;
      } else {
        displayFundData(altQuotes, 'ABAPAC');
      }
    } else {
      displayFundData(quotes, 'ABAPAC-RMF');
    }

  } catch (error: any) {
    console.error(colors.bright + '\x1b[31m' + '❌ Error fetching ABAPAC-RMF data:' + colors.reset, error.message);

    if (error.message.includes('404')) {
      console.log(`\n${colors.yellow}The fund symbol 'ABAPAC-RMF' was not found in the SETSmart API.${colors.reset}`);
      console.log(`${colors.magenta}This could mean:${colors.reset}`);
      console.log(`  • The fund uses a different symbol format`);
      console.log(`  • RMF funds might not be available in the stock quote endpoint`);
      console.log(`  • The fund might only be available through the Unit Trust (UT) security type\n`);
    }

    process.exit(1);
  }
}

function displayFundData(quotes: any[], symbol: string) {
  console.log(`${colors.green}✓ Found ${quotes.length} trading days for ${symbol}${colors.reset}\n`);

  // Display all quotes in a table format
  console.log(colors.bright + '┌────────────┬──────────┬──────────┬──────────┬──────────┬──────────────┬──────────────┐' + colors.reset);
  console.log(colors.bright + '│    Date    │   Prior  │   Open   │   High   │    Low   │   Close/NAV  │    Volume    │' + colors.reset);
  console.log(colors.bright + '├────────────┼──────────┼──────────┼──────────┼──────────┼──────────────┼──────────────┤' + colors.reset);

  quotes.forEach((quote) => {
    const navChange = quote.prior ? (quote.close || 0) - quote.prior : 0;
    const changeColor = navChange > 0 ? colors.green : navChange < 0 ? '\x1b[31m' : colors.reset;

    console.log(
      `│ ${quote.date} │ ` +
      `${formatNumber(quote.prior)?.padStart(8)} │ ` +
      `${formatNumber(quote.open)?.padStart(8)} │ ` +
      `${formatNumber(quote.high)?.padStart(8)} │ ` +
      `${formatNumber(quote.low)?.padStart(8)} │ ` +
      `${changeColor}${formatNumber(quote.close)?.padStart(12)}${colors.reset} │ ` +
      `${formatLargeNumber(quote.totalVolume)?.padStart(12)} │`
    );
  });

  console.log(colors.bright + '└────────────┴──────────┴──────────┴──────────┴──────────┴──────────────┴──────────────┘' + colors.reset);

  // Latest quote details
  const latest = quotes[quotes.length - 1];
  const navChange = latest.prior ? (latest.close || 0) - latest.prior : 0;
  const percentChange = latest.prior ? (navChange / latest.prior) * 100 : 0;
  const changeColor = navChange > 0 ? colors.green : navChange < 0 ? '\x1b[31m' : colors.reset;

  printSection(`📈 Latest Trading Day - ${latest.date} (${latest.symbol})`);

  console.log(colors.bright + 'NAV Information:' + colors.reset);
  console.log(`  Security Type:      ${latest.securityType}`);
  console.log(`  Current NAV:        ${colors.bright}${formatNumber(latest.close)} THB${colors.reset}`);
  console.log(`  NAV Change:         ${changeColor}${navChange >= 0 ? '+' : ''}${formatNumber(navChange)} THB (${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(2)}%)${colors.reset}`);
  console.log(`  Previous NAV:       ${formatNumber(latest.prior)} THB`);
  console.log(`  Day's Range:        ${formatNumber(latest.low)} - ${formatNumber(latest.high)} THB`);
  console.log(`  Opening NAV:        ${formatNumber(latest.open)} THB`);
  console.log(`  Average:            ${formatNumber(latest.average)} THB`);

  if (latest.bvps !== null) {
    console.log(`  Book Value/NAV:     ${formatNumber(latest.bvps)} THB`);
  }

  console.log('\n' + colors.bright + 'Trading Volume:' + colors.reset);
  console.log(`  Total Volume:       ${formatLargeNumber(latest.totalVolume)} units`);
  console.log(`  Total Value:        ${formatLargeNumber(latest.totalValue)} THB`);

  if (latest.aomVolume !== null) {
    console.log(`  AOM Volume:         ${formatLargeNumber(latest.aomVolume)} units`);
    console.log(`  AOM Value:          ${formatLargeNumber(latest.aomValue)} THB`);
  }

  if (latest.volumeTurnover !== null) {
    console.log(`  Volume Turnover:    ${formatNumber(latest.volumeTurnover)}%`);
  }

  console.log('\n' + colors.bright + 'Fund Metrics:' + colors.reset);

  if (latest.pbv !== null) {
    console.log(`  P/NAV Ratio:        ${formatNumber(latest.pbv)}`);
  }

  if (latest.dividendYield !== null) {
    console.log(`  Dividend Yield:     ${formatNumber(latest.dividendYield)}%`);
  }

  if (latest.marketCap !== null) {
    console.log(`  Market Cap:         ${formatLargeNumber(latest.marketCap)} THB`);
  }

  console.log('\n' + colors.green + colors.bright + '✅ ABAPAC-RMF data fetch complete!' + colors.reset + '\n');
}

// Run the script
fetchABAPACRMFData();
