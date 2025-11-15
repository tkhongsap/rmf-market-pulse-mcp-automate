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

### Daily Refresh (Recommended for Production)

Complete refresh from SEC API (truncate + reload):

```bash
npm run data:rmf:daily-refresh
```

This orchestrates the full pipeline:
1. **Phase 0**: Fetch latest fund list from SEC API → `data/fund-mapping.json`
2. **Phase 1**: Fetch complete data for all funds → `data/rmf-funds/*.json`
3. **Truncate**: Clear all database tables (rmf_funds, rmf_nav_history, rmf_dividends)
4. **Reload**: Load fresh JSON data into database

**Expected runtime**: 25-30 minutes for ~450 funds

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

1. **Batch Size**: 1 fund at a time (for maximum reliability)
2. **Total Batches**: 442 batches (one per fund)
3. **Checkpoint**: Saves progress to `.db-progress.json` after each batch
4. **Resume**: Automatically continues from last completed batch
5. **Safety**: Individual fund failures don't stop the batch
6. **Upsert Mode**: Uses `ON CONFLICT DO UPDATE` to refresh existing data

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

## Production Usage

### Automated Daily Updates

Schedule this command to run daily (e.g., via cron or GitHub Actions):

```bash
npm run data:rmf:save-to-db
```

**Expected behavior:**
- Runtime: ~30-60 minutes for 442 funds (1 fund at a time)
- Updates: All NAV data refreshed, new funds inserted
- Interruption: Safe to restart - checkpoint system resumes from last batch
- Output: "Funds Saved: 442/442" when complete

**Environment Variables:**
- `FUND_LIMIT`: Defaults to 450 (processes all funds)
- `DATABASE_URL`: PostgreSQL connection (auto-configured on Replit)

**Verification:**
```bash
# Check total funds
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rmf_funds;"

# Check last update time
psql $DATABASE_URL -c "SELECT MAX(data_updated_at) FROM rmf_funds;"
```

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
