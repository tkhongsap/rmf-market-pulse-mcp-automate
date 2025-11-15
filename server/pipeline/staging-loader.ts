/**
 * Staging Table Loader - Loads RMF data into staging tables
 * 
 * Creates staging tables with full constraints/indexes, loads data,
 * then provides atomic swap functionality.
 * 
 * Flow:
 * 1. Create staging tables (LIKE production INCLUDING ALL)
 * 2. Load data into staging tables
 * 3. Atomic swap: rename tables in single transaction
 * 4. Drop old tables
 */

import { Pool, PoolClient } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface LoadResult {
  success: boolean;
  stats: {
    funds_loaded: number;
    nav_records_loaded: number;
    dividend_records_loaded: number;
  };
  errors: string[];
}

/**
 * Create staging tables with same structure as production (including constraints/indexes)
 */
export async function createStagingTables(pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🏗️  Creating Staging Tables');
    console.log('='.repeat(70) + '\n');

    await client.query('BEGIN');

    // Drop existing staging tables if they exist
    console.log('Dropping old staging tables if they exist...');
    await client.query('DROP TABLE IF EXISTS rmf_funds_staging CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_nav_history_staging CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_dividends_staging CASCADE');

    // Create staging tables with same structure as production
    // INCLUDING ALL copies: constraints, defaults, indexes, storage params, comments
    console.log('Creating rmf_funds_staging (with all constraints/indexes)...');
    await client.query(`
      CREATE TABLE rmf_funds_staging (LIKE rmf_funds INCLUDING ALL)
    `);

    console.log('Creating rmf_nav_history_staging (with all constraints/indexes)...');
    await client.query(`
      CREATE TABLE rmf_nav_history_staging (LIKE rmf_nav_history INCLUDING ALL)
    `);

    console.log('Creating rmf_dividends_staging (with all constraints/indexes)...');
    await client.query(`
      CREATE TABLE rmf_dividends_staging (LIKE rmf_dividends INCLUDING ALL)
    `);

    await client.query('COMMIT');
    console.log('✅ Staging tables created successfully\n');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to create staging tables:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Load data from JSON files into staging tables
 */
export async function loadDataIntoStaging(pool: Pool, fundLimit: number = 500): Promise<LoadResult> {
  const result: LoadResult = {
    success: true,
    stats: {
      funds_loaded: 0,
      nav_records_loaded: 0,
      dividend_records_loaded: 0,
    },
    errors: [],
  };

  console.log('\n' + '='.repeat(70));
  console.log('📦 Loading Data into Staging Tables');
  console.log('='.repeat(70) + '\n');

  const dataDir = join(process.cwd(), 'data', 'rmf-funds');
  const jsonFiles = readdirSync(dataDir).filter(f => f.endsWith('.json'));
  
  const filesToProcess = jsonFiles.slice(0, fundLimit);
  console.log(`Processing ${filesToProcess.length} funds...\n`);

  for (let i = 0; i < filesToProcess.length; i++) {
    const fileName = filesToProcess[i];
    const symbol = fileName.replace('.json', '');
    
    if ((i + 1) % 50 === 0 || i === filesToProcess.length - 1) {
      console.log(`Progress: ${i + 1}/${filesToProcess.length} funds loaded`);
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Load JSON data
      const filePath = join(dataDir, fileName);
      const fundData = JSON.parse(readFileSync(filePath, 'utf-8'));

      // Insert fund data into rmf_funds_staging
      const fundInsert = await client.query(`
        INSERT INTO rmf_funds_staging (
          symbol, proj_id, fund_name_th, fund_name_en, amc_name,
          fund_classification, management_style, dividend_policy, risk_level,
          benchmark, asset_allocation, performance, fees, risk_factors,
          latest_nav, latest_nav_date, nav_change_1d, nav_change_5d,
          nav_change_1m, nav_change_3m, nav_change_6m, nav_change_ytd,
          nav_change_1y, nav_change_3y, nav_change_5y, nav_change_10y,
          return_1m, return_3m, return_6m, return_ytd, return_1y,
          return_3y, return_5y, return_10y,
          volatility_1m, volatility_3m, volatility_6m, volatility_1y,
          sharpe_ratio_1y, max_drawdown_1y, alpha_1y, beta_1y,
          fund_size_millions, fund_status, registration_date, cancellation_date,
          data_updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, $44, $45, $46
        )
      `, [
        fundData.symbol,
        fundData.proj_id,
        fundData.fund_name_th,
        fundData.fund_name_en,
        fundData.amc_name,
        fundData.fund_classification,
        fundData.management_style,
        fundData.dividend_policy,
        fundData.risk_level,
        fundData.benchmark ? JSON.stringify(fundData.benchmark) : null,
        fundData.asset_allocation ? JSON.stringify(fundData.asset_allocation) : null,
        fundData.performance ? JSON.stringify(fundData.performance) : null,
        fundData.fees ? JSON.stringify(fundData.fees) : null,
        fundData.risk_factors ? JSON.stringify(fundData.risk_factors) : null,
        fundData.latest_nav,
        fundData.latest_nav_date,
        fundData.nav_change_1d,
        fundData.nav_change_5d,
        fundData.nav_change_1m,
        fundData.nav_change_3m,
        fundData.nav_change_6m,
        fundData.nav_change_ytd,
        fundData.nav_change_1y,
        fundData.nav_change_3y,
        fundData.nav_change_5y,
        fundData.nav_change_10y,
        fundData.return_1m,
        fundData.return_3m,
        fundData.return_6m,
        fundData.return_ytd,
        fundData.return_1y,
        fundData.return_3y,
        fundData.return_5y,
        fundData.return_10y,
        fundData.volatility_1m,
        fundData.volatility_3m,
        fundData.volatility_6m,
        fundData.volatility_1y,
        fundData.sharpe_ratio_1y,
        fundData.max_drawdown_1y,
        fundData.alpha_1y,
        fundData.beta_1y,
        fundData.fund_size_millions,
        fundData.fund_status,
        fundData.registration_date,
        fundData.cancellation_date,
        new Date().toISOString(),
      ]);

      result.stats.funds_loaded++;

      // Insert NAV history into rmf_nav_history_staging
      if (fundData.nav_history && Array.isArray(fundData.nav_history)) {
        for (const nav of fundData.nav_history) {
          await client.query(`
            INSERT INTO rmf_nav_history_staging (
              symbol, nav_date, nav, change_percentage
            ) VALUES ($1, $2, $3, $4)
          `, [symbol, nav.date, nav.nav, nav.change_percentage]);
          
          result.stats.nav_records_loaded++;
        }
      }

      // Insert dividends into rmf_dividends_staging
      if (fundData.dividends && Array.isArray(fundData.dividends)) {
        for (const dividend of fundData.dividends) {
          await client.query(`
            INSERT INTO rmf_dividends_staging (
              symbol, dividend_date, dividend_amount, ex_dividend_date
            ) VALUES ($1, $2, $3, $4)
          `, [
            symbol,
            dividend.dividend_date,
            dividend.dividend_amount,
            dividend.ex_dividend_date,
          ]);
          
          result.stats.dividend_records_loaded++;
        }
      }

      await client.query('COMMIT');

    } catch (error: any) {
      await client.query('ROLLBACK');
      result.errors.push(`Failed to load ${symbol}: ${error.message}`);
      result.success = false;
    } finally {
      client.release();
    }
  }

  console.log('\n✅ Data loading complete');
  console.log(`   - Funds: ${result.stats.funds_loaded}`);
  console.log(`   - NAV records: ${result.stats.nav_records_loaded}`);
  console.log(`   - Dividend records: ${result.stats.dividend_records_loaded}`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${result.errors.length}`);
    result.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
    if (result.errors.length > 5) {
      console.log(`   ... and ${result.errors.length - 5} more`);
    }
  }
  
  console.log();

  return result;
}

/**
 * Atomic swap: rename staging tables to production in single transaction
 */
export async function atomicSwap(pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 Performing Atomic Table Swap');
    console.log('='.repeat(70) + '\n');

    await client.query('BEGIN');

    // Rename production tables to _old
    console.log('Step 1: Renaming production tables to _old...');
    await client.query('ALTER TABLE rmf_funds RENAME TO rmf_funds_old');
    await client.query('ALTER TABLE rmf_nav_history RENAME TO rmf_nav_history_old');
    await client.query('ALTER TABLE rmf_dividends RENAME TO rmf_dividends_old');

    // Rename staging tables to production
    console.log('Step 2: Promoting staging tables to production...');
    await client.query('ALTER TABLE rmf_funds_staging RENAME TO rmf_funds');
    await client.query('ALTER TABLE rmf_nav_history_staging RENAME TO rmf_nav_history');
    await client.query('ALTER TABLE rmf_dividends_staging RENAME TO rmf_dividends');

    await client.query('COMMIT');
    
    console.log('✅ Atomic swap successful - new data is now live\n');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Atomic swap failed - rolling back:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Drop old production tables after successful swap
 */
export async function dropOldTables(pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧹 Cleaning Up Old Tables');
    console.log('='.repeat(70) + '\n');

    await client.query('DROP TABLE IF EXISTS rmf_funds_old CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_nav_history_old CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_dividends_old CASCADE');

    console.log('✅ Old tables dropped successfully\n');

  } finally {
    client.release();
  }
}
