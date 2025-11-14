#!/usr/bin/env node

/**
 * User Scenario Testing - RMF Investment Planning
 *
 * Simulates a real user learning about RMF funds and planning to invest
 * before year-end for tax incentives.
 */

import http from 'http';

const MCP_SERVER_URL = 'http://localhost:5000';

/**
 * Call MCP tool via JSON-RPC 2.0
 */
async function callMCPTool(toolName, args = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      },
      id: Date.now()
    });

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Extract JSON data from MCP response
 * MCP returns [summary_text, json_data] in content array
 */
function extractData(result) {
  // MCP returns multiple content items, JSON data is usually in the last item
  if (result.content && result.content.length > 0) {
    const lastContent = result.content[result.content.length - 1];
    try {
      return JSON.parse(lastContent.text);
    } catch (e) {
      // If last item isn't JSON, return raw text
      return lastContent.text;
    }
  }
  return null;
}

/**
 * Get summary text from MCP response
 */
function getSummary(result) {
  if (result.content && result.content.length > 0) {
    return result.content[0].text;
  }
  return '';
}

/**
 * Format fund data for display
 */
function formatFund(fund) {
  return `  • ${fund.symbol} - ${fund.fund_name}
    AMC: ${fund.amc || 'N/A'}
    NAV: ${fund.nav_value?.toFixed(4) || 'N/A'} ${fund.nav_change_percent ? `(${fund.nav_change_percent > 0 ? '+' : ''}${fund.nav_change_percent.toFixed(2)}%)` : ''}
    YTD Return: ${fund.perf_ytd !== null ? fund.perf_ytd.toFixed(2) + '%' : 'N/A'}
    Risk Level: ${fund.risk_level || 'N/A'}`;
}

/**
 * User scenarios
 */
const scenarios = [
  {
    question: "I'm new to RMF. Can you show me the top 5 performing RMF funds this year?",
    async execute() {
      const result = await callMCPTool('get_rmf_fund_performance', {
        period: 'ytd',
        limit: 5,
        sortOrder: 'desc'
      });

      console.log(`\n📊 ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.funds) {
        data.funds.forEach((fund, idx) => {
          console.log(`${idx + 1}. ${fund.symbol} - ${fund.fund_name}`);
          console.log(`   YTD Return: ${fund.perf_ytd?.toFixed(2)}%`);
          console.log(`   Risk Level: ${fund.risk_level || 'N/A'}`);
          console.log(`   AMC: ${fund.amc || 'N/A'}`);
        });
      }
    }
  },

  {
    question: "I'm a conservative investor. Show me low-risk RMF funds (risk level 1-3)",
    async execute() {
      const result = await callMCPTool('search_rmf_funds', {
        maxRiskLevel: 3,
        sortBy: 'ytd',
        sortOrder: 'desc',
        limit: 5
      });

      console.log(`\n🛡️ ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.funds) {
        data.funds.forEach(fund => {
          console.log(formatFund(fund));
        });
      }
    }
  },

  {
    question: "I want to invest with Bangkok Bank (BBL). What RMF funds do they offer?",
    async execute() {
      const result = await callMCPTool('search_rmf_funds', {
        search: 'Bualuang',
        limit: 8
      });

      console.log(`\n🏦 ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.funds) {
        data.funds.forEach(fund => {
          console.log(formatFund(fund));
        });
      }
    }
  },

  {
    question: "Tell me more about SCBRMDEQ fund - what are the details?",
    async execute() {
      const result = await callMCPTool('get_rmf_fund_detail', {
        fundCode: 'SCBRMDEQ'
      });

      console.log(`\n📋 ${getSummary(result)}\n`);
      const fund = extractData(result);
      if (fund) {
        console.log(`  Fund Name: ${fund.fund_name}`);
        console.log(`  Symbol: ${fund.symbol}`);
        console.log(`  AMC: ${fund.amc}`);
        console.log(`  Category: ${fund.fund_classification || 'N/A'}`);
        console.log(`  Management Style: ${fund.management_style || 'N/A'}`);
        console.log(`  Risk Level: ${fund.risk_level || 'N/A'}`);
        console.log(`  Dividend Policy: ${fund.dividend_policy || 'N/A'}`);
        console.log(`\n  Performance:`);
        console.log(`    YTD: ${fund.perf_ytd?.toFixed(2)}%`);
        console.log(`    1 Year: ${fund.perf_1y?.toFixed(2)}%`);
        console.log(`    3 Years: ${fund.perf_3y?.toFixed(2)}%`);
        console.log(`    5 Years: ${fund.perf_5y?.toFixed(2)}%`);
        console.log(`\n  Latest NAV: ${fund.nav_value?.toFixed(4)} (${fund.nav_date || 'N/A'})`);
        if (fund.nav_change_percent) {
          console.log(`  Change: ${fund.nav_change > 0 ? '+' : ''}${fund.nav_change?.toFixed(4)} (${fund.nav_change_percent > 0 ? '+' : ''}${fund.nav_change_percent?.toFixed(2)}%)`);
        }
      }
    }
  },

  {
    question: "How has SCBRMDEQ performed over the last 30 days?",
    async execute() {
      const result = await callMCPTool('get_rmf_fund_nav_history', {
        fundCode: 'SCBRMDEQ',
        days: 30
      });

      console.log(`\n📈 ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.history && data.history.length > 0) {
        console.log(`  Fund: ${data.fund_name}`);
        console.log(`  Total Records: ${data.history.length} days`);
        console.log(`  Latest NAV: ${data.history[0]?.nav_value?.toFixed(4)} (${data.history[0]?.nav_date})`);
        console.log(`  Oldest NAV: ${data.history[data.history.length - 1]?.nav_value?.toFixed(4)} (${data.history[data.history.length - 1]?.nav_date})`);

        // Calculate 30-day change
        if (data.history.length >= 2) {
          const latest = data.history[0].nav_value;
          const oldest = data.history[data.history.length - 1].nav_value;
          const change = ((latest - oldest) / oldest * 100).toFixed(2);
          console.log(`  Period Change: ${change}%`);
        }
      }
    }
  },

  {
    question: "I want to diversify. Show me equity funds with good performance",
    async execute() {
      const result = await callMCPTool('search_rmf_funds', {
        category: 'Equity',
        sortBy: 'ytd',
        sortOrder: 'desc',
        limit: 5
      });

      console.log(`\n💹 ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.funds) {
        data.funds.forEach(fund => {
          console.log(formatFund(fund));
        });
      }
    }
  },

  {
    question: "Which funds from Krungsri (BAY) have returns above 5% YTD?",
    async execute() {
      const result = await callMCPTool('search_rmf_funds', {
        search: 'Krungsri',
        minYtdReturn: 5.0,
        sortBy: 'ytd',
        sortOrder: 'desc',
        limit: 10
      });

      console.log(`\n🏦 ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.funds) {
        data.funds.forEach(fund => {
          console.log(formatFund(fund));
        });
      }
    }
  },

  {
    question: "Compare the performance of KFRMF-A and KFRMFEQ funds",
    async execute() {
      const result = await callMCPTool('compare_rmf_funds', {
        fundCodes: ['KFRMF-A', 'KFRMFEQ'],
        compareBy: 'all'
      });

      console.log(`\n⚖️ ${getSummary(result)}\n`);
      // Print the full comparison text
      result.content.forEach(item => {
        console.log(item.text);
      });
    }
  },

  {
    question: "Show me balanced funds (mixed assets) for moderate risk tolerance",
    async execute() {
      const result = await callMCPTool('search_rmf_funds', {
        category: 'Mixed',
        minRiskLevel: 3,
        maxRiskLevel: 5,
        sortBy: 'ytd',
        sortOrder: 'desc',
        limit: 5
      });

      console.log(`\n⚖️ ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.funds) {
        data.funds.forEach(fund => {
          console.log(formatFund(fund));
        });
      }
    }
  },

  {
    question: "What are the overall best performing funds across all categories?",
    async execute() {
      const result = await callMCPTool('get_rmf_funds', {
        page: 1,
        pageSize: 10,
        sortBy: 'ytd',
        sortOrder: 'desc'
      });

      console.log(`\n🏆 ${getSummary(result)}\n`);
      const data = extractData(result);
      if (data && data.funds) {
        data.funds.forEach((fund, idx) => {
          console.log(`${idx + 1}. ${fund.symbol} - ${fund.fund_name}`);
          console.log(`   AMC: ${fund.amc || 'N/A'}`);
          console.log(`   Category: ${fund.fund_classification || 'N/A'}`);
          console.log(`   YTD Return: ${fund.perf_ytd?.toFixed(2)}%`);
          console.log(`   1Y Return: ${fund.perf_1y?.toFixed(2)}%`);
          console.log(`   Risk Level: ${fund.risk_level || 'N/A'}`);
        });
      }
    }
  }
];

/**
 * Run all scenarios
 */
async function runUserScenarios() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 RMF Investment Planning - User Scenario Testing');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n👤 User Profile: New investor learning about RMF for tax benefits');
  console.log('🎯 Goal: Find suitable RMF funds to invest before year-end\n');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Question ${i + 1}/10:`);
    console.log(`"${scenario.question}"`);
    console.log('='.repeat(70));

    try {
      await scenario.execute();
      successCount++;
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      errorCount++;
    }

    // Add delay between requests to respect rate limiting
    if (i < scenarios.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log('📊 Test Results Summary');
  console.log('═'.repeat(70));
  console.log(`✅ Successful: ${successCount}/10`);
  console.log(`❌ Failed: ${errorCount}/10`);

  if (errorCount === 0) {
    console.log('\n💡 Summary:');
    console.log('   - All 10 user questions answered successfully');
    console.log('   - MCP server provided comprehensive fund information');
    console.log('   - User can now make informed investment decisions');
    console.log('   - Ready for year-end tax planning! 🎉\n');
  }
}

// Run scenarios
runUserScenarios().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
