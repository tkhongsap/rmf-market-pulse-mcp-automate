#!/bin/bash

# Production MCP Server Test Script
# Tests all 6 MCP tools against production database
# Usage: ./tests/production-mcp-test.sh

# Continue on errors to run all tests
set +e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production endpoint
PROD_URL="https://alfie-app-tkhongsap.replit.app/mcp"

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Production MCP Server Test Suite${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""
echo -e "Production URL: ${YELLOW}${PROD_URL}${NC}"
echo ""

# Helper function to run a test
run_test() {
    local test_name=$1
    local json_payload=$2
    local expected_pattern=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}Test $TOTAL_TESTS: ${test_name}${NC}"
    echo -e "${YELLOW}Request:${NC}"
    echo "$json_payload" | jq '.' 2>/dev/null || echo "$json_payload"
    echo ""

    # Run curl and capture response
    response=$(curl -s -X POST "$PROD_URL" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d "$json_payload" 2>&1)

    # Check if response contains error
    if echo "$response" | grep -qi "error\|fail\|exception"; then
        echo -e "${RED}✗ FAILED${NC}"
        echo -e "${RED}Response:${NC}"
        echo "$response" | head -20
        echo ""
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi

    # Check if response contains expected pattern
    if [ -n "$expected_pattern" ]; then
        if echo "$response" | grep -qi "$expected_pattern"; then
            echo -e "${GREEN}✓ PASSED${NC}"
            echo -e "${GREEN}Response Preview:${NC}"
            echo "$response" | jq '.result.content[0].text' 2>/dev/null | head -10 || echo "$response" | head -10
            echo ""
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            echo -e "${RED}✗ FAILED - Expected pattern not found${NC}"
            echo -e "${RED}Response:${NC}"
            echo "$response" | head -20
            echo ""
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    fi

    # Default: if no error and got response, consider it passed
    echo -e "${GREEN}✓ PASSED${NC}"
    echo -e "${GREEN}Response Preview:${NC}"
    echo "$response" | jq '.' 2>/dev/null | head -15 || echo "$response" | head -15
    echo ""
    PASSED_TESTS=$((PASSED_TESTS + 1))
    return 0
}

# Test 0: Check server health
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Pre-Test: Server Health Check${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

health_response=$(curl -s "https://alfie-app-tkhongsap.replit.app/healthz" 2>&1)
if echo "$health_response" | grep -qi "ok\|healthy\|up"; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
    echo "Response: $health_response"
else
    echo -e "${RED}✗ Server health check failed${NC}"
    echo "Response: $health_response"
fi
echo ""

# Test 0.5: List available tools
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Pre-Test: List Available MCP Tools${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

run_test "List MCP Tools" \
'{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "tools/list"
}' \
"get_rmf_funds"

echo ""

# Test 1: get_rmf_funds - Get top 10 funds by YTD return
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Tool 1: get_rmf_funds${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

run_test "Get top 10 RMF funds sorted by YTD return" \
'{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_funds",
    "arguments": {
      "page": 1,
      "pageSize": 10,
      "sortBy": "ytd",
      "sortOrder": "desc"
    }
  }
}' \
"RMF funds"

echo ""

# Test 2: search_rmf_funds - Search for funds
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Tool 2: search_rmf_funds${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

run_test "Search for funds with moderate risk (4-6)" \
'{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_rmf_funds",
    "arguments": {
      "minRiskLevel": 4,
      "maxRiskLevel": 6,
      "limit": 5,
      "sortBy": "ytd",
      "sortOrder": "desc"
    }
  }
}' \
"found"

echo ""

# Test 3: get_rmf_fund_detail - Get fund details
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Tool 3: get_rmf_fund_detail${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

run_test "Get detailed information for a specific fund" \
'{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_detail",
    "arguments": {
      "fundCode": "ABAPAC-RMF"
    }
  }
}' \
"ABAPAC-RMF"

echo ""

# Test 4: get_rmf_fund_performance - Top performers
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Tool 4: get_rmf_fund_performance${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

run_test "Get top 5 performers over 1 year" \
'{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_performance",
    "arguments": {
      "period": "1y",
      "limit": 5,
      "sortOrder": "desc"
    }
  }
}' \
"Top.*performers"

echo ""

# Test 5: get_rmf_fund_nav_history - NAV history
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Tool 5: get_rmf_fund_nav_history${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

run_test "Get 30-day NAV history for a fund" \
'{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_nav_history",
    "arguments": {
      "fundCode": "ABAPAC-RMF",
      "days": 30
    }
  }
}' \
"NAV.*history"

echo ""

# Test 6: compare_rmf_funds - Compare funds
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Tool 6: compare_rmf_funds${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

run_test "Compare two RMF funds side-by-side" \
'{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "compare_rmf_funds",
    "arguments": {
      "fundCodes": ["ABAPAC-RMF", "K-PROPIRMF"],
      "compareBy": "all"
    }
  }
}' \
"compar"

echo ""

# Final Summary
echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""
echo -e "Total Tests: ${YELLOW}${TOTAL_TESTS}${NC}"
echo -e "Passed: ${GREEN}${PASSED_TESTS}${NC}"
echo -e "Failed: ${RED}${FAILED_TESTS}${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
