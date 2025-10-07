-- Performance Optimization: Critical Database Indexes
-- Created: 2025-10-05
-- Purpose: Add indexes for slow queries identified in performance audit

-- ============================================================
-- CASES TABLE INDEXES (75-90% query time reduction expected)
-- ============================================================

-- Index for judge-based queries with date filtering
-- Used by: /api/judges/[id]/analytics, /api/judges/list
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_judge_decision_date
ON cases(judge_id, decision_date DESC NULLS LAST)
WHERE decision_date IS NOT NULL;

-- Index for recent cases lookups (bias analysis, analytics)
-- Used by: /api/judges/[id]/bias-analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_recent_filings
ON cases(judge_id, filing_date DESC NULLS LAST)
WHERE filing_date >= CURRENT_DATE - INTERVAL '5 years';

-- Index for case type filtering
-- Used by: Analytics calculations, case type distribution
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_type_outcome
ON cases(case_type, outcome)
WHERE case_type IS NOT NULL;

-- ============================================================
-- JUDGES TABLE INDEXES (Search optimization)
-- ============================================================

-- Full-text search index for judge names
-- Used by: /api/judges/search, /app/judges/search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judges_name_trgm
ON judges USING gin (name gin_trgm_ops);

-- Court name search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judges_court_name_trgm
ON judges USING gin (court_name gin_trgm_ops);

-- Composite index for jurisdiction filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judges_jurisdiction_county
ON judges(jurisdiction, county)
WHERE jurisdiction IS NOT NULL;

-- ============================================================
-- COURTS TABLE INDEXES
-- ============================================================

-- Court search by name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courts_name_trgm
ON courts USING gin (name gin_trgm_ops);

-- Court jurisdiction lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courts_jurisdiction
ON courts(jurisdiction, court_type)
WHERE jurisdiction IS NOT NULL;

-- ============================================================
-- COURT ASSIGNMENTS TABLE (Judge-Court relationships)
-- ============================================================

-- Judge assignments lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_court_assignments_judge
ON court_assignments(judge_id, is_current DESC, start_date DESC);

-- Court judge listings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_court_assignments_court
ON court_assignments(court_id, is_current DESC);

-- ============================================================
-- ENABLE pg_trgm EXTENSION (Required for text search indexes)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ANALYTICS CACHE TABLE INDEXES
-- ============================================================

-- Cache lookups by judge_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judge_analytics_cache_judge
ON judge_analytics_cache(judge_id, created_at DESC);

-- Cleanup old cache entries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_judge_analytics_cache_created
ON judge_analytics_cache(created_at)
WHERE created_at < CURRENT_DATE - INTERVAL '90 days';

-- ============================================================
-- VERIFY INDEX CREATION
-- ============================================================

-- Check index sizes (for monitoring)
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid::regclass) DESC;
