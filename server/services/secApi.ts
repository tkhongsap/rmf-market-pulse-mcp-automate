import type { RMFFund, SETSMARTUnitTrust } from '@shared/schema';

// SET SMART API configuration
const SETSMART_API_BASE_URL = 'https://www.setsmart.com/api/listed-company-api';
const SETSMART_API_KEY = process.env.SEC_API_KEY; // Reusing the same env variable

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
 * Make authenticated request to SET SMART API
 */
async function setSMARTApiRequest<T>(
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
      console.log(`[SET SMART API] Cache hit for ${cacheKey}`);
      return cached;
    }
  }

  // Check if API key is configured
  if (!SETSMART_API_KEY) {
    throw new Error('SEC_API_KEY environment variable is not configured');
  }

  // Check rate limit
  if (!checkRateLimit()) {
    throw new Error('SET SMART API rate limit exceeded (3000 calls per 5 minutes)');
  }

  const url = `${SETSMART_API_BASE_URL}${endpoint}`;
  console.log(`[SET SMART API] GET ${endpoint}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'api-key': SETSMART_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[SET SMART API] Error ${response.status}: ${errorText}`);
    throw new Error(`SET SMART API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as T;
  console.log(`[SET SMART API] Response received, data length:`, Array.isArray(data) ? data.length : 'object');

  // Cache the result
  if (cacheKey && cacheTTL) {
    setCache(cacheKey, data, cacheTTL);
  }

  return data;
}

/**
 * Map SET SMART Unit Trust response to RMFFund
 */
function mapUnitTrustToRMF(ut: SETSMARTUnitTrust): RMFFund {
  const nav = ut.bvps || ut.close || 0; // NAV is in bvps for Unit Trusts
  const priorNav = ut.prior || nav;
  const navChange = nav - priorNav;
  const navChangePercent = priorNav > 0 ? (navChange / priorNav) * 100 : 0;

  // Create a more descriptive fund name from symbol
  const fundName = `${ut.symbol} Unit Trust`;

  return {
    symbol: ut.symbol,
    fundName: fundName,
    securityType: ut.securityType,
    nav: Number(nav.toFixed(4)),
    navChange: Number(navChange.toFixed(4)),
    navChangePercent: Number(navChangePercent.toFixed(2)),
    navDate: ut.date,
    priorNav: priorNav,
    pnav: ut.pbv, // P/NAV for Unit Trusts
    totalVolume: ut.totalVolume,
    totalValue: ut.totalValue,
    dividendYield: ut.dividendYield,
    lastUpdate: new Date().toISOString(),
  };
}

/**
 * Filter for RMF funds from Unit Trust list
 * Note: SET SMART API doesn't distinguish RMF specifically, so we show all Unit Trusts
 * Users can filter by searching for specific fund symbols
 */
function isRMFFund(symbol: string): boolean {
  // Show all Unit Trusts since SET SMART API doesn't tag RMF specifically
  // Users can search for their specific funds using the search functionality
  return true;
}

/**
 * Fetch all RMF funds from SET SMART API
 */
export async function fetchRMFFunds(options?: {
  page?: number;
  pageSize?: number;
  fundType?: string;
}): Promise<{ funds: RMFFund[]; total: number }> {
  const { page = 1, pageSize = 20, fundType } = options || {};

  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    let dateStr = today.toISOString().split('T')[0];
    
    // Try to get latest available data - go back up to 60 days to find data
    let unitTrusts: SETSMARTUnitTrust[] = [];
    let attempts = 0;
    const maxAttempts = 60; // Try up to 60 days back
    
    while (unitTrusts.length === 0 && attempts < maxAttempts) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - attempts);
      
      // Skip weekends
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        attempts++;
        continue;
      }
      
      dateStr = targetDate.toISOString().split('T')[0];
      
      try {
        // Fetch all Unit Trusts (mutual funds) for the date
        // Using cache with 1 hour TTL for recent data
        const response = await setSMARTApiRequest<SETSMARTUnitTrust[]>(
          `/eod-price-by-security-type?securityType=UT&date=${dateStr}&adjustedPriceFlag=N`,
          {
            cacheKey: `unit-trusts-${dateStr}`,
            cacheTTL: 60 * 60 * 1000, // 1 hour
          }
        );
        
        console.log(`[SET SMART API] Found ${response.length} Unit Trusts for ${dateStr}`);
        
        if (response.length > 0) {
          unitTrusts = response;
          break;
        } else {
          console.log(`Empty response for ${dateStr}, trying previous day...`);
          attempts++;
        }
      } catch (error) {
        console.log(`Error fetching data for ${dateStr}, trying previous day...`);
        attempts++;
      }
    }

    if (unitTrusts.length === 0) {
      console.warn('[SET SMART API] No Unit Trust data available for the past 60 days');
      return { funds: [], total: 0 };
    }

    // Filter for RMF funds only
    const rmfUnitTrusts = unitTrusts.filter(ut => isRMFFund(ut.symbol));
    console.log(`[SET SMART API] Filtered to ${rmfUnitTrusts.length} RMF funds`);

    // Map to RMFFund format
    const allFunds = rmfUnitTrusts.map(mapUnitTrustToRMF);

    // Apply filters
    let filteredFunds = allFunds;
    
    // Fund type filter (currently not implemented as SET SMART doesn't provide fund types)
    if (fundType && fundType !== 'all') {
      // Fund type filtering could be implemented here if we have metadata
    }

    const total = filteredFunds.length;

    // Apply pagination
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedFunds = filteredFunds.slice(startIdx, endIdx);

    return { funds: paginatedFunds, total };
  } catch (error) {
    console.error('Error fetching RMF funds from SET SMART API:', error);
    throw error;
  }
}

/**
 * Fetch detailed information for a specific RMF fund
 */
export async function fetchRMFFundDetail(fundSymbol: string): Promise<RMFFund | null> {
  try {
    // Get today's date
    const today = new Date();
    let dateStr = today.toISOString().split('T')[0];
    
    // Try to get data from the last 60 trading days
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - attempts);
      
      // Skip weekends
      const dayOfWeek = targetDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        attempts++;
        continue;
      }
      
      dateStr = targetDate.toISOString().split('T')[0];
      
      try {
        // Fetch specific fund data by symbol
        const unitTrusts = await setSMARTApiRequest<SETSMARTUnitTrust[]>(
          `/eod-price-by-symbol?symbol=${fundSymbol}&startDate=${dateStr}&endDate=${dateStr}&adjustedPriceFlag=N`,
          {
            cacheKey: `fund-${fundSymbol}-${dateStr}`,
            cacheTTL: 60 * 60 * 1000, // 1 hour
          }
        );

        if (unitTrusts && unitTrusts.length > 0) {
          const ut = unitTrusts[0];
          
          // Verify it's a Unit Trust
          if (ut.securityType !== 'UT') {
            console.warn(`${fundSymbol} is not a Unit Trust (type: ${ut.securityType})`);
            return null;
          }

          return mapUnitTrustToRMF(ut);
        }
      } catch (error) {
        console.log(`No data for ${fundSymbol} on ${dateStr}, trying previous day...`);
      }
      
      attempts++;
    }

    console.warn(`[SET SMART API] No data found for ${fundSymbol} in the past 60 days`);
    return null;
  } catch (error) {
    console.error(`Error fetching RMF fund detail for ${fundSymbol}:`, error);
    throw error;
  }
}

/**
 * Search RMF funds by symbol or name
 */
export async function searchRMFFunds(query: string): Promise<RMFFund[]> {
  const { funds } = await fetchRMFFunds({ pageSize: 1000 }); // Get all funds

  const searchTerm = query.toUpperCase();
  const filteredFunds = funds.filter(fund =>
    fund.symbol.toUpperCase().includes(searchTerm) ||
    fund.fundName.toUpperCase().includes(searchTerm)
  );
  
  console.log(`[SET SMART API] Search for "${query}" found ${filteredFunds.length} results`);
  return filteredFunds;
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cache.clear();
  console.log('[SET SMART API] Cache cleared');
}
