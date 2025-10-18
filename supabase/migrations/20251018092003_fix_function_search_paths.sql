-- SECURITY FIX: Function Search Path Protection
-- Date: 2025-10-18
-- Issue: 15 functions vulnerable to search_path injection attacks
-- Fix: Add explicit search_path = public, pg_catalog to all functions
-- Impact: Prevents malicious users from manipulating function execution
-- Status: APPLIED via Supabase MCP on 2025-10-18

-- Critical Search Functions
ALTER FUNCTION public.search_judges_ranked(search_query text, jurisdiction_filter text, result_limit integer, similarity_threshold real)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.search_judges_simple(search_query text, jurisdiction_filter text, result_limit integer)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.search_judges(search_query text, limit_count integer, offset_count integer)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.suggest_similar_judges(search_query text, suggestion_limit integer)
  SET search_path = public, pg_catalog;

-- Analytics Functions (Revenue & Business Metrics)
ALTER FUNCTION public.get_ai_search_ctr(start_date timestamp with time zone, end_date timestamp with time zone)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_ai_feature_effectiveness(start_date timestamp with time zone)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_feature_adoption_metrics()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_onboarding_completion_rate()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_top_search_patterns(pattern_limit integer, start_date timestamp with time zone)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.track_feature_usage(p_user_id text, p_feature text)
  SET search_path = public, pg_catalog;

-- Business Logic Functions
ALTER FUNCTION public.calculate_ad_pricing(p_tier_name character varying, p_months integer)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_batch_decision_summaries(judge_ids uuid[], years_back integer)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_top_courts_by_cases(jurisdiction_filter text, limit_count integer)
  SET search_path = public, pg_catalog;

-- Maintenance Functions
ALTER FUNCTION public.refresh_analytics_materialized_views()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_court_judge_counts()
  SET search_path = public, pg_catalog;

-- Documentation
COMMENT ON FUNCTION public.search_judges_ranked IS 'Protected against search_path injection - uses explicit public, pg_catalog';
COMMENT ON FUNCTION public.calculate_ad_pricing IS 'Protected against search_path injection - critical for revenue calculations';
COMMENT ON FUNCTION public.get_ai_search_ctr IS 'Protected against search_path injection - analytics function';

-- Verification Query (for manual testing)
-- SELECT
--     p.proname,
--     p.proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.proconfig IS NOT NULL
--   AND p.proconfig::text LIKE '%search_path%';
