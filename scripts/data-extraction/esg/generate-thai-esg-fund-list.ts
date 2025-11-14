/**
 * Generate Thai ESG Fund List from SEC API
 *
 * This script fetches all Thai ESG funds from the SEC API and generates:
 * - docs/thai-esg-funds-api.csv
 * - docs/thai-esg-funds-api.md
 *
 * 100% API-based - NO dependency on manual CSV files
 *
 * Thai ESG funds are identified by checking if fund names/IDs contain:
 * - "ESG", "TESG", "ความยั่งยืน" (sustainability in Thai), or "SUSTAINABILITY"
 *
 * EXCLUSIONS:
 * - Funds containing "ESGX" (Thai ESGX funds)
 * - Funds containing "RMF" (Retirement Mutual Funds)
 */

import 'dotenv/config';

import {
  fetchAMCList,
  fetchFundsByAMC,
  clearCache,
  type AMCData,
  type FundBasicInfo,
} from '../../../server/services/secFundFactsheetApi';

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Types
// ============================================================================

interface ESGFund {
  symbol: string;
  fund_name: string;
  amc: string;
  proj_id: string;
  fund_status: string;
  regis_date: string;
  cancel_date: string | null;
}

interface Stats {
  total_amcs: number;
  total_funds: number;
  esg_funds: number;
  active_funds: number;
  cancelled_funds: number;
  excluded_esgx: number;
  excluded_rmf: number;
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

// ============================================================================
// CSV Generation
// ============================================================================

function generateCSV(funds: ESGFund[]): string {
  const headers = ['Symbol', 'Fund Name', 'AMC', 'Project ID', 'Status', 'Registration Date', 'Cancel Date'];
  const rows = funds.map(fund => [
    fund.symbol,
    fund.fund_name,
    fund.amc,
    fund.proj_id,
    fund.fund_status,
    fund.regis_date,
    fund.cancel_date || '',
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ];

  return csvLines.join('\n');
}

// ============================================================================
// Markdown Generation
// ============================================================================

function generateMarkdown(funds: ESGFund[]): string {
  const lines = [
    '# Thai ESG Funds (API-Generated)',
    '',
    `**Total Funds:** ${funds.length}`,
    `**Generated:** ${new Date().toISOString()}`,
    `**Source:** SEC Fund Factsheet API`,
    '',
    '**About Thai ESG Funds:**',
    '- Tax benefit: Up to THB 300,000 per year',
    '- Investment period: 2024-2026',
    '- Minimum holding period: 5 years',
    '- Investment focus: ≥80% in Thai businesses with outstanding ESG performance',
    '',
    '| Symbol | Fund Name | AMC | Status | Registration Date |',
    '|--------|-----------|-----|--------|-------------------|',
  ];

  for (const fund of funds) {
    const statusLabel = fund.fund_status === 'RG' ? '✅ Active' : '❌ Cancelled';
    lines.push(
      `| ${fund.symbol} | ${fund.fund_name} | ${fund.amc} | ${statusLabel} | ${fund.regis_date} |`
    );
  }

  return lines.join('\n');
}

// ============================================================================
// Main Function
// ============================================================================

async function generateESGFundList() {
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'yellow');
  log('║                 Generate Thai ESG Fund List from SEC API                  ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'yellow');

  // Clear cache for fresh fetch
  clearCache();

  const esgFunds: ESGFund[] = [];
  const amcMap = new Map<string, string>(); // AMC ID → AMC Name mapping

  const stats: Stats = {
    total_amcs: 0,
    total_funds: 0,
    esg_funds: 0,
    active_funds: 0,
    cancelled_funds: 0,
    excluded_esgx: 0,
    excluded_rmf: 0,
  };

  try {
    // Step 1: Fetch all AMCs
    logSection('Step 1: Fetching All AMCs');
    const amcs = await fetchAMCList();
    stats.total_amcs = amcs.length;

    // Build AMC mapping
    amcs.forEach(amc => {
      amcMap.set(amc.unique_id, amc.name_en);
    });

    log(`✓ Found ${amcs.length} Asset Management Companies`, 'green');

    await sleep(100);

    // Step 2: Fetch all funds from each AMC
    logSection('Step 2: Fetching Thai ESG Funds from Each AMC');

    for (let i = 0; i < amcs.length; i++) {
      const amc = amcs[i];
      const amcProgress = `[${i + 1}/${amcs.length}]`;

      log(`${amcProgress} ${amc.name_en}...`, 'blue');

      try {
        const funds = await fetchFundsByAMC(amc.unique_id);
        stats.total_funds += funds.length;

        // Filter Thai ESG funds (exclude ESGX and RMF)
        const esgFundsForAMC = funds.filter(fund => {
          // Check if contains ESG-related keywords
          const hasESG = fund.proj_id?.includes('ESG') ||
                         fund.proj_id?.includes('TESG') ||
                         fund.proj_name_th?.includes('ESG') ||
                         fund.proj_name_th?.includes('ความยั่งยืน') ||
                         fund.proj_name_en?.toUpperCase().includes('ESG') ||
                         fund.proj_name_en?.toUpperCase().includes('SUSTAINABILITY') ||
                         fund.proj_abbr_name?.includes('ESG') ||
                         fund.proj_abbr_name?.includes('TESG');

          if (!hasESG) return false;

          // Exclude ESGX funds (check for "ESGX", "ESG X", "ESG EXTRA", "THAIESGX")
          const isESGX = fund.proj_id?.includes('ESGX') ||
                         fund.proj_id?.includes('ESG X') ||
                         fund.proj_name_th?.includes('ESGX') ||
                         fund.proj_name_th?.includes('ESG X') ||
                         fund.proj_name_en?.toUpperCase().includes('ESGX') ||
                         fund.proj_name_en?.toUpperCase().includes('ESG X') ||
                         fund.proj_name_en?.toUpperCase().includes('ESG EXTRA') ||
                         fund.proj_name_en?.toUpperCase().includes('THAIESGX') ||
                         fund.proj_abbr_name?.includes('ESGX');

          if (isESGX) {
            stats.excluded_esgx++;
            return false;
          }

          // Exclude RMF funds
          const isRMF = fund.proj_id?.includes('RMF') ||
                        fund.proj_name_th?.includes('RMF') ||
                        fund.proj_name_en?.includes('RMF') ||
                        fund.proj_abbr_name?.includes('RMF');

          if (isRMF) {
            stats.excluded_rmf++;
            return false;
          }

          return true;
        });

        // Add to list
        for (const fund of esgFundsForAMC) {
          const symbol = fund.proj_abbr_name?.trim();

          if (!symbol) {
            log(`  ⚠️  No symbol for fund: ${fund.proj_name_en || fund.proj_id}`, 'yellow');
            continue;
          }

          // Track fund status
          if (fund.fund_status === 'CA' || fund.fund_status === 'LI') {
            stats.cancelled_funds++;
          } else {
            stats.active_funds++;
          }

          esgFunds.push({
            symbol,
            fund_name: fund.proj_name_en || fund.proj_name_th || 'Unknown',
            amc: amcMap.get(amc.unique_id) || 'Unknown',
            proj_id: fund.proj_id,
            fund_status: fund.fund_status || 'Unknown',
            regis_date: fund.regis_date || '',
            cancel_date: fund.cancel_date || null,
          });
          stats.esg_funds++;
        }

        if (esgFundsForAMC.length > 0) {
          log(`  ✓ Found ${esgFundsForAMC.length} Thai ESG funds`, 'green');
        }

        await sleep(150); // Small delay between AMC requests

      } catch (error: any) {
        log(`  ✗ Error fetching funds: ${error.message}`, 'red');
      }
    }

    // Step 3: Sort funds by symbol
    logSection('Step 3: Sorting Funds');
    esgFunds.sort((a, b) => a.symbol.localeCompare(b.symbol));
    log(`✓ Sorted ${esgFunds.length} funds by symbol`, 'green');

    // Step 4: Generate CSV
    logSection('Step 4: Generating CSV File');
    const csv = generateCSV(esgFunds);
    const csvPath = join(process.cwd(), 'docs', 'thai-esg-funds-api.csv');

    // Create docs directory if it doesn't exist
    mkdirSync(join(process.cwd(), 'docs'), { recursive: true });

    writeFileSync(csvPath, csv, 'utf-8');
    log(`✓ CSV file saved to: ${csvPath}`, 'green');
    log(`  File size: ${(csv.length / 1024).toFixed(2)} KB`, 'cyan');

    // Step 5: Generate Markdown
    logSection('Step 5: Generating Markdown File');
    const markdown = generateMarkdown(esgFunds);
    const mdPath = join(process.cwd(), 'docs', 'thai-esg-funds-api.md');

    writeFileSync(mdPath, markdown, 'utf-8');
    log(`✓ Markdown file saved to: ${mdPath}`, 'green');
    log(`  File size: ${(markdown.length / 1024).toFixed(2)} KB`, 'cyan');

    // Step 6: Display Statistics
    logSection('Summary Statistics');
    log(`Total AMCs: ${stats.total_amcs}`, 'cyan');
    log(`Total Funds (all types): ${stats.total_funds}`, 'cyan');
    log(`Thai ESG Funds: ${stats.esg_funds}`, 'green');
    log(`  ├─ Active: ${stats.active_funds}`, 'green');
    log(`  └─ Cancelled: ${stats.cancelled_funds}`, 'yellow');
    log(`Excluded (ESGX): ${stats.excluded_esgx}`, 'magenta');
    log(`Excluded (RMF): ${stats.excluded_rmf}`, 'magenta');

    logSection('Success!');
    log('Thai ESG fund list generated from SEC API (100% API-based)', 'green');
    log(`CSV: ${csvPath}`, 'cyan');
    log(`MD:  ${mdPath}`, 'cyan');

  } catch (error: any) {
    log('\nError:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run main function
generateESGFundList();
