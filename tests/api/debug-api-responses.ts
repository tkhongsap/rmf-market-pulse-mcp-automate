/**
 * Debug script to inspect actual SEC API response formats
 */

import {
  fetchFundPerformance,
  fetchFundBenchmark,
  fetchFundAssets,
  clearCache as clearFactsheetCache,
} from '../../server/services/secFundFactsheetApi';

async function debugAPIs() {
  console.log('🔍 Debugging SEC Fund Factsheet API Responses\n');

  const proj_id = 'M0774_2554'; // ABAPAC-RMF

  clearFactsheetCache();

  // Test 1: Performance
  console.log('=' .repeat(80));
  console.log('1. PERFORMANCE DATA');
  console.log('='.repeat(80));
  try {
    const performance = await fetchFundPerformance(proj_id);
    console.log('Type:', typeof performance);
    console.log('Is Array:', Array.isArray(performance));
    console.log('Data:', JSON.stringify(performance, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: Benchmark
  console.log('\n' + '='.repeat(80));
  console.log('2. BENCHMARK DATA');
  console.log('='.repeat(80));
  try {
    const benchmark = await fetchFundBenchmark(proj_id);
    console.log('Type:', typeof benchmark);
    console.log('Is Array:', Array.isArray(benchmark));
    console.log('Data:', JSON.stringify(benchmark, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 3: Assets
  console.log('\n' + '='.repeat(80));
  console.log('3. ASSET ALLOCATION DATA');
  console.log('='.repeat(80));
  try {
    const assets = await fetchFundAssets(proj_id);
    console.log('Type:', typeof assets);
    console.log('Is Array:', Array.isArray(assets));
    console.log('Data:', JSON.stringify(assets, null, 2));
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

debugAPIs();
