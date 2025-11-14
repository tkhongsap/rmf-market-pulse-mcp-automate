/**
 * Phase 1: Batch Fetch All RMF Funds
 *
 * This script processes all RMF funds from the CSV file, fetching complete data
 * for each fund using the mapping generated in Phase 0.
 *
 * Features:
 * - Concurrent batch processing (15 funds at a time)
 * - Progress tracking with resume capability
 * - Respects SEC API rate limits
 * - Error handling with detailed logging
 * - Individual JSON file output per fund
 *
 * Output: data/rmf-funds/{SYMBOL}.json for each fund
 *         data/progress.json for tracking
 */

import 'dotenv/config';

import {
  fetchCompleteFundData,
  type FundMetadata,
} from './fetch-complete-fund-data';

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Configuration
// ============================================================================

// Number of funds to process concurrently
// SEC API limit: 3,000 calls per 5 minutes = 10 calls/second
// Each fund: ~14 endpoint calls
// Safe rate: 4 funds × 14 calls = 56 calls per batch every 15 seconds = 3.7 calls/sec
const CONCURRENT_BATCH_SIZE = 4; // Reduced from 10 to respect rate limits
const BATCH_DELAY_MS = 15000; // 15 seconds between batches

// ============================================================================
// Types
// ============================================================================

interface FundMappingEntry {
  proj_id: string;
  fund_name_th: string;
  fund_name_en: string;
  amc_id: string;
  amc_name: string;
  fund_status: string;
  regis_date: string;
  cancel_date: string | null;
}

interface FundMapping {
  generated_at: string;
  version: string;
  statistics: {
    total_amcs: number;
    total_funds: number;
    rmf_funds: number;
    active_funds: number;
    cancelled_funds: number;
    mapped_symbols: number;
    unmapped_funds: number;
  };
  mapping: {
    [symbol: string]: FundMappingEntry;
  };
}

interface CSVFundRow {
  symbol: string;
  fund_name: string;
  amc: string;
  fund_classification: string;
  management_style: string;
  dividend_policy: string;
  risk_level: number;
  fund_type: string;
}

interface ProcessProgress {
  started_at: string;
  last_updated: string;
  total_funds: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  completed_symbols: string[];
  failed_symbols: {
    symbol: string;
    error: string;
    timestamp: string;
  }[];
  skipped_symbols: {
    symbol: string;
    reason: string;
  }[];
}

// ============================================================================
// Utility Functions
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
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

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// ============================================================================
// Data Loading Functions
// ============================================================================

function loadFundMapping(): FundMapping {
  const mappingPath = join(process.cwd(), 'data', 'fund-mapping.json');

  if (!existsSync(mappingPath)) {
    throw new Error('Fund mapping not found! Please run build-fund-mapping.ts first (Phase 0)');
  }

  const mappingData = readFileSync(mappingPath, 'utf-8');
  return JSON.parse(mappingData);
}

function loadCSVFunds(): CSVFundRow[] {
  const csvPath = join(process.cwd(), 'docs', 'rmf-funds.csv');

  if (!existsSync(csvPath)) {
    throw new Error('CSV file not found: docs/rmf-funds.csv');
  }

  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  const funds: CSVFundRow[] = [];

  for (const line of dataLines) {
    // Parse CSV (handle quoted fields)
    const fields = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);

    if (!fields || fields.length < 8) {
      continue; // Skip malformed rows
    }

    const [symbol, fund_name, amc, fund_classification, management_style, dividend_policy, risk_level, fund_type] = fields.map(f => f.trim().replace(/^"|"$/g, ''));

    funds.push({
      symbol,
      fund_name,
      amc,
      fund_classification,
      management_style,
      dividend_policy,
      risk_level: parseInt(risk_level) || 0,
      fund_type,
    });
  }

  return funds;
}

function loadProgress(): ProcessProgress | null {
  const progressPath = join(process.cwd(), 'data', 'progress.json');

  if (!existsSync(progressPath)) {
    return null;
  }

  try {
    const progressData = readFileSync(progressPath, 'utf-8');
    return JSON.parse(progressData);
  } catch (error) {
    log('Warning: Could not parse progress.json, starting fresh', 'yellow');
    return null;
  }
}

function saveProgress(progress: ProcessProgress) {
  const progressPath = join(process.cwd(), 'data', 'progress.json');
  progress.last_updated = new Date().toISOString();
  writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
}

// ============================================================================
// Fund Mapping Helper Functions
// ============================================================================

/**
 * Find mapping entry for a fund symbol, handling variant suffixes
 * 
 * Handles cases where CSV has variant suffixes but mapping doesn't:
 * - SCBRMASHARES(A) → SCBRMASHARES
 * - TEGRMF-A → TEGRMF
 * - KKP INRMF → KKP INRMF FUND
 * 
 * @param symbol Fund symbol from CSV
 * @param mapping Fund mapping object
 * @returns Mapping entry if found, null otherwise
 */
function findMappingEntry(
  symbol: string,
  mapping: FundMapping['mapping']
): FundMappingEntry | null {
  // Strategy 1: Try exact match first
  if (mapping[symbol]) {
    return mapping[symbol];
  }

  // Strategy 2: Try removing parentheses variants: (A), (B), (E), (P)
  const parenthesesVariants = ['(A)', '(B)', '(E)', '(P)'];
  for (const variant of parenthesesVariants) {
    if (symbol.endsWith(variant)) {
      const baseSymbol = symbol.slice(0, -variant.length);
      if (mapping[baseSymbol]) {
        return mapping[baseSymbol];
      }
    }
  }

  // Strategy 3: Try removing dash variants: -A, -B, -P, -H, -UH, -F
  const dashVariants = ['-A', '-B', '-P', '-H', '-UH', '-F'];
  for (const variant of dashVariants) {
    if (symbol.endsWith(variant)) {
      const baseSymbol = symbol.slice(0, -variant.length);
      if (mapping[baseSymbol]) {
        return mapping[baseSymbol];
      }
    }
  }

  // Strategy 4: For KKP funds, try adding "FUND" suffix
  // Handle cases like: KKP INRMF → KKP INRMF FUND
  // Or: KKP INRMF-F → KKP INRMF FUND (remove -F first, then add FUND)
  if (symbol.startsWith('KKP ')) {
    // First try adding FUND directly
    const withFund = `${symbol} FUND`;
    if (mapping[withFund]) {
      return mapping[withFund];
    }

    // If symbol ends with -F, remove it first, then add FUND
    if (symbol.endsWith('-F')) {
      const baseSymbol = symbol.slice(0, -2); // Remove '-F'
      const withFund = `${baseSymbol} FUND`;
      if (mapping[withFund]) {
        return mapping[withFund];
      }
    }
  }

  // No match found
  return null;
}

// ============================================================================
// Main Processing Function
// ============================================================================

async function processFund(
  csvFund: CSVFundRow,
  mappingEntry: FundMappingEntry,
  index: number,
  total: number
): Promise<{ success: boolean; error?: string }> {
  const progressStr = `[${index + 1}/${total}]`;

  try {
    log(`${progressStr} Processing: ${csvFund.symbol}`, 'blue');
    log(`  Fund: ${mappingEntry.fund_name_en}`, 'dim');
    log(`  AMC: ${mappingEntry.amc_name}`, 'dim');
    log(`  proj_id: ${mappingEntry.proj_id}`, 'dim');

    // Build metadata from CSV (must include symbol, fund_name, amc for consistent output structure)
    const metadata: FundMetadata = {
      symbol: csvFund.symbol,
      fund_name: csvFund.fund_name,
      amc: csvFund.amc,
      fund_classification: csvFund.fund_classification,
      management_style: csvFund.management_style,
      dividend_policy: csvFund.dividend_policy,
      risk_level: csvFund.risk_level,
      fund_type: csvFund.fund_type,
    };

    // Fetch complete data
    const startTime = Date.now();
    const fundData = await fetchCompleteFundData(mappingEntry.proj_id, metadata);
    const duration = Date.now() - startTime;

    // Save to file
    const outputDir = join(process.cwd(), 'data', 'rmf-funds');
    mkdirSync(outputDir, { recursive: true });

    // Sanitize filename to handle special characters (e.g., KT25/75RMF -> KT25-75RMF)
    const sanitizedSymbol = csvFund.symbol.replace(/[/\\:*?"<>|]/g, '-');
    const outputPath = join(outputDir, `${sanitizedSymbol}.json`);
    writeFileSync(outputPath, JSON.stringify(fundData, null, 2), 'utf-8');

    const fileSize = (JSON.stringify(fundData).length / 1024).toFixed(2);
    log(`  ✓ Saved to: ${sanitizedSymbol}.json (${fileSize} KB, ${duration}ms)`, 'green');

    if (fundData.errors.length > 0) {
      log(`  ⚠️  ${fundData.errors.length} endpoints had no data`, 'yellow');
    }

    return { success: true };

  } catch (error: any) {
    log(`  ✗ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Batch Processing Functions
// ============================================================================

interface FundProcessingTask {
  csvFund: CSVFundRow;
  mappingEntry: FundMappingEntry;
  index: number;
  total: number;
}

interface BatchResult {
  symbol: string;
  success: boolean;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

async function processBatch(
  tasks: FundProcessingTask[]
): Promise<BatchResult[]> {
  // Process all funds in the batch concurrently
  const promises = tasks.map(async (task): Promise<BatchResult> => {
    try {
      const result = await processFund(
        task.csvFund,
        task.mappingEntry,
        task.index,
        task.total
      );
      
      return {
        symbol: task.csvFund.symbol,
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
      return {
        symbol: task.csvFund.symbol,
        success: false,
        error: error.message,
      };
    }
  });

  // Wait for all promises to settle
  const results = await Promise.allSettled(promises);

  // Convert PromiseSettledResult to BatchResult
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        symbol: tasks[index].csvFund.symbol,
        success: false,
        error: result.reason?.message || 'Unknown error',
      };
    }
  });
}

// ============================================================================
// Main Batch Processing
// ============================================================================

async function batchProcessAllFunds() {
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'yellow');
  log('║                   Batch Process All RMF Funds (Phase 1)                   ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'yellow');

  const startTime = Date.now();

  try {
    // Step 1: Load fund mapping
    logSection('Step 1: Loading Fund Mapping');
    const fundMapping = loadFundMapping();
    log(`✓ Loaded mapping for ${Object.keys(fundMapping.mapping).length} funds`, 'green');
    log(`  Generated: ${new Date(fundMapping.generated_at).toLocaleString()}`, 'cyan');

    // Step 2: Load CSV funds
    logSection('Step 2: Loading CSV Funds');
    const csvFunds = loadCSVFunds();
    log(`✓ Loaded ${csvFunds.length} funds from CSV`, 'green');

    // Step 3: Load or initialize progress
    logSection('Step 3: Checking Progress');
    let progress = loadProgress();

    if (progress) {
      log(`✓ Found existing progress: ${progress.processed}/${progress.total_funds} processed`, 'green');
      log(`  Successful: ${progress.successful}`, 'green');
      log(`  Failed: ${progress.failed}`, 'red');
      log(`  Skipped: ${progress.skipped}`, 'yellow');
      log('\n  Resuming from last position...', 'cyan');
    } else {
      log('No existing progress found, starting fresh', 'yellow');
      progress = {
        started_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        total_funds: csvFunds.length,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        completed_symbols: [],
        failed_symbols: [],
        skipped_symbols: [],
      };
    }

    // Step 4: Process funds in concurrent batches
    logSection('Step 4: Processing Funds');
    log(`Processing ${csvFunds.length} RMF funds in batches of ${CONCURRENT_BATCH_SIZE}\n`, 'cyan');

    // Prepare list of funds to process
    const fundsToProcess: Array<{ csvFund: CSVFundRow; index: number }> = [];
    
    for (let i = 0; i < csvFunds.length; i++) {
      const csvFund = csvFunds[i];

      // Skip if already processed
      if (progress.completed_symbols.includes(csvFund.symbol)) {
        log(`[${i + 1}/${csvFunds.length}] Skipping ${csvFund.symbol} (already processed)`, 'dim');
        continue;
      }

      // Check if fund exists in mapping (with variant suffix handling)
      const mappingEntry = findMappingEntry(csvFund.symbol, fundMapping.mapping);

      if (!mappingEntry) {
        log(`[${i + 1}/${csvFunds.length}] Skipping ${csvFund.symbol} (not found in mapping)`, 'yellow');
        progress.skipped++;
        progress.processed++;
        progress.skipped_symbols.push({
          symbol: csvFund.symbol,
          reason: 'Not found in fund mapping',
        });
        continue;
      }

      // Skip cancelled funds
      if (mappingEntry.fund_status === 'CA' || mappingEntry.fund_status === 'LI') {
        log(`[${i + 1}/${csvFunds.length}] Skipping ${csvFund.symbol} (cancelled/liquidated)`, 'yellow');
        progress.skipped++;
        progress.processed++;
        progress.skipped_symbols.push({
          symbol: csvFund.symbol,
          reason: `Fund status: ${mappingEntry.fund_status}`,
        });
        continue;
      }

      fundsToProcess.push({ csvFund, index: i });
    }

    log(`Found ${fundsToProcess.length} funds to process\n`, 'green');

    // Process funds in batches
    const totalBatches = Math.ceil(fundsToProcess.length / CONCURRENT_BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * CONCURRENT_BATCH_SIZE;
      const batchEnd = Math.min(batchStart + CONCURRENT_BATCH_SIZE, fundsToProcess.length);
      const batch = fundsToProcess.slice(batchStart, batchEnd);

      log(`\n${'─'.repeat(80)}`, 'cyan');
      log(`Batch ${batchIndex + 1}/${totalBatches}: Processing ${batch.length} funds concurrently`, 'cyan');
      log(`${'─'.repeat(80)}\n`, 'cyan');

      // Create processing tasks for this batch
      const tasks: FundProcessingTask[] = batch.map(({ csvFund, index }) => {
        const mappingEntry = findMappingEntry(csvFund.symbol, fundMapping.mapping);
        if (!mappingEntry) {
          throw new Error(`Mapping entry not found for ${csvFund.symbol} (should have been caught earlier)`);
        }
        return {
          csvFund,
          mappingEntry,
          index,
          total: csvFunds.length,
        };
      });

      // Process batch concurrently
      const batchStartTime = Date.now();
      const results = await processBatch(tasks);
      const batchDuration = Date.now() - batchStartTime;

      // Update progress based on results
      for (const result of results) {
        progress.processed++;

        if (result.success) {
          progress.successful++;
          progress.completed_symbols.push(result.symbol);
        } else {
          progress.failed++;
          progress.failed_symbols.push({
            symbol: result.symbol,
            error: result.error || 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Save progress after each batch
      saveProgress(progress);

      // Batch summary
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      log(`\n  Batch completed in ${formatDuration(batchDuration)}`, 'cyan');
      log(`  Success: ${successCount} | Failed: ${failedCount}`, successCount > 0 ? 'green' : 'red');

      // Overall progress update
      const elapsed = Date.now() - startTime;
      const processed = batchEnd;
      const remaining = fundsToProcess.length - processed;
      const avgTimePerFund = elapsed / processed;
      const estimatedTimeLeft = avgTimePerFund * remaining;

      log(`\n  Overall Progress: ${processed}/${fundsToProcess.length} (${(processed / fundsToProcess.length * 100).toFixed(1)}%)`, 'magenta');
      log(`  Elapsed: ${formatDuration(elapsed)}`, 'cyan');
      log(`  Estimated time left: ${formatDuration(estimatedTimeLeft)}`, 'cyan');

      // Rate limit delay: Wait 15 seconds between batches to respect SEC API limits
      if (batchIndex < totalBatches - 1) {
        const delaySeconds = BATCH_DELAY_MS / 1000;
        log(`\n⏳ Waiting ${delaySeconds}s before next batch to respect API rate limits...`, 'yellow');
        log(`   (SEC API: 3,000 calls per 5 minutes | Current rate: ~3.7 calls/sec)`, 'dim');
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Step 5: Final Summary
    logSection('Final Summary');

    const totalTime = Date.now() - startTime;

    log(`Total Funds:             ${csvFunds.length}`, 'cyan');
    log(`Processed:               ${progress.processed}`, 'cyan');
    log(`  ├─ Successful:         ${progress.successful}`, 'green');
    log(`  ├─ Failed:             ${progress.failed}`, 'red');
    log(`  └─ Skipped:            ${progress.skipped}`, 'yellow');
    log(`\nTotal Time:              ${formatDuration(totalTime)}`, 'cyan');
    log(`Average Time per Fund:   ${(totalTime / progress.processed).toFixed(0)}ms`, 'cyan');

    if (progress.failed > 0) {
      log('\n⚠️  Failed Funds:', 'red');
      progress.failed_symbols.forEach(({ symbol, error }) => {
        log(`  - ${symbol}: ${error}`, 'red');
      });
    }

    if (progress.skipped > 0) {
      log('\n⚠️  Skipped Funds:', 'yellow');
      progress.skipped_symbols.forEach(({ symbol, reason }) => {
        log(`  - ${symbol}: ${reason}`, 'yellow');
      });
    }

    logSection('Success!');
    log('All RMF funds processed!', 'green');
    log(`Output directory: data/rmf-funds/`, 'green');
    log(`Progress file: data/progress.json`, 'green');

  } catch (error: any) {
    log('\n❌ Fatal error during batch processing:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the batch processor
batchProcessAllFunds();
