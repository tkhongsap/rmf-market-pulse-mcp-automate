#!/bin/bash

# Diagnose why performance data isn't showing up

PROD_URL="https://alfie-app-tkhongsap.replit.app/mcp"

echo "========================================="
echo "Diagnostic: Performance Data Issue"
echo "========================================="
echo ""

# Test 1: Get raw fund data
echo "Test 1: Getting raw fund data..."
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_funds",
    "arguments": {
      "page": 1,
      "pageSize": 1
    }
  }
}')

echo "Full response:"
echo "$response" | jq '.'
echo ""

# Test 2: Check performance field specifically
echo "Test 2: Checking performance fields..."
echo "$response" | jq -r '.result.content[1].text' 2>/dev/null | head -50
echo ""

# Test 3: Try get_rmf_fund_performance with different periods
echo "Test 3: Testing get_rmf_fund_performance with YTD..."
ytd_response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_performance",
    "arguments": {
      "period": "ytd",
      "limit": 5
    }
  }
}')

echo "YTD Performance response:"
echo "$ytd_response" | jq '.result.content[0].text'
echo ""
echo "$ytd_response" | jq '.result.content[1].text'
