import { z } from "zod";

// Asset allocation for RMF funds
export const assetAllocationSchema = z.object({
  assetType: z.string(), // e.g., "Equity", "Bond", "Cash"
  percentage: z.number(),
});

export type AssetAllocation = z.infer<typeof assetAllocationSchema>;

// Fund holding information
export const fundHoldingSchema = z.object({
  securityName: z.string(),
  percentage: z.number(),
  marketValue: z.number().optional(),
});

export type FundHolding = z.infer<typeof fundHoldingSchema>;

// SET SMART API raw response for Unit Trust (Mutual Fund)
export const setSMARTUnitTrustSchema = z.object({
  date: z.string(), // Trading date in YYYY-MM-DD format
  symbol: z.string(), // Fund symbol/code
  securityType: z.string(), // Should be "UT" for Unit Trust
  adjustedPriceFlag: z.string(), // "Y" or "N"
  prior: z.number().nullable(), // Prior NAV
  open: z.number().nullable(),
  high: z.number().nullable(),
  low: z.number().nullable(),
  close: z.number().nullable(), // Current NAV
  average: z.number().nullable(),
  aomVolume: z.number().nullable(),
  aomValue: z.number().nullable(),
  trVolume: z.number().nullable(),
  trValue: z.number().nullable(),
  totalVolume: z.number().nullable(),
  totalValue: z.number().nullable(),
  pe: z.number().nullable(), // Usually null for Unit Trusts
  pbv: z.number().nullable(), // P/NAV for Unit Trusts
  bvps: z.number().nullable(), // NAV for Unit Trusts (Book Value Per Share)
  dividendYield: z.number().nullable(),
  marketCap: z.number().nullable(),
  volumeTurnover: z.number().nullable(),
});

export type SETSMARTUnitTrust = z.infer<typeof setSMARTUnitTrustSchema>;

// RMF (Retirement Mutual Fund) data - mapped from SET SMART API
export const rmfFundSchema = z.object({
  symbol: z.string(), // Fund symbol/code (e.g., "SCBRMMONEY")
  fundName: z.string(), // Display name (derived from symbol or separate lookup)
  securityType: z.string(), // "UT" for Unit Trust
  nav: z.number(), // Net Asset Value (from bvps field)
  navChange: z.number(), // Calculated from close - prior
  navChangePercent: z.number(), // Calculated percentage
  navDate: z.string(), // Date in YYYY-MM-DD format
  priorNav: z.number().nullable(), // Prior NAV
  pnav: z.number().nullable(), // P/NAV ratio (from pbv field)
  totalVolume: z.number().nullable(), // Trading volume
  totalValue: z.number().nullable(), // Trading value in Baht
  dividendYield: z.number().nullable(),
  lastUpdate: z.string(),
});

export type RMFFund = z.infer<typeof rmfFundSchema>;

// API response types for RMF
export const rmfFundsResponseSchema = z.object({
  funds: z.array(rmfFundSchema),
  total: z.number(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  timestamp: z.string(),
});

export const rmfFundDetailResponseSchema = z.object({
  fund: rmfFundSchema,
  timestamp: z.string(),
});

export type RMFFundsResponse = z.infer<typeof rmfFundsResponseSchema>;
export type RMFundDetailResponse = z.infer<typeof rmfFundDetailResponseSchema>;

// SETSmart API - Stock Quote Response (EOD Price endpoints)
export const setsmartStockQuoteSchema = z.object({
  date: z.string(), // Trading date in YYYY-MM-DD format
  symbol: z.string(), // Stock symbol (e.g., "PTT", "AOT")
  securityType: z.string(), // CS, PS, W, ETF, etc.
  adjustedPriceFlag: z.string(), // "Y" or "N"
  prior: z.number().nullable(), // Previous closing price
  open: z.number().nullable(), // Opening price
  high: z.number().nullable(), // Highest price
  low: z.number().nullable(), // Lowest price
  close: z.number().nullable(), // Closing price
  average: z.number().nullable(), // Average price
  aomVolume: z.number().nullable(), // AOM trading volume
  aomValue: z.number().nullable(), // AOM trading value
  trVolume: z.number().nullable(), // Through trade volume
  trValue: z.number().nullable(), // Through trade value
  totalVolume: z.number().nullable(), // Total trading volume
  totalValue: z.number().nullable(), // Total trading value
  pe: z.number().nullable(), // Price-to-Earnings ratio
  pbv: z.number().nullable(), // Price-to-Book Value ratio
  bvps: z.number().nullable(), // Book Value Per Share
  dividendYield: z.number().nullable(), // Dividend yield percentage
  marketCap: z.number().nullable(), // Market capitalization
  volumeTurnover: z.number().nullable(), // Volume turnover ratio
});

export type SETSmartStockQuote = z.infer<typeof setsmartStockQuoteSchema>;

// SETSmart API - Financial Data Response
export const setsmartFinancialDataSchema = z.object({
  symbol: z.string(), // Company symbol
  year: z.string(), // Fiscal year (YYYY)
  quarter: z.string(), // Quarter (1-4)
  financialStatementType: z.string(), // C=Consolidated, S=Separate
  dateAsof: z.string(), // Date in YYYY-MM-DD format
  accountPeriod: z.string(), // F=Fiscal Year, C=Calendar Year
  // Balance Sheet (in Thousand Baht)
  totalAssets: z.number().nullable(),
  totalLiabilities: z.number().nullable(),
  paidupShareCapital: z.number().nullable(),
  shareholderEquity: z.number().nullable(),
  totalEquity: z.number().nullable(),
  // Income Statement (in Thousand Baht)
  totalRevenueQuarter: z.number().nullable(), // Revenue for the quarter
  totalRevenueAccum: z.number().nullable(), // Accumulated revenue (YTD)
  ebitQuarter: z.number().nullable(), // EBIT for the quarter
  ebitAccum: z.number().nullable(), // Accumulated EBIT (YTD)
  netProfitQuarter: z.number().nullable(), // Net profit for the quarter
  netProfitAccum: z.number().nullable(), // Accumulated net profit (YTD)
  // Per Share Metrics
  epsQuarter: z.number().nullable(), // Earnings Per Share (quarter)
  epsAccum: z.number().nullable(), // Earnings Per Share (accumulated)
  // Financial Ratios
  roe: z.number().nullable(), // Return on Equity (%)
  roa: z.number().nullable(), // Return on Assets (%)
  de: z.number().nullable(), // Debt to Equity ratio
  fixedAssetTurnover: z.number().nullable(), // Fixed asset turnover
  totalAssetTurnover: z.number().nullable(), // Total asset turnover
});

export type SETSmartFinancialData = z.infer<typeof setsmartFinancialDataSchema>;

// ====================================================================
// FUND PERFORMANCE & BENCHMARK DATA (SEC Fund Factsheet API)
// ====================================================================

/**
 * Fund Performance Schema
 * Returns across different time periods
 */
export const fundPerformanceSchema = z.object({
  ytd: z.number().nullable(), // Year-to-date return %
  threeMonth: z.number().nullable(), // 3-month return %
  sixMonth: z.number().nullable(), // 6-month return %
  oneYear: z.number().nullable(), // 1-year return %
  threeYear: z.number().nullable(), // 3-year annualized return %
  fiveYear: z.number().nullable(), // 5-year annualized return %
  tenYear: z.number().nullable(), // 10-year annualized return %
  sinceInception: z.number().nullable(), // Since inception return %
});

export type FundPerformance = z.infer<typeof fundPerformanceSchema>;

/**
 * Benchmark Data Schema
 * Benchmark information and returns
 */
export const benchmarkDataSchema = z.object({
  name: z.string(), // Benchmark name (e.g., "MSCI AC Asia Pacific ex Japan")
  indexCode: z.string().nullable(), // Index code
  returns: fundPerformanceSchema, // Benchmark returns across time periods
});

export type BenchmarkData = z.infer<typeof benchmarkDataSchema>;

/**
 * Volatility Metrics Schema
 * Risk and volatility measurements
 */
export const volatilityMetricsSchema = z.object({
  standardDeviation: z.number().nullable(), // 5-year standard deviation %
  maxDrawdown: z.number().nullable(), // Maximum loss in 5 years %
  volatility: z.number().nullable(), // Volatility measure
});

export type VolatilityMetrics = z.infer<typeof volatilityMetricsSchema>;

/**
 * Tracking Error Schema
 * Measures how closely fund follows benchmark
 */
export const trackingErrorSchema = z.object({
  oneYear: z.number().nullable(), // 1-year tracking error %
  description: z.string().nullable(), // Explanation
});

export type TrackingError = z.infer<typeof trackingErrorSchema>;

/**
 * Fund Comparison Data Schema
 * Category and peer group classification
 */
export const fundCompareDataSchema = z.object({
  category: z.string().nullable(), // Fund category for comparison
  categoryCode: z.string().nullable(), // Category code
  peerGroup: z.string().nullable(), // Peer group classification
});

export type FundCompareData = z.infer<typeof fundCompareDataSchema>;

/**
 * Extended RMF Fund Detail Schema
 * Includes performance, benchmark, and volatility data
 */
export const rmfFundDetailSchema = rmfFundSchema.extend({
  // Performance metrics
  performance: fundPerformanceSchema.nullable().optional(),
  benchmark: benchmarkDataSchema.nullable().optional(),
  volatility: volatilityMetricsSchema.nullable().optional(),
  trackingError: trackingErrorSchema.nullable().optional(),
  compareData: fundCompareDataSchema.nullable().optional(),

  // Additional fund metadata from SEC API
  projId: z.string().optional(), // SEC Project ID (e.g., "M0774_2554")
  amcId: z.string().optional(), // AMC unique ID
  registrationId: z.string().optional(),
  registrationDate: z.string().optional(),
  fundStatus: z.string().optional(), // "RG" (Registered), "CL" (Closed), etc.
  assetAllocation: z.array(assetAllocationSchema).optional(),
  topHoldings: z.array(fundHoldingSchema).optional(),
});

export type RMFFundDetail = z.infer<typeof rmfFundDetailSchema>;

/**
 * API Response for RMF Fund Detail with Performance Data
 */
export const rmfFundDetailWithPerformanceResponseSchema = z.object({
  fund: rmfFundDetailSchema,
  timestamp: z.string(),
});

export type RMFFundDetailWithPerformanceResponse = z.infer<typeof rmfFundDetailWithPerformanceResponseSchema>;

// ====================================================================
// CSV CONSOLIDATED DATA SCHEMA (for in-memory data service)
// ====================================================================

/**
 * RMF Fund CSV Row Schema
 * Matches the structure of docs/rmf-funds-consolidated.csv
 * Uses snake_case to match CSV column names
 */
export const rmfFundCSVSchema = z.object({
  // Core
  fund_id: z.string(),
  symbol: z.string(),
  fund_name: z.string(),
  amc: z.string(),
  
  // Metadata
  fund_classification: z.string(),
  management_style: z.string(),
  dividend_policy: z.string(),
  risk_level: z.number(),
  fund_type: z.string(),
  
  // Latest NAV
  nav_date: z.string(),
  nav_value: z.number(),
  nav_change: z.number(),
  nav_change_percent: z.number(),
  net_asset: z.number(),
  buy_price: z.number(),
  sell_price: z.number(),
  
  // NAV History Summary
  nav_history_count: z.number(),
  nav_history_first_date: z.string().nullable(),
  nav_history_last_date: z.string().nullable(),
  nav_history_min: z.number().nullable(),
  nav_history_max: z.number().nullable(),
  
  // Performance
  perf_ytd: z.number().nullable(),
  perf_3m: z.number().nullable(),
  perf_6m: z.number().nullable(),
  perf_1y: z.number().nullable(),
  perf_3y: z.number().nullable(),
  perf_5y: z.number().nullable(),
  perf_10y: z.number().nullable(),
  perf_since_inception: z.number().nullable(),
  
  // Benchmark
  benchmark_name: z.string().nullable(),
  benchmark_ytd: z.number().nullable(),
  benchmark_3m: z.number().nullable(),
  benchmark_6m: z.number().nullable(),
  benchmark_1y: z.number().nullable(),
  benchmark_3y: z.number().nullable(),
  benchmark_5y: z.number().nullable(),
  benchmark_10y: z.number().nullable(),
  
  // Dividends
  dividends_count: z.number(),
  dividends_total: z.number().nullable(),
  dividend_dates: z.string().nullable(),
  
  // JSON fields
  asset_allocation_json: z.any().nullable(),
  fees_json: z.any().nullable(),
  parties_json: z.any().nullable(),
  holdings_json: z.any().nullable(),
  risk_factors_json: z.any().nullable(),
  suitability_json: z.any().nullable(),
  
  // Documents
  factsheet_url: z.string().nullable(),
  annual_report_url: z.string().nullable(),
  halfyear_report_url: z.string().nullable(),
  
  // Investment Minimums
  investment_min_initial: z.number().nullable(),
  investment_min_additional: z.number().nullable(),
  
  // Metadata
  last_upd_date: z.string(),
});

export type RMFFundCSV = z.infer<typeof rmfFundCSVSchema>;

/**
 * NAV History Point Schema
 * Individual NAV data point from nav_history_30d array in JSON files
 */
export const navHistorySchema = z.object({
  nav_date: z.string(),
  last_val: z.number(),
  previous_val: z.number(),
  net_asset: z.number(),
  buy_price: z.number(),
  sell_price: z.number(),
  change: z.number(),
  change_percent: z.number(),
});

export type RMFNavHistory = z.infer<typeof navHistorySchema>;
