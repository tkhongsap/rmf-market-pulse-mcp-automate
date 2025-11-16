#!/bin/bash

# 10 Real Questions Test for Production MCP Server
# Tests the server with actual user questions

PROD_URL="https://alfie-app-tkhongsap.replit.app/mcp"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}10 Questions Test - Production MCP Server${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Question 1
echo -e "${YELLOW}Question 1: What are the top 10 RMF funds this year?${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_performance",
      "arguments": {"period": "ytd", "limit": 10}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "Top 5 funds:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.topFunds[0:5] | .[] | "  \(.rank). \(.symbol): \(.performance)%"'
echo ""
echo "---"
echo ""

# Question 2
echo -e "${YELLOW}Question 2: Show me the best performing RMF funds over the last year${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_performance",
      "arguments": {"period": "1y", "limit": 5}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "Top funds:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.topFunds[] | "  \(.rank). \(.symbol): \(.performance)% (Risk: \(.risk))"'
echo ""
echo "---"
echo ""

# Question 3
echo -e "${YELLOW}Question 3: Which RMF funds are low risk?${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_rmf_funds",
      "arguments": {"maxRiskLevel": 3, "limit": 5, "sortBy": "ytd", "sortOrder": "desc"}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "Sample low-risk funds:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.funds[0:5] | .[] | "  - \(.proj_abbr_name): Risk \(.risk_spectrum), YTD: \(.return_ytd)%"'
echo ""
echo "---"
echo ""

# Question 4
echo -e "${YELLOW}Question 4: Tell me about DAOL-GOLDRMF fund${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_detail",
      "arguments": {"fundCode": "DAOL-GOLDRMF"}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo "---"
echo ""

# Question 5
echo -e "${YELLOW}Question 5: What's the NAV history for ASP-DIGIBLOCRMF?${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_nav_history",
      "arguments": {"fundCode": "ASP-DIGIBLOCRMF", "days": 30}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo "---"
echo ""

# Question 6
echo -e "${YELLOW}Question 6: Compare DAOL-GOLDRMF with ASP-DIGIBLOCRMF${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "compare_rmf_funds",
      "arguments": {"fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF"], "compareBy": "all"}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "Key comparison:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.comparison | "  YTD: \(.DAOL-GOLDRMF.performance.ytd)% vs \(.ASP-DIGIBLOCRMF.performance.ytd)%"'
echo "$response" | jq -r '.result.content[1].text' | jq -r '.comparison | "  1Y: \(.DAOL-GOLDRMF.performance.oneYear)% vs \(.ASP-DIGIBLOCRMF.performance.oneYear)%"'
echo ""
echo "---"
echo ""

# Question 7
echo -e "${YELLOW}Question 7: Show me equity RMF funds${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "search_rmf_funds",
      "arguments": {"category": "Equity", "limit": 5, "sortBy": "ytd", "sortOrder": "desc"}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "Top equity funds:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.funds[0:5] | .[] | "  - \(.proj_abbr_name): YTD \(.return_ytd)%, Risk: \(.risk_spectrum)"'
echo ""
echo "---"
echo ""

# Question 8
echo -e "${YELLOW}Question 8: Which funds from SCB are available?${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "search_rmf_funds",
      "arguments": {"search": "SCB", "limit": 5}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "SCB funds:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.funds[0:5] | .[] | "  - \(.proj_abbr_name): \(.proj_name_en)"'
echo ""
echo "---"
echo ""

# Question 9
echo -e "${YELLOW}Question 9: What are the 3-year top performers?${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_performance",
      "arguments": {"period": "3y", "limit": 5}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "Top 3-year performers:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.topFunds[] | "  \(.rank). \(.symbol): \(.performance)%"'
echo ""
echo "---"
echo ""

# Question 10
echo -e "${YELLOW}Question 10: Show me high-risk RMF funds with good returns${NC}"
echo ""
response=$(curl -s -X POST "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 10,
    "method": "tools/call",
    "params": {
      "name": "search_rmf_funds",
      "arguments": {"minRiskLevel": 6, "limit": 5, "sortBy": "ytd", "sortOrder": "desc"}
    }
  }')
echo -e "${GREEN}Answer:${NC}"
echo "$response" | jq -r '.result.content[0].text'
echo ""
echo -e "High-risk funds with top returns:"
echo "$response" | jq -r '.result.content[1].text' | jq -r '.funds[0:5] | .[] | "  - \(.proj_abbr_name): YTD \(.return_ytd)%, Risk: \(.risk_spectrum)"'
echo ""
echo "---"
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
