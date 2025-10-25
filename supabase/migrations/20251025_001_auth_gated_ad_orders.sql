-- ========================================
-- MIGRATION: Auth-Gated Ad Orders RLS
-- Version: 20251015_002
-- Purpose: Add Clerk user ID extraction and RLS policies for ad_orders
-- Author: JudgeFinder Platform Team
-- Date: 2025-10-15
-- ========================================

BEGIN;

-- Step 1: Create function to extract Clerk user ID from JWT
-- This function reads the 'sub' claim from the JWT token passed by Supabase client
-- The 'sub' claim contains the Clerk user ID (format: user_2abc123...)
CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb)->>'sub',
    ''
  );
$$;

COMMENT ON FUNCTION public.requesting_user_id() IS 'Extracts Clerk user ID from JWT sub claim for RLS policies';

-- Step 2: Drop existing RLS policies (to replace with Clerk-based policies)
DROP POLICY IF EXISTS "Users can view their own ad orders" ON public.ad_orders;
DROP POLICY IF EXISTS "Admins can view all ad orders" ON public.ad_orders;
DROP POLICY IF EXISTS "Service role has full access to ad_orders" ON public.ad_orders;

-- Step 3: Create new RLS policies based on Clerk user ID

-- Policy 1: Service role can do anything (for webhook handler)
CREATE POLICY "Service role has full access to ad_orders"
  ON public.ad_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 2: Authenticated users can view their own orders (via Clerk user ID)
CREATE POLICY "Users can view their own ad orders via Clerk ID"
  ON public.ad_orders
  FOR SELECT
  TO authenticated
  USING (created_by = public.requesting_user_id());

-- Policy 3: Authenticated users can insert their own orders (webhook creates via service role)
-- Note: Inserts are typically done by service role (webhook), so this is defensive
CREATE POLICY "Users can insert their own ad orders"
  ON public.ad_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = public.requesting_user_id());

-- Policy 4: Authenticated users can update their own orders
CREATE POLICY "Users can update their own ad orders"
  ON public.ad_orders
  FOR UPDATE
  TO authenticated
  USING (created_by = public.requesting_user_id())
  WITH CHECK (created_by = public.requesting_user_id());

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

-- Step 5: Grant appropriate permissions
GRANT SELECT ON public.ad_orders TO authenticated;
GRANT INSERT ON public.ad_orders TO authenticated;
GRANT UPDATE ON public.ad_orders TO authenticated;
GRANT ALL ON public.ad_orders TO service_role;

-- Step 6: Update table statistics for query optimization
ANALYZE public.ad_orders;

COMMIT;

-- Verification queries (commented out, for manual testing):
--
-- Test 1: Verify function works
-- SELECT public.requesting_user_id();
--
-- Test 2: List all RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'ad_orders';
--
-- Test 3: Test RLS as authenticated user (requires setting JWT context)
-- SET request.jwt.claims = '{"sub": "user_2abc123"}';
-- SELECT * FROM public.ad_orders;  -- Should only show orders for user_2abc123
-- RESET request.jwt.claims;
