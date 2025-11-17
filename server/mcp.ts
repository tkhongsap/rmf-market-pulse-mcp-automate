import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { RMFFundCSV } from '@shared/schema';
import type { RMFDataService } from './services/rmfDataService';
import {
  detectLanguage,
  formatFundListSummary,
  formatSearchSummary,
  formatFundDetailSummary,
  formatPerformanceSummary,
  formatNoNavHistorySummary,
  formatNavHistorySummary,
  formatCompareSummary,
  getErrorMessage,
  type Language,
} from './i18n/index.js';
import { t, getPeriodLabel } from './i18n/translations.js';

export class RMFMCPServer {
  private server: McpServer;
  private dataService: RMFDataService;
  private widgetTemplates: Map<string, string>;

  constructor(dataService: RMFDataService) {
    this.dataService = dataService;
    this.server = new McpServer({
      name: 'thai-rmf-market-pulse',
      version: '1.0.0',
    });

    this.widgetTemplates = new Map();
    this.loadWidgetTemplates();
    this.setupResources();
    this.setupTools();
  }

  private loadWidgetTemplates() {
    const widgetDir = join(process.cwd(), 'server', 'widgets');
    const widgetFiles = [
      'fund-list.html',
      'fund-detail.html',
      'fund-comparison.html',
      'performance-chart.html',
    ];

    widgetFiles.forEach(file => {
      try {
        const content = readFileSync(join(widgetDir, file), 'utf-8');
        const name = file.replace('.html', '');
        this.widgetTemplates.set(name, content);
        console.log(`✓ Loaded widget template: ${name}`);
      } catch (error) {
        console.error(`Failed to load widget template ${file}:`, error);
      }
    });
  }

  private setupResources() {
    // Register HTML widgets as MCP resources for OpenAI Apps SDK
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'https://alfie-app-tkhongsap.replit.app';

    // Fund List Widget
    this.server.registerResource(
      'fund-list',
      'ui://widget/fund-list.html',
      {},
      async () => ({
        contents: [{
          uri: 'ui://widget/fund-list.html',
          mimeType: 'text/html+skybridge',
          text: this.widgetTemplates.get('fund-list') || '<html><body>Widget not found</body></html>',
          _meta: {
            'openai/widgetDescription': 'Interactive list displaying Thai RMF funds with pagination and sorting',
            'openai/widgetPrefersBorder': true,
            'openai/widgetDomain': 'https://chatgpt.com',
            'openai/widgetCSP': {
              connect_domains: [baseUrl],
              resource_domains: [],
            },
          },
        }],
      })
    );

    // Fund Detail Widget
    this.server.registerResource(
      'fund-detail',
      'ui://widget/fund-detail.html',
      {},
      async () => ({
        contents: [{
          uri: 'ui://widget/fund-detail.html',
          mimeType: 'text/html+skybridge',
          text: this.widgetTemplates.get('fund-detail') || '<html><body>Widget not found</body></html>',
          _meta: {
            'openai/widgetDescription': 'Detailed view of a specific Thai RMF fund with performance metrics',
            'openai/widgetPrefersBorder': true,
            'openai/widgetDomain': 'https://chatgpt.com',
            'openai/widgetCSP': {
              connect_domains: [baseUrl],
              resource_domains: [],
            },
          },
        }],
      })
    );

    // Fund Comparison Widget
    this.server.registerResource(
      'fund-comparison',
      'ui://widget/fund-comparison.html',
      {},
      async () => ({
        contents: [{
          uri: 'ui://widget/fund-comparison.html',
          mimeType: 'text/html+skybridge',
          text: this.widgetTemplates.get('fund-comparison') || '<html><body>Widget not found</body></html>',
          _meta: {
            'openai/widgetDescription': 'Side-by-side comparison of multiple Thai RMF funds',
            'openai/widgetPrefersBorder': true,
            'openai/widgetDomain': 'https://chatgpt.com',
            'openai/widgetCSP': {
              connect_domains: [baseUrl],
              resource_domains: [],
            },
          },
        }],
      })
    );

    // Performance Chart Widget
    this.server.registerResource(
      'performance-chart',
      'ui://widget/performance-chart.html',
      {},
      async () => ({
        contents: [{
          uri: 'ui://widget/performance-chart.html',
          mimeType: 'text/html+skybridge',
          text: this.widgetTemplates.get('performance-chart') || '<html><body>Widget not found</body></html>',
          _meta: {
            'openai/widgetDescription': 'NAV history chart and performance statistics for Thai RMF funds',
            'openai/widgetPrefersBorder': true,
            'openai/widgetDomain': 'https://chatgpt.com',
            'openai/widgetCSP': {
              connect_domains: [baseUrl],
              resource_domains: [],
            },
          },
        }],
      })
    );

    console.log('✓ Registered 4 widget resources with MCP server');
  }

  private setupTools() {
    this.server.tool(
      'get_rmf_funds',
      'Get a list of Thai Retirement Mutual Funds (RMF) with pagination and sorting. Responds in Thai if question is in Thai, English otherwise.',
      {
        page: z.number().optional().default(1).describe('Page number for pagination'),
        pageSize: z.number().optional().default(20).describe('Number of funds per page (max: 50)'),
        sortBy: z.enum(['ytd', '1y', '3y', '5y', 'nav', 'name', 'risk']).optional().describe('Sort by field'),
        sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
        question: z.string().optional().describe('User question (used for language detection)'),
      },
      async (args: any) => this.handleGetRmfFunds(args)
    );

    this.server.tool(
      'search_rmf_funds',
      'Search and filter Thai RMF funds by multiple criteria. Responds in Thai if question is in Thai, English otherwise.',
      {
        search: z.string().optional().describe('Search in fund name or symbol'),
        amc: z.string().optional().describe('Filter by Asset Management Company'),
        minRiskLevel: z.number().min(1).max(8).optional().describe('Minimum risk level'),
        maxRiskLevel: z.number().min(1).max(8).optional().describe('Maximum risk level'),
        category: z.enum(['Equity', 'Fixed Income', 'Mixed', 'International', 'Other']).optional().describe('Filter by category'),
        minYtdReturn: z.number().optional().describe('Minimum YTD return percentage'),
        sortBy: z.enum(['ytd', '1y', '3y', '5y', 'nav', 'name', 'risk']).optional().describe('Sort by field'),
        limit: z.number().optional().default(20).describe('Maximum results'),
        question: z.string().optional().describe('User question (used for language detection)'),
      },
      async (args: any) => this.handleSearchRmfFunds(args)
    );

    this.server.tool(
      'get_rmf_fund_detail',
      'Get detailed information for a specific Thai RMF fund. Responds in Thai if question is in Thai, English otherwise.',
      {
        fundCode: z.string().describe('Fund symbol/code (e.g., "ABAPAC-RMF")'),
        question: z.string().optional().describe('User question (used for language detection)'),
      },
      async (args: any) => this.handleGetRmfFundDetail(args)
    );

    this.server.tool(
      'get_rmf_fund_performance',
      'Get top performing Thai RMF funds for a specific period with benchmark comparison. Responds in Thai if question is in Thai, English otherwise.',
      {
        period: z.enum(['ytd', '3m', '6m', '1y', '3y', '5y', '10y']).describe('Performance period'),
        sortOrder: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order (desc = best performers first)'),
        limit: z.number().optional().default(10).describe('Maximum number of funds to return'),
        riskLevel: z.number().min(1).max(8).optional().describe('Filter by risk level'),
        question: z.string().optional().describe('User question (used for language detection)'),
      },
      async (args: any) => this.handleGetRmfFundPerformance(args)
    );

    this.server.tool(
      'get_rmf_fund_nav_history',
      'Get NAV (Net Asset Value) history for a specific Thai RMF fund over time. Responds in Thai if question is in Thai, English otherwise.',
      {
        fundCode: z.string().describe('Fund symbol/code (e.g., "ABAPAC-RMF")'),
        days: z.number().min(1).max(365).optional().default(30).describe('Number of days of history (1-365)'),
        question: z.string().optional().describe('User question (used for language detection)'),
      },
      async (args: any) => this.handleGetRmfFundNavHistory(args)
    );

    this.server.tool(
      'compare_rmf_funds',
      'Compare multiple Thai RMF funds side by side. Responds in Thai if question is in Thai, English otherwise.',
      {
        fundCodes: z.array(z.string()).min(2).max(5).describe('Array of fund symbols to compare (2-5 funds)'),
        compareBy: z.enum(['performance', 'risk', 'fees', 'all']).optional().default('all').describe('Comparison focus'),
        question: z.string().optional().describe('User question (used for language detection)'),
      },
      async (args: any) => this.handleCompareFunds(args)
    );
  }

  private async handleGetRmfFunds(args: any) {
    const page = Math.max(1, args?.page || 1); // Prevent negative pages
    const pageSize = Math.min(Math.max(1, args?.pageSize || 20), 50); // Enforce 1-50 range
    const sortBy = args?.sortBy;
    const sortOrder = args?.sortOrder || (sortBy ? 'desc' : 'asc');

    const { funds, totalCount } = this.dataService.search({
      page,
      pageSize,
      sortBy,
      sortOrder,
    });

    // Detect language and format response
    const lang = detectLanguage(args?.question);
    const textSummary = formatFundListSummary(totalCount, page, funds.length, lang);

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
      structuredContent: {
        funds: fundsData.slice(0, 10),
        pagination: { 
          page, 
          pageSize, 
          totalCount, 
          totalPages: Math.ceil(totalCount / pageSize) 
        },
      },
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://widget/fund-list.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Loading RMF funds...',
        'openai/toolInvocation/invoked': 'Funds loaded successfully',
        funds: fundsData,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleSearchRmfFunds(args: any) {
    const { funds, totalCount } = this.dataService.search({
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

    // Detect language and format response
    const lang = detectLanguage(args?.question);
    const filterParams = {
      search: args?.search,
      amc: args?.amc,
      minRiskLevel: args?.minRiskLevel,
      maxRiskLevel: args?.maxRiskLevel,
      category: args?.category,
      minYtdReturn: args?.minYtdReturn,
    };
    const textSummary = formatSearchSummary(totalCount, filterParams, lang);

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
      structuredContent: {
        funds: fundsData.slice(0, 10),
        totalCount,
        filters: filterParams,
      },
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://widget/fund-list.html',
        funds: fundsData,
        pagination: {
          page: 1,
          pageSize: args?.limit || 20,
          totalCount,
        },
        filters: args,
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleGetRmfFundDetail(args: any) {
    const fundCode = args?.fundCode;
    const lang = detectLanguage(args?.question);

    if (!fundCode) {
      throw new Error(getErrorMessage('fundCodeRequired', undefined, lang));
    }

    const fund = this.dataService.getBySymbol(fundCode);

    if (!fund) {
      throw new Error(getErrorMessage('fundNotFound', fundCode, lang));
    }

    const navHistory7d = await this.dataService.getNavHistory(fundCode, 7);

    const textSummary = formatFundDetailSummary(fund, lang);

    // OpenAI Apps SDK compatible response format
    return {
      structuredContent: {
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
      },
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://widget/fund-detail.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Loading fund details...',
        'openai/toolInvocation/invoked': 'Fund details loaded',
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
    const lang = detectLanguage(args?.question);

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
      throw new Error(getErrorMessage('invalidPeriod', period, lang));
    }

    // Get all funds and filter
    const { funds: allFunds } = this.dataService.search({});
    
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

    const textSummary = formatPerformanceSummary(topFunds.length, period, riskLevel, lang);

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
      structuredContent: {
        period: getPeriodLabel(period, lang),
        topFunds: fundsData.slice(0, 10).map(f => ({
          rank: f.rank,
          symbol: f.proj_abbr_name,
          name: f.proj_name_en,
          performance: f.performance,
          risk: f.risk_spectrum,
        })),
      },
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://widget/performance-chart.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Analyzing fund performance...',
        'openai/toolInvocation/invoked': 'Performance analysis complete',
        funds: fundsData,
        pagination: {
          page: 1,
          pageSize: limit,
          totalCount: topFunds.length,
        },
        period,
        periodLabel: getPeriodLabel(period, lang),
        filters: { riskLevel },
        timestamp: new Date().toISOString(),
      },
    } as any;
  }

  private async handleGetRmfFundNavHistory(args: any) {
    const fundCode = args?.fundCode;
    const days = Math.min(args?.days || 30, 365);
    const lang = detectLanguage(args?.question);

    if (!fundCode) {
      throw new Error(getErrorMessage('fundCodeRequired', undefined, lang));
    }

    const fund = this.dataService.getBySymbol(fundCode);
    if (!fund) {
      throw new Error(getErrorMessage('fundNotFound', fundCode, lang));
    }

    const navHistory = await this.dataService.getNavHistory(fundCode, days);

    if (!navHistory || navHistory.length === 0) {
      const textSummary = formatNoNavHistorySummary(fund.fund_name, fundCode, lang);
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
              message: t('noNavHistoryAvailable', lang),
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

    const textSummary = formatNavHistorySummary(
      fund.fund_name,
      fundCode,
      days,
      periodReturn || 'N/A',
      volatility,
      lang
    );

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
      structuredContent: {
        fundCode,
        fundName: fund.fund_name,
        navHistory: navHistoryData.slice(0, 10),
        statistics: {
          minNav: minNav.toFixed(4),
          maxNav: maxNav.toFixed(4),
          avgNav: avgNav.toFixed(4),
          periodReturn: periodReturn ? `${periodReturn}%` : 'N/A',
          volatility: `${volatility}%`,
        },
      },
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://widget/performance-chart.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Loading NAV history...',
        'openai/toolInvocation/invoked': 'NAV history loaded',
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
    const lang = detectLanguage(args?.question);

    if (!fundCodes || fundCodes.length < 2) {
      throw new Error(getErrorMessage('atLeastTwoFundsRequired', undefined, lang));
    }

    if (fundCodes.length > 5) {
      throw new Error(getErrorMessage('maximumFiveFunds', undefined, lang));
    }

    // Fetch all funds
    const funds = fundCodes.map((code: string) => {
      const fund = this.dataService.getBySymbol(code);
      if (!fund) {
        throw new Error(getErrorMessage('fundNotFound', code, lang));
      }
      return fund;
    });

    const fundSymbols = funds.map((f: RMFFundCSV) => f.symbol);
    const textSummary = formatCompareSummary(funds.length, fundSymbols, lang);

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
      structuredContent: {
        compareBy,
        fundCount: funds.length,
        funds: comparison,
      },
      content: [
        {
          type: 'text' as const,
          text: textSummary,
        },
      ],
      _meta: {
        'openai/outputTemplate': 'ui://widget/fund-comparison.html',
        'openai/widgetAccessible': true,
        'openai/toolInvocation/invoking': 'Comparing funds...',
        'openai/toolInvocation/invoked': 'Comparison complete',
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
