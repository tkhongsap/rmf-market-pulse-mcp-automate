# RMF Data Pipeline - Complete Guide

## Overview

This guide explains how to use the automated data pipeline that extracts 442 Thai Retirement Mutual Fund (RMF) records from SEC Thailand APIs and stores them in PostgreSQL.

## Current Status

✅ **Pipeline Ready**: All components are production-ready
- **Data Files**: 442 JSON files with complete fund data in `data/rmf-funds/`
- **Database Schema**: Fixed and ready (allows multiple share classes per project)
- **Batch System**: Checkpoint/resume capability implemented
- **Current Progress**: 94 funds loaded, 348 remaining

## Quick Start

### Load All Funds (Recommended)

Run this command multiple times until all 442 funds are loaded:

```bash
FUND_LIMIT=450 npm run data:rmf:save-to-db
```

**Why multiple runs?** The platform automatically stops long-running processes after ~5 minutes. The checkpoint system saves progress after each batch (10 funds), so you can safely restart and continue from where it left off.

### Check Progress

```bash
# View checkpoint status
cat .db-progress.json

# Count funds in database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rmf_funds;"

# View sample data
psql $DATABASE_URL -c "SELECT symbol, fund_name_en, proj_id FROM rmf_funds LIMIT 5;"
```

### Fresh Load (Clear Database First)

Only use this if you want to start completely fresh:

```bash
FUND_LIMIT=450 npm run data:rmf:save-to-db -- --clear
```

⚠️ **Warning**: This deletes all existing data before loading.

## How It Works

### Batch Processing System

1. **Batch Size**: 10 funds per batch
2. **Total Batches**: 45 batches (442 funds)
3. **Checkpoint**: Saves progress to `.db-progress.json` after each batch
4. **Resume**: Automatically continues from last completed batch
5. **Safety**: Individual fund failures don't stop the batch

### Data Flow

```
data/rmf-funds/*.json → Batch Loader → PostgreSQL
                           ↓
                    .db-progress.json
                      (checkpoint)
```

### Database Schema

**4 Tables:**
1. `rmf_funds` - Main fund data (45+ columns)
2. `rmf_nav_history` - 30-day NAV history per fund
3. `rmf_dividends` - Dividend payment history
4. `pipeline_runs` - Execution tracking

**Key Features:**
- `symbol` is UNIQUE (primary identifier)
- `proj_id` is NOT unique (allows share classes A/E/P/B)
- JSONB fields for flexible data: performance, fees, asset_allocation

## Typical Loading Session

```bash
# Run 1 - Loads 94 funds, then stops (~5 minutes)
FUND_LIMIT=450 npm run data:rmf:save-to-db

# Check progress
cat .db-progress.json
# Output: {"lastCompletedBatch":9,"fundsProcessed":94,...}

# Run 2 - Continues from fund 95, loads another ~90 funds
FUND_LIMIT=450 npm run data:rmf:save-to-db

# Run 3 - Continues from fund 185...
FUND_LIMIT=450 npm run data:rmf:save-to-db

# ... repeat until all 442 funds loaded
```

**You'll know it's complete when:**
- Checkpoint shows `fundsProcessed: 442`
- Database count: `SELECT COUNT(*) FROM rmf_funds;` returns 442

## Database Migration (Already Applied)

The database has been migrated to allow multiple share classes per project. If you ever recreate the database from scratch, run:

```sql
ALTER TABLE rmf_funds DROP CONSTRAINT IF EXISTS rmf_funds_proj_id_key;
CREATE INDEX IF NOT EXISTS idx_rmf_funds_proj_id ON rmf_funds(proj_id);
```

## Troubleshooting

### Problem: "proj_id already exists" error

**Solution**: The database constraint hasn't been removed yet.

```bash
psql $DATABASE_URL -c "ALTER TABLE rmf_funds DROP CONSTRAINT IF EXISTS rmf_funds_proj_id_key;"
```

### Problem: Process stops with exit code 137 or -1

**Expected behavior** - Platform timeout limit (~5 minutes). Just run the command again:

```bash
FUND_LIMIT=450 npm run data:rmf:save-to-db
```

### Problem: Want to reload specific funds

**Solution**: Clear the checkpoint and use `--clear` flag:

```bash
rm .db-progress.json
FUND_LIMIT=450 npm run data:rmf:save-to-db -- --clear
```

## Data Quality

Each fund includes:
- ✅ Basic info: symbol, name, AMC, status
- ✅ Performance: 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y returns
- ✅ NAV history: 30 days with volatility analysis
- ✅ Fees: Management, selling, redemption fees
- ✅ Asset allocation: Equity, bonds, cash percentages
- ✅ Risk metrics: Risk level, volatility, tracking error
- ✅ Dividends: Historical dividend payments

## Next Steps

After loading all 442 funds:

1. **Integrate with MCP Server**: Update `RMFDataService` to query PostgreSQL instead of CSV/JSON files
2. **Daily Updates**: Schedule the pipeline to run daily for fresh data
3. **Monitoring**: Track `pipeline_runs` table for execution history

## Files Reference

- `server/pipeline/db-saver.ts` - Batch loader implementation
- `server/pipeline/db-schema.sql` - Database schema definition
- `data/rmf-funds/*.json` - 442 fund data files
- `.db-progress.json` - Checkpoint file (auto-generated)
- `docs/rmf-funds-api.csv` - Fund mapping reference
