#!/bin/bash

# Check if performance data exists in the production database

PROD_URL="https://alfie-app-tkhongsap.replit.app/mcp"

echo "Checking if performance data exists in production..."
echo ""

# Get a few funds and check their performance data
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_funds",
    "arguments": {
      "page": 1,
      "pageSize": 3
    }
  }
}')

echo "Sample fund performance data:"
echo "$response" | jq -r '.result.content[1].text' | jq '.funds[0:3] | .[] | {symbol, return_ytd: .performance.returnYtd, return_1y: .performance.return1y, return_3y: .performance.return3y}'
