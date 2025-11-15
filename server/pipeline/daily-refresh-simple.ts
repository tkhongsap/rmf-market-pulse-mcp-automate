/**
 * Daily RMF Data Refresh - Simple Orchestrator
 * 
 * Orchestrates the existing proven pipeline for daily updates:
 * 1. Phase 0: Build/update fund mapping from SEC API
 * 2. Phase 1: Fetch complete data for all funds to JSON files
 * 3. Truncate database tables
 * 4. Load fresh JSON data into database
 * 
 * Run: npm run data:rmf:daily-refresh
 */

import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Pool } from 'pg';

const execAsync = promisify(exec);

async function runCommand(command: string, description: string): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 ${description}`);
  console.log(`${'='.repeat(70)}\n`);
  
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log(`✅ ${description} complete\n`);
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    throw error;
  }
}

async function truncateDatabase(): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🗑️  Truncating Database Tables');
  console.log(`${'='.repeat(70)}\n`);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Truncating rmf_dividends...');
    await client.query('TRUNCATE TABLE rmf_dividends CASCADE');
    
    console.log('Truncating rmf_nav_history...');
    await client.query('TRUNCATE TABLE rmf_nav_history CASCADE');
    
    console.log('Truncating rmf_funds...');
    await client.query('TRUNCATE TABLE rmf_funds CASCADE');
    
    await client.query('COMMIT');
    console.log('✅ All tables truncated\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Truncate failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           RMF Daily Refresh - Full Pipeline (Simplified)          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toLocaleString()}\n`);

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

    // Step 3: Truncate database tables
    await truncateDatabase();

    // Step 4: Load JSON files into database
    await runCommand(
      'FUND_LIMIT=450 npx tsx server/pipeline/db-saver.ts',
      'Step 4: Loading fresh data into database'
    );

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ DAILY REFRESH COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total time: ${duration} minutes`);
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Daily refresh failed: ${error.message}`);
    process.exit(1);
  }
}

main();
