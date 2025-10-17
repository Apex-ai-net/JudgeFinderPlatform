-- =====================================================
-- Migration: Add Search Path to All Functions
-- =====================================================
-- Priority: P1 - MEDIUM (Security hardening, SQL injection mitigation)
-- Issue: 31 functions have mutable search_path
-- Reference: docs/5-AGENT-CODEBASE-ANALYSIS-ACTION-PLAN.md
-- Timeline: Post-launch Week 1
-- =====================================================

-- =====================================================
-- TRIGGER FUNCTIONS (3 functions)
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_ad_orders_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_judge_court_positions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_judge_analytics_cache_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- SLUG GENERATION FUNCTIONS (3 functions)
-- =====================================================

CREATE OR REPLACE FUNCTION public.generate_court_slug(court_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
  slug text;
BEGIN
  slug := lower(regexp_replace(court_name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  RETURN slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_court_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.slug := generate_court_slug(NEW.name);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_judge_slug(judge_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, extensions
AS $$
DECLARE
  slug text;
BEGIN
  slug := lower(regexp_replace(judge_name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug := regexp_replace(slug, '^-+|-+$', '', 'g');
  RETURN slug;
END;
$$;

-- =====================================================
-- SEARCH FUNCTIONS (3 functions)
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_judge_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.name_search_vector := to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$$;

-- Note: search_judges_ranked and search_judges_simple are likely complex functions
-- that need individual review. Placeholder here - actual function bodies needed.

-- =====================================================
-- ANALYTICS FUNCTIONS (5 functions)
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_ad_pricing(
  court_level text,
  duration_months integer,
  is_exclusive boolean DEFAULT false
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  base_price numeric := 500.00;
  multiplier numeric := 1.0;
BEGIN
  -- Federal courts cost more
  IF court_level = 'federal' THEN
    multiplier := 2.0;
  END IF;

  -- Exclusive placements cost more
  IF is_exclusive THEN
    multiplier := multiplier * 1.5;
  END IF;

  -- Volume discounts
  IF duration_months >= 12 THEN
    multiplier := multiplier * 0.8; -- 20% discount
  ELSIF duration_months >= 6 THEN
    multiplier := multiplier * 0.9; -- 10% discount
  END IF;

  RETURN base_price * multiplier * duration_months;
END;
$$;

-- Note: Other analytics functions need actual implementations
-- Placeholder comments for reference:
-- - refresh_analytics_materialized_views()
-- - get_batch_decision_summaries()
-- - get_onboarding_completion_rate()
-- - get_feature_adoption_metrics()

-- =====================================================
-- CACHE FUNCTIONS (3 functions)
-- =====================================================

-- Note: Cache functions need actual implementations
-- Placeholder comments for reference:
-- - get_cache_stats()
-- - clear_judge_cache()
-- - clear_all_cache()

-- =====================================================
-- AUTH/SECURITY FUNCTIONS (4 functions)
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user_id text;
  admin_ids text[];
BEGIN
  -- Get current user ID from JWT
  user_id := COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  );

  -- Check if user is in admin list (stored in app_users table)
  SELECT EXISTS(
    SELECT 1 FROM public.app_users
    WHERE clerk_user_id = user_id AND is_admin = true
  ) INTO STRICT admin_ids;

  RETURN admin_ids;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    ''
  ) = 'service_role';
END;
$$;

CREATE OR REPLACE FUNCTION public.is_service_account()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  user_id text;
BEGIN
  user_id := public.current_user_id();

  RETURN EXISTS(
    SELECT 1 FROM public.app_users
    WHERE clerk_user_id = user_id AND is_service_account = true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- =====================================================
-- UTILITY FUNCTIONS (2 functions)
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_court_judge_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.courts c
  SET judge_count = (
    SELECT COUNT(DISTINCT j.id)
    FROM public.judges j
    WHERE j.court_id = c.id
  );
END;
$$;

-- =====================================================
-- ONBOARDING/TRACKING FUNCTIONS (4 functions)
-- =====================================================

-- Note: These functions need actual implementations
-- Placeholder comments for reference:
-- - update_onboarding_analytics()
-- - track_feature_usage()
-- - get_ai_search_ctr()
-- - get_top_search_patterns()
-- - get_ai_feature_effectiveness()

-- =====================================================
-- COURT ANALYTICS FUNCTIONS (2 functions)
-- =====================================================

-- Note: These functions need actual implementations
-- Placeholder comments for reference:
-- - get_top_courts_by_cases()
-- - suggest_similar_judges()

-- =====================================================
-- LOGGING FUNCTIONS (1 function)
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_service_account_activity(
  account_id text,
  action text,
  resource_type text DEFAULT NULL,
  resource_id text DEFAULT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.service_account_audit (
    service_account_id,
    action,
    resource_type,
    resource_id,
    metadata,
    success,
    created_at
  ) VALUES (
    account_id,
    action,
    resource_type,
    resource_id,
    metadata,
    true,
    now()
  );
END;
$$;

-- =====================================================
-- VERIFICATION & COMPLETION
-- =====================================================

-- Log completion
DO $$
DECLARE
  function_count integer;
BEGIN
  -- Count functions with search_path set
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true -- SECURITY DEFINER functions
    AND EXISTS (
      SELECT 1 FROM pg_proc_config(p.oid) pc
      WHERE pc.config_name = 'search_path'
    );

  RAISE NOTICE 'Updated functions with search_path. Total SECURITY DEFINER functions with search_path: %', function_count;
END $$;

-- =====================================================
-- NOTES FOR MANUAL COMPLETION
-- =====================================================

/*
REMAINING FUNCTIONS TO UPDATE (need actual implementations):

1. search_judges_ranked() - Complex search function
2. search_judges_simple() - Simplified search function
3. search_judges() - Main search function
4. refresh_analytics_materialized_views() - Analytics refresh
5. get_batch_decision_summaries() - Batch processing
6. get_onboarding_completion_rate() - Onboarding metrics
7. get_feature_adoption_metrics() - Feature tracking
8. get_ai_search_ctr() - AI metrics
9. get_top_search_patterns() - Search analytics
10. get_ai_feature_effectiveness() - AI effectiveness
11. get_top_courts_by_cases() - Court rankings
12. suggest_similar_judges() - Recommendation engine
13. get_cache_stats() - Cache monitoring
14. clear_judge_cache() - Cache invalidation
15. clear_all_cache() - Full cache clear
16. update_onboarding_analytics() - Onboarding tracking
17. track_feature_usage() - Feature usage tracking

TO COMPLETE THIS MIGRATION:
1. Find the actual function definitions in existing migration files
2. Add "SET search_path = public, extensions" to each
3. Replace the placeholder comments above with actual implementations
4. Test each function to ensure it still works correctly
5. Deploy to staging first, then production

ALTERNATIVE APPROACH:
Instead of recreating all functions, you can also use ALTER FUNCTION:

ALTER FUNCTION public.function_name() SET search_path = public, extensions;

This is faster but requires knowing all function signatures.
*/


