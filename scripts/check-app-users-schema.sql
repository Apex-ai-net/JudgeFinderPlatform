-- ============================================================================
-- APP_USERS TABLE DIAGNOSTIC SCRIPT
-- ============================================================================
-- Purpose: Check the current state of the app_users table
-- Safe to run: Yes (read-only queries)
-- Usage: Run in Supabase SQL Editor or via psql
-- ============================================================================

-- Set output formatting for better readability
\pset border 2
\pset format wrapped

-- ============================================================================
-- 1. CHECK IF APP_USERS TABLE EXISTS
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '1. TABLE EXISTENCE CHECK'
\echo '═══════════════════════════════════════════════════════════════════════'

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
        ) THEN '✓ app_users table EXISTS'
        ELSE '✗ app_users table DOES NOT EXIST'
    END AS status;

-- ============================================================================
-- 2. LIST ALL COLUMNS IN APP_USERS
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '2. TABLE COLUMNS'
\echo '═══════════════════════════════════════════════════════════════════════'

SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'app_users'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. CHECK IF IS_SERVICE_ACCOUNT COLUMN EXISTS
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '3. IS_SERVICE_ACCOUNT COLUMN CHECK'
\echo '═══════════════════════════════════════════════════════════════════════'

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_service_account'
        ) THEN '✓ is_service_account column EXISTS'
        ELSE '✗ is_service_account column DOES NOT EXIST'
    END AS status,
    COALESCE(
        (SELECT data_type
         FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = 'app_users'
         AND column_name = 'is_service_account'),
        'N/A'
    ) AS data_type,
    COALESCE(
        (SELECT column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = 'app_users'
         AND column_name = 'is_service_account'),
        'N/A'
    ) AS default_value;

-- ============================================================================
-- 4. CHECK IF IS_ADMIN COLUMN EXISTS
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '4. IS_ADMIN COLUMN CHECK'
\echo '═══════════════════════════════════════════════════════════════════════'

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_admin'
        ) THEN '✓ is_admin column EXISTS'
        ELSE '✗ is_admin column DOES NOT EXIST'
    END AS status,
    COALESCE(
        (SELECT data_type
         FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = 'app_users'
         AND column_name = 'is_admin'),
        'N/A'
    ) AS data_type,
    COALESCE(
        (SELECT column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
         AND table_name = 'app_users'
         AND column_name = 'is_admin'),
        'N/A'
    ) AS default_value;

-- ============================================================================
-- 5. LIST RLS POLICIES ON APP_USERS
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '5. ROW LEVEL SECURITY POLICIES'
\echo '═══════════════════════════════════════════════════════════════════════'

-- Check if RLS is enabled
SELECT
    CASE
        WHEN relrowsecurity THEN '✓ RLS is ENABLED on app_users'
        ELSE '✗ RLS is DISABLED on app_users'
    END AS rls_status
FROM pg_class
WHERE relname = 'app_users'
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

\echo ''
\echo 'Active RLS Policies:'

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'app_users'
ORDER BY policyname;

-- ============================================================================
-- 6. SAMPLE DATA FROM APP_USERS (First 5 rows, no sensitive data)
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '6. SAMPLE DATA (First 5 rows - non-sensitive columns only)'
\echo '═══════════════════════════════════════════════════════════════════════'

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'app_users'
    ) THEN
        -- Check which columns exist and query accordingly
        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_service_account'
        ) AND EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_admin'
        ) THEN
            RAISE NOTICE 'Querying with all columns (including is_service_account and is_admin)';
        ELSE
            RAISE NOTICE 'Querying with base columns only';
        END IF;
    ELSE
        RAISE NOTICE 'Table app_users does not exist - skipping sample data query';
    END IF;
END $$;

-- Attempt to query sample data (will show what's available)
SELECT
    id,
    LEFT(email, 3) || '***@' || SPLIT_PART(email, '@', 2) AS email_masked,
    display_name,
    role,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_service_account'
        ) THEN (SELECT is_service_account FROM app_users LIMIT 1)
        ELSE NULL
    END AS is_service_account,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_admin'
        ) THEN (SELECT is_admin FROM app_users LIMIT 1)
        ELSE NULL
    END AS is_admin,
    subscription_tier,
    subscription_status,
    created_at,
    updated_at
FROM app_users
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- 7. SUMMARY STATISTICS
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '7. SUMMARY STATISTICS'
\echo '═══════════════════════════════════════════════════════════════════════'

DO $$
DECLARE
    total_count INTEGER;
    service_count INTEGER;
    admin_count INTEGER;
    has_service_col BOOLEAN;
    has_admin_col BOOLEAN;
BEGIN
    -- Check if table exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'app_users'
    ) THEN
        -- Get total count
        EXECUTE 'SELECT COUNT(*) FROM app_users' INTO total_count;
        RAISE NOTICE 'Total users: %', total_count;

        -- Check if is_service_account exists
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_service_account'
        ) INTO has_service_col;

        IF has_service_col THEN
            EXECUTE 'SELECT COUNT(*) FROM app_users WHERE is_service_account = true' INTO service_count;
            RAISE NOTICE 'Service accounts: %', service_count;
        ELSE
            RAISE NOTICE 'Service accounts: Column does not exist';
        END IF;

        -- Check if is_admin exists
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'app_users'
            AND column_name = 'is_admin'
        ) INTO has_admin_col;

        IF has_admin_col THEN
            EXECUTE 'SELECT COUNT(*) FROM app_users WHERE is_admin = true' INTO admin_count;
            RAISE NOTICE 'Admin users: %', admin_count;
        ELSE
            RAISE NOTICE 'Admin users: Column does not exist';
        END IF;

        -- Role breakdown
        RAISE NOTICE '--- Role Breakdown ---';
        FOR rec IN
            SELECT role, COUNT(*) as count
            FROM app_users
            GROUP BY role
            ORDER BY count DESC
        LOOP
            RAISE NOTICE 'Role "%": % users', rec.role, rec.count;
        END LOOP;

    ELSE
        RAISE NOTICE 'Table app_users does not exist - cannot generate statistics';
    END IF;
END $$;

-- ============================================================================
-- 8. INDEXES ON APP_USERS
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo '8. INDEXES ON APP_USERS'
\echo '═══════════════════════════════════════════════════════════════════════'

SELECT
    i.relname AS index_name,
    a.attname AS column_name,
    am.amname AS index_type,
    ix.indisunique AS is_unique,
    ix.indisprimary AS is_primary
FROM
    pg_class t,
    pg_class i,
    pg_index ix,
    pg_attribute a,
    pg_am am
WHERE
    t.oid = ix.indrelid
    AND i.oid = ix.indexrelid
    AND a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
    AND t.relkind = 'r'
    AND t.relname = 'app_users'
    AND am.oid = i.relam
ORDER BY
    i.relname,
    a.attnum;

-- ============================================================================
-- DIAGNOSTIC COMPLETE
-- ============================================================================
\echo ''
\echo '═══════════════════════════════════════════════════════════════════════'
\echo 'DIAGNOSTIC COMPLETE'
\echo '═══════════════════════════════════════════════════════════════════════'
\echo ''
