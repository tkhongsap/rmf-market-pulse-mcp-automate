/**
 * Standalone MCP Server for Thai RMF Market Pulse
 *
 * This is a lightweight MCP (Model Context Protocol) server that provides
 * real-time Thai Retirement Mutual Fund (RMF) data via 6 tools:
 *
 * Tools:
 * - get_rmf_funds: List funds with pagination and sorting
 * - search_rmf_funds: Search/filter funds by multiple criteria
 * - get_rmf_fund_detail: Get detailed fund information
 * - get_rmf_fund_performance: Top performers by period
 * - get_rmf_fund_nav_history: NAV history over time
 * - compare_rmf_funds: Compare 2-5 funds side-by-side
 *
 * Data: 403 RMF funds with comprehensive market data
 * Protocol: Model Context Protocol (MCP) via HTTP POST
 * Endpoint: POST /mcp
 */

import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { RMFMCPServer } from './mcp';
import { RMFDataService } from './services/rmfDataService';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security: Helmet middleware for secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for MCP protocol compatibility
  crossOriginEmbedderPolicy: false,
}));

// Security: CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false,
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '1mb' })); // Limit payload size
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// OpenAI Apps SDK: Serve widget HTML files for ChatGPT
// Use process.cwd() to ensure widgets are found in both dev and production
app.use('/widgets', express.static(path.resolve(process.cwd(), 'server/widgets'), {
  setHeaders: (res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow ChatGPT to load widgets
  }
}));

// Request logging for MCP endpoint
app.use((req, res, next) => {
  if (req.path === '/mcp') {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    });
  }
  next();
});

/**
 * Health check endpoint - Clean status dashboard
 */
const healthHandler = (_req: express.Request, res: express.Response) => {
  const totalFunds = rmfDataService.getTotalCount();
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();
  const uptimeHours = Math.floor(uptime / 3600);
  const uptimeMinutes = Math.floor((uptime % 3600) / 60);
  const uptimeSeconds = Math.floor(uptime % 60);
  
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="30">
  <title>Health Status - Thai RMF Market Pulse</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f8f9fa;
      color: #1f2937;
      line-height: 1.6;
      padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
    .header { margin-bottom: 32px; }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 15px;
      color: #6b7280;
    }
    .badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 12px;
    }
    .auto-refresh {
      display: inline-block;
      background: #e5e7eb;
      color: #374151;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-left: 8px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      text-align: center;
    }
    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .metric-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 24px;
      border: 1px solid #e5e7eb;
    }
    .section h2 {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .info-grid {
      display: grid;
      gap: 16px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-item:last-child { border-bottom: none; }
    .info-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    .info-value {
      font-size: 14px;
      color: #111827;
      font-weight: 600;
      font-family: 'Monaco', monospace;
    }
    .status-online { color: #10b981; }
    .links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .link-btn {
      display: inline-block;
      padding: 10px 20px;
      background: #111827;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .link-btn:hover { background: #374151; }
    .link-btn.secondary {
      background: #f3f4f6;
      color: #111827;
    }
    .link-btn.secondary:hover { background: #e5e7eb; }
    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Health Status</h1>
      <p>Real-time server monitoring dashboard</p>
      <span class="badge">✓ Operational</span>
      <span class="auto-refresh">Auto-refresh: 30s</span>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">100%</div>
        <div class="metric-label">Healthy</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${totalFunds}</div>
        <div class="metric-label">RMF Funds Loaded</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${uptimeHours}h ${uptimeMinutes}m</div>
        <div class="metric-label">Uptime</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB</div>
        <div class="metric-label">Memory Used</div>
      </div>
    </div>

    <div class="section">
      <h2>System Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="info-value status-online">OPERATIONAL</span>
        </div>
        <div class="info-item">
          <span class="info-label">Server Name</span>
          <span class="info-value">Thai RMF Market Pulse MCP Server</span>
        </div>
        <div class="info-item">
          <span class="info-label">Version</span>
          <span class="info-value">v1.0.0</span>
        </div>
        <div class="info-item">
          <span class="info-label">Protocol</span>
          <span class="info-value">Model Context Protocol (MCP)</span>
        </div>
        <div class="info-item">
          <span class="info-label">MCP Tools</span>
          <span class="info-value">6 tools available</span>
        </div>
        <div class="info-item">
          <span class="info-label">Data Loaded</span>
          <span class="info-value">${totalFunds} RMF Funds</span>
        </div>
        <div class="info-item">
          <span class="info-label">Uptime</span>
          <span class="info-value">${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s</span>
        </div>
        <div class="info-item">
          <span class="info-label">Heap Memory</span>
          <span class="info-value">${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB</span>
        </div>
        <div class="info-item">
          <span class="info-label">Timestamp</span>
          <span class="info-value">${new Date().toISOString()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Node.js Version</span>
          <span class="info-value">${process.version}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Quick Links</h2>
      <div class="links">
        <a href="/mcp" class="link-btn">MCP Documentation</a>
        <a href="/" class="link-btn secondary">Server Info</a>
        <a href="https://github.com/tkhongsap/rmf-market-pulse-mcp" target="_blank" class="link-btn secondary">GitHub</a>
      </div>
    </div>

    <div class="footer">
      <p>Thai RMF Market Pulse MCP Server | Monitoring Dashboard</p>
    </div>
  </div>
</body>
</html>`);
};

app.get('/healthz', healthHandler);
app.get('/health', healthHandler);

/**
 * Security: Rate limiting for MCP endpoint
 * Prevents DoS attacks by limiting requests per IP
 */
const mcpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: {
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Too many requests. Please try again later.',
    },
    id: null,
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Skip rate limiting for health checks from monitoring systems
  skip: (req) => req.path === '/healthz',
});

/**
 * MCP Protocol endpoint - GET: Landing page with documentation
 */
app.get('/mcp', (_req, res) => {
  const totalFunds = rmfDataService.getTotalCount();
  
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Documentation - Thai RMF Market Pulse</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f8f9fa;
      color: #1f2937;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 60px 24px; }
    .header { margin-bottom: 48px; }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 16px;
    }
    .stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 16px;
    }
    .stat-badge {
      padding: 6px 14px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 13px;
      color: #374151;
      font-weight: 600;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 24px;
      border: 1px solid #e5e7eb;
    }
    .section h2 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 16px;
    }
    .section p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.7;
      margin-bottom: 20px;
    }
    .tools-list {
      display: grid;
      gap: 12px;
    }
    .tool-item {
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 3px solid #111827;
    }
    .tool-name {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
      font-family: 'Monaco', monospace;
      margin-bottom: 4px;
    }
    .tool-desc {
      font-size: 14px;
      color: #6b7280;
    }
    .code-block {
      background: #1a202c;
      color: #e5e7eb;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.7;
      margin: 16px 0;
    }
    .method-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'Monaco', monospace;
      margin-bottom: 12px;
    }
    .post { background: #dcfce7; color: #166534; }
    .example-section {
      margin-top: 24px;
    }
    .example-title {
      font-size: 15px;
      font-weight: 600;
      color: #374151;
      margin: 20px 0 12px 0;
    }
    .links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    .link-btn {
      display: inline-block;
      padding: 10px 20px;
      background: #111827;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .link-btn:hover { background: #374151; }
    .link-btn.secondary {
      background: #f3f4f6;
      color: #111827;
    }
    .link-btn.secondary:hover { background: #e5e7eb; }
    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MCP Documentation</h1>
      <p>Model Context Protocol Server for Thai Retirement Mutual Funds</p>
      <div class="stats">
        <span class="stat-badge">${totalFunds} RMF Funds</span>
        <span class="stat-badge">6 MCP Tools</span>
        <span class="stat-badge">Real-Time Data</span>
      </div>
    </div>

    <div class="section">
      <h2>API Endpoint</h2>
      <p>Send JSON-RPC 2.0 requests to query ${totalFunds} Thai RMF funds with comprehensive market data.</p>
      <span class="method-badge post">POST</span>
      <span style="font-family: Monaco; font-size: 14px; color: #6b7280;">/mcp</span>
      <div class="code-block">curl -X POST https://rmf-market-pulse-mcp-tkhongsap.replit.app/mcp \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_performance",
      "arguments": {"period": "ytd", "limit": 5}
    },
    "id": 1
  }'</div>
    </div>

    <div class="section">
      <h2>Available MCP Tools</h2>
      <p>Query the server using these 6 tools:</p>
      <div class="tools-list">
        <div class="tool-item">
          <div class="tool-name">get_rmf_funds</div>
          <div class="tool-desc">List all RMF funds with pagination and sorting</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">search_rmf_funds</div>
          <div class="tool-desc">Search and filter funds by name, AMC, risk level, and performance</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">get_rmf_fund_detail</div>
          <div class="tool-desc">Get detailed fund information including NAV, fees, and holdings</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">get_rmf_fund_performance</div>
          <div class="tool-desc">Top performing funds by period (YTD, 3M, 1Y, 3Y, 5Y, 10Y)</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">get_rmf_fund_nav_history</div>
          <div class="tool-desc">Historical NAV data with volatility and trend analysis</div>
        </div>
        <div class="tool-item">
          <div class="tool-name">compare_rmf_funds</div>
          <div class="tool-desc">Compare 2-5 funds side-by-side across metrics</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Example API Calls</h2>
      
      <div class="example-section">
        <div class="example-title">List all available tools</div>
        <div class="code-block">{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}</div>
      </div>

      <div class="example-section">
        <div class="example-title">Find gold-related RMF funds</div>
        <div class="code-block">{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_rmf_funds",
    "arguments": {
      "search": "gold",
      "limit": 5
    }
  },
  "id": 2
}</div>
      </div>

      <div class="example-section">
        <div class="example-title">Get low-risk funds with best YTD returns</div>
        <div class="code-block">{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "search_rmf_funds",
    "arguments": {
      "minRiskLevel": 1,
      "maxRiskLevel": 3,
      "sortBy": "ytd",
      "limit": 10
    }
  },
  "id": 3
}</div>
      </div>
    </div>

    <div class="section">
      <h2>Quick Links</h2>
      <div class="links">
        <a href="/" class="link-btn">Server Info</a>
        <a href="/health" class="link-btn secondary">Health Status</a>
        <a href="https://github.com/tkhongsap/rmf-market-pulse-mcp" target="_blank" class="link-btn secondary">GitHub</a>
      </div>
    </div>

    <div class="footer">
      <p>Thai RMF Market Pulse MCP Server | Built for Thai Investors</p>
    </div>
  </div>
</body>
</html>`);
});

/**
 * MCP Protocol endpoint - POST: Handle MCP tool calls
 * Handles all MCP tool calls according to the Model Context Protocol
 */
app.post('/mcp', mcpLimiter, async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    await rmfMCPServer.getServer().connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    // Log full error details internally for debugging
    console.error('MCP endpoint error:', error);

    // Return generic error message to client (no stack traces or internal details)
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'An error occurred while processing your request',
        },
        id: null,
      });
    }
  }
});

/**
 * Root endpoint - Server information with minimalist React-style design
 */
app.get('/', (_req, res) => {
  const totalFunds = rmfDataService.getTotalCount();
  
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thai RMF Market Pulse MCP Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f8f9fa;
      color: #1f2937;
      line-height: 1.6;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 60px 24px; }
    .header { margin-bottom: 48px; }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 16px;
      color: #6b7280;
    }
    .badge {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 12px;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 24px;
      border: 1px solid #e5e7eb;
    }
    .section h2 {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 20px;
    }
    .info-grid {
      display: grid;
      gap: 16px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-item:last-child { border-bottom: none; }
    .info-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    .info-value {
      font-size: 14px;
      color: #111827;
      font-weight: 600;
      font-family: 'Monaco', monospace;
    }
    .tools-list {
      display: grid;
      gap: 8px;
    }
    .tool-item {
      padding: 12px 16px;
      background: #f9fafb;
      border-radius: 8px;
      font-size: 14px;
      color: #374151;
      font-family: 'Monaco', monospace;
    }
    .endpoints {
      display: grid;
      gap: 12px;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .method {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      font-family: 'Monaco', monospace;
    }
    .get { background: #dbeafe; color: #1e40af; }
    .post { background: #d1fae5; color: #065f46; }
    .path {
      font-family: 'Monaco', monospace;
      font-size: 14px;
      color: #374151;
    }
    .links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    .link-btn {
      display: inline-block;
      padding: 10px 20px;
      background: #111827;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .link-btn:hover { background: #374151; }
    .link-btn.secondary {
      background: #f3f4f6;
      color: #111827;
    }
    .link-btn.secondary:hover { background: #e5e7eb; }
    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Thai RMF Market Pulse</h1>
      <p>Model Context Protocol Server for Thai Retirement Mutual Funds</p>
      <span class="badge">✓ Online</span>
    </div>

    <div class="section">
      <h2>Server Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Version</span>
          <span class="info-value">v1.0.0</span>
        </div>
        <div class="info-item">
          <span class="info-label">Protocol</span>
          <span class="info-value">Model Context Protocol (MCP)</span>
        </div>
        <div class="info-item">
          <span class="info-label">RMF Funds Loaded</span>
          <span class="info-value">${totalFunds} funds</span>
        </div>
        <div class="info-item">
          <span class="info-label">Last Updated</span>
          <span class="info-value">${new Date().toISOString().split('T')[0]}</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>API Endpoints</h2>
      <div class="endpoints">
        <div class="endpoint-item">
          <span class="method post">POST</span>
          <span class="path">/mcp</span>
        </div>
        <div class="endpoint-item">
          <span class="method get">GET</span>
          <span class="path">/health</span>
        </div>
        <div class="endpoint-item">
          <span class="method get">GET</span>
          <span class="path">/healthz</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Available MCP Tools (6)</h2>
      <div class="tools-list">
        <div class="tool-item">get_rmf_funds</div>
        <div class="tool-item">search_rmf_funds</div>
        <div class="tool-item">get_rmf_fund_detail</div>
        <div class="tool-item">get_rmf_fund_performance</div>
        <div class="tool-item">get_rmf_fund_nav_history</div>
        <div class="tool-item">compare_rmf_funds</div>
      </div>
    </div>

    <div class="links">
      <a href="/mcp" class="link-btn">View MCP Documentation</a>
      <a href="/health" class="link-btn secondary">Health Status</a>
      <a href="https://github.com/tkhongsap/rmf-market-pulse-mcp" target="_blank" class="link-btn secondary">GitHub</a>
    </div>

    <div class="footer">
      <p>Thai RMF Market Pulse MCP Server | Built for Thai Investors</p>
    </div>
  </div>
</body>
</html>`);
});

/**
 * Test Chat Interface - Natural Language Testing
 */
app.get('/test-chat', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'server/pages/test-chat.html'));
});

/**
 * Chat API - Natural Language to MCP Tool Calls
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Initialize OpenAI with Replit AI Integrations
    const openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
    
    // Define available MCP tools for the AI to choose from
    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_rmf_funds',
          description: 'List RMF funds with optional pagination and sorting. Use this for general fund listings.',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Number of funds to return (default 20)' },
              sortBy: { 
                type: 'string',
                enum: ['ytd', '1y', '3y', '5y', 'nav', 'name', 'risk'],
                description: 'Field to sort by'
              },
              sortOrder: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_rmf_funds',
          description: 'Search and filter RMF funds by multiple criteria like risk level, category, AMC, or minimum YTD return.',
          parameters: {
            type: 'object',
            properties: {
              search: { type: 'string', description: 'Search term for fund name or symbol' },
              amc: { type: 'string', description: 'Asset Management Company name' },
              minRiskLevel: { type: 'number', description: 'Minimum risk level (1-8)' },
              maxRiskLevel: { type: 'number', description: 'Maximum risk level (1-8)' },
              category: { type: 'string', description: 'Fund category' },
              minYtdReturn: { type: 'number', description: 'Minimum YTD return percentage' },
              limit: { type: 'number', description: 'Number of results' }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_rmf_fund_detail',
          description: 'Get detailed information about a specific RMF fund by its symbol/code.',
          parameters: {
            type: 'object',
            properties: {
              fundCode: { type: 'string', description: 'Fund symbol/code (e.g., KFRMF, SCBRMF)' }
            },
            required: ['fundCode']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_rmf_fund_performance',
          description: 'Get top performing RMF funds for a specific time period.',
          parameters: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                enum: ['ytd', '3m', '6m', '1y', '3y', '5y', '10y'],
                description: 'Performance period'
              },
              limit: { type: 'number', description: 'Number of top performers to return' },
              riskLevel: { type: 'number', description: 'Filter by risk level (1-8)' }
            },
            required: ['period']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_rmf_fund_nav_history',
          description: 'Get NAV (Net Asset Value) history for a specific fund over time.',
          parameters: {
            type: 'object',
            properties: {
              fundCode: { type: 'string', description: 'Fund symbol/code' },
              days: { type: 'number', description: 'Number of days of history (default 30)' }
            },
            required: ['fundCode']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'compare_rmf_funds',
          description: 'Compare multiple RMF funds side-by-side (2-5 funds).',
          parameters: {
            type: 'object',
            properties: {
              fundCodes: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of fund symbols to compare (2-5 funds)'
              }
            },
            required: ['fundCodes']
          }
        }
      }
    ];
    
    // Ask OpenAI to determine which tool to use - ENFORCE tool call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that helps users query Thai RMF (Retirement Mutual Fund) data. 
You MUST always call one of the available tools to answer queries. Never respond with plain text.

Guidelines:
- For "top performers" or "best funds" → use get_rmf_fund_performance
- For "low risk" or "conservative" → use search_rmf_funds with maxRiskLevel
- For specific fund details → use get_rmf_fund_detail
- For comparing funds → use compare_rmf_funds
- For NAV history/charts → use get_rmf_fund_nav_history
- For general listings → use get_rmf_funds

If the query is unclear or not about RMF funds, use get_rmf_funds with default parameters.`
        },
        { role: 'user', content: message }
      ],
      tools: tools as any,
      tool_choice: 'required' // Enforce tool calling
    });
    
    const responseMessage = completion.choices[0].message;
    
    // Verify tool call exists
    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
      return res.status(502).json({
        error: 'AI model did not return a tool call',
        response: 'Sorry, I couldn\'t process your question. Please try rephrasing or ask about RMF fund performance, details, or comparisons.'
      });
    }
    
    const toolCall = responseMessage.tool_calls[0] as any;
    let toolName: string;
    let toolArgs: any;
    
    // Parse tool call with error handling
    try {
      toolName = toolCall.function?.name;
      if (!toolName) {
        throw new Error('Tool name is missing');
      }
      toolArgs = JSON.parse(toolCall.function.arguments);
    } catch (parseError: any) {
      return res.status(502).json({
        error: 'Failed to parse AI response',
        response: 'Sorry, there was an error processing your request. Please try again.'
      });
    }
    
    // Convert snake_case tool name to camelCase method name
    const methodName = `handle${toolName.charAt(0).toUpperCase() + toolName.slice(1).replace(/_([a-z])/g, (_: any, letter: string) => letter.toUpperCase())}`;
    
    // Call the actual MCP tool via RMFMCPServer
    let result;
    try {
      const method = (rmfMCPServer as any)[methodName];
      if (typeof method !== 'function') {
        throw new Error(`Tool ${toolName} not found`);
      }
      result = await method.call(rmfMCPServer, toolArgs);
    } catch (error: any) {
      console.error(`Tool execution error (${toolName}):`, error);
      return res.json({
        error: error.message,
        toolCall: `${toolName}(${JSON.stringify(toolArgs, null, 2)})`,
        response: `Failed to execute tool: ${error.message}`
      });
    }
    
    // Extract meaningful data from result
    let resultData = result;
    if (result && result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c: any) => c.type === 'text' && c.text && c.text.startsWith('{'));
      if (textContent) {
        try {
          resultData = JSON.parse(textContent.text);
        } catch {
          resultData = result.content[0]?.text || result;
        }
      } else if (result.content[0]?.text) {
        resultData = result.content[0].text;
      }
    }
    
    return res.json({
      response: `I used the ${toolName} tool to answer your question.`,
      toolCall: `${toolName}(${JSON.stringify(toolArgs, null, 2)})`,
      result: resultData
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * 404 handler
 */
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'This is an MCP server. Please use POST /mcp for tool calls.',
    availableEndpoints: {
      mcp: 'POST /mcp',
      health: 'GET /healthz',
      info: 'GET /',
    },
  });
});

/**
 * Error handler
 */
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error('Server error:', err);
  res.status(status).json({ error: message });
});

// Initialize database connection pool and services
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const dbPool = new Pool({
  connectionString: databaseUrl,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 10 seconds
});

// Initialize services
const rmfDataService = new RMFDataService(dbPool);
const rmfMCPServer = new RMFMCPServer(rmfDataService);

/**
 * Initialize and start server
 */
async function startServer() {
  console.log('🚀 Thai RMF Market Pulse MCP Server');
  console.log('=' .repeat(60));

  // Initialize data service
  console.log('📦 Loading RMF fund data from PostgreSQL...');
  await rmfDataService.initialize();
  console.log(`✓ Loaded ${rmfDataService.getTotalCount()} RMF funds from database`);

  // Create HTTP server
  const httpServer = createServer(app);

  // Get port from environment or default to 5000
  const port = parseInt(process.env.PORT || '5000', 10);

  // Start listening
  httpServer.listen({
    port,
    host: '0.0.0.0',
    reusePort: true,
  }, () => {
    console.log('=' .repeat(60));
    console.log(`✓ MCP Server listening on port ${port}`);
    console.log(`  Endpoint: POST http://0.0.0.0:${port}/mcp`);
    console.log(`  Health: GET http://0.0.0.0:${port}/healthz`);
    console.log('=' .repeat(60));
    console.log('Available MCP Tools:');
    console.log('  1. get_rmf_funds - List funds with pagination');
    console.log('  2. search_rmf_funds - Search/filter funds');
    console.log('  3. get_rmf_fund_detail - Get fund details');
    console.log('  4. get_rmf_fund_performance - Top performers');
    console.log('  5. get_rmf_fund_nav_history - NAV history');
    console.log('  6. compare_rmf_funds - Compare funds');
    console.log('=' .repeat(60));
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down server...');

    // Set 10-second timeout to force exit
    const forceExitTimeout = setTimeout(() => {
      console.log('⚠️  Force closing server after timeout');
      process.exit(1);
    }, 10000);

    httpServer.close(async () => {
      // Close database pool
      await dbPool.end();
      console.log('✓ Database connection closed');
      
      clearTimeout(forceExitTimeout);
      console.log('✓ Server closed gracefully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start the server
startServer().catch(error => {
  console.error('❌ Fatal error starting server:', error);
  process.exit(1);
});
