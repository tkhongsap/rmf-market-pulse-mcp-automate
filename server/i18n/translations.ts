/**
 * Bilingual Translation Dictionary
 * Thai/English translations for MCP server responses
 */

export type Language = 'en' | 'th';

export interface Translations {
  // Common terms
  found: string;
  rmfFunds: string;
  fund: string;
  funds: string;
  showingPage: string;
  matchingFilters: string;
  managedBy: string;
  currentNav: string;
  riskLevel: string;
  comparing: string;

  // Filter labels
  search: string;
  amc: string;
  minRisk: string;
  maxRisk: string;
  category: string;
  minYtd: string;

  // Period labels
  ytd: string;
  threeMonth: string;
  sixMonth: string;
  oneYear: string;
  threeYear: string;
  fiveYear: string;
  tenYear: string;

  // Performance terms
  top: string;
  performing: string;
  for: string;

  // NAV history terms
  navHistory: string;
  over: string;
  days: string;
  periodReturn: string;
  volatility: string;
  noNavHistory: string;
  noNavHistoryAvailable: string;

  // Error messages
  fundCodeRequired: string;
  fundNotFound: string;
  invalidPeriod: string;
  atLeastTwoFundsRequired: string;
  maximumFiveFunds: string;

  // Units
  thb: string;
  baht: string;
  percent: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    // Common terms
    found: 'Found',
    rmfFunds: 'RMF funds',
    fund: 'fund',
    funds: 'funds',
    showingPage: 'Showing page',
    matchingFilters: 'matching filters',
    managedBy: 'managed by',
    currentNav: 'Current NAV',
    riskLevel: 'Risk level',
    comparing: 'Comparing',

    // Filter labels
    search: 'search',
    amc: 'AMC',
    minRisk: 'min risk',
    maxRisk: 'max risk',
    category: 'category',
    minYtd: 'min YTD',

    // Period labels
    ytd: 'YTD',
    threeMonth: '3-Month',
    sixMonth: '6-Month',
    oneYear: '1-Year',
    threeYear: '3-Year',
    fiveYear: '5-Year',
    tenYear: '10-Year',

    // Performance terms
    top: 'Top',
    performing: 'performing',
    for: 'for',

    // NAV history terms
    navHistory: 'NAV history',
    over: 'over',
    days: 'days',
    periodReturn: 'Period return',
    volatility: 'Volatility',
    noNavHistory: 'No NAV history available for',
    noNavHistoryAvailable: 'No NAV history available',

    // Error messages
    fundCodeRequired: 'fundCode parameter is required',
    fundNotFound: 'Fund not found',
    invalidPeriod: 'Invalid period',
    atLeastTwoFundsRequired: 'At least 2 fund codes are required for comparison',
    maximumFiveFunds: 'Maximum 5 funds can be compared at once',

    // Units
    thb: 'THB',
    baht: 'THB',
    percent: '%',
  },

  th: {
    // Common terms
    found: 'พบ',
    rmfFunds: 'กองทุน RMF',
    fund: 'กองทุน',
    funds: 'กองทุน',
    showingPage: 'แสดงหน้า',
    matchingFilters: 'ที่ตรงกับเงื่อนไข',
    managedBy: 'จัดการโดย',
    currentNav: 'มูลค่าหน่วยลงทุนปัจจุบัน',
    riskLevel: 'ระดับความเสี่ยง',
    comparing: 'เปรียบเทียบ',

    // Filter labels
    search: 'ค้นหา',
    amc: 'บลจ.',
    minRisk: 'ความเสี่ยงต่ำสุด',
    maxRisk: 'ความเสี่ยงสูงสุด',
    category: 'ประเภท',
    minYtd: 'ผลตอบแทน YTD ต่ำสุด',

    // Period labels
    ytd: 'ตั้งแต่ต้นปี',
    threeMonth: '3 เดือน',
    sixMonth: '6 เดือน',
    oneYear: '1 ปี',
    threeYear: '3 ปี',
    fiveYear: '5 ปี',
    tenYear: '10 ปี',

    // Performance terms
    top: 'อันดับแรก',
    performing: 'ที่มีผลตอบแทนสูงสุด',
    for: 'ในช่วง',

    // NAV history terms
    navHistory: 'ประวัติมูลค่าหน่วยลงทุน',
    over: 'ย้อนหลัง',
    days: 'วัน',
    periodReturn: 'ผลตอบแทนช่วงเวลา',
    volatility: 'ความผันผวน',
    noNavHistory: 'ไม่มีข้อมูลมูลค่าหน่วยลงทุนสำหรับ',
    noNavHistoryAvailable: 'ไม่มีข้อมูลมูลค่าหน่วยลงทุน',

    // Error messages
    fundCodeRequired: 'ต้องระบุรหัสกองทุน',
    fundNotFound: 'ไม่พบกองทุน',
    invalidPeriod: 'ช่วงเวลาไม่ถูกต้อง',
    atLeastTwoFundsRequired: 'ต้องระบุรหัสกองทุนอย่างน้อย 2 กองทุนสำหรับการเปรียบเทียบ',
    maximumFiveFunds: 'สามารถเปรียบเทียบได้สูงสุด 5 กองทุนต่อครั้ง',

    // Units
    thb: 'บาท',
    baht: 'บาท',
    percent: '%',
  },
};

/**
 * Get translation for a key
 */
export function t(key: keyof Translations, lang: Language = 'en'): string {
  return translations[lang][key] || translations.en[key];
}

/**
 * Get period label
 */
export function getPeriodLabel(period: string, lang: Language = 'en'): string {
  const periodMap: Record<string, keyof Translations> = {
    'ytd': 'ytd',
    '3m': 'threeMonth',
    '6m': 'sixMonth',
    '1y': 'oneYear',
    '3y': 'threeYear',
    '5y': 'fiveYear',
    '10y': 'tenYear',
  };

  const key = periodMap[period];
  return key ? t(key, lang) : period;
}
