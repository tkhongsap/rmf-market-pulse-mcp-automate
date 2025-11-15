import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { rmfDatabaseService } from './services/rmfDatabaseService';
import { z } from 'zod';
import type { RMFFundCSV } from '@shared/schema';

export class RMFMCPServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'thai-rmf-market-pulse',
      version: '1.0.0',
    });

    this.setupTools();
    // Note: Resource registration for Apps SDK widgets will be added when MCP SDK fully supports it
    // For now, _meta fields in responses provide Apps SDK compatibility
  }

  // TODO: Re-enable when MCP SDK supports Apps SDK resource patterns
  // private setupResources() {
  //   // Register HTML widgets as MCP resources for OpenAI Apps SDK
  //   this.server.resource({
  //     uri: 'ui://fund-detail',
  //     name: 'Fund Detail Widget',
  //     description: 'Interactive widget for displaying detailed Thai RMF fund information',
  //     mimeType: 'text/html+skybridge',
  //   }, async () => ({
  //     contents: [{
  //       uri: 'ui://fund-detail',
  //       mimeType: 'text/html+skybridge',
  //       text: widgetTemplates['fund-detail'],
  //     }],
  //   }));
  //   // ... other resources
  // }

  private setupTools() {
    this.server.tool(
      'get_rmf_funds',
      'Get a list of Thai Retirement Mutual Funds (RMF) with pagination and sorting',
      {
        page: z.number().optional().default(1).describe('Page number for pagination'),
        pageSize: z.number().optional().default(20).describe('Number of funds per page (max: 50)'),
        sortBy: z.enum(['ytd', '1y', '3y', '5y', 'nav', 'name', 'risk']).optional().describe('Sort by field'),
        sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      },
      async (args) => this.handleGetRmfFunds(args)
    );

    this.server.tool(
      'search_rmf_funds',
      'Search and filter Thai RMF funds by multiple criteria',
      {
        search: z.string().optional().describe('Search in fund name or symbol'),
        amc: z.string().optional().describe('Filter by Asset Management Company'),
        minRiskLevel: z.number().min(1).max(8).optional().describe('Minimum risk level'),
        maxRiskLevel: z.number().min(1).max(8).optional().describe('Maximum risk level'),
        category: z.enum(['Equity', 'Fixed Income', 'Mixed', 'International', 'Other']).optional().describe('Filter by category'),
        minYtdReturn: z.number().optional().describe('Minimum YTD return percentage'),
        sortBy: z.enum(['ytd', '1y', '3y', '5y', 'nav', 'name', 'risk']).optional().describe('Sort by field'),
        limit: z.number().optional().default(20).describe('Maximum results'),
      },
      async (args) => this.handleSearchRmfFunds(args)
    );

    this.server.tool(
      'get_rmf_fund_detail',
      'Get detailed information for a specific Thai RMF fund',
      {
        fundCode: z.string().describe('Fund symbol/code (e.g., "ABAPAC-RMF")'),
      },
      async (args) => this.handleGetRmfFundDetail(args)
    );

    this.server.tool(
      'get_rmf_fund_performance',
      'Get top performing Thai RMF funds for a specific period with benchmark comparison',
      {
        period: z.enum(['ytd', '3m', '6m', '1y', '3y', '5y', '10y']).describe('Performance period'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order (desc = best performers first)'),
        limit: z.number().optional().default(10).describe('Maximum number of funds to return'),
        riskLevel: z.number().min(1).max(8).optional().describe('Filter by risk level'),
      },
      async (args) => this.handleGetRmfFundPerformance(args)
    );

    this.server.tool(
      'get_rmf_fund_nav_history',
      'Get NAV (Net Asset Value) history for a specific Thai RMF fund over time',
      {
        fundCode: z.string().describe('Fund symbol/code (e.g., "ABAPAC-RMF")'),
        days: z.number().min(1).max(365).optional().default(30).describe('Number of days of history (1-365)'),
      },
      async (args) => this.handleGetRmfFundNavHistory(args)
    );

    this.server.tool(
      'compare_rmf_funds',
      'Compare multiple Thai RMF funds side by side',
      {
        fundCodes: z.array(z.string()).min(2).max(5).describe('Array of fund symbols to compare (2-5 funds)'),
        compareBy: z.enum(['performance', 'risk', 'fees', 'all']).optional().default('all').describe('Comparison focus'),
      },
      async (args) => this.handleCompareFunds(args)
    );
  }

  private async handleGetRmfFunds(args: any) {
    const page = Math.max(1, args?.page || 1); // Prevent negative pages
    const pageSize = Math.min(Math.max(1, args?.pageSize || 20), 50); // Enforce 1-50 range
    const sortBy = args?.sortBy;
    const sortOrder = args?.sortOrder || (sortBy ? 'desc' : 'asc');

    const { funds, totalCount } = rmfDatabaseService.search({
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    const textSummary = `Found ${totalCount} RMF funds. Showing page ${page} (${funds.length} funds).`;

    const fundsData = funds.map(f => ({
      proj_abbr_name: f.symbol,
      proj_name_en: f.fund_name,
      unique_id: f.amc,
      last_val: f.nav_value,
      return_ytd: f.perf_ytd,
      return_1y: f.perf_1y,
      risk_spectrum: f.risk_level,
      classification: f.fund_classification,
    }));

    // OpenAI Apps SDK compatible response format
    return {
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
        {
          type: 'text' as const,
          text: JSON.stringify({
            funds: fundsData.slice(0, 10),
            pagination: { page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
          }, null, 2),
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://fund-list',
        funds: fundsData,
        page,
        pageSize,
        total: totalCount,
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleSearchRmfFunds(args: any) {
    const { funds, totalCount } = rmfDatabaseService.search({
      search: args?.search,
      amc: args?.amc,
      minRiskLevel: args?.minRiskLevel,
      maxRiskLevel: args?.maxRiskLevel,
      category: args?.category,
      minYtdReturn: args?.minYtdReturn,
      sortBy: args?.sortBy,
      sortOrder: args?.sortOrder,
      page: 1,
      pageSize: args?.limit || 20,
    });

    const filters = [];
    if (args?.search) filters.push(`search: "${args.search}"`);
    if (args?.amc) filters.push(`AMC: "${args.amc}"`);
    if (args?.minRiskLevel) filters.push(`min risk: ${args.minRiskLevel}`);
    if (args?.maxRiskLevel) filters.push(`max risk: ${args.maxRiskLevel}`);
    if (args?.category) filters.push(`category: ${args.category}`);
    if (args?.minYtdReturn) filters.push(`min YTD: ${args.minYtdReturn}%`);

    const textSummary = filters.length > 0
      ? `Found ${totalCount} RMF funds matching filters: ${filters.join(', ')}`
      : `Found ${totalCount} RMF funds.`;

    const fundsData = funds.map(f => ({
      proj_abbr_name: f.symbol,
      proj_name_en: f.fund_name,
      unique_id: f.amc,
      last_val: f.nav_value,
      return_ytd: f.perf_ytd,
      return_1y: f.perf_1y,
      return_3y: f.perf_3y,
      risk_spectrum: f.risk_level,
      classification: f.fund_classification,
    }));

    // OpenAI Apps SDK compatible response format
    return {
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
        {
          type: 'text' as const,
          text: JSON.stringify({
            funds: fundsData.slice(0, 10),
            totalCount,
            filters: filters,
          }, null, 2),
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://fund-list',
        funds: fundsData,
        page: 1,
        pageSize: args?.limit || 20,
        total: totalCount,
        filters: args,
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleGetRmfFundDetail(args: any) {
    const fundCode = args?.fundCode;

    if (!fundCode) {
      throw new Error('fundCode parameter is required');
    }

    const fund = rmfDatabaseService.getBySymbol(fundCode);

    if (!fund) {
      throw new Error(`Fund not found: ${fundCode}`);
    }

    const navHistory7d = await rmfDatabaseService.getNavHistory(fundCode, 7);

    const textSummary = `${fund.fund_name} (${fund.symbol}) managed by ${fund.amc}. Current NAV: ${fund.nav_value} THB (${fund.nav_change >= 0 ? '+' : ''}${fund.nav_change_percent.toFixed(2)}%). Risk level: ${fund.risk_level}/8.`;

    // OpenAI Apps SDK compatible response format
    return {
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
        {
          type: 'text' as const,
          text: JSON.stringify({
            symbol: fund.symbol,
            fund_name: fund.fund_name,
            amc: fund.amc,
            nav_value: fund.nav_value,
            nav_change_percent: fund.nav_change_percent,
            risk_level: fund.risk_level,
            performance: {
              ytd: fund.perf_ytd,
              '1y': fund.perf_1y,
              '3y': fund.perf_3y,
              '5y': fund.perf_5y,
            },
          }, null, 2),
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://fund-detail',
        fundData: {
          proj_abbr_name: fund.symbol,
          proj_name_en: fund.fund_name,
          unique_id: fund.amc,
          last_val: fund.nav_value,
          nav_date: fund.nav_date,
          return_ytd: fund.perf_ytd,
          return_3m: fund.perf_3m,
          return_6m: fund.perf_6m,
          return_1y: fund.perf_1y,
          return_3y: fund.perf_3y,
          return_5y: fund.perf_5y,
          return_10y: fund.perf_10y,
          risk_spectrum: fund.risk_level,
          classification: fund.fund_classification,
          management_style: fund.management_style,
          dividend_policy: fund.dividend_policy,
          buy_price: fund.buy_price,
          sell_price: fund.sell_price,
          benchmark_name: fund.benchmark_name,
          benchmark_ytd: fund.benchmark_ytd,
          benchmark_1y: fund.benchmark_1y,
          benchmark_3y: fund.benchmark_3y,
          benchmark_5y: fund.benchmark_5y,
          asset_allocation: fund.asset_allocation_json,
          fees: fund.fees_json,
          parties: fund.parties_json,
          holdings: fund.holdings_json,
          investment_min_initial: fund.investment_min_initial,
          investment_min_additional: fund.investment_min_additional,
          factsheet_url: fund.factsheet_url,
          navHistory7d,
        },
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleGetRmfFundPerformance(args: any) {
    const period: 'ytd' | '3m' | '6m' | '1y' | '3y' | '5y' | '10y' = args?.period || 'ytd';
    const sortOrder = args?.sortOrder || 'desc';
    const limit = args?.limit || 10;
    const riskLevel = args?.riskLevel;

    // Map period to fund property
    const periodMap: Record<string, string> = {
      'ytd': 'perf_ytd',
      '3m': 'perf_3m',
      '6m': 'perf_6m',
      '1y': 'perf_1y',
      '3y': 'perf_3y',
      '5y': 'perf_5y',
      '10y': 'perf_10y',
    };

    // Map period to benchmark field
    const benchmarkMap: Record<string, string> = {
      'ytd': 'benchmark_ytd',
      '3m': 'benchmark_3m',
      '6m': 'benchmark_6m',
      '1y': 'benchmark_1y',
      '3y': 'benchmark_3y',
      '5y': 'benchmark_5y',
      '10y': 'benchmark_10y',
    };

    const perfField = periodMap[period];
    const benchmarkField = benchmarkMap[period];
    
    if (!perfField) {
      throw new Error(`Invalid period: ${period}`);
    }

    // Get all funds and filter
    const { funds: allFunds } = rmfDatabaseService.search({});
    
    let filteredFunds = allFunds.filter(fund => {
      const perfValue = (fund as any)[perfField];
      // Exclude funds with null/undefined performance
      if (perfValue === null || perfValue === undefined) return false;
      
      // Apply risk level filter if specified
      if (riskLevel && fund.risk_level !== riskLevel) return false;
      
      return true;
    });

    // Sort by performance
    filteredFunds.sort((a, b) => {
      const aPerf = (a as any)[perfField] || 0;
      const bPerf = (b as any)[perfField] || 0;
      return sortOrder === 'desc' ? bPerf - aPerf : aPerf - bPerf;
    });

    // Limit results
    const topFunds = filteredFunds.slice(0, limit);

    const periodLabel: Record<string, string> = {
      'ytd': 'YTD',
      '3m': '3-Month',
      '6m': '6-Month',
      '1y': '1-Year',
      '3y': '3-Year',
      '5y': '5-Year',
      '10y': '10-Year',
    };
    const periodLabelText = periodLabel[period] || period;

    const textSummary = riskLevel
      ? `Top ${topFunds.length} performing RMF funds for ${periodLabelText} (Risk Level ${riskLevel})`
      : `Top ${topFunds.length} performing RMF funds for ${periodLabelText}`;

    const fundsData = topFunds.map((f, index) => {
      const fundPerf = (f as any)[perfField];
      const benchPerf = (f as any)[benchmarkField];

      return {
        rank: index + 1,
        proj_abbr_name: f.symbol,
        proj_name_en: f.fund_name,
        unique_id: f.amc,
        risk_spectrum: f.risk_level,
        performance: fundPerf,
        last_val: f.nav_value,
        return_ytd: f.perf_ytd,
        return_1y: f.perf_1y,
        benchmark_name: f.benchmark_name,
        benchmark_performance: benchPerf,
        outperformance: fundPerf !== null && fundPerf !== undefined && benchPerf !== null && benchPerf !== undefined
          ? parseFloat((fundPerf - benchPerf).toFixed(2))
          : null,
      };
    });

    // OpenAI Apps SDK compatible response format
    return {
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
        {
          type: 'text' as const,
          text: JSON.stringify({
            period: periodLabelText,
            topFunds: fundsData.slice(0, 10).map(f => ({
              rank: f.rank,
              symbol: f.proj_abbr_name,
              name: f.proj_name_en,
              performance: f.performance,
              risk: f.risk_spectrum,
            })),
          }, null, 2),
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://fund-list',
        funds: fundsData,
        page: 1,
        pageSize: limit,
        total: topFunds.length,
        period,
        periodLabel: periodLabelText,
        filters: { riskLevel },
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleGetRmfFundNavHistory(args: any) {
    const fundCode = args?.fundCode;
    const days = Math.min(args?.days || 30, 365);

    if (!fundCode) {
      throw new Error('fundCode parameter is required');
    }

    const fund = rmfDatabaseService.getBySymbol(fundCode);
    if (!fund) {
      throw new Error(`Fund not found: ${fundCode}`);
    }

    const navHistory = await rmfDatabaseService.getNavHistory(fundCode, days);

    if (!navHistory || navHistory.length === 0) {
      const textSummary = `No NAV history available for ${fund.fund_name} (${fundCode})`;
      return {
        content: [
          {
            type: 'text' as const,
            text: textSummary,
          },
          {
            type: 'text' as const,
            text: JSON.stringify({
              symbol: fundCode,
              fund_name: fund.fund_name,
              message: 'No NAV history available',
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }

    // Calculate statistics using last_val field
    const navValues = navHistory.map(h => h.last_val).filter(v => v !== null && v !== undefined);
    const minNav = navValues.length > 0 ? Math.min(...navValues) : 0;
    const maxNav = navValues.length > 0 ? Math.max(...navValues) : 0;
    const avgNav = navValues.length > 0 ? navValues.reduce((sum, v) => sum + v, 0) / navValues.length : 0;
    
    // Calculate period return
    const firstNav = navHistory[navHistory.length - 1]?.last_val;
    const lastNav = navHistory[0]?.last_val;
    const periodReturn = firstNav && lastNav && firstNav > 0 ? ((lastNav - firstNav) / firstNav * 100).toFixed(2) : null;

    // Calculate volatility (standard deviation of daily returns)
    const dailyReturns = [];
    for (let i = 0; i < navHistory.length - 1; i++) {
      const currentNav = navHistory[i].last_val;
      const prevNav = navHistory[i + 1].last_val;
      if (currentNav && prevNav && prevNav > 0) {
        dailyReturns.push((currentNav - prevNav) / prevNav);
      }
    }
    
    let volatility: string = 'N/A';
    if (dailyReturns.length > 0) {
      const avgReturn = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
      volatility = (Math.sqrt(variance) * 100).toFixed(2);
    }

    const textSummary = `${fund.fund_name} (${fundCode}) NAV history over ${days} days. Period return: ${periodReturn}%. Volatility: ${volatility}%.`;

    const navHistoryData = navHistory.map(h => ({
      date: h.nav_date,
      nav: h.last_val,
      previous_nav: h.previous_val,
      change: h.last_val && h.previous_val ? h.last_val - h.previous_val : null,
      change_percent: h.last_val && h.previous_val && h.previous_val > 0
        ? parseFloat(((h.last_val - h.previous_val) / h.previous_val * 100).toFixed(2))
        : null,
    }));

    // OpenAI Apps SDK compatible response format
    return {
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
        {
          type: 'text' as const,
          text: JSON.stringify({
            navHistory: navHistoryData.slice(0, 10),
            statistics: {
              minNav: minNav.toFixed(4),
              maxNav: maxNav.toFixed(4),
              avgNav: avgNav.toFixed(4),
              periodReturn: periodReturn ? `${periodReturn}%` : 'N/A',
              volatility: `${volatility}%`,
            },
          }, null, 2),
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://performance-chart',
        fundCode,
        fundName: fund.fund_name,
        navHistory: navHistoryData,
        statistics: {
          minNav: minNav.toFixed(4),
          maxNav: maxNav.toFixed(4),
          avgNav: avgNav.toFixed(4),
          periodReturn: periodReturn ? `${periodReturn}%` : 'N/A',
          volatility: `${volatility}%`,
        },
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleCompareFunds(args: any) {
    const fundCodes = args?.fundCodes || [];
    const compareBy = args?.compareBy || 'all';

    if (!fundCodes || fundCodes.length < 2) {
      throw new Error('At least 2 fund codes are required for comparison');
    }

    if (fundCodes.length > 5) {
      throw new Error('Maximum 5 funds can be compared at once');
    }

    // Fetch all funds
    const funds = fundCodes.map((code: string) => {
      const fund = rmfDatabaseService.getBySymbol(code);
      if (!fund) {
        throw new Error(`Fund not found: ${code}`);
      }
      return fund;
    });

    const textSummary = `Comparing ${funds.length} RMF funds: ${funds.map((f: RMFFundCSV) => f.symbol).join(', ')}`;

    // Build comparison data with Apps SDK field names
    const comparison = funds.map((fund: RMFFundCSV) => {
      const data: any = {
        proj_abbr_name: fund.symbol,
        proj_name_en: fund.fund_name,
        unique_id: fund.amc,
      };

      // Include data based on compareBy
      if (compareBy === 'all' || compareBy === 'performance') {
        data.last_val = fund.nav_value;
        data.return_ytd = fund.perf_ytd;
        data.return_3m = fund.perf_3m;
        data.return_6m = fund.perf_6m;
        data.return_1y = fund.perf_1y;
        data.return_3y = fund.perf_3y;
        data.return_5y = fund.perf_5y;
        data.return_10y = fund.perf_10y;
        data.benchmark_name = fund.benchmark_name;
        data.benchmark_ytd = fund.benchmark_ytd;
        data.benchmark_1y = fund.benchmark_1y;
        data.benchmark_3y = fund.benchmark_3y;
        data.benchmark_5y = fund.benchmark_5y;
      }

      if (compareBy === 'all' || compareBy === 'risk') {
        data.risk_spectrum = fund.risk_level;
        data.classification = fund.fund_classification;
        data.management_style = fund.management_style;
      }

      if (compareBy === 'all' || compareBy === 'fees') {
        data.fees = fund.fees_json;
        data.investment_min_initial = fund.investment_min_initial;
        data.investment_min_additional = fund.investment_min_additional;
      }

      return data;
    });

    // OpenAI Apps SDK compatible response format
    return {
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
        {
          type: 'text' as const,
          text: JSON.stringify({
            compareBy,
            fundCount: funds.length,
            funds: comparison,
          }, null, 2),
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://fund-comparison',
        funds: comparison,
        compareBy,
        fundCount: funds.length,
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  getServer() {
    return this.server;
  }
}

export const rmfMCPServer = new RMFMCPServer();
