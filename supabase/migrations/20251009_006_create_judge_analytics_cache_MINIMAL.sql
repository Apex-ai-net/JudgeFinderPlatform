-- =====================================================
-- MINIMAL JUDGE ANALYTICS CACHE MIGRATION
-- =====================================================
-- This migration creates a cache table for judge analytics
-- with minimal dependencies and bulletproof RLS policies.
--
-- Design principles:
-- 1. No external dependencies or helper functions
-- 2. Simple RLS policies using only auth.role()
-- 3. Works on fresh DB or with existing data
-- 4. Idempotent - safe to run multiple times
-- =====================================================

-- Drop existing objects if they exist (idempotent)
-- Drop functions first (they don't depend on the table)
DROP FUNCTION IF EXISTS public.update_judge_analytics_cache_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_cache_modification() CASCADE;
DROP FUNCTION IF EXISTS public.get_cache_stats() CASCADE;
DROP FUNCTION IF EXISTS public.clear_judge_cache(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.clear_all_cache() CASCADE;

-- Drop table if exists (CASCADE will drop triggers automatically)
DROP TABLE IF EXISTS public.judge_analytics_cache CASCADE;

-- =====================================================
-- CREATE TABLE
-- =====================================================

CREATE TABLE public.judge_analytics_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    judge_id uuid NOT NULL,
    analytics jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Ensure one cache entry per judge
    CONSTRAINT judge_analytics_cache_judge_id_key UNIQUE (judge_id)
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Fast lookup by judge_id (most common query)
CREATE INDEX idx_judge_analytics_cache_judge_id
    ON public.judge_analytics_cache(judge_id);

-- Index for time-based queries
CREATE INDEX idx_judge_analytics_cache_created_at
    ON public.judge_analytics_cache(created_at DESC);

-- Composite index for judge + timestamp
CREATE INDEX idx_judge_analytics_cache_judge_created
    ON public.judge_analytics_cache(judge_id, created_at DESC);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.judge_analytics_cache ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES (MINIMAL & BULLETPROOF)
-- =====================================================

-- SERVICE ROLE: Full access for backend operations
CREATE POLICY "Service role has full access to cache"
    ON public.judge_analytics_cache
    FOR ALL
    TO authenticated
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- PUBLIC: Read-only access (data is public anyway)
CREATE POLICY "Public read access to cache"
    ON public.judge_analytics_cache
    FOR SELECT
    TO public
    USING (true);

-- AUTHENTICATED: Read-only access
CREATE POLICY "Authenticated users can read cache"
    ON public.judge_analytics_cache
    FOR SELECT
    TO authenticated
    USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_judge_analytics_cache_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger: Auto-update updated_at
CREATE TRIGGER update_judge_analytics_cache_updated_at
    BEFORE UPDATE ON public.judge_analytics_cache
    FOR EACH ROW
    EXECUTE FUNCTION public.update_judge_analytics_cache_updated_at();

-- Function: Get cache statistics
CREATE OR REPLACE FUNCTION public.get_cache_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT jsonb_build_object(
        'total_entries', COUNT(*),
        'oldest_entry', MIN(created_at),
        'newest_entry', MAX(created_at),
        'average_age_hours', EXTRACT(EPOCH FROM AVG(now() - created_at)) / 3600,
        'total_size_bytes', pg_total_relation_size('public.judge_analytics_cache')
    )
    FROM public.judge_analytics_cache;
$$;

-- Function: Clear cache for a specific judge
CREATE OR REPLACE FUNCTION public.clear_judge_cache(p_judge_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only service role can clear cache
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Only service role can clear cache';
    END IF;

    DELETE FROM public.judge_analytics_cache
    WHERE judge_id = p_judge_id;

    RETURN true;
END;
$$;

-- Function: Clear all cache entries (use with caution)
CREATE OR REPLACE FUNCTION public.clear_all_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Only service role can clear cache
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Only service role can clear cache';
    END IF;

    DELETE FROM public.judge_analytics_cache;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant table permissions
GRANT SELECT ON public.judge_analytics_cache TO anon, authenticated;
GRANT ALL ON public.judge_analytics_cache TO service_role;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_cache_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.clear_judge_cache(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_all_cache() TO service_role;

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE public.judge_analytics_cache IS
    'Cache table for judge analytics data. Uses simple RLS policies with no external dependencies. Service role has full access, public has read access.';

COMMENT ON COLUMN public.judge_analytics_cache.judge_id IS
    'Foreign key to judges table (not enforced to avoid circular dependencies)';

COMMENT ON COLUMN public.judge_analytics_cache.analytics IS
    'Cached analytics data as JSONB (CaseAnalytics interface)';

COMMENT ON FUNCTION public.get_cache_stats() IS
    'Returns statistics about the cache (total entries, expired entries, size, etc.)';

COMMENT ON FUNCTION public.clear_judge_cache(uuid) IS
    'Clears cache for a specific judge. Only callable by service role.';

COMMENT ON FUNCTION public.clear_all_cache() IS
    'Clears all expired cache entries. Returns count of deleted entries. Only callable by service role.';

-- =====================================================
-- VERIFICATION QUERIES (commented out)
-- =====================================================

-- Uncomment these to verify the migration:
--
-- Check table exists:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name = 'judge_analytics_cache';
--
-- Check indexes:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'judge_analytics_cache';
--
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'judge_analytics_cache';
--
-- Check policies:
-- SELECT policyname, cmd, roles, qual FROM pg_policies
-- WHERE tablename = 'judge_analytics_cache';
--
-- Test cache stats:
-- SELECT public.get_cache_stats();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
