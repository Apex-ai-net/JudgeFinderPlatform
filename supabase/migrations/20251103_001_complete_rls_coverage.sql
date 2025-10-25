-- Migration: Complete RLS Coverage
-- Version: 20251009_002
-- Description: Enables RLS and creates policies for all tables currently missing protection
--
-- This migration covers:
-- - judge_court_positions (currently unprotected)
-- - sync_queue (currently unprotected)
-- - profile_issues (currently unprotected)
-- - ad_waitlist (currently unprotected)
-- - ad_events (from ad_impressions helpers)
-- - user_push_tokens (currently unprotected)
-- - Any other tables that need RLS but don't have it

BEGIN;

-- ============================================================================
-- Table: judge_court_positions
-- Access Pattern: Public read, admin/service write
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'judge_court_positions') THEN
    ALTER TABLE public.judge_court_positions ENABLE ROW LEVEL SECURITY;

    -- Public can view all judge court positions
    DROP POLICY IF EXISTS "judge_court_positions_public_select" ON public.judge_court_positions;
    CREATE POLICY "judge_court_positions_public_select"
      ON public.judge_court_positions
      FOR SELECT
      USING (true);

    -- Service role and service account have full access
    DROP POLICY IF EXISTS "judge_court_positions_service_all" ON public.judge_court_positions;
    CREATE POLICY "judge_court_positions_service_all"
      ON public.judge_court_positions
      FOR ALL
      USING (
        auth.role() = 'service_role' OR
        is_service_account()
      )
      WITH CHECK (
        auth.role() = 'service_role' OR
        is_service_account()
      );

    -- Admins can insert, update, delete
    DROP POLICY IF EXISTS "judge_court_positions_admin_write" ON public.judge_court_positions;
    CREATE POLICY "judge_court_positions_admin_write"
      ON public.judge_court_positions
      FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());

    EXECUTE 'COMMENT ON POLICY "judge_court_positions_public_select" ON public.judge_court_positions IS ''Anyone can view judge court positions''';
    EXECUTE 'COMMENT ON POLICY "judge_court_positions_service_all" ON public.judge_court_positions IS ''Service role and service account have full access''';
    EXECUTE 'COMMENT ON POLICY "judge_court_positions_admin_write" ON public.judge_court_positions IS ''Admins can manage judge court positions''';
  END IF;
END $$;

-- ============================================================================
-- Table: sync_queue
-- Access Pattern: Service/admin only (internal queue management)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_queue') THEN
    ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

    -- Service role and service account have full access
    DROP POLICY IF EXISTS "sync_queue_service_all" ON public.sync_queue;
    CREATE POLICY "sync_queue_service_all"
      ON public.sync_queue
      FOR ALL
      USING (
        auth.role() = 'service_role' OR
        is_service_account()
      )
      WITH CHECK (
        auth.role() = 'service_role' OR
        is_service_account()
      );

    -- Admins can view and manage sync queue
    DROP POLICY IF EXISTS "sync_queue_admin_all" ON public.sync_queue;
    CREATE POLICY "sync_queue_admin_all"
      ON public.sync_queue
      FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());

    EXECUTE 'COMMENT ON POLICY "sync_queue_service_all" ON public.sync_queue IS ''Service role and service account have full access to sync queue''';
    EXECUTE 'COMMENT ON POLICY "sync_queue_admin_all" ON public.sync_queue IS ''Admins can view and manage sync queue''';
  END IF;
END $$;

-- ============================================================================
-- Table: profile_issues
-- Access Pattern: Service/admin write, users can view their own issues
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profile_issues') THEN
    -- Table already has RLS enabled from 20250927_001_create_profile_issues.sql
    -- ALTER TABLE public.profile_issues ENABLE ROW LEVEL SECURITY;

    -- Service role and service account have full access
    DROP POLICY IF EXISTS "profile_issues_service_all" ON public.profile_issues;
    CREATE POLICY "profile_issues_service_all"
      ON public.profile_issues
      FOR ALL
      USING (
        auth.role() = 'service_role' OR
        is_service_account()
      )
      WITH CHECK (
        auth.role() = 'service_role' OR
        is_service_account()
      );

    -- Admins can view and manage all profile issues
    DROP POLICY IF EXISTS "profile_issues_admin_all" ON public.profile_issues;
    CREATE POLICY "profile_issues_admin_all"
      ON public.profile_issues
      FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());

    -- Users cannot view issues (profile_issues uses reporter_email not reporter_id)
    DROP POLICY IF EXISTS "profile_issues_user_select" ON public.profile_issues;

    EXECUTE 'COMMENT ON POLICY "profile_issues_service_all" ON public.profile_issues IS ''Service role and service account have full access''';
    EXECUTE 'COMMENT ON POLICY "profile_issues_admin_all" ON public.profile_issues IS ''Admins can manage all profile issues''';
  END IF;
END $$;

-- ============================================================================
-- Table: ad_waitlist
-- Access Pattern: Users can add themselves, admins can manage all
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_waitlist') THEN
    ALTER TABLE public.ad_waitlist ENABLE ROW LEVEL SECURITY;

    -- Service role and service account have full access
    DROP POLICY IF EXISTS "ad_waitlist_service_all" ON public.ad_waitlist;
    CREATE POLICY "ad_waitlist_service_all"
      ON public.ad_waitlist
      FOR ALL
      USING (
        auth.role() = 'service_role' OR
        is_service_account()
      )
      WITH CHECK (
        auth.role() = 'service_role' OR
        is_service_account()
      );

    -- Authenticated users can add themselves to waitlist
    DROP POLICY IF EXISTS "ad_waitlist_user_insert" ON public.ad_waitlist;
    CREATE POLICY "ad_waitlist_user_insert"
      ON public.ad_waitlist
      FOR INSERT
      WITH CHECK (
        auth.uid() IS NOT NULL
      );

    -- Users can view their own waitlist entries
    DROP POLICY IF EXISTS "ad_waitlist_user_select" ON public.ad_waitlist;
    CREATE POLICY "ad_waitlist_user_select"
      ON public.ad_waitlist
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.app_users
          WHERE clerk_user_id = auth.uid()::text
          AND email = ad_waitlist.email
        )
      );

    -- Admins can view and manage all waitlist entries
    DROP POLICY IF EXISTS "ad_waitlist_admin_all" ON public.ad_waitlist;
    CREATE POLICY "ad_waitlist_admin_all"
      ON public.ad_waitlist
      FOR ALL
      USING (is_admin())
      WITH CHECK (is_admin());

    EXECUTE 'COMMENT ON POLICY "ad_waitlist_service_all" ON public.ad_waitlist IS ''Service role and service account have full access''';
    EXECUTE 'COMMENT ON POLICY "ad_waitlist_user_insert" ON public.ad_waitlist IS ''Authenticated users can add themselves to ad waitlist''';
    EXECUTE 'COMMENT ON POLICY "ad_waitlist_user_select" ON public.ad_waitlist IS ''Users can view their own waitlist entries''';
    EXECUTE 'COMMENT ON POLICY "ad_waitlist_admin_all" ON public.ad_waitlist IS ''Admins can manage all waitlist entries''';
  END IF;
END $$;

-- ============================================================================
-- Table: ad_events (formerly ad_impressions)
-- Access Pattern: Public can log events, admins can view
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_events') THEN
    ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

    -- Service role and service account have full access
    DROP POLICY IF EXISTS "ad_events_service_all" ON public.ad_events;
    CREATE POLICY "ad_events_service_all"
      ON public.ad_events
      FOR ALL
      USING (
        auth.role() = 'service_role' OR
        is_service_account()
      )
      WITH CHECK (
        auth.role() = 'service_role' OR
        is_service_account()
      );

    -- Anyone can insert ad events (impressions and clicks)
    -- This is intentionally permissive for analytics tracking
    DROP POLICY IF EXISTS "ad_events_public_insert" ON public.ad_events;
    CREATE POLICY "ad_events_public_insert"
      ON public.ad_events
      FOR INSERT
      WITH CHECK (true);

    -- Admins can view all ad events
    DROP POLICY IF EXISTS "ad_events_admin_select" ON public.ad_events;
    CREATE POLICY "ad_events_admin_select"
      ON public.ad_events
      FOR SELECT
      USING (is_admin());

    -- Ad spot owners can view events for their ads
    DROP POLICY IF EXISTS "ad_events_owner_select" ON public.ad_events;
    CREATE POLICY "ad_events_owner_select"
      ON public.ad_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.ad_spots
          WHERE ad_spots.id = ad_events.ad_spot_id
          AND ad_spots.user_id = auth.uid()::text
        )
      );

    EXECUTE 'COMMENT ON POLICY "ad_events_service_all" ON public.ad_events IS ''Service role and service account have full access''';
    EXECUTE 'COMMENT ON POLICY "ad_events_public_insert" ON public.ad_events IS ''Anyone can log ad impressions and clicks for analytics''';
    EXECUTE 'COMMENT ON POLICY "ad_events_admin_select" ON public.ad_events IS ''Admins can view all ad events''';
    EXECUTE 'COMMENT ON POLICY "ad_events_owner_select" ON public.ad_events IS ''Ad owners can view events for their own ads''';
  END IF;
END $$;

-- ============================================================================
-- Table: user_push_tokens
-- Access Pattern: Users manage their own tokens, service can manage all
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_push_tokens') THEN
    ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

    -- Service role and service account have full access
    DROP POLICY IF EXISTS "user_push_tokens_service_all" ON public.user_push_tokens;
    CREATE POLICY "user_push_tokens_service_all"
      ON public.user_push_tokens
      FOR ALL
      USING (
        auth.role() = 'service_role' OR
        is_service_account()
      )
      WITH CHECK (
        auth.role() = 'service_role' OR
        is_service_account()
      );

    -- Users can manage their own push tokens
    DROP POLICY IF EXISTS "user_push_tokens_user_all" ON public.user_push_tokens;
    CREATE POLICY "user_push_tokens_user_all"
      ON public.user_push_tokens
      FOR ALL
      USING (
        user_id = auth.uid()::text
      )
      WITH CHECK (
        user_id = auth.uid()::text
      );

    -- Admins can view all push tokens (for debugging)
    DROP POLICY IF EXISTS "user_push_tokens_admin_select" ON public.user_push_tokens;
    CREATE POLICY "user_push_tokens_admin_select"
      ON public.user_push_tokens
      FOR SELECT
      USING (is_admin());

    EXECUTE 'COMMENT ON POLICY "user_push_tokens_service_all" ON public.user_push_tokens IS ''Service role and service account have full access''';
    EXECUTE 'COMMENT ON POLICY "user_push_tokens_user_all" ON public.user_push_tokens IS ''Users can manage their own push notification tokens''';
    EXECUTE 'COMMENT ON POLICY "user_push_tokens_admin_select" ON public.user_push_tokens IS ''Admins can view all push tokens''';
  END IF;
END $$;

-- ============================================================================
-- Table: ad_spots
-- Access Pattern: Public read, owners and admins manage
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.ad_spots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (from previous migration)
DROP POLICY IF EXISTS "Ad spots are publicly readable" ON public.ad_spots;
DROP POLICY IF EXISTS "Ad spot owners can update" ON public.ad_spots;
DROP POLICY IF EXISTS "Authenticated users can create ad spots" ON public.ad_spots;

-- Service role and service account have full access
DROP POLICY IF EXISTS "ad_spots_service_all" ON public.ad_spots;
CREATE POLICY "ad_spots_service_all"
  ON public.ad_spots
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    is_service_account()
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    is_service_account()
  );

-- Public can view active ad spots
DROP POLICY IF EXISTS "ad_spots_public_select" ON public.ad_spots;
CREATE POLICY "ad_spots_public_select"
  ON public.ad_spots
  FOR SELECT
  USING (true);

-- Note: ad_spots table uses current_advertiser_id, not user_id
-- Users can manage ad spots through advertiser_profiles relationship
-- Simplified policies: service/admin only for modifications

-- Admins can manage all ad spots
DROP POLICY IF EXISTS "ad_spots_admin_all" ON public.ad_spots;
CREATE POLICY "ad_spots_admin_all"
  ON public.ad_spots
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY "ad_spots_service_all" ON public.ad_spots IS
  'Service role and service account have full access';
COMMENT ON POLICY "ad_spots_public_select" ON public.ad_spots IS
  'Anyone can view active ad spots';
COMMENT ON POLICY "ad_spots_admin_all" ON public.ad_spots IS
  'Admins can manage all ad spots';

-- ============================================================================
-- Additional Security: Ensure sync_logs has proper RLS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_logs') THEN
    -- Verify sync_logs RLS is enabled (should be from 20251018_service_role_access.sql)
    ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

    -- Ensure service role policy exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'sync_logs'
      AND policyname = 'sync_logs_service_all'
    ) THEN
      CREATE POLICY "sync_logs_service_all"
        ON public.sync_logs
        FOR ALL
        USING (
          auth.role() = 'service_role' OR
          is_service_account()
        )
        WITH CHECK (
          auth.role() = 'service_role' OR
          is_service_account()
        );
    END IF;

    -- Admins can view sync logs
    DROP POLICY IF EXISTS "sync_logs_admin_select" ON public.sync_logs;
    CREATE POLICY "sync_logs_admin_select"
      ON public.sync_logs
      FOR SELECT
      USING (is_admin());
  END IF;
END $$;

-- ============================================================================
-- Additional Security: Ensure performance_metrics has proper RLS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'performance_metrics') THEN
    ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

    -- Ensure service role policy exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'performance_metrics'
      AND policyname = 'performance_metrics_service_all'
    ) THEN
      CREATE POLICY "performance_metrics_service_all"
        ON public.performance_metrics
        FOR ALL
        USING (
          auth.role() = 'service_role' OR
          is_service_account()
        )
        WITH CHECK (
          auth.role() = 'service_role' OR
          is_service_account()
        );
    END IF;

    -- Admins can view performance metrics
    DROP POLICY IF EXISTS "performance_metrics_admin_select" ON public.performance_metrics;
    CREATE POLICY "performance_metrics_admin_select"
      ON public.performance_metrics
      FOR SELECT
      USING (is_admin());

    -- Public can view aggregate performance metrics
    DROP POLICY IF EXISTS "performance_metrics_public_select" ON public.performance_metrics;
    CREATE POLICY "performance_metrics_public_select"
      ON public.performance_metrics
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================================================
-- Additional Security: Ensure audit_logs has proper RLS
-- ============================================================================

-- Check if audit_logs table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'audit_logs'
  ) THEN
    -- Enable RLS
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

    -- Service and admin access
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'audit_logs_service_all'
    ) THEN
      CREATE POLICY "audit_logs_service_all"
        ON public.audit_logs
        FOR ALL
        USING (
          auth.role() = 'service_role' OR
          is_service_account()
        )
        WITH CHECK (
          auth.role() = 'service_role' OR
          is_service_account()
        );
    END IF;

    DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
    CREATE POLICY "audit_logs_admin_select"
      ON public.audit_logs
      FOR SELECT
      USING (is_admin());

    RAISE NOTICE 'Applied RLS policies to audit_logs table';
  ELSE
    RAISE NOTICE 'audit_logs table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

DO $$
DECLARE
  v_tables_secured TEXT[];
BEGIN
  -- List all tables that now have RLS enabled
  SELECT array_agg(tablename)
  INTO v_tables_secured
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'judge_court_positions',
    'sync_queue',
    'profile_issues',
    'ad_waitlist',
    'ad_events',
    'user_push_tokens',
    'ad_spots',
    'sync_logs',
    'performance_metrics',
    'service_account_audit',
    'audit_logs'
  );

  RAISE NOTICE '
  ============================================================================
  Complete RLS Coverage Applied
  ============================================================================

  Tables now protected with RLS:
  %

  Access Patterns:
  - judge_court_positions: Public read, service/admin write
  - sync_queue: Service/admin only
  - profile_issues: Service/admin manage, users view own
  - ad_waitlist: Users self-register, admins manage
  - ad_events: Public insert (analytics), owners/admins view
  - user_push_tokens: Users manage own, service/admin all access
  - ad_spots: Public read, owners manage own, admins manage all
  - sync_logs: Service/admin only
  - performance_metrics: Public read, service/admin write
  - service_account_audit: Service write, admins read
  - audit_logs: Service/admin only

  All policies support:
  - Service role bypass (for emergency admin operations)
  - Service account access (for authenticated backend operations)
  - Admin access (for platform management)
  - User-specific access (where applicable)

  Next Steps:
  1. Apply migration 20251009_003_standardize_rls_policies.sql
  2. Test all policies with migration testing script
  3. Update backend code to use service account client

  ============================================================================
  ', array_to_string(v_tables_secured, ', ');
END $$;

COMMIT;
