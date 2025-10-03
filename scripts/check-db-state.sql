-- Database State Analysis Query
-- Run this to understand current migration state

-- 1. Check if schema_migrations table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations'
) AS schema_migrations_exists;

-- 2. List all applied migrations (if table exists)
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- 3. List all public tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. Count rows in key tables
SELECT
  'judges' as table_name,
  COUNT(*) as row_count
FROM judges
UNION ALL
SELECT 'courts', COUNT(*) FROM courts
UNION ALL
SELECT 'cases', COUNT(*) FROM cases
UNION ALL
SELECT 'decisions', COUNT(*) FROM decisions
UNION ALL
SELECT 'judge_court_positions', COUNT(*) FROM judge_court_positions;

-- 5. Check for specific columns that indicate migrations were applied
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'judges'
  AND column_name IN ('slug', 'courtlistener_id', 'jurisdiction')
ORDER BY column_name;

-- 6. Check for indexes
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('judges', 'courts', 'cases', 'decisions')
ORDER BY tablename, indexname;

-- 7. Check for materialized views
SELECT
  schemaname,
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- 8. Check for functions
SELECT
  routine_schema,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
