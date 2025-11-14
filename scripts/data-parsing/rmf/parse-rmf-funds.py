#!/usr/bin/env python3
"""Parse RMF Fund data from markdown file and output to CSV and Markdown."""

import re
import csv
from pathlib import Path

def clean_text(text):
    """Remove extra whitespace and newlines from text."""
    # Replace <br>, <br/>, <br /> with space
    text = re.sub(r'<br\s*/?>', ' ', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_rmf_funds(file_path):
    """Parse RMF fund data from markdown file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    funds = []

    # Find all table rows
    # Pattern: Look for rows that contain fund codes (bold, underlined)
    # Fund codes typically end with -RMF or RMF

    # Split by <tr> tags
    rows = re.split(r'<tr>', content)

    for row in rows:
        # Look for fund symbol pattern: <b><u>SYMBOL</u></b>
        symbol_match = re.search(r'<b><u>([^<]+)</u></b>', row)

        if symbol_match:
            symbol = symbol_match.group(1).strip()

            # Extract all <td> content
            td_contents = re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)

            if len(td_contents) >= 7:
                # Skip the first td if it contains the symbol
                # Find which td contains the symbol
                symbol_idx = 0
                for idx, td in enumerate(td_contents):
                    if symbol in td:
                        symbol_idx = idx
                        break

                # Extract data based on position
                try:
                    fund_name = clean_text(td_contents[symbol_idx + 1])
                    amc = clean_text(td_contents[symbol_idx + 2])
                    classification = clean_text(td_contents[symbol_idx + 3])
                    mgmt_style = clean_text(td_contents[symbol_idx + 4])
                    dividend = clean_text(td_contents[symbol_idx + 5])
                    risk = clean_text(td_contents[symbol_idx + 6])
                    tax_allowance = clean_text(td_contents[symbol_idx + 7]) if len(td_contents) > symbol_idx + 7 else 'RMF'

                    # Only add if we have valid data
                    if fund_name and amc:
                        funds.append({
                            'Symbol': symbol,
                            'Fund Name': fund_name,
                            'AMC': amc,
                            'Fund Classification (AIMC)': classification,
                            'Management Style': mgmt_style,
                            'Dividend Policy': dividend,
                            'Risk': risk,
                            'Fund for tax allowance': tax_allowance
                        })
                except IndexError:
                    # Skip rows that don't have enough data
                    continue

    return funds

def write_csv(funds, output_path):
    """Write funds data to CSV file."""
    if not funds:
        print("No funds to write!")
        return

    fieldnames = [
        'Symbol',
        'Fund Name',
        'AMC',
        'Fund Classification (AIMC)',
        'Management Style',
        'Dividend Policy',
        'Risk',
        'Fund for tax allowance'
    ]

    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(funds)

    print(f"✓ CSV file written: {output_path} ({len(funds)} funds)")

def write_markdown(funds, output_path):
    """Write funds data to Markdown file."""
    if not funds:
        print("No funds to write!")
        return

    with open(output_path, 'w', encoding='utf-8') as f:
        # Write header
        f.write("# Thai RMF Funds Database\n\n")
        f.write(f"Complete list of {len(funds)} Thai Retirement Mutual Funds (RMF)\n\n")

        # Write table header
        f.write("| Symbol | Fund Name | AMC | Fund Classification (AIMC) | Management Style | Dividend Policy | Risk | Fund for tax allowance |\n")
        f.write("|--------|-----------|-----|----------------------------|------------------|-----------------|------|------------------------|\n")

        # Write data rows
        for fund in funds:
            f.write(f"| {fund['Symbol']} | {fund['Fund Name']} | {fund['AMC']} | ")
            f.write(f"{fund['Fund Classification (AIMC)']} | {fund['Management Style']} | ")
            f.write(f"{fund['Dividend Policy']} | {fund['Risk']} | {fund['Fund for tax allowance']} |\n")

    print(f"✓ Markdown file written: {output_path} ({len(funds)} funds)")

def main():
    """Main execution function."""
    # Paths (navigate up to project root from scripts/data-parsing/rmf/)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent.parent
    input_file = project_root / 'docs' / 'RMF-Fund-Comparison.md'
    csv_output = project_root / 'docs' / 'rmf-funds.csv'
    md_output = project_root / 'docs' / 'rmf-funds.md'

    print(f"Parsing RMF funds from: {input_file}")
    funds = parse_rmf_funds(input_file)

    print(f"\n✓ Extracted {len(funds)} funds")

    if len(funds) < 400:
        print(f"⚠ Warning: Expected ~417 funds, but only found {len(funds)}")

    # Write outputs
    write_csv(funds, csv_output)
    write_markdown(funds, md_output)

    print(f"\n✓ All files created successfully!")
    print(f"  - CSV: {csv_output}")
    print(f"  - Markdown: {md_output}")

if __name__ == '__main__':
    main()
