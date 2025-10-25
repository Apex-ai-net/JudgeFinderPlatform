-- Performance Optimization: Critical Database Indexes
-- Created: 2025-10-05
-- Purpose: Add indexes for slow queries identified in performance audit

-- ============================================================
-- CASES TABLE INDEXES (75-90% query time reduction expected)
-- ============================================================

-- Index for judge-based queries with date filtering
-- Used by: /api/judges/[id]/analytics, /api/judges/list
CREATE INDEX IF NOT EXISTS idx_cases_judge_decision_date
ON cases(judge_id, decision_date DESC NULLS LAST)
WHERE decision_date IS NOT NULL;

-- Index for recent cases lookups (bias analysis, analytics)
-- Used by: /api/judges/[id]/bias-analysis
-- Note: Removed CURRENT_DATE predicate (not immutable)
CREATE INDEX IF NOT EXISTS idx_cases_recent_filings
ON cases(judge_id, filing_date DESC NULLS LAST)
WHERE filing_date IS NOT NULL;

-- Index for case type filtering
-- Used by: Analytics calculations, case type distribution
CREATE INDEX IF NOT EXISTS idx_cases_type_outcome
ON cases(case_type, outcome)
WHERE case_type IS NOT NULL;

-- ============================================================
-- JUDGES TABLE INDEXES (Search optimization)
-- ============================================================

-- Full-text search index for judge names
-- Used by: /api/judges/search, /app/judges/search
CREATE INDEX IF NOT EXISTS idx_judges_name_trgm_alt
ON judges USING gin (name gin_trgm_ops);

-- Court name search index
CREATE INDEX IF NOT EXISTS idx_judges_court_name_trgm_alt
ON judges USING gin (court_name gin_trgm_ops);

-- Composite index for jurisdiction filtering
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'judges' AND column_name = 'county'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_judges_jurisdiction_county
    ON judges(jurisdiction, county)
    WHERE jurisdiction IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- COURTS TABLE INDEXES
-- ============================================================

-- Court search by name
CREATE INDEX IF NOT EXISTS idx_courts_name_trgm_alt
ON courts USING gin (name gin_trgm_ops);

-- Court jurisdiction lookups
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'court_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_courts_jurisdiction
    ON courts(jurisdiction, court_type)
    WHERE jurisdiction IS NOT NULL;
  END IF;
END $$;

-- ============================================================
-- COURT ASSIGNMENTS TABLE (Judge-Court relationships)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'court_assignments') THEN
    -- Judge assignments lookups
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'court_assignments' AND column_name = 'is_current'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_court_assignments_judge
      ON court_assignments(judge_id, is_current DESC, start_date DESC);

      CREATE INDEX IF NOT EXISTS idx_court_assignments_court
      ON court_assignments(court_id, is_current DESC);
    END IF;
  END IF;
END $$;

-- ============================================================
-- ENABLE pg_trgm EXTENSION (Required for text search indexes)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- ANALYTICS CACHE TABLE INDEXES
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'judge_analytics_cache') THEN
    -- Cache lookups by judge_id
    CREATE INDEX IF NOT EXISTS idx_judge_analytics_cache_judge
    ON judge_analytics_cache(judge_id, created_at DESC);

    -- Cleanup old cache entries (removed CURRENT_DATE predicate)
    CREATE INDEX IF NOT EXISTS idx_judge_analytics_cache_created
    ON judge_analytics_cache(created_at);
  END IF;
END $$;

-- ============================================================
-- VERIFY INDEX CREATION
-- ============================================================

-- Check index sizes (for monitoring)
-- Commented out - can be run manually when needed
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- AND indexname LIKE 'idx_%'
-- ORDER BY indexname;
