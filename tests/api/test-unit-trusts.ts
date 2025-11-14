import { fetchStockQuoteBySecurityType } from './server/services/setsmartApi';

async function testUnitTrusts() {
  // Try the most recent weekday - Nov 7, 2025 (Thursday)
  const date = '2025-11-07';

  console.log(`\n🔍 Fetching all Unit Trusts (UT) for ${date}...\n`);

  const unitTrusts = await fetchStockQuoteBySecurityType('UT', date, 'N');

  console.log(`✅ Found ${unitTrusts.length} Unit Trusts\n`);

  // Search for ABAPAC
  const abapac = unitTrusts.filter(ut =>
    ut.symbol.toUpperCase().includes('ABAPAC') ||
    ut.symbol.toUpperCase().includes('ABERDEEN')
  );

  if (abapac.length > 0) {
    console.log('🎯 Found ABAPAC fund(s):\n');
    abapac.forEach(fund => {
      console.log(`Symbol: ${fund.symbol}`);
      console.log(`NAV: ${fund.close}`);
      console.log(`Prior NAV: ${fund.prior}`);
      console.log(`Date: ${fund.date}`);
      console.log();
    });
  } else {
    console.log('⚠️  No ABAPAC fund found\n');
    console.log('First 20 Unit Trust symbols:');
    unitTrusts.slice(0, 20).forEach((ut, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${ut.symbol} - NAV: ${ut.close}`);
    });
  }
}

testUnitTrusts();
