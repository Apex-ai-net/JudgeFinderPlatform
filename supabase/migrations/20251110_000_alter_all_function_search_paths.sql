-- =====================================================
-- Migration: Add Search Path to All Functions (ALTER approach)
-- =====================================================
-- Priority: P1 - MEDIUM (Security hardening)
-- Method: ALTER FUNCTION (simpler than recreating)
-- Issue: Functions have mutable search_path
-- Timeline: Apply now or Week 1 post-launch
-- =====================================================

DO $$
DECLARE
  func_rec RECORD;
  func_exists boolean;
BEGIN
  -- List of functions to update
  CREATE TEMP TABLE IF NOT EXISTS functions_to_alter (
    func_name text
  );

  INSERT INTO functions_to_alter VALUES
    ('update_ad_orders_updated_at'),
    ('update_judge_court_positions_updated_at'),
    ('update_judge_analytics_cache_updated_at'),
    ('update_updated_at_column'),
    ('update_court_slug'),
    ('update_judge_search_vector'),
    ('update_onboarding_analytics'),
    ('generate_court_slug'),
    ('generate_judge_slug'),
    ('search_judges_ranked'),
    ('search_judges_simple'),
    ('search_judges'),
    ('suggest_similar_judges'),
    ('is_admin'),
    ('is_service_account'),
    ('current_user_id'),
    ('is_service_role'),
    ('calculate_ad_pricing'),
    ('refresh_analytics_materialized_views'),
    ('get_batch_decision_summaries'),
    ('get_onboarding_completion_rate'),
    ('get_feature_adoption_metrics'),
    ('get_ai_search_ctr'),
    ('get_top_search_patterns'),
    ('get_ai_feature_effectiveness'),
    ('get_top_courts_by_cases'),
    ('get_cache_stats'),
    ('clear_judge_cache'),
    ('clear_all_cache'),
    ('create_personal_organization'),
    ('migrate_user_subscription_to_org'),
    ('claim_next_sync_job'),
    ('track_feature_usage');

  -- Update each function if it exists
  FOR func_rec IN
    SELECT DISTINCT func_name
    FROM functions_to_alter
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = func_rec.func_name
    ) INTO func_exists;

    IF func_exists THEN
      BEGIN
        EXECUTE format('ALTER FUNCTION public.%I SET search_path = public, extensions', func_rec.func_name);
        RAISE NOTICE 'Updated search_path for function: %', func_rec.func_name;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update function % (may have different signature): %', func_rec.func_name, SQLERRM;
      END;
    END IF;
  END LOOP;

  DROP TABLE functions_to_alter;

  RAISE NOTICE 'Completed function search_path updates';
END $$;

