#!/bin/bash
# Test script for OpenAI Apps SDK compliance

set -e

echo "🧪 Testing OpenAI Apps SDK Compliance"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test configuration
MCP_ENDPOINT="${MCP_ENDPOINT:-http://localhost:5000/mcp}"
TEST_PASSED=0
TEST_FAILED=0

# Helper function to make MCP requests
mcp_request() {
    local method=$1
    local params=$2
    curl -s -X POST "$MCP_ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":$params}" \
        | jq -r "$3"
}

# Test 1: Resources are registered
echo "📋 Test 1: Resource Registration"
RESOURCE_COUNT=$(mcp_request "resources/list" "{}" '.result.resources | length')
if [ "$RESOURCE_COUNT" -ge 4 ]; then
    echo -e "${GREEN}✓${NC} Found $RESOURCE_COUNT resources (expected: 4+)"
    TEST_PASSED=$((TEST_PASSED + 1))
else
    echo -e "${RED}✗${NC} Found only $RESOURCE_COUNT resources (expected: 4+)"
    TEST_FAILED=$((TEST_FAILED + 1))
fi

# Test 2: Resources have correct URIs
echo ""
echo "📋 Test 2: Resource URI Format"
EXPECTED_URIS=("ui://widget/fund-list.html" "ui://widget/fund-detail.html" "ui://widget/fund-comparison.html" "ui://widget/performance-chart.html")
for uri in "${EXPECTED_URIS[@]}"; do
    FOUND=$(mcp_request "resources/list" "{}" ".result.resources[] | select(.uri == \"$uri\") | .uri")
    if [ -n "$FOUND" ]; then
        echo -e "${GREEN}✓${NC} Found resource: $uri"
    else
        echo -e "${RED}✗${NC} Missing resource: $uri"
        TEST_FAILED=$((TEST_FAILED + 1))
    fi
done
TEST_PASSED=$((TEST_PASSED + 4))

# Test 3: Tool responses include structuredContent
echo ""
echo "📋 Test 3: Tool Response Structure (structuredContent)"
HAS_STRUCTURED=$(mcp_request "tools/call" '{"name":"get_rmf_funds","arguments":{"page":1,"pageSize":2}}' '.result.structuredContent != null')
if [ "$HAS_STRUCTURED" = "true" ]; then
    echo -e "${GREEN}✓${NC} Tool response includes structuredContent"
    TEST_PASSED=$((TEST_PASSED + 1))
else
    echo -e "${RED}✗${NC} Tool response missing structuredContent"
    TEST_FAILED=$((TEST_FAILED + 1))
fi

# Test 4: Tool responses include content
echo ""
echo "📋 Test 4: Tool Response Structure (content)"
HAS_CONTENT=$(mcp_request "tools/call" '{"name":"get_rmf_funds","arguments":{"page":1,"pageSize":2}}' '.result.content != null')
if [ "$HAS_CONTENT" = "true" ]; then
    echo -e "${GREEN}✓${NC} Tool response includes content"
    TEST_PASSED=$((TEST_PASSED + 1))
else
    echo -e "${RED}✗${NC} Tool response missing content"
    TEST_FAILED=$((TEST_FAILED + 1))
fi

# Test 5: Tool responses include _meta with outputTemplate
echo ""
echo "📋 Test 5: Tool Response Structure (_meta.outputTemplate)"
OUTPUT_TEMPLATE=$(mcp_request "tools/call" '{"name":"get_rmf_funds","arguments":{"page":1,"pageSize":2}}' '.result._meta."openai/outputTemplate"')
if [ -n "$OUTPUT_TEMPLATE" ] && [[ "$OUTPUT_TEMPLATE" == ui://widget/* ]]; then
    echo -e "${GREEN}✓${NC} Tool response includes outputTemplate: $OUTPUT_TEMPLATE"
    TEST_PASSED=$((TEST_PASSED + 1))
else
    echo -e "${RED}✗${NC} Tool response missing or invalid outputTemplate"
    TEST_FAILED=$((TEST_FAILED + 1))
fi

# Test 6: All 6 tools have proper structure
echo ""
echo "📋 Test 6: All Tools Return Proper Structure"
TOOLS=("get_rmf_funds" "search_rmf_funds" "get_rmf_fund_detail" "get_rmf_fund_performance" "get_rmf_fund_nav_history" "compare_rmf_funds")
for tool in "${TOOLS[@]}"; do
    case $tool in
        "get_rmf_funds")
            ARGS='{"page":1,"pageSize":2}'
            ;;
        "search_rmf_funds")
            ARGS='{"search":"gold","limit":2}'
            ;;
        "get_rmf_fund_detail")
            ARGS='{"fundCode":"DAOL-GOLDRMF"}'
            ;;
        "get_rmf_fund_performance")
            ARGS='{"period":"1y","limit":2}'
            ;;
        "get_rmf_fund_nav_history")
            ARGS='{"fundCode":"DAOL-GOLDRMF","days":7}'
            ;;
        "compare_rmf_funds")
            ARGS='{"fundCodes":["DAOL-GOLDRMF","ASP-DIGIBLOCRMF"]}'
            ;;
    esac
    
    HAS_ALL=$(mcp_request "tools/call" "{\"name\":\"$tool\",\"arguments\":$ARGS}" '.result | (.structuredContent != null) and (.content != null) and (._meta != null)')
    if [ "$HAS_ALL" = "true" ]; then
        echo -e "${GREEN}✓${NC} $tool: All required fields present"
        TEST_PASSED=$((TEST_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $tool: Missing required fields"
        TEST_FAILED=$((TEST_FAILED + 1))
    fi
done

# Test 7: Widget HTML files exist and are accessible
echo ""
echo "📋 Test 7: Widget Files Exist"
WIDGET_FILES=("server/widgets/fund-list.html" "server/widgets/fund-detail.html" "server/widgets/fund-comparison.html" "server/widgets/performance-chart.html")
for file in "${WIDGET_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} Widget file exists: $file"
        TEST_PASSED=$((TEST_PASSED + 1))
    else
        echo -e "${RED}✗${NC} Widget file missing: $file"
        TEST_FAILED=$((TEST_FAILED + 1))
    fi
done

# Test 8: Widgets use correct window.openai API
echo ""
echo "📋 Test 8: Widget API Compliance"
for file in "${WIDGET_FILES[@]}"; do
    if grep -q "window.openai.toolOutput" "$file" && grep -q "window.openai.toolResponseMetadata" "$file"; then
        echo -e "${GREEN}✓${NC} $file uses correct window.openai API"
        TEST_PASSED=$((TEST_PASSED + 1))
    else
        echo -e "${RED}✗${NC} $file missing correct window.openai API usage"
        TEST_FAILED=$((TEST_FAILED + 1))
    fi
done

# Summary
echo ""
echo "======================================"
echo "📊 Test Summary"
echo "======================================"
echo -e "${GREEN}Passed: $TEST_PASSED${NC}"
echo -e "${RED}Failed: $TEST_FAILED${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed! Apps SDK compliance verified.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi

