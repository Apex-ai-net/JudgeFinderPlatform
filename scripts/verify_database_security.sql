-- =====================================================
-- Database Security Verification Script
-- =====================================================
-- Purpose: Comprehensive security audit queries
-- Run this after applying all RLS migrations
-- =====================================================

\echo '====================================================================='
\echo 'DATABASE SECURITY VERIFICATION SCRIPT'
\echo 'JudgeFinder Platform - PostgreSQL/Supabase'
\echo '====================================================================='
\echo ''

-- =====================================================
-- 1. RLS ENABLEMENT CHECK
-- =====================================================

\echo '1. CHECKING RLS ENABLEMENT ON ALL PUBLIC TABLES'
\echo '---------------------------------------------------------------------'

SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY
  CASE WHEN rowsecurity THEN 0 ELSE 1 END,
  tablename;

\echo ''
\echo 'Expected: All tables should show ✅ ENABLED'
\echo ''

-- =====================================================
-- 2. TABLES WITHOUT POLICIES
-- =====================================================

\echo '2. CHECKING FOR TABLES WITHOUT RLS POLICIES'
\echo '---------------------------------------------------------------------'

SELECT
  t.tablename,
  COUNT(p.policyname) as policy_count,
  CASE
    WHEN COUNT(p.policyname) = 0 THEN '❌ NO POLICIES'
    WHEN COUNT(p.policyname) < 2 THEN '⚠️  MINIMAL POLICIES'
    ELSE '✅ HAS POLICIES'
  END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON
  p.schemaname = t.schemaname AND
  p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.tablename
ORDER BY
  COUNT(p.policyname),
  t.tablename;

\echo ''
\echo 'Expected: All tables should have at least 2 policies'
\echo '(Service role + specific access pattern)'
\echo ''

-- =====================================================
-- 3. POLICY COVERAGE SUMMARY
-- =====================================================

\echo '3. POLICY COVERAGE SUMMARY'
\echo '---------------------------------------------------------------------'

SELECT
  tablename,
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE policyname ILIKE '%service%') as service_policies,
  COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') as admin_policies,
  COUNT(*) FILTER (WHERE policyname ILIKE '%public%' OR policyname ILIKE '%everyone%') as public_policies,
  COUNT(*) FILTER (WHERE policyname ILIKE '%user%' OR policyname ILIKE '%own%') as user_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- =====================================================
-- 4. SECURITY DEFINER FUNCTIONS CHECK
-- =====================================================

\echo '4. CHECKING SECURITY DEFINER FUNCTIONS FOR SEARCH PATHS'
\echo '---------------------------------------------------------------------'

SELECT
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    ) THEN '✅ HAS SEARCH_PATH'
    ELSE '❌ MISSING SEARCH_PATH'
  END as search_path_status,
  (
    SELECT config
    FROM unnest(p.proconfig) AS config
    WHERE config LIKE 'search_path=%'
    LIMIT 1
  ) as search_path_value
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY
  CASE
    WHEN EXISTS (
      SELECT 1 FROM unnest(p.proconfig) AS config
      WHERE config LIKE 'search_path=%'
    ) THEN 0
    ELSE 1
  END,
  p.proname;

\echo ''
\echo 'Expected: All SECURITY DEFINER functions should have search_path set'
\echo ''

-- =====================================================
-- 5. SECURITY DEFINER VIEWS CHECK
-- =====================================================

\echo '5. CHECKING FOR SECURITY DEFINER VIEWS (SHOULD BE NONE)'
\echo '---------------------------------------------------------------------'

SELECT
  schemaname,
  viewname,
  CASE
    WHEN definition LIKE '%SECURITY DEFINER%' THEN '❌ HAS SECURITY DEFINER'
    ELSE '✅ NO SECURITY DEFINER'
  END as status
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%SECURITY DEFINER%';

\echo ''
\echo 'Expected: 0 rows (no views should use SECURITY DEFINER)'
\echo ''

-- =====================================================
-- 6. CRITICAL TABLES SECURITY SUMMARY
-- =====================================================

\echo '6. CRITICAL TABLES SECURITY SUMMARY'
\echo '---------------------------------------------------------------------'

WITH critical_tables AS (
  SELECT unnest(ARRAY[
    'users', 'app_users', 'judges', 'courts', 'cases',
    'attorneys', 'bookmarks', 'search_history', 'subscriptions',
    'advertiser_profiles', 'ad_campaigns', 'ad_bookings',
    'organizations', 'organization_members',
    'billing_transactions', 'invoices', 'subscriptions'
  ]) as tablename
)
SELECT
  ct.tablename,
  CASE WHEN t.rowsecurity THEN '✅' ELSE '❌' END as rls_enabled,
  COALESCE(COUNT(p.policyname), 0) as policy_count,
  CASE
    WHEN NOT t.rowsecurity THEN '❌ RLS DISABLED'
    WHEN COUNT(p.policyname) = 0 THEN '❌ NO POLICIES'
    WHEN COUNT(p.policyname) < 2 THEN '⚠️  MINIMAL POLICIES'
    ELSE '✅ PROTECTED'
  END as security_status
FROM critical_tables ct
LEFT JOIN pg_tables t ON
  t.schemaname = 'public' AND
  t.tablename = ct.tablename
LEFT JOIN pg_policies p ON
  p.schemaname = 'public' AND
  p.tablename = ct.tablename
GROUP BY ct.tablename, t.rowsecurity
ORDER BY
  CASE
    WHEN NOT t.rowsecurity THEN 0
    WHEN COUNT(p.policyname) = 0 THEN 1
    WHEN COUNT(p.policyname) < 2 THEN 2
    ELSE 3
  END,
  ct.tablename;

\echo ''
\echo 'Expected: All critical tables should show ✅ PROTECTED'
\echo ''

-- =====================================================
-- 7. SERVICE ROLE BYPASS CHECK
-- =====================================================

\echo '7. VERIFYING SERVICE ROLE BYPASS POLICIES'
\echo '---------------------------------------------------------------------'

SELECT
  tablename,
  COUNT(*) FILTER (
    WHERE policyname ILIKE '%service%'
    AND roles @> ARRAY['service_role']
  ) as service_role_policies,
  CASE
    WHEN COUNT(*) FILTER (
      WHERE policyname ILIKE '%service%'
      AND roles @> ARRAY['service_role']
    ) > 0 THEN '✅ HAS SERVICE BYPASS'
    ELSE '⚠️  NO SERVICE BYPASS'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY
  CASE
    WHEN COUNT(*) FILTER (
      WHERE policyname ILIKE '%service%'
      AND roles @> ARRAY['service_role']
    ) > 0 THEN 0
    ELSE 1
  END,
  tablename;

\echo ''
\echo 'Expected: All tables should have service role bypass for backend operations'
\echo ''

-- =====================================================
-- 8. ADMIN ACCESS CHECK
-- =====================================================

\echo '8. VERIFYING ADMIN ACCESS POLICIES'
\echo '---------------------------------------------------------------------'

SELECT
  tablename,
  COUNT(*) FILTER (
    WHERE policyname ILIKE '%admin%'
  ) as admin_policies,
  CASE
    WHEN COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') > 0
    THEN '✅ HAS ADMIN ACCESS'
    ELSE '⚠️  NO ADMIN ACCESS'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY
  CASE
    WHEN COUNT(*) FILTER (WHERE policyname ILIKE '%admin%') > 0
    THEN 0
    ELSE 1
  END,
  tablename;

\echo ''
\echo 'Expected: Most tables should have admin access for platform management'
\echo ''

-- =====================================================
-- 9. DETAILED POLICY LISTING (SAMPLE TABLES)
-- =====================================================

\echo '9. DETAILED POLICY LISTING FOR KEY TABLES'
\echo '---------------------------------------------------------------------'

SELECT
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN roles IS NULL THEN 'ALL ROLES'
    ELSE array_to_string(roles, ', ')
  END as applies_to,
  CASE
    WHEN qual IS NULL THEN 'true (no restriction)'
    ELSE substring(qual::text, 1, 50) || '...'
  END as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'app_users', 'judges', 'attorneys',
    'bookmarks', 'search_history', 'subscriptions',
    'ad_campaigns', 'organizations'
  )
ORDER BY tablename, policyname;

\echo ''

-- =====================================================
-- 10. SECURITY SCORE SUMMARY
-- =====================================================

\echo '10. OVERALL SECURITY SCORE'
\echo '====================================================================='

WITH security_metrics AS (
  SELECT
    COUNT(DISTINCT t.tablename) as total_tables,
    COUNT(DISTINCT t.tablename) FILTER (WHERE t.rowsecurity = true) as rls_enabled_tables,
    COUNT(DISTINCT p.tablename) as tables_with_policies,
    COUNT(*) as total_policies,
    COUNT(*) FILTER (WHERE p.policyname ILIKE '%service%') as service_policies,
    COUNT(*) FILTER (WHERE p.policyname ILIKE '%admin%') as admin_policies
  FROM pg_tables t
  LEFT JOIN pg_policies p ON
    p.schemaname = t.schemaname AND
    p.tablename = t.tablename
  WHERE t.schemaname = 'public'
),
function_metrics AS (
  SELECT
    COUNT(*) as total_security_definer_functions,
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1 FROM unnest(p.proconfig) AS config
        WHERE config LIKE 'search_path=%'
      )
    ) as functions_with_search_path
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
)
SELECT
  sm.total_tables || ' total tables' as metric_1,
  sm.rls_enabled_tables || '/' || sm.total_tables || ' tables with RLS enabled (' ||
    ROUND(100.0 * sm.rls_enabled_tables / NULLIF(sm.total_tables, 0), 1) || '%)' as metric_2,
  sm.tables_with_policies || '/' || sm.rls_enabled_tables || ' RLS tables with policies (' ||
    ROUND(100.0 * sm.tables_with_policies / NULLIF(sm.rls_enabled_tables, 0), 1) || '%)' as metric_3,
  sm.total_policies || ' total RLS policies created' as metric_4,
  fm.functions_with_search_path || '/' || fm.total_security_definer_functions ||
    ' SECURITY DEFINER functions protected (' ||
    ROUND(100.0 * fm.functions_with_search_path / NULLIF(fm.total_security_definer_functions, 0), 1) || '%)' as metric_5
FROM security_metrics sm, function_metrics fm;

\echo ''
\echo 'SECURITY SCORE INTERPRETATION:'
\echo '  RLS Enablement:     >= 95% = ✅ Excellent, >= 90% = ⚠️  Good, < 90% = ❌ Poor'
\echo '  Policy Coverage:    100% = ✅ Excellent, >= 95% = ⚠️  Good, < 95% = ❌ Poor'
\echo '  Function Protection: 100% = ✅ Excellent, >= 90% = ⚠️  Good, < 90% = ❌ Poor'
\echo ''
\echo '====================================================================='
\echo 'END OF SECURITY VERIFICATION'
\echo '====================================================================='
