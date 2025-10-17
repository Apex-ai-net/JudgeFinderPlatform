-- =====================================================
-- Migration: Create RLS Policies - Advertising Tables
-- =====================================================
-- Priority: P0 - CRITICAL SECURITY FIX
-- Tables: ad_bookings, ad_campaigns, ad_creatives, ad_performance_metrics,
--         ad_spots, advertiser_profiles, billing_transactions, analytics_events
-- Reference: docs/5-AGENT-CODEBASE-ANALYSIS-ACTION-PLAN.md
-- =====================================================

-- =====================================================
-- TABLE: advertiser_profiles
-- Access: Advertisers manage own profile, admins full access, service role full access
-- =====================================================

DROP POLICY IF EXISTS "Advertisers can read their own profile" ON public.advertiser_profiles;
DROP POLICY IF EXISTS "Advertisers can update their own profile" ON public.advertiser_profiles;
DROP POLICY IF EXISTS "Admins have full access to advertiser_profiles" ON public.advertiser_profiles;
DROP POLICY IF EXISTS "Service role has full access to advertiser_profiles" ON public.advertiser_profiles;

CREATE POLICY "Advertisers can read their own profile" ON public.advertiser_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Advertisers can update their own profile" ON public.advertiser_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins have full access to advertiser_profiles" ON public.advertiser_profiles
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role has full access to advertiser_profiles" ON public.advertiser_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: ad_spots
-- Access: Public read available spots, admins manage, service role full access
-- =====================================================

DROP POLICY IF EXISTS "Public can read available ad_spots" ON public.ad_spots;
DROP POLICY IF EXISTS "Admins can manage ad_spots" ON public.ad_spots;
DROP POLICY IF EXISTS "Service role has full access to ad_spots" ON public.ad_spots;

CREATE POLICY "Public can read available ad_spots" ON public.ad_spots
  FOR SELECT
  USING (status = 'available');

CREATE POLICY "Admins can manage ad_spots" ON public.ad_spots
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role has full access to ad_spots" ON public.ad_spots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: ad_campaigns
-- Access: Advertisers manage own campaigns, admins full access, service role full access
-- =====================================================

DROP POLICY IF EXISTS "Advertisers can read their own campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Advertisers can manage their own campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Admins have full access to ad_campaigns" ON public.ad_campaigns;
DROP POLICY IF EXISTS "Service role has full access to ad_campaigns" ON public.ad_campaigns;

CREATE POLICY "Advertisers can read their own campaigns" ON public.ad_campaigns
  FOR SELECT
  TO authenticated
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertiser_profiles WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Advertisers can manage their own campaigns" ON public.ad_campaigns
  FOR ALL
  TO authenticated
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertiser_profiles WHERE user_id = auth.uid()
    ) OR public.is_admin()
  )
  WITH CHECK (
    advertiser_id IN (
      SELECT id FROM public.advertiser_profiles WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Admins have full access to ad_campaigns" ON public.ad_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role has full access to ad_campaigns" ON public.ad_campaigns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: ad_creatives
-- Access: Advertisers manage own creatives, admins approve, service role full access
-- =====================================================

DROP POLICY IF EXISTS "Advertisers can manage their own creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Admins have full access to ad_creatives" ON public.ad_creatives;
DROP POLICY IF EXISTS "Service role has full access to ad_creatives" ON public.ad_creatives;

CREATE POLICY "Advertisers can manage their own creatives" ON public.ad_creatives
  FOR ALL
  TO authenticated
  USING (
    campaign_id IN (
      SELECT c.id FROM public.ad_campaigns c
      INNER JOIN public.advertiser_profiles ap ON c.advertiser_id = ap.id
      WHERE ap.user_id = auth.uid()
    ) OR public.is_admin()
  )
  WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM public.ad_campaigns c
      INNER JOIN public.advertiser_profiles ap ON c.advertiser_id = ap.id
      WHERE ap.user_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Admins have full access to ad_creatives" ON public.ad_creatives
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role has full access to ad_creatives" ON public.ad_creatives
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: ad_bookings
-- Access: Advertisers read own bookings, admins manage, service role full access
-- =====================================================

DROP POLICY IF EXISTS "Advertisers can read their own bookings" ON public.ad_bookings;
DROP POLICY IF EXISTS "Admins can manage ad_bookings" ON public.ad_bookings;
DROP POLICY IF EXISTS "Service role has full access to ad_bookings" ON public.ad_bookings;

CREATE POLICY "Advertisers can read their own bookings" ON public.ad_bookings
  FOR SELECT
  TO authenticated
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertiser_profiles WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Admins can manage ad_bookings" ON public.ad_bookings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role has full access to ad_bookings" ON public.ad_bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: ad_performance_metrics
-- Access: Advertisers read own metrics, admins full access, service role full access
-- =====================================================

DROP POLICY IF EXISTS "Advertisers can read their own metrics" ON public.ad_performance_metrics;
DROP POLICY IF EXISTS "Admins have full access to ad_performance_metrics" ON public.ad_performance_metrics;
DROP POLICY IF EXISTS "Service role has full access to ad_performance_metrics" ON public.ad_performance_metrics;

CREATE POLICY "Advertisers can read their own metrics" ON public.ad_performance_metrics
  FOR SELECT
  TO authenticated
  USING (
    booking_id IN (
      SELECT b.id FROM public.ad_bookings b
      INNER JOIN public.advertiser_profiles ap ON b.advertiser_id = ap.id
      WHERE ap.user_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Admins have full access to ad_performance_metrics" ON public.ad_performance_metrics
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role has full access to ad_performance_metrics" ON public.ad_performance_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: billing_transactions
-- Access: Users read own transactions, admins full access, service role full access
-- =====================================================

DROP POLICY IF EXISTS "Users can read their own billing_transactions" ON public.billing_transactions;
DROP POLICY IF EXISTS "Admins have full access to billing_transactions" ON public.billing_transactions;
DROP POLICY IF EXISTS "Service role has full access to billing_transactions" ON public.billing_transactions;

CREATE POLICY "Users can read their own billing_transactions" ON public.billing_transactions
  FOR SELECT
  TO authenticated
  USING (
    advertiser_id IN (
      SELECT id FROM public.advertiser_profiles WHERE user_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Admins have full access to billing_transactions" ON public.billing_transactions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Service role has full access to billing_transactions" ON public.billing_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TABLE: analytics_events
-- Access: Service role only (internal analytics)
-- =====================================================

DROP POLICY IF EXISTS "Service role has full access to analytics_events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics_events" ON public.analytics_events;

CREATE POLICY "Service role has full access to analytics_events" ON public.analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read analytics_events" ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies created for: advertiser_profiles, ad_spots, ad_campaigns, ad_creatives, ad_bookings, ad_performance_metrics, billing_transactions, analytics_events';
END $$;


