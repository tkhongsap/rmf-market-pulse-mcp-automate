import { fetchAMCList } from './server/services/secFundDailyInfoApi';

async function discoverFunds() {
  console.log('Fetching AMC list from SEC API...\n');

  const amcs = await fetchAMCList();

  console.log(`Found ${amcs.length} Asset Management Companies:\n`);

  amcs.forEach((amc, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${amc.unique_id?.padEnd(10) || 'N/A'.padEnd(10)} - ${amc.name_en || amc.name_th}`);
  });

  // Look for Aberdeen
  const aberdeen = amcs.filter(amc =>
    amc.name_en?.toUpperCase().includes('ABERDEEN') ||
    amc.name_th?.includes('อเบอร์ดีน') ||
    amc.unique_id?.toUpperCase().includes('AB')
  );

  if (aberdeen.length > 0) {
    console.log('\n🎯 Found Aberdeen-related AMC(s):');
    aberdeen.forEach(amc => {
      console.log(`\n  AMC ID: ${amc.unique_id}`);
      console.log(`  Name (EN): ${amc.name_en}`);
      console.log(`  Name (TH): ${amc.name_th}`);
    });
  } else {
    console.log('\n⚠️  No Aberdeen AMC found');
  }
}

discoverFunds();
