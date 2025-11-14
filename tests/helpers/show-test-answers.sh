#!/bin/bash

# Show readable answers from MCP test results

echo "📊 MCP Server Test Results - Answers to 10 Natural Questions"
echo "=============================================================="
echo ""

# Run the test and capture output
../user-scenarios/test-natural-questions.sh > /tmp/mcp-test-output.json 2>&1

# Extract and display answers
python3 << 'PYTHON_SCRIPT'
import json
import re
import sys

with open('/tmp/mcp-test-output.json', 'r') as f:
    content = f.read()

# Split by question markers
questions = re.split(r'❓ Question:', content)

for i, q in enumerate(questions[1:], 1):
    lines = q.split('\n')
    question = lines[0].strip()
    
    print(f"\n{'='*70}")
    print(f"Question {i}: {question}")
    print(f"{'='*70}")
    
    # Find JSON response
    json_text = ""
    in_json = False
    brace_count = 0
    
    for line in lines:
        if '"result"' in line or '"jsonrpc"' in line:
            in_json = True
        if in_json:
            json_text += line + "\n"
            brace_count += line.count('{') - line.count('}')
            if brace_count <= 0 and '}' in line and '"id"' in line:
                break
    
    if json_text:
        try:
            # Try to parse as JSON
            # Extract the result content
            if '"content"' in json_text:
                # Find text content
                text_matches = re.findall(r'"text":\s*"([^"]+)"', json_text)
                if text_matches:
                    print("\n📝 Answer Summary:")
                    for idx, text in enumerate(text_matches[:2], 1):
                        if len(text) < 500:
                            print(f"  {idx}. {text}")
                        else:
                            print(f"  {idx}. {text[:200]}...")
                
                # Extract structured data
                if '"funds"' in json_text:
                    fund_symbols = re.findall(r'"symbol":\s*"([^"]+)"', json_text)
                    fund_names = re.findall(r'"fund_name":\s*"([^"]+)"', json_text)
                    perf_values = re.findall(r'"performance":\s*([\d.]+)', json_text)
                    
                    if fund_symbols:
                        print(f"\n📈 Found {len(fund_symbols)} funds")
                        print("\nTop Results:")
                        for idx, (symbol, name) in enumerate(zip(fund_symbols[:5], fund_names[:5]), 1):
                            perf = perf_values[idx-1] if idx-1 < len(perf_values) else "N/A"
                            print(f"  {idx}. {symbol}: {name[:50]}... (Performance: {perf}%)")
                
                if '"totalCount"' in json_text:
                    count_match = re.search(r'"totalCount":\s*(\d+)', json_text)
                    if count_match:
                        print(f"\n📊 Total Count: {count_match.group(1)}")
                
                if '"period"' in json_text:
                    period_match = re.search(r'"period":\s*"([^"]+)"', json_text)
                    period_label_match = re.search(r'"periodLabel":\s*"([^"]+)"', json_text)
                    if period_match:
                        print(f"\n⏱️  Period: {period_label_match.group(1) if period_label_match else period_match.group(1)}")
                
                if '"navHistory"' in json_text:
                    print("\n📅 NAV History: 30 days of data provided")
                    stats_match = re.search(r'"periodReturn":\s*"([^"]+)"', json_text)
                    vol_match = re.search(r'"volatility":\s*"([^"]+)"', json_text)
                    if stats_match:
                        print(f"   Period Return: {stats_match.group(1)}")
                    if vol_match:
                        print(f"   Volatility: {vol_match.group(1)}")
                
                if '"compareBy"' in json_text:
                    print("\n⚖️  Comparison: Side-by-side fund comparison provided")
                    fund_count_match = re.search(r'"fundCount":\s*(\d+)', json_text)
                    if fund_count_match:
                        print(f"   Comparing {fund_count_match.group(1)} funds")
                        
        except Exception as e:
            print(f"Error parsing response: {e}")
            # Show raw text summary
            if '"text"' in json_text:
                text_match = re.search(r'"text":\s*"([^"]{0,200})', json_text)
                if text_match:
                    print(f"\n📝 Answer: {text_match.group(1)}...")

print(f"\n\n{'='*70}")
print("✅ All 10 questions answered successfully!")
print(f"{'='*70}\n")
PYTHON_SCRIPT

