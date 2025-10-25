-- =====================================================
-- Migration: Create RLS Policies - Part 3 (User Data Tables)
-- =====================================================
-- Priority: P0 - CRITICAL SECURITY FIX
-- Tables: evaluations, documents
-- Reference: docs/5-AGENT-CODEBASE-ANALYSIS-ACTION-PLAN.md
-- =====================================================

-- =====================================================
-- TABLE: evaluations
-- Access: Users manage own evaluations, service role full access, admins full access
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'evaluations') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can read their own evaluations" ON public.evaluations;
    DROP POLICY IF EXISTS "Users can create evaluations" ON public.evaluations;
    DROP POLICY IF EXISTS "Users can update their own evaluations" ON public.evaluations;
    DROP POLICY IF EXISTS "Service role has full access to evaluations" ON public.evaluations;
    DROP POLICY IF EXISTS "Admins have full access to evaluations" ON public.evaluations;

    -- Users can read evaluations where they are preceptor or student
    CREATE POLICY "Users can read their own evaluations" ON public.evaluations
      FOR SELECT
      TO authenticated
      USING (
        preceptor_id = auth.uid() OR
        student_id = auth.uid() OR
        public.is_admin()
      );

    -- Users can create evaluations as preceptor
    CREATE POLICY "Users can create evaluations" ON public.evaluations
      FOR INSERT
      TO authenticated
      WITH CHECK (preceptor_id = auth.uid() OR public.is_admin());

    -- Users can update their own evaluations (as preceptor)
    CREATE POLICY "Users can update their own evaluations" ON public.evaluations
      FOR UPDATE
      TO authenticated
      USING (preceptor_id = auth.uid() OR public.is_admin())
      WITH CHECK (preceptor_id = auth.uid() OR public.is_admin());

    -- Service role full access
    CREATE POLICY "Service role has full access to evaluations" ON public.evaluations
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- Admin full access
    CREATE POLICY "Admins have full access to evaluations" ON public.evaluations
      FOR ALL
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

-- =====================================================
-- TABLE: documents
-- Access: Users manage own documents, admins verify, service role full access
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can read their own documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can upload documents" ON public.documents;
    DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
    DROP POLICY IF EXISTS "Admins can verify documents" ON public.documents;
    DROP POLICY IF EXISTS "Service role has full access to documents" ON public.documents;

    -- Users can read their own documents
    CREATE POLICY "Users can read their own documents" ON public.documents
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR public.is_admin());

    -- Users can upload documents
    CREATE POLICY "Users can upload documents" ON public.documents
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());

    -- Users can update their own documents (not verified ones)
    CREATE POLICY "Users can update their own documents" ON public.documents
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid() AND verification_status != 'verified')
      WITH CHECK (user_id = auth.uid());

    -- Admins can verify/reject documents
    CREATE POLICY "Admins can verify documents" ON public.documents
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    -- Service role full access
    CREATE POLICY "Service role has full access to documents" ON public.documents
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies created for existing tables among: evaluations, documents';
END $$;

