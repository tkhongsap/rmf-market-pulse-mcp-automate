/**
 * Analyze RMF Fund Data Points
 * 
 * Counts data points in each fund JSON file and provides summary statistics.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

interface DataPointAnalysis {
  filename: string;
  totalKeys: number;
  presentKeys: string[];
  nullKeys: string[];
  missingKeys: string[];
  arrayLengths: Record<string, number>;
}

const EXPECTED_KEYS = [
  'fund_id',
  'symbol',
  'fund_name',
  'amc',
  'metadata',
  'latest_nav',
  'nav_history_30d',
  'dividends',
  'performance',
  'benchmark',
  'risk_metrics',
  'asset_allocation',
  'category',
  'fees',
  'involved_parties',
  'top_holdings',
  'risk_factors',
  'suitability',
  'document_urls',
  'investment_minimums',
  'data_fetched_at',
  'errors',
];

function analyzeFile(filePath: string): DataPointAnalysis {
  const content = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  const filename = filePath.split('/').pop() || 'unknown';

  const presentKeys: string[] = [];
  const nullKeys: string[] = [];
  const missingKeys: string[] = [];
  const arrayLengths: Record<string, number> = {};

  // Check each expected key
  for (const key of EXPECTED_KEYS) {
    if (!(key in data)) {
      missingKeys.push(key);
    } else if (data[key] === null) {
      nullKeys.push(key);
    } else {
      presentKeys.push(key);
      
      // Count array lengths
      if (Array.isArray(data[key])) {
        arrayLengths[key] = data[key].length;
      }
    }
  }

  return {
    filename,
    totalKeys: Object.keys(data).length,
    presentKeys,
    nullKeys,
    missingKeys,
    arrayLengths,
  };
}

function main() {
  const dataDir = join(process.cwd(), 'data', 'rmf-funds');
  const files = readdirSync(dataDir).filter(f => f.endsWith('.json'));

  console.log(`\n╔════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║              RMF Fund Data Points Analysis                                 ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════════════╝\n`);

  console.log(`Analyzing ${files.length} fund files...\n`);

  const analyses: DataPointAnalysis[] = [];
  
  for (const file of files) {
    const filePath = join(dataDir, file);
    try {
      const analysis = analyzeFile(filePath);
      analyses.push(analysis);
    } catch (error) {
      console.error(`Error analyzing ${file}:`, error);
    }
  }

  // Summary statistics
  const keyStats: Record<string, { present: number; null: number; missing: number }> = {};
  
  for (const key of EXPECTED_KEYS) {
    keyStats[key] = { present: 0, null: 0, missing: 0 };
  }

  for (const analysis of analyses) {
    for (const key of EXPECTED_KEYS) {
      if (analysis.missingKeys.includes(key)) {
        keyStats[key].missing++;
      } else if (analysis.nullKeys.includes(key)) {
        keyStats[key].null++;
      } else {
        keyStats[key].present++;
      }
    }
  }

  // Print summary
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('DATA POINT SUMMARY (across all files)');
  console.log('════════════════════════════════════════════════════════════════════════════\n');
  
  console.log('Key'.padEnd(25) + 'Present'.padEnd(12) + 'Null'.padEnd(12) + 'Missing'.padEnd(12) + 'Coverage');
  console.log('─'.repeat(80));
  
  for (const [key, stats] of Object.entries(keyStats)) {
    const coverage = ((stats.present / analyses.length) * 100).toFixed(1) + '%';
    console.log(
      key.padEnd(25) +
      stats.present.toString().padEnd(12) +
      stats.null.toString().padEnd(12) +
      stats.missing.toString().padEnd(12) +
      coverage
    );
  }

  // Array length statistics
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('ARRAY LENGTH STATISTICS');
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  const arrayKeys = ['nav_history_30d', 'dividends', 'fees', 'involved_parties', 'risk_factors', 'errors'];
  
  for (const key of arrayKeys) {
    const lengths = analyses
      .map(a => a.arrayLengths[key] || 0)
      .filter(l => l > 0);
    
    if (lengths.length > 0) {
      const avg = (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1);
      const min = Math.min(...lengths);
      const max = Math.max(...lengths);
      console.log(`${key.padEnd(25)} Avg: ${avg.padEnd(8)} Min: ${min.toString().padEnd(6)} Max: ${max}`);
    }
  }

  // Per-file statistics
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('PER-FILE STATISTICS (Top 10 and Bottom 10)');
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  const sortedByKeys = [...analyses].sort((a, b) => b.totalKeys - a.totalKeys);
  
  console.log('Top 10 files (most data points):');
  console.log('─'.repeat(80));
  sortedByKeys.slice(0, 10).forEach(a => {
    const presentCount = a.presentKeys.length;
    const nullCount = a.nullKeys.length;
    console.log(`${a.filename.padEnd(30)} Keys: ${a.totalKeys.toString().padEnd(4)} Present: ${presentCount.toString().padEnd(4)} Null: ${nullCount}`);
  });

  console.log('\nBottom 10 files (least data points):');
  console.log('─'.repeat(80));
  sortedByKeys.slice(-10).forEach(a => {
    const presentCount = a.presentKeys.length;
    const nullCount = a.nullKeys.length;
    console.log(`${a.filename.padEnd(30)} Keys: ${a.totalKeys.toString().padEnd(4)} Present: ${presentCount.toString().padEnd(4)} Null: ${nullCount}`);
  });

  // Files with missing critical fields
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('FILES WITH MISSING CRITICAL FIELDS');
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  const criticalFields = ['symbol', 'fund_name', 'amc'];
  const filesWithMissing = analyses.filter(a => 
    criticalFields.some(field => a.missingKeys.includes(field))
  );

  if (filesWithMissing.length > 0) {
    filesWithMissing.forEach(a => {
      const missing = criticalFields.filter(f => a.missingKeys.includes(f));
      console.log(`${a.filename.padEnd(30)} Missing: ${missing.join(', ')}`);
    });
  } else {
    console.log('No files missing critical fields.');
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log(`Total files analyzed: ${analyses.length}`);
  console.log(`Expected data points per file: ${EXPECTED_KEYS.length}`);
  console.log(`Average data points per file: ${(analyses.reduce((sum, a) => sum + a.totalKeys, 0) / analyses.length).toFixed(1)}`);
  console.log('════════════════════════════════════════════════════════════════════════════\n');
}

main();

