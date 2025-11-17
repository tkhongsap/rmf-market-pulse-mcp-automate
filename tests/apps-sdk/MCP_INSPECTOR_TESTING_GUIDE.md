# MCP Inspector Testing Guide

Quick reference guide for testing OpenAI Apps SDK compliance with MCP Inspector.

## Quick Start

```bash
# 1. Run pre-test verification
./tests/apps-sdk/test-mcp-inspector-execution.sh

# 2. Launch MCP Inspector
./tests/apps-sdk/test-mcp-inspector.sh
```

## Testing Checklist

### Phase 1: Pre-Test ✅ (Automated)
- [x] Branch checked out
- [x] Database accessible
- [x] Compliance tests pass
- [x] TypeScript compiles
- [x] Server running
- [x] 4 resources registered

### Phase 2: MCP Inspector Connection
- [ ] MCP Inspector opens in browser
- [ ] Enter URL: `http://localhost:5000/mcp`
- [ ] Connection successful
- [ ] 6 tools visible
- [ ] 4 resources visible

### Phase 3: Tool Testing

#### Test 1: get_rmf_funds
```
Tool: get_rmf_funds
Parameters: {"page": 1, "pageSize": 5, "sortBy": "ytd", "sortOrder": "desc"}
Expected: fund-list.html widget
```
- [ ] Widget renders
- [ ] Shows 5 funds
- [ ] Sorted by YTD descending
- [ ] Data displays correctly
- [ ] No console errors

#### Test 2: search_rmf_funds
```
Tool: search_rmf_funds
Parameters: {"search": "gold", "category": "Equity", "limit": 3}
Expected: fund-list.html widget
```
- [ ] Widget renders
- [ ] Filtered results correct
- [ ] Only gold equity funds
- [ ] Max 3 results
- [ ] No console errors

#### Test 3: get_rmf_fund_detail
```
Tool: get_rmf_fund_detail
Parameters: {"fundCode": "DAOL-GOLDRMF"}
Expected: fund-detail.html widget
```
- [ ] Widget renders
- [ ] Fund details complete
- [ ] Performance metrics visible
- [ ] NAV history chart renders
- [ ] No console errors

#### Test 4: get_rmf_fund_performance
```
Tool: get_rmf_fund_performance
Parameters: {"period": "1y", "sortOrder": "desc", "limit": 5}
Expected: performance-chart.html widget
```
- [ ] Widget renders
- [ ] Top 5 performers shown
- [ ] Rankings visible
- [ ] Chart/graph renders
- [ ] No console errors

#### Test 5: get_rmf_fund_nav_history
```
Tool: get_rmf_fund_nav_history
Parameters: {"fundCode": "DAOL-GOLDRMF", "days": 30}
Expected: performance-chart.html widget
```
- [ ] Widget renders
- [ ] NAV history chart visible
- [ ] 30-day data shown
- [ ] Statistics displayed
- [ ] No console errors

#### Test 6: compare_rmf_funds
```
Tool: compare_rmf_funds
Parameters: {"fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF", "TGOLDRMF-A"], "compareBy": "performance"}
Expected: fund-comparison.html widget
```
- [ ] Widget renders
- [ ] Comparison table visible
- [ ] All 3 funds displayed
- [ ] Metrics aligned
- [ ] Best values highlighted
- [ ] No console errors

### Phase 4: State Persistence
- [ ] Click fund row in fund-list widget
- [ ] Close/reopen tool call
- [ ] Selected fund persists
- [ ] State restored correctly

### Phase 5: Theme & Display Mode
- [ ] Switch to dark theme → Widget adapts
- [ ] Switch to light theme → Widget adapts
- [ ] Request fullscreen → Widget adapts
- [ ] Return to inline → Widget adapts

### Phase 6: Error Handling
- [ ] Invalid fund code → Error message
- [ ] Empty search → Empty state
- [ ] Missing data → Graceful degradation

### Phase 7: Performance
- [ ] Widget load < 2s
- [ ] Tool response < 1s
- [ ] Widget render < 500ms
- [ ] No memory leaks

## Browser Console Checks

Open browser DevTools (F12) and verify:
- [ ] No JavaScript errors
- [ ] No CSP violations
- [ ] No CORS errors
- [ ] `window.openai` object available
- [ ] Widget state updates logged

## Screenshots

Capture screenshots of:
1. Each widget rendering correctly
2. Theme switching (light/dark)
3. Display mode changes
4. Error states
5. State persistence demonstration

## Test Results

Document results in: `tests/apps-sdk/results/mcp-inspector-test-*.md`

## Troubleshooting

### Server Not Running
```bash
npm run dev
```

### MCP Inspector Won't Connect
- Verify server: `curl http://localhost:5000/mcp`
- Check URL is correct
- Verify CORS headers

### Widgets Don't Render
- Check browser console for errors
- Verify resources registered: `curl -X POST http://localhost:5000/mcp -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}' | jq`
- Verify `_meta['openai/outputTemplate']` matches resource URI

## Success Criteria

✅ All 6 tools execute successfully
✅ All 4 widgets render correctly
✅ State persists across sessions
✅ Theme switching works
✅ Display modes work
✅ No console errors
✅ Performance acceptable

---

**Ready to test?** Run: `./tests/apps-sdk/test-mcp-inspector.sh`

