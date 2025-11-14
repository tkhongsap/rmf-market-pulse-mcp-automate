# PRD: Automated RMF Data Pipeline for Replit

**Document Version:** 1.1
**Created:** 2025-11-13
**Last Updated:** 2025-11-13 (Added Testing & Validation Phases)
**Target Platform:** Replit
**Objective:** Transform the current manual RMF data extraction pipeline into a fully automated daily process with PostgreSQL database storage

---

## 1. Executive Summary

Build an automated daily pipeline that:
- Fetches all Thai RMF (Retirement Mutual Fund) data from SEC Thailand APIs
- Stores data in PostgreSQL database (replacing current CSV/JSON file storage)
- Runs daily at 2-4 AM Bangkok time (GMT+7)
- Performs full data replacement (all 403 funds)
- Sends success notifications with extraction statistics
- Takes approximately 86 minutes per run

**Testing Strategy:** Phased validation approach to ensure pipeline reliability:
1. **Phase 0:** Get fund list only (~5 min) - Validate API connectivity
2. **Phase 1:** Extract first 20 funds (~15 min) - Test data extraction pipeline
3. **Phase 2:** Save 20 funds to PostgreSQL (~30 sec) - Test database integration
4. **Phase 3:** Full production run (all 403 funds, ~98 min) - Complete automation

---

## 2. Current System Architecture

### 2.1 Existing Pipeline (Manual Execution)

**Current workflow requires 4 manual commands:**

```bash
npm run data:rmf:generate-list     # Step 1: Get fund list
npm run data:rmf:build-mapping     # Step 2: Build symbol mapping
npm run data:rmf:fetch-all         # Step 3: Extract all fund data
npm run data:rmf:consolidate-csv   # Step 4: Generate consolidated CSV
```

### 2.2 Key Scripts & Files

| Script Path | Purpose | Output |
|-------------|---------|--------|
| `scripts/data-extraction/rmf/generate-rmf-fund-list.ts` | Fetch fund list from SEC API | `docs/rmf-funds-api.csv`, `docs/rmf-funds-api.md` |
| `scripts/data-extraction/rmf/phase-0-build-mapping.ts` | Build symbol → proj_id mapping | `data/fund-mapping.json` |
| `scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts` | Orchestrate batch extraction | `data/rmf-funds/*.json` (403 files) |
| `scripts/data-extraction/rmf/fetch-complete-fund-data.ts` | Core data fetcher (18 data points) | Individual fund JSON |
| `scripts/data-extraction/rmf/consolidate-to-csv.ts` | Flatten JSON to CSV | `docs/rmf-funds-consolidated.csv` |

### 2.3 API Services Used

| Service File | Purpose | API Calls |
|--------------|---------|-----------|
| `server/services/secFundFactsheetApi.ts` | Fund metadata, performance, fees, holdings | 14 endpoints per fund |
| `server/services/secFundDailyInfoApi.ts` | NAV data, historical prices, dividends | 4 endpoints per fund |

### 2.4 Current Data Extraction Details

**18 Data Points Fetched Per Fund:**
1. Fund Policy (classification & style)
2. Dividend Policy
3. Risk Level (1-8 scale)
4. Performance Metrics (YTD, 3M, 6M, 1Y, 3Y, 5Y, 10Y, Since Inception)
5. Benchmark Data (name & returns for all periods)
6. Risk Metrics (5Y volatility, 1Y tracking error)
7. Asset Allocation (equity, bond, cash, etc.)
8. Fund Category (peer group)
9. Fee Structure (all fee types)
10. Involved Parties (fund managers, custodians)
11. Top 5 Holdings
12. Risk Factors
13. Suitability Info
14. Document URLs (factsheet, reports)
15. Investment Minimums
16. Latest NAV (current price)
17. NAV History (30 days)
18. Dividend History (all past dividends)

**Rate Limiting:**
- Batch size: 4 funds concurrently
- Total API calls per batch: 56 calls (4 funds × 14 endpoints)
- Delay between batches: 15 seconds
- Effective rate: ~3.7 calls/second (63% of SEC's 10 calls/sec limit)
- Total runtime: ~86 minutes for 403 funds

---

## 3. Target System Architecture (Replit)

### 3.1 Database: PostgreSQL

**Replace file-based storage with PostgreSQL tables:**

#### Table 1: `rmf_funds` (Main fund data)
```sql
CREATE TABLE rmf_funds (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    proj_id VARCHAR(50) UNIQUE NOT NULL,
    fund_name_en TEXT,
    fund_name_th TEXT,
    amc VARCHAR(255),
    status VARCHAR(10), -- 'RG' (active) or 'CA'/'LI' (cancelled)

    -- Registration & Dates
    register_date DATE,
    cancel_date DATE,

    -- Current NAV
    latest_nav DECIMAL(12, 4),
    latest_nav_date DATE,
    nav_change DECIMAL(12, 4),
    nav_change_percent DECIMAL(8, 4),
    buy_price DECIMAL(12, 4),
    sell_price DECIMAL(12, 4),

    -- Classification
    fund_policy TEXT,
    dividend_policy TEXT,
    risk_level INTEGER, -- 1-8
    fund_category VARCHAR(100),

    -- Performance (JSON for flexibility)
    performance JSONB, -- {ytd, 3m, 6m, 1y, 3y, 5y, 10y, since_inception}
    benchmark JSONB,   -- {name, returns: {ytd, 3m, ...}}

    -- Risk Metrics
    volatility_5y DECIMAL(8, 4),
    tracking_error_1y DECIMAL(8, 4),

    -- Asset Allocation (JSONB array)
    asset_allocation JSONB,

    -- Fees (JSONB array)
    fees JSONB,

    -- Parties (JSONB array)
    involved_parties JSONB,

    -- Holdings (JSONB array - top 5)
    top_holdings JSONB,

    -- Risk Factors (JSONB array)
    risk_factors JSONB,

    -- Suitability
    suitability JSONB,

    -- Documents
    document_urls JSONB,

    -- Investment Minimums
    investment_minimums JSONB,

    -- Metadata
    data_fetched_at TIMESTAMP WITH TIME ZONE,
    data_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    INDEX idx_symbol (symbol),
    INDEX idx_amc (amc),
    INDEX idx_risk_level (risk_level),
    INDEX idx_status (status),
    INDEX idx_category (fund_category)
);
```

#### Table 2: `rmf_nav_history` (Historical NAV data)
```sql
CREATE TABLE rmf_nav_history (
    id SERIAL PRIMARY KEY,
    fund_symbol VARCHAR(50) REFERENCES rmf_funds(symbol) ON DELETE CASCADE,
    nav_date DATE NOT NULL,
    nav DECIMAL(12, 4),
    nav_change DECIMAL(12, 4),
    nav_change_percent DECIMAL(8, 4),
    previous_nav DECIMAL(12, 4),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Composite unique constraint
    UNIQUE(fund_symbol, nav_date),
    INDEX idx_fund_nav_date (fund_symbol, nav_date DESC)
);
```

#### Table 3: `rmf_dividends` (Dividend history)
```sql
CREATE TABLE rmf_dividends (
    id SERIAL PRIMARY KEY,
    fund_symbol VARCHAR(50) REFERENCES rmf_funds(symbol) ON DELETE CASCADE,
    xa_date DATE,
    dividend_rate DECIMAL(12, 4),
    dividend_type VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Composite unique constraint
    UNIQUE(fund_symbol, xa_date),
    INDEX idx_fund_dividend_date (fund_symbol, xa_date DESC)
);
```

#### Table 4: `pipeline_runs` (Execution tracking)
```sql
CREATE TABLE pipeline_runs (
    id SERIAL PRIMARY KEY,
    run_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    run_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20), -- 'running', 'success', 'failed'

    -- Statistics
    total_funds_processed INTEGER,
    successful_funds INTEGER,
    failed_funds INTEGER,
    api_calls_made INTEGER,

    -- Error tracking
    errors JSONB,

    -- Metadata
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    INDEX idx_status (status),
    INDEX idx_run_started (run_started_at DESC)
);
```

### 3.2 Automated Pipeline Components

#### Component 1: Daily Cron Job
```javascript
// Replit Cron Configuration
// File: .replit or replit.nix

// Schedule: Daily at 3:00 AM Bangkok Time (GMT+7 = 20:00 UTC previous day)
// Cron expression: "0 20 * * *" (UTC)

[deployment]
run = ["node", "dist/index.js"]

[[deployment.cron]]
schedule = "0 20 * * *"  # 3:00 AM Bangkok time
run = ["node", "dist/pipeline-runner.js"]
```

#### Component 2: Pipeline Orchestrator
```typescript
// New file to create: server/pipeline/orchestrator.ts

import { generateRMFFundList } from '../../scripts/data-extraction/rmf/generate-rmf-fund-list';
import { buildMapping } from '../../scripts/data-extraction/rmf/phase-0-build-mapping';
import { fetchAllFunds } from '../../scripts/data-extraction/rmf/phase-1-fetch-all-funds';
import { saveToDB } from './db-saver';
import { sendNotification } from './notification-service';

export async function runDailyPipeline() {
    const startTime = new Date();
    let pipelineRunId: number;

    try {
        // 1. Create pipeline run record
        pipelineRunId = await createPipelineRun();

        // 2. Generate fund list
        const fundList = await generateRMFFundList();

        // 3. Build mapping
        const mapping = await buildMapping(fundList);

        // 4. Fetch all fund data
        const fundData = await fetchAllFunds(mapping);

        // 5. Save to PostgreSQL (replace all data)
        await saveToDB(fundData);

        // 6. Update pipeline run as success
        const duration = Math.floor((Date.now() - startTime.getTime()) / 1000);
        await updatePipelineRun(pipelineRunId, {
            status: 'success',
            total_funds_processed: fundData.length,
            successful_funds: fundData.filter(f => !f.errors.length).length,
            failed_funds: fundData.filter(f => f.errors.length > 0).length,
            duration_seconds: duration
        });

        // 7. Send success notification
        await sendNotification({
            type: 'success',
            fundsProcessed: fundData.length,
            duration: duration,
            timestamp: new Date()
        });

    } catch (error) {
        // Handle pipeline failure
        await updatePipelineRun(pipelineRunId, {
            status: 'failed',
            errors: [error.message]
        });

        throw error;
    }
}
```

#### Component 3: Database Saver
```typescript
// New file: server/pipeline/db-saver.ts

import { Pool } from 'pg';

export async function saveToDB(fundData: CompleteFundData[]) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Clear existing data
        await client.query('TRUNCATE rmf_funds CASCADE');

        // Step 2: Insert fund data
        for (const fund of fundData) {
            await client.query(`
                INSERT INTO rmf_funds (
                    symbol, proj_id, fund_name_en, fund_name_th, amc, status,
                    latest_nav, latest_nav_date, nav_change, nav_change_percent,
                    performance, benchmark, asset_allocation, fees,
                    involved_parties, top_holdings, risk_factors, suitability,
                    document_urls, investment_minimums, data_fetched_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            `, [
                fund.symbol, fund.fund_id, fund.fund_name_en, fund.fund_name_th,
                fund.amc, fund.status, fund.latest_nav.last_val, fund.latest_nav.nav_date,
                fund.latest_nav.change, fund.latest_nav.change_percent,
                JSON.stringify(fund.performance), JSON.stringify(fund.benchmark),
                JSON.stringify(fund.asset_allocation), JSON.stringify(fund.fees),
                JSON.stringify(fund.involved_parties), JSON.stringify(fund.top_holdings),
                JSON.stringify(fund.risk_factors), JSON.stringify(fund.suitability),
                JSON.stringify(fund.document_urls), JSON.stringify(fund.investment_minimums),
                fund.data_fetched_at
            ]);

            // Insert NAV history
            if (fund.nav_history_30d?.length) {
                for (const nav of fund.nav_history_30d) {
                    await client.query(`
                        INSERT INTO rmf_nav_history (fund_symbol, nav_date, nav, nav_change, nav_change_percent, previous_nav)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT (fund_symbol, nav_date) DO UPDATE SET
                            nav = EXCLUDED.nav,
                            nav_change = EXCLUDED.nav_change,
                            nav_change_percent = EXCLUDED.nav_change_percent
                    `, [fund.symbol, nav.nav_date, nav.nav, nav.nav_change, nav.nav_change_percent, nav.previous_nav]);
                }
            }

            // Insert dividends
            if (fund.dividends?.length) {
                for (const div of fund.dividends) {
                    await client.query(`
                        INSERT INTO rmf_dividends (fund_symbol, xa_date, dividend_rate, dividend_type)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (fund_symbol, xa_date) DO NOTHING
                    `, [fund.symbol, div.xa_date, div.dvidend_rate, div.dvi_type]);
                }
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

#### Component 4: Notification Service
```typescript
// New file: server/pipeline/notification-service.ts

export async function sendNotification(data: {
    type: 'success' | 'error',
    fundsProcessed: number,
    duration: number,
    timestamp: Date,
    errors?: string[]
}) {
    const message = data.type === 'success'
        ? `✅ RMF Pipeline Success

Funds Processed: ${data.fundsProcessed}
Duration: ${Math.floor(data.duration / 60)} minutes ${data.duration % 60} seconds
Timestamp: ${data.timestamp.toISOString()}

All data successfully saved to PostgreSQL.`
        : `❌ RMF Pipeline Failed

Timestamp: ${data.timestamp.toISOString()}
Errors: ${data.errors?.join(', ')}`;

    // Implementation options:
    // 1. Email (SendGrid, AWS SES)
    // 2. Slack webhook
    // 3. Discord webhook
    // 4. Telegram bot
    // 5. Replit's built-in notification system

    // Example: Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: message })
        });
    }

    console.log(message);
}
```

### 3.3 Modified MCP Server Data Service

**Update:** `server/services/rmfDataService.ts`

Replace CSV loading with PostgreSQL queries:

```typescript
import { Pool } from 'pg';

class RMFDataService {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    async getAllFunds(limit = 50, offset = 0) {
        const result = await this.pool.query(
            'SELECT * FROM rmf_funds WHERE status = $1 ORDER BY symbol LIMIT $2 OFFSET $3',
            ['RG', limit, offset]
        );
        return result.rows;
    }

    async searchFunds(criteria: SearchCriteria) {
        // Build dynamic WHERE clause
        const whereClauses = [];
        const params = [];

        if (criteria.amc) {
            whereClauses.push(`amc ILIKE $${params.length + 1}`);
            params.push(`%${criteria.amc}%`);
        }

        if (criteria.riskLevel) {
            whereClauses.push(`risk_level = $${params.length + 1}`);
            params.push(criteria.riskLevel);
        }

        const query = `
            SELECT * FROM rmf_funds
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY symbol
        `;

        const result = await this.pool.query(query, params);
        return result.rows;
    }

    async getFundBySymbol(symbol: string) {
        const result = await this.pool.query(
            'SELECT * FROM rmf_funds WHERE symbol = $1',
            [symbol]
        );
        return result.rows[0];
    }

    async getNavHistory(symbol: string, days = 30) {
        const result = await this.pool.query(
            `SELECT * FROM rmf_nav_history
             WHERE fund_symbol = $1
             ORDER BY nav_date DESC
             LIMIT $2`,
            [symbol, days]
        );
        return result.rows;
    }
}
```

---

## 4. Implementation Requirements

### 4.1 New Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "pg": "^8.11.3",
    "@types/pg": "^8.10.9",
    "node-cron": "^3.0.3"
  }
}
```

### 4.2 Environment Variables

Add to Replit Secrets:
```bash
DATABASE_URL=postgresql://user:password@host:5432/rmf_db
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL (optional)
SEC_API_KEY=your_sec_api_key (if required)
ALLOWED_ORIGINS=* (or specific domains)
PORT=5000
TZ=Asia/Bangkok
```

### 4.3 New Files to Create

1. `server/pipeline/orchestrator.ts` - Main pipeline orchestrator
2. `server/pipeline/db-saver.ts` - PostgreSQL data saver
3. `server/pipeline/notification-service.ts` - Notification sender
4. `server/pipeline/db-schema.sql` - Database schema definition
5. `dist/pipeline-runner.js` - Compiled cron job entry point
6. `.replit` or `replit.nix` - Cron job configuration

### 4.4 Modified Files

1. `server/services/rmfDataService.ts` - Replace CSV with PostgreSQL
2. `server/index.ts` - Add database connection initialization
3. `package.json` - Add new dependencies and scripts
4. `tsconfig.json` - Include pipeline directory

### 4.5 Testing & Validation Phases

**IMPORTANT:** Before running the full 86-minute pipeline, validate with smaller test runs.

#### Phase 0 (Test): Get Fund List Only
**Objective:** Verify SEC API connectivity and fund list generation

**Commands:**
```bash
npm run data:rmf:generate-list
```

**Expected Output:**
- `docs/rmf-funds-api.csv` (~400 funds)
- `docs/rmf-funds-api.md` (markdown table)

**Validation:**
```bash
# Check fund count
wc -l docs/rmf-funds-api.csv  # Should show ~401 lines (400 funds + header)

# View first 10 funds
head -n 11 docs/rmf-funds-api.csv
```

**Duration:** ~5 minutes

**Success Criteria:**
- ✅ File contains ~400 RMF funds
- ✅ All columns populated: Symbol, Fund Name, AMC, Status, Registration Date
- ✅ No API errors in console

---

#### Phase 1 (Test): Extract First 20 Funds Only
**Objective:** Test complete data extraction pipeline with small dataset

**Modification Required:**
Edit `scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts` to limit fund processing:

```typescript
// Around line 20-30, find where funds are loaded and add .slice(0, 20)
const fundsToProcess = funds.slice(0, 20);  // <-- Add this line
```

**Or use environment variable approach:**
```typescript
// In phase-1-fetch-all-funds.ts
const FUND_LIMIT = process.env.FUND_LIMIT ? parseInt(process.env.FUND_LIMIT) : undefined;
const fundsToProcess = FUND_LIMIT ? funds.slice(0, FUND_LIMIT) : funds;
```

**Commands:**
```bash
# Option 1: With code modification
npm run data:rmf:build-mapping
npm run data:rmf:fetch-all

# Option 2: With environment variable
FUND_LIMIT=20 npm run data:rmf:fetch-all
```

**Expected Output:**
- `data/rmf-funds/*.json` (20 files)
- `data/progress.json` (shows 20 funds processed)

**Validation:**
```bash
# Count JSON files created
ls -1 data/rmf-funds/*.json | wc -l  # Should show 20

# Check one fund has complete data
cat data/rmf-funds/ABAPAC-RMF.json | jq '.errors'  # Should be empty array []

# Verify 18 data points present
cat data/rmf-funds/ABAPAC-RMF.json | jq 'keys | length'  # Should have all fields
```

**Duration:** ~10-15 minutes (20 funds × ~30 seconds each)

**Success Criteria:**
- ✅ 20 JSON files created in `data/rmf-funds/`
- ✅ Each file has 18 data points (latest_nav, performance, fees, etc.)
- ✅ `errors` array is empty or minimal (< 3 errors per fund)
- ✅ No rate limiting errors (429 responses)
- ✅ `progress.json` shows successful completion

---

#### Phase 2 (Test): Save 20 Funds to PostgreSQL
**Objective:** Test database schema and insertion logic

**Prerequisites:**
1. PostgreSQL database created on Replit
2. Schema initialized (`db-schema.sql` executed)
3. `DATABASE_URL` environment variable set

**Modification Required:**
Create a test script: `scripts/test-db-save.ts`

```typescript
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function testSaveFirstTwentyFunds() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
        const fundFiles = fs.readdirSync('data/rmf-funds').slice(0, 20);

        await client.query('BEGIN');
        await client.query('TRUNCATE rmf_funds CASCADE');

        for (const file of fundFiles) {
            const fundData = JSON.parse(
                fs.readFileSync(path.join('data/rmf-funds', file), 'utf-8')
            );

            // Insert fund (use db-saver.ts logic)
            await client.query(`
                INSERT INTO rmf_funds (
                    symbol, proj_id, fund_name_en, fund_name_th, amc, status,
                    latest_nav, latest_nav_date, performance, benchmark,
                    data_fetched_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                fundData.symbol,
                fundData.fund_id,
                fundData.fund_name_en,
                fundData.fund_name_th,
                fundData.amc,
                fundData.metadata?.status,
                fundData.latest_nav?.last_val,
                fundData.latest_nav?.nav_date,
                JSON.stringify(fundData.performance),
                JSON.stringify(fundData.benchmark),
                fundData.data_fetched_at
            ]);
        }

        await client.query('COMMIT');
        console.log(`✅ Successfully saved ${fundFiles.length} funds to PostgreSQL`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Database save failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

testSaveFirstTwentyFunds();
```

**Commands:**
```bash
# Run test script
npx tsx scripts/test-db-save.ts
```

**Validation:**
```sql
-- Connect to PostgreSQL
psql $DATABASE_URL

-- Check fund count
SELECT COUNT(*) FROM rmf_funds;  -- Should return 20

-- Check data completeness
SELECT symbol, fund_name_en, latest_nav,
       performance IS NOT NULL as has_performance
FROM rmf_funds
LIMIT 5;

-- Check NAV history
SELECT COUNT(*) FROM rmf_nav_history;  -- Should have ~600 records (20 funds × 30 days)

-- Check for errors
SELECT symbol, data_fetched_at
FROM rmf_funds
WHERE latest_nav IS NULL;  -- Should return 0 rows
```

**Duration:** ~30 seconds

**Success Criteria:**
- ✅ 20 funds inserted into `rmf_funds` table
- ✅ ~600 NAV history records in `rmf_nav_history`
- ✅ No NULL values in critical fields (symbol, proj_id, latest_nav)
- ✅ JSONB columns properly formatted (performance, benchmark, fees)
- ✅ No database errors

---

#### Phase 3 (Production): Full Pipeline with All 403 Funds
**Objective:** Run complete automated pipeline

**Prerequisites:**
- ✅ Phase 0, 1, and 2 tests passed
- ✅ Database schema validated
- ✅ Rate limiting tested (no 429 errors)
- ✅ Notification service configured (optional)

**Commands:**
```bash
# Remove test limit (revert code changes)
# Then run full pipeline
npm run data:rmf:build-mapping
npm run data:rmf:fetch-all
node dist/pipeline-runner.js  # Runs full orchestrator with DB save
```

**Or with orchestrator:**
```typescript
// server/pipeline/orchestrator.ts
export async function runDailyPipeline(testMode = false) {
    const fundLimit = testMode ? 20 : undefined;
    // ... rest of pipeline with fundLimit parameter
}
```

**Duration:** ~86-98 minutes

**Validation:**
```sql
-- Check total funds
SELECT COUNT(*) FROM rmf_funds;  -- Should return 403

-- Check status distribution
SELECT status, COUNT(*) FROM rmf_funds GROUP BY status;
-- Expected: RG (active) = ~394, CA/LI (cancelled) = ~9

-- Check latest pipeline run
SELECT * FROM pipeline_runs ORDER BY run_started_at DESC LIMIT 1;
-- Should show: status='success', total_funds_processed=403

-- Verify data freshness
SELECT MAX(data_updated_at) FROM rmf_funds;  -- Should be recent timestamp
```

**Success Criteria:**
- ✅ All 403 funds in database
- ✅ Pipeline run record shows success
- ✅ Notification received (if configured)
- ✅ MCP server can query funds successfully
- ✅ No critical errors (< 5% fund failure rate)

---

#### Quick Reference: Test Commands

```bash
# Phase 0: Fund List Only (~5 min)
npm run data:rmf:generate-list

# Phase 1: First 20 Funds (~15 min)
FUND_LIMIT=20 npm run data:rmf:build-mapping
FUND_LIMIT=20 npm run data:rmf:fetch-all

# Phase 2: Save to DB (~30 sec)
npx tsx scripts/test-db-save.ts

# Phase 3: Full Pipeline (~98 min)
npm run pipeline:full  # Add this to package.json
```

#### Add to `package.json`:
```json
{
  "scripts": {
    "pipeline:test": "FUND_LIMIT=20 tsx scripts/pipeline-test-runner.ts",
    "pipeline:full": "tsx scripts/pipeline-full-runner.ts",
    "db:test": "tsx scripts/test-db-save.ts"
  }
}
```

---

## 5. Pipeline Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Replit Cron Trigger (Daily 3:00 AM Bangkok Time)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 1: Initialize Pipeline Run                          │
│  - Create pipeline_runs record with status='running'       │
│  - Start timer                                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 2: Generate Fund List                               │
│  - Script: generate-rmf-fund-list.ts                       │
│  - Fetch all AMCs from SEC API (~29 AMCs)                  │
│  - For each AMC, fetch all funds                           │
│  - Filter for RMF funds (contains "RMF")                   │
│  - Output: Array of ~400 funds                             │
│  - Duration: ~5 minutes                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3: Build Symbol Mapping                             │
│  - Script: phase-0-build-mapping.ts                        │
│  - Create symbol → proj_id mapping                         │
│  - Output: Mapping object (in-memory)                      │
│  - Duration: ~5 minutes                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 4: Fetch Complete Fund Data (Main Process)          │
│  - Script: phase-1-fetch-all-funds.ts                      │
│  - Process 403 funds in batches of 4                       │
│  - For each fund:                                           │
│    • Fetch 18 data points (14 endpoints)                   │
│    • Daily Info API: NAV, history, dividends               │
│    • Factsheet API: performance, risk, fees, holdings      │
│  - Rate limiting: 15s delay between batches                │
│  - Output: Array of 403 CompleteFundData objects           │
│  - Duration: ~86 minutes                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 5: Save to PostgreSQL                               │
│  - Module: db-saver.ts                                     │
│  - Transaction: BEGIN                                       │
│  - TRUNCATE rmf_funds CASCADE (clear old data)             │
│  - INSERT into rmf_funds (403 records)                     │
│  - INSERT into rmf_nav_history (~12,000 records)           │
│  - INSERT into rmf_dividends (~2,000 records)              │
│  - Transaction: COMMIT                                      │
│  - Duration: ~2 minutes                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 6: Update Pipeline Run & Send Notification          │
│  - Update pipeline_runs:                                   │
│    • status = 'success'                                     │
│    • total_funds_processed = 403                           │
│    • successful_funds = count (no errors)                  │
│    • failed_funds = count (with errors)                    │
│    • duration_seconds = calculated                         │
│  - Send Slack notification with stats                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Pipeline Complete (~98 minutes total)                      │
│  - All data refreshed in PostgreSQL                        │
│  - MCP server queries live PostgreSQL data                 │
│  - Ready for next day's run                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Error Handling & Monitoring

### 6.1 Error Scenarios

| Error Type | Handling Strategy |
|------------|------------------|
| SEC API timeout | Retry 3 times with exponential backoff |
| SEC API rate limit | Respect 429 response, extend delay to 30s |
| Database connection failure | Retry connection 5 times, abort if fails |
| Individual fund fetch failure | Log error, continue with next fund |
| Complete pipeline failure | Rollback DB transaction, send error notification |

### 6.2 Monitoring Dashboard (Optional)

Query `pipeline_runs` table for insights:
```sql
-- Last 7 days success rate
SELECT
    DATE(run_started_at) as run_date,
    COUNT(*) as total_runs,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
    AVG(duration_seconds) as avg_duration_seconds
FROM pipeline_runs
WHERE run_started_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(run_started_at)
ORDER BY run_date DESC;
```

---

## 7. Migration Plan (Current → Replit)

### Step 1: Database Setup
1. Create PostgreSQL database on Replit
2. Run `server/pipeline/db-schema.sql` to create tables
3. Test connection with `psql` or database client

### Step 2: Initial Data Load
```bash
# One-time manual run to populate database
npm run data:rmf:generate-list
npm run data:rmf:build-mapping
npm run data:rmf:fetch-all
node dist/pipeline-runner.js --initial-load
```

### Step 3: Update MCP Server
1. Modify `server/services/rmfDataService.ts` to use PostgreSQL
2. Test all 6 MCP tools with database queries
3. Verify response formats match existing behavior

### Step 4: Configure Cron Job
1. Add cron configuration to `.replit` or `replit.nix`
2. Set timezone to `Asia/Bangkok`
3. Test cron expression with online tool: https://crontab.guru

### Step 5: Deploy & Monitor
1. Deploy to Replit
2. Monitor first automated run (check logs)
3. Verify Slack notification received
4. Query database to confirm data freshness

---

## 8. Success Criteria

- ✅ Pipeline runs automatically daily at 2-4 AM Bangkok time
- ✅ All 403 funds successfully fetched and stored in PostgreSQL
- ✅ Success notification sent via Slack with statistics
- ✅ MCP server queries PostgreSQL (no more CSV file loading)
- ✅ Pipeline completion time: 80-100 minutes
- ✅ No manual intervention required
- ✅ Error rate: < 5% of funds per run

---

## 9. Future Enhancements (Out of Scope)

1. **Incremental updates** - Only fetch changed data (NAV, performance)
2. **Multi-region deployment** - Reduce latency for global users
3. **Real-time updates** - WebSocket push for NAV changes
4. **Historical data retention** - Keep all NAV history (not just 30 days)
5. **Performance analytics** - Trend analysis, alerts for top performers
6. **API caching layer** - Redis for frequently accessed data

---

## 10. Technical Contacts & References

**Existing Codebase:**
- Repository: Current workspace
- Key directories: `scripts/data-extraction/rmf/`, `server/services/`
- Documentation: `docs/ARCHITECTURE.md`, `CLAUDE.md`

**APIs:**
- SEC Thailand Fund APIs: https://www.sec.or.th/
- Rate limit: 10 calls/second (we use 3.7 calls/sec)
- No API key required for public endpoints

**Database:**
- PostgreSQL version: 14+ recommended
- Expected size: ~100 MB (403 funds + 30 days NAV history)
- Growth rate: ~5 MB per month (NAV history accumulation)

---

## Appendix A: File Reference Map

| Current File | Purpose in Automated Pipeline |
|--------------|------------------------------|
| `scripts/data-extraction/rmf/generate-rmf-fund-list.ts` | Phase 2: Generate fund list |
| `scripts/data-extraction/rmf/phase-0-build-mapping.ts` | Phase 3: Build symbol mapping |
| `scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts` | Phase 4: Orchestrate batch extraction |
| `scripts/data-extraction/rmf/fetch-complete-fund-data.ts` | Phase 4: Core data fetcher (18 data points) |
| `server/services/secFundFactsheetApi.ts` | API client for fund metadata (14 endpoints) |
| `server/services/secFundDailyInfoApi.ts` | API client for NAV data (4 endpoints) |
| `server/services/rmfDataService.ts` | **TO BE MODIFIED**: Replace CSV with PostgreSQL |
| `server/mcp.ts` | No changes (uses rmfDataService) |
| `server/index.ts` | **TO BE MODIFIED**: Add DB connection initialization |

---

**End of Document**

This PRD provides Replit with all necessary information to build the automated RMF data pipeline. All referenced files exist in the current codebase and can be adapted for the new PostgreSQL-based architecture.