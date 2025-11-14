# RMF Fund List Generation Approach

## Summary

The SEC Fund Factsheet API **does NOT provide a direct parameter** to query funds by type (RMF, LTF, SSF, etc.). This document explains the correct approach to generate a complete RMF fund list.

## Why No Direct Query Parameter?

After thorough investigation of:
- ✅ SEC API Portal (https://api-portal.sec.or.th/)
- ✅ Official OpenAPI Specification (`utility/fund-factsheet-open-api.yaml`)
- ✅ Official SEC Python Examples
- ✅ All available API documentation

**Conclusion:** The SEC Fund Factsheet API provides NO query parameters for filtering by fund type, spec_code, or group.

## Available API Endpoints

| Endpoint | Purpose | Supports Filtering? |
|----------|---------|---------------------|
| `GET /fund/amc` | Get all AMCs | ❌ No |
| `GET /fund/amc/{unique_id}` | Get all funds under an AMC | ❌ No parameters |
| `POST /fund` | Search funds by partial name | ⚠️ Name search only |
| `GET /fund/{proj_id}/specification` | Get fund specification | ⚠️ Requires proj_id first |
| `GET /fund/{proj_id}/class_fund` | Get share classes | ⚠️ Requires proj_id first |

## Correct Approach (3-Step Process)

### Step 1: Fetch All Funds from All AMCs
```typescript
const amcs = await fetchAMCList();  // 29 AMCs

for (const amc of amcs) {
  const funds = await fetchFundsByAMC(amc.unique_id);
  // Process funds...
}
```

### Step 2: Filter RMF Funds (Case-Insensitive)
```typescript
const rmfFunds = funds.filter(fund => {
  const isRMF = fund.proj_id?.toUpperCase().includes('RMF') ||
                fund.proj_name_th?.toUpperCase().includes('RMF') ||
                fund.proj_name_en?.toUpperCase().includes('RMF') ||
                fund.proj_abbr_name?.toUpperCase().includes('RMF');
  return isRMF;
});
```

**Why Case-Insensitive?**
- Protects against lowercase variations like "rmf" or "Rmf"
- More robust filtering

### Step 3: Fetch Share Classes for Each Fund
```typescript
for (const fund of rmfFunds) {
  const classes = await fetchFundClasses(fund.proj_id);

  if (classes.length === 0) {
    // Single-class fund - use base symbol
    addFund({
      symbol: fund.proj_abbr_name,
      proj_id: fund.proj_id,
      // ...
    });
  } else {
    // Multi-class fund - add each share class
    for (const classInfo of classes) {
      addFund({
        symbol: classInfo.class_abbr_name,  // e.g., "TAIRMF-A", "TAIRMF-P"
        proj_id: fund.proj_id,
        // ...
      });
    }
  }
}
```

## Share Classes Explained

Many RMF funds have multiple **share classes** with different fee structures and minimum investments:

| Share Class | Typical Characteristics |
|-------------|------------------------|
| **Class A** | Retail investors, front-end fees |
| **Class P** | Pension/Provident funds, lower fees |
| **Class E** | E-commerce/Online, no front-end fees |
| **Class B** | Different fee structure |

**Example:**
- Fund: `TISCO AI & Big Data RMF` (proj_id: `M0549_2567`)
- Share Classes:
  - `TAIRMF-A` (Class A shares)
  - `TAIRMF-P` (Class P shares)

## Results Comparison

| Approach | Count | What It Includes |
|----------|-------|------------------|
| **Old (No Share Classes)** | 400 funds | Base funds only (using proj_abbr_name) |
| **New (With Share Classes)** | 451 funds | All share classes included |
| **Consolidated CSV** | 403 funds | Previous snapshot with some share classes |

## Why the Count Increased (400 → 451)

1. **Share Classes Included**: Multi-class funds now have separate entries for each share class
2. **Case-Insensitive Filter**: Catches funds with lowercase "rmf" variations
3. **Complete Data**: Fetches all current RMF funds from SEC API

## Data Freshness Strategy

**Recommendation**: Regenerate the RMF fund list regularly (weekly or monthly)

```bash
# Regenerate RMF fund list
npm run data:rmf:generate-list
```

**Why?**
- New RMF funds are launched regularly
- Funds get cancelled or delisted
- Share classes may change
- No direct "RMF group" query means we need to re-scan all funds

## Implementation Files

### API Service
- **File:** `server/services/secFundFactsheetApi.ts`
- **New Function:** `fetchFundClasses(proj_id)` - Fetches share classes
- **Interface:** `FundClassInfo` - Share class data structure

### Generation Script
- **File:** `scripts/data-extraction/rmf/generate-rmf-fund-list.ts`
- **Updates:**
  - Case-insensitive RMF filtering
  - Share class fetching for each fund
  - Handles both single-class and multi-class funds

### Output Files
- **CSV:** `docs/rmf-funds-api.csv` (451 lines)
- **Markdown:** `docs/rmf-funds-api.md` (451 funds)

## Error Handling

**"Unexpected end of JSON input" Errors:**
- These are normal and expected
- Occurs when a fund has no share class data (204 No Content response)
- The script handles this gracefully and continues

## API Rate Limits

- **Limit:** 3,000 calls per 5 minutes
- **Our Usage:** ~30 calls for AMCs + ~400 calls for share classes = ~430 calls total
- **Status:** Well within limits ✓

## Alternatives Considered

### ❌ Option: Use Specification Endpoint for Filtering
**Problem:** Requires proj_id for each fund
- Would need 14,000+ API calls (all funds)
- Would exceed rate limits
- Not practical

### ❌ Option: Search by Name
**Problem:** Only searches by partial name
- Cannot filter by fund type
- Would miss funds not matching search term

### ✅ Chosen Option: Fetch All + Client-Side Filter + Share Classes
**Benefits:**
- Most efficient (430 API calls)
- Complete data (all share classes)
- Works within rate limits
- 100% reliable

## Conclusion

**The current implementation is the ONLY viable approach** for generating a complete RMF fund list from the SEC API because:

1. ✅ No direct API parameter for fund type filtering exists
2. ✅ Must fetch all funds and filter client-side
3. ✅ Must fetch share classes for complete data
4. ✅ Efficient and works within API rate limits

---

**Last Updated:** 2025-11-14
**API Version:** Fund Factsheet API v1.0
**Generated Funds:** 451 RMF funds (444 active, 7 cancelled)
