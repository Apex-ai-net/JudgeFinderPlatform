-- =====================================================
-- Migration: Create RLS Policies - Part 2 (Analytics & Data Tables)
-- =====================================================
-- Priority: P0 - CRITICAL SECURITY FIX
-- Tables: law_firm_targets, judge_analytics, case_attorneys, courthouse_analytics
-- Reference: docs/5-AGENT-CODEBASE-ANALYSIS-ACTION-PLAN.md
-- =====================================================

-- =====================================================
-- TABLE: law_firm_targets
-- Access: Admin only (sensitive marketing data)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'law_firm_targets') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admins have full access to law_firm_targets" ON public.law_firm_targets;
    DROP POLICY IF EXISTS "Service role has full access to law_firm_targets" ON public.law_firm_targets;

    -- Admin full access
    CREATE POLICY "Admins have full access to law_firm_targets" ON public.law_firm_targets
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    -- Service role full access
    CREATE POLICY "Service role has full access to law_firm_targets" ON public.law_firm_targets
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- TABLE: judge_analytics
-- Access: Public read, service role write, admins full access
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'judge_analytics') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public can read judge_analytics" ON public.judge_analytics;
    DROP POLICY IF EXISTS "Service role can write judge_analytics" ON public.judge_analytics;
    DROP POLICY IF EXISTS "Admins have full access to judge_analytics" ON public.judge_analytics;

    -- Public read access
    CREATE POLICY "Public can read judge_analytics" ON public.judge_analytics
      FOR SELECT
      USING (true);

    -- Service role full access
    CREATE POLICY "Service role can write judge_analytics" ON public.judge_analytics
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- Admin full access
    CREATE POLICY "Admins have full access to judge_analytics" ON public.judge_analytics
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- TABLE: case_attorneys
-- Access: Public read, service role write, admins full access
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'case_attorneys') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public can read case_attorneys" ON public.case_attorneys;
    DROP POLICY IF EXISTS "Service role can write case_attorneys" ON public.case_attorneys;
    DROP POLICY IF EXISTS "Admins have full access to case_attorneys" ON public.case_attorneys;

    -- Public read access
    CREATE POLICY "Public can read case_attorneys" ON public.case_attorneys
      FOR SELECT
      USING (true);

    -- Service role full access
    CREATE POLICY "Service role can write case_attorneys" ON public.case_attorneys
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- Admin full access
    CREATE POLICY "Admins have full access to case_attorneys" ON public.case_attorneys
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- TABLE: courthouse_analytics
-- Access: Public read, service role write, admins full access
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courthouse_analytics') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Public can read courthouse_analytics" ON public.courthouse_analytics;
    DROP POLICY IF EXISTS "Service role can write courthouse_analytics" ON public.courthouse_analytics;
    DROP POLICY IF EXISTS "Admins have full access to courthouse_analytics" ON public.courthouse_analytics;

    -- Public read access
    CREATE POLICY "Public can read courthouse_analytics" ON public.courthouse_analytics
      FOR SELECT
      USING (true);

    -- Service role full access
    CREATE POLICY "Service role can write courthouse_analytics" ON public.courthouse_analytics
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- Admin full access
    CREATE POLICY "Admins have full access to courthouse_analytics" ON public.courthouse_analytics
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies created for existing tables among: law_firm_targets, judge_analytics, case_attorneys, courthouse_analytics';
END $$;

