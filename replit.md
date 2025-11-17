# Thai RMF Market Pulse - ChatGPT MCP Integration & Data Pipeline

## Overview

This project integrates a Model Context Protocol (MCP) with ChatGPT to provide advanced querying, analysis, and visualization capabilities for 442 Thai Retirement Mutual Funds (RMFs). It offers real-time data access from a PostgreSQL database, comprehensive analytical tools, and interactive HTML widgets for rich data visualization directly within the ChatGPT environment. The system aims to be a robust platform for financial analysis, leveraging up-to-date RMF data from SEC Thailand APIs.

## User Preferences

-   **Code Style**: TypeScript strict, Zod validation everywhere
-   **Architecture**: Clean separation (service → MCP → widget)
-   **Testing**: Comprehensive with interactive test harness
-   **Documentation**: Detailed with examples and troubleshooting

## System Architecture

The system is built on an Express.js backend using TypeScript, integrated with the MCP SDK. Frontend widgets are developed using vanilla JavaScript for optimal performance within ChatGPT.

**Core Components:**

-   **MCP Server Integration**: Implements the `@modelcontextprotocol/sdk` for JSON-RPC 2.0 communication over a `POST /mcp` endpoint. A `GET /mcp` endpoint provides HTML documentation.
-   **MCP Tools**: Six tools enable data interaction: `get_rmf_funds`, `search_rmf_funds`, `get_rmf_fund_detail`, `get_rmf_fund_performance`, `get_rmf_fund_nav_history`, and `compare_rmf_funds`.
-   **Interactive HTML Widgets**: Four vanilla JavaScript widgets (`rmf-fund-list.html`, `rmf-fund-card.html`, `rmf-comparison-table.html`, `rmf-performance-chart.html`) provide data visualization, optimized for minimal bundle size (84KB total).
-   **Data Management (RMFDataService)**: Centralized data access layer that queries a PostgreSQL database. It loads 442 funds into memory on startup for instant access, with NAV history lazily loaded on demand. In-memory caching ensures optimal performance, using PostgreSQL as the single source of truth.
-   **Validation**: Zod schemas are used for robust input validation across all MCP tools.
-   **UI/UX Decisions**:
    -   **Minimalist Landing Pages**: Clean, React-style UI for primary web pages (`/`, `/health`, `/mcp`).
    -   **Theme Support**: Widgets adapt to ChatGPT's light/dark mode.
    -   **Color Semantics**: Green for positive, red for negative, and gray for neutral data, with theme awareness.
    -   **Typography**: System fonts optimized for ChatGPT with defined hierarchy.

**Data Flow:**
ChatGPT prompts lead to MCP tool selection, triggering a JSON-RPC request to the `/mcp` endpoint. After Zod validation and data retrieval via `RMFDataService`, a JSON response containing a text summary and structured data is returned, rendered by HTML widgets for interactive visualization.

**Performance Optimizations:**
-   **Data Loading**: Eager loading of funds from PostgreSQL on startup, lazy loading of NAV history, and in-memory caching.
-   **Database**: Connection pooling (max 20 connections, 10s timeout) and optimized queries with indexes.
-   **Widget Optimization**: Minimal bundle size, native SVG charts, CSS variables for theming, and shared utilities.

## External Dependencies

-   **@modelcontextprotocol/sdk**: For MCP server implementation and ChatGPT communication.
-   **Express.js**: Web framework for the backend server.
-   **TypeScript**: Primary language for backend development.
-   **Zod**: TypeScript-first schema validation library.
-   **PostgreSQL (Neon)**: Primary data source with a 4-table schema (rmf_funds, rmf_nav_history, rmf_dividends, pipeline_runs).
-   **pg (node-postgres)**: PostgreSQL client library with connection pooling.

## Recent Changes (November 17, 2025)

### OpenAI Apps SDK Compliance Implementation

Transformed the MCP server to be fully Apps SDK compliant for ChatGPT integration:

**Resource Registration:**
- Registered 4 widget HTML files as resources with `mimeType: "text/html+skybridge"`
- Widget URIs: `ui://widget/{fund-list,fund-detail,fund-comparison,performance-chart}.html`
- Widgets served from `/widgets` endpoint with proper CORS and CSP headers

**Tool Response Structure:**
- Updated all 6 tools to return three-field structure:
  - `structuredContent`: Concise data visible to AI model
  - `content`: Human-readable narrative text
  - `_meta`: Full data for widgets with `openai/outputTemplate` URI

**Widget Enhancements:**
- Updated all widgets to use `window.openai.toolOutput` and `window.openai.toolResponseMetadata`
- Implemented state persistence via `window.openai.setWidgetState()` in all 4 widgets
- Added theme change event listeners for light/dark mode support
- Handles both old/new field naming conventions for backward compatibility

**Testing:**
- Created comprehensive test suite with 17 automated tests (all passing)
- Built interactive test harness at `/test-widgets` endpoint
- Validated MCP protocol compliance, response structures, and edge cases
- Test report: `TEST_REPORT.md`

**Readiness:** 95% ready for ChatGPT integration. Remaining work: visual validation of 3 widgets, ngrok tunnel setup for live testing.

## Production Deployment Architecture

The system uses a **dual-deployment architecture** on Replit to separate the MCP server from the data pipeline:

### Deployment 1: MCP Server (Main Application)
- **Type:** Autoscale
- **URL:** https://alfie-app-tkhongsap.replit.app
- **Build Command:** `npm run build`
- **Run Command:** `npm start`
- **Purpose:** Serves ChatGPT MCP requests 24/7
- **Features:**
  - Loads 442 RMF funds into memory on startup
  - Responds to ChatGPT tool calls
  - Serves widget resources
  - Auto-scales based on traffic
  - Production-optimized compiled code

### Deployment 2: Data Pipeline (Scheduled Job)
- **Type:** Scheduled Deployment
- **Schedule:** Weekdays at midnight UTC (7 AM Bangkok time)
- **Command:** `npm run data:rmf:daily-refresh`
- **Timeout:** 2 hours (7200 seconds)
- **Purpose:** Refreshes RMF data from SEC Thailand APIs
- **Process:**
  1. Fetches all AMCs and RMF funds from SEC API
  2. Downloads comprehensive data (~14 endpoints per fund)
  3. Validates data completeness
  4. Updates PostgreSQL database via UPSERT
  5. Shuts down after completion

Both deployments share the same PostgreSQL database, ensuring the MCP server always serves fresh data.

### Setting Up Scheduled Deployment

To create the scheduled data pipeline deployment:

1. Open **Publishing** tool in Replit
2. Click **"+ New Deployment"**
3. Select **"Scheduled"** deployment type
4. Configure:
   - **Name:** RMF Data Pipeline - Daily Refresh
   - **Schedule:** `Every weekday at midnight` or cron `0 0 * * 1-5`
   - **Job Timeout:** `7200` seconds (2 hours)
   - **Build Command:** `npm install`
   - **Run Command:** `npm run data:rmf:daily-refresh`
5. Ensure `DATABASE_URL` is set in deployment secrets
6. Click **"Create"** to deploy

The scheduled job will run independently and update the database automatically every weekday.