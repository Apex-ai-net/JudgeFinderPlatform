-- ========================================
-- BASE SCHEMA - IDEMPOTENT VERSION
-- Safe to run even if tables partially exist
-- ========================================
-- This migration creates all core tables with IF NOT EXISTS
-- so it can be safely applied to databases in any state

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- Courts table
CREATE TABLE IF NOT EXISTS courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('federal', 'state', 'local')),
    jurisdiction VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    website VARCHAR(255),
    judge_count INTEGER DEFAULT 0,
    courtlistener_id VARCHAR(100) UNIQUE,
    courthouse_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Judges table
CREATE TABLE IF NOT EXISTS judges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
    court_name VARCHAR(255),
    jurisdiction VARCHAR(100),
    appointed_date DATE,
    education TEXT,
    profile_image_url VARCHAR(500),
    bio TEXT,
    total_cases INTEGER DEFAULT 0,
    reversal_rate DECIMAL(3,2) DEFAULT 0.00,
    average_decision_time INTEGER, -- in days
    courtlistener_id VARCHAR(100),
    courtlistener_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cases table
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(100) UNIQUE NOT NULL,
    case_name VARCHAR(500) NOT NULL,
    judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
    court_id UUID REFERENCES courts(id) ON DELETE SET NULL,
    case_type VARCHAR(100),
    filing_date DATE NOT NULL,
    decision_date DATE,
    status VARCHAR(50) CHECK (status IN ('pending', 'decided', 'settled', 'dismissed')),
    outcome TEXT,
    summary TEXT,
    courtlistener_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table (extends Supabase auth.users)
-- NOTE: This may already exist - IF NOT EXISTS will skip if so
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'attorney', 'admin')),
    phone VARCHAR(20),
    company VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attorneys table (for attorney profiles)
CREATE TABLE IF NOT EXISTS attorneys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bar_number VARCHAR(50),
    firm_name VARCHAR(255),
    specialty VARCHAR(100),
    years_experience INTEGER,
    cases_won INTEGER DEFAULT 0,
    cases_total INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attorney slots for advertising (original system)
CREATE TABLE IF NOT EXISTS attorney_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
    attorney_id UUID REFERENCES attorneys(id) ON DELETE SET NULL,
    position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
    start_date DATE NOT NULL,
    end_date DATE,
    price_per_month DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(judge_id, position)
);

-- Bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, judge_id)
);

-- Search history
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Judge analytics cache
CREATE TABLE IF NOT EXISTS judge_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(judge_id, metric_type)
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL CHECK (plan IN ('free', 'basic', 'pro', 'enterprise')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'suspended')),
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
-- NOTE: These use IF NOT EXISTS where supported

-- Judges indexes
CREATE INDEX IF NOT EXISTS idx_judges_court_id ON judges(court_id);
CREATE INDEX IF NOT EXISTS idx_judges_name ON judges(name);
CREATE INDEX IF NOT EXISTS idx_judges_courtlistener_id ON judges(courtlistener_id);

-- Cases indexes
CREATE INDEX IF NOT EXISTS idx_cases_judge_id ON cases(judge_id);
CREATE INDEX IF NOT EXISTS idx_cases_court_id ON cases(court_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_filing_date ON cases(filing_date);

-- Courts indexes
CREATE INDEX IF NOT EXISTS idx_courts_type ON courts(type);
CREATE INDEX IF NOT EXISTS idx_courts_jurisdiction ON courts(jurisdiction);

-- Search history indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_judge_id ON bookmarks(judge_id);

-- Attorney slots indexes
CREATE INDEX IF NOT EXISTS idx_attorney_slots_judge_id ON attorney_slots(judge_id);
CREATE INDEX IF NOT EXISTS idx_attorney_slots_attorney_id ON attorney_slots(attorney_id);
CREATE INDEX IF NOT EXISTS idx_attorney_slots_active ON attorney_slots(is_active) WHERE is_active = TRUE;

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Judge analytics indexes
CREATE INDEX IF NOT EXISTS idx_judge_analytics_judge_id ON judge_analytics(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_analytics_metric_type ON judge_analytics(metric_type);

-- Comments
COMMENT ON TABLE courts IS 'Court information including federal and state courts';
COMMENT ON TABLE judges IS 'Judge profiles with courtlistener integration';
COMMENT ON TABLE cases IS 'Legal cases associated with judges and courts';
COMMENT ON TABLE users IS 'User profiles extending Supabase auth';
COMMENT ON TABLE attorneys IS 'Attorney profiles for platform users';
COMMENT ON TABLE attorney_slots IS 'Advertising slots on judge profiles (original system)';
COMMENT ON TABLE bookmarks IS 'User bookmarks of judge profiles';
COMMENT ON TABLE search_history IS 'User search query history';
COMMENT ON TABLE judge_analytics IS 'Cached analytics for judge performance metrics';
COMMENT ON TABLE subscriptions IS 'User subscription management';
