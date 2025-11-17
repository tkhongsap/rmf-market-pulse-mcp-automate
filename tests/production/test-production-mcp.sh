#!/bin/bash

# Test Production MCP Server with 5 Natural Language Questions
# Tests the production server at https://alfie-app-tkhongsap.replit.app/mcp

SERVER_URL="https://alfie-app-tkhongsap.replit.app/mcp"
REQUEST_ID=1

echo "🧪 Testing Production MCP Server with 5 Natural Language Questions"
echo "=================================================================="
echo "Server: $SERVER_URL"
echo ""

# Helper function to make MCP tool call
call_mcp_tool() {
    local tool_name=$1
    local params=$2
    local question=$3
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "❓ Question: $question"
    echo "🔧 Tool: $tool_name"
    echo "📋 Parameters: $params"
    echo ""
    
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
    
    # Check if request was successful
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Failed to connect to server"
        echo ""
        REQUEST_ID=$((REQUEST_ID + 1))
        return 1
    fi
    
    # Check for JSON-RPC error
    local error=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', {}).get('message', ''))" 2>/dev/null)
    if [ -n "$error" ] && [ "$error" != "None" ]; then
        echo "❌ ERROR: $error"
        echo ""
        echo "📤 Full Response:"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        echo ""
        REQUEST_ID=$((REQUEST_ID + 1))
        return 1
    fi
    
    # Extract human-readable summary from content[0].text
    local summary=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'result' in data and 'content' in data['result']:
        if len(data['result']['content']) > 0 and 'text' in data['result']['content'][0]:
            print(data['result']['content'][0]['text'])
except:
    pass
" 2>/dev/null)
    
    # Extract JSON data from content[1].text if available
    local json_data=$(echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'result' in data and 'content' in data['result']:
        if len(data['result']['content']) > 1 and 'text' in data['result']['content'][1]:
            text = data['result']['content'][1]['text']
            # Try to parse as JSON
            parsed = json.loads(text)
            print(json.dumps(parsed, indent=2, ensure_ascii=False))
except:
    pass
" 2>/dev/null)
    
    echo "📤 Response Summary:"
    if [ -n "$summary" ]; then
        echo "$summary"
    else
        echo "(No summary available)"
    fi
    echo ""
    
    if [ -n "$json_data" ]; then
        echo "📊 Response Data:"
        echo "$json_data"
    else
        echo "📊 Full JSON-RPC Response:"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    fi
    
    echo ""
    echo ""
    
    REQUEST_ID=$((REQUEST_ID + 1))
}

# Question 1: Top performers
call_mcp_tool "get_rmf_fund_performance" \
    '{"period": "ytd", "limit": 5, "sortOrder": "desc"}' \
    "What are the top 5 performing RMF funds this year (YTD)?"

# Question 2: Low-risk search
call_mcp_tool "search_rmf_funds" \
    '{"minRiskLevel": 1, "maxRiskLevel": 3, "limit": 10, "sortBy": "ytd", "sortOrder": "desc"}' \
    "Show me low-risk RMF funds (risk level 1-3) with good returns"

# Question 3: Fund detail
call_mcp_tool "get_rmf_fund_detail" \
    '{"fundCode": "ABAPAC-RMF"}' \
    "Tell me about the ABAPAC-RMF fund - what are its details and performance?"

# Question 4: Fund comparison
call_mcp_tool "compare_rmf_funds" \
    '{"fundCodes": ["ABAPAC-RMF", "K-PROPIRMF"], "compareBy": "all"}' \
    "Compare ABAPAC-RMF and K-PROPIRMF funds side by side"

# Question 5: NAV history
call_mcp_tool "get_rmf_fund_nav_history" \
    '{"fundCode": "ABAPAC-RMF", "days": 30}' \
    "Show me the NAV history for ABAPAC-RMF over the past 30 days"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Completed testing 5 natural language questions"
echo "=================================================================="

