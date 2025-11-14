/**
 * Test RMF Fund Performance Endpoints
 *
 * This script tests the 5 new SEC Fund Factsheet API endpoints:
 * 1. Performance (returns across all time periods)
 * 2. Benchmark (benchmark data and returns)
 * 3. Volatility (standard deviation, max drawdown)
 * 4. Tracking Error (vs benchmark)
 * 5. Fund Compare (category/peer group)
 */

import {
  fetchFundPerformance,
  fetchFundBenchmark,
  fetchFund5YearLost,
  fetchFundTrackingError,
  fetchFundCompare,
  clearCache,
  testApiConnection,
} from './server/services/secFundFactsheetApi';

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

function formatPercent(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

function printSection(title: string) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + title.toUpperCase() + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
}

function printSubsection(title: string) {
  console.log('\n' + colors.bright + colors.blue + title + colors.reset);
  console.log(colors.blue + '─'.repeat(80) + colors.reset);
}

async function testPerformanceEndpoints() {
  console.log(colors.bright + colors.yellow);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║          RMF Fund Performance Endpoints - SEC Fund Factsheet API          ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Clear cache for fresh test
  clearCache();

  try {
    // Test 0: API Connection
    printSection('🔌 Test 0: API Connection & Authentication');

    const apiKey = process.env.SEC_FUND_FACTSHEET_KEY;
    if (!apiKey) {
      console.log(`${colors.red}✗ SEC_FUND_FACTSHEET_KEY not found in environment${colors.reset}`);
      return;
    }

    console.log(`${colors.blue}API Key: ${apiKey.substring(0, 8)}...${colors.reset}`);

    const isConnected = await testApiConnection();
    if (!isConnected) {
      console.log(`${colors.red}✗ API connection failed${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✓ API connection successful${colors.reset}`);

    // Test 1: Fetch Performance Data
    printSection('📊 Test 1: Fetch Fund Performance Data');

    const fundId = 'M0774_2554'; // ABAPAC-RMF project ID
    console.log(`${colors.blue}Fund: ABAPAC-RMF (${fundId})${colors.reset}\n`);

    const performance = await fetchFundPerformance(fundId);

    if (!performance) {
      console.log(`${colors.red}✗ No performance data available${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Performance data retrieved${colors.reset}\n`);

      console.log(colors.bright + 'Historical Returns:' + colors.reset);
      console.log(`  YTD:              ${formatPercent(performance.ytd)}`);
      console.log(`  3 Months:         ${formatPercent(performance.threeMonth)}`);
      console.log(`  6 Months:         ${formatPercent(performance.sixMonth)}`);
      console.log(`  1 Year:           ${formatPercent(performance.oneYear)}`);
      console.log(`  3 Years (Ann.):   ${formatPercent(performance.threeYear)}`);
      console.log(`  5 Years (Ann.):   ${formatPercent(performance.fiveYear)}`);
      console.log(`  10 Years (Ann.):  ${formatPercent(performance.tenYear)}`);
      console.log(`  Since Inception:  ${formatPercent(performance.sinceInception)}`);
    }

    // Test 2: Fetch Benchmark Data
    printSection('📈 Test 2: Fetch Benchmark Data');

    console.log(`${colors.blue}Fetching benchmark data for ${fundId}...${colors.reset}\n`);

    const benchmark = await fetchFundBenchmark(fundId);

    if (!benchmark) {
      console.log(`${colors.yellow}⚠️  No benchmark data available${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Benchmark data retrieved${colors.reset}\n`);

      console.log(colors.bright + 'Benchmark Information:' + colors.reset);
      console.log(`  Name:             ${benchmark.name}`);
      console.log(`  Index Code:       ${benchmark.indexCode || 'N/A'}`);

      console.log('\n' + colors.bright + 'Benchmark Returns:' + colors.reset);
      console.log(`  YTD:              ${formatPercent(benchmark.returns.ytd)}`);
      console.log(`  3 Months:         ${formatPercent(benchmark.returns.threeMonth)}`);
      console.log(`  6 Months:         ${formatPercent(benchmark.returns.sixMonth)}`);
      console.log(`  1 Year:           ${formatPercent(benchmark.returns.oneYear)}`);
      console.log(`  3 Years (Ann.):   ${formatPercent(benchmark.returns.threeYear)}`);
      console.log(`  5 Years (Ann.):   ${formatPercent(benchmark.returns.fiveYear)}`);
      console.log(`  10 Years (Ann.):  ${formatPercent(benchmark.returns.tenYear)}`);
      console.log(`  Since Inception:  ${formatPercent(benchmark.returns.sinceInception)}`);

      // Compare Fund vs Benchmark
      if (performance && benchmark) {
        printSubsection('Fund vs Benchmark Comparison');

        console.log('\n' + colors.bright + '┌──────────────┬──────────────┬──────────────┬──────────────┐' + colors.reset);
        console.log(colors.bright + '│    Period    │     Fund     │  Benchmark   │  Difference  │' + colors.reset);
        console.log(colors.bright + '├──────────────┼──────────────┼──────────────┼──────────────┤' + colors.reset);

        const periods = [
          { label: 'YTD', fund: performance.ytd, bench: benchmark.returns.ytd },
          { label: '3 Months', fund: performance.threeMonth, bench: benchmark.returns.threeMonth },
          { label: '6 Months', fund: performance.sixMonth, bench: benchmark.returns.sixMonth },
          { label: '1 Year', fund: performance.oneYear, bench: benchmark.returns.oneYear },
          { label: '3 Years', fund: performance.threeYear, bench: benchmark.returns.threeYear },
          { label: '5 Years', fund: performance.fiveYear, bench: benchmark.returns.fiveYear },
          { label: '10 Years', fund: performance.tenYear, bench: benchmark.returns.tenYear },
          { label: 'Inception', fund: performance.sinceInception, bench: benchmark.returns.sinceInception },
        ];

        periods.forEach(({ label, fund, bench }) => {
          const diff = (fund !== null && bench !== null) ? fund - bench : null;
          const diffColor = diff !== null && diff > 0 ? colors.green : diff !== null && diff < 0 ? colors.red : colors.reset;
          const fundStr = formatPercent(fund).padStart(12);
          const benchStr = formatPercent(bench).padStart(12);
          const diffStr = diff !== null ? formatPercent(diff).padStart(12) : 'N/A'.padStart(12);

          console.log(
            `│ ${label.padEnd(12)} │ ${fundStr} │ ${benchStr} │ ${diffColor}${diffStr}${colors.reset} │`
          );
        });

        console.log(colors.bright + '└──────────────┴──────────────┴──────────────┴──────────────┘' + colors.reset);
      }
    }

    // Test 3: Fetch Volatility Data
    printSection('📉 Test 3: Fetch Volatility & Risk Metrics');

    console.log(`${colors.blue}Fetching volatility data for ${fundId}...${colors.reset}\n`);

    const volatility = await fetchFund5YearLost(fundId);

    if (!volatility) {
      console.log(`${colors.yellow}⚠️  No volatility data available${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Volatility data retrieved${colors.reset}\n`);

      console.log(colors.bright + 'Risk Metrics:' + colors.reset);
      console.log(`  Standard Deviation (5Y): ${volatility.standardDeviation?.toFixed(2) ?? 'N/A'}%`);
      console.log(`  Max Drawdown (5Y):       ${volatility.maxDrawdown?.toFixed(2) ?? 'N/A'}%`);
      console.log(`  Volatility:              ${volatility.volatility?.toFixed(2) ?? 'N/A'}`);

      // Risk assessment
      if (volatility.standardDeviation !== null) {
        const sd = volatility.standardDeviation;
        const riskLevel =
          sd < 5 ? 'Very Low' :
          sd < 10 ? 'Low' :
          sd < 15 ? 'Moderate' :
          sd < 20 ? 'High' : 'Very High';

        const riskColor =
          sd < 10 ? colors.green :
          sd < 15 ? colors.yellow : colors.red;

        console.log(`\n  Risk Level: ${riskColor}${riskLevel}${colors.reset} (based on standard deviation)`);
      }
    }

    // Test 4: Fetch Tracking Error
    printSection('🎯 Test 4: Fetch Tracking Error');

    console.log(`${colors.blue}Fetching tracking error for ${fundId}...${colors.reset}\n`);

    const trackingError = await fetchFundTrackingError(fundId);

    if (!trackingError) {
      console.log(`${colors.yellow}⚠️  No tracking error data available${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Tracking error data retrieved${colors.reset}\n`);

      console.log(colors.bright + 'Tracking Error:' + colors.reset);
      console.log(`  1-Year TE:        ${trackingError.oneYear?.toFixed(2) ?? 'N/A'}%`);
      if (trackingError.description) {
        console.log(`  Description:      ${trackingError.description}`);
      }

      if (trackingError.oneYear !== null) {
        const te = trackingError.oneYear;
        const trackingQuality =
          te < 1 ? 'Excellent (Very tight tracking)' :
          te < 2 ? 'Good (Close tracking)' :
          te < 3 ? 'Acceptable (Moderate divergence)' :
          'Poor (High divergence from benchmark)';

        console.log(`\n  Tracking Quality: ${trackingQuality}`);
      }
    }

    // Test 5: Fetch Fund Comparison Data
    printSection('🔍 Test 5: Fetch Fund Comparison/Category Data');

    console.log(`${colors.blue}Fetching comparison data for ${fundId}...${colors.reset}\n`);

    const compareData = await fetchFundCompare(fundId);

    if (!compareData) {
      console.log(`${colors.yellow}⚠️  No comparison data available${colors.reset}`);
    } else {
      console.log(`${colors.green}✓ Comparison data retrieved${colors.reset}\n`);

      console.log(colors.bright + 'Fund Classification:' + colors.reset);
      console.log(`  Category:         ${compareData.category || 'N/A'}`);
      console.log(`  Category Code:    ${compareData.categoryCode || 'N/A'}`);
      console.log(`  Peer Group:       ${compareData.peerGroup || 'N/A'}`);
    }

    // Final Summary
    printSection('✅ Test Summary');

    console.log(`${colors.green}All performance endpoint tests completed!${colors.reset}\n`);

    const successCount = [performance, benchmark, volatility, trackingError, compareData].filter(x => x !== null).length;
    const totalTests = 5;

    console.log(colors.bright + 'Results:' + colors.reset);
    console.log(`  ✓ API Connection:     Successful`);
    console.log(`  ✓ Endpoints Tested:   ${successCount}/${totalTests} returned data`);
    console.log(`  ${performance ? '✓' : '✗'} Performance Data:   ${performance ? 'Available' : 'Not Available'}`);
    console.log(`  ${benchmark ? '✓' : '✗'} Benchmark Data:     ${benchmark ? 'Available' : 'Not Available'}`);
    console.log(`  ${volatility ? '✓' : '✗'} Volatility Metrics: ${volatility ? 'Available' : 'Not Available'}`);
    console.log(`  ${trackingError ? '✓' : '✗'} Tracking Error:     ${trackingError ? 'Available' : 'Not Available'}`);
    console.log(`  ${compareData ? '✓' : '✗'} Comparison Data:    ${compareData ? 'Available' : 'Not Available'}`);
    console.log();

    // Display raw response data for debugging
    if (process.argv.includes('--debug')) {
      printSection('🐛 Debug: Raw API Responses');

      console.log('\n' + colors.yellow + 'Performance Raw Data:' + colors.reset);
      console.log(JSON.stringify(performance, null, 2));

      console.log('\n' + colors.yellow + 'Benchmark Raw Data:' + colors.reset);
      console.log(JSON.stringify(benchmark, null, 2));

      console.log('\n' + colors.yellow + 'Volatility Raw Data:' + colors.reset);
      console.log(JSON.stringify(volatility, null, 2));

      console.log('\n' + colors.yellow + 'Tracking Error Raw Data:' + colors.reset);
      console.log(JSON.stringify(trackingError, null, 2));

      console.log('\n' + colors.yellow + 'Comparison Raw Data:' + colors.reset);
      console.log(JSON.stringify(compareData, null, 2));
    }

  } catch (error: any) {
    console.error(colors.bright + colors.red + '❌ Error during testing:' + colors.reset, error.message);
    console.error(colors.red + error.stack + colors.reset);
    process.exit(1);
  }
}

// Run the test
console.log(colors.blue + 'Starting RMF Performance Endpoints Test...\n' + colors.reset);
console.log(colors.yellow + 'Tip: Run with --debug flag to see raw API responses\n' + colors.reset);
testPerformanceEndpoints();
