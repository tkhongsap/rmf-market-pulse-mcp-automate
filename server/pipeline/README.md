# RMF Data Pipeline - Technical Documentation

## Overview

Production-safe automated pipeline for Thai RMF fund data extraction and database updates.

**Status:** ✅ Production-ready (tested Nov 15, 2025)

## Quick Reference

### Run Daily Refresh

```bash
npm run data:rmf:daily-refresh
```

**Expected runtime:** 25-30 minutes  
**Output:** 442 funds → PostgreSQL via UPSERT

### Components

```
daily-refresh-production.ts  → Main orchestrator
manifest-validator.ts        → Data completeness validation
db-saver.ts                  → Batch loader with UPSERT
db-schema.sql                → PostgreSQL schema definition
```

## Architecture

### Pipeline Flow

```
1. Phase-0: SEC API → fund-mapping.json (399 funds)
2. Clear: Remove old progress.json
3. Phase-1: CSV + APIs → 442 JSON files (skips cancelled)
4. Validate: Compare normalized symbols (390 = 390)
5. Load: UPSERT to PostgreSQL
```

### Safety Mechanisms

✅ **Completeness Validation**
- Compares expected vs fetched funds
- Aborts if mismatch detected
- Minimum threshold check (350+ funds)

✅ **Symbol Normalization**
- Handles SEC API vs CSV differences
- Removes: (A), (B), (E), (P), -A, -B, -P, -H, -UH, -F, " FUND"
- Filters cancelled/liquidated (CA/LI) funds

✅ **UPSERT Mode**
- No truncation (database always safe)
- Transactional updates
- Crash recovery via checkpoints

## Critical Bugs Fixed

### 1. Symbol Reading (Nov 15, 2025)
**Issue:** Derived symbols from filenames  
**Impact:** Failed on spaces ("BCAP-2030 RMF.json")  
**Fix:** Read from JSON content

### 2. Cancelled Funds (Nov 15, 2025)
**Issue:** Mapping included CA/LI, fetcher skipped them  
**Impact:** 6 false "missing" funds  
**Fix:** Filter expected symbols by status

### 3. Symbol Normalization (Nov 15, 2025)
**Issue:** SEC API vs CSV suffix mismatch  
**Impact:** 47 false mismatches  
**Fix:** Normalize both sides

## Validation Logic

### Input
- **Expected:** Active funds from mapping (normalized)
- **Fetched:** JSON files from data/rmf-funds/ (normalized)

### Rules

1. **Zero Missing**: All expected funds must be fetched
2. **Minimum Count**: ≥ 350 funds required
3. **Sanity Check**: Warn if <10% drop from database
4. **Extra Funds**: Allowed (logged as warnings)

### Normalization

```typescript
"KKP INRMF FUND"      → "KKP INRMF"
"SCBRMASHARES(A)"     → "SCBRMASHARES"
"SCBRMASHARES(E)"     → "SCBRMASHARES"
"UOBGRMF-H"           → "UOBGRMF"
"KKP GNP RMF-UH"      → "KKP GNP RMF"
```

### Output

```
✅ Expected: 390 unique base funds
✅ Fetched:  390 unique base funds
✅ Missing:  0
✅ Extra:    0
✅ VALIDATION PASSED
```

## Database Operations

### UPSERT Query

```sql
INSERT INTO rmf_funds (symbol, fund_name_en, proj_id, ...)
VALUES ($1, $2, $3, ...)
ON CONFLICT (symbol) DO UPDATE SET
  fund_name_en = EXCLUDED.fund_name_en,
  proj_id = EXCLUDED.proj_id,
  data_updated_at = NOW(),
  ...;
```

### Batch Processing

- **Batch size:** 1 fund (maximum reliability)
- **Total batches:** 442
- **Checkpoint:** After each batch → `.db-progress.json`
- **Resume:** Auto-resume from last checkpoint
- **Transactions:** Each fund in its own transaction

### Schema

**Tables:**
- `rmf_funds` - 45+ columns, JSONB fields
- `rmf_nav_history` - 30-day NAV per fund
- `rmf_dividends` - Dividend history
- `pipeline_runs` - Execution tracking

**Key Constraints:**
- `symbol` = UNIQUE (primary key)
- `proj_id` = NOT unique (allows share classes)

## Error Handling

### SEC API Errors

**Symptom:** "Unexpected end of JSON input"  
**Cause:** Rate limiting / network issues  
**Handling:** Logged but doesn't stop batch

### Validation Failures

**Symptom:** "Missing X expected funds"  
**Handling:** Pipeline aborts, database unchanged

### Load Failures

**Symptom:** PostgreSQL error during UPSERT  
**Handling:** Transaction rollback, continue to next fund

## Testing

### Manual Test

```bash
# Run full pipeline
npm run data:rmf:daily-refresh

# Check results
psql $DATABASE_URL -c "SELECT COUNT(*), MAX(data_updated_at) FROM rmf_funds;"
```

### Validation Only

```bash
npx tsx -e "(async () => {
  const { validateManifest, printValidationResults } = await import('./server/pipeline/manifest-validator.js');
  const result = await validateManifest(process.env.DATABASE_URL);
  printValidationResults(result);
})()"
```

### Expected Results

```
✅ 442 funds saved
✅ 2,059 NAV records
✅ 0 errors
✅ Validation: 390 = 390
```

## Performance

**Timing:**
- Phase-0 (Mapping): 30s
- Phase-1 (Fetch): 25min
- Phase-2 (Validate): 1s
- Phase-3 (Load): 2min

**Rate Limits:**
- SEC API: 3,000 calls / 5 min
- Pipeline: ~4 funds / 15 sec
- Effective: 3.7 calls/sec ✅

## Production Deployment

### Environment Variables

```bash
DATABASE_URL=postgresql://...
SEC_API_KEY=your_key_here
```

### Scheduling

**Cron:**
```bash
0 2 * * * cd /path && npm run data:rmf:daily-refresh >> /var/log/rmf.log 2>&1
```

**Monitoring:**
```bash
# Check exit code
echo $? # Should be 0

# Check database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rmf_funds;"
```

## Troubleshooting

### Issue: Validation fails with missing funds

**Check cancelled funds:**
```bash
cat data/fund-mapping.json | jq '.mapping | to_entries[] | select(.value.fund_status=="CA" or .value.fund_status=="LI")'
```

### Issue: Database schema mismatch

**Fix schema:**
```bash
npm run db:push --force
```

### Issue: Progress file exists

**Clear manually:**
```bash
rm data/progress.json
```

## Development

### Add New Normalization Rule

Edit `manifest-validator.ts`:

```typescript
function normalizeSymbol(symbol: string): string {
  // Add new suffix here
  if (symbol.endsWith('YOUR_SUFFIX')) {
    return symbol.slice(0, -SUFFIX_LENGTH);
  }
  // ... existing rules
}
```

### Modify Validation Rules

Edit `manifest-validator.ts`:

```typescript
// Rule 2: Minimum threshold
const MIN_EXPECTED_FUNDS = 350; // Adjust this
```

### Change Batch Size

Edit `db-saver.ts`:

```typescript
const BATCH_SIZE = 1; // Adjust this
```

## Support

For detailed documentation, see:
- **User Guide:** `docs/PIPELINE-GUIDE.md`
- **Architecture:** `replit.md`
- **Source Code:** `server/pipeline/*.ts`

## Changelog

**Nov 15, 2025**
- ✅ Fixed symbol reading from JSON (not filenames)
- ✅ Fixed cancelled fund filtering
- ✅ Fixed symbol normalization (both sides)
- ✅ Tested full 30-minute run (442 funds, 0 errors)
- ✅ Production-ready status confirmed
