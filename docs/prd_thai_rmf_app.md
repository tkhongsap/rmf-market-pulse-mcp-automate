# Product Requirements Document: Thai RMF Fund Comparison App

## 1. Product Overview

A free, conversational ChatGPT app designed to help Thai investors discover, compare, and track Retirement Mutual Funds (RMF) to make informed investment decisions—particularly during the year-end tax season when RMF purchases peak.

**Target Platform**: ChatGPT Shop (MCP Protocol integration)
**Market**: Thailand
**Primary Use Case**: Tax-season RMF selection and year-round fund monitoring

---

## 2. Problem Statement

### Current Pain Points
- **Tax deadline pressure**: Thai investors rush to buy RMF funds in November-December without adequate research
- **Information overload**: 300+ RMF funds with complex performance metrics across multiple AMCs
- **Fragmented data**: Fund information scattered across SEC website, AMC portals, and financial news sites
- **Decision paralysis**: Difficulty comparing funds across risk levels, returns, fees, and asset allocations
- **Limited guidance**: Users need insights without being told what to buy (regulatory compliance)

### Opportunity
Create a conversational, AI-powered comparison tool that surfaces the right data at the right time, helping users make confident RMF investment decisions through natural language queries and rich data visualizations.

---

## 3. Target Users

### Primary Persona: "Tax-Season Investor"
- Age: 28-45, salaried employee
- Income: 300K-2M THB/year (tax bracket: 15-35%)
- Behavior: Researches RMF options 1-2 months before Dec 31 deadline
- Pain: Limited time to compare 300+ funds; overwhelmed by financial jargon
- Goal: Maximize tax deduction (up to 500K THB) with acceptable risk

### Secondary Persona: "Active Tracker"
- Age: 35-55, seasoned investor
- Behavior: Monitors RMF portfolio quarterly; reallocates annually
- Pain: Tracking performance across multiple AMCs is tedious
- Goal: Optimize long-term returns within retirement portfolio strategy

---

## 4. Goals & Objectives

### Business Goals
1. Become the go-to RMF comparison tool in ChatGPT ecosystem for Thai users
2. Drive 10K+ monthly active users during Q4 tax season (Nov-Dec)
3. Establish trust through accurate, real-time SEC API data
4. Monetization path: Premium features (advanced analytics, alerts) in future

### User Goals
1. **Discover**: Find RMF funds matching investment criteria in <2 minutes
2. **Compare**: Evaluate performance across multiple timeframes side-by-side
3. **Decide**: Understand tax benefits and risk-return tradeoffs confidently
4. **Track**: Monitor favorite funds' performance over time

### Success Metrics
- **Engagement**: 70%+ users compare 3+ funds per session
- **Performance**: <3s response time for fund queries
- **Satisfaction**: 4.5+ star rating in ChatGPT Shop
- **Retention**: 40%+ users return during Dec tax deadline

---

## 5. Core Features

### 5.1 Conversational Fund Discovery (MVP)

**Natural Language Queries**
- "Show me RMF funds with best 5-year returns"
- "Which low-risk RMF funds have lowest fees?"
- "Compare SCBRMF and KFRMF performance"
- "RMF funds suitable for 100K THB investment"

**AI-Powered Responses**
- Contextual answers with data-backed insights
- Automatic filtering based on user intent
- Follow-up suggestions ("Would you like to see 10-year returns?")

**Display Mode**: Hybrid
- **Inline cards** for single fund details
- **Inline carousel** for top 3-8 fund comparisons
- **Fullscreen** for detailed multi-fund analysis with charts

---

### 5.2 Performance Comparison (MVP)

**Timeframe Coverage**
- 1 week, 1 month, 3 months, 6 months (short-term)
- YTD (year-to-date)
- 1 year, 3 years, 5 years, 10 years (long-term)

**Metrics Displayed**
- NAV (Net Asset Value) and % change
- Cumulative returns per timeframe
- Risk rating (1-8 scale per SEC)
- Sharpe ratio (risk-adjusted returns)
- Maximum drawdown

**Visualization**
- Line charts: NAV trends over selected period
- Bar charts: Side-by-side return comparison
- Color coding: Green (gains), Red (losses), Gray (neutral)

---

### 5.3 Fund Search & Filtering (MVP)

**Search Options**
- Fund name or code (e.g., "SCBRMF", "K-RMF")
- AMC name (e.g., "SCB Asset Management")
- Policy type (Equity, Fixed Income, Mixed, Target Date)

**Filters**
- Risk level: 1-8 (Low to Very High)
- Minimum investment: <10K, 10K-50K, 50K-100K, >100K THB
- Management fee: <1%, 1-1.5%, 1.5-2%, >2%
- AMC size: Top 10, Mid-tier, Boutique

**Sorting**
- Best performers (by timeframe)
- Lowest fees
- Highest AUM (Assets Under Management)
- Newest funds

---

### 5.4 Portfolio Tracking (MVP)

**Watchlist Functionality**
- Save up to 10 favorite funds (free tier)
- Quick access via "Show my saved RMF funds"
- Real-time NAV updates

**Comparison View**
- Side-by-side performance of saved funds
- Highlight best/worst performers
- Export to ChatGPT conversation history

---

### 5.5 Fund Detail View (MVP)

**Essential Information**
- Fund name, code, AMC
- Current NAV and daily change
- Asset allocation breakdown (Equity/Fixed Income/Cash %)
- Top 10 holdings (stocks/bonds)
- Fees: Front-load, Management, Redemption
- Risk rating and investment policy

**Contextual Insights** (Moderate Education)
- "This fund invests 70% in Thai equities—higher risk but potential for growth"
- "Management fee of 1.8% is above category average (1.5%)"
- "5-year returns of 8.2% outperformed SET Index (6.5%)"

---

### 5.6 Tax Benefit Context (MVP)

**Educational Snippets** (NOT a calculator—avoid legal liability)
- "RMF investments up to 500K THB are tax-deductible"
- "Tax savings depend on your income bracket (15-35%)"
- "Example: 100K investment at 25% bracket = 25K tax savings"
- Link to SEC official resources for detailed calculations

**Proactive Nudges** (Nov-Dec only)
- "Tax deadline approaching—review your RMF options for this year"
- Context-aware reminders based on user query history

---

## 6. Technical Architecture

### 6.1 Technology Stack

**Frontend**: Not applicable (ChatGPT-native UI)
**Backend**: Node.js/Express (TypeScript)
**Data Source**: Thailand SEC API
- Fund Factsheet API
- Fund Daily Info API
**Protocol**: Model Context Protocol (MCP)
**Hosting**: Vercel/Railway (serverless with edge caching)

### 6.2 MCP Tool Definitions

```typescript
Tools:
1. search_rmf_funds
   - Inputs: query (string), filters (risk, fees, amc), limit (number)
   - Output: Inline carousel of 3-8 matching funds

2. get_rmf_fund_detail
   - Input: fund_code (string)
   - Output: Fullscreen detailed fund view with charts

3. compare_rmf_funds
   - Input: fund_codes (array), timeframes (array)
   - Output: Fullscreen comparison table + charts

4. get_rmf_performance
   - Input: fund_code (string), timeframe (string)
   - Output: Inline card with performance metrics

5. manage_watchlist
   - Input: action (add/remove/list), fund_code (string)
   - Output: Updated watchlist inline card
```

### 6.3 Data Strategy

**Caching**
- Fund list: 24-hour cache (updates daily)
- NAV data: 1-hour cache (SEC updates once daily anyway)
- Historical performance: 6-hour cache

**Rate Limiting**
- SEC API: 3,000 calls/5 min (per API key)
- User queries: 30 requests/min per ChatGPT user

**Fallback Handling**
- Stale-while-revalidate pattern
- Error messages: "Unable to fetch latest data—showing cached results from [timestamp]"

---

## 7. Design Guidelines (OpenAI Apps SDK Compliance)

### 7.1 Display Mode Usage

**Inline Cards** - Single fund quick view
- Fund name + AMC
- Current NAV + % change (color-coded)
- Risk rating badge
- 1 CTA: "View Details"

**Inline Carousel** - Fund comparison (3-8 funds)
- Consistent card format across all funds
- Metadata limited to: NAV, 1Y return, Risk, Fee
- Single CTA per card: "Compare"
- No nested scrolling

**Fullscreen** - Detailed analysis
- Performance charts (line/bar)
- Asset allocation pie chart
- Top holdings table
- System composer available for queries like "Show 10-year chart"

### 7.2 Visual Design

**Color Palette**
- System-defined backgrounds (light/dark mode support)
- Brand accent: Blue (#0066FF) for CTAs and badges only
- Semantic colors: Green (positive returns), Red (negative), Gray (neutral)

**Typography**
- Platform-native fonts (SF Pro/Roboto)
- Font sizes: body (16px), body-small (14px)
- No custom typefaces

**Spacing**
- System grid spacing (8px base unit)
- Consistent margins: 16px card padding
- Clear hierarchy: Headline → Metrics → CTA

**Icons**
- Monochromatic outlined style
- Examples: 📊 (chart), 🔍 (search), ⭐ (watchlist), ⚠️ (risk)

### 7.3 Content & Tone

**Voice**: Informative, neutral, non-promotional
- ✅ "This fund returned 8.2% over 5 years"
- ❌ "Amazing 5-year performance—invest now!"

**Conciseness**: Scannable insights
- Max 3 lines of metadata per inline card
- Bullet points for key facts in fullscreen

**Contextual Proactivity**
- Only during Nov-Dec: "Year-end tax deadline is Dec 31"
- Never: Unsolicited promotions or fund recommendations

---

## 8. User Flows

### Flow 1: First-Time Tax-Season User
1. User: "I want to invest in RMF for tax savings"
2. App: Explains RMF tax benefits (inline card) + "How much are you looking to invest?"
3. User: "100,000 baht"
4. App: Shows carousel of 5 funds suitable for 100K investment (sorted by 5Y returns)
5. User: Taps "Compare" on 3 funds
6. App: Opens fullscreen comparison table with performance charts
7. User: "Show me asset allocation for SCBRMF"
8. App: Updates fullscreen to display SCBRMF allocation pie chart

### Flow 2: Experienced Investor
1. User: "Compare SCBRMF vs KFRMF performance"
2. App: Fullscreen side-by-side comparison (all timeframes)
3. User: "Add SCBRMF to watchlist"
4. App: Confirms addition via inline card
5. User: "Show my watchlist"
6. App: Displays saved funds carousel with current NAV updates

---

## 9. Feature Prioritization

### MVP (Phase 1 - Month 1-2)
- ✅ Conversational fund search
- ✅ Performance comparison (all timeframes)
- ✅ Fund detail view
- ✅ Search & filtering
- ✅ Watchlist (up to 10 funds)
- ✅ Tax benefit context snippets

### Phase 2 (Month 3-4)
- Historical NAV charts (interactive)
- Advanced filters (Sharpe ratio, max drawdown)
- AMC comparison view
- Export watchlist data

### Phase 3 (Future)
- Performance alerts ("Your watchlist fund dropped 5%")
- Peer comparison ("This fund vs category average")
- Premium tier: Unlimited watchlist, custom reports

---

## 10. Out of Scope

**Explicitly NOT Included** (Regulatory & Design Compliance)
- ❌ **Investment recommendations**: Never tell users which fund to buy
- ❌ **Tax calculators**: Avoid liability—link to official SEC resources instead
- ❌ **Purchase integration**: No "Buy Now" buttons (requires broker licenses)
- ❌ **Portfolio management**: No tracking of actual investments (privacy concerns)
- ❌ **Advertising**: No AMC sponsorships or promoted fund listings
- ❌ **Long-form content**: Avoid static articles (use conversational education)
- ❌ **Sensitive data display**: No user financial info in cards

---

## 11. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SEC API downtime | High | Cache + fallback to 24h-old data; clear error messaging |
| Regulatory scrutiny | High | Disclaimer: "For informational purposes only"; no recommendations |
| Low tax-season traffic | Medium | Pre-launch marketing in Q3; partnerships with Thai finance communities |
| Data accuracy concerns | High | Real-time SEC API validation; display data timestamp on all cards |
| ChatGPT Shop discovery | Medium | SEO-optimized app description; leverage Thai language keywords |

---

## 12. Success Criteria

**Launch Readiness** (Must-haves)
- ✅ All 300+ active RMF funds indexed
- ✅ <3s average response time
- ✅ 99.5% uptime during Nov-Dec
- ✅ WCAG AA accessibility compliance
- ✅ Thai language support (fund names, descriptions)

**Post-Launch (3-month targets)**
- 10,000+ unique users
- 4.5+ star rating
- 50K+ tool calls
- 40% user retention through Dec tax deadline

---

## 13. Timeline

**Week 1-2**: Backend setup (SEC API integration, caching, MCP protocol)
**Week 3-4**: Core tools development (search, detail, compare)
**Week 5-6**: Watchlist + performance optimization
**Week 7**: Testing + ChatGPT Shop submission
**Week 8**: Soft launch + iteration
**Week 9+**: Public launch (target: October for Nov-Dec tax season)

---

## 14. Appendix

### A. Sample Conversational Queries
- "Best performing RMF funds this year"
- "Low-risk RMF with highest returns"
- "RMF funds from SCB and Kasikorn bank"
- "What's the difference between SCBRMF and SCBRMFIX?"
- "Show me equity-focused RMF funds"

### B. Data Sources
- Thailand SEC Fund Factsheet API: https://api-portal.sec.or.th/
- SEC Fund Daily Info API
- Historical NAV data (10-year lookback)

### C. Regulatory References
- RMF tax deduction rules: https://www.rd.go.th/ (Revenue Department)
- SEC fund classifications: https://market.sec.or.th/

---

**Document Version**: 1.0
**Last Updated**: 2025-11-07
**Owner**: Thai RMF App Development Team
