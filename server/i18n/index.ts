/**
 * Language Detection and Bilingual Template Functions
 * For Thai RMF Market Pulse MCP Server
 */

import { RMFFundCSV } from '../../shared/schema.js';
import { t, getPeriodLabel, type Language } from './translations.js';

/**
 * Detect language from optional question text
 * Uses Thai Unicode character range (\u0E00-\u0E7F) for detection
 */
export function detectLanguage(question?: string): Language {
  if (!question || question.trim() === '') {
    return 'en'; // Default to English
  }

  // Thai characters Unicode range: U+0E00 to U+0E7F
  const thaiCharRegex = /[\u0E00-\u0E7F]/;
  return thaiCharRegex.test(question) ? 'th' : 'en';
}

/**
 * Template: get_rmf_funds response
 */
export function formatFundListSummary(
  totalCount: number,
  page: number,
  fundsLength: number,
  lang: Language
): string {
  if (lang === 'th') {
    return `${t('found', lang)} ${t('rmfFunds', lang)} ${totalCount} ${t('funds', lang)} ${t('showingPage', lang)} ${page} (${fundsLength} ${t('funds', lang)})`;
  }
  return `${t('found', lang)} ${totalCount} ${t('rmfFunds', lang)}. ${t('showingPage', lang)} ${page} (${fundsLength} ${t('funds', lang)}).`;
}

/**
 * Template: search_rmf_funds response
 */
export function formatSearchSummary(
  totalCount: number,
  filters: Record<string, any>,
  lang: Language
): string {
  const filterLabels: string[] = [];

  if (filters.search) {
    filterLabels.push(`${t('search', lang)}: "${filters.search}"`);
  }
  if (filters.amc) {
    filterLabels.push(`${t('amc', lang)}: "${filters.amc}"`);
  }
  if (filters.minRiskLevel !== undefined) {
    filterLabels.push(`${t('minRisk', lang)}: ${filters.minRiskLevel}`);
  }
  if (filters.maxRiskLevel !== undefined) {
    filterLabels.push(`${t('maxRisk', lang)}: ${filters.maxRiskLevel}`);
  }
  if (filters.category) {
    filterLabels.push(`${t('category', lang)}: ${filters.category}`);
  }
  if (filters.minYtdReturn !== undefined) {
    filterLabels.push(`${t('minYtd', lang)}: ${filters.minYtdReturn}%`);
  }

  if (filterLabels.length > 0) {
    if (lang === 'th') {
      return `${t('found', lang)} ${t('rmfFunds', lang)} ${totalCount} ${t('funds', lang)}${t('matchingFilters', lang)}: ${filterLabels.join(', ')}`;
    }
    return `${t('found', lang)} ${totalCount} ${t('rmfFunds', lang)} ${t('matchingFilters', lang)}: ${filterLabels.join(', ')}`;
  }

  if (lang === 'th') {
    return `${t('found', lang)} ${t('rmfFunds', lang)} ${totalCount} ${t('funds', lang)}`;
  }
  return `${t('found', lang)} ${totalCount} ${t('rmfFunds', lang)}.`;
}

/**
 * Template: get_rmf_fund_detail response
 */
export function formatFundDetailSummary(fund: RMFFundCSV, lang: Language): string {
  const navChange = fund.nav_change >= 0 ? '+' : '';
  const navChangePercent = fund.nav_change_percent.toFixed(2);

  if (lang === 'th') {
    return `${fund.fund_name} (${fund.symbol}) ${t('managedBy', lang)} ${fund.amc} ${t('currentNav', lang)}: ${fund.nav_value} ${t('baht', lang)} (${navChange}${navChangePercent}%) ${t('riskLevel', lang)}: ${fund.risk_level}/8`;
  }

  return `${fund.fund_name} (${fund.symbol}) ${t('managedBy', lang)} ${fund.amc}. ${t('currentNav', lang)}: ${fund.nav_value} ${t('thb', lang)} (${navChange}${navChangePercent}%). ${t('riskLevel', lang)}: ${fund.risk_level}/8.`;
}

/**
 * Template: get_rmf_fund_performance response
 */
export function formatPerformanceSummary(
  topFundsCount: number,
  period: string,
  riskLevel: number | undefined,
  lang: Language
): string {
  const periodLabel = getPeriodLabel(period, lang);

  if (lang === 'th') {
    if (riskLevel !== undefined) {
      return `กองทุน RMF ที่มีผลตอบแทนสูงสุด ${topFundsCount} อันดับแรก สำหรับช่วง${periodLabel} (ระดับความเสี่ยง ${riskLevel})`;
    }
    return `กองทุน RMF ที่มีผลตอบแทนสูงสุด ${topFundsCount} อันดับแรก สำหรับช่วง${periodLabel}`;
  }

  if (riskLevel !== undefined) {
    return `Top ${topFundsCount} performing RMF funds for ${periodLabel} (Risk Level ${riskLevel})`;
  }
  return `Top ${topFundsCount} performing RMF funds for ${periodLabel}`;
}

/**
 * Template: get_rmf_fund_nav_history response (no history)
 */
export function formatNoNavHistorySummary(
  fundName: string,
  fundCode: string,
  lang: Language
): string {
  if (lang === 'th') {
    return `${t('noNavHistory', lang)} ${fundName} (${fundCode})`;
  }
  return `${t('noNavHistory', lang)} ${fundName} (${fundCode})`;
}

/**
 * Template: get_rmf_fund_nav_history response (with history)
 */
export function formatNavHistorySummary(
  fundName: string,
  fundCode: string,
  days: number,
  periodReturn: string,
  volatility: string,
  lang: Language
): string {
  if (lang === 'th') {
    return `${fundName} (${fundCode}) ${t('navHistory', lang)}${t('over', lang)} ${days} ${t('days', lang)} ${t('periodReturn', lang)}: ${periodReturn}% ${t('volatility', lang)}: ${volatility}%`;
  }

  return `${fundName} (${fundCode}) ${t('navHistory', lang)} ${t('over', lang)} ${days} ${t('days', lang)}. ${t('periodReturn', lang)}: ${periodReturn}%. ${t('volatility', lang)}: ${volatility}%.`;
}

/**
 * Template: compare_rmf_funds response
 */
export function formatCompareSummary(
  fundsCount: number,
  fundSymbols: string[],
  lang: Language
): string {
  if (lang === 'th') {
    return `${t('comparing', lang)} ${t('rmfFunds', lang)} ${fundsCount} ${t('funds', lang)}: ${fundSymbols.join(', ')}`;
  }
  return `${t('comparing', lang)} ${fundsCount} ${t('rmfFunds', lang)}: ${fundSymbols.join(', ')}`;
}

/**
 * Get error message in appropriate language
 */
export function getErrorMessage(errorType: string, details?: string, lang: Language = 'en'): string {
  switch (errorType) {
    case 'fundCodeRequired':
      return t('fundCodeRequired', lang);
    case 'fundNotFound':
      return `${t('fundNotFound', lang)}${details ? `: ${details}` : ''}`;
    case 'invalidPeriod':
      return `${t('invalidPeriod', lang)}${details ? `: ${details}` : ''}`;
    case 'atLeastTwoFundsRequired':
      return t('atLeastTwoFundsRequired', lang);
    case 'maximumFiveFunds':
      return t('maximumFiveFunds', lang);
    default:
      return details || errorType;
  }
}

// Re-export types
export type { Language };
