/**
 * Test ABAPAC-RMF fund using SEC Fund Daily Info API
 *
 * This script tests fetching ABAPAC-RMF data from the official
 * Thailand SEC API (not SETSmart API)
 */

import {
  fetchFundDailyNav,
  fetchFundNavHistory,
  fetchFundDividend,
  testApiConnection,
  clearCache,
  type FundDailyNav,
} from '../../server/services/secFundDailyInfoApi';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

function formatNumber(num: number | null | undefined, decimals: number = 4): string {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function printSection(title: string) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + title.toUpperCase() + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
}

async function testABAPACRMF() {
  console.log(colors.bright + colors.yellow);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║              ABAPAC-RMF Fund Data - SEC Fund Daily Info API               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Clear cache for fresh test
  clearCache();

  try {
    // Test 1: API Connection
    printSection('🔌 Test 1: API Connection & Authentication');

    const apiKey = process.env.SEC_FUND_DAILY_INFO_KEY;
    if (!apiKey) {
      console.log(`${colors.red}✗ SEC_FUND_DAILY_INFO_KEY not found in environment${colors.reset}`);
      return;
    }

    console.log(`${colors.blue}API Key: ${apiKey.substring(0, 8)}...${colors.reset}`);

    const isConnected = await testApiConnection();
    if (!isConnected) {
      console.log(`${colors.red}✗ API connection failed${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✓ API connection successful${colors.reset}`);

    // Test 2: Fetch Latest NAV
    printSection('📊 Test 2: Fetch Latest NAV for ABAPAC-RMF');

    const today = new Date();
    const fundId = 'M0774_2554'; // ABAPAC-RMF project ID from Fund Factsheet API

    // Try to find the most recent NAV data (go back up to 10 days)
    let latestNav: FundDailyNav | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    console.log(`${colors.blue}Searching for latest NAV data (checking last 10 days)...${colors.reset}\n`);

    while (!latestNav && attempts < maxAttempts) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - attempts);

      // Skip weekends
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        attempts++;
        continue;
      }

      const dateStr = targetDate.toISOString().split('T')[0];
      console.log(`  Trying ${dateStr}...`);

      try {
        latestNav = await fetchFundDailyNav(fundId, dateStr);
        if (latestNav) {
          console.log(`  ${colors.green}✓ Found data!${colors.reset}\n`);
          break;
        }
      } catch (error) {
        // Continue to next date
      }

      attempts++;
    }

    if (!latestNav) {
      console.log(`${colors.red}✗ No NAV data found in the last 10 days${colors.reset}`);
      console.log(`${colors.yellow}The fund might be inactive or delisted${colors.reset}`);
      return;
    }

    // Display latest NAV data
    console.log(colors.bright + 'Fund Information:' + colors.reset);
    console.log(`  Project ID:         ${fundId}`);
    console.log(`  Fund Name:          ABAPAC-RMF (abrdn Asia Pacific Equity Retirement Mutual Fund)`);
    console.log(`  AMC ID:             ${latestNav.unique_id}`);
    console.log(`  Fund Class:         ${latestNav.class_abbr_name}`);

    console.log('\n' + colors.bright + 'Latest NAV Data:' + colors.reset);
    console.log(`  NAV Date:           ${colors.bright}${latestNav.nav_date}${colors.reset}`);
    console.log(`  Current NAV:        ${colors.bright}${formatNumber(latestNav.last_val)} THB${colors.reset}`);
    console.log(`  Previous NAV:       ${formatNumber(latestNav.previous_val)} THB`);

    const navChange = latestNav.last_val - latestNav.previous_val;
    const navChangePercent = latestNav.previous_val > 0 ? (navChange / latestNav.previous_val) * 100 : 0;

    if (latestNav.previous_val > 0) {
      const changeColor = navChange > 0 ? colors.green : navChange < 0 ? colors.red : colors.reset;
      const changeSign = navChange >= 0 ? '+' : '';
      console.log(`  NAV Change:         ${changeColor}${changeSign}${formatNumber(navChange)} THB (${changeSign}${navChangePercent.toFixed(2)}%)${colors.reset}`);
    }

    console.log(`  Net Assets:         ${formatNumber(latestNav.net_asset, 0)} THB`);
    console.log(`  Buy Price:          ${formatNumber(latestNav.buy_price)} THB`);
    console.log(`  Sell Price:         ${formatNumber(latestNav.sell_price)} THB`);
    console.log(`  Last Updated:       ${latestNav.last_upd_date || 'N/A'}`);

    // Test 3: Fetch NAV History
    printSection('📈 Test 3: Fetch NAV History (Last 10 Trading Days)');

    const endDate = new Date(latestNav.nav_date);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 14); // Go back 14 days to get ~10 trading days

    console.log(`${colors.blue}Fetching NAV history from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...${colors.reset}\n`);

    const navHistory = await fetchFundNavHistory(fundId, startDate, endDate);

    if (navHistory.length === 0) {
      console.log(`${colors.yellow}⚠️  No historical data available${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Found ${navHistory.length} trading days${colors.reset}\n`);

      // Display in table format
      console.log(colors.bright + '┌────────────┬──────────────┬──────────────┬──────────────┐' + colors.reset);
      console.log(colors.bright + '│    Date    │     NAV      │  NAV Change  │  % Change    │' + colors.reset);
      console.log(colors.bright + '├────────────┼──────────────┼──────────────┼──────────────┤' + colors.reset);

      navHistory.forEach((nav, index) => {
        const prevNav = index > 0 ? navHistory[index - 1].last_val : nav.previous_val || nav.last_val;
        const navChange = nav.last_val - prevNav;
        const percentChange = prevNav > 0 ? (navChange / prevNav) * 100 : 0;

        const changeColor = navChange > 0 ? colors.green : navChange < 0 ? colors.red : colors.reset;
        const changeSign = navChange >= 0 ? '+' : '';

        console.log(
          `│ ${nav.nav_date} │ ` +
          `${formatNumber(nav.last_val)?.padStart(12)} │ ` +
          `${changeColor}${changeSign}${formatNumber(navChange)?.padStart(12)}${colors.reset} │ ` +
          `${changeColor}${changeSign}${formatNumber(percentChange, 2)?.padStart(12)}%${colors.reset} │`
        );
      });

      console.log(colors.bright + '└────────────┴──────────────┴──────────────┴──────────────┘' + colors.reset);

      // Calculate statistics
      const navValues = navHistory.map(n => n.last_val);
      const minNav = Math.min(...navValues);
      const maxNav = Math.max(...navValues);
      const avgNav = navValues.reduce((a, b) => a + b, 0) / navValues.length;

      console.log('\n' + colors.bright + 'Statistics:' + colors.reset);
      console.log(`  Minimum NAV:        ${formatNumber(minNav)} THB`);
      console.log(`  Maximum NAV:        ${formatNumber(maxNav)} THB`);
      console.log(`  Average NAV:        ${formatNumber(avgNav)} THB`);
      console.log(`  Latest NAV:         ${formatNumber(navHistory[navHistory.length - 1].last_val)} THB`);
    }

    // Test 4: Fetch Dividend History
    printSection('💰 Test 4: Fetch Dividend History');

    console.log(`${colors.blue}Fetching dividend history for ${fundId}...${colors.reset}\n`);

    const dividends = await fetchFundDividend(fundId);

    if (dividends.length === 0) {
      console.log(`${colors.yellow}⚠️  No dividend history available${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Found ${dividends.length} dividend record(s)${colors.reset}\n`);

      dividends.forEach((div, index) => {
        console.log(`${colors.bright}Dividend ${index + 1}:${colors.reset}`);
        console.log(`  Dividend Date:      ${div.dividend_date}`);
        console.log(`  Dividend/Unit:      ${formatNumber(div.dividend_per_unit)} THB`);
        console.log(`  Ex-Dividend Date:   ${div.ex_dividend_date}`);
        console.log(`  Record Date:        ${div.record_date}`);
        console.log(`  Payment Date:       ${div.payment_date}`);
        console.log();
      });
    }

    // Final Summary
    printSection('✅ Test Summary');

    console.log(`${colors.green}All tests completed successfully!${colors.reset}\n`);
    console.log(colors.bright + 'Key Findings:' + colors.reset);
    console.log(`  ✓ SEC Fund Daily Info API is working`);
    console.log(`  ✓ ABAPAC-RMF data is accessible`);
    console.log(`  ✓ Latest NAV: ${formatNumber(latestNav.nav)} THB (${latestNav.nav_date})`);
    console.log(`  ✓ Historical data: ${navHistory.length} records retrieved`);
    console.log(`  ✓ Dividend records: ${dividends.length} found`);
    console.log();

  } catch (error: any) {
    console.error(colors.bright + colors.red + '❌ Error during testing:' + colors.reset, error.message);
    process.exit(1);
  }
}

// Run the test
console.log(colors.blue + 'Starting ABAPAC-RMF test using SEC Fund Daily Info API...\n' + colors.reset);
testABAPACRMF();
