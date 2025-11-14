import type { SETSmartStockQuote, SETSmartFinancialData } from '@shared/schema';

// SETSmart API configuration
const SETSMART_API_BASE_URL = 'https://www.setsmart.com/api/listed-company-api';
const SETSMART_API_KEY = process.env.SEC_API_KEY;

// Rate limiting: 3000 calls per 5 minutes (300 seconds)
const RATE_LIMIT_WINDOW = 300000; // 5 minutes in ms
const RATE_LIMIT_MAX_CALLS = 3000;

interface RateLimitInfo {
  calls: number[];
  lastCleanup: number;
}

const rateLimiter: RateLimitInfo = {
  calls: [],
  lastCleanup: Date.now(),
};

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Check and enforce rate limiting
 */
function checkRateLimit(): boolean {
  const now = Date.now();

  // Clean up old calls outside the window
  if (now - rateLimiter.lastCleanup > 60000) { // Cleanup every minute
    rateLimiter.calls = rateLimiter.calls.filter(
      callTime => now - callTime < RATE_LIMIT_WINDOW
    );
    rateLimiter.lastCleanup = now;
  }

  // Check if we're within rate limit
  const recentCalls = rateLimiter.calls.filter(
    callTime => now - callTime < RATE_LIMIT_WINDOW
  );

  if (recentCalls.length >= RATE_LIMIT_MAX_CALLS) {
    return false; // Rate limit exceeded
  }

  rateLimiter.calls.push(now);
  return true;
}

/**
 * Get data from cache if available and not expired
 */
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Store data in cache with TTL
 */
function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Make authenticated request to SETSmart API
 */
async function setsmartApiRequest<T>(
  endpoint: string,
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
  }
): Promise<T> {
  const { cacheKey, cacheTTL } = options || {};

  // Check cache first
  if (cacheKey && cacheTTL) {
    const cached = getFromCache<T>(cacheKey);
    if (cached) {
      console.log(`[SETSmart API] Cache hit for ${cacheKey}`);
      return cached;
    }
  }

  // Check if API key is configured
  if (!SETSMART_API_KEY) {
    throw new Error('SEC_API_KEY environment variable is not configured');
  }

  // Check rate limit
  if (!checkRateLimit()) {
    throw new Error('SETSmart API rate limit exceeded (3000 calls per 5 minutes)');
  }

  const url = `${SETSMART_API_BASE_URL}${endpoint}`;
  console.log(`[SETSmart API] GET ${endpoint}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': SETSMART_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SETSmart API] Error ${response.status}: ${errorText}`);
    throw new Error(`SETSmart API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as T;
  console.log(`[SETSmart API] Response received, data length:`, Array.isArray(data) ? data.length : 'object');

  // Cache the result
  if (cacheKey && cacheTTL) {
    setCache(cacheKey, data, cacheTTL);
  }

  return data;
}

/**
 * Fetch EOD stock price by symbol
 * @param symbol Stock symbol (e.g., "PTT", "AOT", "EGCO")
 * @param startDate Start date in YYYY-MM-DD format
 * @param endDate Optional end date in YYYY-MM-DD format (max 6 years)
 * @param adjustedPriceFlag 'Y' for adjusted prices, 'N' for original prices
 */
export async function fetchStockQuoteBySymbol(
  symbol: string,
  startDate: string,
  endDate?: string,
  adjustedPriceFlag: 'Y' | 'N' = 'Y'
): Promise<SETSmartStockQuote[]> {
  try {
    const endDateParam = endDate ? `&endDate=${endDate}` : '';
    const endpoint = `/eod-price-by-symbol?symbol=${symbol}&startDate=${startDate}${endDateParam}&adjustedPriceFlag=${adjustedPriceFlag}`;

    const quotes = await setsmartApiRequest<SETSmartStockQuote[]>(
      endpoint,
      {
        cacheKey: `stock-${symbol}-${startDate}-${endDate || 'latest'}-${adjustedPriceFlag}`,
        cacheTTL: 60 * 60 * 1000, // 1 hour cache
      }
    );

    console.log(`[SETSmart API] Fetched ${quotes.length} quotes for ${symbol}`);
    return quotes;
  } catch (error) {
    console.error(`Error fetching stock quote for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch EOD stock prices by security type for a specific date
 * @param securityType Security type: All, CS, CSF, PS, PSF, W, TSR, DWC, DWP, DR, ETF, UT
 * @param date Date in YYYY-MM-DD format
 * @param adjustedPriceFlag 'Y' for adjusted prices, 'N' for original prices
 */
export async function fetchStockQuoteBySecurityType(
  securityType: string,
  date: string,
  adjustedPriceFlag: 'Y' | 'N' = 'Y'
): Promise<SETSmartStockQuote[]> {
  try {
    const endpoint = `/eod-price-by-security-type?securityType=${securityType}&date=${date}&adjustedPriceFlag=${adjustedPriceFlag}`;

    const quotes = await setsmartApiRequest<SETSmartStockQuote[]>(
      endpoint,
      {
        cacheKey: `stocks-${securityType}-${date}-${adjustedPriceFlag}`,
        cacheTTL: 24 * 60 * 60 * 1000, // 24 hour cache for historical data
      }
    );

    console.log(`[SETSmart API] Fetched ${quotes.length} quotes for ${securityType} on ${date}`);
    return quotes;
  } catch (error) {
    console.error(`Error fetching stock quotes for ${securityType}:`, error);
    throw error;
  }
}

/**
 * Fetch financial data and ratios by symbol
 * @param symbol Stock symbol
 * @param startYear Fiscal year in YYYY format
 * @param startQuarter Fiscal quarter (1-4)
 * @param endYear Optional end fiscal year
 * @param endQuarter Optional end fiscal quarter
 */
export async function fetchFinancialDataBySymbol(
  symbol: string,
  startYear: string,
  startQuarter: number,
  endYear?: string,
  endQuarter?: number
): Promise<SETSmartFinancialData[]> {
  try {
    let endpoint = `/financial-data-and-ratio-by-symbol?symbol=${symbol}&startYear=${startYear}&startQuarter=${startQuarter}`;

    if (endYear && endQuarter) {
      endpoint += `&endYear=${endYear}&endQuarter=${endQuarter}`;
    }

    const financialData = await setsmartApiRequest<SETSmartFinancialData[]>(
      endpoint,
      {
        cacheKey: `financial-${symbol}-${startYear}-Q${startQuarter}-${endYear || 'latest'}`,
        cacheTTL: 24 * 60 * 60 * 1000, // 24 hour cache
      }
    );

    console.log(`[SETSmart API] Fetched ${financialData.length} financial records for ${symbol}`);
    return financialData;
  } catch (error) {
    console.error(`Error fetching financial data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch financial data and ratios for all symbols in a specific quarter
 * @param accountPeriod 'F' for Fiscal Year, 'C' for Calendar Year
 * @param year Year in YYYY format
 * @param quarter Quarter (1-4)
 */
export async function fetchFinancialDataAllSymbols(
  accountPeriod: 'F' | 'C',
  year: string,
  quarter: number
): Promise<SETSmartFinancialData[]> {
  try {
    const endpoint = `/financial-data-and-ratio?accountPeriod=${accountPeriod}&year=${year}&quarter=${quarter}`;

    const financialData = await setsmartApiRequest<SETSmartFinancialData[]>(
      endpoint,
      {
        cacheKey: `financial-all-${accountPeriod}-${year}-Q${quarter}`,
        cacheTTL: 24 * 60 * 60 * 1000, // 24 hour cache
      }
    );

    console.log(`[SETSmart API] Fetched ${financialData.length} financial records for all symbols`);
    return financialData;
  } catch (error) {
    console.error(`Error fetching financial data for all symbols:`, error);
    throw error;
  }
}

/**
 * Test API connectivity
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    if (!SETSMART_API_KEY) {
      console.error('[SETSmart API] API key not configured');
      return false;
    }

    // Try to fetch a simple query - get PTT stock for yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    await fetchStockQuoteBySymbol('PTT', dateStr, dateStr, 'Y');
    console.log('[SETSmart API] Connection test successful');
    return true;
  } catch (error) {
    console.error('[SETSmart API] Connection test failed:', error);
    return false;
  }
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cache.clear();
  console.log('[SETSmart API] Cache cleared');
}
