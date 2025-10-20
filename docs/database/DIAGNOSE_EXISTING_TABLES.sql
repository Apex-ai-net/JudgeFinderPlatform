-- ========================================
-- DIAGNOSTIC: Check Existing Tables
-- ========================================
-- Run this in Supabase SQL Editor to see what already exists

-- List all tables in public schema
SELECT
    table_name,
    CASE
        WHEN table_name IN ('courts', 'judges', 'cases', 'users', 'attorneys',
                           'attorney_slots', 'bookmarks', 'search_history',
                           'judge_analytics', 'subscriptions')
        THEN '✅ Base Schema Table'
        WHEN table_name LIKE 'advertiser%' OR table_name LIKE 'ad_%'
        THEN '📢 Advertising System'
        WHEN table_name LIKE 'judge_%'
        THEN '⚖️ Judge Related'
        WHEN table_name LIKE 'app_%'
        THEN '📱 Application Tables'
        ELSE '📊 Other'
    END as category
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY category, table_name;

-- Check if critical base tables exist
SELECT
    'courts' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courts')
         THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'judges', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'judges') THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'cases', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cases') THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'users', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'attorneys', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attorneys') THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'advertiser_profiles', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'advertiser_profiles') THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'judge_ad_products', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'judge_ad_products') THEN '✅ EXISTS' ELSE '❌ MISSING' END
UNION ALL
SELECT 'ad_spot_bookings', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ad_spot_bookings') THEN '✅ EXISTS' ELSE '❌ MISSING' END;

-- Count records in existing tables (if they exist)
DO $$
DECLARE
    table_rec RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table Row Counts';
    RAISE NOTICE '========================================';

    FOR table_rec IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_rec.table_name) INTO row_count;
        RAISE NOTICE '% : % rows', RPAD(table_rec.table_name, 30), row_count;
    END LOOP;
END $$;
