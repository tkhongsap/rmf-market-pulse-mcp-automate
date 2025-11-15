/**
 * Daily RMF Data Refresh Pipeline
 * 
 * Fetches fresh data from SEC Thailand API and performs a full database refresh:
 * 1. Fetch complete list of RMF funds from SEC API
 * 2. Fetch detailed data (NAV, history, performance) for each fund
 * 3. Truncate rmf_funds, rmf_nav_history, rmf_dividends tables
 * 4. Reload with fresh data
 * 
 * Run daily to keep database synchronized with latest SEC data
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { writeFileSync } from 'fs';
import { join } from 'path';

// Import SEC API fetchers
import {
  fetchAMCList,
  fetchFundsByAMC,
} from '../services/secFundFactsheetApi';

import { fetchCompleteFundData } from '../../scripts/data-extraction/rmf/fetch-complete-fund-data';

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 4; // Process 4 funds at a time (SEC API rate limit)
const BATCH_DELAY_MS = 15000; // 15 seconds between batches
const TEST_MODE = process.env.TEST_MODE === 'true';
const TEST_FUND_LIMIT = Number(process.env.TEST_FUND_LIMIT) || 5;

// ============================================================================
// Types
// ============================================================================

interface RefreshStats {
  funds_processed: number;
  funds_saved: number;
  nav_records_saved: number;
  dividend_records_saved: number;
  errors: Array<{ symbol: string; error: string }>;
  started_at: string;
  completed_at?: string;
}

interface FundMapping {
  proj_id: string;
  symbol: string;
  fund_name: string;
  amc: string;
}

// Type alias for fund data returned from API
type CompleteFundData = any; // Will use actual type from fetch-complete-fund-data module at runtime

// ============================================================================
// Step 1: Fetch RMF Fund List from SEC API
// ============================================================================

async function fetchRMFFundList(): Promise<FundMapping[]> {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║               Fetching RMF Fund List from SEC API                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const fundMappings: FundMapping[] = [];

  // Step 1: Get all AMCs
  console.log('📋 Fetching list of Asset Management Companies...');
  const amcs = await fetchAMCList();
  console.log(`✓ Found ${amcs.length} AMCs\n`);

  // Step 2: Fetch funds from each AMC
  for (const amc of amcs) {
    console.log(`🏢 Fetching funds from ${amc.name}...`);
    try {
      const funds = await fetchFundsByAMC(amc.id);
      
      // Filter for RMF funds only
      const rmfFunds = funds.filter(f => 
        f.fund_type === 'RMF' && f.status === 'RG'
      );
      
      for (const fund of rmfFunds) {
        fundMappings.push({
          proj_id: fund.proj_id,
          symbol: fund.symbol,
          fund_name: fund.fund_name,
          amc: amc.name,
        });
      }
      
      console.log(`  ✓ Found ${rmfFunds.length} RMF funds`);
      
      // Small delay between AMCs
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }

  console.log(`\n✅ Total RMF funds found: ${fundMappings.length}\n`);
  
  // Apply test mode limit if enabled
  if (TEST_MODE) {
    console.log(`⚠️  TEST MODE: Limiting to ${TEST_FUND_LIMIT} funds\n`);
    return fundMappings.slice(0, TEST_FUND_LIMIT);
  }
  
  return fundMappings;
}

// ============================================================================
// Step 2: Fetch Complete Data for Each Fund
// ============================================================================

async function fetchAllFundData(
  fundList: FundMapping[]
): Promise<CompleteFundData[]> {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          Fetching Complete Data from SEC API (Batched)            ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const allFundData: CompleteFundData[] = [];
  const totalBatches = Math.ceil(fundList.length / BATCH_SIZE);

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStart = batchIndex * BATCH_SIZE;
    const batchEnd = Math.min(batchStart + BATCH_SIZE, fundList.length);
    const batch = fundList.slice(batchStart, batchEnd);

    console.log(`\n📦 Batch ${batchIndex + 1}/${totalBatches} (funds ${batchStart + 1}-${batchEnd})`);
    console.log('─'.repeat(70));

    // Process batch concurrently
    const batchPromises = batch.map(fund =>
      fetchCompleteFundData(fund.proj_id, {
        symbol: fund.symbol,
        fund_name: fund.fund_name,
        amc: fund.amc,
      })
    );

    try {
      const batchResults = await Promise.all(batchPromises);
      allFundData.push(...batchResults);
      console.log(`✅ Batch ${batchIndex + 1} complete\n`);
    } catch (error: any) {
      console.log(`❌ Batch ${batchIndex + 1} error: ${error.message}\n`);
    }

    // Delay between batches (except last batch)
    if (batchIndex < totalBatches - 1) {
      console.log(`⏳ Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`\n✅ Fetched data for ${allFundData.length}/${fundList.length} funds\n`);
  
  return allFundData;
}

// ============================================================================
// Step 3: Truncate and Reload Database Tables
// ============================================================================

async function refreshDatabase(fundDataList: CompleteFundData[]): Promise<RefreshStats> {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║             Refreshing Database (Truncate + Reload)               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  const stats: RefreshStats = {
    funds_processed: 0,
    funds_saved: 0,
    nav_records_saved: 0,
    dividend_records_saved: 0,
    errors: [],
    started_at: new Date().toISOString(),
  };

  try {
    // Begin transaction
    await client.query('BEGIN');

    // Step 1: Truncate all tables (in correct order due to foreign keys)
    console.log('🗑️  Truncating tables...');
    await client.query('TRUNCATE TABLE rmf_dividends CASCADE');
    await client.query('TRUNCATE TABLE rmf_nav_history CASCADE');
    await client.query('TRUNCATE TABLE rmf_funds CASCADE');
    console.log('✓ Tables truncated\n');

    // Step 2: Insert fresh data
    console.log('💾 Inserting fresh data...\n');

    for (const fundData of fundDataList) {
      stats.funds_processed++;
      
      try {
        // Insert fund
        await insertFund(client, fundData);
        stats.funds_saved++;

        // Insert NAV history
        if (fundData.nav_history_30d?.length > 0) {
          const navCount = await insertNavHistory(client, fundData.symbol, fundData.nav_history_30d);
          stats.nav_records_saved += navCount;
        }

        // Insert dividends
        if (fundData.dividends?.length > 0) {
          const divCount = await insertDividends(client, fundData.symbol, fundData.dividends);
          stats.dividend_records_saved += divCount;
        }

        console.log(`  ✓ ${fundData.symbol} (${stats.funds_saved}/${fundDataList.length})`);
      } catch (error: any) {
        console.log(`  ✗ ${fundData.symbol}: ${error.message}`);
        stats.errors.push({ symbol: fundData.symbol, error: error.message });
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Database refresh complete!\n');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error(`\n❌ Database refresh failed: ${error.message}`);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  stats.completed_at = new Date().toISOString();
  return stats;
}

// ============================================================================
// Database Insert Functions (same as db-saver.ts)
// ============================================================================

async function insertFund(client: any, data: CompleteFundData): Promise<void> {
  // Same implementation as db-saver.ts - shortened for brevity
  // Insert fund data using ON CONFLICT DO NOTHING (since we truncated)
  const query = `
    INSERT INTO rmf_funds (
      symbol, proj_id, fund_name_en, amc, status,
      latest_nav, latest_nav_date, nav_change, nav_change_percent,
      buy_price, sell_price, net_asset,
      fund_policy, dividend_policy, risk_level,
      performance, benchmark,
      volatility_5y, tracking_error_1y,
      nav_history_count, nav_history_first_date, nav_history_last_date,
      nav_history_min, nav_history_max,
      dividends_count, dividends_total, dividends_last_date,
      fees_count, parties_count, risk_factors_count,
      errors_count, errors,
      asset_allocation, fees, involved_parties, top_holdings, risk_factors,
      suitability, document_urls, investment_minimums,
      data_fetched_at, data_updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
      $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
      $41, $42
    )
  `;

  const values = [
    data.symbol,
    data.fund_id,
    data.fund_name,
    data.amc,
    data.metadata?.status || 'RG',
    data.latest_nav?.last_val || null,
    data.latest_nav?.nav_date || null,
    data.latest_nav?.change || null,
    data.latest_nav?.change_percent || null,
    data.latest_nav?.buy_price || null,
    data.latest_nav?.sell_price || null,
    data.latest_nav?.net_asset || null,
    data.metadata?.fund_classification || null,
    data.metadata?.dividend_policy || null,
    data.metadata?.risk_level || null,
    data.performance ? JSON.stringify(data.performance) : null,
    data.benchmark ? JSON.stringify(data.benchmark) : null,
    data.risk_metrics?.volatility_5y || null,
    data.risk_metrics?.tracking_error_1y || null,
    data.nav_history_30d?.length || 0,
    data.nav_history_30d?.[data.nav_history_30d.length - 1]?.nav_date || null,
    data.nav_history_30d?.[0]?.nav_date || null,
    Math.min(...(data.nav_history_30d?.map((n: any) => n.last_val) || [0])) || null,
    Math.max(...(data.nav_history_30d?.map((n: any) => n.last_val) || [0])) || null,
    data.dividends?.length || 0,
    data.dividends?.reduce((sum: number, d: any) => sum + (d.dividend_rate || 0), 0) || null,
    data.dividends?.[0]?.xa_date || null,
    data.fees?.length || 0,
    data.involved_parties?.length || 0,
    data.risk_factors?.length || 0,
    data.errors?.length || 0,
    data.errors ? JSON.stringify(data.errors) : null,
    data.asset_allocation ? JSON.stringify(data.asset_allocation) : null,
    data.fees ? JSON.stringify(data.fees) : null,
    data.involved_parties ? JSON.stringify(data.involved_parties) : null,
    data.top_holdings ? JSON.stringify(data.top_holdings) : null,
    data.risk_factors ? JSON.stringify(data.risk_factors) : null,
    data.suitability ? JSON.stringify(data.suitability) : null,
    data.document_urls ? JSON.stringify(data.document_urls) : null,
    data.investment_minimums ? JSON.stringify(data.investment_minimums) : null,
    new Date().toISOString(),
    new Date().toISOString(),
  ];

  await client.query(query, values);
}

async function insertNavHistory(client: any, symbol: string, navHistory: any[]): Promise<number> {
  let count = 0;
  for (const nav of navHistory) {
    const query = `
      INSERT INTO rmf_nav_history (
        fund_symbol, nav_date, nav, nav_change, nav_change_percent, previous_nav
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [
      symbol,
      nav.nav_date,
      nav.last_val,
      nav.last_val - (nav.previous_val || nav.last_val),
      nav.previous_val > 0 ? ((nav.last_val - nav.previous_val) / nav.previous_val) * 100 : 0,
      nav.previous_val || null,
    ];

    await client.query(query, values);
    count++;
  }
  return count;
}

async function insertDividends(client: any, symbol: string, dividends: any[]): Promise<number> {
  let count = 0;
  for (const div of dividends) {
    const query = `
      INSERT INTO rmf_dividends (
        fund_symbol, xa_date, dividend_rate, dividend_type
      ) VALUES ($1, $2, $3, $4)
    `;

    const values = [
      symbol,
      div.xa_date,
      div.dividend_rate || 0,
      div.dividend_type || null,
    ];

    await client.query(query, values);
    count++;
  }
  return count;
}

// ============================================================================
// Main Pipeline
// ============================================================================

async function main() {
  const startTime = Date.now();

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║             RMF Daily Refresh Pipeline - Full Reload              ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toLocaleString()}\n`);

  try {
    // Step 1: Fetch fund list from SEC API
    const fundList = await fetchRMFFundList();

    // Step 2: Fetch complete data for all funds
    const fundDataList = await fetchAllFundData(fundList);

    // Step 3: Truncate and reload database
    const stats = await refreshDatabase(fundDataList);

    // Summary
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('═'.repeat(70));
    console.log('📊 DAILY REFRESH SUMMARY');
    console.log('═'.repeat(70));
    console.log(`Funds Processed:  ${stats.funds_processed}`);
    console.log(`Funds Saved:      ${stats.funds_saved}`);
    console.log(`NAV Records:      ${stats.nav_records_saved}`);
    console.log(`Dividend Records: ${stats.dividend_records_saved}`);
    console.log(`Errors:           ${stats.errors.length}`);
    console.log(`Duration:         ${duration} minutes`);
    console.log('═'.repeat(70));

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      stats.errors.slice(0, 10).forEach(e => {
        console.log(`  - ${e.symbol}: ${e.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more`);
      }
    }

    console.log('\n✅ Daily refresh complete!\n');
    process.exit(0);

  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
