/**
 * Discover ABAPAC-RMF Project ID from SEC Fund Factsheet API
 *
 * This script searches for ABAPAC fund(s) to find the correct proj_id
 * needed for the Fund Daily Info API.
 */

import {
  searchFundsByAMC,
  fetchFundsByAMC,
} from './server/services/secFundFactsheetApi';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
};

async function discoverABAPACFund() {
  console.log(colors.bright + colors.yellow);
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║            Discovering ABAPAC Fund Project ID - SEC Factsheet API         ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  try {
    // Step 1: Search Aberdeen AMC funds
    console.log(`\n${colors.cyan}Step 1: Searching for Aberdeen AMC funds...${colors.reset}\n`);

    const aberdeenFunds = await searchFundsByAMC('ABERDEEN');

    if (aberdeenFunds.length === 0) {
      console.log(`${colors.red}✗ No funds found for Aberdeen AMC${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✓ Found ${aberdeenFunds.length} funds under Aberdeen AMC${colors.reset}\n`);

    // Step 2: Filter for ABAPAC or Asia Pacific funds
    console.log(`${colors.cyan}Step 2: Filtering for ABAPAC / Asia Pacific funds...${colors.reset}\n`);

    const abapacFunds = aberdeenFunds.filter(fund =>
      fund.proj_name_en?.toUpperCase().includes('ASIA') &&
      fund.proj_name_en?.toUpperCase().includes('PACIFIC') ||
      fund.proj_id?.toUpperCase().includes('ABAPAC') ||
      fund.proj_abbr_name?.toUpperCase().includes('ABAPAC')
    );

    if (abapacFunds.length === 0) {
      console.log(`${colors.yellow}⚠️  No ABAPAC funds found. Showing all Aberdeen funds:${colors.reset}\n`);

      // Show all Aberdeen funds
      aberdeenFunds.forEach((fund, index) => {
        const statusColor = fund.fund_status === 'RG' ? colors.green : colors.yellow;
        console.log(`${(index + 1).toString().padStart(2)}. ${colors.bright}${fund.proj_id}${colors.reset}`);
        console.log(`    Name (EN): ${fund.proj_name_en || 'N/A'}`);
        console.log(`    Name (TH): ${fund.proj_name_th || 'N/A'}`);
        console.log(`    Abbr Name: ${fund.proj_abbr_name || 'N/A'}`);
        console.log(`    Status: ${statusColor}${fund.fund_status}${colors.reset}`);
        console.log(`    Regis ID: ${fund.regis_id}`);
        console.log(`    Regis Date: ${fund.regis_date}`);
        console.log();
      });

      return;
    }

    // Step 3: Display matching funds
    console.log(`${colors.green}✓ Found ${abapacFunds.length} ABAPAC / Asia Pacific fund(s):${colors.reset}\n`);
    console.log(colors.bright + '═'.repeat(80) + colors.reset);

    abapacFunds.forEach((fund, index) => {
      const statusColor = fund.fund_status === 'RG' ? colors.green : colors.yellow;
      const isRMF = fund.proj_id?.includes('RMF') || fund.proj_name_en?.includes('RMF');

      console.log(`\n${colors.bright}${colors.cyan}Fund ${index + 1}:${colors.reset}`);
      console.log(`  Project ID:         ${colors.bright}${colors.green}${fund.proj_id}${colors.reset}  ${isRMF ? '🎯 RMF' : ''}`);
      console.log(`  Name (EN):          ${fund.proj_name_en || 'N/A'}`);
      console.log(`  Name (TH):          ${fund.proj_name_th || 'N/A'}`);
      console.log(`  Abbreviated Name:   ${fund.proj_abbr_name || 'N/A'}`);
      console.log(`  Status:             ${statusColor}${fund.fund_status}${colors.reset} ${fund.fund_status === 'RG' ? '(Active)' : ''}`);
      console.log(`  Registration ID:    ${fund.regis_id}`);
      console.log(`  Registration Date:  ${fund.regis_date}`);
      console.log(`  Cancellation Date:  ${fund.cancel_date || 'N/A (Active)'}`);
      console.log(`  AMC ID:             ${fund.unique_id}`);
    });

    console.log('\n' + colors.bright + '═'.repeat(80) + colors.reset);

    // Step 4: Show RMF funds specifically
    const rmfFunds = abapacFunds.filter(fund =>
      fund.proj_id?.includes('RMF') || fund.proj_name_en?.includes('RMF')
    );

    if (rmfFunds.length > 0) {
      console.log(`\n${colors.green}${colors.bright}🎯 RMF Fund(s) Found:${colors.reset}\n`);

      rmfFunds.forEach(fund => {
        console.log(`  ${colors.bright}Use this proj_id: ${colors.green}${fund.proj_id}${colors.reset}`);
        console.log(`  Fund Name: ${fund.proj_name_en || fund.proj_name_th}`);
        console.log();
      });
    }

    // Step 5: Summary
    console.log(`\n${colors.cyan}${colors.bright}Next Steps:${colors.reset}`);
    console.log(`1. Use the ${colors.green}proj_id${colors.reset} above in Fund Daily Info API`);
    console.log(`2. Run: ${colors.yellow}npx tsx test-abapac-sec-api.ts${colors.reset}`);
    console.log(`3. Get NAV data, dividend history, and more!\n`);

  } catch (error: any) {
    console.error(colors.bright + colors.red + '❌ Error during discovery:' + colors.reset, error.message);
    process.exit(1);
  }
}

// Run the discovery
console.log(colors.blue + 'Starting ABAPAC fund discovery...\n' + colors.reset);
discoverABAPACFund();
