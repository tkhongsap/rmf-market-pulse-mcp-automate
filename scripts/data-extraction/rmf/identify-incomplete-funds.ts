/**
 * Identify Incomplete Funds Script
 * 
 * Scans all RMF fund JSON files and identifies funds with incomplete data
 * (all NULL values due to rate limiting).
 * 
 * Criteria for incomplete fund:
 * - errors array has 14 items (all endpoints failed)
 * - All data fields are NULL
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

interface FundData {
  fund_id: string;
  symbol?: string;
  metadata?: any;
  errors?: string[];
  [key: string]: any;
}

interface IncompleteFund {
  symbol: string;
  fund_id: string;
  file_path: string;
  error_count: number;
  has_data: boolean;
}

async function identifyIncompleteFunds() {
  log('╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                  Identify Incomplete RMF Funds                             ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝\n', 'cyan');

  const fundsDir = join(process.cwd(), 'data', 'rmf-funds');
  
  log(`Scanning directory: ${fundsDir}\n`, 'blue');

  // Read all JSON files
  const files = readdirSync(fundsDir).filter(f => f.endsWith('.json'));
  log(`Found ${files.length} fund files\n`, 'green');

  const incompleteFunds: IncompleteFund[] = [];
  const completeFunds: string[] = [];

  // Analyze each fund
  for (const file of files) {
    const filePath = join(fundsDir, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fundData: FundData = JSON.parse(content);

      const errorCount = fundData.errors?.length || 0;
      
      // Check if fund has any actual data (not NULL)
      const hasData = !!(
        fundData.latest_nav ||
        (fundData.nav_history_30d && fundData.nav_history_30d.length > 0) ||
        fundData.performance ||
        fundData.benchmark ||
        fundData.risk_metrics ||
        fundData.asset_allocation ||
        fundData.category ||
        fundData.fees ||
        fundData.involved_parties ||
        fundData.top_holdings ||
        fundData.risk_factors ||
        fundData.suitability ||
        fundData.document_urls ||
        fundData.investment_minimums
      );

      // Incomplete: 14 errors AND no data
      if (errorCount >= 14 && !hasData) {
        const symbol = fundData.symbol || file.replace('.json', '');
        incompleteFunds.push({
          symbol,
          fund_id: fundData.fund_id,
          file_path: file,
          error_count: errorCount,
          has_data: hasData,
        });
      } else {
        completeFunds.push(file.replace('.json', ''));
      }
    } catch (error: any) {
      log(`  ✗ Error reading ${file}: ${error.message}`, 'red');
    }
  }

  // Sort incomplete funds by symbol
  incompleteFunds.sort((a, b) => a.symbol.localeCompare(b.symbol));

  // Generate report
  log('\n' + '═'.repeat(80), 'cyan');
  log('ANALYSIS RESULTS', 'cyan');
  log('═'.repeat(80) + '\n', 'cyan');

  log(`Total funds analyzed:     ${files.length}`, 'blue');
  log(`Complete funds:           ${completeFunds.length}`, 'green');
  log(`Incomplete funds:         ${incompleteFunds.length}`, 'red');
  log(`Completion rate:          ${((completeFunds.length / files.length) * 100).toFixed(1)}%\n`, 'yellow');

  if (incompleteFunds.length > 0) {
    log('Incomplete Funds List:', 'yellow');
    log('─'.repeat(80), 'yellow');
    
    incompleteFunds.forEach((fund, index) => {
      log(`  ${(index + 1).toString().padStart(3)}. ${fund.symbol.padEnd(30)} (${fund.fund_id}, ${fund.error_count} errors)`, 'yellow');
    });
    log('');
  }

  // Save report to JSON
  const reportPath = join(process.cwd(), 'data', 'incomplete-funds-report.json');
  const report = {
    generated_at: new Date().toISOString(),
    summary: {
      total_funds: files.length,
      complete_funds: completeFunds.length,
      incomplete_funds: incompleteFunds.length,
      completion_rate: parseFloat(((completeFunds.length / files.length) * 100).toFixed(1)),
    },
    incomplete_funds: incompleteFunds.map(f => ({
      symbol: f.symbol,
      fund_id: f.fund_id,
      file_path: f.file_path,
    })),
    complete_funds: completeFunds,
  };

  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  log(`Report saved to: ${reportPath}`, 'green');

  // Save symbols-only list for easy processing
  const symbolsPath = join(process.cwd(), 'data', 'incomplete-funds-symbols.txt');
  writeFileSync(
    symbolsPath,
    incompleteFunds.map(f => f.symbol).join('\n'),
    'utf-8'
  );
  log(`Symbols list saved to: ${symbolsPath}`, 'green');

  log('\n' + '═'.repeat(80), 'cyan');
  log('COMPLETE', 'cyan');
  log('═'.repeat(80), 'cyan');
}

identifyIncompleteFunds().catch(console.error);

