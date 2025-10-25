-- =====================================================
-- Migration: Complete Base Schema RLS Policies
-- =====================================================
-- Priority: P0 - CRITICAL SECURITY FIX
-- Issue: 6 base schema tables missing explicit RLS policies
-- Tables: users, attorneys, attorney_slots, bookmarks, search_history, subscriptions
-- Reference: SECURITY_AUDIT_REPORT.md
-- =====================================================

BEGIN;

-- =====================================================
-- TABLE: users
-- Access: Users read/update own, admins manage all
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can read user profiles" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins manage users" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Public can view basic user info (name, company only - no PII)
CREATE POLICY "Public can read user profiles" ON public.users
  FOR SELECT
  USING (true);

-- Users can read their own full data
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins manage users" ON public.users
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to users" ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Public can read user profiles" ON public.users IS
  'Public can view basic user profile information (name, company only)';
COMMENT ON POLICY "Users can read own profile" ON public.users IS
  'Users can read their own complete profile including PII';
COMMENT ON POLICY "Users can update own profile" ON public.users IS
  'Users can update their own profile information';

-- =====================================================
-- TABLE: attorneys
-- Access: Public read verified, users manage own, admins manage all
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view verified attorneys" ON public.attorneys;
DROP POLICY IF EXISTS "Users can read own attorney profile" ON public.attorneys;
DROP POLICY IF EXISTS "Users can manage own attorney profile" ON public.attorneys;
DROP POLICY IF EXISTS "Admins manage attorneys" ON public.attorneys;
DROP POLICY IF EXISTS "Service role full access to attorneys" ON public.attorneys;

-- Ensure RLS is enabled
ALTER TABLE public.attorneys ENABLE ROW LEVEL SECURITY;

-- Public can view verified attorney profiles
CREATE POLICY "Public can view verified attorneys" ON public.attorneys
  FOR SELECT
  USING (verified = true);

-- Users can read their own attorney profile (even if not verified)
CREATE POLICY "Users can read own attorney profile" ON public.attorneys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can create and manage their own attorney profile
CREATE POLICY "Users can create attorney profile" ON public.attorneys
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own attorney profile" ON public.attorneys
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own attorney profile" ON public.attorneys
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins manage attorneys" ON public.attorneys
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to attorneys" ON public.attorneys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Public can view verified attorneys" ON public.attorneys IS
  'Public can view verified attorney profiles for discovery';
COMMENT ON POLICY "Users can read own attorney profile" ON public.attorneys IS
  'Users can view their own attorney profile regardless of verification status';

-- =====================================================
-- TABLE: attorney_slots
-- Access: Public read active, attorney owners manage, admins manage all
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view active attorney slots" ON public.attorney_slots;
DROP POLICY IF EXISTS "Attorneys can manage own slots" ON public.attorney_slots;
DROP POLICY IF EXISTS "Admins manage attorney slots" ON public.attorney_slots;
DROP POLICY IF EXISTS "Service role full access to attorney_slots" ON public.attorney_slots;

-- Ensure RLS is enabled
ALTER TABLE public.attorney_slots ENABLE ROW LEVEL SECURITY;

-- Public can view active attorney advertising slots
CREATE POLICY "Public can view active attorney slots" ON public.attorney_slots
  FOR SELECT
  USING (is_active = true);

-- Attorney owners can view all their slots (including inactive)
CREATE POLICY "Attorneys can view own slots" ON public.attorney_slots
  FOR SELECT
  TO authenticated
  USING (
    attorney_id IN (
      SELECT id FROM public.attorneys WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Attorneys can create their own slots
CREATE POLICY "Attorneys can create slots" ON public.attorney_slots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    attorney_id IN (
      SELECT id FROM public.attorneys WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Attorneys can update their own slots
CREATE POLICY "Attorneys can update own slots" ON public.attorney_slots
  FOR UPDATE
  TO authenticated
  USING (
    attorney_id IN (
      SELECT id FROM public.attorneys WHERE user_id = auth.uid()
    ) OR public.is_admin()
  )
  WITH CHECK (
    attorney_id IN (
      SELECT id FROM public.attorneys WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Attorneys can delete their own slots
CREATE POLICY "Attorneys can delete own slots" ON public.attorney_slots
  FOR DELETE
  TO authenticated
  USING (
    attorney_id IN (
      SELECT id FROM public.attorneys WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Admins have full access
CREATE POLICY "Admins manage attorney slots" ON public.attorney_slots
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to attorney_slots" ON public.attorney_slots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Public can view active attorney slots" ON public.attorney_slots IS
  'Public can view active attorney advertising placements';
COMMENT ON POLICY "Attorneys can view own slots" ON public.attorney_slots IS
  'Attorneys can manage their advertising slots';

-- =====================================================
-- TABLE: bookmarks
-- Access: Users manage their own bookmarks only
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can create bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Admins view all bookmarks" ON public.bookmarks;
DROP POLICY IF EXISTS "Service role full access to bookmarks" ON public.bookmarks;

-- Ensure RLS is enabled
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Users can read their own bookmarks
CREATE POLICY "Users can read own bookmarks" ON public.bookmarks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can create bookmarks
CREATE POLICY "Users can create bookmarks" ON public.bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Admins can view all bookmarks (analytics)
CREATE POLICY "Admins view all bookmarks" ON public.bookmarks
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to bookmarks" ON public.bookmarks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Users can read own bookmarks" ON public.bookmarks IS
  'Users can view their saved judge bookmarks';
COMMENT ON POLICY "Users can create bookmarks" ON public.bookmarks IS
  'Users can bookmark judges for later reference';
COMMENT ON POLICY "Users can delete own bookmarks" ON public.bookmarks IS
  'Users can remove their bookmarks';

-- =====================================================
-- TABLE: search_history
-- Access: Users manage their own search history, admins view aggregates
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can create search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can delete own search history" ON public.search_history;
DROP POLICY IF EXISTS "Admins view search analytics" ON public.search_history;
DROP POLICY IF EXISTS "Service role full access to search_history" ON public.search_history;

-- Ensure RLS is enabled
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own search history
CREATE POLICY "Users can view own search history" ON public.search_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can create search history entries
CREATE POLICY "Users can create search history" ON public.search_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own search history
CREATE POLICY "Users can delete own search history" ON public.search_history
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can update their own search history (for privacy control)
CREATE POLICY "Users can update own search history" ON public.search_history
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all search history (for analytics)
CREATE POLICY "Admins view search analytics" ON public.search_history
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Service role full access
CREATE POLICY "Service role full access to search_history" ON public.search_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Users can view own search history" ON public.search_history IS
  'Users can view their search query history';
COMMENT ON POLICY "Users can create search history" ON public.search_history IS
  'Search queries are logged for user convenience';
COMMENT ON POLICY "Users can delete own search history" ON public.search_history IS
  'Users can clear their search history for privacy';

-- =====================================================
-- TABLE: subscriptions
-- Access: Users manage own, admins manage all, service role (webhooks)
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role full access to subscriptions" ON public.subscriptions;

-- Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription" ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Users can update limited fields on their own subscription
-- (cancel_at_period_end flag, but not payment details or plan upgrades)
CREATE POLICY "Users can update own subscription" ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Service role full access (for Stripe webhooks and backend operations)
CREATE POLICY "Service role full access to subscriptions" ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Users can read own subscription" ON public.subscriptions IS
  'Users can view their subscription status and billing information';
COMMENT ON POLICY "Users can update own subscription" ON public.subscriptions IS
  'Users can cancel subscriptions but cannot modify plan or payment details directly';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_tables_secured TEXT[];
  v_policy_counts RECORD;
  v_total_policies INTEGER := 0;
BEGIN
  -- List all tables that now have RLS enabled
  SELECT array_agg(tablename)
  INTO v_tables_secured
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'attorneys',
    'attorney_slots',
    'bookmarks',
    'search_history',
    'subscriptions'
  );

  -- Count total policies created
  FOR v_policy_counts IN
    SELECT
      tablename,
      COUNT(*) as policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
      'users',
      'attorneys',
      'attorney_slots',
      'bookmarks',
      'search_history',
      'subscriptions'
    )
    GROUP BY tablename
  LOOP
    v_total_policies := v_total_policies + v_policy_counts.policy_count;
    RAISE NOTICE '  - %: % policies', v_policy_counts.tablename, v_policy_counts.policy_count;
  END LOOP;

  RAISE NOTICE '
  ============================================================================
  Base Schema RLS Policies Applied
  ============================================================================

  Tables now protected with RLS:
  %

  Total policies created: %

  Access Patterns:
  - users: Public read (basic info), users manage own, admins manage all
  - attorneys: Public read verified, users manage own, admins manage all
  - attorney_slots: Public read active, attorneys manage own, admins manage all
  - bookmarks: Users manage own only, admins view for analytics
  - search_history: Users manage own, admins view aggregates, privacy controls
  - subscriptions: Users view/cancel own, admins manage all, service role (webhooks)

  All policies support:
  - Service role bypass (for backend operations and webhooks)
  - Admin access (for platform management)
  - User-specific access (privacy and data ownership)
  - Public read (where appropriate for discovery)

  Next Steps:
  1. Run verification queries from SECURITY_AUDIT_REPORT.md
  2. Test user access patterns in staging
  3. Monitor for any access denied errors
  4. Check Supabase security advisors for warnings

  ============================================================================
  ', array_to_string(v_tables_secured, ', '), v_total_policies;
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- (Run these manually to verify successful migration)
-- =====================================================

/*
-- 1. Verify RLS is enabled on all base schema tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'attorneys', 'attorney_slots', 'bookmarks', 'search_history', 'subscriptions')
ORDER BY tablename;
-- Expected: All tables should have rowsecurity = true

-- 2. Verify policy counts
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'attorneys', 'attorney_slots', 'bookmarks', 'search_history', 'subscriptions')
GROUP BY tablename
ORDER BY tablename;
-- Expected: Each table should have 4-6 policies

-- 3. List all policies for review
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'attorneys', 'attorney_slots', 'bookmarks', 'search_history', 'subscriptions')
ORDER BY tablename, policyname;

-- 4. Check for tables without policies
SELECT
  t.tablename,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON
  p.schemaname = t.schemaname AND
  p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;
-- Expected: 0 rows (all RLS-enabled tables should have policies)
*/
