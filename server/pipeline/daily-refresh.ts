/**
 * Daily RMF Data Refresh - Production Safe with Upsert
 * 
 * Orchestrates the existing proven pipeline using upsert mode (NO truncation):
 * 1. Phase 0: Build/update fund mapping from SEC API
 * 2. Phase 1: Fetch complete data for all funds to JSON files
 * 3. Load JSON files into database using UPSERT (updates existing + inserts new)
 * 4. Cleanup: Remove stale funds that are no longer in the latest fetch
 * 
 * This is safer than truncate+reload because:
 * - No data loss if the process crashes mid-operation
 * - Main tables always have valid data
 * - Upsert handles both updates and new funds automatically
 * 
 * Run: npm run data:rmf:daily-refresh
 */

import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

async function runCommand(command: string, description: string): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 ${description}`);
  console.log(`${'='.repeat(70)}\n`);
  
  const { stdout, stderr } = await execAsync(command, {
    cwd: process.cwd(),
    maxBuffer: 50 * 1024 * 1024,
  });
  
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  
  console.log(`✅ ${description} complete\n`);
}

async function cleanupStaleFunds(pool: Pool): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🧹 Cleaning Up Stale Funds');
  console.log(`${'='.repeat(70)}\n`);
  
  const client = await pool.connect();
  
  try {
    // Get list of all symbols from JSON files
    const dataDir = join(process.cwd(), 'data', 'rmf-funds');
    const jsonFiles = readdirSync(dataDir).filter(f => f.endsWith('.json'));
    const activeSymbols = jsonFiles.map(f => f.replace('.json', ''));
    
    console.log(`Found ${activeSymbols.length} active funds in JSON files`);
    
    // Get current symbols in database
    const result = await client.query('SELECT symbol FROM rmf_funds');
    const dbSymbols = result.rows.map(r => r.symbol);
    
    console.log(`Found ${dbSymbols.length} funds in database`);
    
    // Find stale funds (in DB but not in latest fetch)
    const staleFunds = dbSymbols.filter(symbol => !activeSymbols.includes(symbol));
    
    if (staleFunds.length === 0) {
      console.log('✓ No stale funds to remove\n');
      return;
    }
    
    console.log(`Found ${staleFunds.length} stale funds to remove:`);
    console.log(staleFunds.join(', '));
    
    await client.query('BEGIN');
    
    // Delete stale funds (CASCADE will handle NAV history and dividends)
    const deleteResult = await client.query(
      'DELETE FROM rmf_funds WHERE symbol = ANY($1)',
      [staleFunds]
    );
    
    await client.query('COMMIT');
    
    console.log(`✅ Removed ${deleteResult.rowCount} stale funds\n`);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║        RMF Daily Refresh - Production Safe (Upsert Mode)          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toLocaleString()}\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Step 1: Build fresh fund mapping from SEC API
    await runCommand(
      'npx tsx scripts/data-extraction/rmf/phase-0-build-mapping.ts',
      'Step 1: Building fund mapping from SEC API'
    );

    // Step 2: Fetch complete data for all funds (saves to JSON files)
    await runCommand(
      'npx tsx scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts',
      'Step 2: Fetching complete fund data from SEC API'
    );

    // Step 3: Load JSON files into database (UPSERT mode - safe, no truncation)
    await runCommand(
      'FUND_LIMIT=450 npx tsx server/pipeline/db-saver.ts',
      'Step 3: Upserting fresh data into database'
    );

    // Step 4: Cleanup stale funds
    await cleanupStaleFunds(pool);

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ DAILY REFRESH COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total time: ${duration} minutes`);
    console.log(`Safety: Used UPSERT mode - database always had valid data`);
    console.log('='.repeat(70) + '\n');

    await pool.end();
    process.exit(0);
    
  } catch (error: any) {
    console.error(`\n❌ Daily refresh failed: ${error.message}`);
    console.error('Database remains in consistent state (UPSERT mode)\n');
    await pool.end();
    process.exit(1);
  }
}

main();
