# Thai RMF Market Pulse - MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.0-blue)](https://modelcontextprotocol.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)

A standalone **Model Context Protocol (MCP)** server providing comprehensive Thai Retirement Mutual Fund (RMF) market data. This server enables AI assistants and applications to access real-time RMF fund information, performance metrics, and historical NAV data through a standardized protocol.

## 🎯 Features

- **6 MCP Tools** for comprehensive fund data access
- **403 RMF Funds** with complete market data
- **Real-time NAV** and performance metrics
- **Historical Data** with 30-day NAV history
- **Comprehensive Search** and filtering capabilities
- **Benchmark Comparison** for performance analysis
- **Zero Frontend Bloat** - Pure MCP server implementation

## 📊 Available MCP Tools

### 1. `get_rmf_funds`
Get a paginated list of Thai RMF funds with sorting options.

**Parameters:**
- `page` (number, optional): Page number (default: 1)
- `pageSize` (number, optional): Funds per page (default: 20, max: 50)
- `sortBy` (string, optional): Sort field (`ytd`, `1y`, `3y`, `5y`, `nav`, `name`, `risk`)
- `sortOrder` (string, optional): Sort order (`asc`, `desc`)

### 2. `search_rmf_funds`
Search and filter RMF funds by multiple criteria.

**Parameters:**
- `search` (string, optional): Search in fund name or symbol
- `amc` (string, optional): Filter by Asset Management Company
- `minRiskLevel` (number, optional): Minimum risk level (1-8)
- `maxRiskLevel` (number, optional): Maximum risk level (1-8)
- `category` (enum, optional): `Equity`, `Fixed Income`, `Mixed`, `International`, `Other`
- `minYtdReturn` (number, optional): Minimum YTD return percentage
- `sortBy` (string, optional): Sort field
- `limit` (number, optional): Maximum results (default: 20)

### 3. `get_rmf_fund_detail`
Get detailed information for a specific RMF fund.

**Parameters:**
- `fundCode` (string, required): Fund symbol/code (e.g., "ABAPAC-RMF")

### 4. `get_rmf_fund_performance`
Get top performing RMF funds for a specific period with benchmark comparison.

**Parameters:**
- `period` (enum, required): `ytd`, `3m`, `6m`, `1y`, `3y`, `5y`, `10y`
- `sortOrder` (enum, optional): `asc`, `desc` (default: `desc`)
- `limit` (number, optional): Maximum funds to return (default: 10)
- `riskLevel` (number, optional): Filter by risk level (1-8)

### 5. `get_rmf_fund_nav_history`
Get NAV (Net Asset Value) history for a specific RMF fund over time.

**Parameters:**
- `fundCode` (string, required): Fund symbol/code
- `days` (number, optional): Number of days of history (default: 30, max: 365)

### 6. `compare_rmf_funds`
Compare multiple RMF funds side by side.

**Parameters:**
- `fundCodes` (string[], required): Array of 2-5 fund symbols to compare
- `compareBy` (enum, optional): `performance`, `risk`, `fees`, `all` (default: `all`)

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/tkhongsap/rmf-market-pulse-mcp.git
cd rmf-market-pulse-mcp
npm install
```

### Development

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### Production

```bash
npm run build
npm start
```

## 📡 API Endpoints

### MCP Protocol Endpoint
**POST** `/mcp`

Main endpoint for all MCP tool calls following JSON-RPC 2.0 specification.

**Headers:**
- `Content-Type: application/json`
- `Accept: application/json, text/event-stream`

### Health Check
**GET** `/healthz`

Returns server status and fund data statistics.

### Server Information
**GET** `/`

Returns server information, available tools, and endpoints.

## 🧪 Testing

```bash
npm test                    # Run MCP tools test suite
npm run test:coverage       # Run tests with coverage report
npm run test:http           # HTTP integration test
npm run test:security       # Security tests
npm run test:integration    # Final integration test
npm run test:user-scenarios # Natural language question tests
npm run test:all            # Run all test suites
```

Test files are organized in the `tests/` directory:
- `tests/mcp/` - MCP tool tests
- `tests/integration/` - Integration tests
- `tests/user-scenarios/` - User scenario tests
- `tests/security/` - Security tests
- `tests/helpers/` - Test helper scripts
- `tests/api/` - API tests

## 📦 Dependencies

**Production:** 138 packages (down from 548 in full-stack version)
- Zero vulnerabilities
- 74% reduction in package count

## 📝 License

MIT License

---

**Made with ❤️ for the Thai investment community**
