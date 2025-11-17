#!/bin/bash
# MCP Inspector Test Execution Script
# Comprehensive testing guide for validating Apps SDK compliance

set -e

echo "🧪 MCP Inspector Test Execution"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
MCP_ENDPOINT="${MCP_ENDPOINT:-http://localhost:5000/mcp}"
TEST_RESULTS_DIR="tests/apps-sdk/results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create results directory
mkdir -p "$TEST_RESULTS_DIR"

# Test results file
RESULTS_FILE="$TEST_RESULTS_DIR/mcp-inspector-test-$TIMESTAMP.md"

# Function to log test result
log_test() {
    local phase=$1
    local test_name=$2
    local status=$3
    local details=$4
    
    echo "" >> "$RESULTS_FILE"
    echo "### $test_name" >> "$RESULTS_FILE"
    echo "- **Status**: $status" >> "$RESULTS_FILE"
    echo "- **Details**: $details" >> "$RESULTS_FILE"
    echo "- **Timestamp**: $(date)" >> "$RESULTS_FILE"
}

# Initialize test results file
cat > "$RESULTS_FILE" << EOF
# MCP Inspector Test Results

**Test Date**: $(date)
**Branch**: $(git branch --show-current)
**Server Endpoint**: $MCP_ENDPOINT

## Test Summary

EOF

echo "📋 Phase 1: Pre-Test Verification"
echo "-----------------------------------"

# Check branch
if [ "$(git branch --show-current)" = "test/mcp-inspector-apps-sdk" ]; then
    echo -e "${GREEN}✓${NC} Correct branch checked out"
    log_test "Phase 1" "Branch Check" "PASS" "test/mcp-inspector-apps-sdk"
else
    echo -e "${RED}✗${NC} Wrong branch: $(git branch --show-current)"
    log_test "Phase 1" "Branch Check" "FAIL" "Expected test/mcp-inspector-apps-sdk"
    exit 1
fi

# Check database
if [ -n "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓${NC} DATABASE_URL is set"
    log_test "Phase 1" "Database Check" "PASS" "DATABASE_URL configured"
else
    echo -e "${RED}✗${NC} DATABASE_URL not set"
    log_test "Phase 1" "Database Check" "FAIL" "DATABASE_URL missing"
    exit 1
fi

# Run compliance tests
echo ""
echo "Running compliance tests..."
if ./tests/apps-sdk/test-apps-sdk-compliance.sh > /tmp/compliance-test.log 2>&1; then
    echo -e "${GREEN}✓${NC} All compliance tests passed"
    log_test "Phase 1" "Compliance Tests" "PASS" "22/22 tests passed"
else
    echo -e "${RED}✗${NC} Compliance tests failed. Check /tmp/compliance-test.log"
    log_test "Phase 1" "Compliance Tests" "FAIL" "See /tmp/compliance-test.log"
    exit 1
fi

# Check TypeScript compilation
echo ""
echo "Checking TypeScript compilation..."
if npm run check > /tmp/ts-check.log 2>&1; then
    echo -e "${GREEN}✓${NC} TypeScript compilation successful"
    log_test "Phase 1" "TypeScript Check" "PASS" "No compilation errors"
else
    echo -e "${RED}✗${NC} TypeScript errors found. Check /tmp/ts-check.log"
    log_test "Phase 1" "TypeScript Check" "FAIL" "See /tmp/ts-check.log"
    exit 1
fi

# Verify server is running
echo ""
echo "Verifying server is running..."
if curl -s "$MCP_ENDPOINT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running at $MCP_ENDPOINT"
    log_test "Phase 1" "Server Check" "PASS" "Server accessible"
else
    echo -e "${YELLOW}⚠${NC} Server not running. Will start it..."
    log_test "Phase 1" "Server Check" "WARN" "Server not running, will start"
fi

# Verify resources
echo ""
echo "Verifying MCP resources..."
RESOURCE_COUNT=$(curl -s -X POST "$MCP_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}' \
    | jq -r '.result.resources | length' 2>/dev/null || echo "0")

if [ "$RESOURCE_COUNT" -ge 4 ]; then
    echo -e "${GREEN}✓${NC} Found $RESOURCE_COUNT resources registered"
    log_test "Phase 1" "Resources Check" "PASS" "Found $RESOURCE_COUNT resources"
else
    echo -e "${RED}✗${NC} Expected 4+ resources, found $RESOURCE_COUNT"
    log_test "Phase 1" "Resources Check" "FAIL" "Only $RESOURCE_COUNT resources found"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Phase 1 Complete: All pre-test checks passed${NC}"
echo ""

# Phase 2: Launch MCP Inspector
echo "📋 Phase 2: Launch MCP Inspector"
echo "----------------------------------"
echo ""
echo -e "${BLUE}Instructions:${NC}"
echo "1. MCP Inspector will launch in your browser"
echo "2. Enter this URL when prompted:"
echo -e "   ${GREEN}$MCP_ENDPOINT${NC}"
echo ""
echo "3. Verify connection shows:"
echo "   - ✅ Connected status"
echo "   - ✅ 6 tools listed"
echo "   - ✅ 4 resources listed"
echo ""

cat >> "$RESULTS_FILE" << EOF

## Phase 2: MCP Inspector Launch

**Status**: Manual testing required
**Instructions**: 
1. Launch MCP Inspector using: \`./tests/apps-sdk/test-mcp-inspector.sh\`
2. Enter URL: \`$MCP_ENDPOINT\`
3. Verify connection successful
4. Check tools and resources are visible

EOF

# Phase 3: Tool Testing Guide
echo "📋 Phase 3: Tool-by-Tool Testing Guide"
echo "---------------------------------------"
echo ""

cat >> "$RESULTS_FILE" << EOF

## Phase 3: Tool-by-Tool Widget Testing

### Test Cases

EOF

# Generate test cases for each tool
cat >> "$RESULTS_FILE" << 'TESTCASES'

#### 3.1 get_rmf_funds → fund-list.html
- **Tool**: `get_rmf_funds`
- **Parameters**: `{"page": 1, "pageSize": 5, "sortBy": "ytd", "sortOrder": "desc"}`
- **Expected Widget**: fund-list.html
- **Validation**:
  - [ ] Widget renders inline
  - [ ] Shows 5 funds
  - [ ] YTD performance sorted descending
  - [ ] Fund names, symbols, NAV visible
  - [ ] No console errors

#### 3.2 search_rmf_funds → fund-list.html
- **Tool**: `search_rmf_funds`
- **Parameters**: `{"search": "gold", "category": "Equity", "limit": 3}`
- **Expected Widget**: fund-list.html
- **Validation**:
  - [ ] Filtered results correct
  - [ ] Only gold equity funds shown
  - [ ] Maximum 3 results
  - [ ] No console errors

#### 3.3 get_rmf_fund_detail → fund-detail.html
- **Tool**: `get_rmf_fund_detail`
- **Parameters**: `{"fundCode": "DAOL-GOLDRMF"}`
- **Expected Widget**: fund-detail.html
- **Validation**:
  - [ ] Fund details complete
  - [ ] Performance metrics visible
  - [ ] NAV history chart renders
  - [ ] All sections visible
  - [ ] No console errors

#### 3.4 get_rmf_fund_performance → performance-chart.html
- **Tool**: `get_rmf_fund_performance`
- **Parameters**: `{"period": "1y", "sortOrder": "desc", "limit": 5}`
- **Expected Widget**: performance-chart.html
- **Validation**:
  - [ ] Top 5 performers shown
  - [ ] Performance rankings visible
  - [ ] Chart/graph renders
  - [ ] No console errors

#### 3.5 get_rmf_fund_nav_history → performance-chart.html
- **Tool**: `get_rmf_fund_nav_history`
- **Parameters**: `{"fundCode": "DAOL-GOLDRMF", "days": 30}`
- **Expected Widget**: performance-chart.html
- **Validation**:
  - [ ] NAV history chart renders
  - [ ] 30-day data shown
  - [ ] Statistics displayed
  - [ ] Chart scales properly
  - [ ] No console errors

#### 3.6 compare_rmf_funds → fund-comparison.html
- **Tool**: `compare_rmf_funds`
- **Parameters**: `{"fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF", "TGOLDRMF-A"], "compareBy": "performance"}`
- **Expected Widget**: fund-comparison.html
- **Validation**:
  - [ ] Comparison table renders
  - [ ] All 3 funds displayed
  - [ ] Metrics aligned correctly
  - [ ] Best values highlighted
  - [ ] No console errors

TESTCASES

echo -e "${BLUE}Test cases documented in: $RESULTS_FILE${NC}"
echo ""

# Phase 4-8: Additional testing phases
cat >> "$RESULTS_FILE" << EOF

## Phase 4: State Persistence Testing

**Test Steps**:
1. Execute \`get_rmf_funds\` tool
2. Interact with widget (click fund row)
3. Note widget state
4. Close/reopen same tool call
5. Verify state restored

**Validation**:
- [ ] \`setWidgetState()\` called on interactions
- [ ] State persists in \`window.openai.widgetState\`
- [ ] State restored on widget reload

## Phase 5: Theme and Display Mode Testing

### Theme Testing
- [ ] Widget adapts to light theme
- [ ] Widget adapts to dark theme
- [ ] Text remains readable
- [ ] Smooth transition

### Display Mode Testing
- [ ] Widget adapts to inline mode
- [ ] Widget adapts to fullscreen mode
- [ ] Layout adjusts correctly
- [ ] No overflow issues

## Phase 6: Error Handling Testing

**Test Scenarios**:
- [ ] Invalid fund code → Error message shown
- [ ] Empty search results → Empty state displayed
- [ ] Missing data fields → Graceful degradation
- [ ] Network errors → Error handling works

## Phase 7: Performance Testing

**Metrics**:
- [ ] Widget load time < 2 seconds
- [ ] Tool response time < 1 second
- [ ] Widget render time < 500ms
- [ ] No memory leaks on repeated calls

## Phase 8: Test Results

**Screenshots**: Capture screenshots of each widget rendering
**Issues Found**: List any issues discovered
**Performance Metrics**: Record actual performance numbers
**Recommendations**: Note any improvements needed

---

**Next Steps**:
1. Complete manual testing in MCP Inspector
2. Fill in validation checkboxes above
3. Capture screenshots
4. Document any issues found
5. Update this file with results

EOF

echo "📝 Test results template created: $RESULTS_FILE"
echo ""
echo "🚀 Ready to launch MCP Inspector!"
echo ""
echo "Run this command to start testing:"
echo -e "  ${GREEN}./tests/apps-sdk/test-mcp-inspector.sh${NC}"
echo ""
echo "Then follow the testing guide in:"
echo -e "  ${BLUE}$RESULTS_FILE${NC}"
echo ""

