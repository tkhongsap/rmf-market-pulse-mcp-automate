# MCP Integration Testing Guide

## Overview
This document provides testing instructions for the Thai RMF Market Pulse MCP integration, including tool validation, widget testing, and golden prompts for ChatGPT.

## Table of Contents
1. [MCP Tools Testing](#mcp-tools-testing)
2. [Widget Testing](#widget-testing)
3. [Golden Prompts](#golden-prompts)
4. [Integration Flow](#integration-flow)

---

## MCP Tools Testing

### Prerequisites
- Server running on port 5000
- MCP endpoint: `http://localhost:5000/mcp`

### Tool 1: get_rmf_funds
**Description:** Get a paginated list of all RMF funds

**Test Command:**
```bash
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"get_rmf_funds",
      "arguments":{"page":1,"pageSize":10}
    },
    "id":1
  }'
```

**Expected Response:**
- Status: 200 OK
- Content: Array of 10 funds with symbol, fund_name, AMC, NAV, risk_level, performance
- Total count: 403 funds

---

### Tool 2: search_rmf_funds
**Description:** Search and filter RMF funds by multiple criteria

**Test Command:**
```bash
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"search_rmf_funds",
      "arguments":{
        "riskLevel":6,
        "minYtd":10,
        "assetType":"Equity Fund"
      }
    },
    "id":2
  }'
```

**Expected Response:**
- Filtered list of funds matching criteria
- Only risk level 6 funds
- Only funds with YTD performance >= 10%
- Only equity funds

---

### Tool 3: get_rmf_fund_detail
**Description:** Get detailed information about a specific fund

**Test Command:**
```bash
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"get_rmf_fund_detail",
      "arguments":{"fundCode":"DAOL-GOLDRMF"}
    },
    "id":3
  }'
```

**Expected Response:**
- Complete fund details including:
  - Basic info (symbol, name, AMC, NAV, risk level)
  - Performance metrics (YTD, 3M, 6M, 1Y, 3Y, 5Y, 10Y)
  - Benchmark comparison (if available)
  - Fund characteristics (asset type, policy, registrar)

---

### Tool 4: get_rmf_fund_performance
**Description:** Get top-performing funds for a specific period

**Test Command:**
```bash
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"get_rmf_fund_performance",
      "arguments":{"period":"ytd","limit":10}
    },
    "id":4
  }'
```

**Expected Response:**
- Top 10 performing funds for YTD period
- Ranked by performance (highest first)
- Includes benchmark comparison and outperformance calculation
- Valid periods: ytd, 3m, 6m, 1y, 3y, 5y, 10y

---

### Tool 5: get_rmf_fund_nav_history
**Description:** Get NAV history for a specific fund

**Test Command:**
```bash
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"get_rmf_fund_nav_history",
      "arguments":{"fundCode":"DAOL-GOLDRMF","days":30}
    },
    "id":5
  }'
```

**Expected Response:**
- NAV history for the last 30 days
- Each entry includes: date, nav, previous_nav, change, change_percent
- Statistics: minNav, maxNav, avgNav, periodReturn, volatility

---

### Tool 6: compare_rmf_funds
**Description:** Compare multiple funds side by side

**Test Command:**
```bash
curl -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{
      "name":"compare_rmf_funds",
      "arguments":{
        "fundCodes":["DAOL-GOLDRMF","ABAPAC-RMF","SCBRMFIXED"],
        "compareBy":"all"
      }
    },
    "id":6
  }'
```

**Expected Response:**
- Comparison data for all 3 funds
- Includes: basic info, performance, risk metrics, fees
- Valid compareBy values: all, performance, risk, fees

---

## Widget Testing

### Local Testing Interface
Access the testing interface at: `http://localhost:5000/mcp-test.html`

This page provides interactive testing for all 4 widgets:
1. **Fund List Widget** - Carousel of fund cards
2. **Fund Card Widget** - Detailed single fund view
3. **Comparison Table Widget** - Side-by-side comparison
4. **Performance Chart Widget** - NAV history visualization

### Widget 1: rmf-fund-list.html
**Test Cases:**
- ✓ Load with sample data (3 funds)
- ✓ Test empty state (no funds)
- ✓ Test error state (invalid data)
- ✓ Pagination controls work
- ✓ Theme detection works

### Widget 2: rmf-fund-card.html
**Test Cases:**
- ✓ Load fund without benchmark
- ✓ Load fund with benchmark
- ✓ Performance grid displays correctly
- ✓ Risk badge shows correct level
- ✓ All data-testid attributes present

### Widget 3: rmf-comparison-table.html
**Test Cases:**
- ✓ Compare 2 funds
- ✓ Compare 5 funds
- ✓ Sticky headers work on scroll
- ✓ Best values highlighted
- ✓ Category sections display correctly

### Widget 4: rmf-performance-chart.html
**Test Cases:**
- ✓ Load 7-day history
- ✓ Load 30-day history
- ✓ Chart renders correctly
- ✓ Tooltips show on hover
- ✓ Statistics calculate correctly

---

## Golden Prompts

These prompts demonstrate the system's capabilities when used with ChatGPT:

### Prompt 1: Discovery
```
Show me the top 10 performing Thai RMF funds this year
```
**Expected:** Uses `get_rmf_fund_performance` with period="ytd", displays fund-list widget

### Prompt 2: Search & Filter
```
Find equity RMF funds with risk level 6 or higher that have gained more than 20% YTD
```
**Expected:** Uses `search_rmf_funds` with filters, displays fund-list widget

### Prompt 3: Detailed Analysis
```
Tell me everything about DAOL-GOLDRMF fund
```
**Expected:** Uses `get_rmf_fund_detail`, displays fund-card widget with full details

### Prompt 4: Comparison
```
Compare DAOL-GOLDRMF with ABAPAC-RMF and SCBRMFIXED
```
**Expected:** Uses `compare_rmf_funds`, displays comparison-table widget

### Prompt 5: Historical Performance
```
Show me the NAV history of DAOL-GOLDRMF for the last 30 days
```
**Expected:** Uses `get_rmf_fund_nav_history`, displays performance-chart widget

### Prompt 6: Complex Query
```
Which low-risk RMF funds (level 3 or below) have the best 1-year performance?
```
**Expected:** Uses `get_rmf_fund_performance` with riskLevel filter, displays ranked list

### Prompt 7: Benchmark Analysis
```
Show me funds that are outperforming their benchmark this year
```
**Expected:** Uses `get_rmf_fund_performance` or `search_rmf_funds`, filters by outperformance

---

## Integration Flow

### End-to-End Flow
1. **User asks question in ChatGPT**
   - Example: "Show me top performing RMF funds"

2. **ChatGPT selects appropriate MCP tool**
   - Tool: `get_rmf_fund_performance`
   - Arguments: `{period: "ytd", limit: 10}`

3. **MCP server processes request**
   - Validates input with Zod schema
   - Calls RMFDataService methods
   - Returns structured JSON response

4. **ChatGPT renders HTML widget**
   - Loads appropriate widget HTML
   - Injects data via `window.openai.toolOutput`
   - Widget renders with theme detection

5. **User sees interactive visualization**
   - Fund carousel with navigation
   - Formatted numbers and percentages
   - Color-coded performance indicators

### Widget Data Binding Pattern
All widgets follow this pattern:
```javascript
window.addEventListener('load', () => {
  window.openai.matchTheme();
  const data = window.openai.toolOutput.structuredContent();
  renderWidget(data);
});
```

### Error Handling Flow
1. Invalid input → Zod validation error → User-friendly message
2. Fund not found → 404 response → Error state in widget
3. No data available → Empty state in widget
4. Network error → Error state with retry option

---

## Performance Benchmarks

### Tool Response Times (Expected)
- `get_rmf_funds`: < 100ms (in-memory cache)
- `search_rmf_funds`: < 150ms (filtered search)
- `get_rmf_fund_detail`: < 50ms (direct lookup)
- `get_rmf_fund_performance`: < 200ms (sorting + ranking)
- `get_rmf_fund_nav_history`: < 100ms (JSON file read + cache)
- `compare_rmf_funds`: < 150ms (multiple lookups)

### Widget Bundle Sizes
- rmf-fund-list.html: ~22KB
- rmf-fund-card.html: ~18KB
- rmf-comparison-table.html: ~19KB
- rmf-performance-chart.html: ~17KB
- shared/styles.css: ~4KB
- shared/utils.js: ~3KB

**Total:** ~83KB (well under 100KB target)

---

## Validation Checklist

### MCP Server
- [ ] All 6 tools registered and callable
- [ ] Zod validation working for all inputs
- [ ] Error responses properly formatted
- [ ] Response structure matches expected format
- [ ] Benchmark fields correctly mapped
- [ ] NAV history fields correctly mapped

### Widgets
- [ ] All widgets load without errors
- [ ] Theme detection works (light/dark)
- [ ] Data binding works correctly
- [ ] All data-testid attributes present
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Responsive design works on mobile

### Integration
- [ ] MCP Inspector recognizes all tools
- [ ] ChatGPT can call all tools successfully
- [ ] Widgets render in ChatGPT interface
- [ ] User interactions work (pagination, hover, etc.)
- [ ] No console errors in browser
- [ ] Performance meets benchmarks

---

## Troubleshooting

### Issue: Widget shows "Loading..." forever
**Solution:** Check browser console for data binding errors. Verify `window.openai.toolOutput.structuredContent()` returns valid data.

### Issue: Theme not detected
**Solution:** Ensure `window.openai.matchTheme()` is called before rendering. Check that CSS variables are defined in styles.css.

### Issue: MCP tool returns error
**Solution:** Validate input against Zod schema. Check server logs for detailed error messages.

### Issue: Chart not rendering
**Solution:** Verify NAV history data has valid dates and numeric values. Check that SVG viewBox is set correctly.

### Issue: Comparison table empty
**Solution:** Ensure compareBy parameter matches expected values (all, performance, risk, fees). Check that funds array is not empty.

---

## Next Steps

1. **Run all test commands** - Verify each MCP tool returns expected data
2. **Test all widgets** - Use mcp-test.html to validate widget rendering
3. **Try golden prompts** - Test end-to-end flow with ChatGPT (if available)
4. **Performance profiling** - Measure response times and optimize if needed
5. **Documentation** - Update README with deployment instructions
