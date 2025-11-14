# RMF Data Extraction Pipeline

This directory contains scripts for extracting comprehensive data for Thai Retirement Mutual Funds (RMF) from the SEC API.

## Pipeline Overview

The RMF data extraction process consists of two main phases:

### Phase 0: Build Fund Mapping
**Script:** `phase-0-build-mapping.ts`

Builds a complete mapping of RMF fund symbols to their `proj_id`s by fetching all funds from all AMCs through the SEC Fund Factsheet API.

**Output:** `data/fund-mapping.json`

**Usage:**
```bash
npm run data:rmf:build-mapping
```

**When to run:** Once to generate the mapping, then reuse for batch processing.

### Phase 1: Fetch All Funds
**Script:** `phase-1-fetch-all-funds.ts`

Processes all RMF funds from the CSV file (`docs/rmf-funds.csv`), fetching complete data for each fund using the mapping generated in Phase 0.

**Features:**
- Concurrent batch processing (4 funds at a time)
- Progress tracking with resume capability
- Respects SEC API rate limits (15-second delays between batches)
- Error handling with detailed logging
- Individual JSON file output per fund

**Output:** 
- `data/rmf-funds/{SYMBOL}.json` for each fund
- `data/progress.json` for tracking

**Usage:**
```bash
npm run data:rmf:fetch-all
```

**Rate Limiting:**
- 4 funds per batch
- 14 endpoints per fund = 56 API calls per batch
- 15-second delay between batches
- Throughput: ~3.7 API calls/second (well under 3,000 calls per 5 minutes limit)

## Data Consolidation

### Consolidate to CSV
**Script:** `consolidate-to-csv.ts`

Consolidates all 403 RMF fund JSON files into a single flattened CSV file optimized for chatbot/LLM querying.

**Features:**
- Flattens nested objects into separate columns
- Summarizes arrays (NAV history, dividends, fees, etc.)
- 60 columns with all key fund data
- Optimized for Market Pulse chatbot data source

**Output:** `docs/rmf-funds-consolidated.csv`

**Usage:**
```bash
npm run data:rmf:consolidate-csv
```

**CSV Structure:**
- One row per fund (403 rows)
- Core: fund_id, symbol, fund_name, amc
- Metadata: classification, style, dividend policy, risk level
- NAV: latest NAV data + 30-day history summary
- Performance: YTD, 3M, 6M, 1Y, 3Y, 5Y, 10Y, since inception
- Benchmark: name and returns for all time periods
- Fees: count and details (JSON)
- Asset allocation: full breakdown (JSON)
- Documents: factsheet, reports URLs
- Investment minimums: initial, additional, redemption

## Utility Scripts

### Identify Incomplete Funds
**Script:** `identify-incomplete-funds.ts`

Scans all RMF fund JSON files and identifies funds with incomplete data (all NULL values due to rate limiting).

**Criteria for incomplete fund:**
- errors array has 14 items (all endpoints failed)
- All data fields are NULL

**Output:**
- `data/incomplete-funds-report.json`
- `data/incomplete-funds-symbols.txt`

**Usage:**
```bash
npm run data:rmf:identify-incomplete
```

### Re-process Incomplete Funds
**Script:** `reprocess-incomplete-funds.ts`

Re-processes only the funds that have incomplete data (14 errors). Uses rate-limited batch processing (4 funds per batch, 15-second delays).

**Usage:**
```bash
npm run data:rmf:reprocess
```

## Core Data Fetcher

**Script:** `fetch-complete-fund-data.ts`

Core module that fetches ALL available data points for an RMF fund from SEC APIs:

- Daily NAV data (latest + history)
- Dividend history
- Performance metrics (all time periods)
- Benchmark data
- Risk metrics (volatility, tracking error)
- Asset allocation
- Fund category/classification
- Fee structure
- Involved parties
- Top 5 holdings
- Risk factors
- Suitability info
- Document URLs
- Investment minimums

This module is used by Phase 1 and the re-processing script.

## Data Parsing

**Script:** `scripts/data-parsing/rmf/parse-rmf-funds.js`

Parses HTML table from `docs/RMF-Fund-Comparison.md` and outputs structured data to:
- `docs/rmf-funds.csv`
- `docs/rmf-funds.md`

**Usage:**
```bash
npm run data:rmf:parse
```

## Workflow

1. **Parse fund list** (if needed):
   ```bash
   npm run data:rmf:parse
   ```

2. **Build fund mapping** (Phase 0):
   ```bash
   npm run data:rmf:build-mapping
   ```

3. **Fetch all funds** (Phase 1):
   ```bash
   npm run data:rmf:fetch-all
   ```

4. **Identify incomplete funds** (if needed):
   ```bash
   npm run data:rmf:identify-incomplete
   ```

5. **Re-process incomplete funds** (if needed):
   ```bash
   npm run data:rmf:reprocess
   ```

## Rate Limiting

The SEC API has a rate limit of **3,000 calls per 5 minutes** (10 calls/second).

Our configuration:
- **Batch size:** 4 funds
- **Calls per batch:** 56 (4 funds × 14 endpoints)
- **Delay between batches:** 15 seconds
- **Effective rate:** ~3.7 calls/second
- **Safety margin:** 63% capacity usage

This ensures we stay well under the rate limit and avoid API errors.

## Output Structure

Each fund JSON file contains:
- Fund identifiers (fund_id, symbol, fund_name, amc)
- Metadata (classification, management style, dividend policy, risk level)
- Latest NAV and 30-day history
- Dividend history
- Performance metrics (YTD, 3M, 6M, 1Y, 3Y, 5Y, 10Y, Since Inception)
- Benchmark data
- Risk metrics
- Asset allocation
- Category/peer group
- Fee structure
- Involved parties
- Top 5 holdings
- Risk factors
- Suitability info
- Document URLs
- Investment minimums
- Data fetch timestamp
- Errors array (if any endpoints failed)

## Requirements

- `SEC_API_KEY` environment variable must be set
- `docs/rmf-funds.csv` must exist (generated by parse script)
- `data/fund-mapping.json` must exist (generated by Phase 0)

## Expected Outputs

### File Locations and Counts

After running the complete pipeline, you should have:

**Phase 0 Output:**
- `data/fund-mapping.json` (~117 KB)
  - Contains 400 RMF fund mappings (394 active, 6 cancelled)
  - Maps fund symbols to SEC `proj_id` values

**Phase 1 Output:**
- `data/rmf-funds/` directory with ~403 JSON files
  - One file per successfully processed fund: `{SYMBOL}.json`
  - Average file size: ~5-10 KB per fund
  - Total directory size: ~2-4 MB
- `data/progress.json` (gitignored)
  - Tracks processing progress
  - Contains: total processed, successful count, failed count, skipped count

**Data Parsing Output:**
- `docs/rmf-funds.csv` (~410 funds)
- `docs/rmf-funds.md` (~410 funds)

**Utility Script Outputs:**
- `data/incomplete-funds-report.json` (if incomplete funds found)
- `data/incomplete-funds-symbols.txt` (if incomplete funds found)

### Expected Data Completeness

A successfully processed fund JSON file should contain:
- ✅ Latest NAV data
- ✅ 30-day NAV history (20-30 records typical)
- ✅ Performance metrics (8 time periods)
- ✅ Benchmark data
- ✅ Asset allocation (1-5 asset classes)
- ✅ Fee structure (5-10 fee items)
- ✅ Involved parties (fund managers)
- ✅ Risk factors
- ✅ Suitability information
- ✅ Document URLs
- ✅ Investment minimums

**Note:** Some funds may have NULL values for:
- Risk metrics (volatility/tracking error) - not available for all funds
- Category/peer group - not always provided
- Top 5 holdings - may not be available for all fund types

### Sample Output Structure

```json
{
  "fund_id": "M0774_2554",
  "symbol": "ABAPAC-RMF",
  "fund_name": "abrdn Asia Pacific Equity Retirement Mutual Fund",
  "amc": "ABERDEEN ASSET MANAGEMENT (THAILAND) LIMITED",
  "metadata": {
    "fund_classification": "EQASxJP",
    "management_style": "AM",
    "dividend_policy": "No",
    "risk_level": 6,
    "fund_type": "RMF"
  },
  "latest_nav": { ... },
  "nav_history_30d": [ ... ],
  "dividend_history": [ ... ],
  "performance": { ... },
  "benchmark": { ... },
  "asset_allocation": [ ... ],
  "fees": [ ... ],
  "involved_parties": [ ... ],
  "top_holdings": [ ... ],
  "risk_factors": [ ... ],
  "suitability": { ... },
  "document_urls": { ... },
  "investment_minimums": { ... },
  "fetched_at": "2025-11-11T04:41:23.000Z",
  "errors": []
}
```

## Troubleshooting

### Common Issues

**1. "Not found in fund mapping" errors**
- **Cause:** Fund symbol in CSV doesn't match SEC API symbol
- **Solution:** The script uses variant suffix matching (e.g., `SCBRMASHARES(A)` → `SCBRMASHARES`). If still not found, the fund may be:
  - Cancelled/liquidated (status: CA, LI, EX)
  - Not an RMF fund
  - Symbol mismatch in source data

**2. Many NULL values in output files**
- **Cause:** Rate limiting exceeded or API errors
- **Solution:** 
  1. Run `npm run data:rmf:identify-incomplete` to find incomplete funds
  2. Run `npm run data:rmf:reprocess` to re-process incomplete funds
  3. Check `SEC_API_KEY` is valid and has proper subscriptions

**3. "SEC Fund Factsheet API rate limit exceeded"**
- **Cause:** Too many API calls in short time
- **Solution:** The script automatically handles rate limits with delays. If you see this error:
  - Wait 5 minutes before retrying
  - Reduce `CONCURRENT_BATCH_SIZE` in `phase-1-fetch-all-funds.ts` (default: 4)
  - Increase `BATCH_DELAY_MS` (default: 15000)

**4. Progress file shows incorrect counts**
- **Cause:** Script was interrupted or manually modified
- **Solution:** Delete `data/progress.json` to start fresh, or manually edit to correct counts

**5. "ENOENT: no such file or directory"**
- **Cause:** Missing required files
- **Solution:** Ensure you've run:
  1. `npm run data:rmf:parse` (creates `docs/rmf-funds.csv`)
  2. `npm run data:rmf:build-mapping` (creates `data/fund-mapping.json`)

**6. API returns empty responses**
- **Cause:** Invalid API key or expired subscription
- **Solution:** 
  - Verify `SEC_API_KEY` in `.env` file
  - Check API key has subscriptions to:
    - Fund Factsheet API
    - Fund Daily Info API
  - Test with: `GET /api/debug/sec` endpoint

**7. Script hangs or stops processing**
- **Cause:** Network issues or API timeout
- **Solution:**
  - Check internet connection
  - Verify SEC API is accessible
  - Script saves progress after each batch - can resume by running again

### Getting Help

- Check `data/batch-process.log` (gitignored) for detailed error logs
- Review individual fund JSON files' `errors` array for specific endpoint failures
- Verify API key permissions and rate limits at https://api-portal.sec.or.th/

## Notes

- Progress is saved after each batch, allowing for resume capability
- Failed funds are tracked and can be re-processed
- Variant suffix matching handles symbols like `SCBRMASHARES(A)` → `SCBRMASHARES`
- Estimated time for full 410 fund run: ~86 minutes

