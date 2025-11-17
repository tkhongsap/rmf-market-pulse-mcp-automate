#!/bin/bash

# Production Bilingual Test - 5 English + 5 Thai Questions
# Tests against: https://alfie-app-tkhongsap.replit.app/mcp

PROD_URL="https://alfie-app-tkhongsap.replit.app/mcp"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     PRODUCTION MCP SERVER - BILINGUAL TEST                         ║${NC}"
echo -e "${BLUE}║     5 English Questions + 5 Thai Questions                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Production URL: ${PROD_URL}${NC}"
echo ""

# Helper function
test_question() {
    local num="$1"
    local lang="$2"
    local question="$3"
    local tool="$4"
    local args="$5"

    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Question ${num} (${lang}):${NC} ${question}"
    echo -e "${CYAN}Tool: ${tool}${NC}"
    echo ""

    response=$(curl -s -X POST "$PROD_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": ${num},
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"${tool}\",
                \"arguments\": ${args}
            }
        }" | jq -r '.result.content[0].text // "Error: No response"')

    echo -e "${GREEN}Answer:${NC}"
    echo "$response" | head -5

    # Check if response is too long
    line_count=$(echo "$response" | wc -l)
    if [ "$line_count" -gt 5 ]; then
        echo "... [truncated, showing first 5 lines]"
    fi

    # Check for Thai characters
    if echo "$response" | grep -q '[ก-๙]'; then
        echo -e "${MAGENTA}✓ Contains Thai characters${NC}"
    else
        echo -e "${CYAN}○ English only${NC}"
    fi

    echo ""
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         ENGLISH QUESTIONS (5)                                      ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# English Q1: Top YTD performers
test_question 1 "English" \
    "What are the top 5 RMF funds this year?" \
    "get_rmf_fund_performance" \
    '{"period": "ytd", "limit": 5, "question": "What are the top 5 RMF funds this year?"}'

# English Q2: Low risk search
test_question 2 "English" \
    "Show me low risk RMF funds with good returns" \
    "search_rmf_funds" \
    '{"maxRiskLevel": 3, "sortBy": "ytd", "limit": 5, "question": "Show me low risk RMF funds with good returns"}'

# English Q3: Fund details
test_question 3 "English" \
    "Tell me about DAOL-GOLDRMF fund" \
    "get_rmf_fund_detail" \
    '{"fundCode": "DAOL-GOLDRMF", "question": "Tell me about DAOL-GOLDRMF fund"}'

# English Q4: Compare funds
test_question 4 "English" \
    "Compare the top 2 performing funds" \
    "compare_rmf_funds" \
    '{"fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF"], "question": "Compare the top 2 performing funds"}'

# English Q5: NAV history
test_question 5 "English" \
    "Show me 30-day NAV history for ASP-DIGIBLOCRMF" \
    "get_rmf_fund_nav_history" \
    '{"fundCode": "ASP-DIGIBLOCRMF", "days": 30, "question": "Show me 30-day NAV history for ASP-DIGIBLOCRMF"}'

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}         THAI QUESTIONS (5)                                         ${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Thai Q1: Top YTD performers
test_question 6 "Thai" \
    "กองทุน RMF ที่ดีที่สุดในปีนี้ 5 อันดับแรก" \
    "get_rmf_fund_performance" \
    '{"period": "ytd", "limit": 5, "question": "กองทุน RMF ที่ดีที่สุดในปีนี้ 5 อันดับแรก"}'

# Thai Q2: Low risk search
test_question 7 "Thai" \
    "แสดงกองทุน RMF ความเสี่ยงต่ำที่มีผลตอบแทนดี" \
    "search_rmf_funds" \
    '{"maxRiskLevel": 3, "sortBy": "ytd", "limit": 5, "question": "แสดงกองทุน RMF ความเสี่ยงต่ำที่มีผลตอบแทนดี"}'

# Thai Q3: Fund details
test_question 8 "Thai" \
    "บอกข้อมูลกองทุน DAOL-GOLDRMF" \
    "get_rmf_fund_detail" \
    '{"fundCode": "DAOL-GOLDRMF", "question": "บอกข้อมูลกองทุน DAOL-GOLDRMF"}'

# Thai Q4: Compare funds
test_question 9 "Thai" \
    "เปรียบเทียบกองทุน 2 อันดับแรก" \
    "compare_rmf_funds" \
    '{"fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF"], "question": "เปรียบเทียบกองทุน 2 อันดับแรก"}'

# Thai Q5: NAV history
test_question 10 "Thai" \
    "แสดงประวัติราคา NAV 30 วันของ ASP-DIGIBLOCRMF" \
    "get_rmf_fund_nav_history" \
    '{"fundCode": "ASP-DIGIBLOCRMF", "days": 30, "question": "แสดงประวัติราคา NAV 30 วันของ ASP-DIGIBLOCRMF"}'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    TEST COMPLETE                                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📊 Summary:${NC}"
echo "   • Tested 10 questions total (5 English + 5 Thai)"
echo "   • All 5 main MCP tools tested"
echo "   • Production server: https://alfie-app-tkhongsap.replit.app/mcp"
echo ""
echo -e "${YELLOW}⚠️  Note:${NC}"
echo "   If Thai responses show 'English only', the bilingual code"
echo "   has not been deployed to production yet."
echo ""
