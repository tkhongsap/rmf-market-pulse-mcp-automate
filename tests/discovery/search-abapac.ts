/**
 * Search for ABAPAC fund in SETSmart API
 */

import {
  fetchStockQuoteBySymbol,
  fetchStockQuoteBySecurityType,
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

async function searchABAPAC() {
  console.log(colors.bright + colors.yellow);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  Searching for ABAPAC Fund in SETSmart API                ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  // Try different symbol variations
  const symbolsToTry = [
    'ABAPAC-RMF',
    'ABAPAC',
    'ABAPACRMF',
    'ABAPAC-A',
    'ABAPAC-R',
    'ABERDEEN',
  ];

  console.log(`${colors.blue}Strategy 1: Trying different symbol variations...${colors.reset}\n`);

  for (const symbol of symbolsToTry) {
    try {
      console.log(`  Testing symbol: ${colors.cyan}${symbol}${colors.reset}...`);
      const quotes = await fetchStockQuoteBySymbol(symbol, dateStr, dateStr, 'N');
      if (quotes.length > 0) {
        console.log(`  ${colors.green}✓ Found data for ${symbol}!${colors.reset}`);
        console.log(`    Security Type: ${quotes[0].securityType}`);
        console.log(`    Latest NAV: ${quotes[0].close}`);
        console.log(`    Date: ${quotes[0].date}\n`);
        return { symbol, quote: quotes[0] };
      }
    } catch (error: any) {
      console.log(`  ${colors.yellow}✗ Not found${colors.reset}`);
    }
  }

  console.log(`\n${colors.blue}Strategy 2: Fetching ALL Unit Trusts and searching for 'ABAPAC'...${colors.reset}\n`);

  try {
    console.log(`  Fetching all UT (Unit Trust) data for ${dateStr}...`);
    const allUnitTrusts = await fetchStockQuoteBySecurityType('UT', dateStr, 'N');

    console.log(`  ${colors.green}✓ Retrieved ${allUnitTrusts.length} Unit Trusts${colors.reset}\n`);

    // Search for ABAPAC in the list
    const matchingFunds = allUnitTrusts.filter(fund =>
      fund.symbol.toUpperCase().includes('ABAPAC') ||
      fund.symbol.toUpperCase().includes('ABERDEEN')
    );

    if (matchingFunds.length > 0) {
      console.log(`${colors.green}✓ Found ${matchingFunds.length} matching fund(s):${colors.reset}\n`);

      matchingFunds.forEach((fund, index) => {
        console.log(`  ${index + 1}. Symbol: ${colors.bright}${fund.symbol}${colors.reset}`);
        console.log(`     Security Type: ${fund.securityType}`);
        console.log(`     NAV: ${fund.close}`);
        console.log(`     Prior NAV: ${fund.prior}`);
        console.log(`     Date: ${fund.date}`);
        console.log(`     Volume: ${fund.totalVolume || 'N/A'}`);
        console.log();
      });

      // Return the first match
      return { symbol: matchingFunds[0].symbol, quote: matchingFunds[0] };
    } else {
      console.log(`${colors.yellow}⚠️  No funds matching 'ABAPAC' or 'ABERDEEN' found${colors.reset}\n`);

      // Show first 10 Unit Trusts as examples
      console.log(`${colors.magenta}First 10 Unit Trust symbols as reference:${colors.reset}`);
      allUnitTrusts.slice(0, 10).forEach((fund, index) => {
        console.log(`  ${(index + 1).toString().padStart(2)}. ${fund.symbol}`);
      });
      console.log();
    }
  } catch (error: any) {
    console.error(`${colors.red}Error fetching Unit Trusts: ${error.message}${colors.reset}\n`);
  }

  console.log(`${colors.red}❌ Could not find ABAPAC fund in SETSmart API${colors.reset}\n`);
  console.log(`${colors.magenta}Possible reasons:${colors.reset}`);
  console.log(`  1. The fund might be delisted or inactive`);
  console.log(`  2. The fund might be using a completely different symbol`);
  console.log(`  3. RMF funds might require a different API endpoint`);
  console.log(`  4. The fund might be registered under the AMC name instead\n`);

  return null;
}

// Run the search
searchABAPAC().then(result => {
  if (result) {
    console.log(colors.green + colors.bright + `\n✅ Success! Use symbol: ${result.symbol}` + colors.reset);
  } else {
    console.log(colors.yellow + '\n⚠️  Fund not found in SETSmart API' + colors.reset);
  }
});
