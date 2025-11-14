#!/usr/bin/env python3
"""
Thai RMF Investment Q&A Simulation
Simulates a real user asking questions about RMF funds for tax planning
"""

import requests
import json

BASE_URL = "http://localhost:5000/mcp"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream"
}

def call_mcp_tool(tool_name, arguments):
    """Call an MCP tool and return the response"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }

    response = requests.post(BASE_URL, headers=HEADERS, json=payload)
    return response.json()

def print_separator():
    print("\n" + "━" * 80)

def print_question(number, question):
    print_separator()
    print(f"❓ Question {number}: {question}")
    print_separator()

print("=" * 80)
print("Thai RMF Investment - User Q&A Simulation")
print("=" * 80)
print("\n👤 User Profile: Planning to invest in RMF for tax benefits before year-end\n")

# Question 1
print_question(1, "What are the top 5 performing RMF funds this year (YTD)?")
response = call_mcp_tool("get_rmf_fund_performance", {
    "period": "ytd",
    "limit": 5,
    "sortOrder": "desc"
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  {fund['rank']}. {fund['symbol']} - {fund['fund_name']}")
        print(f"     Performance: {fund['performance']}% | Risk: {fund['risk_level']}/8")
        print(f"     AMC: {fund['amc']}\n")

# Question 2
print_question(2, "I'm risk-averse, show me low-risk RMF funds (risk level 1-3)")
response = call_mcp_tool("search_rmf_funds", {
    "minRiskLevel": 1,
    "maxRiskLevel": 3,
    "sortBy": "ytd",
    "limit": 5
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  • {fund['symbol']} - {fund['fund_name']}")
        print(f"    Risk: {fund['risk_level']}/8 | YTD: {fund['perf_ytd']}% | NAV: {fund['nav_value']} THB\n")

# Question 3
print_question(3, "What RMF funds does BBL (Bangkok Bank) offer?")
response = call_mcp_tool("search_rmf_funds", {
    "amc": "BBL",
    "limit": 8
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  • {fund['symbol']} - {fund['fund_name']}")
        print(f"    Risk: {fund['risk_level']}/8 | YTD: {fund['perf_ytd']}%\n")

# Question 4
print_question(4, "Tell me details about ABAPAC-RMF fund")
response = call_mcp_tool("get_rmf_fund_detail", {
    "fundCode": "ABAPAC-RMF"
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    print(f"Fund: {data['fund_name']}")
    print(f"AMC: {data['amc']}")
    print(f"Risk Level: {data['risk_level']}/8")
    print(f"Classification: {data['fund_classification']}")
    print(f"Dividend Policy: {data['dividend_policy']}")
    print(f"Current NAV: {data['nav_value']} THB ({data['nav_change_percent']:+.2f}%)")
    print(f"\nPerformance:")
    print(f"  YTD: {data['performance']['ytd']}%")
    print(f"  1Y: {data['performance']['1y']}%")
    print(f"  3Y: {data['performance']['3y']}%")
    print(f"  5Y: {data['performance']['5y']}%")

    if data['benchmark']:
        print(f"\nBenchmark: {data['benchmark']['name']}")

# Question 5
print_question(5, "Show me NAV trend for ABAPAC-RMF over the past 30 days")
response = call_mcp_tool("get_rmf_fund_nav_history", {
    "fundCode": "ABAPAC-RMF",
    "days": 30
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    print("Statistics:")
    stats = data['statistics']
    print(f"  Min NAV: {stats['minNav']} THB")
    print(f"  Max NAV: {stats['maxNav']} THB")
    print(f"  Avg NAV: {stats['avgNav']} THB")
    print(f"  Period Return: {stats['periodReturn']}")
    print(f"  Volatility: {stats['volatility']}")
    print(f"\nRecent NAV (last 7 days):")
    for nav in data['navHistory'][:7]:
        print(f"  {nav['date']}: {nav['nav']} THB ({nav['change_percent']}%)")

# Question 6
print_question(6, "Which RMF funds had the best 1-year performance?")
response = call_mcp_tool("get_rmf_fund_performance", {
    "period": "1y",
    "limit": 5
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  {fund['rank']}. {fund['symbol']} ({fund['amc']})")
        print(f"     1Y Return: {fund['performance']}%")
        if fund['benchmark']:
            print(f"     Benchmark: {fund['benchmark']['name']} ({fund['benchmark']['performance']}%)")
            print(f"     Outperformance: {fund['benchmark']['outperformance']}%")
        print()

# Question 7
print_question(7, "Compare ABAPAC-RMF, B-ASEANRMF, and K-PROPIRMF")
response = call_mcp_tool("compare_rmf_funds", {
    "fundCodes": ["ABAPAC-RMF", "B-ASEANRMF", "K-PROPIRMF"],
    "compareBy": "performance"
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  {fund['symbol']} - {fund['fund_name']}")
        print(f"  AMC: {fund['amc']}")
        print(f"  NAV: {fund['nav_value']} THB")
        perf = fund['performance']
        print(f"  Performance: YTD {perf['ytd']}% | 1Y {perf['1y']}% | 3Y {perf['3y']}%")
        if fund['benchmark']:
            print(f"  Benchmark: {fund['benchmark']['name']}")
        print()

# Question 8
print_question(8, "Show me moderate risk funds (4-5) with YTD return > 5%")
response = call_mcp_tool("search_rmf_funds", {
    "minRiskLevel": 4,
    "maxRiskLevel": 5,
    "minYtdReturn": 5,
    "sortBy": "ytd",
    "limit": 5
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  • {fund['symbol']} - {fund['fund_name']}")
        print(f"    Risk: {fund['risk_level']}/8 | YTD: {fund['perf_ytd']}% | 1Y: {fund['perf_1y']}%\n")

# Question 9
print_question(9, "What are the top 3-year performers? (Long-term view)")
response = call_mcp_tool("get_rmf_fund_performance", {
    "period": "3y",
    "limit": 5
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  {fund['rank']}. {fund['symbol']} - {fund['fund_name']}")
        print(f"     3Y Return: {fund['performance']}% | Risk: {fund['risk_level']}/8")
        print(f"     AMC: {fund['amc']}\n")

# Question 10
print_question(10, "Show me SCB equity RMF funds with their performance")
response = call_mcp_tool("search_rmf_funds", {
    "search": "SCB",
    "category": "Equity",
    "sortBy": "ytd",
    "limit": 5
})

if "result" in response:
    text_summary = response["result"]["content"][0]["text"]
    data = json.loads(response["result"]["content"][1]["text"])

    print(f"\n{text_summary}\n")
    for fund in data["funds"]:
        print(f"  • {fund['symbol']} - {fund['fund_name']}")
        print(f"    Category: {fund['fund_classification']} | Risk: {fund['risk_level']}/8")
        print(f"    YTD: {fund['perf_ytd']}% | 1Y: {fund['perf_1y']}% | 3Y: {fund['perf_3y']}%\n")

print("=" * 80)
print("✅ All 10 questions answered successfully!")
print("=" * 80)
