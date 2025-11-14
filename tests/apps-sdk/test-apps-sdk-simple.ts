#!/usr/bin/env npx tsx
/**
 * OpenAI Apps SDK Compatibility Test - Simplified
 *
 * Direct HTTP testing of MCP server responses
 */

console.log('🧪 OpenAI Apps SDK Compatibility Test\n');
console.log('='.repeat(80));

// Test configuration
const TEST_CASES = [
  {
    name: 'get_rmf_funds',
    method: 'tools/call',
    params: {
      name: 'get_rmf_funds',
      arguments: { page: 1, pageSize: 10 }
    },
    expectedTemplate: 'ui://fund-list',
    requiredMetaFields: ['funds', 'page', 'pageSize', 'total', 'timestamp']
  },
  {
    name: 'search_rmf_funds',
    method: 'tools/call',
    params: {
      name: 'search_rmf_funds',
      arguments: { search: 'BBL', limit: 10 }
    },
    expectedTemplate: 'ui://fund-list',
    requiredMetaFields: ['funds', 'filters', 'timestamp']
  },
  {
    name: 'get_rmf_fund_detail',
    method: 'tools/call',
    params: {
      name: 'get_rmf_fund_detail',
      arguments: { fundCode: 'ABAPAC-RMF' }
    },
    expectedTemplate: 'ui://fund-detail',
    requiredMetaFields: ['fundData', 'timestamp']
  },
  {
    name: 'get_rmf_fund_performance',
    method: 'tools/call',
    params: {
      name: 'get_rmf_fund_performance',
      arguments: { period: 'ytd', limit: 10 }
    },
    expectedTemplate: 'ui://fund-list',
    requiredMetaFields: ['funds', 'period', 'periodLabel', 'timestamp']
  },
  {
    name: 'get_rmf_fund_nav_history',
    method: 'tools/call',
    params: {
      name: 'get_rmf_fund_nav_history',
      arguments: { fundCode: 'ABAPAC-RMF', days: 30 }
    },
    expectedTemplate: undefined,
    requiredMetaFields: ['navHistory', 'statistics', 'timestamp']
  },
  {
    name: 'compare_rmf_funds',
    method: 'tools/call',
    params: {
      name: 'compare_rmf_funds',
      arguments: { fundCodes: ['ABAPAC-RMF', 'ABGDD-RMF'], compareBy: 'all' }
    },
    expectedTemplate: 'ui://fund-comparison',
    requiredMetaFields: ['funds', 'compareBy', 'fundCount', 'timestamp']
  }
];

// Test results
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results: Array<{ test: string; passed: boolean; errors: string[] }> = [];

// Helper to validate Apps SDK response
function validateResponse(response: any, testCase: typeof TEST_CASES[0]): string[] {
  const errors: string[] = [];

  // Check content array
  if (!Array.isArray(response.content)) {
    errors.push('Missing content array');
  } else {
    const hasText = response.content.some((c: any) => c.type === 'text' && c.text);
    if (!hasText) {
      errors.push('No text content in response');
    }
  }

  // Check _meta field
  if (!response._meta) {
    errors.push('Missing _meta field');
  } else {
    // Check for openai/outputTemplate if expected
    if (testCase.expectedTemplate) {
      const template = response._meta['openai/outputTemplate'];
      if (!template) {
        errors.push('Missing openai/outputTemplate in _meta');
      } else if (template !== testCase.expectedTemplate) {
        errors.push(`Wrong template: expected ${testCase.expectedTemplate}, got ${template}`);
      }
    }

    // Check required meta fields
    for (const field of testCase.requiredMetaFields) {
      if (!(field in response._meta)) {
        errors.push(`Missing ${field} in _meta`);
      }
    }
  }

  return errors;
}

// Simple HTTP-based test using fetch
async function testViaHttp() {
  console.log('🌐 Testing via HTTP endpoint...\n');

  const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:5000';
  console.log(`Server URL: ${serverUrl}/mcp\n`);
  console.log('='.repeat(80));

  for (const testCase of TEST_CASES) {
    totalTests++;
    console.log(`\n🔍 Test: ${testCase.name}`);

    try {
      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: totalTests,
          method: testCase.method,
          params: testCase.params
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for JSON-RPC error
      if (data.error) {
        throw new Error(`JSON-RPC error: ${data.error.message}`);
      }

      // Validate the result
      const errors = validateResponse(data.result, testCase);

      if (errors.length === 0) {
        console.log('   ✅ PASS');
        console.log(`   📋 Template: ${data.result._meta?.['openai/outputTemplate'] || 'none'}`);
        console.log(`   📊 Content blocks: ${data.result.content?.length || 0}`);
        console.log(`   🔢 Meta fields: ${Object.keys(data.result._meta || {}).length}`);
        passedTests++;
        results.push({ test: testCase.name, passed: true, errors: [] });
      } else {
        console.log(`   ❌ FAIL:`);
        errors.forEach(err => console.log(`      - ${err}`));
        failedTests++;
        results.push({ test: testCase.name, passed: false, errors });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ FAIL: ${errorMsg}`);
      failedTests++;
      results.push({ test: testCase.name, passed: false, errors: [errorMsg] });
    }
  }
}

// Direct module test (without HTTP)
async function testDirect() {
  console.log('📦 Testing via direct module import...\n');
  console.log('='.repeat(80));

  try {
    // Import and initialize
    const { rmfMCPServer } = await import('../../server/mcp');
    const { rmfDataService } = await import('../../server/services/rmfDataService');

    const fundCount = rmfDataService.getTotalCount();
    console.log(`✓ Data service loaded: ${fundCount} funds\n`);

    // We can't directly call the private methods, so this test is limited
    console.log('⚠️  Direct module testing not fully implemented');
    console.log('   (MCP SDK does not expose tool handlers directly)\n');

  } catch (error) {
    console.log(`❌ Failed to load modules: ${error}\n`);
  }
}

// Print summary
function printSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary\n');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests} (${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%)`);
  console.log(`❌ Failed: ${failedTests} (${totalTests > 0 ? ((failedTests / totalTests) * 100).toFixed(1) : 0}%)`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n   ${r.test}:`);
      r.errors.forEach(err => console.log(`      - ${err}`));
    });
  }

  console.log('\n' + '='.repeat(80));

  if (failedTests === 0 && totalTests > 0) {
    console.log('✅ All Apps SDK compatibility tests passed!');
    console.log('\n🎉 Your MCP server is ready for OpenAI Apps SDK integration!');
    return 0;
  } else if (totalTests === 0) {
    console.log('⚠️  No tests were run. Make sure the server is running.');
    return 1;
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    return 1;
  }
}

// Main
async function main() {
  // Try HTTP test first
  try {
    await testViaHttp();
  } catch (error) {
    console.log(`\n⚠️  HTTP test failed: ${error}`);
    console.log('   Make sure the server is running with: npm run dev\n');

    // Fall back to direct test
    await testDirect();
  }

  const exitCode = printSummary();
  process.exit(exitCode);
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
