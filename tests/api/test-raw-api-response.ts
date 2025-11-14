/**
 * Test Raw API Responses
 * Fetch and display raw API responses without any parsing
 */

const SEC_API_BASE_URL = 'https://api.sec.or.th/FundFactsheet';
const SEC_FUND_FACTSHEET_KEY = process.env.SEC_FUND_FACTSHEET_KEY;

async function fetchRawEndpoint(endpoint: string) {
  const url = `${SEC_API_BASE_URL}${endpoint}`;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(80));

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Ocp-Apim-Subscription-Key': SEC_FUND_FACTSHEET_KEY!,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error Response: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log('\nRaw Response:');
    console.log(JSON.stringify(data, null, 2));

    return data;
  } catch (error: any) {
    console.log(`Exception: ${error.message}`);
    return null;
  }
}

async function testRawAPI() {
  const fundId = 'M0774_2554'; // ABAPAC-RMF

  console.log('\n🔍 Testing Raw SEC Fund Factsheet API Responses\n');
  console.log(`Fund: ABAPAC-RMF (${fundId})\n`);

  // Test 1: Performance
  await fetchRawEndpoint(`/fund/${fundId}/performance`);

  // Test 2: Benchmark
  await fetchRawEndpoint(`/fund/${fundId}/benchmark`);

  // Test 3: 5YearLost
  await fetchRawEndpoint(`/fund/${fundId}/5YearLost`);

  // Test 4: Tracking Error
  await fetchRawEndpoint(`/fund/${fundId}/FundTrackingError`);

  // Test 5: Fund Compare
  await fetchRawEndpoint(`/fund/${fundId}/fund_compare`);

  // Also try some variations for volatility endpoint
  console.log('\n\n📊 Trying variations for volatility endpoint...\n');
  await fetchRawEndpoint(`/fund/${fundId}/5yearlost`);
  await fetchRawEndpoint(`/fund/${fundId}/volatility`);
  await fetchRawEndpoint(`/fund/${fundId}/risk`);
  await fetchRawEndpoint(`/fund/${fundId}/std_dev`);
}

testRawAPI();
