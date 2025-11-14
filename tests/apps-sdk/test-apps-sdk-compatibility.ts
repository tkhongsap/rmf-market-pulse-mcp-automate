#!/usr/bin/env tsx
/**
 * OpenAI Apps SDK Compatibility Test Suite
 *
 * This test validates that all MCP tools return Apps SDK compatible responses
 * with proper _meta fields and widget template references.
 */

import { rmfMCPServer } from '../../server/mcp';
import { rmfDataService } from '../../server/services/rmfDataService';

console.log('🧪 OpenAI Apps SDK Compatibility Test Suite\n');
console.log('='.repeat(80));

// Initialize data service
console.log('📦 Initializing data service...');
const startTime = Date.now();
const totalFunds = rmfDataService.getTotalCount();
const loadTime = Date.now() - startTime;
console.log(`✓ Loaded ${totalFunds} funds in ${loadTime}ms\n`);

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

// Helper function to validate Apps SDK response format
function validateAppsSdkResponse(response: any, toolName: string): TestResult {
  const errors: string[] = [];

  // Check basic structure
  if (!response) {
    return { name: `${toolName} - Response exists`, passed: false, error: 'Response is null or undefined' };
  }

  // Check content array exists
  if (!Array.isArray(response.content)) {
    errors.push('Missing content array');
  } else {
    // Check content has at least one text element
    const hasTextContent = response.content.some((c: any) => c.type === 'text' && c.text);
    if (!hasTextContent) {
      errors.push('No text content found in response');
    }
  }

  // Check _meta field exists
  if (!response._meta) {
    errors.push('Missing _meta field');
  } else {
    // Check for openai/outputTemplate in _meta
    const hasOutputTemplate = response._meta['openai/outputTemplate'];
    if (!hasOutputTemplate) {
      errors.push('Missing openai/outputTemplate in _meta');
    } else {
      // Verify template URI format
      if (!hasOutputTemplate.startsWith('ui://')) {
        errors.push(`Invalid template URI format: ${hasOutputTemplate}`);
      }
    }

    // Check for timestamp
    if (!response._meta.timestamp) {
      errors.push('Missing timestamp in _meta');
    }
  }

  return {
    name: `${toolName} - Apps SDK format`,
    passed: errors.length === 0,
    error: errors.length > 0 ? errors.join(', ') : undefined,
  };
}

// Helper function to run a tool test
async function testTool(
  toolName: string,
  args: any,
  expectedTemplate?: string,
  additionalChecks?: (response: any) => string[]
): Promise<void> {
  totalTests++;
  console.log(`\n🔍 Test: ${toolName}`);
  console.log(`   Args: ${JSON.stringify(args, null, 2).split('\n').slice(0, 3).join('\n   ')}`);

  try {
    // Get the server and call the tool
    const server = rmfMCPServer.getServer();
    const tools = server.listTools();
    const tool = tools.find((t: any) => t.name === toolName);

    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    // Call the tool handler
    const response = await server.callTool(toolName, args);

    // Validate Apps SDK response format
    const formatResult = validateAppsSdkResponse(response, toolName);
    results.push(formatResult);

    if (!formatResult.passed) {
      console.log(`   ❌ FAIL: ${formatResult.error}`);
      failedTests++;
      return;
    }

    // Check expected template if provided
    if (expectedTemplate && response._meta['openai/outputTemplate'] !== expectedTemplate) {
      const error = `Expected template ${expectedTemplate}, got ${response._meta['openai/outputTemplate']}`;
      results.push({ name: `${toolName} - Template match`, passed: false, error });
      console.log(`   ❌ FAIL: ${error}`);
      failedTests++;
      return;
    }

    // Run additional checks if provided
    if (additionalChecks) {
      const errors = additionalChecks(response);
      if (errors.length > 0) {
        results.push({ name: `${toolName} - Additional checks`, passed: false, error: errors.join(', ') });
        console.log(`   ❌ FAIL: ${errors.join(', ')}`);
        failedTests++;
        return;
      }
    }

    console.log(`   ✅ PASS`);
    console.log(`   📋 Template: ${response._meta['openai/outputTemplate']}`);
    console.log(`   📊 Content blocks: ${response.content.length}`);
    console.log(`   🔢 Meta keys: ${Object.keys(response._meta).length}`);

    passedTests++;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name: toolName, passed: false, error: errorMsg });
    console.log(`   ❌ FAIL: ${errorMsg}`);
    failedTests++;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Running Apps SDK Compatibility Tests...\n');
  console.log('='.repeat(80));

  // Test 1: get_rmf_funds
  await testTool(
    'get_rmf_funds',
    { page: 1, pageSize: 10 },
    'ui://fund-list',
    (response) => {
      const errors: string[] = [];
      if (!response._meta.funds || !Array.isArray(response._meta.funds)) {
        errors.push('Missing funds array in _meta');
      }
      if (!response._meta.page) {
        errors.push('Missing page in _meta');
      }
      if (!response._meta.total) {
        errors.push('Missing total in _meta');
      }
      return errors;
    }
  );

  // Test 2: search_rmf_funds
  await testTool(
    'search_rmf_funds',
    { search: 'BBL', limit: 10 },
    'ui://fund-list',
    (response) => {
      const errors: string[] = [];
      if (!response._meta.funds) {
        errors.push('Missing funds in _meta');
      }
      if (!response._meta.filters) {
        errors.push('Missing filters in _meta');
      }
      return errors;
    }
  );

  // Test 3: get_rmf_fund_detail
  await testTool(
    'get_rmf_fund_detail',
    { fundCode: 'ABAPAC-RMF' },
    'ui://fund-detail',
    (response) => {
      const errors: string[] = [];
      if (!response._meta.fundData) {
        errors.push('Missing fundData in _meta');
      } else {
        // Check for required fields in fundData
        const requiredFields = ['proj_abbr_name', 'proj_name_en', 'unique_id', 'last_val', 'risk_spectrum'];
        for (const field of requiredFields) {
          if (!(field in response._meta.fundData)) {
            errors.push(`Missing ${field} in fundData`);
          }
        }
      }
      return errors;
    }
  );

  // Test 4: get_rmf_fund_performance
  await testTool(
    'get_rmf_fund_performance',
    { period: 'ytd', limit: 10 },
    'ui://fund-list',
    (response) => {
      const errors: string[] = [];
      if (!response._meta.funds) {
        errors.push('Missing funds in _meta');
      }
      if (!response._meta.period) {
        errors.push('Missing period in _meta');
      }
      if (!response._meta.periodLabel) {
        errors.push('Missing periodLabel in _meta');
      }
      return errors;
    }
  );

  // Test 5: get_rmf_fund_nav_history
  await testTool(
    'get_rmf_fund_nav_history',
    { fundCode: 'ABAPAC-RMF', days: 30 },
    undefined, // No widget template for this tool yet
    (response) => {
      const errors: string[] = [];
      if (!response._meta.navHistory) {
        errors.push('Missing navHistory in _meta');
      }
      if (!response._meta.statistics) {
        errors.push('Missing statistics in _meta');
      }
      return errors;
    }
  );

  // Test 6: compare_rmf_funds
  await testTool(
    'compare_rmf_funds',
    { fundCodes: ['ABAPAC-RMF', 'KT-RMF'], compareBy: 'all' },
    'ui://fund-comparison',
    (response) => {
      const errors: string[] = [];
      if (!response._meta.funds) {
        errors.push('Missing funds in _meta');
      }
      if (!response._meta.compareBy) {
        errors.push('Missing compareBy in _meta');
      }
      if (!response._meta.fundCount || response._meta.fundCount !== 2) {
        errors.push('Invalid fundCount in _meta');
      }
      return errors;
    }
  );

  // Test 7: Verify backward compatibility (text content)
  console.log('\n' + '='.repeat(80));
  console.log('🔄 Testing Backward Compatibility...\n');

  totalTests++;
  try {
    const server = rmfMCPServer.getServer();
    const response = await server.callTool('get_rmf_funds', { page: 1, pageSize: 5 });

    // Check that text content is still present for backward compatibility
    const hasTextContent = response.content.some((c: any) => c.type === 'text' && c.text);
    const hasJsonContent = response.content.some((c: any) => {
      if (c.type !== 'text') return false;
      try {
        JSON.parse(c.text);
        return true;
      } catch {
        return false;
      }
    });

    if (hasTextContent && hasJsonContent) {
      console.log('   ✅ PASS: Backward compatibility maintained');
      console.log('   📝 Text content: Present');
      console.log('   📊 JSON content: Present');
      passedTests++;
      results.push({ name: 'Backward compatibility', passed: true });
    } else {
      console.log('   ❌ FAIL: Missing text or JSON content for backward compatibility');
      failedTests++;
      results.push({
        name: 'Backward compatibility',
        passed: false,
        error: 'Missing required content types'
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`   ❌ FAIL: ${errorMsg}`);
    failedTests++;
    results.push({ name: 'Backward compatibility', passed: false, error: errorMsg });
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Test Summary\n');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));

  if (failedTests === 0) {
    console.log('✅ All Apps SDK compatibility tests passed!');
    console.log('\n🎉 Your MCP server is ready for OpenAI Apps SDK integration!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run the test suite
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
