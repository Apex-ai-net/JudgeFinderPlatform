-- =====================================================
-- Migration: Create RLS Policies - Part 1 (Core Tables)
-- =====================================================
-- Priority: P0 - CRITICAL SECURITY FIX
-- Tables: app_users, judge_court_positions, sync_queue, pricing_tiers
-- Reference: docs/5-AGENT-CODEBASE-ANALYSIS-ACTION-PLAN.md
-- =====================================================

-- =====================================================
-- TABLE: app_users
-- Access: Users read own data, service role full access, admins full access
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to app_users" ON public.app_users;
DROP POLICY IF EXISTS "Admins have full access to app_users" ON public.app_users;
DROP POLICY IF EXISTS "Users can read their own app_users data" ON public.app_users;
DROP POLICY IF EXISTS "Users can update their own app_users data" ON public.app_users;

-- Service role full access (bypasses RLS when using service_role key)
CREATE POLICY "Service role has full access to app_users" ON public.app_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admins have full access to app_users" ON public.app_users
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can read their own data
CREATE POLICY "Users can read their own app_users data" ON public.app_users
  FOR SELECT
  TO authenticated
  USING (clerk_user_id = public.current_user_id());

-- Users can update their own data
CREATE POLICY "Users can update their own app_users data" ON public.app_users
  FOR UPDATE
  TO authenticated
  USING (clerk_user_id = public.current_user_id())
  WITH CHECK (clerk_user_id = public.current_user_id());

-- =====================================================
-- TABLE: judge_court_positions
-- Access: Public read, service role write, admins full access
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'judge_court_positions') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public can read judge_court_positions" ON public.judge_court_positions;
    DROP POLICY IF EXISTS "Service role can write judge_court_positions" ON public.judge_court_positions;
    DROP POLICY IF EXISTS "Admins have full access to judge_court_positions" ON public.judge_court_positions;

    -- Public read access
    CREATE POLICY "Public can read judge_court_positions" ON public.judge_court_positions
      FOR SELECT
      USING (true);

    -- Service role full access
    CREATE POLICY "Service role can write judge_court_positions" ON public.judge_court_positions
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- Admin full access
    CREATE POLICY "Admins have full access to judge_court_positions" ON public.judge_court_positions
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- TABLE: sync_queue
-- Access: Service role only (internal operations)
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to sync_queue" ON public.sync_queue;
DROP POLICY IF EXISTS "Admins can read sync_queue" ON public.sync_queue;

-- Service role full access
CREATE POLICY "Service role has full access to sync_queue" ON public.sync_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read sync queue status
CREATE POLICY "Admins can read sync_queue" ON public.sync_queue
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- =====================================================
-- TABLE: pricing_tiers
-- Access: Public read, admin write, service role full access
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can read pricing_tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Admins can manage pricing_tiers" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Service role has full access to pricing_tiers" ON public.pricing_tiers;

-- Public read access
CREATE POLICY "Public can read pricing_tiers" ON public.pricing_tiers
  FOR SELECT
  USING (is_active = true);

-- Admin full management
CREATE POLICY "Admins can manage pricing_tiers" ON public.pricing_tiers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role full access
CREATE POLICY "Service role has full access to pricing_tiers" ON public.pricing_tiers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies created for: app_users, judge_court_positions, sync_queue, pricing_tiers';
END $$;


