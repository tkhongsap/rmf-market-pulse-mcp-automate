# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thai RMF Market Pulse - A **PostgreSQL-backed MCP (Model Context Protocol) server** providing comprehensive Thai Retirement Mutual Fund (RMF) market data. This is a backend-only TypeScript server with 6 MCP tools, serving 403+ RMF funds with complete market data loaded from PostgreSQL database.

**Key Facts:**
- **Architecture**: Standalone MCP server (no frontend) with PostgreSQL database
- **Database**: PostgreSQL with 4 tables (`rmf_funds`, `rmf_nav_history`, `rmf_dividends`, `pipeline_runs`)
- **Data Source**: PostgreSQL database (loads into memory on startup)
- **Protocol**: Model Context Protocol via HTTP POST endpoint
- **MCP Tools**: 6 tools for fund data, search, performance, NAV history, and comparison
- **Dependencies**: 138 packages including `pg` for PostgreSQL

## Commands

### Development
```bash
npm run dev          # Start MCP server with tsx (port 5000)
npm run check        # Run TypeScript type checking
```

### Build & Production
```bash
npm run build        # Build server with esbuild to dist/
npm start            # Run production build (node dist/index.js)
```

### Testing
```bash
npm test                    # Run MCP tools test suite
npm run test:coverage       # Run tests with coverage report
npm run test:http           # HTTP integration test (bash script)
npm run test:security       # Security tests (node script)
npm run test:integration    # Final integration test (bash script)
npm run test:user-scenarios # Natural language question tests (bash script)
npm run test:all            # Run all test suites
```

### Database Population

**Production (Automated Daily Refresh):**
```bash
npm run data:rmf:daily-refresh         # Full pipeline: fetch from SEC API → load to PostgreSQL
                                       # Runtime: ~25-30 minutes
                                       # Recommended: Daily cron job at 2 AM
```

**Development (Manual 3-Phase Pipeline):**
```bash
# Phase 0: Build fund mapping from SEC API
npm run data:rmf:build-mapping         # Output: data/fund-mapping.json (symbol → proj_id)

# Phase 1: Fetch complete fund data from SEC API
npm run data:rmf:fetch-all             # Output: data/rmf-funds/{SYMBOL}.json (442 files)
                                       # Runtime: ~25 minutes with rate limiting

# Phase 2: Load fetched data to PostgreSQL database
npm run data:rmf:save-to-db            # Input: JSON files → PostgreSQL (UPSERT mode)
                                       # Checkpoint/resume capability via .db-progress.json
```

**Utility Commands:**
```bash
npm run data:rmf:identify-incomplete   # Find funds with incomplete data
npm run data:rmf:reprocess             # Re-fetch incomplete funds
npm run data:rmf:consolidate-csv       # Generate CSV from JSON (LEGACY - not used by server)
```

### Fund List Generation (Reference)
```bash
npm run data:rmf:generate-list         # Generate RMF fund list from SEC API
npm run data:esg:generate-list         # Generate Thai ESG fund list
npm run data:esgx:generate-list        # Generate Thai ESGX fund list
```

## Architecture

### Server Structure

**Entry Point:** `server/index.ts`
- Express server with security middleware (Helmet, CORS, rate limiting)
- PostgreSQL connection pool initialization (requires `DATABASE_URL`)
- Single MCP endpoint: `POST /mcp`
- Health check: `GET /healthz`
- Server info: `GET /`
- Initializes `rmfDataService` by loading data from PostgreSQL on startup
- Port: 5000 (configurable via `PORT` env var)

**MCP Tools:** `server/mcp.ts`
- Implements 6 MCP tools using `@modelcontextprotocol/sdk`:
  1. `get_rmf_funds` - List funds with pagination and sorting
  2. `search_rmf_funds` - Search/filter funds by multiple criteria
  3. `get_rmf_fund_detail` - Get detailed fund information
  4. `get_rmf_fund_performance` - Top performers by period
  5. `get_rmf_fund_nav_history` - NAV history over time
  6. `compare_rmf_funds` - Compare 2-5 funds side-by-side
- All tools return `{ content: [{ type: 'text', text: '...' }] }` format
- Tools use Zod schemas for parameter validation

**Data Service:** `server/services/rmfDataService.ts`
- Loads fund data from PostgreSQL `rmf_funds` table on startup (403+ funds)
- Builds in-memory indexes: `fundsMap` (by symbol), `byAMC`, `byRisk`, `byCategory`
- Queries NAV history from PostgreSQL `rmf_nav_history` table (cached after first query)
- Database schema: 4 tables with JSONB columns for complex data (performance, fees, holdings)
- Security: Path traversal protection, parameterized queries
- Fast lookups: O(1) by symbol (in-memory), O(n) for search/filter operations

**SEC API Services:** `server/services/` (used for data extraction only, not by MCP server)
- `secFundDailyInfoApi.ts` - Daily NAV, historical NAV, dividends
- `secFundFactsheetApi.ts` - Fund metadata, performance, fees, holdings
- `secFundApi.ts` - Unified wrapper (legacy)
- `secApi.ts` - General SEC API utilities
- `setsmartApi.ts` - SET Smart API integration

### Shared Schemas (`shared/`)

**File:** `shared/schema.ts`

Zod schemas for type-safe data structures:

**Database Records:**
- `RMFFund` - Complete fund record from PostgreSQL (45+ fields, includes JSONB data)
- `RMFNavHistory` - NAV history entry with change calculations

**Fund Data Components:**
- `AssetAllocation` - Asset breakdown (equity, bond, cash, etc.)
- `FundFee` - Fee structure
- `InvolvedParty` - Fund managers and parties
- `FundHolding` - Fund holdings
- `RiskFactor` - Risk factor descriptions

### TypeScript Configuration

**File:** `tsconfig.json`
- Includes: `shared/**/*`, `server/**/*`
- Excludes: `node_modules`, `build`, `dist`, test files
- Module: ESNext with bundler resolution
- Strict mode enabled, no emit (build handled by esbuild)
- Path alias: `@shared/*` → `./shared/*`

## MCP Protocol Integration

**Endpoint:** `POST /mcp`
- Implements JSON-RPC 2.0 specification
- Uses `StreamableHTTPServerTransport` from MCP SDK
- Rate limited: 100 requests per 15 minutes per IP
- Security: Helmet, CORS, payload size limit (1MB)

**Tool Call Flow:**
1. Client sends JSON-RPC request to `/mcp`
2. MCP server validates parameters with Zod schemas
3. Tool handler queries `rmfDataService` (in-memory data)
4. Response formatted as MCP content blocks (text type)
5. Returns JSON-RPC response with fund data

**Response Format:**
```typescript
{
  content: [
    { type: 'text', text: 'Human-readable summary' },
    { type: 'text', text: 'JSON.stringify(data)' }
  ]
}
```

## Data Files

### Primary Data Source
**PostgreSQL Database** (required)
- **Tables**: `rmf_funds`, `rmf_nav_history`, `rmf_dividends`, `pipeline_runs`
- **Schema**: `server/pipeline/db-schema.sql`
- **Loaded by**: `rmfDataService.initialize()` on server startup
- **Connection**: Requires `DATABASE_URL` environment variable
- **Records**: 403+ funds with complete market data

### Staging Files (Data Extraction Pipeline)
**Location:** `data/rmf-funds/{SYMBOL}.json` (442 files)
- Individual JSON files per fund with complete data from SEC API
- **Purpose**: Intermediate format before database load
- **Generated by**: `npm run data:rmf:fetch-all`
- **Used by**: `npm run data:rmf:save-to-db` (loads into PostgreSQL)
- **Not used by MCP server** (server reads from database only)

### Legacy CSV File (NOT USED)
**File:** `docs/rmf-funds-consolidated.csv` (403 rows, 1.5MB)
- **Status**: LEGACY - Not used by MCP server
- **Generated by**: `npm run data:rmf:consolidate-csv`
- **Purpose**: Historical artifact from pre-PostgreSQL architecture
- **Note**: Can be deleted or used for data analysis only

### Fund Lists (Reference)
- `docs/rmf-funds-api.csv` - 400 RMF funds (394 active, 6 cancelled)
- `docs/thai-esg-funds-api.csv` - 52 Thai ESG funds
- Generated by: `npm run data:rmf:generate-list`, `npm run data:esg:generate-list`

### Data Extraction Pipeline

**Three-Phase Process** (updates PostgreSQL database with latest SEC data):

**Phase 0: Build Mapping**
- Command: `npm run data:rmf:build-mapping`
- Script: `scripts/data-extraction/rmf/phase-0-build-mapping.ts`
- Output: `data/fund-mapping.json` (symbol → proj_id mapping)
- Fetches all funds from 29 AMCs via SEC API
- Runtime: ~30 seconds

**Phase 1: Fetch All Funds**
- Command: `npm run data:rmf:fetch-all`
- Script: `scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts`
- Output: `data/rmf-funds/{SYMBOL}.json` (442 files)
- Rate limiting: 4 funds/batch, 15-second delays
- Progress tracking: `data/progress.json` (resume capability)
- Fetches 14 data points per fund (NAV, performance, risk, fees, etc.)
- Runtime: ~25 minutes

**Phase 2: Load to Database**
- Command: `npm run data:rmf:save-to-db`
- Script: `server/pipeline/db-saver.ts`
- Input: `data/rmf-funds/{SYMBOL}.json` files
- Output: PostgreSQL tables (`rmf_funds`, `rmf_nav_history`, `rmf_dividends`)
- Mode: UPSERT (safe, non-destructive updates)
- Progress tracking: `.db-progress.json` (checkpoint/resume)
- Runtime: ~5-10 minutes

**Production Automation:**
- Command: `npm run data:rmf:daily-refresh`
- Script: `server/pipeline/daily-refresh-production.ts`
- Orchestrates all 3 phases automatically
- Recommended: Daily cron job at 2 AM

**Utility Scripts:**
- `identify-incomplete-funds.ts` - Find funds with missing data
- `reprocess-incomplete-funds.ts` - Re-fetch incomplete funds
- `consolidate-to-csv.ts` - Generate CSV (LEGACY - not used by server)

See `scripts/data-extraction/rmf/README.md` for detailed documentation.

## Environment Variables

**Required for MCP Server:**
- `DATABASE_URL` - PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/dbname`)
  - Server will crash on startup if not provided
  - Used by `rmfDataService` to load fund data

**Required for Data Extraction Pipeline:**
- `SEC_FUND_FACTSHEET_KEY` - SEC API key for fund factsheet endpoint
- `SEC_FUND_FACTSHEET_SECONDARY_KEY` - Secondary SEC API key
- `SEC_FUND_DAILY_INFO_KEY` - SEC API key for daily NAV/dividend data

**Optional:**
- `PORT` - Server port (defaults to 5000)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated, defaults to '*')

## Database Population Process

### Overview

The MCP server loads all fund data from PostgreSQL on startup. The database must be populated using the data extraction pipeline before the server can run.

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| **Data Source** | PostgreSQL | PostgreSQL (same) |
| **Update Method** | Manual 3-phase scripts | Automated daily refresh |
| **Trigger** | On-demand by developer | Cron job (2 AM daily) |
| **Database Mode** | UPSERT | UPSERT (both safe) |
| **Command** | `npm run data:rmf:save-to-db` | `npm run data:rmf:daily-refresh` |
| **Duration** | Phase 2 only: 5-10 min | All phases: 25-30 min |

### Data Flow: SEC API → PostgreSQL → MCP Server

```
┌─────────────────┐
│  SEC Thailand   │
│   API (14 endpoints)  │
└────────┬────────┘
         │ Phase 0-1: Fetch
         ▼
┌─────────────────┐
│ JSON Files      │
│ data/rmf-funds/ │
│ (442 files)     │
└────────┬────────┘
         │ Phase 2: Load
         ▼
┌─────────────────┐
│  PostgreSQL     │
│  Database       │
│  (4 tables)     │
└────────┬────────┘
         │ Server Startup
         ▼
┌─────────────────┐
│ In-Memory Cache │
│ (rmfDataService)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  MCP Tools      │
│  (6 tools)      │
└─────────────────┘
```

### Database Schema

**4 Tables in PostgreSQL:**

1. **`rmf_funds`** (Main fund data)
   - Primary key: `symbol` (UNIQUE)
   - 45+ columns including JSONB fields
   - JSONB columns: `performance`, `benchmark`, `asset_allocation`, `fees`, `involved_parties`, `top_holdings`, `risk_factors`, `suitability`, `document_urls`, `investment_minimums`, `errors`
   - 403+ fund records

2. **`rmf_nav_history`** (Historical NAV)
   - Foreign key: `fund_symbol` → `rmf_funds(symbol)`
   - Composite unique: `(fund_symbol, nav_date)`
   - 30-day NAV history per fund

3. **`rmf_dividends`** (Dividend history)
   - Foreign key: `fund_symbol` → `rmf_funds(symbol)`
   - Composite unique: `(fund_symbol, xa_date)`

4. **`pipeline_runs`** (Execution tracking)
   - Tracks pipeline statistics and errors

**Schema File:** `server/pipeline/db-schema.sql`

### Update Modes

**UPSERT Mode (Used by Both Dev & Prod):**
- Safe, non-destructive updates
- Existing records updated, new records inserted
- Database always has valid data (no truncation)
- Process is crash-safe with checkpoint/resume

**When to Run:**
- **Development**: After fetching new data (`npm run data:rmf:fetch-all`)
- **Production**: Daily via cron job (captures latest NAV, market changes)

## Security Features

**Production Security** (added in recent commits):
- **Helmet**: Secure HTTP headers (CSP disabled for MCP compatibility)
- **CORS**: Configurable origin allowlist via `ALLOWED_ORIGINS`
- **Rate Limiting**: 100 requests per 15 minutes per IP on `/mcp`
- **Payload Size Limit**: 1MB max for JSON/urlencoded requests
- **Path Traversal Protection**: Symbol sanitization in `getNavHistory()`
- **Error Handling**: Generic error messages to clients (no stack traces)

## Testing

**Test Organization** (`tests/` directory):
- `tests/mcp/` - MCP tool tests (TypeScript with tsx)
- `tests/integration/` - Integration tests (bash scripts)
- `tests/user-scenarios/` - User scenario tests (bash + Python)
- `tests/security/` - Security tests (Node.js)
- `tests/helpers/` - Test helper scripts
- `tests/api/` - API tests (if applicable)

**Test Coverage:**
- Command: `npm run test:coverage`
- Uses c8 for coverage reports (text + lcov)
- Coverage for: `server/**/*.ts` (excludes `server/index.ts`)

**Test Results:**
- Recent test files include answers: `MCP_TEST_ANSWERS.md`
- User scenario results: `tests/user-scenarios/test-natural-questions.sh`

## Build Process

**Build Command:** `npm run build`
- Bundler: esbuild
- Entry: `server/index.ts`
- Output: `dist/index.js`
- Platform: Node.js
- Format: ESM
- Packages: External (not bundled)

**Production Start:**
```bash
npm run build
npm start  # Runs: node dist/index.js
```

## Development Notes

### Key Design Decisions
1. **PostgreSQL Database**: Data loaded from PostgreSQL into memory on startup (fast, reliable, queryable)
   - UPSERT-based updates (safe, non-destructive)
   - JSONB columns for complex nested data
   - In-memory caching after initial load
2. **No Frontend**: Pure MCP server (removed React/Vite in recent commits)
3. **No External APIs at Runtime**: Server runs without SEC API key (pre-loaded from database)
   - SEC APIs only used during data extraction pipeline
4. **In-Memory Indexes**: Fast lookups after database load (O(1) by symbol)
5. **Cached Queries**: NAV history queries cached after first access

### Path Aliases
- `@shared/*` → `./shared/*` (used in server code)

### TypeScript Patterns
- Use ES modules (`import/export`)
- Strict mode enabled
- Explicit types for all exported functions
- Zod for runtime validation

### Common Patterns
- **Service Layer**: `rmfDataService` handles all data operations
- **MCP Handlers**: Private methods in `RMFMCPServer` class
- **Error Handling**: Try/catch with generic error messages to clients
- **Logging**: Console logs for server lifecycle, errors, and MCP requests

## Thai RMF Context

**RMF (Retirement Mutual Fund):**
- Thai tax-advantaged retirement investment vehicle
- Tax deduction: Up to 500,000 THB per year
- Tax season peak: November-December (before Dec 31 deadline)
- Long-term investment (typically held until retirement)

**Fund Data Fields:**
- **NAV**: Net Asset Value (fund price per unit)
- **AMC**: Asset Management Company (fund provider)
- **Risk Level**: 1-8 scale (1=lowest, 8=highest risk)
- **Classification**: Fund category (Equity, Fixed Income, Mixed, etc.)
- **Performance**: Returns over YTD, 3M, 6M, 1Y, 3Y, 5Y, 10Y, Since Inception
- **Benchmark**: Comparison index (e.g., SET50, MSCI, bonds)

## References

- **README.md**: User-facing documentation
- **docs/ARCHITECTURE.md**: Detailed architecture documentation
- **docs/TESTING.md**: Testing strategy and plans
- **scripts/data-extraction/rmf/README.md**: Data extraction pipeline docs
