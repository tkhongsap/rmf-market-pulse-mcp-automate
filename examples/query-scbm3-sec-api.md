# Querying SCBM3 using SEC API

## API Configuration

```typescript
const SEC_API_BASE_URL = 'https://api.sec.or.th';
const SEC_FUND_FACTSHEET_KEY = '618a3ffe11944da093afa7fd33f10a28';
```

## Step 1: Search for Fund by Name

**Endpoint:** `POST /FundFactsheet/fund`

```bash
curl -X POST "https://api.sec.or.th/FundFactsheet/fund" \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: 618a3ffe11944da093afa7fd33f10a28" \
  -d '{"name": "SCBM3"}'
```

**Response:** Returns fund basic info including `proj_id` which is used for detailed queries.

## Step 2: Get Detailed Fund Information

Once you have the `proj_id`, you can query various endpoints:

### Basic Fund Information
```bash
GET /FundFactsheet/fund/amc/{proj_id}
```

### Fund Policy
```bash
GET /FundFactsheet/fund/{proj_id}/policy
```

### Asset Allocation
```bash
GET /FundFactsheet/fund/{proj_id}/asset
```

### Portfolio Holdings (Top 5)
```bash
GET /FundFactsheet/fund/{proj_id}/FundTop5/{period}
```
Parameters: `period` = YYYYMM (e.g., "202411" for November 2024)

### Fund Performance
```bash
GET /FundFactsheet/fund/{proj_id}/performance
```

### Returns
```bash
GET /FundFactsheet/fund/{proj_id}/return
```

### Risk Information
```bash
GET /FundFactsheet/fund/{proj_id}/risk
```

### Fees
```bash
GET /FundFactsheet/fund/{proj_id}/fee
```

### Dividend History
```bash
GET /FundFactsheet/fund/{proj_id}/dividend
```

## TypeScript Implementation

```typescript
interface SECAPIConfig {
  baseUrl: string;
  apiKey: string;
}

class SECFundAPI {
  private config: SECAPIConfig;

  constructor(apiKey: string) {
    this.config = {
      baseUrl: 'https://api.sec.or.th',
      apiKey,
    };
  }

  private async request<T>(method: 'GET' | 'POST', endpoint: string, body?: any): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Ocp-Apim-Subscription-Key': this.config.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`SEC API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  async searchFund(fundName: string) {
    return this.request('POST', '/FundFactsheet/fund', { name: fundName });
  }

  async getFundDetail(projId: string) {
    return this.request('GET', `/FundFactsheet/fund/amc/${projId}`);
  }

  async getFundPolicy(projId: string) {
    return this.request('GET', `/FundFactsheet/fund/${projId}/policy`);
  }

  async getFundAssetAllocation(projId: string) {
    return this.request('GET', `/FundFactsheet/fund/${projId}/asset`);
  }

  async getFundPerformance(projId: string) {
    return this.request('GET', `/FundFactsheet/fund/${projId}/performance`);
  }

  async getFundReturns(projId: string) {
    return this.request('GET', `/FundFactsheet/fund/${projId}/return`);
  }

  async getFundRisk(projId: string) {
    return this.request('GET', `/FundFactsheet/fund/${projId}/risk`);
  }

  async getFundFees(projId: string) {
    return this.request('GET', `/FundFactsheet/fund/${projId}/fee`);
  }

  async getFundTop5Holdings(projId: string, period: string) {
    return this.request('GET', `/FundFactsheet/fund/${projId}/FundTop5/${period}`);
  }
}

// Usage
const api = new SECFundAPI('618a3ffe11944da093afa7fd33f10a28');

async function getSCBM3Info() {
  // Step 1: Search for fund
  const searchResults = await api.searchFund('SCBM3');
  const fund = searchResults[0];

  // Step 2: Get detailed information
  const detail = await api.getFundDetail(fund.proj_id);
  const policy = await api.getFundPolicy(fund.proj_id);
  const assets = await api.getFundAssetAllocation(fund.proj_id);
  const performance = await api.getFundPerformance(fund.proj_id);
  const risk = await api.getFundRisk(fund.proj_id);
  const fees = await api.getFundFees(fund.proj_id);

  return {
    fund,
    detail,
    policy,
    assets,
    performance,
    risk,
    fees,
  };
}
```

## Available Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/FundFactsheet/fund` | POST | Search funds by name |
| `/FundFactsheet/fund/amc/{proj_id}` | GET | Basic fund information |
| `/FundFactsheet/fund/{proj_id}/policy` | GET | Investment policy |
| `/FundFactsheet/fund/{proj_id}/asset` | GET | Asset allocation |
| `/FundFactsheet/fund/{proj_id}/FundTop5/{period}` | GET | Top 5 holdings |
| `/FundFactsheet/fund/{proj_id}/FundPort/{period}` | GET | Full portfolio |
| `/FundFactsheet/fund/{proj_id}/performance` | GET | Performance metrics |
| `/FundFactsheet/fund/{proj_id}/return` | GET | Historical returns |
| `/FundFactsheet/fund/{proj_id}/risk` | GET | Risk metrics |
| `/FundFactsheet/fund/{proj_id}/fee` | GET | Fee structure |
| `/FundFactsheet/fund/{proj_id}/dividend` | GET | Dividend history |
| `/FundFactsheet/fund/{proj_id}/benchmark` | GET | Benchmark info |

## Rate Limits

- **3,000 calls per 5 minutes** per subscription key
- Implement rate limiting and caching for production use

## Authentication

All requests require the `Ocp-Apim-Subscription-Key` header with your SEC API key.

You can get API keys from: https://api-portal.sec.or.th/
