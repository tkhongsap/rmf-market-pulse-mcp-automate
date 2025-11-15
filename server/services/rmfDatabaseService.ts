import { Pool, PoolClient } from 'pg';
import type { RMFFundCSV, RMFNavHistory } from '@shared/schema';
import type { FundSearchFilters } from './rmfDataService';

/**
 * Database-backed RMF Data Service
 *
 * Provides the same interface as rmfDataService but reads from PostgreSQL
 * instead of CSV files. Uses in-memory caching for performance.
 */
export class RMFDatabaseService {
  private pool: Pool;
  private fundsMap: Map<string, RMFFundCSV> = new Map();
  private byAMC: Map<string, string[]> = new Map();
  private byRisk: Map<number, string[]> = new Map();
  private byCategory: Map<string, string[]> = new Map();
  private navHistoryCache: Map<string, RMFNavHistory[]> = new Map();
  private initialized = false;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const startTime = Date.now();
    console.log('Loading RMF funds from PostgreSQL...');

    try {
      // Test database connection
      const result = await this.pool.query('SELECT * FROM rmf_funds ORDER BY symbol');

      if (result.rows.length === 0) {
        throw new Error('No funds found in database. Please run the data pipeline first.');
      }

      // Load all funds into memory (same as CSV version for performance)
      for (const row of result.rows) {
        const fund = this.mapDbRowToFund(row);
        this.fundsMap.set(fund.symbol, fund);

        // Build indexes
        if (!this.byAMC.has(fund.amc)) {
          this.byAMC.set(fund.amc, []);
        }
        this.byAMC.get(fund.amc)!.push(fund.symbol);

        if (!this.byRisk.has(fund.risk_level)) {
          this.byRisk.set(fund.risk_level, []);
        }
        this.byRisk.get(fund.risk_level)!.push(fund.symbol);

        const category = this.getCategoryFromClassification(fund.fund_classification);
        if (!this.byCategory.has(category)) {
          this.byCategory.set(category, []);
        }
        this.byCategory.get(category)!.push(fund.symbol);
      }

      this.initialized = true;
      const loadTime = Date.now() - startTime;
      console.log(`✓ Loaded ${this.fundsMap.size} RMF funds from database in ${loadTime}ms`);
    } catch (error: any) {
      console.error('CRITICAL: Failed to load RMF fund data from database:', error);
      throw new Error(`Cannot start server without fund data: ${error.message}`);
    }
  }

  private mapDbRowToFund(row: any): RMFFundCSV {
    // Extract performance metrics from JSONB field
    const performance = row.performance || {};
    const benchmark = row.benchmark || {};

    return {
      fund_id: row.proj_id,
      symbol: row.symbol,
      fund_name: row.fund_name_en || row.fund_name_th || 'Unknown',
      amc: row.amc || 'Unknown',
      fund_classification: row.fund_policy || '',
      management_style: row.management_style || '',
      dividend_policy: row.dividend_policy || '',
      risk_level: row.risk_level || 0,
      fund_type: row.fund_type || 'RMF',

      // NAV data
      nav_date: row.latest_nav_date,
      nav_value: parseFloat(row.latest_nav) || 0,
      nav_change: parseFloat(row.nav_change) || 0,
      nav_change_percent: parseFloat(row.nav_change_percent) || 0,
      net_asset: parseFloat(row.net_asset) || 0,
      buy_price: parseFloat(row.buy_price) || 0,
      sell_price: parseFloat(row.sell_price) || 0,

      // NAV history statistics
      nav_history_count: row.nav_history_count || 0,
      nav_history_first_date: row.nav_history_first_date,
      nav_history_last_date: row.nav_history_last_date,
      nav_history_min: parseFloat(row.nav_history_min) || null,
      nav_history_max: parseFloat(row.nav_history_max) || null,

      // Performance metrics (from JSONB)
      perf_ytd: parseFloat(performance.ytd) || null,
      perf_3m: parseFloat(performance['3m']) || null,
      perf_6m: parseFloat(performance['6m']) || null,
      perf_1y: parseFloat(performance['1y']) || null,
      perf_3y: parseFloat(performance['3y']) || null,
      perf_5y: parseFloat(performance['5y']) || null,
      perf_10y: parseFloat(performance['10y']) || null,
      perf_since_inception: parseFloat(performance.since_inception) || null,

      // Benchmark data (from JSONB)
      benchmark_name: benchmark.name || null,
      benchmark_ytd: parseFloat(benchmark.ytd) || null,
      benchmark_3m: parseFloat(benchmark['3m']) || null,
      benchmark_6m: parseFloat(benchmark['6m']) || null,
      benchmark_1y: parseFloat(benchmark['1y']) || null,
      benchmark_3y: parseFloat(benchmark['3y']) || null,
      benchmark_5y: parseFloat(benchmark['5y']) || null,
      benchmark_10y: parseFloat(benchmark['10y']) || null,

      // Dividend statistics
      dividends_count: row.dividends_count || 0,
      dividends_total: parseFloat(row.dividends_total) || null,
      dividend_dates: row.dividends_last_date || null,

      // Complex data (JSONB)
      asset_allocation_json: row.asset_allocation,
      fees_json: row.fees,
      parties_json: row.involved_parties,
      holdings_json: row.top_holdings,
      risk_factors_json: row.risk_factors,
      suitability_json: row.suitability,

      // Documents (from JSONB)
      factsheet_url: row.document_urls?.factsheet || null,
      annual_report_url: row.document_urls?.annual_report || null,
      halfyear_report_url: row.document_urls?.halfyear_report || null,

      // Investment minimums (from JSONB)
      investment_min_initial: parseFloat(row.investment_minimums?.initial) || null,
      investment_min_additional: parseFloat(row.investment_minimums?.additional) || null,

      // Metadata
      last_upd_date: row.data_updated_at || row.data_fetched_at || new Date().toISOString(),
    };
  }

  private getCategoryFromClassification(classification: string): string {
    if (!classification) return 'Other';
    const upper = classification.toUpperCase();
    if (upper.includes('EQ')) return 'Equity';
    if (upper.includes('FI') || upper.includes('BOND')) return 'Fixed Income';
    if (upper.includes('MIX')) return 'Mixed';
    if (upper.includes('AS') || upper.includes('ASIA') || upper.includes('GL')) return 'International';
    return 'Other';
  }

  search(filters: FundSearchFilters): { funds: RMFFundCSV[]; totalCount: number } {
    let results = Array.from(this.fundsMap.values());

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(f =>
        f.fund_name.toLowerCase().includes(searchLower) ||
        f.symbol.toLowerCase().includes(searchLower)
      );
    }

    if (filters.amc) {
      const amcLower = filters.amc.toLowerCase();
      results = results.filter(f => f.amc.toLowerCase().includes(amcLower));
    }

    if (filters.minRiskLevel !== undefined) {
      results = results.filter(f => f.risk_level >= filters.minRiskLevel!);
    }

    if (filters.maxRiskLevel !== undefined) {
      results = results.filter(f => f.risk_level <= filters.maxRiskLevel!);
    }

    if (filters.category) {
      results = results.filter(f =>
        this.getCategoryFromClassification(f.fund_classification) === filters.category
      );
    }

    if (filters.minYtdReturn !== undefined) {
      results = results.filter(f =>
        f.perf_ytd !== null && f.perf_ytd >= filters.minYtdReturn!
      );
    }

    if (filters.sortBy) {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      results.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;

        switch (filters.sortBy) {
          case 'ytd':
            aVal = a.perf_ytd ?? -Infinity;
            bVal = b.perf_ytd ?? -Infinity;
            break;
          case '1y':
            aVal = a.perf_1y ?? -Infinity;
            bVal = b.perf_1y ?? -Infinity;
            break;
          case '3y':
            aVal = a.perf_3y ?? -Infinity;
            bVal = b.perf_3y ?? -Infinity;
            break;
          case '5y':
            aVal = a.perf_5y ?? -Infinity;
            bVal = b.perf_5y ?? -Infinity;
            break;
          case 'nav':
            aVal = a.nav_value;
            bVal = b.nav_value;
            break;
          case 'name':
            aVal = a.fund_name;
            bVal = b.fund_name;
            break;
          case 'risk':
            aVal = a.risk_level;
            bVal = b.risk_level;
            break;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return order * aVal.localeCompare(bVal);
        }
        return order * ((aVal as number) - (bVal as number));
      });
    }

    const totalCount = results.length;

    if (filters.page && filters.pageSize) {
      const start = (filters.page - 1) * filters.pageSize;
      results = results.slice(start, start + filters.pageSize);
    }

    return { funds: results, totalCount };
  }

  getBySymbol(symbol: string): RMFFundCSV | null {
    return this.fundsMap.get(symbol) || null;
  }

  getTopPerformers(
    period: 'ytd' | '3m' | '6m' | '1y' | '3y' | '5y' | '10y',
    limit: number = 10,
    riskLevel?: number
  ): RMFFundCSV[] {
    let funds = Array.from(this.fundsMap.values());

    if (riskLevel !== undefined) {
      funds = funds.filter(f => f.risk_level === riskLevel);
    }

    const perfField = `perf_${period}` as keyof RMFFundCSV;
    funds = funds.filter(f => f[perfField] !== null);

    funds.sort((a, b) => {
      const aVal = (a[perfField] as number) || -Infinity;
      const bVal = (b[perfField] as number) || -Infinity;
      return bVal - aVal;
    });

    return funds.slice(0, limit);
  }

  compareFunds(symbols: string[]): RMFFundCSV[] {
    return symbols
      .map(s => this.getBySymbol(s))
      .filter((f): f is RMFFundCSV => f !== null);
  }

  async getNavHistory(symbol: string, days: number = 30): Promise<RMFNavHistory[]> {
    // SECURITY: Sanitize symbol to prevent SQL injection
    const sanitizedSymbol = symbol.replace(/[^a-zA-Z0-9\-_]/g, '');

    // Validate symbol exists in our fund list
    if (!this.fundsMap.has(sanitizedSymbol)) {
      console.warn('Invalid or unknown fund symbol requested');
      return [];
    }

    // Enforce max days limit (365)
    const safeDays = Math.min(Math.max(days, 1), 365);

    const cacheKey = `${sanitizedSymbol}_${safeDays}`;

    if (this.navHistoryCache.has(cacheKey)) {
      return this.navHistoryCache.get(cacheKey)!;
    }

    try {
      // Query NAV history from database
      const result = await this.pool.query(
        `SELECT nav_date, nav as last_val, previous_nav as previous_val,
                nav_change as change, nav_change_percent as change_percent
         FROM rmf_nav_history
         WHERE fund_symbol = $1
         ORDER BY nav_date DESC
         LIMIT $2`,
        [sanitizedSymbol, safeDays]
      );

      const navHistory: RMFNavHistory[] = result.rows.map(row => ({
        nav_date: row.nav_date,
        last_val: parseFloat(row.last_val) || 0,
        previous_val: parseFloat(row.previous_val) || 0,
        net_asset: 0, // Not stored in database
        buy_price: 0, // Not stored in database
        sell_price: 0, // Not stored in database
        change: parseFloat(row.change) || 0,
        change_percent: parseFloat(row.change_percent) || 0,
      }));

      // Reverse to have oldest first (consistent with CSV version)
      navHistory.reverse();

      this.navHistoryCache.set(cacheKey, navHistory);
      return navHistory;
    } catch (error: any) {
      console.warn(`Failed to load NAV history from database for ${sanitizedSymbol}:`, error.message);
      return [];
    }
  }

  getAllSymbols(): string[] {
    return Array.from(this.fundsMap.keys());
  }

  getTotalCount(): number {
    return this.fundsMap.size;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const rmfDatabaseService = new RMFDatabaseService();
