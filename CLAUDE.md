# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thai RMF Market Pulse - A **standalone MCP (Model Context Protocol) server** providing comprehensive Thai Retirement Mutual Fund (RMF) market data. This is a backend-only TypeScript server with 6 MCP tools, serving 403 RMF funds with complete market data loaded from pre-extracted CSV files.

**Key Facts:**
- **Architecture**: Standalone MCP server (no frontend, no database)
- **Data Source**: Pre-extracted CSV file (`docs/rmf-funds-consolidated.csv`)
- **Protocol**: Model Context Protocol via HTTP POST endpoint
- **MCP Tools**: 6 tools for fund data, search, performance, NAV history, and comparison
- **Dependencies**: 138 packages (down from 548 in previous full-stack version)

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

### Data Extraction (Optional)
These commands regenerate the fund data CSV from SEC APIs. Run only when updating fund data:

```bash
# Fund List Generation (API-based)
npm run data:rmf:generate-list         # Generate RMF fund list from SEC API
npm run data:esg:generate-list         # Generate Thai ESG fund list
npm run data:esgx:generate-list        # Generate Thai ESGX fund list

# RMF Data Pipeline (multi-phase extraction)
npm run data:rmf:build-mapping         # Phase 0: Build fund symbol → proj_id mapping
npm run data:rmf:fetch-all             # Phase 1: Fetch all RMF funds with complete data
npm run data:rmf:identify-incomplete   # Identify funds with incomplete data
npm run data:rmf:reprocess             # Re-process incomplete funds
npm run data:rmf:consolidate-csv       # Generate consolidated CSV from JSON files
```

## Architecture

### Server Structure

**Entry Point:** `server/index.ts`
- Express server with security middleware (Helmet, CORS, rate limiting)
- Single MCP endpoint: `POST /mcp`
- Health check: `GET /healthz`
- Server info: `GET /`
- Initializes `rmfDataService` with CSV data on startup
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
- Loads fund data from `docs/rmf-funds-consolidated.csv` (403 funds, 1.5MB)
- Builds in-memory indexes: `fundsMap` (by symbol), `byAMC`, `byRisk`, `byCategory`
- Loads NAV history from `data/rmf-funds/{SYMBOL}.json` files (lazy loading with cache)
- Security: Path traversal protection in `getNavHistory()`
- Fast lookups: O(1) by symbol, O(n) for search/filter operations

**SEC API Services:** `server/services/` (used for data extraction only, not by MCP server)
- `secFundDailyInfoApi.ts` - Daily NAV, historical NAV, dividends
- `secFundFactsheetApi.ts` - Fund metadata, performance, fees, holdings
- `secFundApi.ts` - Unified wrapper (legacy)
- `secApi.ts` - General SEC API utilities
- `setsmartApi.ts` - SET Smart API integration

### Shared Schemas (`shared/`)

**File:** `shared/schema.ts`

Zod schemas for type-safe data structures:

**CSV Data:**
- `RMFFundCSV` - Complete fund record from consolidated CSV (60 fields)
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
**File:** `docs/rmf-funds-consolidated.csv` (403 funds, 1.5MB)
- Loaded by `rmfDataService` on server startup
- 60 columns with complete fund data (NAV, performance, fees, etc.)
- Generated from: `data/rmf-funds/{SYMBOL}.json` files
- Command: `npm run data:rmf:consolidate-csv`

### NAV History Files
**Location:** `data/rmf-funds/{SYMBOL}.json`
- Individual JSON files per fund with 30-day NAV history
- Loaded on-demand by `getNavHistory()` method
- Cached in-memory after first load
- Used by: `get_rmf_fund_nav_history` tool

### Fund Lists (Reference)
- `docs/rmf-funds-api.csv` - 400 RMF funds (394 active, 6 cancelled)
- `docs/thai-esg-funds-api.csv` - 52 Thai ESG funds
- Generated by: `npm run data:rmf:generate-list`, `npm run data:esg:generate-list`

### Data Extraction Pipeline

**Two-Phase Process** (only needed when updating fund data):

**Phase 0: Build Mapping**
- Command: `npm run data:rmf:build-mapping`
- Script: `scripts/data-extraction/rmf/phase-0-build-mapping.ts`
- Output: `data/fund-mapping.json` (symbol → proj_id mapping)
- Fetches all funds from 29 AMCs via SEC API

**Phase 1: Fetch All Funds**
- Command: `npm run data:rmf:fetch-all`
- Script: `scripts/data-extraction/rmf/phase-1-fetch-all-funds.ts`
- Output: `data/rmf-funds/{SYMBOL}.json` (403 files)
- Rate limiting: 4 funds/batch, 15-second delays
- Progress tracking: `data/progress.json` (resume capability)
- Fetches 14 data points per fund (NAV, performance, risk, fees, etc.)

**Utility Scripts:**
- `identify-incomplete-funds.ts` - Find funds with missing data
- `reprocess-incomplete-funds.ts` - Re-fetch incomplete funds
- `consolidate-to-csv.ts` - Generate consolidated CSV from JSON files

See `scripts/data-extraction/rmf/README.md` for detailed documentation.

## Environment Variables

**Required:**
- None (server runs without external API dependencies)

**Optional:**
- `PORT` - Server port (defaults to 5000)
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated, defaults to '*')
- `SEC_API_KEY` - Only needed for data extraction scripts (not for MCP server)

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
1. **No Database**: All data loaded from CSV into memory (fast, simple, deterministic)
2. **No Frontend**: Pure MCP server (removed React/Vite in recent commits)
3. **No External APIs**: Server runs without SEC API key (pre-extracted data)
4. **In-Memory Indexes**: Fast lookups without database queries
5. **Lazy Loading**: NAV history loaded on-demand, cached after first access

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
