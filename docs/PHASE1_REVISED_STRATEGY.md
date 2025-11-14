# Phase 1 Revised Strategy: ABAPAC-RMF Testing

**Project**: Thai RMF Market Pulse  
**Branch**: feature/abapac-rmf-testing  
**Date**: November 10, 2025  
**Status**: Strategic Pivot Required  

---

## 🚨 CRITICAL FINDING

**SETSMART API does not contain RMF fund data.**

### Discovery
During Phase 1 testing, we attempted to query ABAPAC-RMF through the SETSMART API endpoints:
- `GET /eod-price-by-symbol` → Returns 404 "Invalid Stock Name"
- `GET /eod-price-by-security-type?securityType=UT` → Returns empty array `[]`

### Root Cause Analysis
1. **SETSMART API Coverage**: Only covers securities **listed and traded on SET** (Stock Exchange of Thailand)
   - Common stocks (CS)
   - ETFs traded on SET
   - Warrants, DRs, etc.
   - UT = Unit Trusts that trade on SET exchange

2. **RMF Fund Nature**: RMF (Retirement Mutual Funds) are **off-exchange securities**
   - Not traded on SET exchange
   - Registered with SEC (Securities and Exchange Commission)
   - Bought/sold through fund management companies
   - NAV calculated daily, not traded in real-time

3. **Symbol Mismatch**: CSV symbols like "ABAPAC-RMF" are **SEC fund codes**, not SET ticker symbols

### Architect Recommendation
> **"Pivot to SEC Fund APIs (Factsheet + Daily Info) and build an explicit fund-code mapping table; SETSMART lacks RMF coverage."**

---

## ✅ CORRECT DATA SOURCE

### Thailand SEC Fund APIs

Thailand SEC provides two key APIs for mutual fund data:

#### 1. **SEC Fund Daily Info API**
**Purpose**: Daily NAV and trading data for all mutual funds

**Base URL**: `https://api.sec.or.th/FundDailyInfo/`

**Expected Data**:
- Daily NAV values
- NAV change
- Fund status
- Trading data

**Use Case**: 
- Current NAV display
- Historical NAV for performance calculations
- NAV change tracking

#### 2. **SEC Fund Factsheet API**
**Purpose**: Comprehensive fund metadata and portfolio information

**Base URL**: `https://api.sec.or.th/FundFactsheet/`

**Expected Data**:
- Fund policy and objectives
- Benchmark information ⭐
- Fee structure
- Asset allocation ⭐
- Portfolio holdings ⭐
- Fund manager information
- Risk metrics
- Historical performance data

**Key Endpoints**:
```
GET /FundFactsheet/fund/{proj_id}/policy
GET /FundFactsheet/fund/{proj_id}/fee
GET /FundFactsheet/fund/{proj_id}/fund_hist
GET /FundFactsheet/fund/{proj_id}/buy_and_hold
GET /FundFactsheet/fund/{proj_id}/fund_manager
```

---

## 📋 REVISED PHASE 1 PLAN

### Objective
Test SEC Fund APIs with ABAPAC-RMF to determine data availability for enhanced fund detail page.

### Prerequisites

#### Step 1: SEC API Portal Access
1. ✅ Verify we have subscription to SEC APIs at https://api-portal.sec.or.th
2. ✅ Check if `SEC_API_KEY` environment variable works for SEC endpoints
3. ⚠️ Determine if we need separate subscription keys for:
   - Fund Daily Info API
   - Fund Factsheet API

#### Step 2: Project ID Mapping
**Critical Issue**: SEC Fund Factsheet API uses `{proj_id}`, not fund symbols

**Need to discover**:
- What is the `proj_id` for ABAPAC-RMF?
- Is there an endpoint to lookup `proj_id` by symbol?
- Do we need to build a mapping table?

**Possible Solutions**:
1. SEC API may have a fund search/lookup endpoint
2. Fund Daily Info API may return `proj_id` alongside symbol
3. May need to scrape or manually map from SEC website

---

## 🔬 TESTING STRATEGY

### Test 1: SEC Fund Daily Info API
**Goal**: Retrieve current and historical NAV for ABAPAC-RMF

**Test Steps**:
1. Research SEC Fund Daily Info API documentation
2. Identify correct endpoint for NAV data
3. Determine required parameters (fund code, date range)
4. Test with ABAPAC-RMF symbol
5. Document response structure
6. Verify we can get:
   - Current NAV
   - Historical NAV (for performance calculations)

**Expected Outcome**:
```json
{
  "fund_code": "ABAPAC-RMF",
  "nav_date": "2025-11-08",
  "nav": 15.8339,
  "previous_nav": 15.6234,
  "nav_change": 0.2105,
  "nav_change_percent": 1.35
}
```

### Test 2: SEC Fund Factsheet API - Fund Lookup
**Goal**: Find the `proj_id` for ABAPAC-RMF

**Test Steps**:
1. Research fund search/lookup endpoints
2. Test searching by symbol "ABAPAC-RMF"
3. Test searching by fund name "abrdn Asia Pacific"
4. Document the `proj_id` value
5. Create mapping strategy

### Test 3: SEC Fund Factsheet API - Fund Policy
**Goal**: Retrieve benchmark and investment policy

**Endpoint**: `GET /FundFactsheet/fund/{proj_id}/policy`

**Expected Data**:
- Benchmark name (e.g., "MSCI AC Asia Pacific ex Japan")
- Investment policy description
- Asset allocation guidelines
- Fund objectives

### Test 4: SEC Fund Factsheet API - Asset Allocation
**Goal**: Retrieve current asset allocation breakdown

**Expected Data**:
- Asset class percentages
- Geographic allocation
- Top holdings list

### Test 5: SEC Fund Factsheet API - Fees
**Goal**: Retrieve fee structure

**Expected Data**:
- Management fee
- Front-end load
- Back-end load
- Other fees

---

## 🛠️ IMPLEMENTATION TASKS

### Task 1: Create SEC Fund API Service
**File**: `server/services/secFundApi.ts` (NEW)

**Features**:
- Authentication with SEC API
- Rate limiting (3,000 calls per 5 minutes)
- Caching strategy
- Error handling
- Response type definitions

**Functions**:
```typescript
// Fund Daily Info API
export async function fetchFundDailyNAV(fundCode: string, date?: string): Promise<FundDailyNAV>
export async function fetchFundHistoricalNAV(fundCode: string, startDate: string, endDate: string): Promise<FundDailyNAV[]>

// Fund Factsheet API
export async function lookupFundProjectId(symbol: string): Promise<string>
export async function fetchFundPolicy(projId: string): Promise<FundPolicy>
export async function fetchFundFees(projId: string): Promise<FundFees>
export async function fetchFundAssetAllocation(projId: string): Promise<AssetAllocation>
export async function fetchFundHoldings(projId: string): Promise<FundHolding[]>
```

### Task 2: Update Type Definitions
**File**: `shared/schema.ts`

Add types for SEC API responses:
```typescript
export const FundDailyNAV = z.object({
  fundCode: z.string(),
  navDate: z.string(),
  nav: z.number(),
  previousNav: z.number().optional(),
  navChange: z.number().optional(),
  navChangePercent: z.number().optional(),
});

export const FundPolicy = z.object({
  projId: z.string(),
  benchmark: z.string().optional(),
  investmentPolicy: z.string().optional(),
  fundObjective: z.string().optional(),
});

export const AssetAllocation = z.object({
  assetClass: z.string(),
  percentage: z.number(),
  value: z.number().optional(),
});

export const FundHolding = z.object({
  securityName: z.string(),
  percentage: z.number(),
  value: z.number().optional(),
});
```

### Task 3: Deprecate SETSMART for RMF
**File**: `server/services/secApi.ts`

**Options**:
1. **Keep for future use** (if we add SET-listed securities later)
2. **Remove entirely** (simplify codebase)
3. **Rename to `setSmartApi.ts`** (clarify scope)

**Recommendation**: Keep but rename, add clear documentation that it's only for SET-listed securities, not RMF funds.

### Task 4: Update API Routes
**File**: `server/routes.ts`

Replace SETSMART calls with SEC Fund API calls:

```typescript
// OLD (doesn't work for RMF):
import { fetchRMFFundDetail } from './services/secApi';

// NEW (correct for RMF):
import { 
  fetchFundDailyNAV,
  fetchFundPolicy,
  lookupFundProjectId 
} from './services/secFundApi';
import { getFundMetadata } from './services/csvLoader';

app.get("/api/rmf/:fundCode", async (req, res) => {
  const fundCode = req.params.fundCode;
  
  // 1. Get metadata from CSV
  const metadata = getFundMetadata(fundCode);
  
  // 2. Get current NAV from SEC Fund Daily Info API
  const navData = await fetchFundDailyNAV(fundCode);
  
  // 3. Get fund details from SEC Fund Factsheet API
  const projId = await lookupFundProjectId(fundCode);
  const policy = await fetchFundPolicy(projId);
  
  // 4. Merge all data
  const fundDetail = {
    ...metadata,
    ...navData,
    benchmark: policy.benchmark,
    // ... more fields
  };
  
  res.json(fundDetail);
});
```

---

## 📊 DATA AVAILABILITY MATRIX (REVISED)

| Data Field | CSV | SETSMART | SEC Daily Info | SEC Factsheet | Calculated |
|------------|-----|----------|----------------|---------------|------------|
| **Basic Information** |
| Fund Symbol | ✅ | ❌ | ⏳ | ⏳ | - |
| Fund Name | ✅ | ❌ | ⏳ | ⏳ | - |
| AMC Name | ✅ | ❌ | ⏳ | ⏳ | - |
| Classification | ✅ | ❌ | ⏳ | ⏳ | - |
| Benchmark | ❌ | ❌ | ❌ | ⏳ | - |
| **Current NAV** |
| NAV Value | - | ❌ | ⏳ | ⏳ | - |
| NAV Date | - | ❌ | ⏳ | ⏳ | - |
| NAV Change | - | ❌ | ⏳ | - | ✅ |
| **Performance** |
| Historical NAV | - | ❌ | ⏳ | ⏳ | - |
| Performance Metrics | - | ❌ | - | - | ⏳ |
| **Portfolio** |
| Asset Allocation | - | ❌ | ❌ | ⏳ | - |
| Top Holdings | - | ❌ | ❌ | ⏳ | - |
| **Other** |
| Fees | - | ❌ | ❌ | ⏳ | - |

**Legend**:
- ✅ Confirmed available
- ⏳ Testing required
- ❌ Not available in this source

---

## 🎯 SUCCESS CRITERIA (REVISED)

### Phase 1 Complete When:
1. ✅ Successfully queried ABAPAC-RMF from SEC Fund Daily Info API
2. ✅ Retrieved current NAV and verified against screenshot (15.8339)
3. ✅ Retrieved historical NAV data for performance calculation
4. ✅ Found `proj_id` for ABAPAC-RMF
5. ✅ Retrieved fund policy with benchmark information
6. ⚠️ Retrieved asset allocation (if available)
7. ⚠️ Retrieved top holdings (if available)
8. ✅ Created comprehensive test results document
9. ✅ Updated implementation plan with revised strategy

---

## 🚧 BLOCKERS & RISKS

### Critical Blockers
1. **SEC API Access**: Need to verify we have active subscription
2. **Project ID Mapping**: Need to discover how to lookup `proj_id` from symbol
3. **API Documentation**: May need to research SEC API portal for endpoint details

### Mitigation Strategy
1. Check SEC API portal documentation immediately
2. Test authentication with existing SEC_API_KEY
3. If blocked, contact SEC API support (repcenter@sec.or.th)
4. Document all findings for future reference

---

## 📝 NEXT IMMEDIATE ACTIONS

1. ✅ Document this strategic pivot
2. ⚠️ Research SEC Fund Daily Info API endpoints
3. ⚠️ Research SEC Fund Factsheet API endpoints
4. ⚠️ Test authentication with SEC_API_KEY
5. ⚠️ Create secFundApi.ts service
6. ⚠️ Test with ABAPAC-RMF
7. ⚠️ Document actual responses
8. ⚠️ Update implementation plan

---

## 📚 RESOURCES

- **SEC API Portal**: https://api-portal.sec.or.th
- **SEC API Documentation**: https://api-portal.sec.or.th/apis
- **SEC Support Email**: repcenter@sec.or.th
- **Rate Limit**: 3,000 calls per 300 seconds (5 minutes)

---

**Status**: Ready to pivot to SEC Fund APIs  
**Next Step**: Research and test SEC Fund Daily Info API  
**Document Version**: 1.0  
**Last Updated**: November 10, 2025
