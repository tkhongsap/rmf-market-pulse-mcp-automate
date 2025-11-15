# Thai RMF Market Pulse - ChatGPT MCP Integration & Data Pipeline

## Overview

This project provides a robust Model Context Protocol (MCP) integration for ChatGPT, enabling it to query, analyze, and visualize data for 403 Thai Retirement Mutual Funds (RMFs). The system offers real-time data access, comprehensive analysis tools, and interactive HTML widgets for rich data visualization directly within ChatGPT. 

**NEW: Automated Daily Pipeline (In Progress)**  
Building an automated daily pipeline that extracts Thai RMF data from SEC Thailand APIs and stores it in PostgreSQL for real-time data access. Phase 2 testing completed with 17/20 funds successfully validated (85% success rate).

## User Preferences

- **Code Style**: TypeScript strict, Zod validation everywhere
- **Architecture**: Clean separation (service → MCP → widget)
- **Testing**: Comprehensive with interactive test harness
- **Documentation**: Detailed with examples and troubleshooting

## System Architecture

The system is built on an Express.js backend using TypeScript, integrating with the MCP SDK. Frontend widgets are developed using vanilla JavaScript to ensure minimal bundle size and fast loading within the ChatGPT environment.

**Core Components:**

-   **MCP Server Integration**: Implements the `@modelcontextprotocol/sdk` with `StreamableHTTPServerTransport` on a `POST /mcp` endpoint for JSON-RPC 2.0 communication. A `GET /mcp` endpoint provides HTML documentation.
-   **MCP Tools**: Six distinct tools are implemented for data interaction:
    1.  `get_rmf_funds`: Paginated list of funds.
    2.  `search_rmf_funds`: Multi-criteria search for funds.
    3.  `get_rmf_fund_detail`: Detailed information for a specific fund.
    4.  `get_rmf_fund_performance`: Top performers by various periods.
    5.  `get_rmf_fund_nav_history`: NAV history with volatility analysis.
    6.  `compare_rmf_funds`: Side-by-side comparison of multiple funds.
-   **Interactive HTML Widgets**: Four vanilla JavaScript widgets for data visualization:
    1.  `rmf-fund-list.html`: Carousel with pagination for fund lists.
    2.  `rmf-fund-card.html`: Detailed single fund view.
    3.  `rmf-comparison-table.html`: Multi-fund comparison table.
    4.  `rmf-performance-chart.html`: SVG line chart for NAV history.
    The total widget bundle size is optimized to 84KB.
-   **Data Management (RMFDataService)**: A centralized data access layer handling RMF fund data. It uses eager loading of CSV data (403 funds, 2MB) into memory on startup for instant access and lazy loading of per-fund NAV history JSON data on demand. In-memory caching ensures optimal performance.
-   **Validation**: Zod schemas are used for robust input validation for all MCP tools.
-   **UI/UX Decisions**:
    -   **Minimalist Landing Pages**: All primary web pages (`/`, `/health`, `/mcp`) feature clean, React-style UI.
    -   **Theme Support**: Widgets detect and adapt to ChatGPT's light/dark mode using `window.openai.matchTheme()`.
    -   **Color Semantics**: Utilizes green for positive returns, red for negative, and gray for neutral data, all theme-aware.
    -   **Typography**: Uses system fonts optimized for ChatGPT with a defined hierarchy and sizes.

**Data Flow:**
ChatGPT prompts lead to MCP tool selection, triggering a JSON-RPC request to the `/mcp` endpoint. After Zod validation and data retrieval via `RMFDataService` (leveraging in-memory cache), a JSON response containing a text summary and structured data is returned, which is then rendered by HTML widgets for interactive visualization.

**Performance Optimizations:**
-   **Data Loading**: Eager loading of CSV on startup, lazy loading of JSON NAV history, and in-memory caching for high hit rates.
-   **Widget Optimization**: Minimal bundle size, native SVG charts, CSS variables for theming, and shared utilities.

## External Dependencies

-   **@modelcontextprotocol/sdk**: Used for implementing the Model Context Protocol server and handling communication with ChatGPT.
-   **Express.js**: The web framework for building the backend server.
-   **TypeScript**: The primary language for backend development, enhancing code quality and maintainability.
-   **Zod**: A TypeScript-first schema declaration and validation library used for validating tool inputs.
-   **PostgreSQL (Neon)**: Development database for storing RMF fund data with 4-table schema (rmf_funds, rmf_nav_history, rmf_dividends, pipeline_runs).
-   **CSV Files**: `rmf-funds-consolidated.csv` contains comprehensive data for 403 RMF funds.
-   **JSON Files**: Individual JSON files (`{SYMBOL}.json`) store 30-day NAV history for each RMF fund.

## Recent Changes (November 15, 2025)

### Production-Safe Daily Refresh Pipeline
- **Architecture**: UPSERT-based approach (simple and safe)
- **Safety Features**:
  - Manifest validation: Completeness checks before load
  - UPSERT mode: Updates existing funds, inserts new ones (no truncation)
  - Process crash-safe: Database always has valid data
  - Reuses proven db-saver.ts logic (no schema mismatches)
- **Pipeline Components**:
  - `manifest-validator.ts`: Validates fetched data completeness
  - `db-saver.ts`: Proven batch loader with UPSERT
  - `daily-refresh-production.ts`: Orchestrates the entire pipeline
- **Data Quality**: 
  - 442 JSON files with complete fund data in `data/rmf-funds/`
  - 30-day NAV history per fund
  - Real-time data from SEC APIs
- **Database Schema**: PostgreSQL with 4 tables (rmf_funds, rmf_nav_history, rmf_dividends, pipeline_runs)
  - Fixed `proj_id` constraint: No longer unique (allows multiple share classes A/E/P/B per project)
  - 45+ columns in rmf_funds table with complete fund metadata
  - JSONB fields for performance, benchmark, asset_allocation, fees, risk_factors

### How to Use the Data Pipeline

**Current Status**: ✅ Production-ready with production-safe UPSERT approach

The pipeline performs full daily refresh from SEC Thailand API with fresh data fetch:

```bash
# Daily refresh (recommended for production)
npm run data:rmf:daily-refresh
```

**What it does:**
1. **Build Mapping**: Generates fresh fund list from SEC API (Phase 0)
2. **Fetch Data**: Clears old progress + fetches complete data for all funds → JSON files (Phase 1)
3. **Validate**: Checks completeness (compares fetched vs expected funds from mapping)
4. **Load**: Updates existing funds + inserts new funds using UPSERT

**Pipeline Details:**
- **Data Source**: SEC Thailand API (live data, not cached)
- **Fund Count**: ~450 RMF funds
- **Runtime**: 25-30 minutes (respects SEC API rate limits)
- **Safety**: UPSERT-based approach
  - Completeness validation prevents partial data from going live
  - UPSERT = no truncation, database always has valid data
  - Process crash-safe (transactional updates)
  - Reuses proven db-saver.ts (no schema mismatches)
- **Output**: Fresh JSON files + updated database
- **Note**: Stale/cancelled funds are NOT automatically removed (intentional for safety)

**Verification:**
```bash
# Check total funds
psql $DATABASE_URL -c "SELECT COUNT(*) FROM rmf_funds;"

# Check last update
psql $DATABASE_URL -c "SELECT MAX(data_updated_at) FROM rmf_funds;"
```

See `docs/PIPELINE-GUIDE.md` for complete documentation.

### Critical Bug Fixes (November 15, 2025)
- **Manifest Validator**: Fixed to read actual symbols from JSON files instead of deriving from filenames (handles symbols with spaces correctly)
- **Daily Refresh**: Added progress file clearing before fetch to ensure fresh data instead of resuming old fetches
- **Result**: Validation now correctly compares fetched funds vs mapping, preventing data mismatches

### Files Modified/Added
- `server/pipeline/manifest-validator.ts` - Reads symbols from JSON payloads (not filenames)
- `server/pipeline/daily-refresh-production.ts` - Clears old progress for fresh fetch
- `server/pipeline/db-schema.sql` - Production schema (proj_id no longer unique)
- `server/pipeline/db-saver.ts` - Batch processor with checkpoint system
- `scripts/data-extraction/rmf/` - Complete SEC API data extraction pipeline
- `data/rmf-funds/` - 442 JSON files with complete fund data
- `docs/rmf-funds-api.csv` - Fund mapping (symbol, name, AMC, proj_id)
- Added batch processing scripts to package.json