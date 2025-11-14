#!/bin/bash
# Test MCP Server via HTTP

echo "Testing Thai RMF Market Pulse MCP Server"
echo "=========================================="
echo ""

# Test 1: List tools
echo "Test 1: List available tools"
curl -s -X POST http://localhost:5001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }' | jq '.result.tools[] | {name: .name, description: .description}'

echo ""
echo "Test 2: Get RMF funds (page 1, limit 3)"
curl -s -X POST http://localhost:5001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_funds",
      "arguments": {
        "page": 1,
        "pageSize": 3
      }
    }
  }' | jq '.result.content[0].text'

echo ""
echo "Test 3: Search for Bualuang funds"
curl -s -X POST http://localhost:5001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_rmf_funds",
      "arguments": {
        "search": "Bualuang",
        "limit": 2
      }
    }
  }' | jq '.result.content[0].text'

echo ""
echo "=========================================="
echo "All tests completed!"
