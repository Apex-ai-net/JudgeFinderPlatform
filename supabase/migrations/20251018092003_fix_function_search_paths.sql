-- SECURITY FIX: Function Search Path Protection
-- Date: 2025-10-18
-- Issue: Functions vulnerable to search_path injection attacks
-- Fix: Add explicit search_path = public, pg_catalog to all functions
-- Impact: Prevents malicious users from manipulating function execution
-- Status: Conditionally applied - only updates functions that exist

DO $$
DECLARE
  func_rec RECORD;
BEGIN
  -- List of functions to update with their full signatures
  CREATE TEMP TABLE IF NOT EXISTS functions_to_update (
    func_name text,
    func_signature text
  );

  INSERT INTO functions_to_update VALUES
    ('search_judges_ranked', 'search_query text, jurisdiction_filter text, result_limit integer, similarity_threshold real'),
    ('search_judges_simple', 'search_query text, jurisdiction_filter text, result_limit integer'),
    ('search_judges', 'search_query text, limit_count integer, offset_count integer'),
    ('suggest_similar_judges', 'search_query text, suggestion_limit integer'),
    ('get_ai_search_ctr', 'start_date timestamp with time zone, end_date timestamp with time zone'),
    ('get_ai_feature_effectiveness', 'start_date timestamp with time zone'),
    ('get_feature_adoption_metrics', ''),
    ('get_onboarding_completion_rate', ''),
    ('get_top_search_patterns', 'pattern_limit integer, start_date timestamp with time zone'),
    ('track_feature_usage', 'p_user_id text, p_feature text'),
    ('calculate_ad_pricing', 'p_tier_name character varying, p_months integer'),
    ('get_batch_decision_summaries', 'judge_ids uuid[], years_back integer'),
    ('get_top_courts_by_cases', 'jurisdiction_filter text, limit_count integer'),
    ('refresh_analytics_materialized_views', ''),
    ('update_court_judge_counts', '');

  -- Update each function if it exists
  FOR func_rec IN SELECT * FROM functions_to_update LOOP
    BEGIN
      IF func_rec.func_signature = '' THEN
        -- Function with no parameters
        IF EXISTS (
          SELECT 1 FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = func_rec.func_name
        ) THEN
          EXECUTE format('ALTER FUNCTION public.%I() SET search_path = public, pg_catalog', func_rec.func_name);
          RAISE NOTICE 'Updated search_path for function: %', func_rec.func_name;
        END IF;
      ELSE
        -- Function with parameters - use signature
        EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public, pg_catalog',
          func_rec.func_name, func_rec.func_signature);
        RAISE NOTICE 'Updated search_path for function: %(%)', func_rec.func_name, func_rec.func_signature;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not update function % (may not exist or have different signature): %',
        func_rec.func_name, SQLERRM;
    END;
  END LOOP;

  DROP TABLE functions_to_update;

  RAISE NOTICE 'Completed function search_path security updates';
END $$;

-- Documentation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_judges_ranked') THEN
    EXECUTE 'COMMENT ON FUNCTION public.search_judges_ranked IS ''Protected against search_path injection - uses explicit public, pg_catalog''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_ad_pricing') THEN
    EXECUTE 'COMMENT ON FUNCTION public.calculate_ad_pricing IS ''Protected against search_path injection - critical for revenue calculations''';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_ai_search_ctr') THEN
    EXECUTE 'COMMENT ON FUNCTION public.get_ai_search_ctr IS ''Protected against search_path injection - analytics function''';
  END IF;
END $$;
