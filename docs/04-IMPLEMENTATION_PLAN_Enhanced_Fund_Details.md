# Implementation Plan: Enhanced RMF Fund Detail Page

**Project**: Thai RMF Market Pulse
**Feature**: Enhanced Fund Detail with Performance Metrics
**Date**: November 10, 2025
**Status**: Planning Phase

---

## Executive Summary

This document outlines the implementation plan to enhance the RMF fund detail page to display comprehensive fund information matching the reference screenshots from SET Smart website, using available data from Thailand SEC API, CSV metadata, and calculated metrics.

---

## 1. Current State Analysis

### 1.1 Existing Implementation

**Current API Endpoints:**
- `GET /api/rmf` - List RMF funds with pagination
- `GET /api/rmf/:fundCode` - Get basic fund details
- `GET /api/debug/sec` - Debug SEC API connection

**Current Data Sources:**
- **Thailand SEC API** (`server/services/secApi.ts`):
  - Fund Factsheet API - Basic fund information
  - Fund Daily Info API - NAV and trading data
- **CSV Metadata** (`docs/rmf-funds.csv`):
  - 410 funds with: Symbol, Fund Name, AMC, Classification, Management Style, Dividend Policy, Risk, Tax Allowance

**Current Data Fields Retrieved:**
- Basic NAV data: `prior`, `open`, `high`, `low`, `close`, `average`
- Trading metrics: `aomVolume`, `aomValue`, `trVolume`, `trValue`, `totalVolume`, `totalValue`
- Fund metrics: `bvps` (NAV), `pbv` (P/NAV), `dividendYield`
- Date: `date`

### 1.2 Target Data Requirements (from Screenshots)

**Fund Information Section:**
- ✅ Fund Name
- ✅ Management Company (AMC)
- ✅ Current NAV (15.8339)
- ✅ Fund Classification (Asia Pacific Ex.Japan - EQASxJP)
- ✅ Special Feature (RMF)
- ✅ Currency (THB)
- ✅ Dividend Policy (No)
- ⚠️ Benchmark (68d MSCI AC Asia_Pacific ex Japan)
- ⚠️ Factsheet PDF download link

**Latest Performance Section:**
- ❌ Performance metrics with rankings:
  - YTD: +13.54% (Rank 5/6 in RMF EQASxJP, 36/77 in EQASxJP)
  - 1 Week: -1.21% (Rank 3/6, 20/77)
  - 1 Month: +2.40% (Rank 1/6, 6/77)
  - 3 Months: +12.24% (Rank 2/6, 18/77)
  - 6 Months: +22.16% (Rank 2/6, 24/77)
  - 1 Year: +11.71% (Rank 3/6, 29/77)
  - 3 Years (Annualized): +5.71% (Rank 5/6, 32/77)
  - 5 Years (Annualized): -0.05% (Rank 6/6, 19/77)
  - 10 Years (Annualized): +2.62% (Rank 4/6, 15/77)

**Risk Section:**
- ✅ Risk level indicator (6 = ระดับสูง/High)
- ⚠️ Risk detail description (Thai text)

**Historical Performance vs Benchmark:**
- ❌ Performance table comparing Fund vs Benchmark
- ❌ Standard Deviation comparison
- ❌ Historical performance chart

**Investment Policy:**
- ⚠️ Management Style (Active Management)
- ❌ Investment policy detailed description (Thai text)

**Asset Allocation:**
- ❌ Pie chart showing allocation
- ❌ Unit Trust: 98.81%
- ❌ Promissory Note & Bill of Exchange: 0.77%
- ❌ Derivatives: 0.42%

**Top 5 Holdings:**
- ❌ abrdn ASIA LIMITED (ABPACH SP): 98.80%
- ❌ Citibank, N.A. (MTS141601THB): 0.77%
- ❌ SCB BANK (FX150): 0.61%
- ❌ Citibank, Thailand (FX147): 0.48%
- ❌ Citibank, Thailand (FX148): -0.04%

**Other Information:**
- ❌ Fees (max %)
- ❌ Minimum Subscription & Redemption amounts
- ❌ Fund Manager information

**Backtesting Tool:**
- ❌ Investment simulator
- ❌ Capital gain calculator

---

## 2. Data Availability Matrix

| Data Field | CSV | SEC API Current | SEC API Available | Calculated | Notes |
|------------|-----|----------------|-------------------|------------|-------|
| **Basic Info** |
| Fund Symbol | ✅ | ❌ | ❌ | ❌ | From CSV |
| Fund Name | ✅ | ❌ | ❌ | ❌ | From CSV |
| AMC | ✅ | ❌ | ❌ | ❌ | From CSV |
| Classification (AIMC) | ✅ | ❌ | ❌ | ❌ | From CSV (EQASxJP) |
| Special Feature | ✅ | ❌ | ❌ | ❌ | From CSV (RMF) |
| Risk Level | ✅ | ❌ | ❌ | ❌ | From CSV (1-8 scale) |
| Management Style | ✅ | ❌ | ❌ | ❌ | From CSV (AM/AN/PN/SM/OT) |
| Dividend Policy | ✅ | ❌ | ❌ | ❌ | From CSV (Yes/No) |
| Currency | ❌ | ❌ | ⚠️ | ❌ | Assume THB or fetch if available |
| Benchmark | ❌ | ❌ | ⚠️ | ❌ | May be in SEC Fund Factsheet API |
| **Current NAV** |
| Current NAV | ❌ | ✅ | ✅ | ❌ | From `bvps` field |
| NAV Date | ❌ | ✅ | ✅ | ❌ | From `date` field |
| NAV Change (Baht) | ❌ | ✅ | ✅ | ✅ | Calculate: close - prior |
| NAV Change (%) | ❌ | ✅ | ✅ | ✅ | Calculate: (close - prior) / prior * 100 |
| **Trading Data** |
| Trading Volume | ❌ | ✅ | ✅ | ❌ | From `totalVolume` |
| Trading Value | ❌ | ✅ | ✅ | ❌ | From `totalValue` |
| P/NAV Ratio | ❌ | ✅ | ✅ | ❌ | From `pbv` field |
| **Performance Metrics** |
| YTD Return | ❌ | ❌ | ❌ | ✅ | Fetch historical, calculate from Jan 1 |
| 1 Week Return | ❌ | ❌ | ❌ | ✅ | Fetch 7 days ago NAV |
| 1 Month Return | ❌ | ❌ | ❌ | ✅ | Fetch 30 days ago NAV |
| 3 Months Return | ❌ | ❌ | ❌ | ✅ | Fetch 90 days ago NAV |
| 6 Months Return | ❌ | ❌ | ❌ | ✅ | Fetch 180 days ago NAV |
| 1 Year Return | ❌ | ❌ | ❌ | ✅ | Fetch 365 days ago NAV |
| 3 Year Return (Ann.) | ❌ | ❌ | ❌ | ✅ | Fetch 3 years, calculate CAGR |
| 5 Year Return (Ann.) | ❌ | ❌ | ❌ | ✅ | Fetch 5 years, calculate CAGR |
| 10 Year Return (Ann.) | ❌ | ❌ | ❌ | ✅ | Fetch 10 years, calculate CAGR |
| Since Inception Return | ❌ | ❌ | ❌ | ⚠️ | Need inception date |
| **Rankings** |
| Rank in RMF Category | ❌ | ❌ | ❌ | ⚠️ | Calculate from all funds (expensive) |
| Rank in AIMC Category | ❌ | ❌ | ❌ | ⚠️ | Calculate from all funds (expensive) |
| **Risk Metrics** |
| Standard Deviation | ❌ | ❌ | ❌ | ✅ | Calculate from historical NAV |
| Sharpe Ratio | ❌ | ❌ | ❌ | ⚠️ | Need risk-free rate |
| **Benchmark Data** |
| Benchmark Name | ❌ | ❌ | ⚠️ | ❌ | May be in SEC API |
| Benchmark Performance | ❌ | ❌ | ❌ | ❌ | Not available |
| **Portfolio Details** |
| Asset Allocation | ❌ | ❌ | ⚠️ | ❌ | May be in SEC Fund Factsheet |
| Top Holdings | ❌ | ❌ | ⚠️ | ❌ | May be in SEC Fund Factsheet |
| **Other** |
| Fees | ❌ | ❌ | ⚠️ | ❌ | May be in SEC Fund Factsheet |
| Min Subscription | ❌ | ❌ | ⚠️ | ❌ | May be in SEC Fund Factsheet |
| Fund Manager | ❌ | ❌ | ⚠️ | ❌ | May be in SEC Fund Factsheet |

**Legend:**
- ✅ Available and implemented
- ⚠️ Potentially available, needs investigation
- ❌ Not available
- 🔄 Can be calculated

---

## 3. Implementation Phases

### Phase 1: Investigation & Testing (Week 1)

**Objective**: Verify what data is actually available from SEC API

**Tasks:**
1. ✅ Kill existing dev server
2. ✅ Test current API endpoints with ABAPAC-RMF
3. Review SEC API documentation for Fund Factsheet endpoint
4. Test Fund Factsheet API to check for:
   - Asset allocation data
   - Portfolio holdings
   - Fees and subscription limits
   - Benchmark information
   - Inception date
5. Document actual API responses
6. Update data availability matrix with findings

**Deliverables:**
- API test results document
- Updated data availability matrix
- Recommendation on what can be implemented

---

### Phase 2: Historical Performance Calculation (Week 2)

**Objective**: Implement performance metric calculations using historical NAV data

**2.1 Backend Updates**

**File**: `server/services/secApi.ts`

**New Functions:**
```typescript
// Fetch historical NAV data for a fund
async function fetchHistoricalNAV(
  fundCode: string,
  startDate: string,
  endDate: string
): Promise<HistoricalNAVData[]>

// Calculate performance metrics
function calculatePerformanceMetrics(
  currentNAV: number,
  historicalData: HistoricalNAVData[]
): PerformanceMetrics

// Calculate annualized return (CAGR)
function calculateAnnualizedReturn(
  startNAV: number,
  endNAV: number,
  years: number
): number

// Calculate standard deviation
function calculateStandardDeviation(
  navHistory: number[]
): number
```

**Performance Metrics to Calculate:**
- YTD (Year-to-Date)
- 1 Week, 1 Month, 3 Months, 6 Months, 1 Year
- 3 Year, 5 Year, 10 Year (Annualized/CAGR)
- Standard Deviation (volatility)

**Caching Strategy:**
- Cache historical data for 24 hours
- Cache calculated metrics for 1 hour
- Invalidate cache on new NAV data

**2.2 Schema Updates**

**File**: `shared/schema.ts`

**New Types:**
```typescript
const PerformanceMetrics = z.object({
  ytd: z.number().nullable(),
  oneWeek: z.number().nullable(),
  oneMonth: z.number().nullable(),
  threeMonths: z.number().nullable(),
  sixMonths: z.number().nullable(),
  oneYear: z.number().nullable(),
  threeYearAnnualized: z.number().nullable(),
  fiveYearAnnualized: z.number().nullable(),
  tenYearAnnualized: z.number().nullable(),
  sinceInception: z.number().nullable(),
  standardDeviation: z.number().nullable(),
});

const RMFFundDetailEnhanced = RMFFundDetail.extend({
  // Add CSV metadata
  fundClassification: z.string().optional(),
  managementStyle: z.string().optional(),
  dividendPolicy: z.string().optional(),
  riskLevel: z.number().min(1).max(8).optional(),
  taxAllowance: z.string().optional(),

  // Add performance metrics
  performance: PerformanceMetrics.optional(),

  // Add benchmark if available
  benchmark: z.string().optional(),

  // Historical NAV data for charts
  historicalNAV: z.array(z.object({
    date: z.string(),
    nav: z.number(),
  })).optional(),
});
```

**2.3 API Route Updates**

**File**: `server/routes.ts`

**Enhanced Endpoint:**
```typescript
app.get("/api/rmf/:fundCode", async (req, res) => {
  const fundCode = req.params.fundCode;

  // 1. Fetch current NAV from SEC API
  const currentData = await fetchRMFFundDetail(fundCode);

  // 2. Load metadata from CSV
  const metadata = await getFundMetadataFromCSV(fundCode);

  // 3. Fetch historical NAV data (last 10 years)
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 10);
  const historicalData = await fetchHistoricalNAV(
    fundCode,
    startDate.toISOString().split('T')[0],
    endDate
  );

  // 4. Calculate performance metrics
  const performance = calculatePerformanceMetrics(
    currentData.nav,
    historicalData
  );

  // 5. Merge all data sources
  const enhancedDetail = {
    ...currentData,
    ...metadata,
    performance,
    historicalNAV: historicalData.slice(-365), // Last year for chart
  };

  res.json(enhancedDetail);
});
```

**2.4 Frontend Updates**

**File**: `client/src/pages/RMF.tsx` or new `client/src/pages/FundDetail.tsx`

**New Components:**
```typescript
// Performance metrics table
<PerformanceMetricsTable performance={fundDetail.performance} />

// Historical chart
<PerformanceChart data={fundDetail.historicalNAV} />

// Risk indicator
<RiskLevelIndicator level={fundDetail.riskLevel} />

// Fund metadata display
<FundMetadata
  classification={fundDetail.fundClassification}
  managementStyle={fundDetail.managementStyle}
  dividendPolicy={fundDetail.dividendPolicy}
/>
```

---

### Phase 3: CSV Integration (Week 2)

**Objective**: Load and merge CSV metadata with API data

**3.1 CSV Loader Service**

**File**: `server/services/csvLoader.ts` (NEW)

```typescript
import fs from 'fs';
import csv from 'csv-parser';

interface FundMetadata {
  symbol: string;
  fundName: string;
  amc: string;
  fundClassification: string;
  managementStyle: string;
  dividendPolicy: string;
  risk: number;
  taxAllowance: string;
}

let fundMetadataCache: Map<string, FundMetadata> | null = null;

// Load CSV on server start
export async function loadFundMetadata(): Promise<void> {
  const metadata = new Map<string, FundMetadata>();

  return new Promise((resolve, reject) => {
    fs.createReadStream('docs/rmf-funds.csv')
      .pipe(csv())
      .on('data', (row) => {
        metadata.set(row.Symbol, {
          symbol: row.Symbol,
          fundName: row['Fund Name'],
          amc: row.AMC,
          fundClassification: row['Fund Classification (AIMC)'],
          managementStyle: row['Management Style'],
          dividendPolicy: row['Dividend Policy'],
          risk: parseInt(row.Risk),
          taxAllowance: row['Fund for tax allowance'],
        });
      })
      .on('end', () => {
        fundMetadataCache = metadata;
        console.log(`✓ Loaded ${metadata.size} fund metadata records`);
        resolve();
      })
      .on('error', reject);
  });
}

// Get metadata for a specific fund
export function getFundMetadata(symbol: string): FundMetadata | null {
  if (!fundMetadataCache) {
    throw new Error('Fund metadata not loaded');
  }
  return fundMetadataCache.get(symbol) || null;
}

// Get all funds by classification
export function getFundsByClassification(classification: string): FundMetadata[] {
  if (!fundMetadataCache) {
    throw new Error('Fund metadata not loaded');
  }
  return Array.from(fundMetadataCache.values())
    .filter(fund => fund.fundClassification === classification);
}
```

**3.2 Server Initialization Update**

**File**: `server/index.ts`

```typescript
import { loadFundMetadata } from './services/csvLoader';

// Load CSV data on startup
loadFundMetadata()
  .then(() => {
    console.log('Fund metadata loaded successfully');
  })
  .catch(error => {
    console.error('Failed to load fund metadata:', error);
    process.exit(1);
  });
```

---

### Phase 4: Rankings Calculation (Week 3 - Optional)

**Objective**: Calculate fund rankings within peer groups

**⚠️ Note**: This is computationally expensive and may hit rate limits

**Approach 1: Pre-calculate Daily (Recommended)**
- Run a daily batch job to calculate rankings for all funds
- Store rankings in database or cache
- Serve from cache on API requests

**Approach 2: On-Demand Calculation**
- When fund detail is requested
- Fetch all funds in same classification
- Calculate and rank
- Cache for 24 hours

**Ranking Categories:**
- Rank within RMF funds of same classification (e.g., 5/6 in RMF EQASxJP)
- Rank within all funds of same classification (e.g., 36/77 in EQASxJP)

**Implementation:**
```typescript
async function calculateRankings(
  fundCode: string,
  classification: string,
  performance: PerformanceMetrics
): Promise<RankingInfo> {
  // Get all funds in same classification
  const peerFunds = getFundsByClassification(classification);

  // Fetch performance for all peer funds (EXPENSIVE!)
  const peerPerformance = await Promise.all(
    peerFunds.map(f => fetchAndCalculatePerformance(f.symbol))
  );

  // Rank by each metric
  const rankings = {
    ytdRank: calculateRank(performance.ytd, peerPerformance.map(p => p.ytd)),
    oneYearRank: calculateRank(performance.oneYear, peerPerformance.map(p => p.oneYear)),
    // ... etc
  };

  return rankings;
}
```

**Decision**: Defer to later phase due to:
- API rate limiting concerns (3,000 calls per 5 min)
- High computational cost
- Would need 410+ API calls per ranking calculation
- Better suited for batch processing

---

### Phase 5: Fund Factsheet Integration (Week 3)

**Objective**: Investigate and integrate SEC Fund Factsheet API

**Tasks:**
1. Review SEC Fund Factsheet API documentation
2. Test API endpoints for ABAPAC-RMF
3. Check if available:
   - Asset allocation breakdown
   - Top portfolio holdings
   - Fee structure
   - Minimum subscription amounts
   - Benchmark index name
   - Inception date
4. Implement data fetch if available
5. Update schema and display

**Conditional Implementation:**
- Only implement if SEC API provides this data
- If not available, mark as "Not Available" in UI

---

### Phase 6: Frontend Enhancement (Week 4)

**Objective**: Build comprehensive fund detail page UI

**6.1 New Components**

**Component Tree:**
```
FundDetailPage
├── FundHeader
│   ├── FundTitle (Name + Symbol)
│   ├── CurrentNAV (Large display)
│   └── NAVChange (with color coding)
├── FundInformation
│   ├── BasicInfo (AMC, Classification, Currency, etc.)
│   ├── RiskIndicator (visual 1-8 scale)
│   └── InvestmentPolicy
├── PerformanceSection
│   ├── PerformanceMetricsTable
│   │   ├── PerformanceRow (period, %, rank if available)
│   │   └── Color coding (green/red)
│   └── PerformanceChart (historical NAV)
├── AssetAllocation (if available)
│   ├── AllocationPieChart
│   └── AllocationTable
├── TopHoldings (if available)
│   └── HoldingsTable
└── OtherInformation
    ├── Fees (if available)
    └── SubscriptionLimits (if available)
```

**6.2 Routing Update**

**File**: `client/src/App.tsx`

```typescript
<Switch>
  <Route path="/" component={RMF} />
  <Route path="/fund/:symbol" component={FundDetail} />
  <Route component={NotFound} />
</Switch>
```

**6.3 UI/UX Considerations**

- Loading skeletons for async data
- Error states for missing data
- Graceful degradation (hide sections if data unavailable)
- Responsive design for mobile
- Dark/light theme support
- Print-friendly layout
- Export to PDF (optional)

---

## 4. Testing Strategy

### 4.1 Unit Tests

```typescript
// Performance calculation tests
describe('calculatePerformanceMetrics', () => {
  it('should calculate YTD correctly', () => {
    // Test with known data
  });

  it('should handle missing data gracefully', () => {
    // Test with gaps in historical data
  });

  it('should calculate annualized returns', () => {
    // Test CAGR calculation
  });
});

// CSV loader tests
describe('csvLoader', () => {
  it('should load all 410 funds', () => {
    // Verify count
  });

  it('should retrieve fund by symbol', () => {
    // Test getFundMetadata
  });
});
```

### 4.2 Integration Tests

```typescript
// API endpoint tests
describe('GET /api/rmf/ABAPAC-RMF', () => {
  it('should return enhanced fund detail', async () => {
    const response = await fetch('/api/rmf/ABAPAC-RMF');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('performance');
    expect(data).toHaveProperty('fundClassification');
  });
});
```

### 4.3 Manual Testing Checklist

**Test Funds:**
- ✅ ABAPAC-RMF (Asia Pacific equity)
- ✅ ABGDD-RMF (Global dividend)
- ✅ SCBRMGIF (Large cap equity)
- ✅ K-FIRMF (Fixed income)
- ✅ New fund (< 1 year old) - test partial data

**Test Scenarios:**
- Fund with complete 10-year history
- Fund with partial history (< 10 years)
- Fund with missing NAV data (holidays/weekends)
- Fund not in CSV (should handle gracefully)
- Invalid fund symbol
- API timeout/error handling

---

## 5. Performance Optimization

### 5.1 Caching Strategy

**Redis or In-Memory Cache:**
```typescript
// Cache layers
const CACHE_TTL = {
  fundMetadata: 24 * 60 * 60, // 24 hours (static data)
  currentNAV: 60 * 60,         // 1 hour (changes during trading)
  historicalNAV: 24 * 60 * 60, // 24 hours (historical data doesn't change)
  performance: 60 * 60,         // 1 hour (recalculate periodically)
  rankings: 24 * 60 * 60,      // 24 hours (expensive to calculate)
};
```

### 5.2 API Rate Limiting

**SEC API Rate Limit**: 3,000 calls per 5 minutes

**Mitigation:**
- Cache aggressively
- Batch requests where possible
- Implement request queue
- Monitor usage

### 5.3 Database Considerations

**Option**: Store calculated data in PostgreSQL

**Tables:**
```sql
-- Historical NAV cache
CREATE TABLE historical_nav (
  fund_code VARCHAR(50),
  date DATE,
  nav DECIMAL(10,4),
  PRIMARY KEY (fund_code, date)
);

-- Performance metrics cache
CREATE TABLE performance_metrics (
  fund_code VARCHAR(50) PRIMARY KEY,
  calculated_at TIMESTAMP,
  ytd DECIMAL(10,4),
  one_week DECIMAL(10,4),
  one_month DECIMAL(10,4),
  -- ... other metrics
);

-- Rankings cache
CREATE TABLE fund_rankings (
  fund_code VARCHAR(50),
  metric VARCHAR(50),
  rank INTEGER,
  total INTEGER,
  category VARCHAR(50),
  updated_at TIMESTAMP,
  PRIMARY KEY (fund_code, metric, category)
);
```

---

## 6. Risk & Mitigation

### 6.1 Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| SEC API doesn't provide needed data | High | Medium | Use alternative sources or mark unavailable |
| API rate limiting | High | High | Implement aggressive caching |
| Historical data incomplete | Medium | Medium | Handle gracefully, show partial data |
| Performance calculation errors | High | Low | Extensive testing with known values |
| CSV out of sync with API | Medium | Low | Regular updates, validation |

### 6.2 Fallback Strategy

If SEC API doesn't provide certain data:
- Asset allocation: Show "Not Available"
- Top holdings: Show "Not Available"
- Benchmark data: Show benchmark name only (from CSV if available)
- Rankings: Defer to Phase 4, mark as "Coming Soon"

---

## 7. Success Metrics

### 7.1 Functional Requirements

- ✅ Display current NAV with date
- ✅ Show fund metadata (name, AMC, classification, risk, etc.)
- ✅ Calculate and display performance metrics (YTD, 1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y)
- ✅ Show historical NAV chart (minimum 1 year)
- ⚠️ Display asset allocation (if available from SEC API)
- ⚠️ Display top holdings (if available from SEC API)
- ⚠️ Show rankings (deferred to Phase 4)

### 7.2 Performance Requirements

- Page load time: < 2 seconds
- API response time: < 500ms (cached), < 2s (uncached)
- Cache hit rate: > 80%
- API rate limit compliance: < 3,000 calls per 5 min

### 7.3 Quality Requirements

- Type safety: 100% TypeScript coverage
- Error handling: Graceful degradation for missing data
- Responsive: Works on mobile, tablet, desktop
- Accessible: WCAG 2.1 AA compliant
- Theme support: Dark/light mode

---

## 8. Timeline

### Week 1: Investigation
- Days 1-2: Test current SEC API, document responses
- Days 3-4: Investigate Fund Factsheet API for additional data
- Day 5: Finalize data availability matrix

### Week 2: Core Implementation
- Days 1-2: Implement historical NAV fetch and performance calculations
- Days 3-4: Integrate CSV metadata loader
- Day 5: Testing and bug fixes

### Week 3: Enhancement
- Days 1-2: Implement Fund Factsheet integration (if available)
- Days 3-4: Build frontend components
- Day 5: Integration testing

### Week 4: Polish
- Days 1-2: UI/UX refinement
- Days 3-4: Performance optimization
- Day 5: Final testing and deployment

**Total Estimated Time**: 4 weeks

---

## 9. Next Steps

### Immediate Actions (This Week):

1. **Test Current Implementation**
   - Start dev server
   - Test `/api/rmf?search=ABAPAC`
   - Test `/api/rmf/ABAPAC-RMF`
   - Document actual responses

2. **Investigate SEC Fund Factsheet API**
   - Review API documentation at https://api-portal.sec.or.th/
   - Test endpoints for ABAPAC-RMF
   - Document available fields

3. **Create Test Results Document**
   - Actual API responses
   - Updated data availability matrix
   - Recommendations

### Decision Points:

Before proceeding with full implementation, we need to answer:
1. ✅ What data can we get from SEC API?
2. ❓ Can we get historical NAV for 10 years?
3. ❓ Does Fund Factsheet API provide asset allocation and holdings?
4. ❓ Should we implement rankings (expensive) or defer?
5. ❓ Do we store calculated data in database or cache only?

---

## 10. Open Questions

1. **Historical Data Depth**: How far back does SEC API historical NAV data go?
2. **Inception Dates**: Where can we get fund inception dates for since-inception returns?
3. **Benchmark Data**: Can we get benchmark index performance for comparison?
4. **Fees**: Is fee information available from SEC API or only from fund prospectus?
5. **Fund Manager**: Is fund manager information available via API?
6. **Update Frequency**: How often is SEC API data updated? (daily, real-time?)
7. **Holiday Handling**: How should we handle missing data on non-trading days?

---

## Appendix A: Reference Screenshots

The implementation should match the following reference screens:

1. **Fund Information**: `attached_assets/image_1762745527223.png`
   - Fund header with NAV
   - Basic information table
   - Latest performance with rankings

2. **Risk & Performance**: `attached_assets/image_1762745884948.png`
   - Risk indicator
   - Historical performance vs benchmark table
   - Investment policy
   - Asset allocation pie chart
   - Top 5 holdings

3. **Backtesting**: `attached_assets/image_1762745896490.png`
   - Investment simulator
   - Capital gain calculator

---

## Appendix B: Sample API Responses

### Current SEC API Response (to be documented):
```json
{
  // To be filled after testing
}
```

### Enhanced Response (Target):
```json
{
  "symbol": "ABAPAC-RMF",
  "fundName": "abrdn Asia Pacific Equity Retirement Mutual Fund",
  "amc": "ABERDEEN ASSET MANAGEMENT (THAILAND) LIMITED",
  "fundClassification": "EQASxJP",
  "specialFeature": "RMF",
  "currency": "THB",
  "dividendPolicy": "No",
  "managementStyle": "AM",
  "riskLevel": 6,
  "benchmark": "68d MSCI AC Asia_Pacific ex Japan",
  "nav": {
    "current": 15.8339,
    "date": "2025-06-11",
    "change": 0.1234,
    "changePercent": 0.78
  },
  "performance": {
    "ytd": 13.54,
    "oneWeek": -1.21,
    "oneMonth": 2.40,
    "threeMonths": 12.24,
    "sixMonths": 22.16,
    "oneYear": 11.71,
    "threeYearAnnualized": 5.71,
    "fiveYearAnnualized": -0.05,
    "tenYearAnnualized": 2.62,
    "sinceInception": 3.07,
    "standardDeviation": 15.30
  },
  "rankings": {
    "ytd": { "rank": 5, "total": 6, "category": "RMF EQASxJP" },
    // ... other rankings if implemented
  },
  "historicalNAV": [
    { "date": "2024-06-11", "nav": 14.1234 },
    { "date": "2024-06-12", "nav": 14.2345 },
    // ... last 365 days
  ],
  "assetAllocation": [
    { "type": "Unit Trust", "percentage": 98.81 },
    { "type": "Promissory Note & Bill of Exchange", "percentage": 0.77 },
    { "type": "Derivatives", "percentage": 0.42 }
  ],
  "topHoldings": [
    { "symbol": "ABPACH SP", "name": "abrdn ASIA LIMITED", "percentage": 98.80 },
    // ... top 5
  ],
  "fees": {
    "maximum": null
  },
  "subscription": {
    "minFirst": 1000.00,
    "minAdditional": 1000.00,
    "minRedemption": null
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: November 10, 2025
**Status**: Ready for Review and Approval
