# Architecture Documentation

## System Overview

Thai RMF Market Pulse is an MCP (Model Context Protocol) integration that enables ChatGPT to query and visualize 403 Thai Retirement Mutual Funds. The system consists of three layers:

1. **Data Layer**: RMFDataService with CSV/JSON storage
2. **MCP Layer**: Express server with 6 MCP tools
3. **Presentation Layer**: 4 HTML widgets with theme support

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        ChatGPT                               │
│                    (User Interface)                          │
└────────────────────┬────────────────────────────────────────┘
                     │ Natural Language Prompt
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   MCP Tool Selection                         │
│            (Automatic by ChatGPT AI)                         │
└────────────────────┬────────────────────────────────────────┘
                     │ JSON-RPC Request
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  MCP Server (Express)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  StreamableHTTPServerTransport                       │   │
│  │  - Route: POST /mcp                                  │   │
│  │  - Protocol: JSON-RPC 2.0                            │   │
│  │  - Methods: tools/list, tools/call                   │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │  Zod Validation                                      │   │
│  │  - Input schema validation                           │   │
│  │  - Type safety enforcement                           │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │  Tool Handlers (6 tools)                             │   │
│  │  1. get_rmf_funds                                    │   │
│  │  2. search_rmf_funds                                 │   │
│  │  3. get_rmf_fund_detail                              │   │
│  │  4. get_rmf_fund_performance                         │   │
│  │  5. get_rmf_fund_nav_history                         │   │
│  │  6. compare_rmf_funds                                │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │ Service Call
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              RMFDataService (Data Layer)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  In-Memory Cache                                     │   │
│  │  - All funds: Map<symbol, RMFFundCSV>                │   │
│  │  - NAV history: Map<symbol_days, NavHistory[]>       │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │  Data Loading                                        │   │
│  │  - Eager: CSV on startup (403 funds)                 │   │
│  │  - Lazy: JSON on-demand (NAV history)                │   │
│  └──────────────┬───────────────────────────────────────┘   │
└─────────────────┼───────────────────────────────────────────┘
                  │ File I/O
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                 File System Storage                          │
│  ├─ data/rmf-funds-consolidated.csv (403 funds, 43 cols)    │
│  └─ data/rmf-funds/{SYMBOL}.json (NAV history per fund)     │
└─────────────────┬───────────────────────────────────────────┘
                  │ JSON Response
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      ChatGPT                                 │
│                 (Widget Renderer)                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  window.openai.toolOutput.structuredContent()        │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │ Data Injection
│                 ▼
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HTML Widget (4 types)                               │   │
│  │  - rmf-fund-list.html (carousel)                     │   │
│  │  - rmf-fund-card.html (detail view)                  │   │
│  │  - rmf-comparison-table.html (comparison)            │   │
│  │  - rmf-performance-chart.html (chart)                │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │  Shared Utilities                                    │   │
│  │  - styles.css (theme variables)                      │   │
│  │  - utils.js (formatters)                             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
            Interactive Visualization
```

---

## Data Layer: RMFDataService

### Design Pattern
**Singleton Service** with in-memory caching

### Loading Strategy

#### Eager Loading (Startup)
```typescript
// server/services/rmfDataService.ts
constructor() {
  // Load CSV once on startup
  const csvPath = 'data/rmf-funds-consolidated.csv';
  const records = parse(csvFile);  // ~403 funds
  
  // Store in Map for O(1) lookup
  this.allFunds = new Map(records.map(r => [r.symbol, r]));
}
```

**Benefits:**
- Instant lookups (O(1))
- No disk I/O during requests
- Simple cache invalidation
- Low memory footprint (~2MB)

#### Lazy Loading (On-Demand)
```typescript
getNavHistory(symbol: string, days: number) {
  const cacheKey = `${symbol}_${days}`;
  
  if (this.navHistoryCache.has(cacheKey)) {
    return this.navHistoryCache.get(cacheKey);
  }
  
  // Load JSON only when requested
  const jsonPath = `data/rmf-funds/${symbol}.json`;
  const history = JSON.parse(readFileSync(jsonPath));
  
  this.navHistoryCache.set(cacheKey, history);
  return history;
}
```

**Benefits:**
- Avoid loading 403 × 30KB = 12MB on startup
- Cache frequently requested histories
- Fast subsequent requests

### Methods

| Method | Complexity | Cache | Returns |
|--------|-----------|-------|---------|
| search() | O(n) filter | Yes (Map) | RMFFundCSV[] |
| getBySymbol() | O(1) lookup | Yes (Map) | RMFFundCSV |
| getNavHistory() | O(1) + file I/O | Yes (Map) | NavHistory[] |

---

## MCP Layer: Server Implementation

### Protocol Implementation

#### StreamableHTTPServerTransport
```typescript
// server/mcp.ts
const transport = new StreamableHTTPServerTransport('/mcp', app);

transport.onRequest = async (request) => {
  if (request.method === 'tools/list') {
    return { tools: [...] };
  }
  
  if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params;
    return await this.executeTool(name, args);
  }
};
```

### Tool Handler Pattern

All tools follow this pattern:
```typescript
private async handleToolName(args: any) {
  // 1. Validate input with Zod
  const validated = toolSchema.parse(args);
  
  // 2. Call RMFDataService
  const data = rmfDataService.someMethod(validated);
  
  // 3. Transform to response format
  const formatted = transform(data);
  
  // 4. Return structured content
  return {
    content: [
      { type: 'text', text: summary },
      { type: 'text', text: JSON.stringify(formatted) }
    ]
  };
}
```

### Input Validation

Every tool uses Zod schemas:
```typescript
const getRmfFundsSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
});

// Throws ZodError if invalid
const validated = getRmfFundsSchema.parse(args);
```

### Error Handling

```typescript
try {
  const result = await handler(args);
  return { content: [...] };
} catch (error) {
  if (error instanceof ZodError) {
    return { 
      isError: true,
      content: [{ type: 'text', text: `Invalid input: ${error.message}` }]
    };
  }
  
  return {
    isError: true,
    content: [{ type: 'text', text: 'Internal server error' }]
  };
}
```

---

## Presentation Layer: HTML Widgets

### Widget Pattern

All widgets follow this structure:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./shared/styles.css">
  <style>/* Widget-specific styles */</style>
</head>
<body>
  <!-- Loading State -->
  <div id="loading-state">...</div>
  
  <!-- Error State -->
  <div id="error-state">...</div>
  
  <!-- Content -->
  <div id="content">...</div>
  
  <script src="./shared/utils.js"></script>
  <script>
    window.addEventListener('load', () => {
      // 1. Detect theme
      window.openai.matchTheme();
      
      // 2. Get data
      const data = window.openai.toolOutput.structuredContent();
      
      // 3. Render
      renderWidget(data);
      
      // 4. Show content, hide loading
      document.getElementById('loading-state').style.display = 'none';
      document.getElementById('content').style.display = 'block';
    });
  </script>
</body>
</html>
```

### Theme Detection

```javascript
// shared/utils.js
window.openai = {
  matchTheme: () => {
    // Detect ChatGPT theme
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
};
```

### CSS Variables

```css
/* shared/styles.css */
:root {
  --color-fg: #1a1a1a;
  --color-bg: #ffffff;
  --color-success: #16a34a;
  --color-danger: #dc2626;
}

[data-theme="dark"] {
  --color-fg: #e5e5e5;
  --color-bg: #1a1a1a;
  --color-success: #22c55e;
  --color-danger: #ef4444;
}
```

### Formatters

```javascript
// shared/utils.js
window.formatters = {
  formatCurrency: (value) => `฿${value.toFixed(4)}`,
  formatPercent: (value) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
  formatDate: (dateString) => new Date(dateString).toLocaleDateString(),
  getChangeClass: (value) => value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
};
```

---

## Performance Optimizations

### 1. Data Loading Strategy

**Problem**: Loading all 403 funds + NAV history = 14MB
**Solution**: Eager CSV (2MB), Lazy JSON (on-demand)
**Result**: Startup < 500ms, Requests < 200ms

### 2. In-Memory Caching

**Problem**: Repeated CSV parsing on every request
**Solution**: Parse once on startup, store in Map
**Result**: O(1) lookups, zero disk I/O

### 3. Efficient Filtering

**Problem**: Linear search through 403 funds
**Solution**: Use native Array.filter with early termination
**Result**: < 150ms for complex queries

### 4. Widget Bundle Size

**Problem**: Chart libraries add 100KB+ overhead
**Solution**: Native SVG with vanilla JavaScript
**Result**: 84KB total (all widgets + utilities)

### 5. Benchmark Field Mapping

**Problem**: Incorrect field names causing null values
**Solution**: Created benchmarkMap with correct CSV column names
**Result**: Accurate outperformance calculations

### 6. NAV History Field Handling

**Problem**: Expected {date, nav} but got {nav_date, last_val}
**Solution**: Updated to use correct field names
**Result**: Proper statistics (return, volatility)

---

## Security Considerations

### Input Validation
- Zod schemas on all tool inputs
- Parameter range validation (page, limit, etc.)
- Fund code validation (exists in database)

### Output Sanitization
- No user input in HTML widgets
- JSON stringification for data injection
- No eval() or innerHTML usage

### Error Messages
- Generic errors to users
- Detailed errors in server logs
- No stack traces exposed

---

## Scalability Considerations

### Current Limits
- **Funds**: 403 (fits in memory)
- **NAV History**: 30 days per fund
- **Concurrent Requests**: Limited by Express default
- **Cache Size**: ~15MB max (all histories loaded)

### Future Scaling Options

#### Option 1: Database Migration
Move from CSV/JSON to PostgreSQL:
```sql
CREATE TABLE rmf_funds (
  symbol VARCHAR(20) PRIMARY KEY,
  fund_name TEXT,
  nav_value DECIMAL(10,4),
  -- 40 more columns
);

CREATE INDEX idx_performance ON rmf_funds(perf_ytd DESC);
CREATE INDEX idx_risk ON rmf_funds(risk_level);
```

**Benefits:**
- Better filtering performance
- SQL query optimization
- Horizontal scaling possible
- Real-time updates

#### Option 2: Redis Caching
Add Redis for distributed caching:
```typescript
const cached = await redis.get(`fund:${symbol}`);
if (cached) return JSON.parse(cached);

const fund = await loadFromDB(symbol);
await redis.set(`fund:${symbol}`, JSON.stringify(fund), 'EX', 3600);
```

**Benefits:**
- Shared cache across instances
- TTL-based invalidation
- Faster than disk I/O

#### Option 3: Microservices
Split into specialized services:
- **Fund Service**: Basic fund CRUD
- **Performance Service**: Historical analysis
- **Comparison Service**: Multi-fund operations

**Benefits:**
- Independent scaling
- Specialized optimization
- Better fault isolation

---

## Testing Strategy

### Unit Tests
```typescript
describe('RMFDataService', () => {
  it('should load all funds on startup', () => {
    const service = new RMFDataService();
    expect(service.search({}).funds.length).toBe(403);
  });
  
  it('should filter by risk level', () => {
    const { funds } = service.search({ riskLevel: 6 });
    expect(funds.every(f => f.risk_level === 6)).toBe(true);
  });
});
```

### Integration Tests
```typescript
describe('MCP Tools', () => {
  it('should return top performers', async () => {
    const response = await request(app)
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_rmf_fund_performance',
          arguments: { period: 'ytd', limit: 10 }
        },
        id: 1
      });
    
    expect(response.body.result.content).toBeDefined();
  });
});
```

### Widget Tests
Located in `public/mcp-test.html`:
- Load with sample data
- Test empty state
- Test error state
- Theme detection
- Data binding

---

## Deployment Architecture

### Current: Replit Single Instance
```
┌─────────────────────────────┐
│   Replit Container          │
│  ┌──────────────────────┐   │
│  │  Node.js 20          │   │
│  │  - Express Server    │   │
│  │  - MCP Endpoint      │   │
│  │  - File Storage      │   │
│  └──────────────────────┘   │
│                              │
│  Port 5000 (HTTP)            │
└─────────────────────────────┘
```

### Production: Load Balanced
```
          ┌──────────────┐
          │ Load Balancer│
          └──────┬───────┘
                 │
       ┌─────────┼─────────┐
       │         │         │
   ┌───▼───┐ ┌──▼────┐ ┌──▼────┐
   │Node 1 │ │Node 2 │ │Node 3 │
   │MCP    │ │MCP    │ │MCP    │
   │Server │ │Server │ │Server │
   └───┬───┘ └───┬───┘ └───┬───┘
       │         │         │
       └─────────┼─────────┘
                 │
          ┌──────▼──────┐
          │   Redis     │
          │   Cache     │
          └─────────────┘
                 │
          ┌──────▼──────┐
          │ PostgreSQL  │
          │  Database   │
          └─────────────┘
```

---

## Monitoring & Observability

### Metrics to Track
1. **Tool Response Times**
   - get_rmf_funds: < 100ms
   - search_rmf_funds: < 150ms
   - get_rmf_fund_performance: < 200ms

2. **Cache Hit Rates**
   - Fund lookups: ~95%
   - NAV history: ~80%

3. **Error Rates**
   - Zod validation errors
   - Fund not found errors
   - Server errors

### Logging Strategy
```typescript
// Structured logging
logger.info('MCP tool called', {
  tool: 'get_rmf_fund_performance',
  period: 'ytd',
  limit: 10,
  duration: 145
});

logger.error('Fund not found', {
  fundCode: 'INVALID',
  tool: 'get_rmf_fund_detail'
});
```

---

## Future Architecture Considerations

### 1. Real-Time Updates
Implement WebSocket for live NAV updates:
```typescript
io.on('connection', (socket) => {
  socket.on('subscribe', (symbol) => {
    // Subscribe to NAV updates for symbol
  });
});
```

### 2. GraphQL API
Offer GraphQL alongside MCP:
```graphql
query {
  fund(symbol: "DAOL-GOLDRMF") {
    symbol
    fundName
    nav {
      value
      change
      changePercent
    }
    performance {
      ytd
      oneYear
      threeYear
    }
  }
}
```

### 3. AI-Powered Insights
Add ML-based fund recommendations:
```typescript
const recommendations = await ml.recommendFunds({
  riskTolerance: 'medium',
  investmentHorizon: '5years',
  preferences: ['esg', 'tech']
});
```

---

## Conclusion

The architecture is designed for:
- **Performance**: <200ms tool responses
- **Scalability**: 403 funds, easily expandable
- **Maintainability**: Clean separation of concerns
- **Reliability**: Error handling at every layer
- **Extensibility**: Easy to add new tools/widgets

Total implementation: 2,551 lines of code + 84KB widgets
