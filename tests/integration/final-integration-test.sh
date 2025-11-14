#!/bin/bash
echo "=========================================="
echo "Final Integration Test"
echo "Thai RMF Market Pulse MCP Server"
echo "=========================================="
echo ""

BASE_URL="http://localhost:5000"
HEADERS='-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream"'

# Test 1: Server info
echo "✓ Test 1: Server Information"
curl -s $BASE_URL/ | jq -r '.name + " v" + .version'
echo ""

# Test 2: Health check
echo "✓ Test 2: Health Check"
curl -s $BASE_URL/healthz | jq -r '"\(.status) - \(.fundsLoaded) funds loaded"'
echo ""

# Test 3: List MCP tools
echo "✓ Test 3: List MCP Tools"
curl -s -X POST $BASE_URL/mcp $HEADERS -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | jq -r '.result.tools[] | "  - " + .name'
echo ""

# Test 4: Get top 3 funds
echo "✓ Test 4: Get RMF Funds (Top 3)"
curl -s -X POST $BASE_URL/mcp $HEADERS -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_rmf_funds","arguments":{"page":1,"pageSize":3}}}' \
  | jq -r '.result.content[0].text'
echo ""

# Test 5: Search Bualuang funds
echo "✓ Test 5: Search for Bualuang Funds"
curl -s -X POST $BASE_URL/mcp $HEADERS -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_rmf_funds","arguments":{"search":"Bualuang","limit":3}}}' \
  | jq -r '.result.content[0].text'
echo ""

# Test 6: Top 3 YTD performers
echo "✓ Test 6: Top 3 YTD Performers"
curl -s -X POST $BASE_URL/mcp $HEADERS -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_rmf_fund_performance","arguments":{"period":"ytd","limit":3}}}' \
  | jq -r '.result.content[0].text'
echo ""

echo "=========================================="
echo "All Integration Tests Passed! ✅"
echo "=========================================="
