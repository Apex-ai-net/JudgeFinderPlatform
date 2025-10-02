-- ==============================================================================
-- JUDGEFINDER DATABASE MIGRATION APPLICATION SCRIPT
-- ==============================================================================
--
-- This script applies all pending migrations to the Supabase database.
-- Run this in the Supabase SQL Editor.
--
-- IMPORTANT: Review each section before executing.
-- Recommend running one section at a time and verifying results.
--
-- Database: xstlnicbnzdxlgfiewmg.supabase.co
-- Generated: 2025-10-01
--
-- ==============================================================================

-- ==============================================================================
-- SECTION 0: SETUP MIGRATION TRACKING
-- ==============================================================================
-- Run this first to enable migration tracking

-- Create migration tracking schema and table
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT,
    inserted_at TIMESTAMPTZ DEFAULT now()
);

-- Grant permissions
GRANT ALL ON SCHEMA supabase_migrations TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE supabase_migrations.schema_migrations TO postgres, service_role;
GRANT SELECT ON TABLE supabase_migrations.schema_migrations TO anon, authenticated;

-- Verify tracking table exists
SELECT 'Migration tracking enabled' AS status,
       COUNT(*) as current_migrations
FROM supabase_migrations.schema_migrations;

-- ==============================================================================
-- SECTION 1: CRITICAL COLUMN ADDITIONS (High Priority)
-- ==============================================================================
-- These fix broken functionality immediately

BEGIN;

-- Migration: 20250817_001_add_courtlistener_fields.sql
-- Adds CourtListener integration fields
ALTER TABLE judges ADD COLUMN IF NOT EXISTS courtlistener_id INTEGER;
ALTER TABLE judges ADD COLUMN IF NOT EXISTS courtlistener_url TEXT;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS courtlistener_id TEXT;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS courtlistener_url TEXT;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250817', '20250817_001_add_courtlistener_fields')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20250820_001_add_judge_slug_column.sql
-- Adds SEO-friendly slugs for judges
BEGIN;

ALTER TABLE judges ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for existing judges
UPDATE judges
SET slug = LOWER(
    REGEXP_REPLACE(
        TRIM(name || '-' || COALESCE(id::TEXT, '')),
        '[^a-zA-Z0-9]+', '-', 'g'
    )
)
WHERE slug IS NULL;

-- Add unique constraint
ALTER TABLE judges DROP CONSTRAINT IF EXISTS judges_slug_unique;
ALTER TABLE judges ADD CONSTRAINT judges_slug_unique UNIQUE (slug);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250820', '20250820_001_add_judge_slug_column')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20250821_001_add_court_slug_column.sql
-- Adds SEO-friendly slugs for courts
BEGIN;

ALTER TABLE courts ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for existing courts
UPDATE courts
SET slug = LOWER(
    REGEXP_REPLACE(
        TRIM(COALESCE(name, '') || '-' || COALESCE(id::TEXT, '')),
        '[^a-zA-Z0-9]+', '-', 'g'
    )
)
WHERE slug IS NULL;

-- Add unique constraint
ALTER TABLE courts DROP CONSTRAINT IF EXISTS courts_slug_unique;
ALTER TABLE courts ADD CONSTRAINT courts_slug_unique UNIQUE (slug);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250821', '20250821_001_add_court_slug_column')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20250822_003_add_jurisdiction_column.sql
-- Adds jurisdiction/county field for geographic filtering
BEGIN;

ALTER TABLE judges ADD COLUMN IF NOT EXISTS jurisdiction TEXT;

-- Note: Courts table does not have a 'county' column
-- Jurisdiction will be populated by sync scripts based on court data
-- Skipping UPDATE statement that referenced non-existent c.county column

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250822', '20250822_003_add_jurisdiction_column')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20250824_001_add_case_source_url.sql
-- Adds source URL tracking for cases
BEGIN;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS source_url TEXT;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250824', '20250824_001_add_case_source_url')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify critical columns exist
SELECT
    'judges' as table_name,
    COUNT(*) FILTER (WHERE slug IS NOT NULL) as slug_count,
    COUNT(*) FILTER (WHERE courtlistener_id IS NOT NULL) as cl_id_count,
    COUNT(*) FILTER (WHERE jurisdiction IS NOT NULL) as jurisdiction_count,
    COUNT(*) as total_rows
FROM judges
UNION ALL
SELECT
    'courts',
    COUNT(*) FILTER (WHERE slug IS NOT NULL),
    COUNT(*) FILTER (WHERE courtlistener_id IS NOT NULL),
    NULL,
    COUNT(*)
FROM courts
UNION ALL
SELECT
    'cases',
    NULL,
    NULL,
    NULL,
    COUNT(*)
FROM cases;

-- ==============================================================================
-- SECTION 2: PERFORMANCE INDEXES (High Priority)
-- ==============================================================================
-- These dramatically improve query performance

BEGIN;

-- Migration: 20250817_003_add_performance_indexes.sql
CREATE INDEX IF NOT EXISTS idx_judges_court_id ON judges(court_id);
CREATE INDEX IF NOT EXISTS idx_cases_judge_id ON cases(judge_id);
CREATE INDEX IF NOT EXISTS idx_cases_court_id ON cases(court_id);
CREATE INDEX IF NOT EXISTS idx_decisions_case_id ON decisions(case_id);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250817', '20250817_003_add_performance_indexes')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20250927_001_optimize_judge_case_indexes.sql
BEGIN;

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_cases_judge_date ON cases(judge_id, filed_date DESC);
CREATE INDEX IF NOT EXISTS idx_cases_court_date ON cases(court_id, filed_date DESC);
CREATE INDEX IF NOT EXISTS idx_judges_slug ON judges(slug);
CREATE INDEX IF NOT EXISTS idx_courts_slug ON courts(slug);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250927', '20250927_001_optimize_judge_case_indexes')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20250930_001_critical_performance_indexes.sql
BEGIN;

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_judges_name_trgm ON judges USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_courts_name_trgm ON courts USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cases_docket_number ON cases(docket_number);
CREATE INDEX IF NOT EXISTS idx_decisions_date ON decisions(date_filed DESC);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250930', '20250930_001_critical_performance_indexes')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify indexes exist
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('judges', 'courts', 'cases', 'decisions')
ORDER BY tablename, indexname;

-- ==============================================================================
-- SECTION 3: ADDITIONAL TABLES (Medium Priority)
-- ==============================================================================
-- These enable new features

-- Migration: 20250817_002_create_judge_court_positions.sql
BEGIN;

CREATE TABLE IF NOT EXISTS judge_court_positions (
    id BIGSERIAL PRIMARY KEY,
    judge_id BIGINT REFERENCES judges(id) ON DELETE CASCADE,
    court_id BIGINT REFERENCES courts(id) ON DELETE CASCADE,
    position_type TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(judge_id, court_id, start_date)
);

CREATE INDEX IF NOT EXISTS idx_jcp_judge_id ON judge_court_positions(judge_id);
CREATE INDEX IF NOT EXISTS idx_jcp_court_id ON judge_court_positions(court_id);
CREATE INDEX IF NOT EXISTS idx_jcp_active ON judge_court_positions(is_active) WHERE is_active = true;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250817', '20250817_002_create_judge_court_positions')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20251017_002_cases_docket_hash.sql
BEGIN;

ALTER TABLE cases ADD COLUMN IF NOT EXISTS docket_hash TEXT;

-- Create hash from docket number for deduplication
UPDATE cases
SET docket_hash = MD5(LOWER(TRIM(docket_number)))
WHERE docket_hash IS NULL AND docket_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cases_docket_hash ON cases(docket_hash);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251017', '20251017_002_cases_docket_hash')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20251019_001_add_max_retries_to_sync_queue.sql
BEGIN;

ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251019', '20251019_001_add_max_retries_to_sync_queue')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ==============================================================================
-- SECTION 4: DATABASE FUNCTIONS (Medium Priority)
-- ==============================================================================
-- These provide utility functions

-- Migration: 20250821_002_add_rpc_function.sql
BEGIN;

CREATE OR REPLACE FUNCTION get_judge_by_slug(slug_param TEXT)
RETURNS SETOF judges
LANGUAGE sql
STABLE
AS $$
    SELECT * FROM judges WHERE slug = slug_param LIMIT 1;
$$;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250821', '20250821_002_add_rpc_function')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Migration: 20250822_001_orphaned_judges_function.sql
BEGIN;

CREATE OR REPLACE FUNCTION get_orphaned_judges()
RETURNS TABLE(judge_id BIGINT, judge_name TEXT)
LANGUAGE sql
STABLE
AS $$
    SELECT id, name
    FROM judges
    WHERE court_id IS NULL OR court_id NOT IN (SELECT id FROM courts);
$$;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250822', '20250822_001_orphaned_judges_function')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ==============================================================================
-- SECTION 5: MATERIALIZED VIEWS (Medium Priority)
-- ==============================================================================
-- These provide pre-computed analytics

-- Migration: 20250930_002_decision_counts_materialized_view.sql
BEGIN;

-- Enable pg_trgm extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create materialized view for judge decision counts
CREATE MATERIALIZED VIEW IF NOT EXISTS judge_decision_counts AS
SELECT
    j.id as judge_id,
    j.name as judge_name,
    j.slug as judge_slug,
    COUNT(DISTINCT c.id) as total_cases,
    COUNT(DISTINCT d.id) as total_decisions,
    MAX(d.date_filed) as latest_decision_date,
    MIN(d.date_filed) as earliest_decision_date
FROM judges j
LEFT JOIN cases c ON c.judge_id = j.id
LEFT JOIN decisions d ON d.case_id = c.id
GROUP BY j.id, j.name, j.slug;

-- Add indexes to materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_jdc_judge_id ON judge_decision_counts(judge_id);
CREATE INDEX IF NOT EXISTS idx_jdc_total_decisions ON judge_decision_counts(total_decisions DESC);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250930', '20250930_002_decision_counts_materialized_view')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY judge_decision_counts;

-- ==============================================================================
-- SECTION 6: FULL TEXT SEARCH (Medium Priority)
-- ==============================================================================
-- Migration: 20250930_003_full_text_search.sql
BEGIN;

-- Add full text search columns
ALTER TABLE judges ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE courts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Update search vectors
UPDATE judges
SET search_vector = to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(jurisdiction, ''));

-- Note: Courts table does not have 'county' column, using name only
UPDATE courts
SET search_vector = to_tsvector('english', COALESCE(name, ''));

-- Create GIN indexes for fast search
CREATE INDEX IF NOT EXISTS idx_judges_search ON judges USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_courts_search ON courts USING gin(search_vector);

-- Create triggers to keep search vectors updated
CREATE OR REPLACE FUNCTION judges_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.jurisdiction, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER judges_search_update
BEFORE INSERT OR UPDATE ON judges
FOR EACH ROW EXECUTE FUNCTION judges_search_trigger();

CREATE OR REPLACE FUNCTION courts_search_trigger() RETURNS trigger AS $$
BEGIN
  -- Note: Courts table does not have 'county' column, using name only
  NEW.search_vector :=
    to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courts_search_update
BEFORE INSERT OR UPDATE ON courts
FOR EACH ROW EXECUTE FUNCTION courts_search_trigger();

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250930', '20250930_003_full_text_search')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ==============================================================================
-- SECTION 7: ROW LEVEL SECURITY (Low Priority)
-- ==============================================================================
-- These add security policies

-- Migration: 20250928_public_read_policies.sql
BEGIN;

-- Enable RLS on main tables
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read on judges" ON judges;
DROP POLICY IF EXISTS "Allow public read on courts" ON courts;
DROP POLICY IF EXISTS "Allow public read on cases" ON cases;
DROP POLICY IF EXISTS "Allow public read on decisions" ON decisions;
DROP POLICY IF EXISTS "Allow service role all on judges" ON judges;
DROP POLICY IF EXISTS "Allow service role all on courts" ON courts;
DROP POLICY IF EXISTS "Allow service role all on cases" ON cases;
DROP POLICY IF EXISTS "Allow service role all on decisions" ON decisions;

-- Allow public read access (platform is transparency tool)
CREATE POLICY "Allow public read on judges"
  ON judges FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read on courts"
  ON courts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read on cases"
  ON cases FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read on decisions"
  ON decisions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can do everything
CREATE POLICY "Allow service role all on judges"
  ON judges FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role all on courts"
  ON courts FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role all on cases"
  ON cases FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role all on decisions"
  ON decisions FOR ALL
  TO service_role
  USING (true);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250928', '20250928_public_read_policies')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ==============================================================================
-- SECTION 8: MARK REMAINING MIGRATIONS AS APPLIED
-- ==============================================================================
-- For migrations that don't need SQL execution but need tracking

BEGIN;

-- Base schema (already exists)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250112', '20250112_comprehensive_ca_judicial_schema')
ON CONFLICT (version) DO NOTHING;

-- Other migrations that were applied via other means
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20250125', '20250125_add_judge_court_level'),
  ('20250129', '20250129_create_push_tokens'),
  ('20250817', '20250817_004_rollback_migration'),
  ('20250822', '20250822_002_add_cases_unique_constraint'),
  ('20250823', '20250823_001_create_advertising_system'),
  ('20250824', '20250824_002_create_app_users_table'),
  ('20250918', '20250918_001_alter_cases_composite_unique'),
  ('20250919', '20250919_002_ad_spots_rls_and_seed'),
  ('20250924', '20250924_enable_rls_app_users'),
  ('20250927', '20250927_001_create_profile_issues'),
  ('20250930', '20250930_004_validation_functions'),
  ('20251017', '20251017_001_profile_issues_queue_extensions'),
  ('20251018', '20251018_001_disable_extra_judge_positions'),
  ('20251018', '20251018_002_pricing_tiers_refresh'),
  ('20251018', '20251018_003_calculate_ad_pricing_v2'),
  ('20251018', '20251018_004_search_sponsored_tiles'),
  ('20251018', '20251018_005_ad_impressions_helpers'),
  ('20251018', '20251018_006_ad_waitlist'),
  ('20251018', '20251018_service_role_access')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ==============================================================================
-- SECTION 9: VERIFICATION
-- ==============================================================================
-- Run these queries to verify everything worked

-- 1. Check all migrations are tracked
SELECT
    'Total migrations tracked:' as check_name,
    COUNT(*) as count,
    CASE
        WHEN COUNT(*) >= 36 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM supabase_migrations.schema_migrations;

-- 2. Check critical columns exist
SELECT
    'Critical columns exist:' as check_name,
    COUNT(*) as columns_found,
    CASE
        WHEN COUNT(*) >= 7 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'judges' AND column_name IN ('slug', 'courtlistener_id', 'jurisdiction'))
    OR (table_name = 'courts' AND column_name = 'slug')
    OR (table_name = 'cases' AND column_name IN ('source_url', 'docket_hash'))
    OR (table_name = 'sync_queue' AND column_name = 'max_retries')
  );

-- 3. Check indexes exist
SELECT
    'Performance indexes:' as check_name,
    COUNT(*) as indexes_found,
    CASE
        WHEN COUNT(*) >= 10 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- 4. Check materialized views
SELECT
    'Materialized views:' as check_name,
    COUNT(*) as views_found,
    CASE
        WHEN COUNT(*) >= 1 THEN '✓ PASS'
        ELSE '✗ FAIL'
    END as status
FROM pg_matviews
WHERE schemaname = 'public';

-- 5. List all tracked migrations
SELECT
    version,
    name,
    inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;

-- ==============================================================================
-- COMPLETION SUMMARY
-- ==============================================================================

SELECT
    'MIGRATION APPLICATION COMPLETE' as status,
    COUNT(*) as total_migrations_tracked,
    MIN(inserted_at) as first_migration,
    MAX(inserted_at) as last_migration
FROM supabase_migrations.schema_migrations;

-- Next steps:
-- 1. Test application functionality
-- 2. Verify SEO-friendly URLs work
-- 3. Check query performance improvements
-- 4. Refresh materialized views regularly:
--    REFRESH MATERIALIZED VIEW CONCURRENTLY judge_decision_counts;
