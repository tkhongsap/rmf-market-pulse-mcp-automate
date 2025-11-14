# Design Guidelines: ChatGPT Financial Data Widget

## Design Approach

**Selected Approach**: OpenAI Apps SDK Design System (User-Specified)

This application must integrate seamlessly into ChatGPT's conversational interface. The design follows OpenAI's Apps SDK guidelines, creating a native-feeling widget that appears inline within chat conversations. The focus is on data clarity, minimal visual weight, and conversational integration.

**Key Design Principles**:
- Native ChatGPT integration - feels like part of the conversation
- Data-first presentation - no decorative elements
- Semantic color usage - information conveys meaning
- Lightweight and fast-rendering
- Brand-agnostic appearance

---

## Core Design Elements

### A. Color Palette

**Light Mode**:
- Background: 0 0% 100% (pure white)
- Surface/Card: 0 0% 98% (subtle gray)
- Border: 0 0% 90% (light gray borders)
- Text Primary: 0 0% 13% (near black)
- Text Secondary: 0 0% 45% (medium gray)
- Success/Gain: 142 71% 45% (green for positive changes)
- Error/Loss: 0 84% 60% (red for negative changes)
- Accent: 221 83% 53% (subtle blue for interactive elements)

**Dark Mode**:
- Background: 0 0% 9% (dark gray)
- Surface/Card: 0 0% 14% (slightly lighter)
- Border: 0 0% 25% (medium gray borders)
- Text Primary: 0 0% 98% (near white)
- Text Secondary: 0 0% 65% (light gray)
- Success/Gain: 142 71% 55% (brighter green)
- Error/Loss: 0 84% 65% (softer red)
- Accent: 221 83% 63% (lighter blue)

### B. Typography

**Font Stack**: System fonts for optimal ChatGPT integration
- Primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

**Type Scale**:
- Heading (Asset Name): text-base font-semibold (16px)
- Price Display: text-2xl font-bold (24px) for main prices
- Subheading (Category): text-sm font-medium (14px)
- Body (Change %): text-sm (14px)
- Caption (Timestamp): text-xs text-secondary (12px)

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 2, 3, 4, 6, and 8
- Component padding: p-4 to p-6
- Card spacing: space-y-3
- Section gaps: gap-4
- Inline spacing: space-x-2

**Layout Structure**:
- Widget container: max-w-3xl (prevents excessive width)
- Grid for multiple items: grid-cols-1 md:grid-cols-2 gap-4
- Responsive breakpoint: Stacks to single column on mobile

### D. Component Library

**Data Cards**:
- White/dark background with subtle border
- Rounded corners: rounded-lg
- Padding: p-4
- Shadow: Minimal (shadow-sm) or none for flat appearance
- Hover state: Subtle border color change only

**Price Display Components**:
- Large, bold numerals for current price
- Inline badge for percentage change (pill-shaped, colored by direction)
- Small timestamp below price
- Currency symbol positioned consistently

**Change Indicators**:
- Positive: Green background with darker green text (bg-green-100 text-green-700 dark variants)
- Negative: Red background with darker red text (bg-red-100 text-red-700 dark variants)
- Format: "▲ +2.45%" or "▼ -1.23%"
- Pill shape: rounded-full px-2 py-0.5 text-xs font-medium

**Data Tables** (for multiple assets):
- Clean, minimal borders
- Alternating row backgrounds (optional, very subtle)
- Column headers: Sticky, font-medium, text-sm
- Right-align numerical data
- Mobile: Stack to cards instead of table

**Loading States**:
- Skeleton loaders matching card structure
- Subtle pulse animation
- Maintain layout dimensions to prevent content shift

**Error States**:
- Inline message within widget frame
- Neutral color scheme (not alarming red)
- Clear, actionable text
- Retry option if applicable

### E. Interactive Elements

**Minimal Animations**:
- Smooth color transitions on data updates (300ms ease)
- Subtle scale on card hover (scale-[1.01])
- No loading spinners - use skeleton screens
- No sliding, bouncing, or attention-seeking effects

**Accessibility Features**:
- Focus indicators: 2px solid ring with offset
- Keyboard navigation support for all interactive elements
- ARIA labels for screen readers on all data points
- Color contrast ratios meet WCAG 2.1 AA (4.5:1 for normal text)
- Semantic HTML structure (table for tabular data, cards for individual assets)

---

## Widget-Specific Guidelines

**Conversational Integration**:
- No headers or titles (ChatGPT provides context)
- No "powered by" branding or logos
- Clean data presentation without promotional language
- Blends into chat flow naturally

**Data Presentation**:
- Timestamp at bottom of widget (text-xs, secondary color)
- Clear currency/unit labels (USD, oz, barrel, etc.)
- Consistent decimal precision (2 decimals for prices, 2 for percentages)
- Asset symbols in parentheses where helpful (Gold (XAU))

**Responsive Behavior**:
- Mobile-first design approach
- Single column layout on mobile
- Touch-friendly tap targets (min 44x44px)
- Readable text sizes at all breakpoints

**Performance Optimization**:
- No external dependencies or CDN calls within iframe
- Inline critical CSS
- Minimal DOM nodes
- Fast initial render (< 500ms target)

---

## Images

This application does NOT use images. It is a data-focused widget displaying real-time financial information. All visual communication is achieved through typography, color-coded indicators, and structured layouts.