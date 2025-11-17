#!/bin/bash

# Simple local bilingual test

echo "Test 1: Thai question"
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_rmf_fund_performance","arguments":{"period":"1y","limit":2,"question":"กองทุนที่ดีที่สุด"}}}' \
  | jq -r '.result.content[0].text'

echo ""
echo "---"
echo ""

echo "Test 2: English question"
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_rmf_fund_performance","arguments":{"period":"1y","limit":2,"question":"Best performing funds"}}}' \
  | jq -r '.result.content[0].text'

echo ""
echo "---"
echo ""

echo "Test 3: Search low risk - Thai"
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"search_rmf_funds","arguments":{"maxRiskLevel":3,"limit":2,"sortBy":"ytd","question":"กองทุนความเสี่ยงต่ำ"}}}' \
  | jq -r '.result.content[0].text'

echo ""
echo "---"
echo ""

echo "Test 4: Fund detail - Thai"
curl -s -X POST http://localhost:5000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_rmf_fund_detail","arguments":{"fundCode":"DAOL-GOLDRMF","question":"บอกข้อมูลกองทุน"}}}' \
  | jq -r '.result.content[0].text'
