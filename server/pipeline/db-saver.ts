/**
 * Database Saver for RMF Pipeline
 * 
 * Saves fund data from JSON files to PostgreSQL database
 * Features: Batch processing, progress checkpointing, resume capability
 */

import { Pool, PoolClient } from 'pg';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 10; // Process 10 funds per batch
const CHECKPOINT_FILE = join(process.cwd(), '.db-progress.json');

// ============================================================================
// Types
// ============================================================================

interface FundData {
  fund_id: string;
  symbol: string;
  fund_name: string;
  amc: string;
  metadata?: {
    fund_classification?: string;
    management_style?: string;
    dividend_policy?: string;
    risk_level?: number;
    fund_type?: string;
    status?: string;
  };
  latest_nav?: {
    nav_date: string;
    last_val: number;
    previous_val?: number;
    buy_price?: number;
    sell_price?: number;
    change?: number;
    change_percent?: number;
  };
  nav_history_30d?: Array<{
    nav_date: string;
    last_val: number;
    previous_val?: number;
    buy_price?: number;
    sell_price?: number;
  }>;
  dividends?: Array<{
    xa_date: string;
    dvidend_rate: number;
    dvi_type?: string;
  }>;
  performance?: any;
  benchmark?: any;
  asset_allocation?: any;
  fees?: any;
  involved_parties?: any;
  top_holdings?: any;
  risk_factors?: any;
  suitability?: any;
  document_urls?: any;
  investment_minimums?: any;
  data_fetched_at?: string;
  errors: string[];
}

interface SaveStats {
  funds_processed: number;
  funds_saved: number;
  nav_records_saved: number;
  dividend_records_saved: number;
  errors: Array<{ symbol: string; error: string }>;
}

interface ProgressCheckpoint {
  last_batch_completed: number;
  total_batches: number;
  funds_processed: number;
  timestamp: string;
}

// ============================================================================
// Progress Checkpoint Functions
// ============================================================================

function loadCheckpoint(): ProgressCheckpoint | null {
  if (!existsSync(CHECKPOINT_FILE)) {
    return null;
  }
  
  try {
    const data = readFileSync(CHECKPOINT_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Validate it's a real checkpoint (not a "cleared" marker)
    if (parsed.cleared) {
      return null;
    }
    
    // Check for required fields (allow last_batch_completed to be 0)
    if (typeof parsed.last_batch_completed !== 'number' || typeof parsed.total_batches !== 'number') {
      return null;
    }
    
    return parsed as ProgressCheckpoint;
  } catch {
    return null;
  }
}

function saveCheckpoint(checkpoint: ProgressCheckpoint): void {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
}

function clearCheckpoint(): void {
  if (existsSync(CHECKPOINT_FILE)) {
    writeFileSync(CHECKPOINT_FILE, JSON.stringify({ cleared: true, timestamp: new Date().toISOString() }));
  }
}

// ============================================================================
// Database Clear Function
// ============================================================================

async function clearDatabase(client: PoolClient): Promise<void> {
  console.log(`\n🗑️  Clearing database tables...`);

  try {
    // Truncate all tables (CASCADE will handle foreign key constraints)
    await client.query('TRUNCATE TABLE rmf_dividends, rmf_nav_history, rmf_funds CASCADE');
    console.log(`✅ Database cleared successfully\n`);
  } catch (error: any) {
    console.error(`❌ Error clearing database: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// Batch Processing Function
// ============================================================================

export async function saveFundsToDBInBatches(
  fundFiles: string[],
  dataDir: string = join(process.cwd(), 'data', 'rmf-funds'),
  clearDB: boolean = false
): Promise<SaveStats> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Calculate batches
  const totalBatches = Math.ceil(fundFiles.length / BATCH_SIZE);
  let startBatch = 0;
  
  // Initialize stats (may be restored from checkpoint)
  const stats: SaveStats = {
    funds_processed: 0,
    funds_saved: 0,
    nav_records_saved: 0,
    dividend_records_saved: 0,
    errors: [],
  };

  // Check for existing progress
  const checkpoint = loadCheckpoint();
  if (checkpoint && !clearDB && checkpoint.last_batch_completed < totalBatches - 1) {
    console.log(`\n📂 Found checkpoint: ${checkpoint.funds_processed} funds already processed`);
    console.log(`   Resuming from batch ${checkpoint.last_batch_completed + 2}/${totalBatches}\n`);
    startBatch = checkpoint.last_batch_completed + 1;
    
    // Restore cumulative progress
    stats.funds_processed = checkpoint.funds_processed || 0;
    stats.funds_saved = checkpoint.funds_processed || 0; // Approximate
  } else if (clearDB) {
    console.log(`\n🔄 Clear mode enabled - starting fresh\n`);
    clearCheckpoint();
  }

  // Clear database if requested
  if (clearDB) {
    const client = await pool.connect();
    try {
      await clearDatabase(client);
    } finally {
      client.release();
    }
  }

  console.log(`\n🗄️  Processing ${fundFiles.length} funds in ${totalBatches} batches (${BATCH_SIZE} per batch)\n`);

  // Process each batch
  for (let batchIndex = startBatch; batchIndex < totalBatches; batchIndex++) {
    const client = await pool.connect();
    
    try {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, fundFiles.length);
      const batchFiles = fundFiles.slice(batchStart, batchEnd);

      console.log(`\n📦 Batch ${batchIndex + 1}/${totalBatches} (funds ${batchStart + 1}-${batchEnd})`);
      console.log(`${'─'.repeat(60)}`);

      // Process each fund in the batch
      for (const file of batchFiles) {
        try {
          await client.query('BEGIN');
          
          const filePath = join(dataDir, file);
          const fundData: FundData = JSON.parse(readFileSync(filePath, 'utf-8'));

          stats.funds_processed++;

          // Insert fund data
          await insertFund(client, fundData);
          stats.funds_saved++;

          // Insert NAV history
          if (fundData.nav_history_30d && fundData.nav_history_30d.length > 0) {
            const navCount = await insertNavHistory(client, fundData.symbol, fundData.nav_history_30d);
            stats.nav_records_saved += navCount;
          }

          // Insert dividends
          if (fundData.dividends && fundData.dividends.length > 0) {
            const divCount = await insertDividends(client, fundData.symbol, fundData.dividends);
            stats.dividend_records_saved += divCount;
          }

          await client.query('COMMIT');
          console.log(`  ✓ ${fundData.symbol} (${stats.funds_processed}/${fundFiles.length})`);

        } catch (error: any) {
          await client.query('ROLLBACK');
          const symbol = file.replace('.json', '');
          console.log(`  ✗ ${symbol}: ${error.message}`);
          stats.errors.push({ symbol, error: error.message });
        }
      }

      // Save checkpoint after each batch
      const checkpoint: ProgressCheckpoint = {
        last_batch_completed: batchIndex,
        total_batches: totalBatches,
        funds_processed: stats.funds_processed,
        timestamp: new Date().toISOString(),
      };
      saveCheckpoint(checkpoint);

      console.log(`✅ Batch ${batchIndex + 1} complete (${stats.funds_saved}/${stats.funds_processed} saved)`);

    } catch (error: any) {
      console.error(`❌ Error in batch ${batchIndex + 1}: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  }

  await pool.end();

  console.log(`\n✅ All batches completed!`);
  console.log(`   Funds saved: ${stats.funds_saved}/${stats.funds_processed}`);
  console.log(`   NAV records: ${stats.nav_records_saved}`);
  console.log(`   Dividend records: ${stats.dividend_records_saved}`);

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(({ symbol, error }) => {
      console.log(`   - ${symbol}: ${error}`);
    });
  }

  // Clear checkpoint on successful completion
  clearCheckpoint();

  return stats;
}

// ============================================================================
// Database Insert Functions
// ============================================================================

async function insertFund(client: PoolClient, fund: FundData): Promise<void> {
  const query = `
    INSERT INTO rmf_funds (
      symbol, proj_id, fund_name_en, fund_name_th, amc, status,
      latest_nav, latest_nav_date, nav_change, nav_change_percent,
      buy_price, sell_price,
      risk_level, dividend_policy, fund_policy, fund_category,
      fund_type, management_style, net_asset,
      volatility_5y, tracking_error_1y,
      nav_history_count, nav_history_first_date, nav_history_last_date,
      nav_history_min, nav_history_max,
      dividends_count, dividends_total, dividends_last_date,
      fees_count, parties_count, risk_factors_count,
      errors_count, errors,
      performance, benchmark, asset_allocation, fees,
      involved_parties, top_holdings, risk_factors, suitability,
      document_urls, investment_minimums, data_fetched_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
    )
    ON CONFLICT (symbol) DO UPDATE SET
      proj_id = EXCLUDED.proj_id,
      fund_name_en = EXCLUDED.fund_name_en,
      amc = EXCLUDED.amc,
      status = EXCLUDED.status,
      latest_nav = EXCLUDED.latest_nav,
      latest_nav_date = EXCLUDED.latest_nav_date,
      nav_change = EXCLUDED.nav_change,
      nav_change_percent = EXCLUDED.nav_change_percent,
      buy_price = EXCLUDED.buy_price,
      sell_price = EXCLUDED.sell_price,
      risk_level = EXCLUDED.risk_level,
      dividend_policy = EXCLUDED.dividend_policy,
      fund_policy = EXCLUDED.fund_policy,
      fund_category = EXCLUDED.fund_category,
      fund_type = EXCLUDED.fund_type,
      management_style = EXCLUDED.management_style,
      net_asset = EXCLUDED.net_asset,
      volatility_5y = EXCLUDED.volatility_5y,
      tracking_error_1y = EXCLUDED.tracking_error_1y,
      nav_history_count = EXCLUDED.nav_history_count,
      nav_history_first_date = EXCLUDED.nav_history_first_date,
      nav_history_last_date = EXCLUDED.nav_history_last_date,
      nav_history_min = EXCLUDED.nav_history_min,
      nav_history_max = EXCLUDED.nav_history_max,
      dividends_count = EXCLUDED.dividends_count,
      dividends_total = EXCLUDED.dividends_total,
      dividends_last_date = EXCLUDED.dividends_last_date,
      fees_count = EXCLUDED.fees_count,
      parties_count = EXCLUDED.parties_count,
      risk_factors_count = EXCLUDED.risk_factors_count,
      errors_count = EXCLUDED.errors_count,
      errors = EXCLUDED.errors,
      performance = EXCLUDED.performance,
      benchmark = EXCLUDED.benchmark,
      asset_allocation = EXCLUDED.asset_allocation,
      fees = EXCLUDED.fees,
      involved_parties = EXCLUDED.involved_parties,
      top_holdings = EXCLUDED.top_holdings,
      risk_factors = EXCLUDED.risk_factors,
      suitability = EXCLUDED.suitability,
      document_urls = EXCLUDED.document_urls,
      investment_minimums = EXCLUDED.investment_minimums,
      data_fetched_at = EXCLUDED.data_fetched_at,
      data_updated_at = NOW()
  `;

  const riskMetrics = (fund as any).risk_metrics || {};
  const category = (fund as any).category || null;

  // Calculate NAV history statistics
  let navHistoryCount = 0;
  let navHistoryFirstDate = null;
  let navHistoryLastDate = null;
  let navHistoryMin = null;
  let navHistoryMax = null;

  if (fund.nav_history_30d && fund.nav_history_30d.length > 0) {
    navHistoryCount = fund.nav_history_30d.length;
    const navValues = fund.nav_history_30d.map(n => n.last_val).filter(v => v != null);

    if (navValues.length > 0) {
      navHistoryMin = Math.min(...navValues);
      navHistoryMax = Math.max(...navValues);
    }

    // Dates (assuming array is sorted by date)
    navHistoryFirstDate = fund.nav_history_30d[fund.nav_history_30d.length - 1]?.nav_date || null;
    navHistoryLastDate = fund.nav_history_30d[0]?.nav_date || null;
  }

  // Calculate dividend statistics
  let dividendsCount = 0;
  let dividendsTotal = 0;
  let dividendsLastDate = null;

  if (fund.dividends && fund.dividends.length > 0) {
    dividendsCount = fund.dividends.length;
    dividendsTotal = fund.dividends.reduce((sum, d) => {
      const rate = (d as any).dividend_rate || (d as any).dvidend_rate || 0;
      return sum + rate;
    }, 0);
    dividendsLastDate = fund.dividends[0]?.xa_date || null;
  }

  // Calculate metadata counts
  const feesCount = fund.fees ? (Array.isArray(fund.fees) ? fund.fees.length : Object.keys(fund.fees).length) : 0;
  const partiesCount = fund.involved_parties ? (Array.isArray(fund.involved_parties) ? fund.involved_parties.length : 0) : 0;
  const riskFactorsCount = fund.risk_factors ? (Array.isArray(fund.risk_factors) ? fund.risk_factors.length : 0) : 0;

  // Error tracking
  const errorsCount = fund.errors ? fund.errors.length : 0;
  const errorsJson = fund.errors && fund.errors.length > 0 ? JSON.stringify(fund.errors) : null;

  // Extract additional fields from metadata
  const fundType = fund.metadata?.fund_type || null;
  const managementStyle = fund.metadata?.management_style || null;

  // Extract net_asset from latest_nav or metadata
  const netAsset = (fund.latest_nav as any)?.net_asset || (fund as any).net_asset || null;

  const values = [
    fund.symbol,                                             // $1
    fund.fund_id,                                            // $2
    fund.fund_name,                                          // $3
    null,                                                    // $4 - fund_name_th
    fund.amc,                                                // $5
    fund.metadata?.status || 'RG',                           // $6
    fund.latest_nav?.last_val || null,                       // $7
    fund.latest_nav?.nav_date || null,                       // $8
    fund.latest_nav?.change || null,                         // $9
    fund.latest_nav?.change_percent || null,                 // $10
    fund.latest_nav?.buy_price || null,                      // $11
    fund.latest_nav?.sell_price || null,                     // $12
    fund.metadata?.risk_level || null,                       // $13
    fund.metadata?.dividend_policy || null,                  // $14
    fund.metadata?.fund_classification || null,              // $15
    category,                                                // $16 - fund_category
    fundType,                                                // $17 - fund_type
    managementStyle,                                         // $18 - management_style
    netAsset,                                                // $19 - net_asset
    riskMetrics.volatility_5y || null,                       // $20
    riskMetrics.tracking_error_1y || null,                   // $21
    navHistoryCount || null,                                 // $22
    navHistoryFirstDate,                                     // $23
    navHistoryLastDate,                                      // $24
    navHistoryMin,                                           // $25
    navHistoryMax,                                           // $26
    dividendsCount || null,                                  // $27
    dividendsTotal || null,                                  // $28
    dividendsLastDate,                                       // $29
    feesCount || null,                                       // $30
    partiesCount || null,                                    // $31
    riskFactorsCount || null,                                // $32
    errorsCount || null,                                     // $33
    errorsJson,                                              // $34
    fund.performance ? JSON.stringify(fund.performance) : null,                   // $35
    fund.benchmark ? JSON.stringify(fund.benchmark) : null,                       // $36
    fund.asset_allocation ? JSON.stringify(fund.asset_allocation) : null,         // $37
    fund.fees ? JSON.stringify(fund.fees) : null,                                 // $38
    fund.involved_parties ? JSON.stringify(fund.involved_parties) : null,         // $39
    fund.top_holdings ? JSON.stringify(fund.top_holdings) : null,                 // $40
    fund.risk_factors ? JSON.stringify(fund.risk_factors) : null,                 // $41
    fund.suitability ? JSON.stringify(fund.suitability) : null,                   // $42
    fund.document_urls ? JSON.stringify(fund.document_urls) : null,               // $43
    fund.investment_minimums ? JSON.stringify(fund.investment_minimums) : null,   // $44
    fund.data_fetched_at || new Date().toISOString(),                             // $45
  ];

  await client.query(query, values);
}

async function insertNavHistory(
  client: PoolClient,
  symbol: string,
  navHistory: FundData['nav_history_30d']
): Promise<number> {
  if (!navHistory || navHistory.length === 0) return 0;

  let count = 0;
  for (const nav of navHistory) {
    const query = `
      INSERT INTO rmf_nav_history (
        fund_symbol, nav_date, nav, nav_change, nav_change_percent, previous_nav
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (fund_symbol, nav_date) DO UPDATE SET
        nav = EXCLUDED.nav,
        nav_change = EXCLUDED.nav_change,
        nav_change_percent = EXCLUDED.nav_change_percent,
        previous_nav = EXCLUDED.previous_nav
    `;

    const values = [
      symbol,
      nav.nav_date,
      nav.last_val,
      null, // nav_change - not in current data structure
      null, // nav_change_percent - not in current data structure
      nav.previous_val || null,
    ];

    await client.query(query, values);
    count++;
  }

  return count;
}

async function insertDividends(
  client: PoolClient,
  symbol: string,
  dividends: FundData['dividends']
): Promise<number> {
  if (!dividends || dividends.length === 0) return 0;

  let count = 0;
  for (const div of dividends) {
    const query = `
      INSERT INTO rmf_dividends (
        fund_symbol, xa_date, dividend_rate, dividend_type
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (fund_symbol, xa_date) DO UPDATE SET
        dividend_rate = EXCLUDED.dividend_rate,
        dividend_type = EXCLUDED.dividend_type
    `;

    const divRate = (div as any).dividend_rate || (div as any).dvidend_rate || 0;
    const divType = (div as any).dividend_type || (div as any).dvi_type || null;

    const values = [
      symbol,
      div.xa_date,
      divRate,
      divType,
    ];

    await client.query(query, values);
    count++;
  }

  return count;
}

// ============================================================================
// CLI Interface
// ============================================================================

async function main() {
  const fundLimit = Number(process.env.FUND_LIMIT ?? '20');
  const clearDB = process.argv.includes('--clear');
  const dataDir = join(process.cwd(), 'data', 'rmf-funds');

  console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║      Save RMF Funds to PostgreSQL - Batch Mode with Resume       ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝`);

  // Get all fund files
  const allFiles = readdirSync(dataDir)
    .filter(file => file.endsWith('.json'))
    .sort();

  // Limit to first N funds
  const fundFiles = allFiles.slice(0, fundLimit);

  console.log(`\n📊 Configuration:`);
  console.log(`   Total funds available: ${allFiles.length}`);
  console.log(`   Funds to process: ${fundFiles.length}`);
  console.log(`   Batch size: ${BATCH_SIZE} funds per batch`);
  console.log(`   Clear database: ${clearDB ? 'YES' : 'NO (upsert mode)'}`);

  try {
    const stats = await saveFundsToDBInBatches(fundFiles, dataDir, clearDB);

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📈 FINAL SUMMARY`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`Funds Saved:      ${stats.funds_saved}/${stats.funds_processed}`);
    console.log(`NAV Records:      ${stats.nav_records_saved}`);
    console.log(`Dividend Records: ${stats.dividend_records_saved}`);
    console.log(`Errors:           ${stats.errors.length}`);
    console.log(`${'═'.repeat(70)}\n`);

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
