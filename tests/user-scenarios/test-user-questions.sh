#!/bin/bash

echo "==========================================="
echo "Thai RMF Investment - User Q&A Simulation"
echo "==========================================="
echo ""
echo "👤 User Profile: Planning to invest in RMF for tax benefits before year-end"
echo ""

BASE_URL="http://localhost:5000"
HEADERS='-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream"'

# Question 1: What are the top performing RMF funds this year?
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 1: What are the top 5 performing RMF funds this year (YTD)?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_performance",
    "arguments": {
      "period": "ytd",
      "limit": 5,
      "sortOrder": "desc"
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.funds[] | "  \(.rank). \(.symbol) - \(.fund_name)\n     Performance: \(.performance)% (Risk: \(.risk_level)/8)\n     AMC: \(.amc)"'
echo ""

# Question 2: I'm risk-averse, show me low-risk RMF options
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 2: I'm risk-averse, show me low-risk RMF funds (risk level 1-3)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_rmf_funds",
    "arguments": {
      "minRiskLevel": 1,
      "maxRiskLevel": 3,
      "sortBy": "ytd",
      "limit": 5
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.funds[] | "  • \(.symbol) - \(.fund_name)\n    Risk: \(.risk_level)/8 | YTD: \(.perf_ytd)% | NAV: \(.nav_value) THB"'
echo ""

# Question 3: What funds does BBL (Bangkok Bank) offer?
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 3: What RMF funds does BBL (Bangkok Bank) offer?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "search_rmf_funds",
    "arguments": {
      "amc": "BBL",
      "limit": 10
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[0].text'
echo ""
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.funds[] | "  • \(.symbol) - \(.fund_name)\n    Risk: \(.risk_level)/8 | YTD: \(.perf_ytd)%"'
echo ""

# Question 4: Tell me details about ABAPAC-RMF fund
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 4: Tell me details about ABAPAC-RMF fund"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_detail",
    "arguments": {
      "fundCode": "ABAPAC-RMF"
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[0].text'
echo ""
echo "Key Information:"
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '"  Fund: \(.fund_name)\n  AMC: \(.amc)\n  Risk Level: \(.risk_level)/8\n  Classification: \(.fund_classification)\n  Dividend Policy: \(.dividend_policy)\n  Current NAV: \(.nav_value) THB (\(.nav_change_percent)%)\n  \nPerformance:\n  YTD: \(.performance.ytd)%\n  1Y: \(.performance."1y")%\n  3Y: \(.performance."3y")%\n  5Y: \(.performance."5y")%"'
echo ""

# Question 5: Show me the NAV history for the past 30 days
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 5: Show me NAV trend for ABAPAC-RMF over the past 30 days"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
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
}')
echo "$RESPONSE" | jq -r '.result.content[0].text'
echo ""
echo "Statistics:"
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.statistics | "  Min NAV: \(.minNav) THB\n  Max NAV: \(.maxNav) THB\n  Avg NAV: \(.avgNav) THB\n  Period Return: \(.periodReturn)\n  Volatility: \(.volatility)"'
echo ""

# Question 6: Which RMF funds have the best 1-year performance?
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 6: Which RMF funds had the best 1-year performance?"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_performance",
    "arguments": {
      "period": "1y",
      "limit": 5
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.funds[] | "  \(.rank). \(.symbol) (\(.amc))\n     1Y Return: \(.performance)%\n     Benchmark: \(.benchmark.name) (\(.benchmark.performance)%)\n     Outperformance: \(.benchmark.outperformance)%"'
echo ""

# Question 7: Compare 3 popular funds
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 7: Compare ABAPAC-RMF, B-ASEANRMF, and K-PROPIRMF"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "compare_rmf_funds",
    "arguments": {
      "fundCodes": ["ABAPAC-RMF", "B-ASEANRMF", "K-PROPIRMF"],
      "compareBy": "performance"
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[0].text'
echo ""
for i in 0 1 2; do
  echo "$RESPONSE" | jq -r ".result.content[1].text" | jq -r ".funds[$i] | \"  \(.symbol) - \(.fund_name)\n  AMC: \(.amc)\n  NAV: \(.nav_value) THB\n  Performance: YTD \(.performance.ytd)% | 1Y \(.performance.\"1y\")% | 3Y \(.performance.\"3y\")%\n  Benchmark: \(.benchmark.name)\""
  echo ""
done

# Question 8: Show me moderate risk funds with good YTD returns
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 8: Show me moderate risk funds (4-5) with YTD return > 5%"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "search_rmf_funds",
    "arguments": {
      "minRiskLevel": 4,
      "maxRiskLevel": 5,
      "minYtdReturn": 5,
      "sortBy": "ytd",
      "limit": 5
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[0].text'
echo ""
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.funds[] | "  • \(.symbol) - \(.fund_name)\n    Risk: \(.risk_level)/8 | YTD: \(.perf_ytd)% | 1Y: \(.perf_1y)%"'
echo ""

# Question 9: What are the top 3-year performers for long-term investment?
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 9: What are the top 3-year performers? (Long-term view)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "get_rmf_fund_performance",
    "arguments": {
      "period": "3y",
      "limit": 5
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.funds[] | "  \(.rank). \(.symbol) - \(.fund_name)\n     3Y Return: \(.performance)% | Risk: \(.risk_level)/8\n     AMC: \(.amc)"'
echo ""

# Question 10: Search for SCB (Siam Commercial Bank) equity funds
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "❓ Question 10: Show me SCB equity RMF funds with their performance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -X POST $BASE_URL/mcp $HEADERS -d '{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "search_rmf_funds",
    "arguments": {
      "search": "SCB",
      "category": "Equity",
      "sortBy": "ytd",
      "limit": 5
    }
  }
}')
echo "$RESPONSE" | jq -r '.result.content[0].text'
echo ""
echo "$RESPONSE" | jq -r '.result.content[1].text' | jq -r '.funds[] | "  • \(.symbol) - \(.fund_name)\n    Category: \(.fund_classification) | Risk: \(.risk_level)/8\n    YTD: \(.perf_ytd)% | 1Y: \(.perf_1y)% | 3Y: \(.perf_3y)%"'
echo ""

echo "==========================================="
echo "✅ All 10 questions answered successfully!"
echo "==========================================="
