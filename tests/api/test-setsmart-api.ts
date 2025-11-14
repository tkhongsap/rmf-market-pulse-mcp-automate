/**
 * Test script for SETSmart API integration
 *
 * This script tests the connectivity and functionality of the SETSmart API
 * by making sample requests to various endpoints.
 */

import {
  fetchStockQuoteBySymbol,
  fetchStockQuoteBySecurityType,
  fetchFinancialDataBySymbol,
  testApiConnection,
  clearCache,
} from './server/services/setsmartApi';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

function printHeader(title: string) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + title + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(80) + colors.reset + '\n');
}

function printSuccess(message: string) {
  console.log(colors.green + '✓ ' + message + colors.reset);
}

function printError(message: string) {
  console.log(colors.red + '✗ ' + message + colors.reset);
}

function printInfo(message: string) {
  console.log(colors.blue + 'ℹ ' + message + colors.reset);
}

async function testConnectionAndAuth() {
  printHeader('Test 1: API Connection & Authentication');

  try {
    const apiKey = process.env.SEC_API_KEY;
    if (!apiKey) {
      printError('SEC_API_KEY not found in environment variables');
      return false;
    }

    printInfo(`API Key found: ${apiKey.substring(0, 8)}...`);

    const isConnected = await testApiConnection();
    if (isConnected) {
      printSuccess('API connection and authentication successful');
      return true;
    } else {
      printError('API connection test failed');
      return false;
    }
  } catch (error: any) {
    printError(`Connection test error: ${error.message}`);
    return false;
  }
}

async function testStockQuoteBySymbol() {
  printHeader('Test 2: Fetch Stock Quote by Symbol (PTT)');

  try {
    // Get data for the last 5 trading days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Go back 7 days to ensure we get 5 trading days

    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    printInfo(`Fetching PTT stock data from ${startDateStr} to ${endDateStr}`);

    const quotes = await fetchStockQuoteBySymbol('PTT', startDateStr, endDateStr, 'Y');

    if (quotes.length === 0) {
      printError('No data returned');
      return false;
    }

    printSuccess(`Received ${quotes.length} trading days of data`);

    // Display the most recent quote
    const latestQuote = quotes[quotes.length - 1];
    console.log('\n' + colors.bright + 'Latest Quote:' + colors.reset);
    console.log(`  Date:           ${latestQuote.date}`);
    console.log(`  Symbol:         ${latestQuote.symbol}`);
    console.log(`  Security Type:  ${latestQuote.securityType}`);
    console.log(`  Open:           ${formatNumber(latestQuote.open)}`);
    console.log(`  High:           ${formatNumber(latestQuote.high)}`);
    console.log(`  Low:            ${formatNumber(latestQuote.low)}`);
    console.log(`  Close:          ${formatNumber(latestQuote.close)}`);
    console.log(`  Volume:         ${formatLargeNumber(latestQuote.totalVolume)}`);
    console.log(`  Value:          ${formatLargeNumber(latestQuote.totalValue)} THB`);
    console.log(`  P/E Ratio:      ${formatNumber(latestQuote.pe)}`);
    console.log(`  P/BV Ratio:     ${formatNumber(latestQuote.pbv)}`);
    console.log(`  Dividend Yield: ${formatNumber(latestQuote.dividendYield)}%`);
    console.log(`  Market Cap:     ${formatLargeNumber(latestQuote.marketCap)} THB`);

    return true;
  } catch (error: any) {
    printError(`Stock quote test error: ${error.message}`);
    return false;
  }
}

async function testStockQuoteBySecurityType() {
  printHeader('Test 3: Fetch Stock Quotes by Security Type (CS - Common Stock)');

  try {
    // Get data for yesterday (more likely to have complete data)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    printInfo(`Fetching all CS (Common Stock) data for ${dateStr}`);

    const quotes = await fetchStockQuoteBySecurityType('CS', dateStr, 'Y');

    if (quotes.length === 0) {
      printError('No data returned');
      return false;
    }

    printSuccess(`Received ${quotes.length} stocks`);

    // Display top 5 stocks by market cap
    const topStocks = quotes
      .filter(q => q.marketCap !== null)
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, 5);

    console.log('\n' + colors.bright + 'Top 5 Stocks by Market Cap:' + colors.reset);
    topStocks.forEach((stock, index) => {
      console.log(
        `  ${index + 1}. ${stock.symbol.padEnd(10)} ` +
        `Price: ${formatNumber(stock.close)?.padStart(10)} ` +
        `Market Cap: ${formatLargeNumber(stock.marketCap)?.padStart(12)} THB`
      );
    });

    return true;
  } catch (error: any) {
    printError(`Security type test error: ${error.message}`);
    return false;
  }
}

async function testFinancialDataBySymbol() {
  printHeader('Test 4: Fetch Financial Data by Symbol (PTT)');

  try {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    printInfo(`Fetching PTT financial data for ${lastYear} Q4`);

    const financialData = await fetchFinancialDataBySymbol('PTT', lastYear.toString(), 4);

    if (financialData.length === 0) {
      printError('No data returned');
      return false;
    }

    printSuccess(`Received ${financialData.length} financial record(s)`);

    // Display the latest financial data
    const latestData = financialData[financialData.length - 1];
    console.log('\n' + colors.bright + 'Financial Data:' + colors.reset);
    console.log(`  Symbol:              ${latestData.symbol}`);
    console.log(`  Period:              ${latestData.year} Q${latestData.quarter} (${latestData.accountPeriod})`);
    console.log(`  Date:                ${latestData.dateAsof}`);
    console.log(`  Total Assets:        ${formatLargeNumber(latestData.totalAssets)} K THB`);
    console.log(`  Total Liabilities:   ${formatLargeNumber(latestData.totalLiabilities)} K THB`);
    console.log(`  Shareholder Equity:  ${formatLargeNumber(latestData.shareholderEquity)} K THB`);
    console.log(`  Revenue (Quarter):   ${formatLargeNumber(latestData.totalRevenueQuarter)} K THB`);
    console.log(`  Revenue (YTD):       ${formatLargeNumber(latestData.totalRevenueAccum)} K THB`);
    console.log(`  Net Profit (Quarter):${formatLargeNumber(latestData.netProfitQuarter)} K THB`);
    console.log(`  Net Profit (YTD):    ${formatLargeNumber(latestData.netProfitAccum)} K THB`);
    console.log(`  EPS (Quarter):       ${formatNumber(latestData.epsQuarter)} THB`);
    console.log(`  EPS (YTD):           ${formatNumber(latestData.epsAccum)} THB`);
    console.log(`  ROE:                 ${formatNumber(latestData.roe)}%`);
    console.log(`  ROA:                 ${formatNumber(latestData.roa)}%`);
    console.log(`  D/E Ratio:           ${formatNumber(latestData.de)}`);

    return true;
  } catch (error: any) {
    printError(`Financial data test error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(colors.bright + colors.yellow);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                     SETSmart API Integration Test Suite                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const results: { test: string; passed: boolean }[] = [];

  // Clear cache before starting tests
  clearCache();
  printInfo('Cache cleared for fresh test run\n');

  // Run all tests
  results.push({
    test: 'API Connection & Authentication',
    passed: await testConnectionAndAuth(),
  });

  results.push({
    test: 'Stock Quote by Symbol',
    passed: await testStockQuoteBySymbol(),
  });

  results.push({
    test: 'Stock Quote by Security Type',
    passed: await testStockQuoteBySecurityType(),
  });

  results.push({
    test: 'Financial Data by Symbol',
    passed: await testFinancialDataBySymbol(),
  });

  // Print summary
  printHeader('Test Summary');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    if (result.passed) {
      printSuccess(result.test);
    } else {
      printError(result.test);
    }
  });

  console.log('\n' + colors.bright + `Results: ${passed}/${total} tests passed` + colors.reset);

  if (passed === total) {
    console.log(colors.green + colors.bright + '\n🎉 All tests passed! SETSmart API integration is working correctly.\n' + colors.reset);
  } else {
    console.log(colors.red + colors.bright + '\n⚠️  Some tests failed. Please check the errors above.\n' + colors.reset);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error(colors.red + 'Fatal error running tests:' + colors.reset, error);
  process.exit(1);
});
