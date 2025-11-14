/**
 * Consolidate RMF Fund Data to CSV
 * 
 * Reads all 403 RMF fund JSON files and consolidates them into a single
 * flattened CSV file optimized for chatbot/LLM querying.
 * 
 * Output: docs/rmf-funds-consolidated.csv
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FundData {
  fund_id: string;
  symbol: string;
  fund_name: string;
  amc: string;
  metadata: {
    fund_classification: string;
    management_style: string;
    dividend_policy: string;
    risk_level: number;
    fund_type: string;
  };
  latest_nav: {
    nav_date: string;
    last_val: number;
    previous_val: number;
    net_asset: number;
    buy_price: number;
    sell_price: number;
    change: number;
    change_percent: number;
    last_upd_date: string;
  } | null;
  nav_history_30d: Array<{
    nav_date: string;
    last_val: number;
    previous_val: number;
    net_asset: number;
    buy_price: number;
    sell_price: number;
  }>;
  dividends: Array<{
    dividend_date: string;
    dividend_per_unit: number;
    ex_dividend_date: string;
    record_date: string;
    payment_date: string;
  }>;
  performance: {
    ytd: number | null;
    '3m': number | null;
    '6m': number | null;
    '1y': number | null;
    '3y': number | null;
    '5y': number | null;
    '10y': number | null;
    since_inception: number | null;
  } | null;
  benchmark: {
    name: string;
    returns: {
      ytd: number | null;
      '3m': number | null;
      '6m': number | null;
      '1y': number | null;
      '3y': number | null;
      '5y': number | null;
      '10y': number | null;
    };
  } | null;
  risk_metrics: any;
  asset_allocation: Array<{
    asset_class: string;
    percentage: number;
  }> | null;
  category: any;
  fees: Array<any>;
  involved_parties: Array<any> | null;
  top_holdings: any;
  risk_factors: Array<{
    risk_type: string;
    risk_desc: string;
  }> | null;
  suitability: {
    investment_horizon: string | null;
    risk_level: string | null;
    target_investor: string | null;
  };
  document_urls: {
    factsheet_url: string;
    annual_report_url: string;
    halfyear_report_url: string;
  };
  investment_minimums: {
    minimum_initial: string | null;
    minimum_additional: string | null;
    minimum_redemption: string | null;
    minimum_balance: string | null;
  };
  data_fetched_at: string;
  errors: string[];
}

interface CSVRow {
  // Core
  fund_id: string;
  symbol: string;
  fund_name: string;
  amc: string;
  
  // Metadata
  fund_classification: string;
  management_style: string;
  dividend_policy: string;
  risk_level: string;
  fund_type: string;
  
  // Latest NAV
  nav_date: string;
  nav_value: string;
  nav_change: string;
  nav_change_percent: string;
  net_asset: string;
  buy_price: string;
  sell_price: string;
  
  // NAV History Summary
  nav_history_count: string;
  nav_history_first_date: string;
  nav_history_last_date: string;
  nav_history_min: string;
  nav_history_max: string;
  
  // Performance
  perf_ytd: string;
  perf_3m: string;
  perf_6m: string;
  perf_1y: string;
  perf_3y: string;
  perf_5y: string;
  perf_10y: string;
  perf_since_inception: string;
  
  // Benchmark
  benchmark_name: string;
  benchmark_ytd: string;
  benchmark_3m: string;
  benchmark_6m: string;
  benchmark_1y: string;
  benchmark_3y: string;
  benchmark_5y: string;
  benchmark_10y: string;
  
  // Dividends
  dividends_count: string;
  dividends_total: string;
  dividends_last_date: string;
  
  // Asset Allocation
  asset_allocation_json: string;
  
  // Fees
  fees_count: string;
  fees_json: string;
  
  // Involved Parties
  parties_count: string;
  parties_json: string;
  
  // Risk Factors
  risk_factors_count: string;
  risk_factors_json: string;
  
  // Suitability
  suitability_investment_horizon: string;
  suitability_risk_level: string;
  suitability_target_investor: string;
  
  // Documents
  factsheet_url: string;
  annual_report_url: string;
  halfyear_report_url: string;
  
  // Investment Minimums
  min_initial: string;
  min_additional: string;
  min_redemption: string;
  min_balance: string;
  
  // Metadata
  data_fetched_at: string;
  errors_count: string;
  errors_json: string;
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

function convertFundToCSVRow(fund: FundData): CSVRow {
  // Helper to format null values
  const fmt = (val: any): string => val !== null && val !== undefined ? String(val) : '';
  
  // Calculate NAV history stats
  const navHistory = fund.nav_history_30d || [];
  const navValues = navHistory.map(h => h.last_val).filter(v => v !== null && v !== undefined);
  
  // Calculate dividend stats
  const dividends = fund.dividends || [];
  const dividendTotal = dividends.reduce((sum, d) => sum + (d.dividend_per_unit || 0), 0);
  const lastDividend = dividends.length > 0 ? dividends[dividends.length - 1] : null;
  
  return {
    // Core
    fund_id: fmt(fund.fund_id),
    symbol: fmt(fund.symbol),
    fund_name: fmt(fund.fund_name),
    amc: fmt(fund.amc),
    
    // Metadata
    fund_classification: fmt(fund.metadata?.fund_classification),
    management_style: fmt(fund.metadata?.management_style),
    dividend_policy: fmt(fund.metadata?.dividend_policy),
    risk_level: fmt(fund.metadata?.risk_level),
    fund_type: fmt(fund.metadata?.fund_type),
    
    // Latest NAV
    nav_date: fmt(fund.latest_nav?.nav_date),
    nav_value: fmt(fund.latest_nav?.last_val),
    nav_change: fmt(fund.latest_nav?.change),
    nav_change_percent: fmt(fund.latest_nav?.change_percent),
    net_asset: fmt(fund.latest_nav?.net_asset),
    buy_price: fmt(fund.latest_nav?.buy_price),
    sell_price: fmt(fund.latest_nav?.sell_price),
    
    // NAV History Summary
    nav_history_count: fmt(navHistory.length),
    nav_history_first_date: navHistory.length > 0 ? fmt(navHistory[0].nav_date) : '',
    nav_history_last_date: navHistory.length > 0 ? fmt(navHistory[navHistory.length - 1].nav_date) : '',
    nav_history_min: navValues.length > 0 ? fmt(Math.min(...navValues)) : '',
    nav_history_max: navValues.length > 0 ? fmt(Math.max(...navValues)) : '',
    
    // Performance
    perf_ytd: fmt(fund.performance?.ytd),
    perf_3m: fmt(fund.performance?.['3m']),
    perf_6m: fmt(fund.performance?.['6m']),
    perf_1y: fmt(fund.performance?.['1y']),
    perf_3y: fmt(fund.performance?.['3y']),
    perf_5y: fmt(fund.performance?.['5y']),
    perf_10y: fmt(fund.performance?.['10y']),
    perf_since_inception: fmt(fund.performance?.since_inception),
    
    // Benchmark
    benchmark_name: fmt(fund.benchmark?.name),
    benchmark_ytd: fmt(fund.benchmark?.returns?.ytd),
    benchmark_3m: fmt(fund.benchmark?.returns?.['3m']),
    benchmark_6m: fmt(fund.benchmark?.returns?.['6m']),
    benchmark_1y: fmt(fund.benchmark?.returns?.['1y']),
    benchmark_3y: fmt(fund.benchmark?.returns?.['3y']),
    benchmark_5y: fmt(fund.benchmark?.returns?.['5y']),
    benchmark_10y: fmt(fund.benchmark?.returns?.['10y']),
    
    // Dividends
    dividends_count: fmt(dividends.length),
    dividends_total: dividends.length > 0 ? fmt(dividendTotal.toFixed(4)) : '',
    dividends_last_date: lastDividend ? fmt(lastDividend.dividend_date) : '',
    
    // Asset Allocation
    asset_allocation_json: fund.asset_allocation ? JSON.stringify(fund.asset_allocation) : '',
    
    // Fees
    fees_count: fmt(fund.fees?.length || 0),
    fees_json: fund.fees ? JSON.stringify(fund.fees) : '',
    
    // Involved Parties
    parties_count: fmt(fund.involved_parties?.length || 0),
    parties_json: fund.involved_parties ? JSON.stringify(fund.involved_parties) : '',
    
    // Risk Factors
    risk_factors_count: fmt(fund.risk_factors?.length || 0),
    risk_factors_json: fund.risk_factors ? JSON.stringify(fund.risk_factors) : '',
    
    // Suitability
    suitability_investment_horizon: fmt(fund.suitability?.investment_horizon),
    suitability_risk_level: fmt(fund.suitability?.risk_level),
    suitability_target_investor: fmt(fund.suitability?.target_investor),
    
    // Documents
    factsheet_url: fmt(fund.document_urls?.factsheet_url),
    annual_report_url: fmt(fund.document_urls?.annual_report_url),
    halfyear_report_url: fmt(fund.document_urls?.halfyear_report_url),
    
    // Investment Minimums
    min_initial: fmt(fund.investment_minimums?.minimum_initial),
    min_additional: fmt(fund.investment_minimums?.minimum_additional),
    min_redemption: fmt(fund.investment_minimums?.minimum_redemption),
    min_balance: fmt(fund.investment_minimums?.minimum_balance),
    
    // Metadata
    data_fetched_at: fmt(fund.data_fetched_at),
    errors_count: fmt(fund.errors?.length || 0),
    errors_json: fund.errors ? JSON.stringify(fund.errors) : '',
  };
}

function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║           Consolidate RMF Fund Data to CSV                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
  
  // Read all JSON files
  const dataDir = join(process.cwd(), 'data', 'rmf-funds');
  const files = readdirSync(dataDir).filter(f => f.endsWith('.json')).sort();
  
  console.log(`Found ${files.length} fund files\n`);
  
  const rows: CSVRow[] = [];
  let processed = 0;
  let errors = 0;
  
  for (const file of files) {
    try {
      const filePath = join(dataDir, file);
      const content = readFileSync(filePath, 'utf-8');
      const fund: FundData = JSON.parse(content);
      
      const row = convertFundToCSVRow(fund);
      rows.push(row);
      processed++;
      
      if (processed % 50 === 0) {
        console.log(`Processed ${processed}/${files.length} funds...`);
      }
    } catch (error: any) {
      console.error(`Error processing ${file}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\nProcessed ${processed} funds successfully`);
  if (errors > 0) {
    console.log(`Failed: ${errors} funds`);
  }
  
  // Generate CSV header
  const headers = Object.keys(rows[0]) as Array<keyof CSVRow>;
  const headerRow = headers.map(h => escapeCSV(h)).join(',');
  
  // Generate CSV rows
  const csvRows = rows.map(row => {
    return headers.map(h => escapeCSV(row[h])).join(',');
  });
  
  // Combine header and rows
  const csvContent = [headerRow, ...csvRows].join('\n');
  
  // Write to file
  const outputPath = join(process.cwd(), 'docs', 'rmf-funds-consolidated.csv');
  writeFileSync(outputPath, csvContent, 'utf-8');
  
  const fileSizeKB = (csvContent.length / 1024).toFixed(2);
  const columns = headers.length;
  
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                             SUCCESS!                                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nOutput: ${outputPath}`);
  console.log(`Rows: ${rows.length + 1} (including header)`);
  console.log(`Columns: ${columns}`);
  console.log(`File size: ${fileSizeKB} KB`);
  console.log('\nReady for chatbot/LLM consumption!\n');
}

main();

