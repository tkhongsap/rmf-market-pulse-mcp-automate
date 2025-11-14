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

## Recent Changes (November 13, 2025)

### Database Pipeline Implementation
- Created PostgreSQL database schema with 4 tables (40 columns for rmf_funds table)
- Implemented database saver script (`server/pipeline/db-saver.ts`) with per-fund transaction isolation
- Successfully validated Phase 2 testing: 17/20 funds saved with 100% data integrity
- Database stats: 17 funds, 492 NAV history records, complete data for all available fields
- Known issue: Script timeout after 17 funds (connection pool cleanup timing) - does not affect data integrity

### Data Mapping
- Fund Policy: metadata.fund_classification → fund_policy column
- Risk Level: metadata.risk_level → risk_level column  
- All JSONB fields (performance, benchmark, asset_allocation, fees) properly mapped
- Fields not extracted in Phase 1: fund_category, volatility_5y, tracking_error_1y, top_holdings (set to NULL)

### Files Added
- `server/pipeline/db-schema.sql` - Database schema definition
- `server/pipeline/db-saver.ts` - Data persistence script
- `docs/rmf-pipeline-phase2-results.md` - Testing validation report
- Added `data:rmf:save-to-db` script to package.json