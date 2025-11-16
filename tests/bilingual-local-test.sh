#!/bin/bash

# Local Bilingual Test - Test against localhost:5000

set -e

SERVER_URL="http://localhost:5000/mcp"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Local Bilingual MCP Server Test${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Test 1: Default (no question parameter - should be English)
echo -e "${YELLOW}Test 1: Default (no question) - Should be English${NC}"
echo -e "${CYAN}Request: period=1y, limit=3, NO question parameter${NC}"
RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_performance",
      "arguments": {
        "period": "1y",
        "limit": 3
      }
    }
  }' | jq -r '.result.content[0].text')
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 2: English question
echo -e "${YELLOW}Test 2: English Question${NC}"
echo -e "${CYAN}Question: \"What are the best 1-year performers?\"${NC}"
RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_performance",
      "arguments": {
        "period": "1y",
        "limit": 3,
        "question": "What are the best 1-year performers?"
      }
    }
  }' | jq -r '.result.content[0].text')
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE"
echo ""
echo "---"
echo ""

# Test 3: Thai question
echo -e "${YELLOW}Test 3: Thai Question${NC}"
echo -e "${CYAN}Question: \"กองทุน RMF ที่ให้ผลตอบแทนดีที่สุดในช่วง 1 ปี\"${NC}"
RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_performance",
      "arguments": {
        "period": "1y",
        "limit": 3,
        "question": "กองทุน RMF ที่ให้ผลตอบแทนดีที่สุดในช่วง 1 ปี"
      }
    }
  }' | jq -r '.result.content[0].text')
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE"

# Check if response contains Thai characters
if echo "$RESPONSE" | grep -q '[ก-๙]'; then
  echo -e "${GREEN}✅ Thai characters detected in response!${NC}"
else
  echo -e "${RED}❌ No Thai characters in response (should be Thai)${NC}"
fi
echo ""
echo "---"
echo ""

# Test 4: Search with Thai question
echo -e "${YELLOW}Test 4: Search with Thai Question${NC}"
echo -e "${CYAN}Question: \"ค้นหากองทุน RMF ที่มีความเสี่ยงต่ำ\"${NC}"
RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "search_rmf_funds",
      "arguments": {
        "maxRiskLevel": 3,
        "limit": 3,
        "sortBy": "ytd",
        "question": "ค้นหากองทุน RMF ที่มีความเสี่ยงต่ำ"
      }
    }
  }' | jq -r '.result.content[0].text')
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE"

# Check if response contains Thai characters
if echo "$RESPONSE" | grep -q '[ก-๙]'; then
  echo -e "${GREEN}✅ Thai characters detected in response!${NC}"
else
  echo -e "${RED}❌ No Thai characters in response (should be Thai)${NC}"
fi
echo ""
echo "---"
echo ""

# Test 5: Fund detail with Thai question
echo -e "${YELLOW}Test 5: Fund Detail with Thai Question${NC}"
echo -e "${CYAN}Question: \"บอกข้อมูลกองทุน DAOL-GOLDRMF\"${NC}"
RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_detail",
      "arguments": {
        "fundCode": "DAOL-GOLDRMF",
        "question": "บอกข้อมูลกองทุน DAOL-GOLDRMF"
      }
    }
  }' | jq -r '.result.content[0].text')
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE"

# Check if response contains Thai characters
if echo "$RESPONSE" | grep -q '[ก-๙]'; then
  echo -e "${GREEN}✅ Thai characters detected in response!${NC}"
else
  echo -e "${RED}❌ No Thai characters in response (should be Thai)${NC}"
fi
echo ""
echo "---"
echo ""

# Test 6: Fund detail with English question
echo -e "${YELLOW}Test 6: Fund Detail with English Question${NC}"
echo -e "${CYAN}Question: \"Tell me about DAOL-GOLDRMF\"${NC}"
RESPONSE=$(curl -s -X POST "$SERVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "get_rmf_fund_detail",
      "arguments": {
        "fundCode": "DAOL-GOLDRMF",
        "question": "Tell me about DAOL-GOLDRMF"
      }
    }
  }' | jq -r '.result.content[0].text')
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE"

# Check if response contains Thai characters (should NOT)
if echo "$RESPONSE" | grep -q '[ก-๙]'; then
  echo -e "${RED}❌ Thai characters detected (should be English only)${NC}"
else
  echo -e "${GREEN}✅ No Thai characters (correct for English question)${NC}"
fi
echo ""

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}Test Complete!${NC}"
echo -e "${BLUE}=========================================${NC}"
