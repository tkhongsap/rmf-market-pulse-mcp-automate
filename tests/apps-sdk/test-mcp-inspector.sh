#!/bin/bash
# MCP Inspector Test Script
# Tests widget rendering in MCP Inspector for OpenAI Apps SDK compliance

set -e

echo "🔍 MCP Inspector Test for OpenAI Apps SDK"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
# Use production URL if available, otherwise localhost
MCP_ENDPOINT="${MCP_ENDPOINT:-https://alfie-app-tkhongsap.replit.app/mcp}"
LOCAL_ENDPOINT="http://localhost:5000/mcp"
SERVER_PID=""
USE_PRODUCTION=true

# Function to cleanup on exit
cleanup() {
    if [ -n "$SERVER_PID" ]; then
        echo ""
        echo -e "${YELLOW}Stopping server (PID: $SERVER_PID)...${NC}"
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
}
trap cleanup EXIT INT TERM

# Check if using production or local
if [ "$USE_PRODUCTION" = true ] && curl -s "$MCP_ENDPOINT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Using production server at $MCP_ENDPOINT"
    echo -e "${YELLOW}ℹ${NC} No local server needed - testing against production"
elif curl -s "$LOCAL_ENDPOINT" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Local server already running at $LOCAL_ENDPOINT"
    MCP_ENDPOINT="$LOCAL_ENDPOINT"
    USE_PRODUCTION=false
else
    echo "Starting local MCP server..."
    echo -e "${YELLOW}ℹ${NC} To use production instead, set: MCP_ENDPOINT=https://alfie-app-tkhongsap.replit.app/mcp"
    cd "$(dirname "$0")/../.."
    npm run dev > /tmp/mcp-server.log 2>&1 &
    SERVER_PID=$!
    MCP_ENDPOINT="$LOCAL_ENDPOINT"
    USE_PRODUCTION=false
    
    # Wait for server to start
    echo "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s "$MCP_ENDPOINT" > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} Server started (PID: $SERVER_PID)"
            break
        fi
        sleep 1
    done
    
    if [ $i -eq 30 ]; then
        echo "❌ Server failed to start. Check /tmp/mcp-server.log"
        exit 1
    fi
fi

# Verify resources are available
echo ""
echo "Verifying MCP resources..."
RESOURCE_COUNT=$(curl -s -X POST "$MCP_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"resources/list","params":{}}' \
    | jq -r '.result.resources | length' 2>/dev/null || echo "0")

if [ "$RESOURCE_COUNT" -ge 4 ]; then
    echo -e "${GREEN}✓${NC} Found $RESOURCE_COUNT resources registered"
else
    echo "❌ Expected 4+ resources, found $RESOURCE_COUNT"
    exit 1
fi

# Instructions for MCP Inspector
echo ""
echo "=========================================="
echo "📋 MCP Inspector Instructions"
echo "=========================================="
echo ""
echo "1. MCP Inspector will open in your browser"
echo "2. Enter this URL when prompted:"
echo "   ${GREEN}$MCP_ENDPOINT${NC}"
if [ "$USE_PRODUCTION" = true ]; then
    echo -e "   ${YELLOW}ℹ${NC} Using production server (no ngrok needed!)"
fi
echo ""
echo "3. Test each tool:"
echo "   - get_rmf_funds"
echo "   - search_rmf_funds"
echo "   - get_rmf_fund_detail"
echo "   - get_rmf_fund_performance"
echo "   - get_rmf_fund_nav_history"
echo "   - compare_rmf_funds"
echo ""
echo "4. Verify widgets render correctly:"
echo "   - Check that widgets display fund data"
echo "   - Verify theme switching works"
echo "   - Test widget state persistence"
echo ""
echo "5. Check browser console for errors"
echo ""
echo "Press Ctrl+C to stop the server when done testing"
echo ""

# Launch MCP Inspector
echo "Launching MCP Inspector..."
echo ""
npx --yes @modelcontextprotocol/inspector@latest "$MCP_ENDPOINT" || {
    echo ""
    echo "MCP Inspector not found. Installing..."
    npm install -g @modelcontextprotocol/inspector@latest
    npx @modelcontextprotocol/inspector@latest "$MCP_ENDPOINT"
}

