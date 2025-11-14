#!/bin/bash

# Test MCP Server with Natural User Questions
# Tests various scenarios users might ask about RMF investing and tax incentives

SERVER_URL="http://localhost:5000/mcp"
REQUEST_ID=1

echo "🧪 Testing MCP Server with Natural User Questions"
echo "=================================================="
echo ""

# Helper function to make MCP tool call
call_mcp_tool() {
    local tool_name=$1
    local params=$2
    local question=$3
    
    echo "❓ Question: $question"
    echo "🔧 Tool: $tool_name"
    echo "📋 Parameters: $params"
    
    local response=$(curl -s -X POST "$SERVER_URL" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"id\": $REQUEST_ID,
            \"method\": \"tools/call\",
            \"params\": {
                \"name\": \"$tool_name\",
                \"arguments\": $params
            }
        }")
    
    echo "📤 Response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
    echo "---"
    echo ""
    
    REQUEST_ID=$((REQUEST_ID + 1))
}

# Question 1: What are the top performing RMF funds this year?
call_mcp_tool "get_rmf_fund_performance" \
    '{"period": "ytd", "limit": 5, "sortOrder": "desc"}' \
    "What are the top performing RMF funds this year?"

# Question 2: Show me low-risk RMF funds (risk level 1-3)
call_mcp_tool "search_rmf_funds" \
    '{"minRiskLevel": 1, "maxRiskLevel": 3, "limit": 10, "sortBy": "ytd", "sortOrder": "desc"}' \
    "Show me low-risk RMF funds suitable for conservative investors"

# Question 3: Find RMF funds from BBL (Bangkok Bank)
call_mcp_tool "search_rmf_funds" \
    '{"amc": "BBL", "limit": 10}' \
    "What RMF funds does Bangkok Bank (BBL) offer?"

# Question 4: What are the best performing funds over 5 years?
call_mcp_tool "get_rmf_fund_performance" \
    '{"period": "5y", "limit": 10, "sortOrder": "desc"}' \
    "What are the best performing RMF funds over the past 5 years?"

# Question 5: Get details about a specific fund
call_mcp_tool "get_rmf_fund_detail" \
    '{"fundCode": "ABAPAC-RMF"}' \
    "Tell me about the ABAPAC-RMF fund - what are its details and performance?"

# Question 6: Compare two popular funds
call_mcp_tool "compare_rmf_funds" \
    '{"fundCodes": ["ABAPAC-RMF", "K-PROPIRMF"], "compareBy": "all"}' \
    "Compare ABAPAC-RMF and K-PROPIRMF funds side by side"

# Question 7: Show me equity-focused RMF funds
call_mcp_tool "search_rmf_funds" \
    '{"category": "Equity", "limit": 15, "sortBy": "ytd", "sortOrder": "desc"}' \
    "What are the best performing equity-focused RMF funds?"

# Question 8: Find funds with good 1-year returns
call_mcp_tool "get_rmf_fund_performance" \
    '{"period": "1y", "limit": 10, "sortOrder": "desc"}' \
    "Which RMF funds have the best 1-year returns?"

# Question 9: Show NAV history for a fund
call_mcp_tool "get_rmf_fund_nav_history" \
    '{"fundCode": "ABAPAC-RMF", "days": 30}' \
    "Show me the NAV history for ABAPAC-RMF over the past 30 days"

# Question 10: Find moderate risk funds with good YTD performance
call_mcp_tool "search_rmf_funds" \
    '{"minRiskLevel": 4, "maxRiskLevel": 6, "minYtdReturn": 5, "limit": 10, "sortBy": "ytd", "sortOrder": "desc"}' \
    "Find moderate-risk RMF funds with at least 5% YTD returns"

echo "✅ Completed testing 10 natural user questions"
echo "=================================================="

