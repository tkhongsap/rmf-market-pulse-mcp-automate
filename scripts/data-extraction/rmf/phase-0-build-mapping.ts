/**
 * Phase 0: Build Fund Mapping (Symbol → proj_id)
 *
 * This script builds a complete mapping of RMF fund symbols to their proj_ids
 * by fetching all funds from all AMCs through the SEC Fund Factsheet API.
 *
 * Output: data/fund-mapping.json
 *
 * Run once to generate mapping, then reuse for batch processing.
 */

import 'dotenv/config';

import {
  fetchAMCList,
  fetchFundsByAMC,
  clearCache,
} from '../../../server/services/secFundFactsheetApi';

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

interface FundMapping {
  [symbol: string]: {
    proj_id: string;
    fund_name_th: string;
    fund_name_en: string;
    amc_id: string;
    amc_name: string;
    fund_status: string;
    regis_date: string;
    cancel_date: string | null;
  };
}

interface MappingStats {
  total_amcs: number;
  total_funds: number;
  rmf_funds: number;
  active_funds: number;
  cancelled_funds: number;
  mapped_symbols: number;
  unmapped_funds: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
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

// ============================================================================
// Main Function
// ============================================================================

async function buildFundMapping() {
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'yellow');
  log('║                      Build Fund Mapping (Phase 0)                         ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'yellow');

  // Clear cache for fresh fetch
  clearCache();

  const mapping: FundMapping = {};
  const stats: MappingStats = {
    total_amcs: 0,
    total_funds: 0,
    rmf_funds: 0,
    active_funds: 0,
    cancelled_funds: 0,
    mapped_symbols: 0,
    unmapped_funds: 0,
  };

  try {
    // Step 1: Fetch all AMCs
    logSection('Step 1: Fetching All AMCs');
    const amcs = await fetchAMCList();
    stats.total_amcs = amcs.length;
    log(`✓ Found ${amcs.length} Asset Management Companies`, 'green');

    await sleep(100);

    // Step 2: Fetch all funds from each AMC
    logSection('Step 2: Fetching Funds from Each AMC');

    for (let i = 0; i < amcs.length; i++) {
      const amc = amcs[i];
      const amcProgress = `[${i + 1}/${amcs.length}]`;

      log(`${amcProgress} Fetching funds from: ${amc.name_en}`, 'blue');

      try {
        const funds = await fetchFundsByAMC(amc.unique_id);
        stats.total_funds += funds.length;

        // Filter and map RMF funds
        const rmfFunds = funds.filter(fund => {
          // Check if fund is RMF by looking at proj_id or name
          const isRMF = fund.proj_id?.includes('RMF') ||
                        fund.proj_name_th?.includes('RMF') ||
                        fund.proj_name_en?.includes('RMF') ||
                        fund.proj_abbr_name?.includes('RMF');
          return isRMF;
        });

        stats.rmf_funds += rmfFunds.length;

        // Build mapping
        for (const fund of rmfFunds) {
          const symbol = fund.proj_abbr_name?.trim();

          if (!symbol) {
            stats.unmapped_funds++;
            log(`  ⚠️  No symbol for fund: ${fund.proj_name_en || fund.proj_id}`, 'yellow');
            continue;
          }

          // Track fund status
          if (fund.fund_status === 'CA' || fund.fund_status === 'LI') {
            stats.cancelled_funds++;
          } else {
            stats.active_funds++;
          }

          mapping[symbol] = {
            proj_id: fund.proj_id,
            fund_name_th: fund.proj_name_th || '',
            fund_name_en: fund.proj_name_en || '',
            amc_id: amc.unique_id,
            amc_name: amc.name_en || amc.name_th,
            fund_status: fund.fund_status || 'Unknown',
            regis_date: fund.regis_date || '',
            cancel_date: fund.cancel_date || null,
          };

          stats.mapped_symbols++;
        }

        log(`  ✓ Found ${rmfFunds.length} RMF funds (${funds.length} total)`, 'green');

        // Small delay between AMCs to respect rate limits
        await sleep(100);

      } catch (error: any) {
        log(`  ✗ Error fetching funds from ${amc.name_en}: ${error.message}`, 'red');
        continue;
      }
    }

    // Step 3: Save mapping to file
    logSection('Step 3: Saving Mapping');

    const outputDir = join(process.cwd(), 'data');
    mkdirSync(outputDir, { recursive: true });

    const mappingPath = join(outputDir, 'fund-mapping.json');
    const mappingData = {
      generated_at: new Date().toISOString(),
      version: '1.0',
      statistics: stats,
      mapping,
    };

    writeFileSync(mappingPath, JSON.stringify(mappingData, null, 2), 'utf-8');

    log(`✓ Mapping saved to: ${mappingPath}`, 'green');
    log(`  File size: ${(JSON.stringify(mappingData).length / 1024).toFixed(2)} KB`, 'cyan');

    // Step 4: Display Statistics
    logSection('Mapping Statistics');

    log(`Total AMCs:              ${stats.total_amcs}`, 'cyan');
    log(`Total Funds:             ${stats.total_funds}`, 'cyan');
    log(`RMF Funds:               ${stats.rmf_funds}`, 'cyan');
    log(`  ├─ Active:             ${stats.active_funds}`, 'green');
    log(`  └─ Cancelled:          ${stats.cancelled_funds}`, 'yellow');
    log(`Mapped Symbols:          ${stats.mapped_symbols}`, 'green');
    log(`Unmapped Funds:          ${stats.unmapped_funds}`, 'red');

    logSection('Success!');
    log('Fund mapping generated successfully!', 'green');
    log('Ready for batch processing (Phase 1)', 'green');

    // Show sample mappings
    log('\nSample Mappings (first 5):', 'cyan');
    const sampleSymbols = Object.keys(mapping).slice(0, 5);
    sampleSymbols.forEach(symbol => {
      const fund = mapping[symbol];
      log(`  ${symbol} → ${fund.proj_id}`, 'blue');
      log(`    Name: ${fund.fund_name_en}`, 'reset');
      log(`    AMC: ${fund.amc_name}`, 'reset');
      log(`    Status: ${fund.fund_status}`, fund.fund_status === 'RG' ? 'green' : 'yellow');
    });

  } catch (error: any) {
    log('\n❌ Error building fund mapping:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the mapping builder
buildFundMapping();

