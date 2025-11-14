# MCP Server Deployment Guide for OpenAI Apps SDK

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Phase 1: Prepare for Apps SDK](#phase-1-prepare-for-apps-sdk)
- [Phase 2: Deploy to HTTPS](#phase-2-deploy-to-https)
  - [Option A: Replit Deployment](#option-a-replit-deployment)
  - [Option B: Railway Deployment](#option-b-railway-deployment)
- [Phase 3: Apps SDK Integration](#phase-3-apps-sdk-integration)
- [Phase 4: ChatGPT Integration](#phase-4-chatgpt-integration)
- [Testing & Verification](#testing--verification)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through deploying the **Thai RMF Market Pulse MCP Server** and integrating it with OpenAI's Apps SDK for use in ChatGPT.

**Current State:**
- ✅ Working MCP server with 6 tools
- ✅ 403 RMF funds with complete data
- ✅ TypeScript with `@modelcontextprotocol/sdk`
- ✅ Express server on port 5000

**Target State:**
- ✅ HTTPS deployment (Replit or Railway)
- ✅ Apps SDK compatible response format
- ✅ UI widget templates for ChatGPT
- ✅ Registered in ChatGPT

**Time Estimate:**
- Deployment only: 30-60 minutes
- Full Apps SDK integration: 3-5 hours
- Widget development: 1-2 days (optional)

---

## Prerequisites

### Required
- [x] GitHub account with access to this repository
- [x] Node.js 20+ installed locally (for testing)
- [x] Basic understanding of MCP and OpenAI Apps SDK

### Choose Your Platform
- [ ] **Replit account** (recommended for quick start)
  - Free account works
  - Core plan ($20/month) includes $25 credits
- [ ] **Railway account** (recommended for production)
  - $5 trial credit
  - $5/month Hobby plan

### Optional
- [ ] OpenAI account with ChatGPT access
- [ ] ngrok account (for local HTTPS testing)
- [ ] Custom domain (for production)

---

## Phase 1: Prepare for Apps SDK

### Step 1.1: Understand Current vs Required Format

**Current Response Format** (works for standard MCP clients):
```typescript
{
  content: [
    { type: 'text', text: 'Human-readable summary' },
    { type: 'text', text: 'JSON.stringify(data)' }
  ]
}
```

**Apps SDK Required Format** (works with ChatGPT):
```typescript
{
  content: [{
    type: 'resource',
    resource: { uri: 'ui://template-name' }
  }],
  structuredContent: {
    // Concise data for the model to read
  },
  _meta: {
    "openai/outputTemplate": "ui://template-name",
    // Large/sensitive data for widgets only
  }
}
```

### Step 1.2: Test Current Server Locally

```bash
# Clone repository (if not already done)
git clone https://github.com/tkhongsap/rmf-market-pulse-mcp.git
cd rmf-market-pulse-mcp

# Install dependencies
npm install

# Run development server
npm run dev
```

**Verify server is running:**
```bash
# In another terminal
curl http://localhost:5000/healthz
```

Expected output:
```json
{
  "status": "healthy",
  "totalFunds": 403,
  "timestamp": "2025-11-13T..."
}
```

### Step 1.3: Run Tests

```bash
# Run all tests to ensure everything works
npm test

# Optional: Run all test suites
npm run test:all
```

**Important:** Ensure all tests pass before deployment.

---

## Phase 2: Deploy to HTTPS

> **Why HTTPS is Required:** OpenAI Apps SDK and ChatGPT require HTTPS endpoints. Local `http://localhost` will not work.

### Option A: Replit Deployment

**Recommended for:** Quick start, testing, team demos
**Cost:** $1-3/month (Autoscale) or free with Core plan
**Setup Time:** 15-30 minutes

#### A.1: Create Replit Account

1. Go to https://replit.com
2. Sign up with GitHub (recommended for easy import)
3. Verify email address

#### A.2: Import Project from GitHub

1. Click **"Create Repl"** button (top left)
2. Select **"Import from GitHub"**
3. Enter repository URL: `https://github.com/tkhongsap/rmf-market-pulse-mcp`
4. Click **"Import from GitHub"**

Replit will:
- Auto-detect Node.js/TypeScript
- Install dependencies automatically
- Configure basic settings

#### A.3: Configure Replit Settings

1. **Open `.replit` file** (create if doesn't exist)

```toml
# .replit
run = "npm start"
entrypoint = "server/index.ts"

[deployment]
run = ["npm", "run", "build", "&&", "npm", "start"]
deploymentTarget = "cloudrun"
```

2. **Verify `package.json` scripts:**
```json
{
  "scripts": {
    "dev": "tsx server/index.ts",
    "start": "node dist/index.js",
    "build": "esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
  }
}
```

#### A.4: Test in Replit Dev Environment

1. Click **"Run"** button (top center)
2. Wait for server to start
3. Replit will show a webview with your server info
4. Note the dev URL: `https://<repl-name>.<username>.repl.co`

**Test the endpoint:**
```bash
curl https://<repl-name>.<username>.repl.co/healthz
```

#### A.5: Deploy to Autoscale

1. Click **"Deploy"** button (top right, ship icon)
2. Select **"Autoscale Deployment"**
3. Configure deployment:
   - **App name:** `rmf-market-pulse-mcp`
   - **Machine type:** Start with default (0.5 vCPU / 1GB RAM)
   - **Max instances:** 3-5 (for team usage)
   - **Environment variables:** None required (unless you add auth)

4. Click **"Deploy"**

**Wait for deployment (2-5 minutes)**

#### A.6: Get Your HTTPS Endpoint

After deployment completes:

1. Copy the deployment URL: `https://rmf-market-pulse-mcp.<username>.replit.app`
2. Your MCP endpoint is: `https://rmf-market-pulse-mcp.<username>.replit.app/mcp`

**Test the deployed endpoint:**
```bash
# Health check
curl https://rmf-market-pulse-mcp.<username>.replit.app/healthz

# Server info
curl https://rmf-market-pulse-mcp.<username>.replit.app/
```

#### A.7: Monitor Deployment

1. Click **"Deployments"** tab in Replit
2. View logs, metrics, and status
3. Monitor costs in **"Billing"** section

**Expected costs:**
- Base fee: $1/month
- Light usage (team testing): +$0-2/month
- Total: ~$1-3/month

---

### Option B: Railway Deployment

**Recommended for:** Production, high reliability, scalability
**Cost:** $5/month minimum
**Setup Time:** 15-30 minutes

#### B.1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Verify email address

#### B.2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub
4. Select repository: `tkhongsap/rmf-market-pulse-mcp`

#### B.3: Configure Deployment

Railway will auto-detect Node.js. Verify settings:

1. **Build Command:** `npm run build`
2. **Start Command:** `npm start`
3. **Port:** 5000 (Railway will auto-detect from code)

#### B.4: Add Environment Variables (Optional)

If you need custom configuration:

1. Go to **"Variables"** tab
2. Add variables:
   - `PORT`: 5000 (optional, already in code)
   - `ALLOWED_ORIGINS`: `*` (or specific domains)
   - `NODE_ENV`: `production`

#### B.5: Deploy

1. Railway automatically deploys on git push
2. Wait for build and deployment (3-5 minutes)
3. Watch logs in **"Deployments"** tab

#### B.6: Get Your HTTPS Endpoint

1. Go to **"Settings"** tab
2. Under **"Domains"**, click **"Generate Domain"**
3. Railway generates: `rmf-market-pulse-mcp.up.railway.app`
4. Your MCP endpoint: `https://rmf-market-pulse-mcp.up.railway.app/mcp`

**Test the endpoint:**
```bash
# Health check
curl https://rmf-market-pulse-mcp.up.railway.app/healthz

# Server info
curl https://rmf-market-pulse-mcp.up.railway.app/
```

#### B.7: Configure Custom Domain (Optional)

1. Go to **"Settings"** > **"Domains"**
2. Click **"Custom Domain"**
3. Enter your domain: `api.rmf-pulse.com`
4. Add DNS records (Railway provides instructions)
5. Wait for DNS propagation (5-60 minutes)

#### B.8: Monitor & Scale

1. View metrics in **"Metrics"** tab
2. Monitor costs in **"Usage"** tab
3. Scale resources in **"Settings"** if needed

**Expected costs:**
- Hobby plan: $5/month (includes $5 usage)
- Light usage: ~$5-10/month
- Medium usage: ~$10-20/month

---

## Phase 3: Apps SDK Integration

Now that you have an HTTPS endpoint, integrate with OpenAI Apps SDK.

### Step 3.1: Add UI Widget Templates

Create widget templates for ChatGPT to render.

**Create `server/widgets/` directory:**

```bash
mkdir -p server/widgets
```

**Create basic templates for each tool:**

#### 3.1.1: Fund Detail Widget

Create `server/widgets/fund-detail.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; }
    .fund-card {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      background: white;
    }
    .fund-header {
      border-bottom: 2px solid #f3f4f6;
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .fund-name {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .fund-code {
      font-size: 14px;
      color: #6b7280;
      font-family: monospace;
    }
    .nav-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .nav-value {
      font-size: 32px;
      font-weight: 700;
      color: #059669;
    }
    .nav-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .performance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .perf-item {
      text-align: center;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .perf-label {
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .perf-value {
      font-size: 16px;
      font-weight: 600;
    }
    .perf-value.positive { color: #059669; }
    .perf-value.negative { color: #dc2626; }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-label { color: #6b7280; font-size: 14px; }
    .info-value { font-weight: 600; font-size: 14px; }
    .risk-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
    }
    .risk-1, .risk-2 { background: #d1fae5; color: #065f46; }
    .risk-3, .risk-4 { background: #fef3c7; color: #92400e; }
    .risk-5, .risk-6 { background: #fed7aa; color: #9a3412; }
    .risk-7, .risk-8 { background: #fecaca; color: #991b1b; }
  </style>
</head>
<body>
  <div class="fund-card">
    <div class="fund-header">
      <div class="fund-name" id="fundName"></div>
      <div class="fund-code" id="fundCode"></div>
    </div>

    <div class="nav-section">
      <div>
        <div class="nav-label">Net Asset Value</div>
        <div class="nav-value" id="nav"></div>
      </div>
      <div style="text-align: right;">
        <div class="nav-label">As of</div>
        <div style="font-size: 14px; color: #374151;" id="navDate"></div>
      </div>
    </div>

    <div class="performance-grid" id="performanceGrid"></div>

    <div id="infoRows"></div>
  </div>

  <script>
    const data = window.openai.toolOutput._meta.fundData;

    document.getElementById('fundName').textContent = data.proj_name_en || 'N/A';
    document.getElementById('fundCode').textContent = data.proj_abbr_name || 'N/A';
    document.getElementById('nav').textContent = data.last_val
      ? parseFloat(data.last_val).toFixed(4) + ' THB'
      : 'N/A';
    document.getElementById('navDate').textContent = data.nav_date || 'N/A';

    // Performance metrics
    const perfMetrics = [
      { label: 'YTD', value: data.return_ytd },
      { label: '3M', value: data.return_3m },
      { label: '6M', value: data.return_6m },
      { label: '1Y', value: data.return_1y },
      { label: '3Y', value: data.return_3y },
      { label: '5Y', value: data.return_5y }
    ];

    const perfGrid = document.getElementById('performanceGrid');
    perfMetrics.forEach(({ label, value }) => {
      const val = parseFloat(value);
      const className = val >= 0 ? 'positive' : 'negative';
      const display = !isNaN(val) ? val.toFixed(2) + '%' : 'N/A';

      perfGrid.innerHTML += `
        <div class="perf-item">
          <div class="perf-label">${label}</div>
          <div class="perf-value ${className}">${display}</div>
        </div>
      `;
    });

    // Fund info
    const riskLevel = parseInt(data.risk_spectrum) || 0;
    const infoData = [
      { label: 'AMC', value: data.unique_id || 'N/A' },
      { label: 'Risk Level', value: `<span class="risk-badge risk-${riskLevel}">Level ${riskLevel}</span>` },
      { label: 'Classification', value: data.classification || 'N/A' },
      { label: 'Policy Asset', value: data.policy_asset || 'N/A' }
    ];

    const infoRows = document.getElementById('infoRows');
    infoData.forEach(({ label, value }) => {
      infoRows.innerHTML += `
        <div class="info-row">
          <span class="info-label">${label}</span>
          <span class="info-value">${value}</span>
        </div>
      `;
    });
  </script>
</body>
</html>
```

#### 3.1.2: Fund List Widget

Create `server/widgets/fund-list.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; }
    .fund-list {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }
    .list-header {
      background: #f9fafb;
      padding: 16px;
      border-bottom: 2px solid #e5e7eb;
      font-weight: 600;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      gap: 12px;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .fund-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      align-items: center;
      transition: background 0.2s;
    }
    .fund-row:hover { background: #f9fafb; }
    .fund-info { }
    .fund-name {
      font-weight: 600;
      font-size: 14px;
      color: #111827;
      margin-bottom: 2px;
    }
    .fund-code {
      font-size: 12px;
      color: #6b7280;
      font-family: monospace;
    }
    .nav-value {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }
    .perf-value {
      font-size: 14px;
      font-weight: 600;
    }
    .perf-value.positive { color: #059669; }
    .perf-value.negative { color: #dc2626; }
    .risk-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .risk-1, .risk-2 { background: #d1fae5; color: #065f46; }
    .risk-3, .risk-4 { background: #fef3c7; color: #92400e; }
    .risk-5, .risk-6 { background: #fed7aa; color: #9a3412; }
    .risk-7, .risk-8 { background: #fecaca; color: #991b1b; }
    .pagination {
      padding: 16px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      background: #f9fafb;
    }
  </style>
</head>
<body>
  <div class="fund-list">
    <div class="list-header">
      <div>Fund</div>
      <div>NAV</div>
      <div>YTD</div>
      <div>1Y</div>
      <div>Risk</div>
    </div>
    <div id="fundRows"></div>
    <div class="pagination" id="pagination"></div>
  </div>

  <script>
    const { funds, page, pageSize, total } = window.openai.toolOutput._meta;

    const fundRows = document.getElementById('fundRows');
    funds.forEach(fund => {
      const ytd = parseFloat(fund.return_ytd);
      const oneYear = parseFloat(fund.return_1y);
      const ytdClass = ytd >= 0 ? 'positive' : 'negative';
      const oneYearClass = oneYear >= 0 ? 'positive' : 'negative';
      const riskLevel = parseInt(fund.risk_spectrum) || 0;

      fundRows.innerHTML += `
        <div class="fund-row">
          <div class="fund-info">
            <div class="fund-name">${fund.proj_name_en || 'N/A'}</div>
            <div class="fund-code">${fund.proj_abbr_name || 'N/A'}</div>
          </div>
          <div class="nav-value">${fund.last_val ? parseFloat(fund.last_val).toFixed(4) : 'N/A'}</div>
          <div class="perf-value ${ytdClass}">${!isNaN(ytd) ? ytd.toFixed(2) + '%' : 'N/A'}</div>
          <div class="perf-value ${oneYearClass}">${!isNaN(oneYear) ? oneYear.toFixed(2) + '%' : 'N/A'}</div>
          <div><span class="risk-badge risk-${riskLevel}">${riskLevel}</span></div>
        </div>
      `;
    });

    document.getElementById('pagination').textContent =
      `Page ${page} • Showing ${funds.length} of ${total} funds`;
  </script>
</body>
</html>
```

#### 3.1.3: Fund Comparison Widget

Create `server/widgets/fund-comparison.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; }
    .comparison-table {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow-x: auto;
      background: white;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      position: sticky;
      top: 0;
    }
    td {
      font-size: 14px;
    }
    .metric-label {
      font-weight: 600;
      color: #374151;
    }
    .fund-header {
      font-weight: 600;
      color: #111827;
      font-size: 14px;
    }
    .fund-code {
      font-size: 12px;
      color: #6b7280;
      font-family: monospace;
      display: block;
      margin-top: 2px;
    }
    .positive { color: #059669; font-weight: 600; }
    .negative { color: #dc2626; font-weight: 600; }
    .best { background: #d1fae5; }
  </style>
</head>
<body>
  <div class="comparison-table">
    <table id="comparisonTable">
      <thead>
        <tr id="headerRow"></tr>
      </thead>
      <tbody id="tableBody"></tbody>
    </table>
  </div>

  <script>
    const { funds } = window.openai.toolOutput._meta;

    // Build header
    const headerRow = document.getElementById('headerRow');
    headerRow.innerHTML = '<th>Metric</th>';
    funds.forEach(fund => {
      headerRow.innerHTML += `
        <th>
          <div class="fund-header">${fund.proj_name_en || 'N/A'}</div>
          <span class="fund-code">${fund.proj_abbr_name || 'N/A'}</span>
        </th>
      `;
    });

    // Metrics to compare
    const metrics = [
      { label: 'NAV', key: 'last_val', format: (v) => parseFloat(v).toFixed(4) },
      { label: 'YTD Return', key: 'return_ytd', format: (v) => parseFloat(v).toFixed(2) + '%', compare: true },
      { label: '1Y Return', key: 'return_1y', format: (v) => parseFloat(v).toFixed(2) + '%', compare: true },
      { label: '3Y Return', key: 'return_3y', format: (v) => parseFloat(v).toFixed(2) + '%', compare: true },
      { label: '5Y Return', key: 'return_5y', format: (v) => parseFloat(v).toFixed(2) + '%', compare: true },
      { label: 'Risk Level', key: 'risk_spectrum', format: (v) => v },
      { label: 'AMC', key: 'unique_id', format: (v) => v },
    ];

    const tableBody = document.getElementById('tableBody');
    metrics.forEach(({ label, key, format, compare }) => {
      let row = `<tr><td class="metric-label">${label}</td>`;

      const values = funds.map(fund => parseFloat(fund[key]));
      const maxValue = compare ? Math.max(...values.filter(v => !isNaN(v))) : null;

      funds.forEach(fund => {
        const value = fund[key];
        const numValue = parseFloat(value);
        const formatted = value && format ? format(value) : 'N/A';

        let className = '';
        if (compare && !isNaN(numValue)) {
          className = numValue >= 0 ? 'positive' : 'negative';
          if (numValue === maxValue) className += ' best';
        }

        row += `<td class="${className}">${formatted}</td>`;
      });

      row += '</tr>';
      tableBody.innerHTML += row;
    });
  </script>
</body>
</html>
```

### Step 3.2: Update MCP Server Code

Modify `server/mcp.ts` to support Apps SDK format.

#### 3.2.1: Add Widget Resource Loader

Add this near the top of `server/mcp.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load widget templates
const widgetTemplates = {
  'fund-detail': fs.readFileSync(path.join(__dirname, 'widgets', 'fund-detail.html'), 'utf-8'),
  'fund-list': fs.readFileSync(path.join(__dirname, 'widgets', 'fund-list.html'), 'utf-8'),
  'fund-comparison': fs.readFileSync(path.join(__dirname, 'widgets', 'fund-comparison.html'), 'utf-8'),
};
```

#### 3.2.2: Register MCP Resources

Add resource registration to the MCP server initialization:

```typescript
// In RMFMCPServer class, add this method
private registerResources() {
  return Object.entries(widgetTemplates).map(([name, template]) => ({
    uri: `ui://${name}`,
    mimeType: 'text/html+skybridge',
    name: `${name} widget`,
    description: `UI widget for ${name}`,
    text: template
  }));
}

// Update server initialization to include resources
async start() {
  const transport = new StreamableHTTPServerTransport();

  await this.server.connect(transport);

  // Register resources
  this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: this.registerResources()
  }));

  this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resourceName = request.params.uri.replace('ui://', '');
    const template = widgetTemplates[resourceName];

    if (!template) {
      throw new Error(`Resource not found: ${request.params.uri}`);
    }

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: 'text/html+skybridge',
        text: template
      }]
    };
  });

  // ... rest of server setup
}
```

#### 3.2.3: Update Tool Metadata

Add `_meta` field to tool definitions:

```typescript
// Example for get_rmf_fund_detail
{
  name: 'get_rmf_fund_detail',
  description: 'Get detailed information for a specific RMF fund',
  inputSchema: zodToJsonSchema(GetRMFFundDetailSchema),
  _meta: {
    'openai/title': 'Get RMF Fund Details',
    'openai/description': 'View comprehensive fund information including NAV, performance, and risk metrics',
    'openai/outputTemplate': 'ui://fund-detail'
  }
}
```

#### 3.2.4: Update Response Handlers

Modify tool response format to include Apps SDK fields:

**Before:**
```typescript
private async handleGetRMFFundDetail(params: unknown) {
  const { fundCode } = GetRMFFundDetailSchema.parse(params);
  const fund = this.dataService.getFundBySymbol(fundCode);

  if (!fund) {
    throw new Error(`Fund not found: ${fundCode}`);
  }

  return {
    content: [
      { type: 'text', text: `Fund: ${fund.proj_name_en}` },
      { type: 'text', text: JSON.stringify(fund, null, 2) }
    ]
  };
}
```

**After:**
```typescript
private async handleGetRMFFundDetail(params: unknown) {
  const { fundCode } = GetRMFFundDetailSchema.parse(params);
  const fund = this.dataService.getFundBySymbol(fundCode);

  if (!fund) {
    throw new Error(`Fund not found: ${fundCode}`);
  }

  return {
    content: [{
      type: 'resource',
      resource: { uri: 'ui://fund-detail' }
    }],
    structuredContent: {
      fundCode: fund.proj_abbr_name,
      fundName: fund.proj_name_en,
      nav: fund.last_val,
      navDate: fund.nav_date,
      ytdReturn: fund.return_ytd,
      oneYearReturn: fund.return_1y,
      riskLevel: fund.risk_spectrum,
      amc: fund.unique_id
    },
    _meta: {
      'openai/outputTemplate': 'ui://fund-detail',
      fundData: fund
    }
  };
}
```

Apply similar changes to all tool handlers.

### Step 3.3: Build and Test Locally

```bash
# Build the updated server
npm run build

# Start server
npm start

# Test MCP endpoint
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_detail",
      "arguments": { "fundCode": "ABAPAC-RMF" }
    }
  }'
```

Expected response should include `structuredContent` and `_meta` fields.

### Step 3.4: Commit and Push Changes

```bash
git add .
git commit -m "feat: Add OpenAI Apps SDK support with UI widgets"
git push origin claude/mcp-server-setup-011CV5A242LNfsagoVxffxZx
```

### Step 3.5: Deploy Updated Code

**For Replit:**
1. Changes auto-sync from GitHub
2. Click "Deploy" to redeploy
3. Wait for deployment to complete

**For Railway:**
1. Push triggers auto-deployment
2. Monitor in Railway dashboard
3. Verify deployment in logs

---

## Phase 4: ChatGPT Integration

### Step 4.1: Test with MCP Inspector (Optional)

Before integrating with ChatGPT, test with MCP Inspector:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run inspector
mcp-inspector https://your-deployed-url.com/mcp
```

This opens a web UI to test your MCP tools and verify widget rendering.

### Step 4.2: Register with OpenAI

> **Note:** As of November 2025, OpenAI Apps SDK integration may require specific access. Check current requirements at https://developers.openai.com/apps-sdk

1. Go to OpenAI Developer Platform
2. Navigate to Apps SDK section
3. Register your MCP server:
   - **Server URL:** `https://your-deployed-url.com/mcp`
   - **Server Name:** Thai RMF Market Pulse
   - **Description:** Comprehensive Thai RMF fund data and analysis

### Step 4.3: Configure in ChatGPT

**For ChatGPT Desktop App:**

1. Open ChatGPT desktop app
2. Go to **Settings** > **Features** > **MCP Servers**
3. Click **"Add Server"**
4. Enter configuration:

```json
{
  "name": "rmf-market-pulse",
  "url": "https://your-deployed-url.com/mcp",
  "transport": "http",
  "description": "Thai RMF fund market data"
}
```

5. Click **"Save"**
6. Restart ChatGPT

### Step 4.4: Test in ChatGPT

Start a new conversation and try these prompts:

```
1. "Show me details for fund ABAPAC-RMF"

2. "What are the top 10 performing RMF funds this year?"

3. "Compare ABAPAC-RMF, KT-RMF, and SCB-RMF"

4. "Find low-risk RMF funds with good 5-year returns"

5. "Show me the NAV history for ABAPAC-RMF over the last 30 days"
```

**Expected behavior:**
- ChatGPT recognizes your MCP tools
- Calls appropriate tools with correct parameters
- Renders widgets inline in the conversation
- Displays interactive fund data visualizations

---

## Testing & Verification

### Test Checklist

#### Server Health
- [ ] `/healthz` returns 200 status
- [ ] `/` returns server information
- [ ] Server starts without errors
- [ ] Logs show successful data loading (403 funds)

#### MCP Endpoint
- [ ] `/mcp` accepts POST requests
- [ ] Returns valid JSON-RPC 2.0 responses
- [ ] Tools are listed correctly
- [ ] Resources are registered (widgets)

#### Tool Functionality
- [ ] `get_rmf_funds` - Returns paginated fund list
- [ ] `search_rmf_funds` - Filters work correctly
- [ ] `get_rmf_fund_detail` - Returns complete fund data
- [ ] `get_rmf_fund_performance` - Sorts by performance
- [ ] `get_rmf_fund_nav_history` - Returns NAV history
- [ ] `compare_rmf_funds` - Compares multiple funds

#### Apps SDK Format
- [ ] Responses include `structuredContent`
- [ ] Responses include `_meta['openai/outputTemplate']`
- [ ] `content` includes resource references
- [ ] Widgets load in MCP Inspector

#### ChatGPT Integration
- [ ] Server appears in ChatGPT MCP servers
- [ ] Tools are discoverable in conversations
- [ ] Widgets render correctly
- [ ] Tool calls execute successfully
- [ ] Error handling works (invalid fund codes, etc.)

### Manual Testing Script

Create `tests/manual-apps-sdk-test.sh`:

```bash
#!/bin/bash

# Set your deployment URL
DEPLOY_URL="https://your-deployed-url.com"

echo "Testing MCP Server for Apps SDK..."
echo ""

# Test 1: Health check
echo "1. Health Check"
curl -s "$DEPLOY_URL/healthz" | jq .
echo ""

# Test 2: Server info
echo "2. Server Info"
curl -s "$DEPLOY_URL/" | jq .
echo ""

# Test 3: List tools
echo "3. List Tools"
curl -s -X POST "$DEPLOY_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq .
echo ""

# Test 4: List resources (widgets)
echo "4. List Resources"
curl -s -X POST "$DEPLOY_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"resources/list"}' | jq .
echo ""

# Test 5: Get fund detail
echo "5. Get Fund Detail (with Apps SDK format)"
curl -s -X POST "$DEPLOY_URL/mcp" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"get_rmf_fund_detail",
      "arguments":{"fundCode":"ABAPAC-RMF"}
    }
  }' | jq .
echo ""

echo "All tests complete!"
```

Run with:
```bash
chmod +x tests/manual-apps-sdk-test.sh
./tests/manual-apps-sdk-test.sh
```

---

## Troubleshooting

### Common Issues

#### Issue: Server won't start on deployment platform

**Symptoms:**
- Deployment fails with "PORT binding failed"
- Server exits immediately

**Solution:**
```typescript
// Ensure server listens on correct port
const PORT = process.env.PORT || 5000;

// Bind to 0.0.0.0, not localhost
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### Issue: CORS errors when testing

**Symptoms:**
- Browser console shows CORS errors
- Requests blocked by browser

**Solution:**
Check `ALLOWED_ORIGINS` environment variable or update CORS config:

```typescript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
```

#### Issue: Widgets don't render in ChatGPT

**Symptoms:**
- ChatGPT shows tool results as plain text
- No widget UI appears

**Checklist:**
- [ ] MIME type is exactly `text/html+skybridge`
- [ ] Resource URI format is `ui://widget-name`
- [ ] Response includes `_meta['openai/outputTemplate']`
- [ ] `content` includes resource reference
- [ ] Widget HTML is valid and has no syntax errors
- [ ] `window.openai` API is used correctly in widget

#### Issue: Tool calls fail with "Fund not found"

**Symptoms:**
- Valid fund codes return errors
- Data seems missing

**Solution:**
```bash
# Verify CSV data loaded
curl https://your-url.com/healthz

# Check fund exists
curl -s -X POST https://your-url.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"search_rmf_funds",
      "arguments":{"search":"ABAPAC"}
    }
  }' | jq .
```

#### Issue: High costs on deployment platform

**Symptoms:**
- Unexpected billing charges
- Usage exceeds estimates

**Solutions:**

**For Replit Autoscale:**
- Check max instances setting (reduce to 2-3)
- Monitor in Billing dashboard
- Ensure idle timeout works (15 minutes)

**For Railway:**
- Check CPU/memory usage in Metrics
- Scale down if over-provisioned
- Consider switching to Hobby plan ($5/month fixed)

#### Issue: Slow response times

**Symptoms:**
- First request takes 5+ seconds
- Subsequent requests are fast

**Cause:** Cold start (Autoscale scales to zero)

**Solutions:**
1. **Switch to Reserved VM** (always-on)
2. **Accept cold starts** for cost savings
3. **Use health check pinger** (UptimeRobot) to keep warm

#### Issue: Build fails on deployment

**Symptoms:**
- Deployment shows build errors
- TypeScript compilation fails

**Solution:**
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run check

# Verify all dependencies installed
npm install
```

If errors persist, check:
- Node.js version (should be 20+)
- `tsconfig.json` paths
- Missing dependencies in `package.json`

---

## Next Steps

After successful deployment:

### 1. Monitor & Optimize
- Set up monitoring alerts
- Track usage patterns
- Optimize costs based on actual usage

### 2. Enhance Widgets
- Add charts and visualizations (Chart.js, D3.js)
- Implement interactive filtering
- Add export functionality

### 3. Scale & Improve
- Add caching layer (Redis) for frequently accessed data
- Implement rate limiting per user
- Add analytics to track popular funds

### 4. Documentation
- Create user guide for ChatGPT prompts
- Document best practices for fund queries
- Share with team members

### 5. Feedback Loop
- Collect user feedback
- Monitor error rates
- Iterate on widget designs

---

## Resources

### Official Documentation
- [OpenAI Apps SDK Docs](https://developers.openai.com/apps-sdk/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Replit Deployment Docs](https://docs.replit.com/hosting/deployments/)
- [Railway Deployment Docs](https://docs.railway.app/)

### Your Repository
- [Main README](../README.md)
- [Architecture Docs](./ARCHITECTURE.md)
- [Testing Guide](./TESTING.md)
- [CLAUDE.md](../CLAUDE.md)

### Support
- GitHub Issues: https://github.com/tkhongsap/rmf-market-pulse-mcp/issues
- OpenAI Community: https://community.openai.com/
- MCP Discord: https://discord.gg/modelcontextprotocol

---

## Summary

**You've completed:**
1. ✅ Deployed MCP server to HTTPS endpoint
2. ✅ Added Apps SDK compatible response format
3. ✅ Created UI widget templates
4. ✅ Registered MCP resources
5. ✅ Integrated with ChatGPT

**Your MCP server is now:**
- Accessible via HTTPS
- Compatible with OpenAI Apps SDK
- Discoverable in ChatGPT
- Rendering interactive widgets

**Share with your team:**
```
ChatGPT MCP Server: https://your-deployed-url.com/mcp

Try these prompts:
1. "Show me top RMF funds for this year"
2. "Compare ABAPAC-RMF and KT-RMF"
3. "Find low-risk RMF funds with good returns"
```

---

**Questions or issues?** Open an issue on GitHub or contact the development team.

**Happy deploying! 🚀**
