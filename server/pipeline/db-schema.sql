-- PostgreSQL Database Schema for RMF Pipeline
-- Tables: rmf_funds, rmf_nav_history, rmf_dividends, pipeline_runs

-- Table 1: rmf_funds (Main fund data)
CREATE TABLE IF NOT EXISTS rmf_funds (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(50) UNIQUE NOT NULL,
    proj_id VARCHAR(50) UNIQUE NOT NULL,
    fund_name_en TEXT,
    fund_name_th TEXT,
    amc VARCHAR(255),
    status VARCHAR(10),

    -- Registration & Dates
    register_date DATE,
    cancel_date DATE,

    -- Current NAV
    latest_nav DECIMAL(12, 4),
    latest_nav_date DATE,
    nav_change DECIMAL(12, 4),
    nav_change_percent DECIMAL(8, 4),
    buy_price DECIMAL(12, 4),
    sell_price DECIMAL(12, 4),

    -- Classification
    fund_policy TEXT,
    dividend_policy TEXT,
    risk_level INTEGER,
    fund_category VARCHAR(100),
    fund_type VARCHAR(10),
    management_style VARCHAR(10),
    net_asset DECIMAL(16, 2),

    -- Performance (JSON for flexibility)
    performance JSONB,
    benchmark JSONB,

    -- Risk Metrics
    volatility_5y DECIMAL(8, 4),
    tracking_error_1y DECIMAL(8, 4),

    -- NAV History Statistics
    nav_history_count INTEGER,
    nav_history_first_date DATE,
    nav_history_last_date DATE,
    nav_history_min DECIMAL(12, 4),
    nav_history_max DECIMAL(12, 4),

    -- Dividend Statistics
    dividends_count INTEGER,
    dividends_total DECIMAL(12, 4),
    dividends_last_date DATE,

    -- Metadata Counts
    fees_count INTEGER,
    parties_count INTEGER,
    risk_factors_count INTEGER,

    -- Error Tracking
    errors_count INTEGER,
    errors JSONB,

    -- Asset Allocation (JSONB array)
    asset_allocation JSONB,

    -- Fees (JSONB array)
    fees JSONB,

    -- Parties (JSONB array)
    involved_parties JSONB,

    -- Holdings (JSONB array - top 5)
    top_holdings JSONB,

    -- Risk Factors (JSONB array)
    risk_factors JSONB,

    -- Suitability
    suitability JSONB,

    -- Documents
    document_urls JSONB,

    -- Investment Minimums
    investment_minimums JSONB,

    -- Metadata
    data_fetched_at TIMESTAMP WITH TIME ZONE,
    data_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for rmf_funds
CREATE INDEX IF NOT EXISTS idx_rmf_funds_symbol ON rmf_funds(symbol);
CREATE INDEX IF NOT EXISTS idx_rmf_funds_amc ON rmf_funds(amc);
CREATE INDEX IF NOT EXISTS idx_rmf_funds_risk_level ON rmf_funds(risk_level);
CREATE INDEX IF NOT EXISTS idx_rmf_funds_status ON rmf_funds(status);
CREATE INDEX IF NOT EXISTS idx_rmf_funds_category ON rmf_funds(fund_category);

-- Table 2: rmf_nav_history (Historical NAV data)
CREATE TABLE IF NOT EXISTS rmf_nav_history (
    id SERIAL PRIMARY KEY,
    fund_symbol VARCHAR(50) REFERENCES rmf_funds(symbol) ON DELETE CASCADE,
    nav_date DATE NOT NULL,
    nav DECIMAL(12, 4),
    nav_change DECIMAL(12, 4),
    nav_change_percent DECIMAL(8, 4),
    previous_nav DECIMAL(12, 4),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Composite unique constraint
    UNIQUE(fund_symbol, nav_date)
);

-- Indexes for rmf_nav_history
CREATE INDEX IF NOT EXISTS idx_rmf_nav_fund_date ON rmf_nav_history(fund_symbol, nav_date DESC);

-- Table 3: rmf_dividends (Dividend history)
CREATE TABLE IF NOT EXISTS rmf_dividends (
    id SERIAL PRIMARY KEY,
    fund_symbol VARCHAR(50) REFERENCES rmf_funds(symbol) ON DELETE CASCADE,
    xa_date DATE,
    dividend_rate DECIMAL(12, 4),
    dividend_type VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Composite unique constraint
    UNIQUE(fund_symbol, xa_date)
);

-- Indexes for rmf_dividends
CREATE INDEX IF NOT EXISTS idx_rmf_dividends_fund_date ON rmf_dividends(fund_symbol, xa_date DESC);

-- Table 4: pipeline_runs (Execution tracking)
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id SERIAL PRIMARY KEY,
    run_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    run_completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20),

    -- Statistics
    total_funds_processed INTEGER,
    successful_funds INTEGER,
    failed_funds INTEGER,
    api_calls_made INTEGER,

    -- Error tracking
    errors JSONB,

    -- Metadata
    duration_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for pipeline_runs
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started ON pipeline_runs(run_started_at DESC);
