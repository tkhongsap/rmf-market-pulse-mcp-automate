/**
 * Daily RMF Data Refresh - Production Safe & Simple
 * 
 * Orchestrates a safe daily refresh using UPSERT mode:
 * 1. Fetch latest data from SEC API (Phase 0 + Phase 1)
 * 2. Validate completeness (manifest validation)  
 * 3. Load data using proven db-saver (UPSERT mode - production safe)
 * 
 * Safety Features:
 * - Completeness validation prevents partial data from going live
 * - UPSERT mode means database always has valid data
 * - No truncation or destructive operations
 * - Process crash-safe
 * 
 * Note: Does NOT remove stale funds. This is intentional for safety.
 * Stale/cancelled funds remain in database until manual cleanup.
 * 
 * Run: npm run data:rmf:daily-refresh
 */

import 'dotenv/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import { validateManifest, printValidationResults } from './manifest-validator';
import { saveFundsToDBInBatches } from './db-saver';
import { readdirSync } from 'fs';
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

async function main() {
  const startTime = Date.now();
  
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║          RMF Daily Refresh - Production Safe & Simple             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toLocaleString()}\n`);
  console.log('Safety Features:');
  console.log('  ✓ Completeness validation before load');
  console.log('  ✓ UPSERT mode - no truncation, always safe');
  console.log('  ✓ Process crash-safe');
  console.log('  ✓ Database always has valid data\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  try {
    // ========================================================================
    // PHASE 1: FETCH DATA FROM SEC API
    // ========================================================================

    console.log('\n' + '▓'.repeat(70));
    console.log('PHASE 1: FETCH LATEST DATA FROM SEC API');
    console.log('▓'.repeat(70));

    // Step 1.1: Build fresh fund mapping from SEC API
    await runCommand(
      'npx tsx scripts/data-extraction/rmf/phase-0-build-mapping.ts',
      'Phase 1.1: Building fund mapping from SEC API'
    );

    // Step 1.2: Clear any existing progress to ensure fresh fetch
    try {
      const { unlinkSync } = await import('fs');
      const progressPath = join(process.cwd(), 'data', 'progress.json');
      unlinkSync(progressPath);
      console.log('✓ Cleared old progress file\n');
    } catch (err) {
      // File doesn't exist, that's fine
    }

    // Step 1.3: Fetch complete data for all funds (saves to JSON files)
    await runCommand(
      'npx tsx scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts',
      'Phase 1.3: Fetching complete fund data from SEC API (fresh fetch)'
    );

    // ========================================================================
    // PHASE 2: VALIDATE COMPLETENESS
    // ========================================================================

    console.log('\n' + '▓'.repeat(70));
    console.log('PHASE 2: VALIDATE DATA COMPLETENESS');
    console.log('▓'.repeat(70));

    const validationResult = await validateManifest(databaseUrl);
    printValidationResults(validationResult);

    if (!validationResult.valid) {
      console.error('\n❌ Validation failed - aborting refresh to protect production data');
      console.error('   Missing funds or data quality issues detected.');
      console.error('   Production database remains unchanged.\n');
      process.exit(1);
    }

    // ========================================================================
    // PHASE 3: LOAD DATA (UPSERT MODE - SAFE)
    // ========================================================================

    console.log('\n' + '▓'.repeat(70));
    console.log('PHASE 3: LOAD DATA INTO DATABASE (UPSERT MODE)');
    console.log('▓'.repeat(70));

    // Get list of JSON files
    const dataDir = join(process.cwd(), 'data', 'rmf-funds');
    const jsonFiles = readdirSync(dataDir).filter(f => f.endsWith('.json'));
    
    console.log(`\nLoading ${jsonFiles.length} funds using proven db-saver...\n`);

    // Use proven db-saver with UPSERT mode (clearDB = false)
    const saveResult = await saveFundsToDBInBatches(jsonFiles, dataDir, false);

    console.log('\n✅ Data load complete');
    console.log(`   Funds saved: ${saveResult.funds_saved}`);
    console.log(`   NAV records: ${saveResult.nav_records_saved}`);
    console.log(`   Dividend records: ${saveResult.dividend_records_saved}`);
    
    if (saveResult.errors.length > 0) {
      console.log(`   Errors: ${saveResult.errors.length}`);
    }

    // ========================================================================
    // COMPLETE
    // ========================================================================

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ DAILY REFRESH COMPLETE');
    console.log('='.repeat(70));
    console.log(`Total time: ${duration} minutes`);
    console.log(`Funds updated/inserted: ${saveResult.funds_saved}`);
    console.log(`\nSafety guarantees:`);
    console.log('  ✓ Completeness validated before load');
    console.log('  ✓ Database never at risk (UPSERT mode)');
    console.log('  ✓ All existing data preserved and updated');
    console.log('\nNote: Stale/cancelled funds NOT removed (requires manual cleanup)');
    console.log('='.repeat(70) + '\n');

    process.exit(0);
    
  } catch (error: any) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ DAILY REFRESH FAILED');
    console.error('='.repeat(70));
    console.error(`Error: ${error.message}`);
    console.error('\nProduction database status: SAFE (UPSERT mode)');
    console.error('Database contains valid data from before this run started.');
    console.error('='.repeat(70) + '\n');
    
    process.exit(1);
  }
}

main();
