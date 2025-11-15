/**
 * Daily RMF Data Refresh - Safe Orchestrator with Backup/Restore
 * 
 * Orchestrates the existing proven pipeline with safety mechanisms:
 * 1. Backup current data to temporary tables
 * 2. Phase 0: Build/update fund mapping from SEC API
 * 3. Phase 1: Fetch complete data for all funds to JSON files
 * 4. Truncate main tables
 * 5. Load fresh JSON data into database
 * 6. If successful: Drop backup tables
 * 7. If failed: Restore from backup tables
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
  
  const { stdout, stderr } = await execAsync(command, {
    cwd: process.cwd(),
    maxBuffer: 50 * 1024 * 1024,
  });
  
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  
  console.log(`✅ ${description} complete\n`);
}

async function backupDatabase(pool: Pool): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log('💾 Creating Backup Tables');
  console.log(`${'='.repeat(70)}\n`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Drop backup tables if they exist
    console.log('Dropping old backup tables...');
    await client.query('DROP TABLE IF EXISTS rmf_funds_backup CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_nav_history_backup CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_dividends_backup CASCADE');
    
    // Create backup tables with data
    console.log('Creating rmf_funds_backup...');
    await client.query('CREATE TABLE rmf_funds_backup AS SELECT * FROM rmf_funds');
    
    console.log('Creating rmf_nav_history_backup...');
    await client.query('CREATE TABLE rmf_nav_history_backup AS SELECT * FROM rmf_nav_history');
    
    console.log('Creating rmf_dividends_backup...');
    await client.query('CREATE TABLE rmf_dividends_backup AS SELECT * FROM rmf_dividends');
    
    await client.query('COMMIT');
    
    const fundsCount = await client.query('SELECT COUNT(*) FROM rmf_funds_backup');
    const navCount = await client.query('SELECT COUNT(*) FROM rmf_nav_history_backup');
    const divCount = await client.query('SELECT COUNT(*) FROM rmf_dividends_backup');
    
    console.log(`✅ Backup complete:`);
    console.log(`   - ${fundsCount.rows[0].count} funds`);
    console.log(`   - ${navCount.rows[0].count} NAV records`);
    console.log(`   - ${divCount.rows[0].count} dividend records\n`);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Backup failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function truncateDatabase(pool: Pool): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🗑️  Truncating Main Tables');
  console.log(`${'='.repeat(70)}\n`);
  
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
    console.log('✅ All main tables truncated\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Truncate failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function restoreFromBackup(pool: Pool): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🔄 RESTORING FROM BACKUP');
  console.log(`${'='.repeat(70)}\n`);
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Truncate main tables
    await client.query('TRUNCATE TABLE rmf_dividends CASCADE');
    await client.query('TRUNCATE TABLE rmf_nav_history CASCADE');
    await client.query('TRUNCATE TABLE rmf_funds CASCADE');
    
    // Restore from backup
    console.log('Restoring rmf_funds...');
    await client.query('INSERT INTO rmf_funds SELECT * FROM rmf_funds_backup');
    
    console.log('Restoring rmf_nav_history...');
    await client.query('INSERT INTO rmf_nav_history SELECT * FROM rmf_nav_history_backup');
    
    console.log('Restoring rmf_dividends...');
    await client.query('INSERT INTO rmf_dividends SELECT * FROM rmf_dividends_backup');
    
    await client.query('COMMIT');
    console.log('✅ Database restored from backup\n');
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Restore failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function dropBackupTables(pool: Pool): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log('🧹 Cleaning Up Backup Tables');
  console.log(`${'='.repeat(70)}\n`);
  
  const client = await pool.connect();
  
  try {
    await client.query('DROP TABLE IF EXISTS rmf_funds_backup CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_nav_history_backup CASCADE');
    await client.query('DROP TABLE IF EXISTS rmf_dividends_backup CASCADE');
    console.log('✅ Backup tables dropped\n');
  } finally {
    client.release();
  }
}

async function main() {
  const startTime = Date.now();
  
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║       RMF Daily Refresh - Safe Pipeline with Backup/Restore       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\nStarted at: ${new Date().toLocaleString()}\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Step 1: Backup current data
    await backupDatabase(pool);

    // Step 2: Build fresh fund mapping from SEC API
    await runCommand(
      'npx tsx scripts/data-extraction/rmf/phase-0-build-mapping.ts',
      'Step 2: Building fund mapping from SEC API'
    );

    // Step 3: Fetch complete data for all funds (saves to JSON files)
    await runCommand(
      'npx tsx scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts',
      'Step 3: Fetching complete fund data from SEC API'
    );

    // Step 4: Truncate database tables
    await truncateDatabase(pool);

    // Step 5: Load JSON files into database
    try {
      await runCommand(
        'FUND_LIMIT=450 npx tsx server/pipeline/db-saver.ts',
        'Step 5: Loading fresh data into database'
      );
      
      // Success - drop backup tables
      await dropBackupTables(pool);
      
      const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      
      console.log('\n' + '='.repeat(70));
      console.log('✅ DAILY REFRESH COMPLETE');
      console.log('='.repeat(70));
      console.log(`Total time: ${duration} minutes`);
      console.log('='.repeat(70) + '\n');

    } catch (loadError: any) {
      // Loading failed - restore from backup
      console.error(`\n❌ Database loading failed: ${loadError.message}`);
      await restoreFromBackup(pool);
      throw loadError;
    }

    await pool.end();
    process.exit(0);
    
  } catch (error: any) {
    console.error(`\n❌ Daily refresh failed: ${error.message}`);
    console.error('Previous data has been restored from backup.\n');
    await pool.end();
    process.exit(1);
  }
}

main();
