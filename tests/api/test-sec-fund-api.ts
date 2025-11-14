/**
 * Test script for SEC Fund API with ABAPAC-RMF
 * 
 * This script tests all SEC Fund API endpoints with ABAPAC-RMF as the reference case
 */

import {
  searchFunds,
  findProjectId,
  getLatestNAV,
  getFundPolicy,
  getFundFees,
  getFundManagerHistory,
  getFundDataBySymbol,
} from './server/services/secFundApi';

async function testSECFundAPI() {
  console.log('='.repeat(80));
  console.log('SEC FUND API TESTING: ABAPAC-RMF');
  console.log('='.repeat(80));
  console.log();

  const testSymbol = 'ABAPAC-RMF';

  try {
    // ========================================================================
    // TEST 1: Search for funds
    // ========================================================================
    console.log('TEST 1: Search for funds by symbol');
    console.log('-'.repeat(80));
    
    const searchResults = await searchFunds(testSymbol);
    
    if (searchResults.length === 0) {
      console.log(`⚠️  No results found for "${testSymbol}"`);
      console.log('   Trying alternative search strategies...');
      console.log();
      
      // Try searching without "-RMF" suffix
      const baseName = testSymbol.split('-')[0];
      console.log(`   Searching for base name: "${baseName}"`);
      const altResults = await searchFunds(baseName);
      
      if (altResults.length > 0) {
        console.log(`✅ Found ${altResults.length} result(s) for "${baseName}":`);
        altResults.forEach((fund, idx) => {
          console.log(`   ${idx + 1}. ${fund.proj_id} - ${fund.proj_name_en || fund.proj_name_th}`);
          if (fund.proj_abbr_name) {
            console.log(`      Abbreviation: ${fund.proj_abbr_name}`);
          }
          console.log(`      AMC: ${fund.amc_name_en || fund.amc_name_th}`);
          console.log(`      Status: ${fund.fund_status || 'N/A'}`);
          console.log();
        });
      } else {
        console.log(`❌ No results found for "${baseName}" either`);
      }
    } else {
      console.log(`✅ Found ${searchResults.length} result(s) for "${testSymbol}":`);
      searchResults.forEach((fund, idx) => {
        console.log(`   ${idx + 1}. ${fund.proj_id} - ${fund.proj_name_en || fund.proj_name_th}`);
        if (fund.proj_abbr_name) {
          console.log(`      Abbreviation: ${fund.proj_abbr_name}`);
        }
        console.log(`      AMC: ${fund.amc_name_en || fund.amc_name_th}`);
        console.log(`      Status: ${fund.fund_status || 'N/A'}`);
        console.log();
      });
    }

    // ========================================================================
    // TEST 2: Find Project ID
    // ========================================================================
    console.log('TEST 2: Find proj_id using helper function');
    console.log('-'.repeat(80));
    
    const projId = await findProjectId(testSymbol);
    
    if (!projId) {
      console.log('❌ ERROR: Could not find proj_id for', testSymbol);
      console.log('   Cannot continue with remaining tests.');
      process.exit(1);
    }
    
    console.log(`✅ SUCCESS: Found proj_id = ${projId}`);
    console.log();

    // ========================================================================
    // TEST 3: Get Latest NAV
    // ========================================================================
    console.log('TEST 3: Get latest NAV data');
    console.log('-'.repeat(80));
    
    const navData = await getLatestNAV(projId);
    
    if (!navData) {
      console.log('❌ ERROR: No NAV data available');
    } else {
      console.log('✅ SUCCESS: Retrieved NAV data');
      console.log();
      console.log('NAV DATA:');
      console.log(JSON.stringify(navData, null, 2));
      console.log();
      
      console.log('ANALYSIS:');
      console.log(`  NAV Date: ${navData.nav_date}`);
      console.log(`  Current NAV: ${navData.nav?.toFixed(4) || 'N/A'}`);
      console.log(`  Previous NAV: ${navData.previous_nav?.toFixed(4) || 'N/A'}`);
      console.log(`  NAV Change: ${navData.nav_change?.toFixed(4) || 'N/A'}`);
      console.log(`  NAV Change %: ${navData.nav_change_percent?.toFixed(2) || 'N/A'}%`);
      console.log();
      
      console.log('COMPARISON WITH SCREENSHOT TARGET:');
      console.log(`  Target NAV: 15.8339`);
      console.log(`  Actual NAV: ${navData.nav?.toFixed(4) || 'N/A'}`);
      if (navData.nav) {
        const diff = Math.abs(navData.nav - 15.8339);
        if (diff < 0.5) {
          console.log(`  ✅ Match: Values are close (diff: ${diff.toFixed(4)})`);
        } else {
          console.log(`  ⚠️  Different: May be from different dates (diff: ${diff.toFixed(4)})`);
        }
      }
      console.log();
    }

    // ========================================================================
    // TEST 4: Get Fund Policy
    // ========================================================================
    console.log('TEST 4: Get fund policy (includes benchmark)');
    console.log('-'.repeat(80));
    
    const policy = await getFundPolicy(projId);
    
    if (!policy) {
      console.log('❌ ERROR: No policy data available');
    } else {
      console.log('✅ SUCCESS: Retrieved fund policy');
      console.log();
      console.log('FUND POLICY:');
      console.log(JSON.stringify(policy, null, 2));
      console.log();
      
      console.log('KEY FIELDS:');
      console.log(`  Benchmark: ${policy.benchmark || 'N/A'} ⭐`);
      console.log(`  Fund Type: ${policy.fund_type || 'N/A'}`);
      console.log(`  Security Type: ${policy.sec_type || 'N/A'}`);
      console.log(`  Objective: ${policy.objective?.substring(0, 100) || 'N/A'}...`);
      console.log();
    }

    // ========================================================================
    // TEST 5: Get Fund Fees
    // ========================================================================
    console.log('TEST 5: Get fund fees');
    console.log('-'.repeat(80));
    
    const fees = await getFundFees(projId);
    
    if (fees.length === 0) {
      console.log('⚠️  No fee data available');
    } else {
      console.log(`✅ SUCCESS: Retrieved ${fees.length} fee record(s)`);
      console.log();
      console.log('FEES:');
      fees.forEach((fee, idx) => {
        console.log(`  ${idx + 1}. ${fee.fee_type}: ${fee.fee_desc}`);
        if (fee.actual_value) {
          console.log(`     Value: ${fee.actual_value} ${fee.actual_value_unit || ''}`);
        }
        if (fee.fee_other_desc) {
          console.log(`     Note: ${fee.fee_other_desc}`);
        }
      });
      console.log();
    }

    // ========================================================================
    // TEST 6: Get Fund Manager History
    // ========================================================================
    console.log('TEST 6: Get fund manager history');
    console.log('-'.repeat(80));
    
    const managers = await getFundManagerHistory(projId);
    
    if (managers.length === 0) {
      console.log('⚠️  No manager history available');
    } else {
      console.log(`✅ SUCCESS: Retrieved ${managers.length} manager record(s)`);
      console.log();
      console.log('MANAGER HISTORY:');
      managers.forEach((mgr, idx) => {
        console.log(`  ${idx + 1}. ${mgr.manager_name || mgr.unique_id}`);
        console.log(`     Period: ${mgr.start_date || 'N/A'} to ${mgr.end_date || 'Current'}`);
      });
      console.log();
    }

    // ========================================================================
    // TEST 7: Comprehensive Function
    // ========================================================================
    console.log('TEST 7: Get comprehensive fund data (all-in-one)');
    console.log('-'.repeat(80));
    
    const comprehensiveData = await getFundDataBySymbol(testSymbol);
    
    console.log('✅ SUCCESS: Retrieved comprehensive data');
    console.log();
    console.log('SUMMARY:');
    console.log(`  Project ID: ${comprehensiveData.projId}`);
    console.log(`  NAV Data: ${comprehensiveData.navData ? '✅ Available' : '❌ Not available'}`);
    console.log(`  Policy Data: ${comprehensiveData.policy ? '✅ Available' : '❌ Not available'}`);
    console.log(`  Fee Data: ${comprehensiveData.fees.length} record(s)`);
    console.log(`  Manager History: ${comprehensiveData.managers.length} record(s)`);
    console.log();

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('='.repeat(80));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log();
    
    console.log('✅ WORKING ENDPOINTS:');
    console.log('  1. Fund search (POST /FundFactsheet/fund)');
    console.log('  2. Project ID lookup (helper function)');
    if (navData) console.log('  3. Daily NAV data (GET /FundDailyInfo/{proj_id}/dailynav/{date})');
    if (policy) console.log('  4. Fund policy (GET /FundFactsheet/fund/{proj_id}/policy)');
    if (fees.length > 0) console.log('  5. Fund fees (GET /FundFactsheet/fund/{proj_id}/fee)');
    if (managers.length > 0) console.log('  6. Fund manager history (GET /FundFactsheet/fund/{proj_id}/fund_manager)');
    console.log();

    console.log('📊 DATA AVAILABILITY FOR ENHANCED FUND DETAIL PAGE:');
    console.log(`  Current NAV: ${navData ? '✅' : '❌'}`);
    console.log(`  Benchmark: ${policy?.benchmark ? '✅ ' + policy.benchmark : '❌'}`);
    console.log(`  Fund Type: ${policy?.fund_type ? '✅' : '❌'}`);
    console.log(`  Fees: ${fees.length > 0 ? '✅' : '❌'}`);
    console.log(`  Manager Info: ${managers.length > 0 ? '✅' : '❌'}`);
    console.log();

    console.log('⚠️  STILL NEED TO TEST:');
    console.log('  - Asset allocation endpoint');
    console.log('  - Portfolio holdings endpoint');
    console.log('  - Historical NAV for performance calculations');
    console.log('  - Fund dividend information');
    console.log();

    console.log('='.repeat(80));
    console.log('✅ PHASE 1 TESTING COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ FATAL ERROR during testing:');
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
testSECFundAPI();
