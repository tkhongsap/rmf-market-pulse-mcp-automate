import { Pool } from 'pg';
import type { RMFFundCSV, RMFNavHistory } from '@shared/schema';

export interface FundSearchFilters {
  search?: string;
  amc?: string;
  minRiskLevel?: number;
  maxRiskLevel?: number;
  category?: string;
  minYtdReturn?: number;
  sortBy?: 'ytd' | '1y' | '3y' | '5y' | 'nav' | 'name' | 'risk';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export class RMFDataService {
  private fundsMap: Map<string, RMFFundCSV> = new Map();
  private byAMC: Map<string, string[]> = new Map();
  private byRisk: Map<number, string[]> = new Map();
  private byCategory: Map<string, string[]> = new Map();
  private navHistoryCache: Map<string, RMFNavHistory[]> = new Map();
  private initialized = false;
  private dbPool: Pool;

  constructor(databasePool: Pool) {
    this.dbPool = databasePool;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const startTime = Date.now();
    console.log('Loading RMF funds from PostgreSQL...');

    try {
      // Query all funds from database
      const result = await this.dbPool.query(`
        SELECT 
          proj_id as fund_id,
          symbol,
          fund_name_en as fund_name,
          fund_name_th,
          amc,
          fund_category as fund_classification,
          management_style,
          dividend_policy,
          risk_level,
          fund_type,
          latest_nav_date as nav_date,
          latest_nav as nav_value,
          nav_change,
          nav_change_percent,
          net_asset,
          buy_price,
          sell_price,
          nav_history_count,
          nav_history_first_date,
          nav_history_last_date,
          nav_history_min,
          nav_history_max,
          performance,
          benchmark,
          dividends_count,
          dividends_total,
          dividends_last_date as dividend_dates,
          asset_allocation,
          fees,
          involved_parties as parties_json,
          top_holdings as holdings_json,
          risk_factors as risk_factors_json,
          suitability as suitability_json,
          document_urls,
          investment_minimums,
          data_updated_at as last_upd_date
        FROM rmf_funds
        ORDER BY symbol
      `);

      for (const record of result.rows) {
        const fund = this.parseDatabaseRecord(record);
        this.fundsMap.set(fund.symbol, fund);

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
    } catch (error) {
      console.error('CRITICAL: Failed to load RMF fund data from database:', error);
      throw new Error('Cannot start server without fund data');
    }
  }

  private parseDatabaseRecord(record: any): RMFFundCSV {
    // JSONB fields from database are already parsed objects
    const performance = record.performance || {};
    const benchmark = record.benchmark || {};
    const document_urls = record.document_urls || {};
    const investment_minimums = record.investment_minimums || {};

    return {
      fund_id: record.fund_id || record.symbol,
      symbol: record.symbol,
      fund_name: record.fund_name,
      amc: record.amc || 'Unknown',
      fund_classification: record.fund_classification || 'Unknown',
      management_style: record.management_style || 'Unknown',
      dividend_policy: record.dividend_policy || 'Unknown',
      risk_level: parseInt(record.risk_level) || 0,
      fund_type: record.fund_type || 'RMF',
      nav_date: record.nav_date ? record.nav_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      nav_value: parseFloat(record.nav_value) || 0,
      nav_change: parseFloat(record.nav_change) || 0,
      nav_change_percent: parseFloat(record.nav_change_percent) || 0,
      net_asset: parseFloat(record.net_asset) || 0,
      buy_price: parseFloat(record.buy_price) || 0,
      sell_price: parseFloat(record.sell_price) || 0,
      nav_history_count: parseInt(record.nav_history_count) || 0,
      nav_history_first_date: record.nav_history_first_date ? record.nav_history_first_date.toISOString().split('T')[0] : null,
      nav_history_last_date: record.nav_history_last_date ? record.nav_history_last_date.toISOString().split('T')[0] : null,
      nav_history_min: parseFloat(record.nav_history_min) || null,
      nav_history_max: parseFloat(record.nav_history_max) || null,
      perf_ytd: performance.ytd || null,
      perf_3m: performance.three_month || null,
      perf_6m: performance.six_month || null,
      perf_1y: performance.one_year || null,
      perf_3y: performance.three_year || null,
      perf_5y: performance.five_year || null,
      perf_10y: performance.ten_year || null,
      perf_since_inception: performance.since_inception || null,
      benchmark_name: benchmark.name || null,
      benchmark_ytd: benchmark.returns?.ytd || null,
      benchmark_3m: benchmark.returns?.three_month || null,
      benchmark_6m: benchmark.returns?.six_month || null,
      benchmark_1y: benchmark.returns?.one_year || null,
      benchmark_3y: benchmark.returns?.three_year || null,
      benchmark_5y: benchmark.returns?.five_year || null,
      benchmark_10y: benchmark.returns?.ten_year || null,
      dividends_count: parseInt(record.dividends_count) || 0,
      dividends_total: parseFloat(record.dividends_total) || null,
      dividend_dates: record.dividend_dates ? record.dividend_dates.toISOString().split('T')[0] : null,
      asset_allocation_json: record.asset_allocation,
      fees_json: record.fees,
      parties_json: record.parties_json,
      holdings_json: record.holdings_json,
      risk_factors_json: record.risk_factors_json,
      suitability_json: record.suitability_json,
      factsheet_url: document_urls.factsheet_url || null,
      annual_report_url: document_urls.annual_report_url || null,
      halfyear_report_url: document_urls.halfyear_report_url || null,
      investment_min_initial: parseFloat(investment_minimums.initial) || null,
      investment_min_additional: parseFloat(investment_minimums.additional) || null,
      last_upd_date: record.last_upd_date ? record.last_upd_date.toISOString() : new Date().toISOString(),
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

    if (filters.page !== undefined && filters.pageSize !== undefined) {
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
    // Only allow alphanumeric characters, dash, and underscore
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
      const result = await this.dbPool.query(`
        SELECT
          nav_date,
          nav as last_val,
          previous_nav as previous_val,
          nav_change,
          nav_change_percent
        FROM rmf_nav_history
        WHERE fund_symbol = $1
        ORDER BY nav_date DESC
        LIMIT $2
      `, [sanitizedSymbol, safeDays]);

      const navHistory: RMFNavHistory[] = result.rows.map((nav: any) => ({
        nav_date: nav.nav_date,
        last_val: parseFloat(nav.last_val) || 0,
        previous_val: parseFloat(nav.previous_val) || 0,
        net_asset: 0, // Not available in nav_history table
        buy_price: 0, // Not available in nav_history table
        sell_price: 0, // Not available in nav_history table
        change: parseFloat(nav.nav_change) || 0,
        change_percent: parseFloat(nav.nav_change_percent) || 0,
      }));

      // Reverse to get chronological order (oldest first)
      navHistory.reverse();

      this.navHistoryCache.set(cacheKey, navHistory);
      return navHistory;
    } catch (error) {
      console.warn('Failed to load NAV history for fund from database:', error);
      return [];
    }
  }

  getAllSymbols(): string[] {
    return Array.from(this.fundsMap.keys());
  }

  getTotalCount(): number {
    return this.fundsMap.size;
  }
}
