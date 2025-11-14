/**
 * Database Saver for RMF Pipeline
 * 
 * Saves fund data from JSON files to PostgreSQL database
 */

import { Pool, PoolClient } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

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

// ============================================================================
// Main Saver Function
// ============================================================================

export async function saveFundsToDB(
  fundFiles: string[],
  dataDir: string = join(process.cwd(), 'data', 'rmf-funds')
): Promise<SaveStats> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  const stats: SaveStats = {
    funds_processed: 0,
    funds_saved: 0,
    nav_records_saved: 0,
    dividend_records_saved: 0,
    errors: [],
  };

  try {
    console.log(`\n🗄️  Saving ${fundFiles.length} funds to PostgreSQL...\n`);

    for (const file of fundFiles) {
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

    console.log(`\n✅ Database save completed!`);
    console.log(`   Funds saved: ${stats.funds_saved}/${stats.funds_processed}`);
    console.log(`   NAV records: ${stats.nav_records_saved}`);
    console.log(`   Dividend records: ${stats.dividend_records_saved}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach(({ symbol, error }) => {
        console.log(`   - ${symbol}: ${error}`);
      });
    }

  } catch (error: any) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

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
      volatility_5y, tracking_error_1y,
      performance, benchmark, asset_allocation, fees,
      involved_parties, top_holdings, risk_factors, suitability,
      document_urls, investment_minimums, data_fetched_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
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
      volatility_5y = EXCLUDED.volatility_5y,
      tracking_error_1y = EXCLUDED.tracking_error_1y,
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

  const values = [
    fund.symbol,
    fund.fund_id,
    fund.fund_name,
    null,
    fund.amc,
    fund.metadata?.status || 'RG',
    fund.latest_nav?.last_val || null,
    fund.latest_nav?.nav_date || null,
    fund.latest_nav?.change || null,
    fund.latest_nav?.change_percent || null,
    fund.latest_nav?.buy_price || null,
    fund.latest_nav?.sell_price || null,
    fund.metadata?.risk_level || null,
    fund.metadata?.dividend_policy || null,
    fund.metadata?.fund_classification || null,
    category,
    riskMetrics.volatility_5y || null,
    riskMetrics.tracking_error_1y || null,
    fund.performance ? JSON.stringify(fund.performance) : null,
    fund.benchmark ? JSON.stringify(fund.benchmark) : null,
    fund.asset_allocation ? JSON.stringify(fund.asset_allocation) : null,
    fund.fees ? JSON.stringify(fund.fees) : null,
    fund.involved_parties ? JSON.stringify(fund.involved_parties) : null,
    fund.top_holdings ? JSON.stringify(fund.top_holdings) : null,
    fund.risk_factors ? JSON.stringify(fund.risk_factors) : null,
    fund.suitability ? JSON.stringify(fund.suitability) : null,
    fund.document_urls ? JSON.stringify(fund.document_urls) : null,
    fund.investment_minimums ? JSON.stringify(fund.investment_minimums) : null,
    fund.data_fetched_at || new Date().toISOString(),
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
  const dataDir = join(process.cwd(), 'data', 'rmf-funds');

  console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║         Save RMF Funds to PostgreSQL Database (Phase 2)           ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝`);

  // Get all fund files
  const allFiles = readdirSync(dataDir)
    .filter(file => file.endsWith('.json'))
    .sort();

  // Limit to first N funds
  const fundFiles = allFiles.slice(0, fundLimit);

  console.log(`\n📊 Processing ${fundFiles.length} funds (limit: ${fundLimit})`);
  console.log(`   Total available: ${allFiles.length}\n`);

  try {
    const stats = await saveFundsToDB(fundFiles, dataDir);

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
