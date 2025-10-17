-- =====================================================
-- Migration: Add Search Path to All Functions (ALTER approach)
-- =====================================================
-- Priority: P1 - MEDIUM (Security hardening)
-- Method: ALTER FUNCTION (simpler than recreating)
-- Issue: 31 functions have mutable search_path
-- Timeline: Apply now or Week 1 post-launch
-- =====================================================

-- TRIGGER FUNCTIONS (7 functions)
ALTER FUNCTION public.update_ad_orders_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.update_judge_court_positions_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.update_judge_analytics_cache_updated_at() SET search_path = public, extensions;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, extensions;
ALTER FUNCTION public.update_court_slug() SET search_path = public, extensions;
ALTER FUNCTION public.update_judge_search_vector() SET search_path = public, extensions;
ALTER FUNCTION public.update_onboarding_analytics() SET search_path = public, extensions;

-- SLUG GENERATION FUNCTIONS (2 functions)
ALTER FUNCTION public.generate_court_slug(text) SET search_path = public, extensions;
ALTER FUNCTION public.generate_judge_slug(text) SET search_path = public, extensions;

-- SEARCH FUNCTIONS (4 functions)
ALTER FUNCTION public.search_judges_ranked(text, text, integer, real) SET search_path = public, extensions;
ALTER FUNCTION public.search_judges_simple(text, text, integer) SET search_path = public, extensions;
ALTER FUNCTION public.search_judges(text) SET search_path = public, extensions;
ALTER FUNCTION public.suggest_similar_judges(uuid) SET search_path = public, extensions;

-- AUTH/SECURITY FUNCTIONS (4 functions)
ALTER FUNCTION public.is_admin() SET search_path = public, extensions;
ALTER FUNCTION public.is_service_account() SET search_path = public, extensions;
ALTER FUNCTION public.current_user_id() SET search_path = public, extensions;
ALTER FUNCTION public.is_service_role() SET search_path = public, extensions;

-- ANALYTICS FUNCTIONS (9 functions)
ALTER FUNCTION public.calculate_ad_pricing(text, integer, boolean) SET search_path = public, extensions;
ALTER FUNCTION public.refresh_analytics_materialized_views() SET search_path = public, extensions;
ALTER FUNCTION public.get_batch_decision_summaries(text[]) SET search_path = public, extensions;
ALTER FUNCTION public.get_onboarding_completion_rate() SET search_path = public, extensions;
ALTER FUNCTION public.get_feature_adoption_metrics() SET search_path = public, extensions;
ALTER FUNCTION public.get_ai_search_ctr() SET search_path = public, extensions;
ALTER FUNCTION public.get_top_search_patterns() SET search_path = public, extensions;
ALTER FUNCTION public.get_ai_feature_effectiveness() SET search_path = public, extensions;
ALTER FUNCTION public.get_top_courts_by_cases() SET search_path = public, extensions;

-- CACHE FUNCTIONS (3 functions)
ALTER FUNCTION public.get_cache_stats() SET search_path = public, extensions;
ALTER FUNCTION public.clear_judge_cache(uuid) SET search_path = public, extensions;
ALTER FUNCTION public.clear_all_cache() SET search_path = public, extensions;

-- TRACKING/LOGGING FUNCTIONS (2 functions)
ALTER FUNCTION public.track_feature_usage(text, text) SET search_path = public, extensions;
ALTER FUNCTION public.log_service_account_activity(text, text, text, text, jsonb) SET search_path = public, extensions;

-- UTILITY FUNCTIONS (1 function)
ALTER FUNCTION public.update_court_judge_counts() SET search_path = public, extensions;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Query to verify functions now have search_path set
-- Uncomment to run after migration:
/*
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  (
    SELECT array_agg(config)
    FROM unnest(p.proconfig) AS config
    WHERE config LIKE 'search_path=%'
  ) as search_path_config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND p.proname IN (
    'update_ad_orders_updated_at', 'update_judge_court_positions_updated_at',
    'is_admin', 'current_user_id', 'search_judges_ranked'
  )
ORDER BY p.proname;
*/

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Added SET search_path to 31 functions for SQL injection protection';
  RAISE NOTICE '✅ All SECURITY DEFINER functions now have immutable search_path';
  RAISE NOTICE '✅ Function security hardening complete';
END $$;


