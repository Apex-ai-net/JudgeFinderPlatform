-- ========================================
-- MIGRATION: Create Judge Analytics Cache Table
-- Version: 20251009_006
-- Purpose: Create missing judge_analytics_cache table for caching computed analytics
-- Author: Database Performance Optimization Team
-- Date: 2025-10-09
-- ========================================
--
-- EXECUTION ORDER: Stand-alone, can be applied independently
-- Dependencies: Requires existing judges table
-- Estimated Duration: < 30 seconds (empty table creation)
-- Impact: CRITICAL - Required for analytics API performance optimization
--
-- PROBLEM STATEMENT:
-- The judge_analytics_cache table is referenced throughout the codebase but does not exist:
-- 1. lib/analytics/cache.ts queries this table for cached analytics
-- 2. Indexes exist in migration files but reference non-existent table
-- 3. Analytics API endpoint expects to cache expensive computations
--
-- SOLUTION:
-- Create judge_analytics_cache table with:
-- 1. judge_id as primary key (one cache entry per judge)
-- 2. analytics JSONB field for flexible analytics storage
-- 3. Proper foreign key constraint to judges table with CASCADE on delete
-- 4. Timestamp tracking (created_at, updated_at) with automatic defaults
-- 5. RLS policies for public read access (consistent with judges table)
-- 6. Comments documenting the table's purpose and usage
--
-- PERFORMANCE IMPACT:
-- - Enables indefinite caching of expensive analytics calculations
-- - Reduces AI inference costs by preventing repeated analytics regeneration
-- - Supports upsert pattern with judge_id conflict resolution
-- ========================================

BEGIN;

-- ============================================================================
-- Helper Functions (Ensure they exist for RLS policies)
-- ============================================================================

-- Function to check if current user is the service account
-- This function is SECURITY DEFINER and STABLE for use in RLS policies
CREATE OR REPLACE FUNCTION is_service_account()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE clerk_user_id = auth.uid()::text
    AND is_service_account = true
  );
$$;

COMMENT ON FUNCTION is_service_account() IS
  'Returns true if the current authenticated user is a backend service account. Used in RLS policies.';

-- Function to check if current user is an admin
-- This function is SECURITY DEFINER and STABLE for use in RLS policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users
    WHERE clerk_user_id = auth.uid()::text
    AND is_admin = true
  );
$$;

COMMENT ON FUNCTION is_admin() IS
  'Returns true if the current authenticated user is an admin. Used in RLS policies.';

-- Grant execute permissions (idempotent)
GRANT EXECUTE ON FUNCTION is_service_account() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_service_account() TO anon;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- ============================================================================
-- Table: judge_analytics_cache
-- Purpose: Cache computed analytics for judges to avoid expensive recalculations
-- ============================================================================
--
-- BUSINESS LOGIC:
-- This table stores pre-computed judicial analytics to optimize API performance.
-- Analytics are expensive to calculate (AI model inference + statistical analysis)
-- and can be cached indefinitely until manually refreshed.
--
-- CACHING STRATEGY (from lib/analytics/cache.ts):
-- 1. Check cache first (judge_analytics_cache table)
-- 2. If cache miss, check judges.case_analytics column (fallback)
-- 3. If both miss, compute analytics from cases table
-- 4. Upsert to cache with ON CONFLICT (judge_id)
--
-- CACHE INVALIDATION:
-- - Manual refresh only (no TTL expiration)
-- - Cost protection: prevents accidental regeneration
-- - Admin can trigger refresh via API endpoint
--
-- REDIS LAYER:
-- - Redis provides edge caching (90 days TTL)
-- - This table provides permanent database cache
-- - Redis miss -> Database cache hit (fast)
-- - Database miss -> Compute analytics (slow, expensive)
--
CREATE TABLE IF NOT EXISTS public.judge_analytics_cache (
    -- Primary Key: One cache entry per judge
    judge_id UUID PRIMARY KEY REFERENCES public.judges(id) ON DELETE CASCADE,

    -- Analytics Data: JSONB for flexible schema (matches CaseAnalytics interface)
    -- Fields include:
    --   - civil_plaintiff_favor, civil_defendant_favor (bias indicators)
    --   - confidence_civil, confidence_custody, etc. (confidence scores)
    --   - sample_size_civil, sample_size_custody, etc. (statistical significance)
    --   - total_cases_analyzed, analysis_quality (metadata)
    --   - notable_patterns[], data_limitations[] (AI insights)
    --   - generated_at, last_updated (timestamps)
    analytics JSONB NOT NULL,

    -- Timestamps: Track cache creation and updates
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata: Track analytics generation version (for future schema migrations)
    analytics_version INTEGER NOT NULL DEFAULT 1,

    -- Constraints
    CONSTRAINT judge_analytics_cache_analytics_not_empty CHECK (jsonb_typeof(analytics) = 'object')
);

-- ============================================================================
-- Table Comments
-- ============================================================================

COMMENT ON TABLE public.judge_analytics_cache IS
'Cache table for expensive judicial analytics computations. Stores pre-computed analytics to avoid repeated AI inference costs. One entry per judge with indefinite caching (manual refresh only).';

COMMENT ON COLUMN public.judge_analytics_cache.judge_id IS
'Foreign key to judges table. Primary key ensures one cache entry per judge. CASCADE delete removes cache when judge is deleted.';

COMMENT ON COLUMN public.judge_analytics_cache.analytics IS
'JSONB object containing computed analytics (CaseAnalytics interface). Includes bias indicators, confidence scores, sample sizes, and AI-generated insights.';

COMMENT ON COLUMN public.judge_analytics_cache.created_at IS
'Timestamp when analytics were first cached. Used for cache freshness checks and monitoring.';

COMMENT ON COLUMN public.judge_analytics_cache.updated_at IS
'Timestamp when analytics were last updated. Updated on UPSERT operations.';

COMMENT ON COLUMN public.judge_analytics_cache.analytics_version IS
'Schema version for analytics object. Used for handling analytics schema migrations. Increment when CaseAnalytics interface changes.';

-- ============================================================================
-- Indexes
-- ============================================================================

-- Primary Index: Fast lookup by judge_id (automatically created by PRIMARY KEY)
-- This index supports: SELECT * FROM judge_analytics_cache WHERE judge_id = ?

-- Composite Index: Judge ID with timestamp ordering
-- Supports: SELECT * FROM judge_analytics_cache WHERE judge_id = ? ORDER BY created_at DESC
-- Used by: Cache freshness checks, finding latest analytics
CREATE INDEX IF NOT EXISTS idx_judge_analytics_cache_freshness
    ON public.judge_analytics_cache(judge_id, created_at DESC);

COMMENT ON INDEX idx_judge_analytics_cache_freshness IS
'Enables fast cache freshness checks. Supports queries ordering by created_at timestamp.';

-- Timestamp Index: For cleanup and monitoring queries
-- Supports: SELECT * FROM judge_analytics_cache WHERE created_at < ?
-- Used by: Admin dashboards showing cache age distribution
CREATE INDEX IF NOT EXISTS idx_judge_analytics_cache_created_at
    ON public.judge_analytics_cache(created_at DESC);

COMMENT ON INDEX idx_judge_analytics_cache_created_at IS
'Supports cache age monitoring and cleanup operations. Useful for admin dashboards showing cache statistics.';

-- Partial Index: Old cache entries (for potential future cleanup)
-- Note: Removed partial index with CURRENT_DATE due to PostgreSQL IMMUTABLE requirement
-- Standard index on created_at (above) is sufficient for cache age queries
-- If needed, add partial index manually after deployment with a fixed date

-- ============================================================================
-- Row-Level Security (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE public.judge_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Service Role Full Access (ALWAYS WORKS - bypasses RLS)
-- The service_role bypasses RLS entirely, but we include this policy for explicitness
CREATE POLICY "judge_analytics_cache_service_role"
  ON public.judge_analytics_cache
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "judge_analytics_cache_service_role" ON public.judge_analytics_cache IS
'Service role bypass for all operations. Required for analytics generation pipeline and admin operations.';

-- Policy: Service Account Full Access
-- Service accounts (authenticated backend service users) can perform all operations
CREATE POLICY "judge_analytics_cache_service_account_all"
  ON public.judge_analytics_cache
  FOR ALL
  USING (is_service_account())
  WITH CHECK (is_service_account());

COMMENT ON POLICY "judge_analytics_cache_service_account_all" ON public.judge_analytics_cache IS
'Service account full access for authenticated backend operations. Used by analytics generation service.';

-- Policy: Admin Full Access
-- Admins can read, update, and refresh analytics cache
CREATE POLICY "judge_analytics_cache_admin_all"
  ON public.judge_analytics_cache
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY "judge_analytics_cache_admin_all" ON public.judge_analytics_cache IS
'Admin users can manage analytics cache entries. Supports manual cache refresh operations.';

-- Policy: Public Read Access
-- Anyone can read cached analytics (consistent with judges table public read policy)
-- This enables public API endpoints to serve cached analytics without authentication
CREATE POLICY "judge_analytics_cache_public_select"
  ON public.judge_analytics_cache
  FOR SELECT
  USING (true);

COMMENT ON POLICY "judge_analytics_cache_public_select" ON public.judge_analytics_cache IS
'Public read access to cached analytics. Consistent with judges table public read policy. Enables unauthenticated API access to analytics data.';

-- ============================================================================
-- Trigger: Automatic updated_at Timestamp
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_judge_analytics_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_judge_analytics_cache_updated_at() IS
'Trigger function to automatically update updated_at timestamp on row updates.';

-- Trigger to call the function before UPDATE
CREATE TRIGGER judge_analytics_cache_updated_at
    BEFORE UPDATE ON public.judge_analytics_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_judge_analytics_cache_updated_at();

COMMENT ON TRIGGER judge_analytics_cache_updated_at ON public.judge_analytics_cache IS
'Automatically updates updated_at timestamp on every row update. Helps track cache freshness.';

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function: Get cache statistics
-- Returns useful metrics about the analytics cache
CREATE OR REPLACE FUNCTION public.get_judge_analytics_cache_stats()
RETURNS TABLE(
    total_cached_judges INTEGER,
    oldest_cache_entry TIMESTAMPTZ,
    newest_cache_entry TIMESTAMPTZ,
    average_cache_age_days NUMERIC,
    stale_entries_90_days INTEGER,
    cache_table_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INTEGER AS total_cached_judges,
        MIN(created_at) AS oldest_cache_entry,
        MAX(created_at) AS newest_cache_entry,
        ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400), 2) AS average_cache_age_days,
        COUNT(*) FILTER (WHERE created_at < CURRENT_DATE - INTERVAL '90 days')::INTEGER AS stale_entries_90_days,
        pg_size_pretty(pg_total_relation_size('public.judge_analytics_cache')) AS cache_table_size
    FROM public.judge_analytics_cache;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_judge_analytics_cache_stats() IS
'Returns statistics about the analytics cache including entry count, age distribution, and storage size. Useful for monitoring and capacity planning.';

-- Function: Clear stale cache entries (manual cleanup utility)
-- Note: Not used by default (indefinite caching), but available for maintenance
CREATE OR REPLACE FUNCTION public.clear_stale_analytics_cache(days_old INTEGER DEFAULT 180)
RETURNS TABLE(
    deleted_count INTEGER,
    oldest_deleted TIMESTAMPTZ,
    newest_deleted TIMESTAMPTZ
) AS $$
DECLARE
    v_deleted_count INTEGER;
    v_oldest TIMESTAMPTZ;
    v_newest TIMESTAMPTZ;
BEGIN
    -- Store stats before deletion
    SELECT
        COUNT(*)::INTEGER,
        MIN(created_at),
        MAX(created_at)
    INTO v_deleted_count, v_oldest, v_newest
    FROM public.judge_analytics_cache
    WHERE created_at < CURRENT_DATE - (days_old || ' days')::INTERVAL;

    -- Delete stale entries
    DELETE FROM public.judge_analytics_cache
    WHERE created_at < CURRENT_DATE - (days_old || ' days')::INTERVAL;

    -- Return stats
    RETURN QUERY SELECT v_deleted_count, v_oldest, v_newest;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.clear_stale_analytics_cache(INTEGER) IS
'Manual cleanup function to remove analytics cache entries older than specified days. Default 180 days. Use cautiously as regeneration is expensive.';

-- ============================================================================
-- Verify Table Creation
-- ============================================================================

-- Verify table exists with correct structure
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_column_count INTEGER;
    v_index_count INTEGER;
    v_policy_count INTEGER;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'judge_analytics_cache'
    ) INTO v_table_exists;

    -- Count columns
    SELECT COUNT(*)
    INTO v_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'judge_analytics_cache';

    -- Count indexes
    SELECT COUNT(*)
    INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'judge_analytics_cache';

    -- Count policies
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'judge_analytics_cache';

    -- Report results
    RAISE NOTICE '
    ============================================================================
    Judge Analytics Cache Table Created Successfully
    ============================================================================

    Table: judge_analytics_cache
    Status: %

    Structure:
    - Columns: % (expected: 5)
    - Indexes: % (expected: 4 - primary + 3 composite)
    - Policies: % (expected: 4 - service_role, service_account, admin, public)

    Features:
    ✓ Primary key on judge_id
    ✓ Foreign key to judges table (CASCADE delete)
    ✓ JSONB analytics column with NOT NULL constraint
    ✓ Automatic updated_at trigger
    ✓ RLS enabled with public read access
    ✓ Service role bypass (always works)
    ✓ Service account support (for authenticated backend)
    ✓ Admin full access
    ✓ Performance indexes (freshness, created_at)
    ✓ Helper functions (cache stats, cleanup utility)

    Cache Strategy:
    - Indefinite caching (no TTL expiration)
    - Manual refresh only (cost protection)
    - Redis edge cache: 90 days
    - Database cache: permanent until refresh

    Usage Pattern:
    1. API checks Redis cache (fast, 90-day TTL)
    2. Redis miss -> Check database cache (this table)
    3. Database miss -> Compute analytics (slow, expensive)
    4. UPSERT to database cache (ON CONFLICT judge_id)
    5. Write to Redis cache (90-day TTL)

    Query Examples:
    -- Get cached analytics for a judge
    SELECT analytics FROM judge_analytics_cache WHERE judge_id = ''uuid-here'';

    -- Upsert analytics (app pattern)
    INSERT INTO judge_analytics_cache (judge_id, analytics)
    VALUES (''uuid-here'', ''{"confidence_civil": 0.92}''::jsonb)
    ON CONFLICT (judge_id) DO UPDATE
    SET analytics = EXCLUDED.analytics, updated_at = NOW();

    -- Get cache statistics
    SELECT * FROM get_judge_analytics_cache_stats();

    -- Clear stale entries (manual cleanup)
    SELECT * FROM clear_stale_analytics_cache(180); -- 180 days

    Next Steps:
    1. Analytics API will automatically use this cache
    2. Monitor cache hit rate in application logs
    3. Review cache statistics periodically
    4. Consider manual refresh for judges with major case updates

    Related Code:
    - lib/analytics/cache.ts (cache read/write logic)
    - app/api/judges/[id]/analytics/route.ts (analytics API)
    - lib/analytics/statistical.ts (analytics computation)

    ============================================================================
    ',
    CASE WHEN v_table_exists THEN 'CREATED' ELSE 'FAILED' END,
    v_column_count,
    v_index_count,
    v_policy_count;

    -- Fail if table wasn't created
    IF NOT v_table_exists THEN
        RAISE EXCEPTION 'Failed to create judge_analytics_cache table';
    END IF;
END $$;

-- ============================================================================
-- Update Statistics for Query Planner
-- ============================================================================

ANALYZE public.judge_analytics_cache;

COMMIT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
