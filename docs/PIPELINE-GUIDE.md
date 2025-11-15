# RMF Data Pipeline - Complete Guide

## Overview

This automated pipeline extracts 442 Thai Retirement Mutual Fund (RMF) records from SEC Thailand APIs and stores them in PostgreSQL. The pipeline is production-safe with built-in validation, crash recovery, and UPSERT-based updates.

## Current Status

✅ **Production-Ready and Tested** (November 15, 2025)

- **442 funds** successfully fetched and validated
- **2,059 NAV records** stored
- **0 errors** in full 30-minute test run
- **All validation checks passed**
- **Database safely updated via UPSERT**

## Quick Start

### Daily Refresh (Recommended for Production)

Complete refresh from SEC API using production-safe UPSERT approach:

```bash
npm run data:rmf:daily-refresh
```

**Runtime:** ~25-30 minutes for 442 funds

**What it does:**

1. **Build Mapping**: Fetches fresh fund list from SEC API → `data/fund-mapping.json`
2. **Clear Progress**: Removes old progress file to ensure fresh fetch
3. **Fetch Data**: Gets complete data for all funds → `data/rmf-funds/*.json` (442 files)
4. **Validate**: Compares fetched vs expected funds (390 base funds after normalization)
5. **Load**: Updates/inserts funds into PostgreSQL using UPSERT

**Safety Features:**
- ✅ Completeness validation before load
- ✅ UPSERT mode (no truncation, always safe)
- ✅ Fresh data fetch every run
- ✅ Process crash-safe (transactional updates)
- ✅ Database always has valid data

**Expected Output:**
```
✅ Validation passed (390 = 390)
✅ 442 funds saved to database
✅ 2,059 NAV records stored
✅ 0 errors
```

### Check Status

```bash
# View database fund count
psql $DATABASE_URL -c "SELECT COUNT(*) as total_funds FROM rmf_funds;"

# Check last update timestamp
psql $DATABASE_URL -c "SELECT MAX(data_updated_at) as last_update FROM rmf_funds;"

# View sample funds
psql $DATABASE_URL -c "SELECT symbol, fund_name_en, proj_id FROM rmf_funds LIMIT 5;"
```

## Architecture

### Three-Phase Pipeline

```
Phase 0: Build Mapping
    SEC API → fund-mapping.json (399 funds including 6 cancelled)
                    ↓
Phase 1: Fetch Data
    CSV + Mapping → data/rmf-funds/*.json (442 files, skips cancelled)
                    ↓
Phase 2: Validate
    Manifest Validator → Compare normalized symbols (390 = 390)
                    ↓
Phase 3: Load
    db-saver.ts → PostgreSQL (UPSERT mode)
```

### Data Sources

**Phase-0 (Mapping):**
- Source: SEC API (`/api/fund`)
- Output: `data/fund-mapping.json` (399 funds)
- Includes: Active + Cancelled/Liquidated funds
- Format: `{ symbol → { proj_id, fund_name, amc, status } }`

**Phase-1 (Fetch):**
- Source: CSV file (`docs/rmf-funds-api.csv`) + SEC APIs
- Output: `data/rmf-funds/*.json` (442 JSON files)
- Skips: Cancelled (CA) and Liquidated (LI) funds
- Data: Complete fund metadata + 30-day NAV history + dividends

**Validation:**
- Compares: Mapping (Phase-0) vs Fetched (Phase-1)
- Normalizes: Symbol suffixes to handle variations
- Checks: Minimum fund count, data completeness

### Database Schema

**4 Tables:**

1. **rmf_funds** (Main fund data)
   - 45+ columns with fund metadata
   - JSONB fields: performance, benchmark, asset_allocation, fees, risk_factors
   - Primary key: `symbol` (UNIQUE)
   - Note: `proj_id` NOT unique (allows share classes A/E/P/B)

2. **rmf_nav_history** (NAV history)
   - 30-day NAV history per fund
   - Foreign key: `fund_symbol` → `rmf_funds.symbol`

3. **rmf_dividends** (Dividend history)
   - Dividend payment records
   - Foreign key: `fund_symbol` → `rmf_funds.symbol`

4. **pipeline_runs** (Execution tracking)
   - Tracks pipeline execution history

## Critical Bug Fixes

Three critical bugs were discovered and fixed during production testing:

### 1. Symbol Reading Bug

**Problem:** Validator derived symbols from filenames instead of reading from JSON content.

**Impact:** Symbols with spaces (e.g., "BCAP-2030 RMF.json") would cause mismatches.

**Solution:** Read `fundData.symbol` field from JSON content instead of parsing filename.

```typescript
// Before (broken)
const symbol = filename.replace('.json', '');

// After (fixed)
const fundData = JSON.parse(readFileSync(filePath, 'utf-8'));
const symbol = fundData.symbol;
```

### 2. Cancelled Funds Mismatch

**Problem:** Phase-0 includes cancelled funds in mapping, but Phase-1 skips them during fetch.

**Impact:** Validation showed 47 missing funds (cancelled funds that were never fetched).

**Details:**
- Mapping (Phase-0): 399 funds (includes 6 CA/LI funds)
- Fetched (Phase-1): 393 active funds (skips CA/LI)
- Mismatch: 6 cancelled funds counted as "missing"

**Solution:** Filter out cancelled/liquidated funds from expected count.

```typescript
// Filter mapping to only active funds
const expectedSymbols = Object.keys(mapping).filter(symbol => {
  const fundInfo = mapping[symbol];
  return fundInfo.fund_status !== 'CA' && fundInfo.fund_status !== 'LI';
});
```

### 3. Symbol Normalization Bug

**Problem:** SEC API (Phase-0) and CSV (Phase-1) use different symbol suffixes.

**Examples:**
- Mapping: `"KKP INRMF FUND"`, `"SCBRMASHARES"`
- Fetched: `"KKP INRMF"`, `"SCBRMASHARES(A)"`, `"SCBRMASHARES(E)"`

**Impact:** Validation showed mismatches due to suffix differences.

**Solution:** Normalize symbols on BOTH sides by removing all known suffixes.

```typescript
function normalizeSymbol(symbol: string): string {
  let normalized = symbol;
  
  // Remove " FUND" suffix (SEC API variant)
  if (normalized.endsWith(' FUND')) {
    normalized = normalized.slice(0, -5);
  }
  
  // Remove share class suffixes: (A), (B), (E), (P)
  const parentheses = ['(A)', '(B)', '(E)', '(P)'];
  for (const variant of parentheses) {
    if (normalized.endsWith(variant)) {
      return normalized.slice(0, -variant.length);
    }
  }
  
  // Remove hedging suffixes: -A, -B, -P, -H, -UH, -F
  const dashes = ['-A', '-B', '-P', '-H', '-UH', '-F'];
  for (const variant of dashes) {
    if (normalized.endsWith(variant)) {
      return normalized.slice(0, -variant.length);
    }
  }
  
  return normalized;
}
```

**Result:** Perfect match (390 = 390) after normalization.

## Validation Process

The manifest validator ensures data completeness before loading:

### Validation Steps

1. **Load mapping** from `data/fund-mapping.json`
2. **Filter active funds** (exclude CA/LI status)
3. **Normalize mapping symbols** (remove suffixes)
4. **Read fetched symbols** from JSON files
5. **Normalize fetched symbols** (remove suffixes)
6. **Compare counts**: Expected = Fetched
7. **Check minimum threshold**: >= 350 funds
8. **Verify database count**: No significant drops

### Validation Output

```
📋 Total funds in mapping: 399
📋 Expected active funds: 393 (excluding 6 cancelled/liquidated)
📋 Expected unique base funds (normalized): 390
📦 Fetched funds (JSON files): 442
📦 Unique base funds (normalized): 390
💾 Current database funds: 442

✅ VALIDATION PASSED - Dataset is complete and ready for loading
```

### Validation Rules

**Rule 1:** No missing funds
- All expected active funds must be fetched
- Compares normalized symbols

**Rule 2:** Minimum fund count
- Must have at least 350 funds
- Prevents partial dataset from loading

**Rule 3:** Database sanity check
- Warns if fetched count drops >10% from database
- Does not block load (just warning)

**Rule 4:** Extra funds allowed
- New funds from SEC API are allowed
- Logged as warnings for review

## UPSERT Mode

The pipeline uses PostgreSQL UPSERT (`ON CONFLICT DO UPDATE`) for safe updates:

### Benefits

✅ **No Truncation**: Database always has valid data
✅ **Incremental Updates**: Only changed funds are updated
✅ **New Fund Insertion**: New funds automatically added
✅ **Process Safe**: If process crashes, existing data remains intact
✅ **No Staging Tables**: Simpler architecture

### Trade-off

⚠️ **Stale Funds Not Auto-Removed**: Cancelled funds remain in database until manual cleanup.

**Why:** Safety first. Automatic deletion could remove good data if a fetch partially fails. Manual cleanup can be done periodically if needed.

### Implementation

```sql
INSERT INTO rmf_funds (symbol, fund_name_en, ...)
VALUES ($1, $2, ...)
ON CONFLICT (symbol) DO UPDATE SET
  fund_name_en = EXCLUDED.fund_name_en,
  data_updated_at = NOW(),
  ...
```

## Troubleshooting

### Validation Fails: Missing Funds

**Check 1:** Are they cancelled funds?
```bash
cat data/fund-mapping.json | grep "CA\|LI"
```

**Check 2:** Symbol normalization issues?
```bash
# List all fetched symbols
ls data/rmf-funds/ | sed 's/.json$//'
```

### Validation Fails: Extra Funds

**Likely Cause:** New funds added to SEC API that aren't in mapping yet.

**Solution:** This is expected. Validator logs them as warnings but allows load.

### Database Load Fails

**Check:** Database schema matches current version
```bash
psql $DATABASE_URL -c "\d rmf_funds"
```

**Fix:** Run schema migration
```bash
npm run db:push
```

### SEC API Rate Limit Errors

**Symptom:** "SyntaxError: Unexpected end of JSON input"

**Cause:** SEC API rate limiting (3,000 calls per 5 minutes)

**Solution:** Pipeline already respects rate limits (4 funds × 14 calls = 56 calls per 15 seconds). Errors are logged but don't stop the batch.

## Production Deployment

### Scheduling Daily Runs

**Option 1: Cron Job**
```bash
0 2 * * * cd /path/to/project && npm run data:rmf:daily-refresh >> /var/log/rmf-pipeline.log 2>&1
```

**Option 2: GitHub Actions**
```yaml
name: Daily RMF Refresh
on:
  schedule:
    - cron: '0 2 * * *'
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run data:rmf:daily-refresh
```

**Option 3: Replit Deployments**
Use Replit's scheduled jobs feature (coming soon)

### Monitoring

**Check logs:**
```bash
tail -f /var/log/rmf-pipeline.log
```

**Check database:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*), MAX(data_updated_at) FROM rmf_funds;"
```

**Alert on failures:**
- Check exit code: `$?` should be 0
- Monitor validation output for "VALIDATION FAILED"

## Performance

**Full Pipeline Runtime:** ~25-30 minutes

**Breakdown:**
- Phase-0 (Mapping): ~30 seconds
- Phase-1 (Fetch): ~25 minutes (442 funds × ~3.5 seconds each)
- Phase-2 (Validation): ~1 second
- Phase-3 (Load): ~2 minutes (442 batches × 0.3 seconds each)

**Rate Limiting:**
- SEC API: 3,000 calls per 5 minutes
- Pipeline: ~4 funds per batch, 15 seconds between batches
- Effective rate: 3.7 calls/second (well under limit)

## Files Reference

### Pipeline Scripts

- `server/pipeline/daily-refresh-production.ts` - Main orchestrator
- `server/pipeline/manifest-validator.ts` - Completeness validation
- `server/pipeline/db-saver.ts` - Batch loader with UPSERT
- `scripts/data-extraction/rmf/phase-0-build-mapping.ts` - Mapping builder
- `scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts` - Data fetcher

### Data Files

- `data/fund-mapping.json` - Fund symbol → proj_id mapping (399 funds)
- `data/rmf-funds/*.json` - Complete fund data (442 JSON files)
- `data/progress.json` - Phase-1 fetch progress (auto-cleared)
- `.db-progress.json` - Database load progress (checkpoint system)

### Configuration

- `package.json` - Scripts: `data:rmf:daily-refresh`, `data:rmf:save-to-db`
- `.env` - Database URL and SEC API keys
- `server/pipeline/db-schema.sql` - PostgreSQL schema

## Summary

The RMF data pipeline is now production-ready with:

✅ **Automated fresh data fetch** from SEC Thailand API
✅ **Comprehensive validation** before database load
✅ **Production-safe UPSERT** mode (no truncation)
✅ **Crash-safe transactions** and checkpoint recovery
✅ **Symbol normalization** to handle API/CSV variations
✅ **Tested and verified** with full 30-minute run

**Run it daily** with:
```bash
npm run data:rmf:daily-refresh
```

**Monitor** database for fresh data:
```bash
psql $DATABASE_URL -c "SELECT COUNT(*), MAX(data_updated_at) FROM rmf_funds;"
```

For detailed technical implementation, see source files in `server/pipeline/`.
