#!/usr/bin/env node
/**
 * Parse RMF Fund data from markdown file and output to CSV and Markdown.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanText(text) {
  // Replace <br>, <br/>, <br /> with space
  text = text.replace(/<br\s*\/?>/g, ' ');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Replace multiple spaces with single space
  text = text.replace(/\s+/g, ' ');
  return text.trim();
}

function parseRMFFunds(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const funds = [];

  // Split by <tr> tags
  const rows = content.split('<tr>');

  for (const row of rows) {
    // Look for fund symbol pattern: <b><u>SYMBOL</u></b> or <b>SYMBOL</b>
    // Try with underline first
    let symbolMatch = row.match(/<b><u>([^<]+)<\/u><\/b>/);
    // If not found, try without underline (allow spaces, dashes, letters, numbers, parentheses)
    if (!symbolMatch) {
      symbolMatch = row.match(/<td><b>([A-Z0-9 \-()]+)<\/b><\/td>/);
    }

    if (symbolMatch) {
      const symbol = symbolMatch[1].trim();

      // Extract all <td> content
      const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);

      if (tdMatches && tdMatches.length >= 7) {
        const tdContents = tdMatches.map(td => {
          const content = td.replace(/<td[^>]*>/, '').replace(/<\/td>/, '');
          return content;
        });

        // Find which td contains the symbol
        let symbolIdx = 0;
        for (let idx = 0; idx < tdContents.length; idx++) {
          if (tdContents[idx].includes(symbol)) {
            symbolIdx = idx;
            break;
          }
        }

        // Extract data based on position
        try {
          const fundName = cleanText(tdContents[symbolIdx + 1] || '');
          const amc = cleanText(tdContents[symbolIdx + 2] || '');
          const classification = cleanText(tdContents[symbolIdx + 3] || '');
          const mgmtStyle = cleanText(tdContents[symbolIdx + 4] || '');
          const dividend = cleanText(tdContents[symbolIdx + 5] || '');
          const risk = cleanText(tdContents[symbolIdx + 6] || '');
          const taxAllowance = cleanText(tdContents[symbolIdx + 7] || 'RMF');

          // Only add if we have valid data
          if (fundName && amc) {
            funds.push({
              'Symbol': symbol,
              'Fund Name': fundName,
              'AMC': amc,
              'Fund Classification (AIMC)': classification,
              'Management Style': mgmtStyle,
              'Dividend Policy': dividend,
              'Risk': risk,
              'Fund for tax allowance': taxAllowance
            });
          }
        } catch (error) {
          // Skip rows that don't have enough data
          continue;
        }
      }
    }
  }

  return funds;
}

function writeCsv(funds, outputPath) {
  if (funds.length === 0) {
    console.log('No funds to write!');
    return;
  }

  const headers = [
    'Symbol',
    'Fund Name',
    'AMC',
    'Fund Classification (AIMC)',
    'Management Style',
    'Dividend Policy',
    'Risk',
    'Fund for tax allowance'
  ];

  // CSV escape function
  function escapeCSV(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  let csv = headers.join(',') + '\n';

  for (const fund of funds) {
    const row = headers.map(header => escapeCSV(fund[header] || '')).join(',');
    csv += row + '\n';
  }

  fs.writeFileSync(outputPath, csv, 'utf-8');
  console.log(`✓ CSV file written: ${outputPath} (${funds.length} funds)`);
}

function writeMarkdown(funds, outputPath) {
  if (funds.length === 0) {
    console.log('No funds to write!');
    return;
  }

  let md = '# Thai RMF Funds Database\n\n';
  md += `Complete list of ${funds.length} Thai Retirement Mutual Funds (RMF)\n\n`;

  // Write table header
  md += '| Symbol | Fund Name | AMC | Fund Classification (AIMC) | Management Style | Dividend Policy | Risk | Fund for tax allowance |\n';
  md += '|--------|-----------|-----|----------------------------|------------------|-----------------|------|------------------------|\n';

  // Write data rows
  for (const fund of funds) {
    md += `| ${fund['Symbol']} | ${fund['Fund Name']} | ${fund['AMC']} | `;
    md += `${fund['Fund Classification (AIMC)']} | ${fund['Management Style']} | `;
    md += `${fund['Dividend Policy']} | ${fund['Risk']} | ${fund['Fund for tax allowance']} |\n`;
  }

  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(`✓ Markdown file written: ${outputPath} (${funds.length} funds)`);
}

function main() {
  // Paths (navigate up to project root from scripts/data-parsing/rmf/)
  const projectRoot = path.join(__dirname, '..', '..', '..');
  const inputFile = path.join(projectRoot, 'docs', 'RMF-Fund-Comparison.md');
  const csvOutput = path.join(projectRoot, 'docs', 'rmf-funds.csv');
  const mdOutput = path.join(projectRoot, 'docs', 'rmf-funds.md');

  console.log(`Parsing RMF funds from: ${inputFile}`);
  const funds = parseRMFFunds(inputFile);

  console.log(`\n✓ Extracted ${funds.length} funds`);

  if (funds.length < 400) {
    console.log(`⚠ Warning: Expected ~417 funds, but only found ${funds.length}`);
  }

  // Write outputs
  writeCsv(funds, csvOutput);
  writeMarkdown(funds, mdOutput);

  console.log(`\n✓ All files created successfully!`);
  console.log(`  - CSV: ${csvOutput}`);
  console.log(`  - Markdown: ${mdOutput}`);
}

main();
