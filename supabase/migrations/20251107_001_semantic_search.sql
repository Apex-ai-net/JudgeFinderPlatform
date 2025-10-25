-- ========================================
-- MIGRATION: AI Search Analytics & Tracking
-- Version: 20251009_006
-- Purpose: Enable AI search metrics tracking and analytics
-- Author: AI Search Intelligence Team
-- Date: 2025-10-09
-- ========================================
--
-- EXECUTION ORDER: After 20251008_003_performance_indexes.sql
-- Dependencies: Requires pg_trgm extension (already enabled in 20250930_003_full_text_search.sql)
-- Estimated Duration: 1-2 minutes
-- Impact: MEDIUM - Adds analytics tables for AI search tracking
--
-- PROBLEM STATEMENT:
-- Need to track AI search effectiveness and measure impact on user experience:
-- 1. Which AI features improve search results
-- 2. How often AI processing succeeds/fails
-- 3. User engagement with AI-enhanced results
-- 4. Performance impact of AI processing
--
-- SOLUTION:
-- 1. Create ai_search_metrics table for query tracking
-- 2. Create ai_search_clicks table for click tracking
-- 3. Add indexes for efficient analytics queries
-- 4. Create helper functions for metric aggregation
-- ========================================

-- ===========================================
-- TABLE: AI Search Metrics
-- ===========================================
-- Tracks every search query with AI processing metadata
--
CREATE TABLE IF NOT EXISTS ai_search_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Query information
    query TEXT NOT NULL,
    ai_processed BOOLEAN DEFAULT false,

    -- AI insights
    intent_type TEXT,  -- judge, court, jurisdiction, mixed
    search_type TEXT,  -- name, characteristic, location, case_type, general
    confidence DECIMAL(3,2),  -- 0.00 to 1.00

    -- Extracted entities
    extracted_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
    extracted_case_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    extracted_names TEXT[] DEFAULT ARRAY[]::TEXT[],
    extracted_characteristics TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Results metadata
    results_count INTEGER DEFAULT 0,
    top_result_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
    top_result_scores DECIMAL[] DEFAULT ARRAY[]::DECIMAL[],

    -- Performance
    processing_time_ms INTEGER,

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_confidence CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    CONSTRAINT valid_results_count CHECK (results_count >= 0),
    CONSTRAINT valid_processing_time CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0)
);

COMMENT ON TABLE ai_search_metrics IS
'Tracks AI search queries with intent detection and entity extraction metadata. Used for measuring AI feature effectiveness.';

COMMENT ON COLUMN ai_search_metrics.query IS 'Original user search query';
COMMENT ON COLUMN ai_search_metrics.ai_processed IS 'Whether AI processing was successful for this query';
COMMENT ON COLUMN ai_search_metrics.intent_type IS 'AI-detected search intent (judge, court, jurisdiction, mixed)';
COMMENT ON COLUMN ai_search_metrics.search_type IS 'Type of search (name, characteristic, location, case_type, general)';
COMMENT ON COLUMN ai_search_metrics.confidence IS 'AI confidence score (0-1) for intent detection';
COMMENT ON COLUMN ai_search_metrics.processing_time_ms IS 'Total search processing time in milliseconds';

-- ===========================================
-- TABLE: AI Search Clicks
-- ===========================================
-- Tracks user clicks on search results to measure engagement
--
CREATE TABLE IF NOT EXISTS ai_search_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Search context
    search_query TEXT NOT NULL,
    ai_processed BOOLEAN DEFAULT false,
    intent_type TEXT,

    -- Clicked result
    result_id TEXT NOT NULL,
    result_type TEXT NOT NULL,  -- judge, court, jurisdiction
    result_title TEXT NOT NULL,
    result_position INTEGER NOT NULL,

    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_result_position CHECK (result_position >= 0)
);

COMMENT ON TABLE ai_search_clicks IS
'Tracks search result clicks to measure AI search effectiveness. Links user engagement back to AI features.';

COMMENT ON COLUMN ai_search_clicks.search_query IS 'Query that led to this click';
COMMENT ON COLUMN ai_search_clicks.ai_processed IS 'Whether the search was AI-processed';
COMMENT ON COLUMN ai_search_clicks.result_position IS 'Position of clicked result (0-based)';

-- ===========================================
-- INDEXES: AI Search Metrics
-- ===========================================

-- Query performance (for aggregation by query)
CREATE INDEX IF NOT EXISTS idx_ai_search_metrics_query
    ON ai_search_metrics(query);

-- Time-based queries (for date range analytics)
CREATE INDEX IF NOT EXISTS idx_ai_search_metrics_created_at
    ON ai_search_metrics(created_at DESC);

-- AI processing analysis
CREATE INDEX IF NOT EXISTS idx_ai_search_metrics_ai_processed
    ON ai_search_metrics(ai_processed, created_at DESC);

-- Intent type analysis
CREATE INDEX IF NOT EXISTS idx_ai_search_metrics_intent
    ON ai_search_metrics(intent_type, created_at DESC)
    WHERE intent_type IS NOT NULL;

-- Performance analysis
CREATE INDEX IF NOT EXISTS idx_ai_search_metrics_processing_time
    ON ai_search_metrics(processing_time_ms)
    WHERE processing_time_ms IS NOT NULL;

-- ===========================================
-- INDEXES: AI Search Clicks
-- ===========================================

-- Query performance
CREATE INDEX IF NOT EXISTS idx_ai_search_clicks_query
    ON ai_search_clicks(search_query);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_ai_search_clicks_created_at
    ON ai_search_clicks(created_at DESC);

-- AI processing analysis
CREATE INDEX IF NOT EXISTS idx_ai_search_clicks_ai_processed
    ON ai_search_clicks(ai_processed, created_at DESC);

-- Result analysis
CREATE INDEX IF NOT EXISTS idx_ai_search_clicks_result
    ON ai_search_clicks(result_id, result_type);

-- ===========================================
-- FUNCTION: Get AI Search CTR (Click-Through Rate)
-- ===========================================
-- Compare AI vs non-AI search click-through rates
--
CREATE OR REPLACE FUNCTION get_ai_search_ctr(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    ai_searches BIGINT,
    ai_clicks BIGINT,
    ai_ctr DECIMAL,
    non_ai_searches BIGINT,
    non_ai_clicks BIGINT,
    non_ai_ctr DECIMAL,
    improvement_pct DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    ai_search_count BIGINT;
    ai_click_count BIGINT;
    ai_ctr_value DECIMAL;
    non_ai_search_count BIGINT;
    non_ai_click_count BIGINT;
    non_ai_ctr_value DECIMAL;
BEGIN
    -- Count AI searches
    SELECT COUNT(*) INTO ai_search_count
    FROM ai_search_metrics
    WHERE ai_processed = true
    AND created_at BETWEEN start_date AND end_date;

    -- Count AI clicks
    SELECT COUNT(*) INTO ai_click_count
    FROM ai_search_clicks
    WHERE ai_processed = true
    AND created_at BETWEEN start_date AND end_date;

    -- Calculate AI CTR
    ai_ctr_value := CASE
        WHEN ai_search_count > 0 THEN ai_click_count::DECIMAL / ai_search_count::DECIMAL
        ELSE 0
    END;

    -- Count non-AI searches
    SELECT COUNT(*) INTO non_ai_search_count
    FROM ai_search_metrics
    WHERE ai_processed = false
    AND created_at BETWEEN start_date AND end_date;

    -- Count non-AI clicks
    SELECT COUNT(*) INTO non_ai_click_count
    FROM ai_search_clicks
    WHERE ai_processed = false
    AND created_at BETWEEN start_date AND end_date;

    -- Calculate non-AI CTR
    non_ai_ctr_value := CASE
        WHEN non_ai_search_count > 0 THEN non_ai_click_count::DECIMAL / non_ai_search_count::DECIMAL
        ELSE 0
    END;

    RETURN QUERY
    SELECT
        ai_search_count,
        ai_click_count,
        ai_ctr_value,
        non_ai_search_count,
        non_ai_click_count,
        non_ai_ctr_value,
        CASE
            WHEN non_ai_ctr_value > 0 THEN ((ai_ctr_value - non_ai_ctr_value) / non_ai_ctr_value) * 100
            ELSE 0
        END AS improvement_pct;
END;
$$;

COMMENT ON FUNCTION get_ai_search_ctr(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) IS
'Calculates and compares click-through rates for AI-processed vs non-AI searches. Returns improvement percentage.';

-- ===========================================
-- FUNCTION: Get Top Search Patterns
-- ===========================================
-- Identify most common search queries and their performance
--
CREATE OR REPLACE FUNCTION get_top_search_patterns(
    pattern_limit INTEGER DEFAULT 10,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE (
    search_query TEXT,
    search_count BIGINT,
    avg_results DECIMAL,
    ai_processing_rate DECIMAL,
    avg_processing_time_ms DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        query AS search_query,
        COUNT(*)::BIGINT AS search_count,
        AVG(results_count)::DECIMAL AS avg_results,
        (SUM(CASE WHEN ai_processed THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)::DECIMAL) AS ai_processing_rate,
        AVG(processing_time_ms)::DECIMAL AS avg_processing_time_ms
    FROM ai_search_metrics
    WHERE created_at >= start_date
    GROUP BY query
    ORDER BY search_count DESC
    LIMIT pattern_limit;
END;
$$;

COMMENT ON FUNCTION get_top_search_patterns(INTEGER, TIMESTAMP WITH TIME ZONE) IS
'Returns most common search queries with performance metrics and AI processing rates.';

-- ===========================================
-- FUNCTION: Get AI Feature Effectiveness
-- ===========================================
-- Measure which AI features are most effective
--
CREATE OR REPLACE FUNCTION get_ai_feature_effectiveness(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days'
)
RETURNS TABLE (
    intent_type TEXT,
    query_count BIGINT,
    avg_results DECIMAL,
    avg_confidence DECIMAL,
    click_count BIGINT,
    ctr DECIMAL
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.intent_type,
        COUNT(DISTINCT m.id)::BIGINT AS query_count,
        AVG(m.results_count)::DECIMAL AS avg_results,
        AVG(m.confidence)::DECIMAL AS avg_confidence,
        COUNT(DISTINCT c.id)::BIGINT AS click_count,
        (COUNT(DISTINCT c.id)::DECIMAL / NULLIF(COUNT(DISTINCT m.id)::DECIMAL, 0)) AS ctr
    FROM ai_search_metrics m
    LEFT JOIN ai_search_clicks c
        ON m.query = c.search_query
        AND m.created_at::DATE = c.created_at::DATE
    WHERE m.ai_processed = true
    AND m.created_at >= start_date
    AND m.intent_type IS NOT NULL
    GROUP BY m.intent_type
    ORDER BY query_count DESC;
END;
$$;

COMMENT ON FUNCTION get_ai_feature_effectiveness(TIMESTAMP WITH TIME ZONE) IS
'Measures effectiveness of different AI intent types by analyzing results and click-through rates.';

-- ===========================================
-- VIEW: AI Search Performance Dashboard
-- ===========================================
-- Real-time overview of AI search performance
--
CREATE OR REPLACE VIEW ai_search_performance_dashboard AS
SELECT
    -- Overall stats
    COUNT(*) AS total_searches,
    SUM(CASE WHEN ai_processed THEN 1 ELSE 0 END) AS ai_processed_searches,
    (SUM(CASE WHEN ai_processed THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*)::DECIMAL, 0)) AS ai_processing_rate,

    -- Results stats
    AVG(results_count)::DECIMAL AS avg_results_count,
    AVG(CASE WHEN ai_processed THEN results_count END)::DECIMAL AS avg_ai_results,
    AVG(CASE WHEN NOT ai_processed THEN results_count END)::DECIMAL AS avg_non_ai_results,

    -- Performance stats
    AVG(processing_time_ms)::DECIMAL AS avg_processing_time_ms,
    AVG(CASE WHEN ai_processed THEN processing_time_ms END)::DECIMAL AS avg_ai_processing_time,
    AVG(CASE WHEN NOT ai_processed THEN processing_time_ms END)::DECIMAL AS avg_non_ai_processing_time,

    -- Confidence stats
    AVG(confidence)::DECIMAL AS avg_confidence,

    -- Time period
    MIN(created_at) AS earliest_search,
    MAX(created_at) AS latest_search
FROM ai_search_metrics
WHERE created_at >= NOW() - INTERVAL '24 hours';

COMMENT ON VIEW ai_search_performance_dashboard IS
'Real-time dashboard view of AI search performance over the last 24 hours.';

-- ===========================================
-- Enable Row Level Security (if auth enabled)
-- ===========================================
-- RLS policies for analytics tables (admin-only access)
--

ALTER TABLE ai_search_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_search_clicks ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage ai_search_metrics"
    ON ai_search_metrics
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can manage ai_search_clicks"
    ON ai_search_clicks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow public read access to aggregate views only (not raw data)
-- Individual queries are not exposed, only aggregated metrics

-- ===========================================
-- Update Statistics
-- ===========================================
ANALYZE ai_search_metrics;
ANALYZE ai_search_clicks;

-- ===========================================
-- USAGE EXAMPLES
-- ===========================================
--
-- 1. Track a search query:
-- INSERT INTO ai_search_metrics (
--     query, ai_processed, intent_type, search_type,
--     confidence, results_count, processing_time_ms
-- ) VALUES (
--     'judge smith los angeles', true, 'judge', 'name',
--     0.95, 15, 120
-- );
--
-- 2. Track a click:
-- INSERT INTO ai_search_clicks (
--     search_query, ai_processed, result_id,
--     result_type, result_title, result_position
-- ) VALUES (
--     'judge smith los angeles', true, 'uuid-123',
--     'judge', 'Judge John Smith', 0
-- );
--
-- 3. Get CTR comparison:
-- SELECT * FROM get_ai_search_ctr();
--
-- 4. Get top search patterns:
-- SELECT * FROM get_top_search_patterns(20);
--
-- 5. View dashboard:
-- SELECT * FROM ai_search_performance_dashboard;
--
-- 6. Get feature effectiveness:
-- SELECT * FROM get_ai_feature_effectiveness();
--
-- ===========================================
