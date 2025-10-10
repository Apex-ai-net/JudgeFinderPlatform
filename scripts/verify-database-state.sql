-- ========================================
-- COMPREHENSIVE DATABASE STATE VERIFICATION
-- ========================================
-- Purpose: Verify the complete state of the Supabase database
-- Author: Database Management Team
-- Date: 2025-10-09
-- Version: 1.0
-- ========================================
--
-- INSTRUCTIONS:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Review all output sections for any failures or warnings
-- 3. Look for "FAIL", "MISSING", or "WARNING" indicators
-- 4. All checks should show "OK" or "PASS" for a healthy database
--
-- WHAT THIS SCRIPT CHECKS:
-- - All required tables exist (30+ tables)
-- - RLS is enabled on all tables
-- - Required indexes exist (100+ indexes)
-- - Functions exist (search, analytics, caching)
-- - Materialized views exist and are populated
-- - Sample data counts for each table
-- - Foreign key constraints are in place
-- - Orphaned data detection
-- - Extension availability
-- - Trigger existence
--
-- OUTPUT FORMAT:
-- Each section has clear headers with emoji indicators
-- ✅ PASS / OK - Everything working correctly
-- ❌ FAIL / MISSING - Issue detected, needs attention
-- ⚠️  WARNING - Non-critical issue or recommendation
-- ========================================

\echo ''
\echo '╔═══════════════════════════════════════════════════════════════╗'
\echo '║           DATABASE VERIFICATION REPORT                        ║'
\echo '║           Generated: ' `date +"%Y-%m-%d %H:%M:%S"` '                           ║'
\echo '╚═══════════════════════════════════════════════════════════════╝'
\echo ''

-- ========================================
-- SECTION 1: REQUIRED EXTENSIONS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📦 SECTION 1: REQUIRED EXTENSIONS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    extname as "Extension Name",
    extversion as "Version",
    CASE
        WHEN extname IN ('uuid-ossp', 'pg_trgm', 'unaccent', 'pgcrypto')
        THEN '✅ OK'
        ELSE '⚠️  OPTIONAL'
    END as "Status"
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pg_trgm', 'unaccent', 'pgcrypto', 'pg_stat_statements')
ORDER BY extname;

-- Check for missing critical extensions
WITH required_extensions AS (
    SELECT unnest(ARRAY['uuid-ossp', 'pg_trgm', 'unaccent']) as ext_name
),
installed_extensions AS (
    SELECT extname FROM pg_extension
)
SELECT
    '❌ MISSING: ' || re.ext_name as "Missing Extensions"
FROM required_extensions re
LEFT JOIN installed_extensions ie ON re.ext_name = ie.extname
WHERE ie.extname IS NULL;

-- ========================================
-- SECTION 2: CORE TABLES VERIFICATION
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🗄️  SECTION 2: CORE TABLES VERIFICATION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

WITH required_tables AS (
    SELECT unnest(ARRAY[
        'judges', 'courts', 'cases',
        'judge_analytics_cache', 'app_users',
        'attorneys', 'attorney_slots',
        'law_firms', 'advertisements', 'payment_history', 'revenue_tracking',
        'subscriptions', 'search_history', 'analytics_events',
        'kpi_metrics', 'conversion_tracking', 'marketing_campaigns',
        'campaign_prospects', 'email_sequences', 'email_sequence_steps',
        'email_send_log', 'admin_analytics', 'billing_automations',
        'performance_metrics', 'ad_spots', 'ad_campaigns', 'ad_bookings',
        'ad_performance_metrics', 'ad_creatives', 'billing_transactions',
        'advertiser_profiles', 'profile_issues', 'sync_queue',
        'sync_validation_results', 'audit_logs', 'onboarding_analytics',
        'ai_search_metrics', 'ai_search_clicks', 'ad_events', 'ad_waitlist',
        'judge_court_positions', 'pricing_tiers'
    ]) as table_name
),
existing_tables AS (
    SELECT tablename as table_name
    FROM pg_tables
    WHERE schemaname = 'public'
)
SELECT
    rt.table_name as "Table Name",
    CASE
        WHEN et.table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as "Status",
    CASE
        WHEN et.table_name IS NOT NULL THEN pg_size_pretty(pg_total_relation_size('public.' || rt.table_name))
        ELSE 'N/A'
    END as "Size"
FROM required_tables rt
LEFT JOIN existing_tables et ON rt.table_name = et.table_name
ORDER BY
    CASE WHEN et.table_name IS NULL THEN 0 ELSE 1 END,
    rt.table_name;

-- ========================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) STATUS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔒 SECTION 3: ROW LEVEL SECURITY (RLS) STATUS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    schemaname as "Schema",
    tablename as "Table Name",
    CASE
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as "RLS Status",
    (
        SELECT COUNT(*)
        FROM pg_policies pp
        WHERE pp.schemaname = pt.schemaname
        AND pp.tablename = pt.tablename
    ) as "Policy Count"
FROM pg_tables pt
WHERE schemaname = 'public'
AND tablename IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
)
ORDER BY
    CASE WHEN rowsecurity THEN 1 ELSE 0 END,
    tablename;

-- Show tables missing RLS
SELECT
    '⚠️  WARNING: RLS DISABLED ON: ' || tablename as "RLS Issues"
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
AND tablename NOT LIKE 'pg_%'
LIMIT 10;

-- ========================================
-- SECTION 4: TABLE ROW COUNTS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 SECTION 4: TABLE ROW COUNTS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

DO $$
DECLARE
    table_record RECORD;
    row_count BIGINT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '%-30s | %-15s | %-10s', 'Table Name', 'Row Count', 'Status';
    RAISE NOTICE '----------------------------------------------------------------';

    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('judges', 'courts', 'cases', 'judge_analytics_cache',
                         'app_users', 'advertisements', 'ad_spots', 'profile_issues',
                         'ai_search_metrics', 'ai_search_clicks', 'onboarding_analytics',
                         'audit_logs', 'sync_queue', 'performance_metrics')
        ORDER BY tablename
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.tablename) INTO row_count;
            RAISE NOTICE '%-30s | %-15s | %-10s',
                table_record.tablename,
                row_count,
                CASE
                    WHEN row_count > 0 THEN '✅ HAS DATA'
                    WHEN table_record.tablename IN ('judges', 'courts', 'cases') THEN '⚠️  EMPTY'
                    ELSE '✅ OK'
                END;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '%-30s | %-15s | %-10s', table_record.tablename, 'ERROR', '❌ FAILED';
        END;
    END LOOP;
END $$;

-- ========================================
-- SECTION 5: CRITICAL INDEXES
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 SECTION 5: CRITICAL INDEXES'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

-- Check for critical indexes
WITH required_indexes AS (
    SELECT unnest(ARRAY[
        'idx_judges_name',
        'idx_judges_court_id',
        'idx_judges_jurisdiction',
        'idx_judges_slug',
        'idx_judges_search_vector_gin',
        'idx_judges_name_trgm',
        'idx_cases_judge_id',
        'idx_cases_case_number',
        'idx_cases_filing_date',
        'idx_courts_name',
        'idx_judge_analytics_cache_freshness',
        'idx_performance_metrics_page_url',
        'idx_app_users_email'
    ]) as index_name,
    unnest(ARRAY[
        'judges',
        'judges',
        'judges',
        'judges',
        'judges',
        'judges',
        'cases',
        'cases',
        'cases',
        'courts',
        'judge_analytics_cache',
        'performance_metrics',
        'app_users'
    ]) as table_name
)
SELECT
    ri.table_name as "Table",
    ri.index_name as "Index Name",
    CASE
        WHEN i.indexname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as "Status",
    CASE
        WHEN i.indexname IS NOT NULL THEN pg_size_pretty(pg_relation_size(ri.index_name::regclass))
        ELSE 'N/A'
    END as "Size"
FROM required_indexes ri
LEFT JOIN pg_indexes i ON i.indexname = ri.index_name AND i.schemaname = 'public'
ORDER BY
    CASE WHEN i.indexname IS NULL THEN 0 ELSE 1 END,
    ri.table_name, ri.index_name;

-- Show total index count per table
\echo ''
\echo 'Index Summary by Table:'
SELECT
    tablename as "Table Name",
    COUNT(*) as "Total Indexes",
    pg_size_pretty(SUM(pg_relation_size(indexname::regclass))) as "Total Index Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('judges', 'courts', 'cases', 'app_users', 'judge_analytics_cache')
GROUP BY tablename
ORDER BY COUNT(*) DESC;

-- ========================================
-- SECTION 6: MATERIALIZED VIEWS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📈 SECTION 6: MATERIALIZED VIEWS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

WITH required_matviews AS (
    SELECT unnest(ARRAY[
        'mv_judge_statistics_summary',
        'mv_judge_outcome_distributions',
        'mv_judge_case_type_summary'
    ]) as matview_name
)
SELECT
    rm.matview_name as "Materialized View",
    CASE
        WHEN mv.matviewname IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as "Status",
    CASE
        WHEN mv.matviewname IS NOT NULL THEN pg_size_pretty(pg_total_relation_size('public.' || rm.matview_name))
        ELSE 'N/A'
    END as "Size",
    CASE
        WHEN mv.matviewname IS NOT NULL THEN (
            SELECT COUNT(*)
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename = rm.matview_name
        )
        ELSE 0
    END as "Index Count"
FROM required_matviews rm
LEFT JOIN pg_matviews mv ON mv.matviewname = rm.matview_name AND mv.schemaname = 'public'
ORDER BY rm.matview_name;

-- Show materialized view row counts if they exist
DO $$
DECLARE
    mv_name TEXT;
    row_count BIGINT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Materialized View Row Counts:';
    RAISE NOTICE '----------------------------------------';

    FOR mv_name IN
        SELECT matviewname
        FROM pg_matviews
        WHERE schemaname = 'public'
        AND matviewname LIKE 'mv_%'
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', mv_name) INTO row_count;
            RAISE NOTICE '%-40s | %s rows', mv_name, row_count;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '%-40s | ERROR', mv_name;
        END;
    END LOOP;
END $$;

-- ========================================
-- SECTION 7: CRITICAL FUNCTIONS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '⚙️  SECTION 7: CRITICAL FUNCTIONS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

WITH required_functions AS (
    SELECT unnest(ARRAY[
        'search_judges_ranked',
        'search_judges_simple',
        'suggest_similar_judges',
        'refresh_judge_statistics_summary',
        'refresh_outcome_distributions',
        'refresh_case_type_summary',
        'refresh_all_analytics_views',
        'get_judge_analytics_cache_stats',
        'clear_stale_analytics_cache',
        'update_updated_at_column',
        'is_admin',
        'is_service_account'
    ]) as function_name
)
SELECT
    rf.function_name as "Function Name",
    CASE
        WHEN r.routine_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as "Status",
    CASE
        WHEN r.routine_name IS NOT NULL THEN r.routine_type
        ELSE 'N/A'
    END as "Type"
FROM required_functions rf
LEFT JOIN information_schema.routines r
    ON r.routine_name = rf.function_name
    AND r.routine_schema = 'public'
ORDER BY
    CASE WHEN r.routine_name IS NULL THEN 0 ELSE 1 END,
    rf.function_name;

-- Show total function count
SELECT
    COUNT(*) as "Total Functions in Schema",
    COUNT(*) FILTER (WHERE routine_type = 'FUNCTION') as "Functions",
    COUNT(*) FILTER (WHERE routine_type = 'PROCEDURE') as "Procedures"
FROM information_schema.routines
WHERE routine_schema = 'public';

-- ========================================
-- SECTION 8: FOREIGN KEY CONSTRAINTS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔗 SECTION 8: FOREIGN KEY CONSTRAINTS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    tc.table_name as "Child Table",
    kcu.column_name as "FK Column",
    ccu.table_name as "Parent Table",
    ccu.column_name as "Parent Column",
    rc.delete_rule as "On Delete",
    '✅ VALID' as "Status"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('judges', 'cases', 'judge_analytics_cache', 'advertisements', 'attorney_slots')
ORDER BY tc.table_name, kcu.column_name;

-- Show total FK count
SELECT
    COUNT(*) as "Total Foreign Keys",
    COUNT(*) FILTER (WHERE delete_rule = 'CASCADE') as "CASCADE Deletes",
    COUNT(*) FILTER (WHERE delete_rule = 'SET NULL') as "SET NULL Deletes",
    COUNT(*) FILTER (WHERE delete_rule = 'NO ACTION') as "NO ACTION Deletes"
FROM information_schema.referential_constraints
WHERE constraint_schema = 'public';

-- ========================================
-- SECTION 9: ORPHANED DATA DETECTION
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔍 SECTION 9: ORPHANED DATA DETECTION'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

DO $$
DECLARE
    orphaned_count BIGINT;
BEGIN
    -- Check for cases without judges
    BEGIN
        SELECT COUNT(*) INTO orphaned_count
        FROM cases
        WHERE judge_id IS NOT NULL
        AND judge_id NOT IN (SELECT id FROM judges);

        IF orphaned_count > 0 THEN
            RAISE NOTICE '⚠️  WARNING: % cases reference non-existent judges', orphaned_count;
        ELSE
            RAISE NOTICE '✅ No orphaned cases (all judge references valid)';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to check cases-judges relationship: %', SQLERRM;
    END;

    -- Check for judge_analytics_cache without judges
    BEGIN
        SELECT COUNT(*) INTO orphaned_count
        FROM judge_analytics_cache
        WHERE judge_id NOT IN (SELECT id FROM judges);

        IF orphaned_count > 0 THEN
            RAISE NOTICE '⚠️  WARNING: % analytics cache entries reference non-existent judges', orphaned_count;
        ELSE
            RAISE NOTICE '✅ No orphaned analytics cache entries';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to check analytics cache: %', SQLERRM;
    END;

    -- Check for advertisements without judges
    BEGIN
        SELECT COUNT(*) INTO orphaned_count
        FROM advertisements
        WHERE judge_id IS NOT NULL
        AND judge_id NOT IN (SELECT id FROM judges);

        IF orphaned_count > 0 THEN
            RAISE NOTICE '⚠️  WARNING: % advertisements reference non-existent judges', orphaned_count;
        ELSE
            RAISE NOTICE '✅ No orphaned advertisements';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to check advertisements: %', SQLERRM;
    END;

    -- Check for judges without courts (null court_id)
    BEGIN
        SELECT COUNT(*) INTO orphaned_count
        FROM judges
        WHERE court_id IS NULL;

        IF orphaned_count > 0 THEN
            RAISE NOTICE '⚠️  INFO: % judges have no court assigned (court_id is NULL)', orphaned_count;
        ELSE
            RAISE NOTICE '✅ All judges have courts assigned';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Failed to check judges without courts: %', SQLERRM;
    END;

END $$;

-- ========================================
-- SECTION 10: TRIGGERS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '⚡ SECTION 10: TRIGGERS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    trigger_schema as "Schema",
    event_object_table as "Table",
    trigger_name as "Trigger Name",
    action_timing as "When",
    string_agg(event_manipulation, ', ') as "Events",
    '✅ ACTIVE' as "Status"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('judges', 'courts', 'cases', 'judge_analytics_cache', 'app_users', 'attorneys')
GROUP BY trigger_schema, event_object_table, trigger_name, action_timing
ORDER BY event_object_table, trigger_name;

-- Show total trigger count
SELECT
    COUNT(*) as "Total Triggers",
    COUNT(*) FILTER (WHERE action_timing = 'BEFORE') as "BEFORE Triggers",
    COUNT(*) FILTER (WHERE action_timing = 'AFTER') as "AFTER Triggers"
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- ========================================
-- SECTION 11: DATA QUALITY CHECKS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '✨ SECTION 11: DATA QUALITY CHECKS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

DO $$
DECLARE
    check_count BIGINT;
    total_count BIGINT;
    percentage NUMERIC;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Data Quality Metrics:';
    RAISE NOTICE '--------------------------------------------------------';

    -- Check judges with slugs
    BEGIN
        SELECT COUNT(*) INTO total_count FROM judges;
        SELECT COUNT(*) INTO check_count FROM judges WHERE slug IS NOT NULL AND slug != '';
        percentage := CASE WHEN total_count > 0 THEN ROUND((check_count::NUMERIC / total_count) * 100, 1) ELSE 0 END;
        RAISE NOTICE 'Judges with slugs: % / % (%%%)', check_count, total_count, percentage;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check judges slugs: %', SQLERRM;
    END;

    -- Check judges with names
    BEGIN
        SELECT COUNT(*) INTO total_count FROM judges;
        SELECT COUNT(*) INTO check_count FROM judges WHERE name IS NOT NULL AND name != '';
        percentage := CASE WHEN total_count > 0 THEN ROUND((check_count::NUMERIC / total_count) * 100, 1) ELSE 0 END;
        RAISE NOTICE 'Judges with names: % / % (%%%)', check_count, total_count, percentage;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check judges names: %', SQLERRM;
    END;

    -- Check cases with decision dates
    BEGIN
        SELECT COUNT(*) INTO total_count FROM cases;
        SELECT COUNT(*) INTO check_count FROM cases WHERE decision_date IS NOT NULL;
        percentage := CASE WHEN total_count > 0 THEN ROUND((check_count::NUMERIC / total_count) * 100, 1) ELSE 0 END;
        RAISE NOTICE 'Cases with decision dates: % / % (%%%)', check_count, total_count, percentage;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check cases decision dates: %', SQLERRM;
    END;

    -- Check cases with outcomes
    BEGIN
        SELECT COUNT(*) INTO total_count FROM cases;
        SELECT COUNT(*) INTO check_count FROM cases WHERE outcome IS NOT NULL AND outcome != '';
        percentage := CASE WHEN total_count > 0 THEN ROUND((check_count::NUMERIC / total_count) * 100, 1) ELSE 0 END;
        RAISE NOTICE 'Cases with outcomes: % / % (%%%)', check_count, total_count, percentage;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check cases outcomes: %', SQLERRM;
    END;

    -- Check courts with names
    BEGIN
        SELECT COUNT(*) INTO total_count FROM courts;
        SELECT COUNT(*) INTO check_count FROM courts WHERE name IS NOT NULL AND name != '';
        percentage := CASE WHEN total_count > 0 THEN ROUND((check_count::NUMERIC / total_count) * 100, 1) ELSE 0 END;
        RAISE NOTICE 'Courts with names: % / % (%%%)', check_count, total_count, percentage;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check courts names: %', SQLERRM;
    END;

END $$;

-- ========================================
-- SECTION 12: RECENT ACTIVITY
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📅 SECTION 12: RECENT ACTIVITY'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

DO $$
DECLARE
    latest_judge_update TIMESTAMPTZ;
    latest_case_update TIMESTAMPTZ;
    latest_court_update TIMESTAMPTZ;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Latest Record Updates:';
    RAISE NOTICE '--------------------------------------------------------';

    BEGIN
        SELECT MAX(updated_at) INTO latest_judge_update FROM judges;
        RAISE NOTICE 'Latest judge update: %', COALESCE(latest_judge_update::TEXT, 'No data');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check judges updates: %', SQLERRM;
    END;

    BEGIN
        SELECT MAX(updated_at) INTO latest_case_update FROM cases;
        RAISE NOTICE 'Latest case update: %', COALESCE(latest_case_update::TEXT, 'No data');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check cases updates: %', SQLERRM;
    END;

    BEGIN
        SELECT MAX(updated_at) INTO latest_court_update FROM courts;
        RAISE NOTICE 'Latest court update: %', COALESCE(latest_court_update::TEXT, 'No data');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Failed to check courts updates: %', SQLERRM;
    END;

END $$;

-- ========================================
-- SECTION 13: STORAGE ANALYSIS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '💾 SECTION 13: STORAGE ANALYSIS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

SELECT
    schemaname as "Schema",
    tablename as "Table",
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as "Total Size",
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as "Table Size",
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as "Indexes Size",
    ROUND(
        100.0 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) /
        NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0),
        1
    ) as "Index %"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('judges', 'courts', 'cases', 'judge_analytics_cache', 'app_users', 'advertisements')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Total database size
SELECT
    pg_size_pretty(pg_database_size(current_database())) as "Total Database Size";

-- ========================================
-- SECTION 14: SUMMARY & RECOMMENDATIONS
-- ========================================
\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📋 SECTION 14: SUMMARY & RECOMMENDATIONS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'

DO $$
DECLARE
    total_tables INT;
    total_indexes INT;
    total_functions INT;
    total_matviews INT;
    total_triggers INT;
    rls_enabled_count INT;
    rls_total_count INT;
BEGIN
    -- Count all objects
    SELECT COUNT(*) INTO total_tables FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO total_indexes FROM pg_indexes WHERE schemaname = 'public';
    SELECT COUNT(*) INTO total_functions FROM information_schema.routines WHERE routine_schema = 'public';
    SELECT COUNT(*) INTO total_matviews FROM pg_matviews WHERE schemaname = 'public';
    SELECT COUNT(DISTINCT trigger_name) INTO total_triggers FROM information_schema.triggers WHERE trigger_schema = 'public';

    SELECT COUNT(*) INTO rls_enabled_count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
    SELECT COUNT(*) INTO rls_total_count FROM pg_tables WHERE schemaname = 'public';

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'DATABASE SUMMARY';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tables: %', total_tables;
    RAISE NOTICE '✅ Indexes: %', total_indexes;
    RAISE NOTICE '✅ Functions: %', total_functions;
    RAISE NOTICE '✅ Materialized Views: %', total_matviews;
    RAISE NOTICE '✅ Triggers: %', total_triggers;
    RAISE NOTICE '✅ RLS Enabled: % / % tables', rls_enabled_count, rls_total_count;
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDATIONS:';
    RAISE NOTICE '--------------------------------------------------------';

    -- Check if key tables have data
    IF (SELECT COUNT(*) FROM judges) = 0 THEN
        RAISE NOTICE '⚠️  Consider importing judge data';
    END IF;

    IF (SELECT COUNT(*) FROM courts) = 0 THEN
        RAISE NOTICE '⚠️  Consider importing court data';
    END IF;

    IF (SELECT COUNT(*) FROM cases) = 0 THEN
        RAISE NOTICE '⚠️  Consider importing case data';
    END IF;

    -- Check materialized view freshness
    IF (SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public') > 0 THEN
        RAISE NOTICE '✅ Remember to refresh materialized views regularly';
        RAISE NOTICE '   Run: SELECT * FROM refresh_all_analytics_views();';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE 'Review sections above for any ❌ FAIL or ⚠️  WARNING indicators';
    RAISE NOTICE '════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';

END $$;

-- ========================================
-- END OF VERIFICATION SCRIPT
-- ========================================
