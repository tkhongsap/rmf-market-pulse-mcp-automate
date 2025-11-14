# GitHub Copilot Instructions - Thai RMF Market Pulse MCP Server

## Project Overview

This is a **standalone Model Context Protocol (MCP) server** providing Thai Retirement Mutual Fund (RMF) market data. The server exposes 6 MCP tools to query 403 RMF funds with comprehensive market data including NAV, performance metrics, and historical data.

**Type:** Pure MCP server (no frontend UI)  
**Protocol:** Model Context Protocol v1.0  
**Runtime:** Node.js 20+  
**Language:** TypeScript 5.6 (ESM only)

### Tech Stack
- **Express 4.21** - HTTP server with MCP endpoint at POST /mcp
- **MCP SDK 1.21.1** - @modelcontextprotocol/sdk for JSON-RPC 2.0
- **Zod 3.25** - Schema validation for all data types
- **esbuild 0.25** - Production bundling (54KB output)
- **tsx 4.20** - TypeScript execution for dev/test
- **Security:** Helmet, CORS, rate limiting (100 req/15min)

### Data Source
- CSV file (`docs/rmf-funds-consolidated.csv`) - 403 fund records, ~150KB
- JSON files (`data/rmf-funds/*.json`) - 403 individual fund details
- No database - All data loaded into memory at startup
- Data service: `server/services/rmfDataService.ts`

---

## Build & Validation - CRITICAL SEQUENCE

**ALWAYS follow this exact order. Do not skip steps.**

### 1. Type Check (ALWAYS FIRST)
```bash
npm run check
```
- Uses `tsc --noEmit` (no files generated)
- **MUST pass with zero errors before any commit**
- Fast (~2 seconds)
- Catches type errors in server/, shared/, tests/

### 2. Production Build
```bash
npm run build
```
- Cleans `dist/` directory
- Runs esbuild: `server/index.ts` → `dist/index.js` (ESM, external packages)
- Copies `docs/rmf-funds-consolidated.csv` to `dist/docs/`
- Copies 403 JSON files from `data/rmf-funds/` to `dist/data/rmf-funds/`
- **Build FAILS if CSV or JSON files missing**
- Output: `dist/index.js` (54KB bundled)
- Build time: ~6ms on clean build

### 3. Run Tests
```bash
npm test                    # Core MCP tools test suite
npm run test:http           # HTTP integration (requires server running)
npm run test:security       # Security validation
npm run test:integration    # Full integration (requires server)
npm run test:all            # All tests combined
```
- Uses `tsx` to run TypeScript directly
- **Known issue:** Some tests have expected failures (non-blocking)
- Tests validate 6 MCP tools with 403 fund dataset

### 4. Development Server
```bash
npm run dev
```
- Uses `tsx server/index.ts` (no build required)
- Listens on `http://0.0.0.0:5000`
- Loads 403 RMF funds from CSV (~111ms load time)
- Endpoints: POST /mcp, GET /healthz, GET /

### 5. Production Server
```bash
npm start
```
- Runs compiled `dist/index.js`
- **Requires `npm run build` first**
- Same endpoints, optimized bundle

---

## Project Structure

### Core Files (Must Know)
```
server/
  index.ts              # Express server, MCP endpoint, health checks
  mcp.ts                # MCP server, 6 tool definitions with Zod schemas
  services/
    rmfDataService.ts   # CSV loader, in-memory fund storage

shared/
  schema.ts             # Zod schemas: RMFFundCSV, AssetAllocation, etc.

scripts/
  build.mjs             # esbuild + asset copying (CRITICAL for production)

tests/
  mcp/test-mcp-tools.ts          # Main test suite (6 tools)
  integration/final-integration-test.sh  # HTTP integration
  security/test-security.mjs     # Security tests
```

### Data Files (CRITICAL - Build Dependencies)
```
docs/
  rmf-funds-consolidated.csv     # 403 funds, ~150KB (REQUIRED for build)

data/
  rmf-funds/
    ABAPAC-RMF.json              # 403 individual files
    ABGDD-RMF.json
    ... (403 total)
  fund-mapping.json              # Symbol → SEC API ID mapping
```

### Configuration
```
package.json     # "type": "module" (ESM only), scripts, dependencies
tsconfig.json    # noEmit: true, module: ESNext, strict: true
.env.example     # SEC API keys (optional for running server)
.gitignore       # Ignores: node_modules, dist, .env, data/progress.json
```

---

## Common Issues & Workarounds

### Build Failures

**❌ "CSV file not found: docs/rmf-funds-consolidated.csv"**
```bash
# Check if file exists
ls -lh docs/rmf-funds-consolidated.csv
# Should show ~150KB file with 403 records
```

**❌ "JSON directory not found: data/rmf-funds"**
```bash
# Check file count
ls data/rmf-funds/*.json | wc -l
# Should show 403
```

**❌ "dist/ not created"**
```bash
# Do NOT use tsc directly
# Use the build script which handles esbuild + asset copying
npm run build
```

### Type Errors

**❌ Import errors for `@shared/schema`**
```typescript
// Correct
import type { RMFFundCSV } from '@shared/schema';
import { rmfFundSchema } from '@shared/schema';

// Wrong
import { RMFFundCSV } from '@shared/schema';  // Type imported as value
```

**❌ "require is not defined"**
```typescript
// Wrong - This project uses ESM only
const service = require('./services/rmfDataService');

// Correct - Use import
import { rmfDataService } from './services/rmfDataService';
```

### Runtime Errors

**❌ Server starts but "Loaded 0 RMF funds"**
- Check CSV file is readable: `cat docs/rmf-funds-consolidated.csv | wc -l`
- Should show 404 lines (403 funds + header)
- Check file encoding (should be UTF-8)

**❌ MCP tool returns empty results**
- Ensure `rmfDataService.initialize()` completed on startup
- Look for "✓ Loaded 403 RMF funds" in console output
- Check CSV has proper columns: proj_name_en, proj_abbr_name, nav_value, etc.

### Test Failures (Known Issues)

**Some tests fail but are non-blocking:**
- Missing `timestamp` field in response (expected by test, not in data)
- Missing `navHistory7d` field (not implemented yet)
- AMC filter errors (data inconsistency)
- These failures do NOT indicate runtime bugs

---

## Code Style & TypeScript Rules

### Strict TypeScript
```typescript
// tsconfig.json enforces:
// - strict: true (no implicit any, null checks)
// - noEmit: true (type checking only)
// - module: ESNext (ES modules)
// - allowImportingTsExtensions: true

// Always use explicit types for function returns
async function getFunds(): Promise<RMFFundCSV[]> {
  return await rmfDataService.getAllFunds();
}

// Use Zod for runtime validation
const input = getFundInputSchema.parse(req.body);
```

### ESM Only - Never use require()
```typescript
// Correct
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { RMFFundCSV } from '@shared/schema';

// Wrong - will break in this project
const express = require('express');
```

### MCP Tool Response Format
```typescript
// All tools MUST return this structure
return {
  content: [
    { 
      type: 'text', 
      text: 'Human-readable summary for ChatGPT' 
    },
    { 
      type: 'text', 
      text: JSON.stringify(structuredData, null, 2) 
    }
  ]
};
```

### Error Handling Pattern
```typescript
// In MCP tool handlers
try {
  const result = await rmfDataService.searchFunds(args);
  return { content: [/* ... */] };
} catch (error) {
  console.error('Tool error:', error);  // Log full error internally
  return {
    content: [{
      type: 'text',
      text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }]
  };
}
```

---

## Making Changes Safely

### Adding/Modifying MCP Tools

1. **Define Zod schema in `server/mcp.ts`:**
```typescript
this.server.tool(
  'my_new_tool',
  'Tool description for ChatGPT',
  {
    param1: z.string().describe('Parameter description'),
    param2: z.number().optional().describe('Optional parameter'),
  },
  async (args) => this.handleMyNewTool(args)
);
```

2. **Implement handler method:**
```typescript
private async handleMyNewTool(args: any) {
  const data = await rmfDataService.getData(args);
  return {
    content: [
      { type: 'text', text: 'Summary' },
      { type: 'text', text: JSON.stringify(data) }
    ]
  };
}
```

3. **Add test in `tests/mcp/test-mcp-tools.ts`:**
```typescript
{
  name: 'my_new_tool - Test case',
  tool: 'my_new_tool',
  input: { param1: 'value' },
  expectedFields: ['result', 'timestamp'],
}
```

4. **Validate:**
```bash
npm run check && npm run build && npm test
```

### Modifying Data Schema

1. Update Zod schemas in `shared/schema.ts`
2. Update CSV structure if needed (use data extraction scripts)
3. Run `npm run check` to catch type errors across codebase
4. Rebuild: `npm run build`
5. Restart server: `npm run dev`

### Updating Dependencies

```bash
# Check if package supports ESM (required)
npm view <package-name> type

# Install
npm install <package-name>

# Validate
npm run check && npm run build && npm test
```

---

## Environment Variables

### Not Required for Running Server
The server works without any environment variables for read-only operations (serving existing data).

### Required for Data Fetching Scripts
```bash
# Thailand SEC API keys (get from https://api-portal.sec.or.th/)
SEC_FUND_FACTSHEET_KEY=your_key_here
SEC_FUND_DAILY_INFO_KEY=your_key_here
```

### Optional Configuration
```bash
PORT=5000                    # Server port (default: 5000)
NODE_ENV=development         # Environment (default: development)
ALLOWED_ORIGINS=*            # CORS origins (default: *)
```

**Security Note:** Never commit `.env` file. Use `.env.example` as template.

---

## Key Architectural Decisions

### Why CSV instead of Database?
- **Simplicity:** No database setup, migrations, or ORM overhead
- **Performance:** 403 funds load in ~111ms, fit in memory (~10MB)
- **Portability:** Works anywhere Node.js runs, no DB dependencies
- **Deployment:** Single binary + data files, no external services

### Why ESM Only?
- MCP SDK requires ES modules
- Modern Node.js best practice
- Cleaner import/export syntax
- Better tree-shaking for production builds

### Why No CI/CD?
- Small project, manual testing sufficient
- Deployed to Replit with auto-deployments from git push
- Tests run locally before commit

### Why esbuild?
- Fast builds (~6ms)
- Single file output for easy deployment
- External packages kept as node_modules (smaller bundle)
- Native TypeScript support

---

## Trust These Instructions

These instructions are validated against the actual codebase. **Only search for additional information if:**

1. Instructions contradict what you observe (report this as an issue)
2. You need implementation details not covered here
3. A command fails with an error not documented above

**When commands fail:** Check the error message against "Common Issues & Workarounds" section before exploring further. Most issues are already documented.

**Build sequence is sacred:** Always run `npm run check` before `npm run build`. Always run `npm run build` before `npm start`. Skipping steps leads to confusing errors.
