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