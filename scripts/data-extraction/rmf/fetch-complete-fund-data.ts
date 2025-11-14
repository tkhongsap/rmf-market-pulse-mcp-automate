/**
 * Comprehensive RMF Fund Data Fetcher
 *
 * Fetches ALL available data points for an RMF fund from SEC APIs:
 * - Daily NAV data (latest + history)
 * - Dividend history
 * - Performance metrics (all time periods)
 * - Benchmark data
 * - Risk metrics (volatility, tracking error)
 * - Asset allocation
 * - Fund category/classification
 *
 * Designed to work for single fund testing, scalable to all 410 RMF funds.
 */

import 'dotenv/config';

import {
  fetchFundDailyNav,
  fetchFundNavHistory,
  fetchFundDividend,
  clearCache,
  type FundDailyNav,
  type FundDividend,
} from '../../../server/services/secFundDailyInfoApi';

import {
  fetchFundPerformance,
  fetchFundBenchmark,
  fetchFund5YearLost,
  fetchFundTrackingError,
  fetchFundCompare,
  fetchFundAssets,
  fetchFundFees,
  fetchInvolvedParties,
  fetchFundTop5Holdings,
  fetchFundRiskFactors,
  fetchFundSuitability,
  fetchFundURLs,
  fetchFundInvestmentMinimums,
  fetchFundPolicy,
  fetchFundDividendPolicy,
  type FundPerformance,
  type BenchmarkData,
  type VolatilityMetrics,
  type TrackingError,
  type FundCompareData,
  type FundAssets,
  type FundPolicyData,
  type DividendPolicyData,
  type SuitabilityData,
} from '../../../server/services/secFundFactsheetApi';

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

export interface FundMetadata {
  symbol: string;
  fund_name: string;
  amc: string;
  fund_classification: string;
  management_style: string;
  dividend_policy: string;
  risk_level: number;
  fund_type: string;
}

interface LatestNavData {
  nav_date: string;
  last_val: number;
  previous_val: number;
  net_asset: number;
  buy_price: number;
  sell_price: number;
  change: number;
  change_percent: number;
  last_upd_date: string;
}

interface NavHistoryItem {
  nav_date: string;
  last_val: number;
  previous_val: number;
  net_asset: number;
  buy_price: number;
  sell_price: number;
}

interface DividendItem {
  dividend_date: string;
  dividend_per_unit: number;
  ex_dividend_date: string;
  record_date: string;
  payment_date: string;
}

interface PerformanceData {
  ytd: number | null;
  '3m': number | null;
  '6m': number | null;
  '1y': number | null;
  '3y': number | null;
  '5y': number | null;
  '10y': number | null;
  since_inception: number | null;
}

interface BenchmarkReturns {
  ytd: number | null;
  '3m': number | null;
  '6m': number | null;
  '1y': number | null;
  '3y': number | null;
  '5y': number | null;
  '10y': number | null;
}

interface BenchmarkInfo {
  name: string | null;
  returns: BenchmarkReturns;
}

interface RiskMetrics {
  standard_deviation_5y: number | null;
  tracking_error_1y: number | null;
}

interface AssetAllocationItem {
  asset_class: string;
  percentage: number;
}

interface FeeStructure {
  fee_type: string;
  fee_desc: string;
  fee_value: string | null;
  fee_remark: string | null;
}

interface InvolvedParty {
  party_role: string;
  party_name: string;
}

interface HoldingItem {
  security_name: string;
  percentage: number;
}

interface RiskFactor {
  risk_type: string;
  risk_desc: string;
}

interface SuitabilityInfo {
  investment_horizon: string | null;
  risk_level: string | null;
  target_investor: string | null;
}

interface DocumentURLs {
  factsheet_url: string | null;
  annual_report_url: string | null;
  halfyear_report_url: string | null;
}

interface InvestmentMinimums {
  minimum_initial: string | null;
  minimum_additional: string | null;
  minimum_redemption: string | null;
  minimum_balance: string | null;
}

interface CompleteFundData {
  // Identifiers
  fund_id: string;
  symbol: string;
  fund_name: string;
  amc: string;

  // Metadata
  metadata: {
    fund_classification: string;
    management_style: string;
    dividend_policy: string;
    risk_level: number;
    fund_type: string;
  };

  // NAV Data from Daily Info API
  latest_nav: LatestNavData | null;
  nav_history_30d: NavHistoryItem[];

  // Dividend History from Daily Info API
  dividends: DividendItem[];

  // Performance from Factsheet API
  performance: PerformanceData | null;

  // Benchmark from Factsheet API
  benchmark: BenchmarkInfo | null;

  // Risk Metrics from Factsheet API
  risk_metrics: RiskMetrics | null;

  // Asset Allocation from Factsheet API
  asset_allocation: AssetAllocationItem[] | null;

  // Category/Peer Group from Factsheet API
  category: string | null;

  // NEW: Fee Structure from Factsheet API
  fees: FeeStructure[] | null;

  // NEW: Involved Parties from Factsheet API
  involved_parties: InvolvedParty[] | null;

  // NEW: Top 5 Holdings from Factsheet API
  top_holdings: HoldingItem[] | null;

  // NEW: Risk Factors from Factsheet API
  risk_factors: RiskFactor[] | null;

  // NEW: Suitability from Factsheet API
  suitability: SuitabilityInfo | null;

  // NEW: Document URLs from Factsheet API
  document_urls: DocumentURLs | null;

  // NEW: Investment Minimums from Factsheet API
  investment_minimums: InvestmentMinimums | null;

  // Metadata
  data_fetched_at: string;
  errors: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title: string) {
  console.log('\n' + colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + title.toUpperCase() + colors.reset);
  console.log(colors.bright + colors.cyan + '═'.repeat(80) + colors.reset);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch latest NAV data (searches back up to 10 days)
 */
async function fetchLatestNav(proj_id: string): Promise<LatestNavData | null> {
  log('Fetching latest NAV data...', 'blue');

  const today = new Date();
  let latestNav: FundDailyNav | null = null;
  let attempts = 0;
  const maxAttempts = 10;

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

    try {
      latestNav = await fetchFundDailyNav(proj_id, dateStr);
      if (latestNav) {
        log(`  ✓ Found latest NAV for ${dateStr}`, 'green');
        break;
      }
    } catch (error) {
      // Continue to next date
    }

    attempts++;
  }

  if (!latestNav) {
    log('  ✗ No NAV data found in last 10 days', 'red');
    return null;
  }

  // Calculate change
  const change = latestNav.last_val - latestNav.previous_val;
  const changePercent = latestNav.previous_val > 0
    ? (change / latestNav.previous_val) * 100
    : 0;

  return {
    nav_date: latestNav.nav_date,
    last_val: latestNav.last_val,
    previous_val: latestNav.previous_val,
    net_asset: latestNav.net_asset,
    buy_price: latestNav.buy_price,
    sell_price: latestNav.sell_price,
    change,
    change_percent: changePercent,
    last_upd_date: latestNav.last_upd_date,
  };
}

/**
 * Fetch 30-day NAV history
 */
async function fetchNavHistory30d(proj_id: string, latestDate: string): Promise<NavHistoryItem[]> {
  log('Fetching 30-day NAV history...', 'blue');

  const endDate = new Date(latestDate);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 42); // Go back ~42 days to get ~30 trading days

  try {
    const navHistory = await fetchFundNavHistory(proj_id, startDate, endDate);
    log(`  ✓ Found ${navHistory.length} NAV records`, 'green');

    return navHistory.map(nav => ({
      nav_date: nav.nav_date,
      last_val: nav.last_val,
      previous_val: nav.previous_val,
      net_asset: nav.net_asset,
      buy_price: nav.buy_price,
      sell_price: nav.sell_price,
    }));
  } catch (error: any) {
    log(`  ✗ Error fetching NAV history: ${error.message}`, 'red');
    return [];
  }
}

/**
 * Fetch dividend history
 */
async function fetchDividendHistory(proj_id: string): Promise<DividendItem[]> {
  log('Fetching dividend history...', 'blue');

  try {
    const dividends = await fetchFundDividend(proj_id);
    log(`  ✓ Found ${dividends.length} dividend records`, 'green');

    return dividends.map(div => ({
      dividend_date: div.dividend_date,
      dividend_per_unit: div.dividend_per_unit,
      ex_dividend_date: div.ex_dividend_date,
      record_date: div.record_date,
      payment_date: div.payment_date,
    }));
  } catch (error: any) {
    log(`  ✗ No dividend data available`, 'yellow');
    return [];
  }
}

/**
 * Fetch performance metrics
 */
async function fetchPerformanceMetrics(proj_id: string): Promise<PerformanceData | null> {
  log('Fetching performance metrics...', 'blue');

  try {
    const performance = await fetchFundPerformance(proj_id);

    if (!performance) {
      log('  ✗ No performance data available', 'yellow');
      return null;
    }

    log('  ✓ Found performance data', 'green');

    return {
      ytd: performance.ytd || null,
      '3m': performance.threeMonth || null,
      '6m': performance.sixMonth || null,
      '1y': performance.oneYear || null,
      '3y': performance.threeYear || null,
      '5y': performance.fiveYear || null,
      '10y': performance.tenYear || null,
      since_inception: performance.sinceInception || null,
    };
  } catch (error: any) {
    log(`  ✗ Error fetching performance: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch benchmark data
 */
async function fetchBenchmarkData(proj_id: string): Promise<BenchmarkInfo | null> {
  log('Fetching benchmark data...', 'blue');

  try {
    const benchmark = await fetchFundBenchmark(proj_id);

    if (!benchmark) {
      log('  ✗ No benchmark data available', 'yellow');
      return null;
    }

    log(`  ✓ Found benchmark data: ${benchmark.name}`, 'green');

    return {
      name: benchmark.name || null,
      returns: {
        ytd: benchmark.returns.ytd || null,
        '3m': benchmark.returns.threeMonth || null,
        '6m': benchmark.returns.sixMonth || null,
        '1y': benchmark.returns.oneYear || null,
        '3y': benchmark.returns.threeYear || null,
        '5y': benchmark.returns.fiveYear || null,
        '10y': benchmark.returns.tenYear || null,
      },
    };
  } catch (error: any) {
    log(`  ✗ Error fetching benchmark: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch risk metrics
 */
async function fetchRiskMetrics(proj_id: string): Promise<RiskMetrics | null> {
  log('Fetching risk metrics...', 'blue');

  try {
    const [volatility, trackingError] = await Promise.all([
      fetchFund5YearLost(proj_id).catch(() => null),
      fetchFundTrackingError(proj_id).catch(() => null),
    ]);

    const stdDev5y = volatility && volatility.length > 0 ? parseFloat(volatility[0]?.[1]) : null;
    const te1y = trackingError && trackingError.length > 0 ? parseFloat(trackingError[0]?.[1]) : null;

    if (stdDev5y !== null || te1y !== null) {
      log(`  ✓ Found risk metrics (SD: ${stdDev5y}, TE: ${te1y})`, 'green');
      return {
        standard_deviation_5y: stdDev5y,
        tracking_error_1y: te1y,
      };
    }

    log('  ✗ No risk metrics available', 'yellow');
    return null;
  } catch (error: any) {
    log(`  ✗ Error fetching risk metrics: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch asset allocation
 */
async function fetchAssetAllocation(proj_id: string): Promise<AssetAllocationItem[] | null> {
  log('Fetching asset allocation...', 'blue');

  try {
    const assets = await fetchFundAssets(proj_id);

    if (!assets || assets.length === 0) {
      log('  ✗ No asset allocation data available', 'yellow');
      return null;
    }

    const allocation = assets.map((item: any) => ({
      asset_class: item.asset_name || 'Unknown',
      percentage: parseFloat(item.asset_ratio) || 0,
    }));

    log(`  ✓ Found ${allocation.length} asset classes`, 'green');
    return allocation;
  } catch (error: any) {
    log(`  ✗ Error fetching asset allocation: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch fund category
 */
async function fetchFundCategory(proj_id: string): Promise<string | null> {
  log('Fetching fund category...', 'blue');

  try {
    const compareData = await fetchFundCompare(proj_id);

    if (!compareData || compareData.length === 0) {
      log('  ✗ No category data available', 'yellow');
      return null;
    }

    const category = compareData[0]?.[1] || null;
    log(`  ✓ Category: ${category}`, 'green');
    return category;
  } catch (error: any) {
    log(`  ✗ Error fetching category: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch fee structure
 */
async function fetchFeeStructure(proj_id: string): Promise<FeeStructure[] | null> {
  log('Fetching fee structure...', 'blue');

  try {
    const fees = await fetchFundFees(proj_id);

    if (!fees || fees.length === 0) {
      log('  ✗ No fee data available', 'yellow');
      return null;
    }

    const feeStructure = fees.map((fee: any) => ({
      fee_type: fee.fee_class_desc || 'Unknown',
      fee_desc: fee.fee_type_desc || '',
      fee_value: fee.actual_fee || null,
      fee_remark: fee.fee_remark || null,
    }));

    log(`  ✓ Found ${feeStructure.length} fee items`, 'green');
    return feeStructure;
  } catch (error: any) {
    log(`  ✗ Error fetching fees: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch involved parties
 */
async function fetchParties(proj_id: string): Promise<InvolvedParty[] | null> {
  log('Fetching involved parties...', 'blue');

  try {
    const parties = await fetchInvolvedParties(proj_id);

    if (!parties || parties.length === 0) {
      log('  ✗ No party data available', 'yellow');
      return null;
    }

    const involvedParties = parties.map((party: any) => ({
      party_role: party.party_type_desc || 'Unknown',
      party_name: party.person_name || party.comp_name_th || 'Unknown',
    }));

    log(`  ✓ Found ${involvedParties.length} parties`, 'green');
    return involvedParties;
  } catch (error: any) {
    log(`  ✗ Error fetching parties: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch top 5 holdings
 */
async function fetchTopHoldings(proj_id: string): Promise<HoldingItem[] | null> {
  log('Fetching top 5 holdings...', 'blue');

  try {
    // Use most recent quarter-end date (e.g., 20250930 for Q3 2025)
    const now = new Date();
    const quarter = Math.floor((now.getMonth()) / 3);
    const quarterEndMonth = quarter * 3 + 2; // 2, 5, 8, 11
    const quarterEndDate = new Date(now.getFullYear(), quarterEndMonth, 0); // Last day of quarter

    // If we're past the quarter end by more than 45 days, use current quarter
    // Otherwise use previous quarter
    const daysSinceQuarter = (now.getTime() - quarterEndDate.getTime()) / (1000 * 60 * 60 * 24);
    const targetDate = daysSinceQuarter > 45 ? quarterEndDate : new Date(now.getFullYear(), quarterEndMonth - 3, 0);

    const period = targetDate.toISOString().slice(0, 10).replace(/-/g, '');

    const holdings = await fetchFundTop5Holdings(proj_id, period);

    if (!holdings || holdings.length === 0) {
      log('  ✗ No holdings data available', 'yellow');
      return null;
    }

    const topHoldings = holdings.slice(0, 5).map((holding: any) => ({
      security_name: holding.asset_name || 'Unknown',
      percentage: parseFloat(holding.port_pct) || 0,
    }));

    log(`  ✓ Found ${topHoldings.length} holdings`, 'green');
    return topHoldings;
  } catch (error: any) {
    log(`  ✗ Error fetching holdings: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch risk factors
 */
async function fetchRiskInfo(proj_id: string): Promise<RiskFactor[] | null> {
  log('Fetching risk factors...', 'blue');

  try {
    const riskData = await fetchFundRiskFactors(proj_id);

    if (!riskData || riskData.length === 0) {
      log('  ✗ No risk factor data available', 'yellow');
      return null;
    }

    const riskFactors = riskData.map((risk: any) => ({
      risk_type: risk.risk_factor_type_th || 'Unknown',
      risk_desc: risk.risk_desc_th || '',
    }));

    log(`  ✓ Found ${riskFactors.length} risk factors`, 'green');
    return riskFactors;
  } catch (error: any) {
    log(`  ✗ Error fetching risk factors: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch suitability info
 */
async function fetchSuitabilityInfo(proj_id: string): Promise<SuitabilityInfo | null> {
  log('Fetching suitability info...', 'blue');

  try {
    const suitability = await fetchFundSuitability(proj_id);

    if (!suitability) {
      log('  ✗ No suitability data available', 'yellow');
      return null;
    }

    const suitabilityInfo: SuitabilityInfo = {
      investment_horizon: suitability.invest_period_desc || null,
      risk_level: suitability.risk_spectrum_desc || null,
      target_investor: suitability.suitability_desc || null,
    };

    log('  ✓ Found suitability data', 'green');
    return suitabilityInfo;
  } catch (error: any) {
    log(`  ✗ Error fetching suitability: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch document URLs
 */
async function fetchDocumentURLs(proj_id: string): Promise<DocumentURLs | null> {
  log('Fetching document URLs...', 'blue');

  try {
    const urls = await fetchFundURLs(proj_id);

    if (!urls) {
      log('  ✗ No URL data available', 'yellow');
      return null;
    }

    const documentURLs: DocumentURLs = {
      factsheet_url: urls.url_factsheet || null,
      annual_report_url: urls.url_annual_report || null,
      halfyear_report_url: urls.url_halfyear_report || null,
    };

    log('  ✓ Found document URLs', 'green');
    return documentURLs;
  } catch (error: any) {
    log(`  ✗ Error fetching URLs: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch investment minimums
 */
async function fetchMinimums(proj_id: string): Promise<InvestmentMinimums | null> {
  log('Fetching investment minimums...', 'blue');

  try {
    const minimums = await fetchFundInvestmentMinimums(proj_id);

    if (!minimums || minimums.length === 0) {
      log('  ✗ No minimum data available', 'yellow');
      return null;
    }

    const minData = minimums[0]; // Usually only one record

    const investmentMinimums: InvestmentMinimums = {
      minimum_initial: minData.minimum_sub_ipo || null,
      minimum_additional: minData.minimum_sub || null,
      minimum_redemption: minData.minimum_redempt || null,
      minimum_balance: minData.lowbal_val || null,
    };

    log('  ✓ Found investment minimums', 'green');
    return investmentMinimums;
  } catch (error: any) {
    log(`  ✗ Error fetching minimums: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch fund policy (classification + management style) from API
 */
async function fetchPolicyMetadata(proj_id: string): Promise<{ classification: string; management_style: string } | null> {
  log('Fetching fund policy metadata...', 'blue');

  try {
    const policyData = await fetchFundPolicy(proj_id);

    if (!policyData) {
      log('  ✗ No policy data available', 'yellow');
      return null;
    }

    log(`  ✓ Classification: ${policyData.policy_desc}, Style: ${policyData.management_style}`, 'green');

    return {
      classification: policyData.policy_desc || 'Unknown',
      management_style: policyData.management_style || 'Unknown',
    };
  } catch (error: any) {
    log(`  ✗ Error fetching policy: ${error.message}`, 'red');
    return null;
  }
}

/**
 * Fetch dividend policy from API
 */
async function fetchDividendPolicyMetadata(proj_id: string): Promise<string> {
  log('Fetching dividend policy metadata...', 'blue');

  try {
    const dividendData = await fetchFundDividendPolicy(proj_id);

    if (!dividendData || !dividendData.dividend_policy) {
      log('  ✗ No dividend policy available', 'yellow');
      return 'Unknown';
    }

    log(`  ✓ Dividend Policy: ${dividendData.dividend_policy}`, 'green');
    return dividendData.dividend_policy;
  } catch (error: any) {
    log(`  ✗ Error fetching dividend policy: ${error.message}`, 'red');
    return 'Unknown';
  }
}

/**
 * Fetch risk level from API
 */
async function fetchRiskLevelMetadata(proj_id: string): Promise<number> {
  log('Fetching risk level metadata...', 'blue');

  try {
    const suitabilityData = await fetchFundSuitability(proj_id);

    if (!suitabilityData || !suitabilityData.risk_level) {
      log('  ✗ No risk level available', 'yellow');
      return 0;
    }

    log(`  ✓ Risk Level: ${suitabilityData.risk_level}`, 'green');
    return suitabilityData.risk_level;
  } catch (error: any) {
    log(`  ✗ Error fetching risk level: ${error.message}`, 'red');
    return 0;
  }
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Fetch complete data for a single RMF fund
 *
 * @param proj_id Fund project ID
 * @param basicInfo Basic fund information (symbol, fund_name, amc)
 * @returns Complete fund data including metadata fetched from API
 */
export async function fetchCompleteFundData(
  proj_id: string,
  basicInfo: { symbol: string; fund_name: string; amc: string }
): Promise<CompleteFundData> {
  const errors: string[] = [];

  logSection(`Fetching Complete Data for ${basicInfo.symbol}`);

  log(`Fund ID: ${proj_id}`, 'cyan');
  log(`Fund Name: ${basicInfo.fund_name}`, 'cyan');
  log(`AMC: ${basicInfo.amc}`, 'cyan');

  // METADATA FETCH (NEW): Fetch metadata from API instead of CSV
  logSection('Fetching Metadata from API');

  // 1. Fetch Fund Policy (classification + management style)
  const policyMetadata = await fetchPolicyMetadata(proj_id);
  if (!policyMetadata) errors.push('No policy metadata available');

  await sleep(100);

  // 2. Fetch Dividend Policy
  const dividendPolicy = await fetchDividendPolicyMetadata(proj_id);

  await sleep(100);

  // 3. Fetch Risk Level
  const riskLevel = await fetchRiskLevelMetadata(proj_id);

  await sleep(100);

  // DAILY DATA FETCH
  logSection('Fetching Daily Data');

  // 4. Fetch Latest NAV
  const latestNav = await fetchLatestNav(proj_id);
  if (!latestNav) errors.push('Failed to fetch latest NAV');

  await sleep(100);

  // 5. Fetch NAV History (30 days)
  const navHistory = latestNav
    ? await fetchNavHistory30d(proj_id, latestNav.nav_date)
    : [];
  if (navHistory.length === 0) errors.push('No NAV history available');

  await sleep(100);

  // 6. Fetch Dividend History
  const dividends = await fetchDividendHistory(proj_id);

  await sleep(100);

  // PERFORMANCE DATA FETCH
  logSection('Fetching Performance Data');

  // 7. Fetch Performance Metrics
  const performance = await fetchPerformanceMetrics(proj_id);
  if (!performance) errors.push('No performance data available');

  await sleep(100);

  // 8. Fetch Benchmark Data
  const benchmark = await fetchBenchmarkData(proj_id);
  if (!benchmark) errors.push('No benchmark data available');

  await sleep(100);

  // 9. Fetch Risk Metrics
  const riskMetrics = await fetchRiskMetrics(proj_id);
  if (!riskMetrics) errors.push('No risk metrics available');

  await sleep(100);

  // PORTFOLIO DATA FETCH
  logSection('Fetching Portfolio Data');

  // 10. Fetch Asset Allocation
  const assetAllocation = await fetchAssetAllocation(proj_id);
  if (!assetAllocation) errors.push('No asset allocation data available');

  await sleep(100);

  // 11. Fetch Fund Category
  const category = await fetchFundCategory(proj_id);
  if (!category) errors.push('No category data available');

  await sleep(100);

  // 12. Fetch Fee Structure
  const fees = await fetchFeeStructure(proj_id);
  if (!fees) errors.push('No fee data available');

  await sleep(100);

  // 13. Fetch Involved Parties
  const involvedParties = await fetchParties(proj_id);
  if (!involvedParties) errors.push('No involved parties data available');

  await sleep(100);

  // 14. Fetch Top 5 Holdings
  const topHoldings = await fetchTopHoldings(proj_id);
  if (!topHoldings) errors.push('No top holdings data available');

  await sleep(100);

  // 15. Fetch Risk Factors
  const riskFactors = await fetchRiskInfo(proj_id);
  if (!riskFactors) errors.push('No risk factors data available');

  await sleep(100);

  // 16. Fetch Suitability
  const suitability = await fetchSuitabilityInfo(proj_id);
  if (!suitability) errors.push('No suitability data available');

  await sleep(100);

  // 17. Fetch Document URLs
  const documentURLs = await fetchDocumentURLs(proj_id);
  if (!documentURLs) errors.push('No document URLs available');

  await sleep(100);

  // 18. Fetch Investment Minimums
  const investmentMinimums = await fetchMinimums(proj_id);
  if (!investmentMinimums) errors.push('No investment minimums data available');

  // Assemble complete data with API-sourced metadata
  const completeData: CompleteFundData = {
    fund_id: proj_id,
    symbol: basicInfo.symbol,
    fund_name: basicInfo.fund_name,
    amc: basicInfo.amc,
    metadata: {
      fund_classification: policyMetadata?.classification || 'Unknown',
      management_style: policyMetadata?.management_style || 'Unknown',
      dividend_policy: dividendPolicy,
      risk_level: riskLevel,
      fund_type: 'RMF',
    },
    latest_nav: latestNav,
    nav_history_30d: navHistory,
    dividends,
    performance,
    benchmark,
    risk_metrics: riskMetrics,
    asset_allocation: assetAllocation,
    category,
    fees,
    involved_parties: involvedParties,
    top_holdings: topHoldings,
    risk_factors: riskFactors,
    suitability,
    document_urls: documentURLs,
    investment_minimums: investmentMinimums,
    data_fetched_at: new Date().toISOString(),
    errors,
  };

  logSection('Data Fetch Complete');

  // Metadata
  log('\nMetadata (from API):', 'cyan');
  log(`  ✓ Fund Classification: ${policyMetadata?.classification || 'Unknown'}`, policyMetadata ? 'green' : 'red');
  log(`  ✓ Management Style: ${policyMetadata?.management_style || 'Unknown'}`, policyMetadata ? 'green' : 'red');
  log(`  ✓ Dividend Policy: ${dividendPolicy}`, 'green');
  log(`  ✓ Risk Level: ${riskLevel}`, riskLevel > 0 ? 'green' : 'red');

  // Daily Data
  log('\nDaily Data:', 'cyan');
  log(`  ✓ Latest NAV: ${latestNav ? 'Yes' : 'No'}`, latestNav ? 'green' : 'red');
  log(`  ✓ NAV History: ${navHistory.length} records`, navHistory.length > 0 ? 'green' : 'red');
  log(`  ✓ Dividends: ${dividends.length} records`, 'green');

  // Performance Data
  log('\nPerformance Data:', 'cyan');
  log(`  ✓ Performance: ${performance ? 'Yes' : 'No'}`, performance ? 'green' : 'red');
  log(`  ✓ Benchmark: ${benchmark ? 'Yes' : 'No'}`, benchmark ? 'green' : 'red');
  log(`  ✓ Risk Metrics: ${riskMetrics ? 'Yes' : 'No'}`, riskMetrics ? 'green' : 'red');

  // Portfolio Data
  log('\nPortfolio Data:', 'cyan');
  log(`  ✓ Asset Allocation: ${assetAllocation ? 'Yes' : 'No'}`, assetAllocation ? 'green' : 'red');
  log(`  ✓ Category: ${category ? 'Yes' : 'No'}`, category ? 'green' : 'red');
  log(`  ✓ Top Holdings: ${topHoldings ? 'Yes' : 'No'}`, topHoldings ? 'green' : 'red');

  // Fund Details
  log('\nFund Details:', 'cyan');
  log(`  ✓ Fees: ${fees ? 'Yes' : 'No'}`, fees ? 'green' : 'red');
  log(`  ✓ Involved Parties: ${involvedParties ? 'Yes' : 'No'}`, involvedParties ? 'green' : 'red');
  log(`  ✓ Risk Factors: ${riskFactors ? 'Yes' : 'No'}`, riskFactors ? 'green' : 'red');
  log(`  ✓ Suitability: ${suitability ? 'Yes' : 'No'}`, suitability ? 'green' : 'red');
  log(`  ✓ Document URLs: ${documentURLs ? 'Yes' : 'No'}`, documentURLs ? 'green' : 'red');
  log(`  ✓ Investment Minimums: ${investmentMinimums ? 'Yes' : 'No'}`, investmentMinimums ? 'green' : 'red');

  if (errors.length > 0) {
    log(`\nWarnings: ${errors.length}`, 'yellow');
    errors.forEach(err => log(`  - ${err}`, 'yellow'));
  }

  return completeData;
}

// ============================================================================
// CLI Execution
// ============================================================================

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'yellow');
  log('║        Comprehensive RMF Fund Data Fetcher - 100% API-Based Test         ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'yellow');

  // Clear cache for fresh test
  clearCache();

  // ABAPAC-RMF basic info (metadata will be fetched from API)
  const basicInfo = {
    symbol: 'ABAPAC-RMF',
    fund_name: 'abrdn Asia Pacific Equity Retirement Mutual Fund',
    amc: 'ABERDEEN ASSET MANAGEMENT (THAILAND) LIMITED',
  };

  const proj_id = 'M0774_2554'; // ABAPAC-RMF project ID

  try {
    // Fetch complete data (including metadata from API)
    const completeData = await fetchCompleteFundData(proj_id, basicInfo);

    // Create output directory
    const outputDir = join(process.cwd(), 'data', 'rmf-funds');
    mkdirSync(outputDir, { recursive: true });

    // Save to JSON file
    const outputPath = join(outputDir, `${metadata.symbol}.json`);
    writeFileSync(outputPath, JSON.stringify(completeData, null, 2), 'utf-8');

    logSection('Success!');
    log(`Data saved to: ${outputPath}`, 'green');
    log(`File size: ${(JSON.stringify(completeData).length / 1024).toFixed(2)} KB`, 'cyan');

    // Also output to console for inspection
    log('\nJSON Preview (first 50 lines):', 'blue');
    const jsonLines = JSON.stringify(completeData, null, 2).split('\n');
    console.log(jsonLines.slice(0, 50).join('\n'));
    if (jsonLines.length > 50) {
      log(`\n... (${jsonLines.length - 50} more lines)`, 'yellow');
    }

  } catch (error: any) {
    log('Error:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run main function
main();
