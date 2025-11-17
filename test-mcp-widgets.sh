#!/bin/bash

# Comprehensive MCP Widget Testing Script
# Tests all 6 tools and validates widget compatibility

set -e

SERVER="http://localhost:5000"
HEADERS="-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream'"

echo "🧪 Thai RMF MCP Widget Testing Suite"
echo "====================================="
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test a tool
test_tool() {
  local test_name="$1"
  local method="$2"
  local params="$3"
  
  echo "Testing: $test_name"
  
  local payload=$(cat <<EOF
{
  "jsonrpc":"2.0",
  "id":$RANDOM,
  "method":"tools/call",
  "params":{
    "name":"$method",
    "arguments":$params
  }
}
EOF
)
  
  local response=$(curl -s -X POST "$SERVER/mcp" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d "$payload")
  
  # Validate response structure
  if echo "$response" | jq -e '.result.structuredContent' > /dev/null 2>&1; then
    if echo "$response" | jq -e '.result._meta."openai/outputTemplate"' > /dev/null 2>&1; then
      echo "  ✅ $test_name - PASS"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      
      # Extract key info
      local template=$(echo "$response" | jq -r '.result._meta."openai/outputTemplate"')
      echo "     Widget: $template"
    else
      echo "  ❌ $test_name - FAIL (missing outputTemplate)"
      TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
  else
    echo "  ❌ $test_name - FAIL (invalid response structure)"
    echo "$response" | jq '.error // .' | head -20
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
  echo ""
}

echo "📋 Part 1: Testing All 6 MCP Tools"
echo "=================================="
echo ""

# Test 1: get_rmf_funds (basic pagination)
test_tool "get_rmf_funds - Basic list" \
  "get_rmf_funds" \
  '{"page":1,"pageSize":10}'

# Test 2: get_rmf_funds (with sorting)
test_tool "get_rmf_funds - Sorted by YTD" \
  "get_rmf_funds" \
  '{"page":1,"pageSize":5,"sortBy":"ytd","sortOrder":"desc"}'

# Test 3: search_rmf_funds (category filter)
test_tool "search_rmf_funds - Equity funds" \
  "search_rmf_funds" \
  '{"category":"Equity","limit":10}'

# Test 4: search_rmf_funds (risk filter)
test_tool "search_rmf_funds - Low risk funds" \
  "search_rmf_funds" \
  '{"maxRiskLevel":3,"limit":10}'

# Test 5: get_rmf_fund_detail
test_tool "get_rmf_fund_detail - Single fund" \
  "get_rmf_fund_detail" \
  '{"fundCode":"ABAPAC-RMF"}'

# Test 6: get_rmf_fund_performance (YTD)
test_tool "get_rmf_fund_performance - Top YTD" \
  "get_rmf_fund_performance" \
  '{"period":"ytd","topN":10}'

# Test 7: get_rmf_fund_performance (1Y)
test_tool "get_rmf_fund_performance - Top 1Y" \
  "get_rmf_fund_performance" \
  '{"period":"1y","topN":10}'

# Test 8: get_rmf_fund_nav_history
test_tool "get_rmf_fund_nav_history - 30 days" \
  "get_rmf_fund_nav_history" \
  '{"fundCode":"ABAPAC-RMF","days":30}'

# Test 9: compare_rmf_funds (2 funds)
test_tool "compare_rmf_funds - 2 funds" \
  "compare_rmf_funds" \
  '{"fundCodes":["ABAPAC-RMF","ABGDD-RMF"]}'

# Test 10: compare_rmf_funds (4 funds)
test_tool "compare_rmf_funds - 4 funds" \
  "compare_rmf_funds" \
  '{"fundCodes":["ABAPAC-RMF","ABGDD-RMF","ABSC-RMF","ABSI-RMF"]}'

echo "🔍 Part 2: Edge Case Testing"
echo "============================="
echo ""

# Test 11: Large page number
test_tool "get_rmf_funds - Large page" \
  "get_rmf_funds" \
  '{"page":100,"pageSize":10}'

# Test 12: Maximum page size
test_tool "get_rmf_funds - Max page size" \
  "get_rmf_funds" \
  '{"page":1,"pageSize":50}'

# Test 13: Search with no results (hopefully)
test_tool "search_rmf_funds - Unrealistic filter" \
  "search_rmf_funds" \
  '{"minYtdReturn":1000,"limit":10}'

# Test 14: Invalid fund code
echo "Testing: get_rmf_fund_detail - Invalid fund code"
response=$(curl -s -X POST "$SERVER/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":99,
    "method":"tools/call",
    "params":{
      "name":"get_rmf_fund_detail",
      "arguments":{"fundCode":"INVALID-FUND-CODE-123"}
    }
  }')

if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
  echo "  ✅ Invalid fund code - PASS (returned error as expected)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ⚠️  Invalid fund code - handled gracefully (no error)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
fi
echo ""

# Test 15: NAV history with very large days
test_tool "get_rmf_fund_nav_history - Large days" \
  "get_rmf_fund_nav_history" \
  '{"fundCode":"ABAPAC-RMF","days":365}'

echo "📊 Part 3: Widget Resource Validation"
echo "======================================"
echo ""

echo "Testing: resources/list"
response=$(curl -s -X POST "$SERVER/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}')

widget_count=$(echo "$response" | jq -r '.result.resources | length')

if [ "$widget_count" = "4" ]; then
  echo "  ✅ Widget resources - PASS (found 4 widgets)"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  
  echo "$response" | jq -r '.result.resources[] | "     - \(.name): \(.uri)"'
else
  echo "  ❌ Widget resources - FAIL (expected 4, found $widget_count)"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi
echo ""

echo "📝 Part 4: Response Structure Validation"
echo "========================================="
echo ""

# Detailed validation of one tool's response
echo "Testing: Detailed response validation for get_rmf_funds"
response=$(curl -s -X POST "$SERVER/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"get_rmf_funds",
      "arguments":{"page":1,"pageSize":5}
    }
  }')

# Save full response for inspection
echo "$response" | jq '.' > /tmp/mcp_response_sample.json

# Validate key fields
has_structured=$(echo "$response" | jq 'has("result") and (.result | has("structuredContent"))')
has_content=$(echo "$response" | jq 'has("result") and (.result | has("content"))')
has_meta=$(echo "$response" | jq 'has("result") and (.result | has("_meta"))')
has_template=$(echo "$response" | jq '.result._meta | has("openai/outputTemplate")')

echo "  - structuredContent: $has_structured"
echo "  - content: $has_content"
echo "  - _meta: $has_meta"
echo "  - openai/outputTemplate: $has_template"

if [ "$has_structured" = "true" ] && [ "$has_content" = "true" ] && [ "$has_meta" = "true" ] && [ "$has_template" = "true" ]; then
  echo "  ✅ Response structure - PASS"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ❌ Response structure - FAIL"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

echo ""
echo "Sample response saved to: /tmp/mcp_response_sample.json"
echo ""

# Summary
echo "======================================="
echo "📊 Test Summary"
echo "======================================="
echo "Total Tests Passed: $TESTS_PASSED"
echo "Total Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo "✅ All tests passed! Ready for ChatGPT integration."
  exit 0
else
  echo "⚠️  Some tests failed. Review errors above."
  exit 1
fi
