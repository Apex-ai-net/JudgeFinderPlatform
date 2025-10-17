-- =====================================================
-- Migration: Fix Security Definer Views
-- =====================================================
-- Priority: P0 - CRITICAL SECURITY FIX
-- Issue: 2 views using SECURITY DEFINER bypass RLS checks
-- Views: onboarding_metrics_summary, ai_search_performance_dashboard
-- Reference: docs/5-AGENT-CODEBASE-ANALYSIS-ACTION-PLAN.md
-- =====================================================

-- =====================================================
-- VIEW: onboarding_metrics_summary
-- Fix: Remove SECURITY DEFINER, enforce RLS
-- =====================================================

DROP VIEW IF EXISTS public.onboarding_metrics_summary CASCADE;

CREATE OR REPLACE VIEW public.onboarding_metrics_summary AS
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) as completed_users,
  COUNT(*) FILTER (WHERE onboarding_abandoned = true) as abandoned_users,
  ROUND(
    COUNT(*) FILTER (WHERE onboarding_completed_at IS NOT NULL) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as completion_rate,
  AVG(EXTRACT(epoch FROM (onboarding_completed_at - onboarding_started_at)) / 3600) as avg_completion_hours,
  AVG(onboarding_step_completed) as avg_steps_completed,
  COUNT(*) FILTER (WHERE first_search_at IS NOT NULL) as users_with_searches,
  COUNT(*) FILTER (WHERE first_bookmark_at IS NOT NULL) as users_with_bookmarks
FROM public.onboarding_analytics;

-- Grant appropriate permissions
GRANT SELECT ON public.onboarding_metrics_summary TO authenticated;
GRANT SELECT ON public.onboarding_metrics_summary TO service_role;

COMMENT ON VIEW public.onboarding_metrics_summary IS
'Summary metrics for user onboarding analytics. Uses RLS from underlying tables (no SECURITY DEFINER).';

-- =====================================================
-- VIEW: ai_search_performance_dashboard
-- Fix: Remove SECURITY DEFINER, enforce RLS
-- =====================================================

DROP VIEW IF EXISTS public.ai_search_performance_dashboard CASCADE;

CREATE OR REPLACE VIEW public.ai_search_performance_dashboard AS
SELECT
  COUNT(*) as total_searches,
  COUNT(*) FILTER (WHERE ai_processed = true) as ai_processed_searches,
  ROUND(
    COUNT(*) FILTER (WHERE ai_processed = true) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) as ai_adoption_rate,
  AVG(confidence) FILTER (WHERE ai_processed = true) as avg_confidence,
  AVG(results_count) as avg_results_per_search,
  AVG(processing_time_ms) as avg_processing_time_ms,
  COUNT(DISTINCT intent_type) as unique_intent_types,
  jsonb_object_agg(
    intent_type,
    COUNT(*) ORDER BY COUNT(*) DESC
  ) FILTER (WHERE intent_type IS NOT NULL) as searches_by_intent
FROM public.ai_search_metrics
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Grant appropriate permissions
GRANT SELECT ON public.ai_search_performance_dashboard TO authenticated;
GRANT SELECT ON public.ai_search_performance_dashboard TO service_role;

COMMENT ON VIEW public.ai_search_performance_dashboard IS
'Dashboard metrics for AI search performance. Uses RLS from underlying tables (no SECURITY DEFINER).';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Security definer views fixed: onboarding_metrics_summary, ai_search_performance_dashboard';
  RAISE NOTICE 'Views now enforce RLS from underlying tables';
END $$;


