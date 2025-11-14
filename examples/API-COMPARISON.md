# API Comparison: SET SMART vs SEC API

## Overview

There are two main APIs available for querying Thai RMF fund data:

1. **SET SMART API** (currently implemented) - Trading and NAV data
2. **SEC API** (utility examples) - Comprehensive fund factsheet data

## When to Use Which API?

### Use SET SMART API for:

✅ **Daily NAV (Net Asset Value) updates**
- Current NAV and price changes
- Historical NAV data
- P/NAV ratios

✅ **Trading activity**
- Trading volume
- Trading value
- Market activity metrics

✅ **Real-time market data**
- End-of-day prices
- Price history
- Market trends

✅ **Simple fund listings**
- Quick fund searches by symbol
- Paginated fund lists
- Basic fund information

### Use SEC API for:

✅ **Detailed fund information**
- Fund prospectus details
- Investment objectives
- Fund manager information
- Registration details

✅ **Investment analysis**
- Asset allocation breakdown
- Portfolio holdings (top 5 and full portfolio)
- Investment policy details
- Benchmark information

✅ **Risk assessment**
- Risk ratings
- Risk metrics
- Historical risk data
- Suitability information

✅ **Performance analytics**
- Historical performance
- Return calculations
- Buy and hold analysis
- 5-year loss scenarios

✅ **Fees and charges**
- Management fees
- Redemption fees
- Front-end/back-end loads
- Other charges

✅ **Dividend information**
- Dividend history
- Dividend policy
- Payment dates

## Side-by-Side Comparison

| Feature | SET SMART API | SEC API |
|---------|---------------|---------|
| **Primary Use Case** | Trading & NAV data | Fund factsheet & analysis |
| **Update Frequency** | Daily (EOD) | Varies by endpoint |
| **NAV Data** | ✅ Current & historical | ❌ Not available |
| **Trading Volume** | ✅ Yes | ❌ Not available |
| **Asset Allocation** | ❌ Not available | ✅ Detailed breakdown |
| **Portfolio Holdings** | ❌ Not available | ✅ Top 5 & Full portfolio |
| **Risk Metrics** | ❌ Not available | ✅ Comprehensive |
| **Performance History** | ✅ Basic (price changes) | ✅ Detailed analytics |
| **Fees** | ❌ Not available | ✅ Complete fee structure |
| **Fund Policy** | ❌ Not available | ✅ Investment policy |
| **API Key Source** | SET SMART Portal | SEC API Portal |
| **Rate Limit** | 3,000 / 5 min | 3,000 / 5 min |
| **Response Format** | JSON | JSON |
| **Caching Recommended** | Yes (1 hour) | Yes (24 hours) |

## API Endpoints Comparison

### SET SMART API Endpoints

```typescript
// Get all unit trusts (mutual funds)
GET /eod-price-by-security-type?securityType=UT&date={YYYY-MM-DD}&adjustedPriceFlag=N

// Get specific fund by symbol
GET /eod-price-by-symbol?symbol={FUND_SYMBOL}&startDate={YYYY-MM-DD}&endDate={YYYY-MM-DD}&adjustedPriceFlag=N
```

### SEC API Endpoints (Sample)

```typescript
// Search for fund
POST /FundFactsheet/fund
Body: { "name": "SCBM3" }

// Get fund details
GET /FundFactsheet/fund/amc/{proj_id}

// Asset allocation
GET /FundFactsheet/fund/{proj_id}/asset

// Portfolio holdings
GET /FundFactsheet/fund/{proj_id}/FundTop5/{YYYYMM}

// Performance
GET /FundFactsheet/fund/{proj_id}/performance

// Risk
GET /FundFactsheet/fund/{proj_id}/risk

// Fees
GET /FundFactsheet/fund/{proj_id}/fee
```

## Example: Querying SCBM3

### SET SMART API (Current Implementation)

```bash
# Via REST API
curl "http://localhost:5000/api/rmf/SCBM3"
```

Response provides:
- Current NAV: 15.2345
- NAV Change: +0.08%
- Trading Volume: 1,000,000 units
- Trading Value: 15,234,500 THB
- P/NAV: 1.05
- Dividend Yield: 2.5%

### SEC API

```bash
# Step 1: Search for fund
curl -X POST "https://api.sec.or.th/FundFactsheet/fund" \
  -H "Ocp-Apim-Subscription-Key: {YOUR_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name": "SCBM3"}'

# Step 2: Get detailed info using proj_id
curl "https://api.sec.or.th/FundFactsheet/fund/amc/{proj_id}" \
  -H "Ocp-Apim-Subscription-Key: {YOUR_KEY}"
```

Response provides:
- Fund Name: SCB FLEXIBLE FUND RMF
- AMC: SCB ASSET MANAGEMENT COMPANY LIMITED
- Classification: Mixed Aggressive (MIXAGG)
- Investment policy
- Asset allocation
- Risk level: 5/8
- Fee structure
- Portfolio holdings

## Recommended Architecture

### For Production RMF Application

**Hybrid Approach:** Use both APIs for comprehensive coverage

```typescript
interface RMFFundData {
  // From SET SMART API
  nav: {
    current: number;
    prior: number;
    change: number;
    changePercent: number;
    date: string;
  };
  trading: {
    volume: number;
    value: number;
    pnav: number;
  };

  // From SEC API
  factsheet: {
    fundName: string;
    amc: string;
    classification: string;
    riskLevel: number;
    assetAllocation: AssetAllocation[];
    fees: FeeStructure;
    policy: InvestmentPolicy;
  };
}

// Service layer
class RMFFundService {
  async getCompleteFundData(fundSymbol: string): Promise<RMFFundData> {
    // Get NAV and trading data from SET SMART
    const navData = await this.setSMARTApi.getFund(fundSymbol);

    // Get factsheet data from SEC API
    const factsheetData = await this.secApi.getFundFactsheet(fundSymbol);

    return {
      nav: navData.nav,
      trading: navData.trading,
      factsheet: factsheetData,
    };
  }
}
```

## Authentication

### SET SMART API
```typescript
headers: {
  'api-key': '{YOUR_SETSMART_API_KEY}',
  'Content-Type': 'application/json'
}
```

### SEC API
```typescript
headers: {
  'Ocp-Apim-Subscription-Key': '{YOUR_SEC_API_KEY}',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache'
}
```

## Your Provided API Keys

```bash
# SEC API Keys
SEC_FUND_FACTSHEET_KEY=618a3ffe11944da093afa7fd33f10a28
SEC_FUND_FACTSHEET_SECONDARY_KEY=4486bbc3ce8e4a6ea54f9689767
```

**Note:** You need separate API keys for:
- SET SMART API (get from https://www.setsmart.com/)
- SEC API (get from https://api-portal.sec.or.th/)

## Conclusion

**For SCBM3 queries:**

1. **Current Implementation (SET SMART):** ✅ Already works
   - Query: `GET /api/rmf/SCBM3`
   - Provides: NAV, trading data, basic info

2. **SEC API:** ✅ Can be implemented
   - Provides: Detailed factsheet, holdings, fees, risk
   - Requires: Integration of SEC API service layer

**Recommendation:** Keep current SET SMART implementation for real-time NAV data, and add SEC API integration for detailed fund analysis and research features.
