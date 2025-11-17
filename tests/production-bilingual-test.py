#!/usr/bin/env python3
"""
Production Bilingual Test
Tests production MCP server with 5 English + 5 Thai questions
Shows question-answer pairs clearly
"""

import requests
import json

PROD_URL = "https://alfie-app-tkhongsap.replit.app/mcp"

colors = {
    'blue': '\033[0;34m',
    'green': '\033[0;32m',
    'yellow': '\033[1;33m',
    'cyan': '\033[0;36m',
    'magenta': '\033[0;35m',
    'reset': '\033[0m'
}

def call_mcp(tool, args):
    """Call MCP tool and return response"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool,
            "arguments": args
        }
    }

    try:
        response = requests.post(PROD_URL, json=payload, timeout=10)
        response.raise_for_status()
        result = response.json()

        if "result" in result and "content" in result["result"]:
            if len(result["result"]["content"]) > 0:
                return result["result"]["content"][0].get("text", "No text in response")

        return f"Unexpected response: {json.dumps(result, indent=2)}"
    except Exception as e:
        return f"ERROR: {str(e)}"

def has_thai(text):
    """Check if text contains Thai characters"""
    return any('\u0E00' <= char <= '\u0E7F' for char in text)

def print_qa(num, lang, question, answer):
    """Print question-answer pair"""
    print(f"\n{colors['yellow']}{'═' * 70}{colors['reset']}")
    print(f"{colors['yellow']}Question {num} ({lang}):{colors['reset']} {question}")
    print(f"\n{colors['green']}Answer:{colors['reset']}")

    # Show first 5 lines of answer
    lines = answer.split('\n')
    for i, line in enumerate(lines[:5]):
        print(f"  {line}")

    if len(lines) > 5:
        print(f"  ... [{len(lines) - 5} more lines]")

    # Check for Thai
    if has_thai(answer):
        print(f"\n{colors['magenta']}✓ Contains Thai characters{colors['reset']}")
    else:
        print(f"\n{colors['cyan']}○ English only{colors['reset']}")

# Header
print(f"\n{colors['blue']}╔{'═' * 68}╗{colors['reset']}")
print(f"{colors['blue']}║{'PRODUCTION MCP SERVER - BILINGUAL TEST':^68}║{colors['reset']}")
print(f"{colors['blue']}║{'5 English Questions + 5 Thai Questions':^68}║{colors['reset']}")
print(f"{colors['blue']}╚{'═' * 68}╝{colors['reset']}\n")

print(f"{colors['cyan']}Production URL:{colors['reset']} {PROD_URL}\n")

# ENGLISH QUESTIONS
print(f"\n{colors['blue']}{'═' * 70}{colors['reset']}")
print(f"{colors['blue']}{'ENGLISH QUESTIONS (5)':^70}{colors['reset']}")
print(f"{colors['blue']}{'═' * 70}{colors['reset']}")

# Q1: Top YTD performers
answer = call_mcp("get_rmf_fund_performance", {
    "period": "ytd",
    "limit": 5,
    "question": "What are the top 5 RMF funds this year?"
})
print_qa(1, "English", "What are the top 5 RMF funds this year?", answer)

# Q2: Low risk search
answer = call_mcp("search_rmf_funds", {
    "maxRiskLevel": 3,
    "sortBy": "ytd",
    "limit": 5,
    "question": "Show me low risk RMF funds with good returns"
})
print_qa(2, "English", "Show me low risk RMF funds with good returns", answer)

# Q3: Fund details
answer = call_mcp("get_rmf_fund_detail", {
    "fundCode": "DAOL-GOLDRMF",
    "question": "Tell me about DAOL-GOLDRMF fund"
})
print_qa(3, "English", "Tell me about DAOL-GOLDRMF fund", answer)

# Q4: Compare funds
answer = call_mcp("compare_rmf_funds", {
    "fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF"],
    "question": "Compare the top 2 performing funds"
})
print_qa(4, "English", "Compare the top 2 performing funds", answer)

# Q5: NAV history
answer = call_mcp("get_rmf_fund_nav_history", {
    "fundCode": "ASP-DIGIBLOCRMF",
    "days": 30,
    "question": "Show me 30-day NAV history for ASP-DIGIBLOCRMF"
})
print_qa(5, "English", "Show me 30-day NAV history for ASP-DIGIBLOCRMF", answer)

# THAI QUESTIONS
print(f"\n\n{colors['blue']}{'═' * 70}{colors['reset']}")
print(f"{colors['blue']}{'THAI QUESTIONS (5)':^70}{colors['reset']}")
print(f"{colors['blue']}{'═' * 70}{colors['reset']}")

# Q6: Top YTD performers (Thai)
answer = call_mcp("get_rmf_fund_performance", {
    "period": "ytd",
    "limit": 5,
    "question": "กองทุน RMF ที่ดีที่สุดในปีนี้ 5 อันดับแรก"
})
print_qa(6, "Thai", "กองทุน RMF ที่ดีที่สุดในปีนี้ 5 อันดับแรก", answer)

# Q7: Low risk search (Thai)
answer = call_mcp("search_rmf_funds", {
    "maxRiskLevel": 3,
    "sortBy": "ytd",
    "limit": 5,
    "question": "แสดงกองทุน RMF ความเสี่ยงต่ำที่มีผลตอบแทนดี"
})
print_qa(7, "Thai", "แสดงกองทุน RMF ความเสี่ยงต่ำที่มีผลตอบแทนดี", answer)

# Q8: Fund details (Thai)
answer = call_mcp("get_rmf_fund_detail", {
    "fundCode": "DAOL-GOLDRMF",
    "question": "บอกข้อมูลกองทุน DAOL-GOLDRMF"
})
print_qa(8, "Thai", "บอกข้อมูลกองทุน DAOL-GOLDRMF", answer)

# Q9: Compare funds (Thai)
answer = call_mcp("compare_rmf_funds", {
    "fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF"],
    "question": "เปรียบเทียบกองทุน 2 อันดับแรก"
})
print_qa(9, "Thai", "เปรียบเทียบกองทุน 2 อันดับแรก", answer)

# Q10: NAV history (Thai)
answer = call_mcp("get_rmf_fund_nav_history", {
    "fundCode": "ASP-DIGIBLOCRMF",
    "days": 30,
    "question": "แสดงประวัติราคา NAV 30 วันของ ASP-DIGIBLOCRMF"
})
print_qa(10, "Thai", "แสดงประวัติราคา NAV 30 วันของ ASP-DIGIBLOCRMF", answer)

# Summary
print(f"\n\n{colors['blue']}╔{'═' * 68}╗{colors['reset']}")
print(f"{colors['blue']}║{'TEST COMPLETE':^68}║{colors['reset']}")
print(f"{colors['blue']}╚{'═' * 68}╝{colors['reset']}\n")

print(f"{colors['cyan']}📊 Summary:{colors['reset']}")
print("   • Tested 10 questions total (5 English + 5 Thai)")
print("   • All 5 main MCP tools tested")
print(f"   • Production server: {PROD_URL}\n")

print(f"{colors['yellow']}⚠️  Note:{colors['reset']}")
print("   The bilingual code has NOT been deployed to production yet.")
print("   Current production server will respond in English only.")
print("   After deployment, Thai questions should get Thai responses.\n")
