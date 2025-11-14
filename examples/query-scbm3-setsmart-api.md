# Querying SCBM3 using SET SMART API (Current Implementation)

## Overview

The current implementation in `server/services/secApi.ts` uses the **SET SMART API** which provides:
- Daily NAV (Net Asset Value) data
- Trading volume and value
- Price changes (P/NAV for Unit Trusts)
- Historical EOD (End of Day) prices

## API Configuration

```typescript
const SETSMART_API_BASE_URL = 'https://www.setsmart.com/api/listed-company-api';
const SETSMART_API_KEY = process.env.SEC_API_KEY;
```

## Query SCBM3 via Current REST API

### 1. Search for SCBM3
```bash
GET http://localhost:5000/api/rmf?search=SCBM3
```

Response:
```json
{
  "funds": [
    {
      "symbol": "SCBM3",
      "fundName": "SCBM3 Unit Trust",
      "securityType": "UT",
      "nav": 15.2345,
      "navChange": 0.0123,
      "navChangePercent": 0.08,
      "navDate": "2025-11-10",
      "priorNav": 15.2222,
      "pnav": 1.05,
      "totalVolume": 1000000,
      "totalValue": 15234500,
      "dividendYield": 2.5,
      "lastUpdate": "2025-11-10T10:00:00Z"
    }
  ],
  "total": 1,
  "timestamp": "2025-11-10T10:00:00Z"
}
```

### 2. Get SCBM3 Detail
```bash
GET http://localhost:5000/api/rmf/SCBM3
```

Response:
```json
{
  "fund": {
    "symbol": "SCBM3",
    "fundName": "SCBM3 Unit Trust",
    "securityType": "UT",
    "nav": 15.2345,
    "navChange": 0.0123,
    "navChangePercent": 0.08,
    "navDate": "2025-11-10",
    "priorNav": 15.2222,
    "pnav": 1.05,
    "totalVolume": 1000000,
    "totalValue": 15234500,
    "dividendYield": 2.5,
    "lastUpdate": "2025-11-10T10:00:00Z"
  },
  "timestamp": "2025-11-10T10:00:00Z"
}
```

## TypeScript Implementation (Already in Codebase)

The implementation is in `server/services/secApi.ts`:

```typescript
// Current implementation already supports SCBM3 queries:

// 1. Get all RMF funds (includes SCBM3)
const { funds, total } = await fetchRMFFunds({ page: 1, pageSize: 20 });

// 2. Search for specific fund
const scbm3Funds = await searchRMFFunds('SCBM3');

// 3. Get detailed fund information
const scbm3Detail = await fetchRMFFundDetail('SCBM3');
```

## SET SMART API Endpoints Used

### Get EOD Price by Symbol
```typescript
GET /eod-price-by-symbol?symbol=SCBM3&startDate=2025-11-10&endDate=2025-11-10&adjustedPriceFlag=N
```

Headers:
```
api-key: {YOUR_SETSMART_API_KEY}
Content-Type: application/json
```

Response:
```json
[
  {
    "date": "2025-11-10",
    "symbol": "SCBM3",
    "securityType": "UT",
    "adjustedPriceFlag": "N",
    "prior": 15.2222,
    "open": 15.2300,
    "high": 15.2400,
    "low": 15.2200,
    "close": 15.2345,
    "average": 15.2300,
    "totalVolume": 1000000,
    "totalValue": 15230000,
    "bvps": 15.2345,
    "pbv": 1.05,
    "dividendYield": 2.5
  }
]
```

### Get All Unit Trusts for a Date
```typescript
GET /eod-price-by-security-type?securityType=UT&date=2025-11-10&adjustedPriceFlag=N
```

This returns all Unit Trusts (mutual funds) including SCBM3.

## Data Fields Explanation

| Field | Description |
|-------|-------------|
| `symbol` | Fund symbol (e.g., "SCBM3") |
| `securityType` | "UT" for Unit Trust |
| `bvps` | Book Value Per Share = NAV |
| `close` | Closing NAV |
| `prior` | Previous NAV |
| `pbv` | Price to Book Value = P/NAV ratio |
| `totalVolume` | Trading volume |
| `totalValue` | Trading value in Baht |
| `dividendYield` | Dividend yield % |

## Caching Strategy

The current implementation uses in-memory caching:
- **Fund lists:** 1 hour TTL
- **Individual fund data:** 1 hour TTL

## Rate Limiting

- **3,000 calls per 5 minutes**
- The implementation includes automatic rate limit checking

## Example Usage in Client

```typescript
import { useQuery } from '@tanstack/react-query';

function SCBM3Component() {
  // Search for SCBM3
  const { data, isLoading } = useQuery({
    queryKey: ['/api/rmf', { search: 'SCBM3' }],
    queryFn: async () => {
      const res = await fetch('/api/rmf?search=SCBM3');
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  const scbm3 = data?.funds[0];

  return (
    <div>
      <h1>{scbm3.fundName}</h1>
      <p>NAV: {scbm3.nav}</p>
      <p>Change: {scbm3.navChangePercent}%</p>
      <p>Volume: {scbm3.totalVolume?.toLocaleString()}</p>
    </div>
  );
}
```

## Testing the Current Implementation

Start the development server:
```bash
npm run dev
```

Then query SCBM3:
```bash
# Search
curl "http://localhost:5000/api/rmf?search=SCBM3"

# Get detail
curl "http://localhost:5000/api/rmf/SCBM3"
```
