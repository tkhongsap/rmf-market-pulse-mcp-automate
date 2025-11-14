/**
 * SEC Fund Daily Info API Service
 *
 * Thailand Securities and Exchange Commission (SEC) API for mutual fund daily data
 * API Portal: https://api-portal.sec.or.th/
 *
 * This service provides access to:
 * - Daily NAV (Net Asset Value) data for mutual funds
 * - Dividend history
 * - Asset Management Company (AMC) lists
 *
 * Rate Limit: 3,000 API calls per 5 minutes
 */

// SEC Fund Daily Info API configuration
const SEC_API_BASE_URL = 'https://api.sec.or.th/FundDailyInfo';
const SEC_FUND_DAILY_INFO_KEY = process.env.SEC_FUND_DAILY_INFO_KEY;

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
 * Make authenticated request to SEC Fund Daily Info API
 */
async function secFundDailyInfoApiRequest<T>(
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
      console.log(`[SEC Fund Daily Info API] Cache hit for ${cacheKey}`);
      return cached;
    }
  }

  // Check if API key is configured
  if (!SEC_FUND_DAILY_INFO_KEY) {
    throw new Error('SEC_FUND_DAILY_INFO_KEY environment variable is not configured');
  }

  // Check rate limit
  if (!checkRateLimit()) {
    throw new Error('SEC Fund Daily Info API rate limit exceeded (3000 calls per 5 minutes)');
  }

  const url = `${SEC_API_BASE_URL}${endpoint}`;
  console.log(`[SEC Fund Daily Info API] GET ${endpoint}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Ocp-Apim-Subscription-Key': SEC_FUND_DAILY_INFO_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'cache-control': 'no-cache',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SEC Fund Daily Info API] Error ${response.status}: ${errorText}`);
    throw new Error(`SEC Fund Daily Info API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as T;
  console.log(`[SEC Fund Daily Info API] Response received`);

  // Cache the result
  if (cacheKey && cacheTTL) {
    setCache(cacheKey, data, cacheTTL);
  }

  return data;
}

/**
 * Fund Daily NAV Data Response Type (actual SEC API format)
 */
export interface FundDailyNav {
  nav_date: string;         // NAV date (YYYY-MM-DD)
  unique_id: string;        // AMC unique ID
  class_abbr_name: string;  // Fund class abbreviation
  net_asset: number;        // Net asset value in Baht
  last_val: number;         // Current NAV per unit
  previous_val: number;     // Previous NAV per unit
  sell_price: number;       // Sell price
  buy_price: number;        // Buy price
  sell_swap_price: number;  // Sell swap price
  buy_swap_price: number;   // Buy swap price
  remark_th: string;        // Remark in Thai
  remark_en: string;        // Remark in English
  last_upd_date: string;    // Last update timestamp
  [key: string]: any;       // Allow additional fields
}

/**
 * Fund Dividend Data Response Type
 */
export interface FundDividend {
  proj_id: string;
  proj_name_th: string;
  proj_name_en: string;
  dividend_date: string;
  dividend_per_unit: number;
  ex_dividend_date: string;
  record_date: string;
  payment_date: string;
  [key: string]: any;
}

/**
 * AMC (Asset Management Company) Data Response Type
 */
export interface AMCData {
  unique_id: string;
  name_th: string;
  name_en: string;
  [key: string]: any;
}

/**
 * Fetch daily NAV data for a specific fund
 *
 * @param proj_id Fund project ID (e.g., "M0774_2554")
 * @param nav_date NAV date in YYYY-MM-DD format
 * @returns Fund daily NAV data (or null if no data)
 */
export async function fetchFundDailyNav(
  proj_id: string,
  nav_date: string
): Promise<FundDailyNav | null> {
  try {
    const endpoint = `/${proj_id}/dailynav/${nav_date}`;

    // API returns an array
    const navDataArray = await secFundDailyInfoApiRequest<FundDailyNav[]>(
      endpoint,
      {
        cacheKey: `fund-nav-${proj_id}-${nav_date}`,
        cacheTTL: 24 * 60 * 60 * 1000, // 24 hours - historical NAV data doesn't change
      }
    );

    // Return first element if array is not empty
    if (navDataArray && navDataArray.length > 0) {
      console.log(`[SEC Fund Daily Info API] Fetched NAV for ${proj_id} on ${nav_date}`);
      return navDataArray[0];
    }

    return null;
  } catch (error: any) {
    if (error.message.includes('404')) {
      console.warn(`[SEC Fund Daily Info API] No NAV data for ${proj_id} on ${nav_date}`);
      return null;
    }
    console.error(`Error fetching fund daily NAV for ${proj_id}:`, error);
    throw error;
  }
}

/**
 * Fetch dividend history for a specific fund
 *
 * @param proj_id Fund project ID (e.g., "M0774_2554")
 * @returns Array of dividend records
 */
export async function fetchFundDividend(
  proj_id: string
): Promise<FundDividend[]> {
  try {
    const endpoint = `/${proj_id}/dividend`;

    const dividendData = await secFundDailyInfoApiRequest<FundDividend[]>(
      endpoint,
      {
        cacheKey: `fund-dividend-${proj_id}`,
        cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
      }
    );

    console.log(`[SEC Fund Daily Info API] Fetched ${dividendData.length} dividend records for ${proj_id}`);
    return dividendData;
  } catch (error: any) {
    // Handle both 404 and empty response (no dividends)
    if (error.message.includes('404') || error.message.includes('Unexpected end of JSON input')) {
      console.warn(`[SEC Fund Daily Info API] No dividend data for ${proj_id}`);
      return [];
    }
    console.error(`Error fetching fund dividend for ${proj_id}:`, error);
    throw error;
  }
}

/**
 * Fetch list of Asset Management Companies
 *
 * @returns Array of AMC data
 */
export async function fetchAMCList(): Promise<AMCData[]> {
  try {
    const endpoint = '/amc';

    const amcList = await secFundDailyInfoApiRequest<AMCData[]>(
      endpoint,
      {
        cacheKey: 'amc-list',
        cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days - AMC list doesn't change often
      }
    );

    console.log(`[SEC Fund Daily Info API] Fetched ${amcList.length} AMCs`);
    return amcList;
  } catch (error) {
    console.error('Error fetching AMC list:', error);
    throw error;
  }
}

/**
 * Fetch NAV history for a fund across multiple dates
 * Helper function to get historical NAV data
 *
 * @param proj_id Fund project ID
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Array of NAV data
 */
export async function fetchFundNavHistory(
  proj_id: string,
  startDate: Date,
  endDate: Date
): Promise<FundDailyNav[]> {
  const navHistory: FundDailyNav[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = currentDate.toISOString().split('T')[0];

      try {
        const navData = await fetchFundDailyNav(proj_id, dateStr);
        if (navData) {
          navHistory.push(navData);
        }
      } catch (error) {
        // Continue on error for individual dates
        console.warn(`Skipping ${dateStr} due to error`);
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`[SEC Fund Daily Info API] Retrieved ${navHistory.length} NAV records for ${proj_id}`);
  return navHistory;
}

/**
 * Test API connectivity
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    if (!SEC_FUND_DAILY_INFO_KEY) {
      console.error('[SEC Fund Daily Info API] API key not configured');
      return false;
    }

    // Try to fetch AMC list as a simple connectivity test
    await fetchAMCList();
    console.log('[SEC Fund Daily Info API] Connection test successful');
    return true;
  } catch (error) {
    console.error('[SEC Fund Daily Info API] Connection test failed:', error);
    return false;
  }
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cache.clear();
  console.log('[SEC Fund Daily Info API] Cache cleared');
}
