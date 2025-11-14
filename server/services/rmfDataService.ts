import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
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

  constructor() {}

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const startTime = Date.now();
    console.log('Loading RMF funds from CSV...');

    try {
      const csvPath = join(process.cwd(), 'docs', 'rmf-funds-consolidated.csv');
      const csvContent = readFileSync(csvPath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        cast: true,
        cast_date: false,
      }) as any[];

      for (const record of records) {
        const fund = this.parseFundRecord(record);
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
      console.log(`✓ Loaded ${this.fundsMap.size} RMF funds in ${loadTime}ms`);
    } catch (error) {
      console.error('CRITICAL: Failed to load RMF fund data:', error);
      throw new Error('Cannot start server without fund data');
    }
  }

  private parseFundRecord(record: any): RMFFundCSV {
    const parseJSON = (jsonStr: string | null) => {
      if (!jsonStr || jsonStr === 'Unknown') return null;
      try {
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    };

    return {
      fund_id: record.fund_id,
      symbol: record.symbol,
      fund_name: record.fund_name,
      amc: record.amc,
      fund_classification: record.fund_classification,
      management_style: record.management_style,
      dividend_policy: record.dividend_policy,
      risk_level: parseInt(record.risk_level) || 0,
      fund_type: record.fund_type,
      nav_date: record.nav_date,
      nav_value: parseFloat(record.nav_value) || 0,
      nav_change: parseFloat(record.nav_change) || 0,
      nav_change_percent: parseFloat(record.nav_change_percent) || 0,
      net_asset: parseFloat(record.net_asset) || 0,
      buy_price: parseFloat(record.buy_price) || 0,
      sell_price: parseFloat(record.sell_price) || 0,
      nav_history_count: parseInt(record.nav_history_count) || 0,
      nav_history_first_date: record.nav_history_first_date,
      nav_history_last_date: record.nav_history_last_date,
      nav_history_min: parseFloat(record.nav_history_min) || null,
      nav_history_max: parseFloat(record.nav_history_max) || null,
      perf_ytd: parseFloat(record.perf_ytd) || null,
      perf_3m: parseFloat(record.perf_3m) || null,
      perf_6m: parseFloat(record.perf_6m) || null,
      perf_1y: parseFloat(record.perf_1y) || null,
      perf_3y: parseFloat(record.perf_3y) || null,
      perf_5y: parseFloat(record.perf_5y) || null,
      perf_10y: parseFloat(record.perf_10y) || null,
      perf_since_inception: parseFloat(record.perf_since_inception) || null,
      benchmark_name: record.benchmark_name || null,
      benchmark_ytd: parseFloat(record.benchmark_ytd) || null,
      benchmark_3m: parseFloat(record.benchmark_3m) || null,
      benchmark_6m: parseFloat(record.benchmark_6m) || null,
      benchmark_1y: parseFloat(record.benchmark_1y) || null,
      benchmark_3y: parseFloat(record.benchmark_3y) || null,
      benchmark_5y: parseFloat(record.benchmark_5y) || null,
      benchmark_10y: parseFloat(record.benchmark_10y) || null,
      dividends_count: parseInt(record.dividends_count) || 0,
      dividends_total: parseFloat(record.dividends_total) || null,
      dividend_dates: record.dividend_dates || null,
      asset_allocation_json: parseJSON(record.asset_allocation_json),
      fees_json: parseJSON(record.fees_json),
      parties_json: parseJSON(record.parties_json),
      holdings_json: parseJSON(record.holdings_json),
      risk_factors_json: parseJSON(record.risk_factors_json),
      suitability_json: parseJSON(record.suitability_json),
      factsheet_url: record.factsheet_url || null,
      annual_report_url: record.annual_report_url || null,
      halfyear_report_url: record.halfyear_report_url || null,
      investment_min_initial: parseFloat(record.investment_min_initial) || null,
      investment_min_additional: parseFloat(record.investment_min_additional) || null,
      last_upd_date: record.last_upd_date || new Date().toISOString(),
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

  getNavHistory(symbol: string, days: number = 30): RMFNavHistory[] {
    // SECURITY: Sanitize symbol to prevent path traversal
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
      const jsonPath = join(process.cwd(), 'data', 'rmf-funds', `${sanitizedSymbol}.json`);
      const fileContent = readFileSync(jsonPath, 'utf-8');
      const fundData = JSON.parse(fileContent);

      const navHistory: RMFNavHistory[] = (fundData.nav_history_30d || []).map((nav: any) => ({
        nav_date: nav.nav_date,
        last_val: nav.last_val,
        previous_val: nav.previous_val,
        net_asset: nav.net_asset,
        buy_price: nav.buy_price,
        sell_price: nav.sell_price,
        change: nav.last_val - (nav.previous_val || nav.last_val),
        change_percent: nav.previous_val 
          ? ((nav.last_val - nav.previous_val) / nav.previous_val) * 100 
          : 0,
      }));

      const filteredHistory = navHistory.slice(-safeDays);
      this.navHistoryCache.set(cacheKey, filteredHistory);

      return filteredHistory;
    } catch (error) {
      console.warn('Failed to load NAV history for fund');
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

export const rmfDataService = new RMFDataService();
