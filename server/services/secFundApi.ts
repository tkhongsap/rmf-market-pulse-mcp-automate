/**
 * Thailand SEC Fund API Service
 * 
 * Official API for Thailand mutual fund data from Securities and Exchange Commission
 * Portal: https://api-portal.sec.or.th/
 * 
 * APIs Used:
 * 1. SEC Fund Daily Info API - Daily NAV and trading data
 * 2. SEC Fund Factsheet API - Fund metadata, policies, holdings, fees
 * 
 * Authentication: Ocp-Apim-Subscription-Key header
 * Rate Limit: 3,000 requests per 300 seconds (10 req/sec)
 */

// Base URLs for SEC APIs
const FUND_DAILY_INFO_BASE_URL = 'https://api.sec.or.th/FundDailyInfo';
const FUND_FACTSHEET_BASE_URL = 'https://api.sec.or.th/FundFactsheet';

// Separate API Keys for each service (required by SEC API portal)
// Try dedicated keys first, fallback to generic SEC_API_KEY for testing
const FUND_DAILY_INFO_KEY = process.env.SEC_FUND_DAILY_INFO_KEY || process.env.SEC_API_KEY;
const FUND_FACTSHEET_KEY = process.env.SEC_FUND_FACTSHEET_KEY || process.env.SEC_API_KEY;

// Validate API keys on module load
if (!FUND_DAILY_INFO_KEY) {
  console.warn('[SEC Fund API] WARNING: SEC_FUND_DAILY_INFO_KEY and SEC_API_KEY not found in environment variables');
  console.warn('[SEC Fund API] Daily NAV data will not be available');
} else if (process.env.SEC_API_KEY && !process.env.SEC_FUND_DAILY_INFO_KEY) {
  console.log('[SEC Fund API] Using SEC_API_KEY as fallback for Daily Info API (testing mode)');
}

if (!FUND_FACTSHEET_KEY) {
  console.warn('[SEC Fund API] WARNING: SEC_FUND_FACTSHEET_KEY and SEC_API_KEY not found in environment variables');
  console.warn('[SEC Fund API] Fund factsheet data (benchmark, fees, etc.) will not be available');
} else if (process.env.SEC_API_KEY && !process.env.SEC_FUND_FACTSHEET_KEY) {
  console.log('[SEC Fund API] Using SEC_API_KEY as fallback for Factsheet API (testing mode)');
}

/**
 * Get the appropriate API key based on the target URL
 */
function getApiKeyForUrl(url: string): string | undefined {
  if (url.startsWith(FUND_DAILY_INFO_BASE_URL)) {
    return FUND_DAILY_INFO_KEY;
  } else if (url.startsWith(FUND_FACTSHEET_BASE_URL)) {
    return FUND_FACTSHEET_KEY;
  }
  return undefined;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FundSearchResult {
  proj_id: string;
  proj_name_th: string;
  proj_name_en: string;
  proj_abbr_name?: string;
  regis_date?: string;
  cancel_date?: string;
  fund_status?: string;
  amc_code?: string;
  amc_name_th?: string;
  amc_name_en?: string;
}

export interface DailyNAVData {
  proj_id: string;
  nav_date: string;
  nav: number;
  previous_nav?: number;
  nav_change?: number;
  nav_change_percent?: number;
  last_val?: number;
  dividend_ytd?: number;
}

export interface FundPolicy {
  proj_id: string;
  policy?: string;
  objective?: string;
  benchmark?: string;
  sec_type?: string;
  fund_type?: string;
}

export interface FundFee {
  fee_type: string;
  fee_desc: string;
  actual_value?: number;
  actual_value_unit?: string;
  fee_other_desc?: string;
}

export interface FundManagerHistory {
  seq: number;
  unique_id: string;
  manager_name?: string;
  start_date?: string;
  end_date?: string;
}

export interface AMC {
  unique_id: string;
  registered_name_th: string;
  registered_name_en: string;
  abbreviation_name?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Make authenticated request to SEC API
 */
async function secApiRequest<T>(
  url: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<T | null> {
  try {
    // Get the correct API key for this endpoint
    const apiKey = getApiKeyForUrl(url);
    
    if (!apiKey) {
      const apiType = url.startsWith(FUND_DAILY_INFO_BASE_URL) ? 'Fund Daily Info' : 'Fund Factsheet';
      const envVar = url.startsWith(FUND_DAILY_INFO_BASE_URL) 
        ? 'SEC_FUND_DAILY_INFO_KEY' 
        : 'SEC_FUND_FACTSHEET_KEY';
      
      const error = new Error(
        `Missing API key for ${apiType} API. Please set ${envVar} environment variable. ` +
        `Subscribe at https://api-portal.sec.or.th/`
      );
      console.error(`[SEC Fund API] ${error.message}`);
      throw error;
    }

    const headers: Record<string, string> = {
      'Ocp-Apim-Subscription-Key': apiKey,
    };

    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    console.log(`[SEC Fund API] ${method} ${url}`);
    
    const response = await fetch(url, options);

    // Handle different response codes
    if (response.status === 204) {
      console.log(`[SEC Fund API] No content (204) - no data available`);
      return null;
    }

    if (response.status === 401) {
      const errorText = await response.text();
      const apiType = url.startsWith(FUND_DAILY_INFO_BASE_URL) ? 'Fund Daily Info' : 'Fund Factsheet';
      const error = new Error(
        `Authentication failed for ${apiType} API (401 Unauthorized). ` +
        `Please verify your API subscription at https://api-portal.sec.or.th/ ` +
        `Error: ${errorText}`
      );
      console.error(`[SEC Fund API] ${error.message}`);
      throw error;
    }

    if (response.status === 429 || response.status === 421) {
      console.error(`[SEC Fund API] Rate limit exceeded (${response.status})`);
      throw new Error(`Rate limit exceeded. Please try again later.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SEC Fund API] Error ${response.status}: ${errorText}`);
      throw new Error(`SEC API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data as T;

  } catch (error) {
    console.error('[SEC Fund API] Request failed:', error);
    throw error;
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================================================
// FUND SEARCH & LOOKUP
// ============================================================================

/**
 * Search for funds by name or symbol
 * POST /FundFactsheet/fund
 */
export async function searchFunds(searchTerm: string): Promise<FundSearchResult[]> {
  const url = `${FUND_FACTSHEET_BASE_URL}/fund`;
  
  try {
    const result = await secApiRequest<FundSearchResult[]>(url, 'POST', {
      search: searchTerm
    });
    
    return result || [];
  } catch (error) {
    // Re-throw authentication and configuration errors - these must be fixed
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Missing API key') ||
      error.message.includes('Authentication failed')
    )) {
      throw error;
    }
    
    // Log but swallow other errors (e.g., network issues, 404s)
    console.error('[SEC Fund API] Search funds failed:', error);
    return [];
  }
}

/**
 * Get all Asset Management Companies
 * GET /FundFactsheet/fund/amc
 */
export async function getAllAMCs(): Promise<AMC[]> {
  const url = `${FUND_FACTSHEET_BASE_URL}/fund/amc`;
  
  try {
    const result = await secApiRequest<AMC[]>(url);
    return result || [];
  } catch (error) {
    // Re-throw authentication and configuration errors
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Missing API key') ||
      error.message.includes('Authentication failed')
    )) {
      throw error;
    }
    console.error('[SEC Fund API] Get AMCs failed:', error);
    return [];
  }
}

/**
 * Get all funds by AMC
 * GET /FundFactsheet/fund/amc/{unique_id}
 */
export async function getFundsByAMC(amcId: string): Promise<FundSearchResult[]> {
  const url = `${FUND_FACTSHEET_BASE_URL}/fund/amc/${amcId}`;
  
  try {
    const result = await secApiRequest<FundSearchResult[]>(url);
    return result || [];
  } catch (error) {
    // Re-throw authentication and configuration errors
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Missing API key') ||
      error.message.includes('Authentication failed')
    )) {
      throw error;
    }
    console.error('[SEC Fund API] Get funds by AMC failed:', error);
    return [];
  }
}

/**
 * Find proj_id by searching for fund symbol or name
 * This is a helper function that attempts multiple search strategies
 */
export async function findProjectId(symbolOrName: string): Promise<string | null> {
  console.log(`[SEC Fund API] Looking up proj_id for: ${symbolOrName}`);
  
  // Strategy 1: Search by exact symbol
  let results = await searchFunds(symbolOrName);
  
  if (results.length > 0) {
    console.log(`[SEC Fund API] Found ${results.length} result(s) for "${symbolOrName}"`);
    
    // Try to find exact match first
    const exactMatch = results.find(f => 
      f.proj_abbr_name === symbolOrName || 
      f.proj_name_en?.includes(symbolOrName) ||
      f.proj_name_th?.includes(symbolOrName)
    );
    
    if (exactMatch) {
      console.log(`[SEC Fund API] Exact match found: ${exactMatch.proj_id} - ${exactMatch.proj_name_en || exactMatch.proj_name_th}`);
      return exactMatch.proj_id;
    }
    
    // Return first result if no exact match
    console.log(`[SEC Fund API] Using first result: ${results[0].proj_id} - ${results[0].proj_name_en || results[0].proj_name_th}`);
    return results[0].proj_id;
  }
  
  // Strategy 2: Try searching without suffix (e.g., "ABAPAC" from "ABAPAC-RMF")
  if (symbolOrName.includes('-')) {
    const baseName = symbolOrName.split('-')[0];
    console.log(`[SEC Fund API] Trying base name: ${baseName}`);
    
    results = await searchFunds(baseName);
    if (results.length > 0) {
      console.log(`[SEC Fund API] Found ${results.length} result(s) for base name "${baseName}"`);
      
      // Try to find RMF variant
      const rmfMatch = results.find(f => 
        f.proj_abbr_name?.includes('RMF') || 
        f.proj_name_en?.includes('RMF') ||
        f.proj_name_th?.includes('RMF')
      );
      
      if (rmfMatch) {
        console.log(`[SEC Fund API] RMF variant found: ${rmfMatch.proj_id} - ${rmfMatch.proj_name_en || rmfMatch.proj_name_th}`);
        return rmfMatch.proj_id;
      }
      
      console.log(`[SEC Fund API] Using first result: ${results[0].proj_id} - ${results[0].proj_name_en || results[0].proj_name_th}`);
      return results[0].proj_id;
    }
  }
  
  console.error(`[SEC Fund API] No proj_id found for: ${symbolOrName}`);
  return null;
}

// ============================================================================
// DAILY NAV DATA
// ============================================================================

/**
 * Get daily NAV for a specific date
 * GET /FundDailyInfo/{proj_id}/dailynav/{nav_date}
 */
export async function getDailyNAV(
  projId: string,
  date: Date = new Date()
): Promise<DailyNAVData | null> {
  const navDate = formatDate(date);
  const url = `${FUND_DAILY_INFO_BASE_URL}/${projId}/dailynav/${navDate}`;
  
  try {
    const data = await secApiRequest<DailyNAVData>(url);
    return data;
  } catch (error) {
    // Re-throw authentication and configuration errors
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Missing API key') ||
      error.message.includes('Authentication failed')
    )) {
      throw error;
    }
    console.error(`[SEC Fund API] Get daily NAV failed for ${projId} on ${navDate}:`, error);
    return null;
  }
}

/**
 * Get latest available NAV (tries current date, then goes back up to 7 days)
 */
export async function getLatestNAV(projId: string): Promise<DailyNAVData | null> {
  const maxDaysBack = 7;
  const today = new Date();
  
  for (let daysBack = 0; daysBack < maxDaysBack; daysBack++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - daysBack);
    
    // Skip weekends
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue;
    }
    
    const navData = await getDailyNAV(projId, checkDate);
    if (navData) {
      console.log(`[SEC Fund API] Found NAV data for ${projId} on ${formatDate(checkDate)}`);
      return navData;
    }
  }
  
  console.error(`[SEC Fund API] No NAV data found for ${projId} in last ${maxDaysBack} days`);
  return null;
}

/**
 * Get historical NAV data for a date range
 * Note: This requires multiple API calls, one per date
 */
export async function getHistoricalNAV(
  projId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyNAVData[]> {
  const navData: DailyNAVData[] = [];
  const currentDate = new Date(startDate);
  
  console.log(`[SEC Fund API] Fetching historical NAV for ${projId} from ${formatDate(startDate)} to ${formatDate(endDate)}`);
  
  while (currentDate <= endDate) {
    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const data = await getDailyNAV(projId, new Date(currentDate));
      if (data) {
        navData.push(data);
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`[SEC Fund API] Retrieved ${navData.length} NAV records`);
  return navData;
}

// ============================================================================
// FUND FACTSHEET DATA
// ============================================================================

/**
 * Get fund policy information
 * GET /FundFactsheet/fund/{proj_id}/policy
 */
export async function getFundPolicy(projId: string): Promise<FundPolicy | null> {
  const url = `${FUND_FACTSHEET_BASE_URL}/fund/${projId}/policy`;
  
  try {
    const data = await secApiRequest<FundPolicy>(url);
    return data;
  } catch (error) {
    // Re-throw authentication and configuration errors
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Missing API key') ||
      error.message.includes('Authentication failed')
    )) {
      throw error;
    }
    console.error(`[SEC Fund API] Get fund policy failed for ${projId}:`, error);
    return null;
  }
}

/**
 * Get fund fees
 * GET /FundFactsheet/fund/{proj_id}/fee
 */
export async function getFundFees(projId: string): Promise<FundFee[]> {
  const url = `${FUND_FACTSHEET_BASE_URL}/fund/${projId}/fee`;
  
  try {
    const data = await secApiRequest<FundFee[]>(url);
    return data || [];
  } catch (error) {
    // Re-throw authentication and configuration errors
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Missing API key') ||
      error.message.includes('Authentication failed')
    )) {
      throw error;
    }
    console.error(`[SEC Fund API] Get fund fees failed for ${projId}:`, error);
    return [];
  }
}

/**
 * Get fund manager history
 * GET /FundFactsheet/fund/{proj_id}/fund_manager
 */
export async function getFundManagerHistory(projId: string): Promise<FundManagerHistory[]> {
  const url = `${FUND_FACTSHEET_BASE_URL}/fund/${projId}/fund_manager`;
  
  try {
    const data = await secApiRequest<FundManagerHistory[]>(url);
    return data || [];
  } catch (error) {
    // Re-throw authentication and configuration errors
    if (error instanceof Error && (
      error.message.includes('401') || 
      error.message.includes('Missing API key') ||
      error.message.includes('Authentication failed')
    )) {
      throw error;
    }
    console.error(`[SEC Fund API] Get fund manager history failed for ${projId}:`, error);
    return [];
  }
}

// ============================================================================
// HIGH-LEVEL FUNCTIONS (Combining multiple API calls)
// ============================================================================

/**
 * Get comprehensive fund data by symbol
 * This combines multiple API calls to build a complete picture
 */
export async function getFundDataBySymbol(symbol: string) {
  console.log(`[SEC Fund API] ========================================`);
  console.log(`[SEC Fund API] Getting comprehensive data for: ${symbol}`);
  console.log(`[SEC Fund API] ========================================`);
  
  // Step 1: Find proj_id
  const projId = await findProjectId(symbol);
  if (!projId) {
    throw new Error(`Fund not found: ${symbol}`);
  }
  
  // Step 2: Get latest NAV
  const navData = await getLatestNAV(projId);
  
  // Step 3: Get fund policy (includes benchmark)
  const policy = await getFundPolicy(projId);
  
  // Step 4: Get fees
  const fees = await getFundFees(projId);
  
  // Step 5: Get fund manager history
  const managers = await getFundManagerHistory(projId);
  
  return {
    projId,
    navData,
    policy,
    fees,
    managers,
  };
}
