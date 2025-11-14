/**
 * Re-process Incomplete Funds Script
 * 
 * Re-processes only the funds that have incomplete data (14 errors).
 * Uses rate-limited batch processing (4 funds per batch, 15-second delays).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  fetchCompleteFundData,
  FundMetadata,
} from './fetch-complete-fund-data';

// ============================================================================
// Configuration
// ============================================================================

const CONCURRENT_BATCH_SIZE = 4; // 4 funds per batch
const BATCH_DELAY_MS = 15000; // 15 seconds between batches

// ============================================================================
// Types
// ============================================================================

interface IncompleteFundReport {
  generated_at: string;
  summary: {
    total_funds: number;
    complete_funds: number;
    incomplete_funds: number;
    completion_rate: number;
  };
  incomplete_funds: Array<{
    symbol: string;
    fund_id: string;
    file_path: string;
  }>;
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
  statistics: any;
  mapping: {
    [symbol: string]: FundMappingEntry;
  };
}

interface ReprocessProgress {
  started_at: string;
  last_updated: string;
  total_incomplete: number;
  processed: number;
  successful: number;
  failed: number;
  completed_symbols: string[];
  failed_symbols: Array<{
    symbol: string;
    error: string;
    timestamp: string;
  }>;
}

// ============================================================================
// Utilities
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${colors.bold}${message}${colors.reset}`);
}

function logSection(title: string) {
  log('\n' + '═'.repeat(80), 'cyan');
  log(title, 'cyan');
  log('═'.repeat(80) + '\n', 'cyan');
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

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Data Loading Functions
// ============================================================================

function loadIncompleteFundsReport(): IncompleteFundReport {
  const reportPath = join(process.cwd(), 'data', 'incomplete-funds-report.json');
  
  if (!existsSync(reportPath)) {
    throw new Error('Incomplete funds report not found. Run identify-incomplete-funds.ts first.');
  }

  const content = readFileSync(reportPath, 'utf-8');
  return JSON.parse(content);
}

function loadCSVFunds(): CSVFundRow[] {
  const csvPath = join(process.cwd(), 'docs', 'rmf-funds.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    const [symbol, fund_name, amc, fund_classification, management_style, dividend_policy, risk_level, fund_type] = 
      line.split(',').map(v => v.trim());
    
    return {
      symbol,
      fund_name,
      amc,
      fund_classification,
      management_style,
      dividend_policy,
      risk_level: parseInt(risk_level) || 0,
      fund_type,
    };
  });
}

function loadFundMapping(): FundMapping {
  const mappingPath = join(process.cwd(), 'data', 'fund-mapping.json');
  const content = readFileSync(mappingPath, 'utf-8');
  return JSON.parse(content);
}

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
  if (symbol.startsWith('KKP ')) {
    const withFund = `${symbol} FUND`;
    if (mapping[withFund]) {
      return mapping[withFund];
    }

    if (symbol.endsWith('-F')) {
      const baseSymbol = symbol.slice(0, -2);
      const withFund = `${baseSymbol} FUND`;
      if (mapping[withFund]) {
        return mapping[withFund];
      }
    }
  }

  return null;
}

// ============================================================================
// Progress Management
// ============================================================================

function loadReprocessProgress(): ReprocessProgress | null {
  const progressPath = join(process.cwd(), 'data', 'reprocess-progress.json');
  
  if (!existsSync(progressPath)) {
    return null;
  }

  try {
    const content = readFileSync(progressPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log('Warning: Could not parse reprocess-progress.json, starting fresh', 'yellow');
    return null;
  }
}

function saveReprocessProgress(progress: ReprocessProgress) {
  const progressPath = join(process.cwd(), 'data', 'reprocess-progress.json');
  progress.last_updated = new Date().toISOString();
  writeFileSync(progressPath, JSON.stringify(progress, null, 2), 'utf-8');
}

// ============================================================================
// Processing Functions
// ============================================================================

async function processFund(
  symbol: string,
  csvFund: CSVFundRow,
  mappingEntry: FundMappingEntry,
  index: number,
  total: number
): Promise<{ success: boolean; error?: string }> {
  const progressStr = `[${index + 1}/${total}]`;

  try {
    log(`${progressStr} Re-processing: ${symbol}`, 'blue');
    log(`  Fund: ${mappingEntry.fund_name_en}`, 'dim');
    log(`  AMC: ${mappingEntry.amc_name}`, 'dim');
    log(`  proj_id: ${mappingEntry.proj_id}`, 'dim');

    // Build metadata from CSV
    const metadata: FundMetadata = {
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

    // Save to file (overwrite existing)
    const outputDir = join(process.cwd(), 'data', 'rmf-funds');
    mkdirSync(outputDir, { recursive: true });

    const sanitizedSymbol = symbol.replace(/[/\\:*?"<>|]/g, '-');
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

interface FundProcessingTask {
  symbol: string;
  csvFund: CSVFundRow;
  mappingEntry: FundMappingEntry;
  index: number;
  total: number;
}

interface BatchResult {
  symbol: string;
  success: boolean;
  error?: string;
}

async function processBatch(tasks: FundProcessingTask[]): Promise<BatchResult[]> {
  const promises = tasks.map(async (task): Promise<BatchResult> => {
    try {
      const result = await processFund(
        task.symbol,
        task.csvFund,
        task.mappingEntry,
        task.index,
        task.total
      );
      
      return {
        symbol: task.symbol,
        success: result.success,
        error: result.error,
      };
    } catch (error: any) {
      return {
        symbol: task.symbol,
        success: false,
        error: error.message,
      };
    }
  });

  const results = await Promise.allSettled(promises);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        symbol: tasks[index].symbol,
        success: false,
        error: result.reason?.message || 'Unknown error',
      };
    }
  });
}

// ============================================================================
// Main Function
// ============================================================================

async function reprocessIncompleteFunds() {
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'yellow');
  log('║              Re-process Incomplete RMF Funds (Rate Limited)                ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'yellow');

  const startTime = Date.now();

  try {
    // Step 1: Load incomplete funds report
    logSection('Step 1: Loading Incomplete Funds Report');
    const report = loadIncompleteFundsReport();
    log(`✓ Found ${report.incomplete_funds.length} incomplete funds to re-process`, 'green');

    // Step 2: Load CSV funds and mapping
    logSection('Step 2: Loading Data');
    const csvFunds = loadCSVFunds();
    const fundMapping = loadFundMapping();
    log(`✓ Loaded ${csvFunds.length} funds from CSV`, 'green');
    log(`✓ Loaded mapping for ${Object.keys(fundMapping.mapping).length} funds`, 'green');

    // Step 3: Load or create progress
    logSection('Step 3: Progress Tracking');
    let progress = loadReprocessProgress();
    
    if (progress) {
      log(`✓ Resuming from previous session`, 'yellow');
      log(`  Started: ${new Date(progress.started_at).toLocaleString()}`, 'cyan');
      log(`  Processed: ${progress.processed}/${progress.total_incomplete}`, 'cyan');
      log(`  Successful: ${progress.successful}`, 'cyan');
      log(`  Failed: ${progress.failed}`, 'cyan');
    } else {
      log('No existing progress found, starting fresh', 'yellow');
      progress = {
        started_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        total_incomplete: report.incomplete_funds.length,
        processed: 0,
        successful: 0,
        failed: 0,
        completed_symbols: [],
        failed_symbols: [],
      };
    }

    // Step 4: Process incomplete funds in batches
    logSection('Step 4: Re-processing Funds');
    log(`Processing ${report.incomplete_funds.length} incomplete funds in batches of ${CONCURRENT_BATCH_SIZE}`, 'cyan');
    log(`Batch delay: ${BATCH_DELAY_MS / 1000} seconds\n`, 'cyan');

    // Prepare list of funds to process
    const fundsToProcess: Array<{ symbol: string; index: number }> = [];
    
    for (let i = 0; i < report.incomplete_funds.length; i++) {
      const incompleteFund = report.incomplete_funds[i];
      const symbol = incompleteFund.symbol;

      // Skip if already processed
      if (progress.completed_symbols.includes(symbol)) {
        log(`[${i + 1}/${report.incomplete_funds.length}] Skipping ${symbol} (already re-processed)`, 'dim');
        continue;
      }

      fundsToProcess.push({ symbol, index: i });
    }

    log(`Found ${fundsToProcess.length} funds to re-process\n`, 'green');

    // Process funds in batches
    const totalBatches = Math.ceil(fundsToProcess.length / CONCURRENT_BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * CONCURRENT_BATCH_SIZE;
      const batchEnd = Math.min(batchStart + CONCURRENT_BATCH_SIZE, fundsToProcess.length);
      const batch = fundsToProcess.slice(batchStart, batchEnd);

      log(`\n${'─'.repeat(80)}`, 'cyan');
      log(`Batch ${batchIndex + 1}/${totalBatches}: Re-processing ${batch.length} funds concurrently`, 'cyan');
      log(`${'─'.repeat(80)}\n`, 'cyan');

      // Create processing tasks for this batch
      const tasks: FundProcessingTask[] = [];
      
      for (const { symbol, index } of batch) {
        // Find CSV fund
        const csvFund = csvFunds.find(f => f.symbol === symbol);
        if (!csvFund) {
          log(`  ✗ ${symbol}: Not found in CSV`, 'red');
          continue;
        }

        // Find mapping entry
        const mappingEntry = findMappingEntry(symbol, fundMapping.mapping);
        if (!mappingEntry) {
          log(`  ✗ ${symbol}: Not found in mapping`, 'red');
          continue;
        }

        tasks.push({
          symbol,
          csvFund,
          mappingEntry,
          index,
          total: report.incomplete_funds.length,
        });
      }

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
      saveReprocessProgress(progress);

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

      // Rate limit delay
      if (batchIndex < totalBatches - 1) {
        const delaySeconds = BATCH_DELAY_MS / 1000;
        log(`\n⏳ Waiting ${delaySeconds}s before next batch to respect API rate limits...`, 'yellow');
        log(`   (SEC API: 3,000 calls per 5 minutes | Current rate: ~3.7 calls/sec)`, 'dim');
        await sleep(BATCH_DELAY_MS);
      }
    }

    // Step 5: Final Summary
    logSection('Final Summary');
    log(`Total Incomplete Funds:  ${progress.total_incomplete}`, 'cyan');
    log(`Processed:               ${progress.processed}`, 'cyan');
    log(`  ├─ Successful:         ${progress.successful}`, 'green');
    log(`  └─ Failed:             ${progress.failed}`, 'red');
    log(`\nTotal Time:              ${formatDuration(Date.now() - startTime)}`, 'cyan');
    log(`Average Time per Fund:   ${formatDuration((Date.now() - startTime) / progress.processed)}`, 'cyan');

    if (progress.failed > 0) {
      log(`\n⚠️  Failed Funds:`, 'yellow');
      progress.failed_symbols.forEach(f => {
        log(`  - ${f.symbol}: ${f.error}`, 'yellow');
      });
    }

    log('\n' + '═'.repeat(80), 'cyan');
    log('RE-PROCESSING COMPLETE!', 'cyan');
    log('═'.repeat(80), 'cyan');
    log(`✓ All incomplete funds have been re-processed!`, 'green');
    log(`  Output directory: data/rmf-funds/`, 'green');
    log(`  Progress file: data/reprocess-progress.json`, 'green');

  } catch (error: any) {
    log(`\n✗ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

reprocessIncompleteFunds().catch(console.error);

