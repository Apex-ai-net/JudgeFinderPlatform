-- ============================================================================
-- COMPREHENSIVE DATABASE SCHEMA VERIFICATION FOR STRIPE BILLING
-- ============================================================================
-- Run this in Supabase SQL Editor to verify the complete billing schema
-- Generated: 2025-10-19
-- ============================================================================

\echo '============================================================================'
\echo 'STRIPE BILLING SCHEMA VERIFICATION REPORT'
\echo '============================================================================'

-- ============================================================================
-- SECTION 1: TABLE EXISTENCE CHECK
-- ============================================================================
\echo ''
\echo '1. CHECKING TABLE EXISTENCE'
\echo '----------------------------'

SELECT
    'ad_orders' as table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ad_orders'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'judge_ad_products',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'judge_ad_products'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'ad_spot_bookings',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ad_spot_bookings'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'checkout_sessions',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'checkout_sessions'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'organizations',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'invoices',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'webhook_logs',
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'webhook_logs'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- ============================================================================
-- SECTION 2: TABLE COLUMNS DETAIL
-- ============================================================================
\echo ''
\echo '2. TABLE COLUMNS DETAIL'
\echo '-----------------------'

-- judge_ad_products columns
\echo ''
\echo 'TABLE: judge_ad_products'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'judge_ad_products'
ORDER BY ordinal_position;

-- ad_spot_bookings columns
\echo ''
\echo 'TABLE: ad_spot_bookings'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ad_spot_bookings'
ORDER BY ordinal_position;

-- checkout_sessions columns
\echo ''
\echo 'TABLE: checkout_sessions'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'checkout_sessions'
ORDER BY ordinal_position;

-- organizations columns (billing-related only)
\echo ''
\echo 'TABLE: organizations (billing columns)'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'organizations'
  AND (column_name LIKE '%stripe%'
       OR column_name LIKE '%subscription%'
       OR column_name LIKE '%billing%'
       OR column_name LIKE '%payment%'
       OR column_name LIKE '%seats%'
       OR column_name LIKE '%api_calls%')
ORDER BY ordinal_position;

-- invoices columns
\echo ''
\echo 'TABLE: invoices'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
ORDER BY ordinal_position;

-- webhook_logs columns
\echo ''
\echo 'TABLE: webhook_logs'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'webhook_logs'
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) STATUS
-- ============================================================================
\echo ''
\echo '3. ROW LEVEL SECURITY STATUS'
\echo '----------------------------'

SELECT
    schemaname,
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'ad_orders',
    'judge_ad_products',
    'ad_spot_bookings',
    'checkout_sessions',
    'organizations',
    'invoices',
    'webhook_logs'
  )
ORDER BY tablename;

-- ============================================================================
-- SECTION 4: RLS POLICIES DETAIL
-- ============================================================================
\echo ''
\echo '4. RLS POLICIES DETAIL'
\echo '----------------------'

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'ad_orders',
    'judge_ad_products',
    'ad_spot_bookings',
    'checkout_sessions',
    'organizations',
    'invoices',
    'webhook_logs'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 5: INDEXES CHECK
-- ============================================================================
\echo ''
\echo '5. INDEXES VERIFICATION'
\echo '-----------------------'

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'ad_orders',
    'judge_ad_products',
    'ad_spot_bookings',
    'checkout_sessions',
    'organizations',
    'invoices',
    'webhook_logs'
  )
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 6: DATABASE FUNCTIONS VERIFICATION
-- ============================================================================
\echo ''
\echo '6. DATABASE FUNCTIONS CHECK'
\echo '---------------------------'

-- Check if requesting_user_id() function exists
SELECT
    'requesting_user_id()' as function_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'requesting_user_id'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
-- Check if update_updated_at_column() function exists
SELECT
    'update_updated_at_column()',
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname = 'update_updated_at_column'
    ) THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- List all functions in public schema
\echo ''
\echo 'All functions in public schema:'
SELECT
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%request%'
       OR p.proname LIKE '%updated_at%'
       OR p.proname LIKE '%seat%'
       OR p.proname LIKE '%usage%')
ORDER BY p.proname;

-- ============================================================================
-- SECTION 7: TRIGGERS CHECK
-- ============================================================================
\echo ''
\echo '7. TRIGGERS VERIFICATION'
\echo '------------------------'

SELECT
    event_object_table as table_name,
    trigger_name,
    event_manipulation as on_event,
    action_timing as timing,
    action_statement as action
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'judge_ad_products',
    'ad_spot_bookings',
    'organizations',
    'organization_members',
    'invoices'
  )
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SECTION 8: TABLE CONSTRAINTS
-- ============================================================================
\echo ''
\echo '8. TABLE CONSTRAINTS'
\echo '--------------------'

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN (
    'judge_ad_products',
    'ad_spot_bookings',
    'checkout_sessions',
    'organizations',
    'invoices',
    'webhook_logs'
  )
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ============================================================================
-- SECTION 9: TEST QUERIES
-- ============================================================================
\echo ''
\echo '9. TEST QUERIES'
\echo '---------------'

-- Test query: ad_orders (if exists)
\echo ''
\echo 'Testing: SELECT COUNT(*) FROM ad_orders'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ad_orders'
    ) THEN
        RAISE NOTICE 'ad_orders table exists';
        PERFORM COUNT(*) FROM ad_orders;
        RAISE NOTICE '✅ Query successful';
    ELSE
        RAISE NOTICE '⚠️  ad_orders table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
END $$;

-- Test query: judge_ad_products
\echo ''
\echo 'Testing: SELECT COUNT(*) FROM judge_ad_products'
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'judge_ad_products'
    ) THEN
        SELECT COUNT(*) INTO row_count FROM judge_ad_products;
        RAISE NOTICE '✅ Query successful - % rows', row_count;
    ELSE
        RAISE NOTICE '⚠️  judge_ad_products table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
END $$;

-- Test query: ad_spot_bookings
\echo ''
\echo 'Testing: SELECT COUNT(*) FROM ad_spot_bookings'
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ad_spot_bookings'
    ) THEN
        SELECT COUNT(*) INTO row_count FROM ad_spot_bookings;
        RAISE NOTICE '✅ Query successful - % rows', row_count;
    ELSE
        RAISE NOTICE '⚠️  ad_spot_bookings table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
END $$;

-- Test query: checkout_sessions
\echo ''
\echo 'Testing: SELECT COUNT(*) FROM checkout_sessions'
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'checkout_sessions'
    ) THEN
        SELECT COUNT(*) INTO row_count FROM checkout_sessions;
        RAISE NOTICE '✅ Query successful - % rows', row_count;
    ELSE
        RAISE NOTICE '⚠️  checkout_sessions table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
END $$;

-- Test query: organizations
\echo ''
\echo 'Testing: SELECT COUNT(*) FROM organizations'
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'organizations'
    ) THEN
        SELECT COUNT(*) INTO row_count FROM organizations;
        RAISE NOTICE '✅ Query successful - % rows', row_count;
    ELSE
        RAISE NOTICE '⚠️  organizations table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
END $$;

-- Test query: invoices
\echo ''
\echo 'Testing: SELECT COUNT(*) FROM invoices'
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) THEN
        SELECT COUNT(*) INTO row_count FROM invoices;
        RAISE NOTICE '✅ Query successful - % rows', row_count;
    ELSE
        RAISE NOTICE '⚠️  invoices table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
END $$;

-- Test query: webhook_logs
\echo ''
\echo 'Testing: SELECT COUNT(*) FROM webhook_logs'
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'webhook_logs'
    ) THEN
        SELECT COUNT(*) INTO row_count FROM webhook_logs;
        RAISE NOTICE '✅ Query successful - % rows', row_count;
    ELSE
        RAISE NOTICE '⚠️  webhook_logs table does not exist';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Query failed: %', SQLERRM;
END $$;

-- ============================================================================
-- SECTION 10: SUMMARY & RECOMMENDATIONS
-- ============================================================================
\echo ''
\echo '10. SUMMARY & RECOMMENDATIONS'
\echo '-----------------------------'

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    tables_without_rls TEXT[] := ARRAY[]::TEXT[];
    table_rec RECORD;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'VERIFICATION SUMMARY';
    RAISE NOTICE '============================================================================';

    -- Check missing tables
    FOR table_rec IN
        SELECT t.table_name
        FROM (VALUES
            ('judge_ad_products'),
            ('ad_spot_bookings'),
            ('checkout_sessions'),
            ('organizations'),
            ('invoices'),
            ('webhook_logs')
        ) AS t(table_name)
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = t.table_name
        )
    LOOP
        missing_tables := array_append(missing_tables, table_rec.table_name);
    END LOOP;

    -- Check tables without RLS
    FOR table_rec IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename IN (
            'judge_ad_products',
            'ad_spot_bookings',
            'checkout_sessions',
            'organizations',
            'invoices',
            'webhook_logs'
          )
          AND NOT rowsecurity
    LOOP
        tables_without_rls := array_append(tables_without_rls, table_rec.tablename);
    END LOOP;

    -- Report missing tables
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '❌ MISSING TABLES:';
        FOREACH table_rec.table_name IN ARRAY missing_tables
        LOOP
            RAISE NOTICE '   - %', table_rec.table_name;
        END LOOP;
        RAISE NOTICE '';
        RAISE NOTICE 'RECOMMENDATION: Apply migration files:';
        RAISE NOTICE '   1. supabase/migrations/20250118000000_organization_billing.sql';
        RAISE NOTICE '   2. supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql';
    ELSE
        RAISE NOTICE '✅ All required tables exist';
    END IF;

    -- Report tables without RLS
    IF array_length(tables_without_rls, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  TABLES WITHOUT RLS:';
        FOREACH table_rec.table_name IN ARRAY tables_without_rls
        LOOP
            RAISE NOTICE '   - %', table_rec.table_name;
        END LOOP;
        RAISE NOTICE '';
        RAISE NOTICE 'RECOMMENDATION: Enable RLS on these tables immediately';
    ELSE
        RAISE NOTICE '✅ All tables have RLS enabled';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '============================================================================';
END $$;
