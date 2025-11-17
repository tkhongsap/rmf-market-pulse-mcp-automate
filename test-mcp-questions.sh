#!/bin/bash

MCP_URL="http://localhost:5000/mcp"

echo "========================================="
echo "QUESTION 1: Which low-risk RMF funds from SCB have performed best over the past year?"
echo "========================================="
curl -s -X POST "$MCP_URL" -H "Content-Type: application/json" -H "Accept: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"search_rmf_funds\",\"arguments\":{\"amc\":\"SCB\",\"max_risk\":3,\"question\":\"Which low-risk RMF funds from SCB have performed best over the past year?\"}}}" | jq -r '.result.content[0].text'
echo ""

echo "========================================="
echo "QUESTION 2: I want to invest 100,000 baht in an equity RMF with good 3-year returns"
echo "========================================="
curl -s -X POST "$MCP_URL" -H "Content-Type: application/json" -H "Accept: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"search_rmf_funds\",\"arguments\":{\"classification\":\"ตราสารทุน\",\"question\":\"I want to invest 100,000 baht in an equity RMF with good 3-year returns\"}}}" | jq -r '.result.content[0].text'
echo ""

echo "========================================="
echo "QUESTION 3: Compare the top 3 performing RMF funds year-to-date"
echo "========================================="
curl -s -X POST "$MCP_URL" -H "Content-Type: application/json" -H "Accept: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"get_rmf_fund_performance\",\"arguments\":{\"period\":\"ytd\",\"limit\":3,\"question\":\"Compare the top 3 performing RMF funds year-to-date\"}}}" | jq -r '.result.content[0].text'
echo ""

echo "========================================="
echo "QUESTION 4: Show me the NAV trend for KFRMF over the last 30 days"
echo "========================================="
curl -s -X POST "$MCP_URL" -H "Content-Type: application/json" -H "Accept: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":4,\"method\":\"tools/call\",\"params\":{\"name\":\"get_rmf_fund_nav_history\",\"arguments\":{\"symbol\":\"KFRMF\",\"question\":\"Show me the NAV trend for KFRMF over the last 30 days\"}}}" | jq -r '.result.content[0].text'
echo ""

echo "========================================="
echo "QUESTION 5: Which Kasikorn RMF funds have the lowest management fees?"
echo "========================================="
curl -s -X POST "$MCP_URL" -H "Content-Type: application/json" -H "Accept: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/call\",\"params\":{\"name\":\"search_rmf_funds\",\"arguments\":{\"amc\":\"Kasikorn\",\"question\":\"Which Kasikorn RMF funds have the lowest management fees?\"}}}" | jq -r '.result.content[0].text'
echo ""

echo "========================================="
echo "TEST COMPLETE"
echo "========================================="
