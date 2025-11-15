/**
 * Manifest Validator - Ensures completeness before database load
 * 
 * Validates that the fetched dataset is complete by comparing:
 * - JSON files in data/rmf-funds/ vs fund-mapping.json
 * - Fund count vs previous successful run
 * - Sanity checks on data quality
 * 
 * Prevents partial datasets from being loaded into production.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

/**
 * Normalize fund symbol by removing share class suffixes
 * Handles variations between SEC API (Phase-0) and CSV (Phase-1)
 */
function normalizeSymbol(symbol: string): string {
  let normalized = symbol;
  
  // Remove " FUND" suffix (SEC API adds this to some KKP funds)
  if (normalized.endsWith(' FUND')) {
    normalized = normalized.slice(0, -5); // Remove ' FUND'
  }
  
  // Remove parentheses variants: (A), (B), (E), (P)
  const parenthesesVariants = ['(A)', '(B)', '(E)', '(P)'];
  for (const variant of parenthesesVariants) {
    if (normalized.endsWith(variant)) {
      return normalized.slice(0, -variant.length);
    }
  }

  // Remove dash variants: -A, -B, -P, -H, -UH, -F
  const dashVariants = ['-A', '-B', '-P', '-H', '-UH', '-F'];
  for (const variant of dashVariants) {
    if (normalized.endsWith(variant)) {
      return normalized.slice(0, -variant.length);
    }
  }

  return normalized;
}

export interface ValidationResult {
  valid: boolean;
  stats: {
    expected_funds: number;
    fetched_funds: number;
    missing_funds: string[];
    extra_funds: string[];
    current_db_count: number;
  };
  errors: string[];
  warnings: string[];
}

export interface FundMappingFile {
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
  };
}

/**
 * Validate completeness of fetched RMF fund data
 */
export async function validateManifest(databaseUrl: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    stats: {
      expected_funds: 0,
      fetched_funds: 0,
      missing_funds: [],
      extra_funds: [],
      current_db_count: 0,
    },
    errors: [],
    warnings: [],
  };

  try {
    // Step 1: Load fund mapping (source of truth)
    const mappingPath = join(process.cwd(), 'data', 'fund-mapping.json');
    
    if (!existsSync(mappingPath)) {
      result.errors.push('fund-mapping.json not found - cannot validate completeness');
      result.valid = false;
      return result;
    }

    const mappingData: FundMappingFile = JSON.parse(readFileSync(mappingPath, 'utf-8'));
    
    // Filter out cancelled/liquidated funds (Phase-1 skips these)
    const activeSymbols = Object.keys(mappingData.mapping).filter(
      symbol => {
        const fundInfo = mappingData.mapping[symbol];
        return fundInfo.fund_status !== 'CA' && fundInfo.fund_status !== 'LI';
      }
    );
    
    // Normalize expected symbols (SEC API may have different suffixes than CSV)
    const expectedNormalizedSymbols = new Set(activeSymbols.map(normalizeSymbol));
    
    result.stats.expected_funds = activeSymbols.length;
    const totalInMapping = Object.keys(mappingData.mapping).length;
    const cancelledCount = totalInMapping - activeSymbols.length;

    console.log(`📋 Total funds in mapping: ${totalInMapping}`);
    console.log(`📋 Expected active funds: ${activeSymbols.length} (excluding ${cancelledCount} cancelled/liquidated)`);
    console.log(`📋 Expected unique base funds (normalized): ${expectedNormalizedSymbols.size}`);

    // Step 2: Check fetched JSON files
    const dataDir = join(process.cwd(), 'data', 'rmf-funds');
    
    if (!existsSync(dataDir)) {
      result.errors.push('data/rmf-funds/ directory not found');
      result.valid = false;
      return result;
    }

    const jsonFiles = readdirSync(dataDir).filter(f => f.endsWith('.json'));
    
    // Read actual symbols from JSON files (don't derive from filenames)
    const fetchedSymbols: string[] = [];
    const fetchedNormalizedSymbols = new Set<string>();
    
    for (const file of jsonFiles) {
      try {
        const filePath = join(dataDir, file);
        const fundData = JSON.parse(readFileSync(filePath, 'utf-8'));
        if (fundData.symbol) {
          fetchedSymbols.push(fundData.symbol);
          // Normalize to base symbol (remove share class suffixes)
          fetchedNormalizedSymbols.add(normalizeSymbol(fundData.symbol));
        }
      } catch (error) {
        // Skip files that can't be parsed
        console.warn(`  ⚠️  Could not read symbol from ${file}`);
      }
    }
    
    result.stats.fetched_funds = fetchedSymbols.length;

    console.log(`📦 Fetched funds (JSON files): ${result.stats.fetched_funds}`);
    console.log(`📦 Unique base funds (normalized): ${fetchedNormalizedSymbols.size}`);

    // Step 3: Find missing funds (in mapping but not fetched)
    // Compare using normalized symbols (base symbols without share class suffixes)
    result.stats.missing_funds = Array.from(expectedNormalizedSymbols).filter(
      normalizedSymbol => !fetchedNormalizedSymbols.has(normalizedSymbol)
    );

    // Step 4: Find extra funds (fetched but not in mapping)
    // These are normalized symbols that don't have a mapping entry
    result.stats.extra_funds = Array.from(fetchedNormalizedSymbols).filter(
      normalizedSymbol => !expectedNormalizedSymbols.has(normalizedSymbol)
    );

    // Step 5: Get current database count
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      const countResult = await pool.query('SELECT COUNT(*) as count FROM rmf_funds');
      result.stats.current_db_count = parseInt(countResult.rows[0].count);
      console.log(`💾 Current database funds: ${result.stats.current_db_count}`);
    } catch (dbError: any) {
      result.warnings.push(`Could not query database: ${dbError.message}`);
    } finally {
      await pool.end();
    }

    // Step 6: Validation rules
    
    // Rule 1: No missing funds allowed (all expected funds must be fetched)
    if (result.stats.missing_funds.length > 0) {
      result.errors.push(
        `Missing ${result.stats.missing_funds.length} expected funds: ${result.stats.missing_funds.slice(0, 10).join(', ')}${result.stats.missing_funds.length > 10 ? '...' : ''}`
      );
      result.valid = false;
    }

    // Rule 2: Fetched count must not be significantly less than current DB
    const MIN_EXPECTED_FUNDS = 350; // Minimum threshold
    if (result.stats.fetched_funds < MIN_EXPECTED_FUNDS) {
      result.errors.push(
        `Fetched only ${result.stats.fetched_funds} funds, expected at least ${MIN_EXPECTED_FUNDS}`
      );
      result.valid = false;
    }

    // Rule 3: Warn if fetched count drops significantly from current DB
    if (result.stats.current_db_count > 0) {
      const dropPercentage = ((result.stats.current_db_count - result.stats.fetched_funds) / result.stats.current_db_count) * 100;
      if (dropPercentage > 10) {
        result.warnings.push(
          `Fetched count is ${dropPercentage.toFixed(1)}% lower than current database (${result.stats.fetched_funds} vs ${result.stats.current_db_count})`
        );
      }
    }

    // Rule 4: Info about extra funds
    if (result.stats.extra_funds.length > 0) {
      result.warnings.push(
        `Found ${result.stats.extra_funds.length} extra funds not in mapping (possibly new funds): ${result.stats.extra_funds.slice(0, 5).join(', ')}${result.stats.extra_funds.length > 5 ? '...' : ''}`
      );
    }

    return result;

  } catch (error: any) {
    result.errors.push(`Validation failed: ${error.message}`);
    result.valid = false;
    return result;
  }
}

/**
 * Print validation results in a human-readable format
 */
export function printValidationResults(result: ValidationResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 MANIFEST VALIDATION RESULTS');
  console.log('='.repeat(70));
  
  console.log(`\n✓ Expected funds:  ${result.stats.expected_funds}`);
  console.log(`✓ Fetched funds:   ${result.stats.fetched_funds}`);
  console.log(`✓ Database funds:  ${result.stats.current_db_count}`);
  console.log(`✓ Missing funds:   ${result.stats.missing_funds.length}`);
  console.log(`✓ Extra funds:     ${result.stats.extra_funds.length}`);

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    result.warnings.forEach(warning => console.log(`   - ${warning}`));
  }

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n' + '='.repeat(70));
  
  if (result.valid) {
    console.log('✅ VALIDATION PASSED - Dataset is complete and ready for loading');
  } else {
    console.log('❌ VALIDATION FAILED - Dataset is incomplete, aborting load');
  }
  
  console.log('='.repeat(70) + '\n');
}
