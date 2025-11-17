#!/usr/bin/env python3
"""
Bilingual MCP Server Test
Tests all 6 MCP tools with English and Thai questions
"""

import requests
import json
import sys
import time

def call_mcp_tool(url, tool_name, arguments):
    """Call an MCP tool and return the text response"""
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }

    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        result = response.json()

        if "result" in result and "content" in result["result"]:
            if len(result["result"]["content"]) > 0:
                return result["result"]["content"][0].get("text", "No text in response")

        return f"Unexpected response format: {json.dumps(result, indent=2)}"

    except Exception as e:
        return f"ERROR: {str(e)}"

def has_thai_chars(text):
    """Check if text contains Thai characters"""
    if not text:
        return False
    return any('\u0E00' <= char <= '\u0E7F' for char in text)

def main():
    server_url = "http://localhost:5000/mcp"

    # Wait for server to be ready
    print("Waiting for server to be ready...")
    for i in range(20):
        try:
            requests.get("http://localhost:5000/", timeout=2)
            print("Server is ready!")
            break
        except:
            time.sleep(1)
            if i == 19:
                print("Server never became ready!")
                sys.exit(1)

    print("\n" + "=" * 60)
    print("BILINGUAL MCP SERVER TEST")
    print("Testing all 6 tools with English and Thai questions")
    print("=" * 60 + "\n")

    tests = [
        {
            "name": "Test 1: get_rmf_fund_performance",
            "tool": "get_rmf_fund_performance",
            "english": {
                "question": "Show me the best 1-year performers",
                "args": {"period": "1y", "limit": 3, "question": "Show me the best 1-year performers"}
            },
            "thai": {
                "question": "แสดงกองทุนที่มีผลตอบแทนดีที่สุดในช่วง 1 ปี",
                "args": {"period": "1y", "limit": 3, "question": "แสดงกองทุนที่มีผลตอบแทนดีที่สุดในช่วง 1 ปี"}
            }
        },
        {
            "name": "Test 2: search_rmf_funds",
            "tool": "search_rmf_funds",
            "english": {
                "question": "Find low risk RMF funds",
                "args": {"maxRiskLevel": 3, "limit": 3, "sortBy": "ytd", "question": "Find low risk RMF funds"}
            },
            "thai": {
                "question": "ค้นหากองทุน RMF ที่มีความเสี่ยงต่ำ",
                "args": {"maxRiskLevel": 3, "limit": 3, "sortBy": "ytd", "question": "ค้นหากองทุน RMF ที่มีความเสี่ยงต่ำ"}
            }
        },
        {
            "name": "Test 3: get_rmf_fund_detail",
            "tool": "get_rmf_fund_detail",
            "english": {
                "question": "Tell me about DAOL-GOLDRMF",
                "args": {"fundCode": "DAOL-GOLDRMF", "question": "Tell me about DAOL-GOLDRMF"}
            },
            "thai": {
                "question": "บอกข้อมูลกองทุน DAOL-GOLDRMF",
                "args": {"fundCode": "DAOL-GOLDRMF", "question": "บอกข้อมูลกองทุน DAOL-GOLDRMF"}
            }
        },
        {
            "name": "Test 4: get_rmf_funds",
            "tool": "get_rmf_funds",
            "english": {
                "question": "Show me the first page of RMF funds",
                "args": {"page": 1, "limit": 3, "question": "Show me the first page of RMF funds"}
            },
            "thai": {
                "question": "แสดงกองทุน RMF หน้าแรก",
                "args": {"page": 1, "limit": 3, "question": "แสดงกองทุน RMF หน้าแรก"}
            }
        },
        {
            "name": "Test 5: get_rmf_fund_nav_history",
            "tool": "get_rmf_fund_nav_history",
            "english": {
                "question": "Show NAV history for ASP-DIGIBLOCRMF",
                "args": {"fundCode": "ASP-DIGIBLOCRMF", "days": 30, "question": "Show NAV history for ASP-DIGIBLOCRMF"}
            },
            "thai": {
                "question": "แสดงประวัติราคา NAV ของ ASP-DIGIBLOCRMF",
                "args": {"fundCode": "ASP-DIGIBLOCRMF", "days": 30, "question": "แสดงประวัติราคา NAV ของ ASP-DIGIBLOCRMF"}
            }
        },
        {
            "name": "Test 6: compare_rmf_funds",
            "tool": "compare_rmf_funds",
            "english": {
                "question": "Compare DAOL-GOLDRMF with ASP-DIGIBLOCRMF",
                "args": {"fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF"], "question": "Compare DAOL-GOLDRMF with ASP-DIGIBLOCRMF"}
            },
            "thai": {
                "question": "เปรียบเทียบ DAOL-GOLDRMF กับ ASP-DIGIBLOCRMF",
                "args": {"fundCodes": ["DAOL-GOLDRMF", "ASP-DIGIBLOCRMF"], "question": "เปรียบเทียบ DAOL-GOLDRMF กับ ASP-DIGIBLOCRMF"}
            }
        }
    ]

    for test in tests:
        print(f"\n{'=' * 60}")
        print(f"{test['name']}")
        print(f"{'=' * 60}\n")

        # English test
        print(f"📝 English Question: \"{test['english']['question']}\"")
        en_response = call_mcp_tool(server_url, test['tool'], test['english']['args'])
        print(f"🔤 English Response:")
        print(en_response[:200] if len(en_response) > 200 else en_response)
        if len(en_response) > 200:
            print("[... truncated ...]")

        has_thai_en = has_thai_chars(en_response)
        if has_thai_en:
            print("❌ WARNING: Thai characters found in English response!")
        else:
            print("✅ Correctly responded in English")

        print()

        # Thai test
        print(f"📝 Thai Question: \"{test['thai']['question']}\"")
        th_response = call_mcp_tool(server_url, test['tool'], test['thai']['args'])
        print(f"🔤 Thai Response:")
        print(th_response[:200] if len(th_response) > 200 else th_response)
        if len(th_response) > 200:
            print("[... truncated ...]")

        has_thai_th = has_thai_chars(th_response)
        if has_thai_th:
            print("✅ Correctly responded in Thai")
        else:
            print("❌ WARNING: No Thai characters found in Thai response!")

        print()

    print("\n" + "=" * 60)
    print("BILINGUAL TEST COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
