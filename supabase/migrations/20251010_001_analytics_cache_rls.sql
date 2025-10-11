-- Migration: Analytics Cache RLS Policies
-- Version: 20251010_001
-- Description: Enable Row Level Security on judge_analytics_cache table
--
-- SECURITY ISSUE: This table previously lacked RLS policies, allowing potential
-- direct database access bypassing application-level controls.
--
-- Access Pattern:
-- - Public READ: Analytics are public data used for judicial transparency
-- - Service WRITE: Only backend services can insert/update cached analytics
-- - Service DELETE: Only backend services can clean up stale cache entries
--
-- Related Tables: judges, cases
-- Dependencies: Requires existing judge_analytics_cache table

BEGIN;

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================

ALTER TABLE public.judge_analytics_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Public Read Access
-- ============================================================================

-- Public can view all analytics cache entries
-- Rationale: Judicial analytics are public data intended for transparency.
-- Users need read access to view judge statistics, case patterns, and bias indicators.
DROP POLICY IF EXISTS "analytics_cache_public_select" ON public.judge_analytics_cache;
CREATE POLICY "analytics_cache_public_select"
  ON public.judge_analytics_cache
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- ============================================================================
-- Service Role Write Access
-- ============================================================================

-- Service role can insert new cache entries
DROP POLICY IF EXISTS "analytics_cache_service_insert" ON public.judge_analytics_cache;
CREATE POLICY "analytics_cache_service_insert"
  ON public.judge_analytics_cache
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update existing cache entries
DROP POLICY IF EXISTS "analytics_cache_service_update" ON public.judge_analytics_cache;
CREATE POLICY "analytics_cache_service_update"
  ON public.judge_analytics_cache
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Service Role Delete Access
-- ============================================================================

-- Service role can delete stale cache entries
-- Rationale: Only backend cleanup jobs should remove cache entries
DROP POLICY IF EXISTS "analytics_cache_service_delete" ON public.judge_analytics_cache;
CREATE POLICY "analytics_cache_service_delete"
  ON public.judge_analytics_cache
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE public.judge_analytics_cache IS 
  'Cached analytics results for judges. RLS enabled with public read access (judicial transparency) and service role write access (backend-only updates).';

COMMENT ON POLICY "analytics_cache_public_select" ON public.judge_analytics_cache IS
  'Public read access for transparency - analytics are public judicial data';

COMMENT ON POLICY "analytics_cache_service_insert" ON public.judge_analytics_cache IS
  'Service role can insert new analytics cache entries';

COMMENT ON POLICY "analytics_cache_service_update" ON public.judge_analytics_cache IS
  'Service role can update existing analytics cache entries';

COMMENT ON POLICY "analytics_cache_service_delete" ON public.judge_analytics_cache IS
  'Service role can delete stale cache entries during cleanup operations';

COMMIT;
