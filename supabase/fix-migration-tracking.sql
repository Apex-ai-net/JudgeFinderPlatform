-- Migration Tracking Fix Script
-- Generated: 2025-10-01T17:41:24.868Z
-- Database: https://xstlnicbnzdxlgfiewmg.supabase.co
-- Project: xstlnicbnzdxlgfiewmg
--
-- This script marks migrations as applied in the tracking table.
-- Review each migration to ensure it has actually been applied to your database.

BEGIN;

-- 20250112_comprehensive_ca_judicial_schema.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250112', '20250112_comprehensive_ca_judicial_schema')
ON CONFLICT (version) DO NOTHING;

-- 20250125_add_judge_court_level.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250125', '20250125_add_judge_court_level')
ON CONFLICT (version) DO NOTHING;

-- 20250129_create_push_tokens.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250129', '20250129_create_push_tokens')
ON CONFLICT (version) DO NOTHING;

-- 20250817_001_add_courtlistener_fields.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250817', '20250817_001_add_courtlistener_fields')
ON CONFLICT (version) DO NOTHING;

-- 20250817_002_create_judge_court_positions.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250817', '20250817_002_create_judge_court_positions')
ON CONFLICT (version) DO NOTHING;

-- 20250817_003_add_performance_indexes.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250817', '20250817_003_add_performance_indexes')
ON CONFLICT (version) DO NOTHING;

-- 20250817_004_rollback_migration.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250817', '20250817_004_rollback_migration')
ON CONFLICT (version) DO NOTHING;

-- 20250820_001_add_judge_slug_column.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250820', '20250820_001_add_judge_slug_column')
ON CONFLICT (version) DO NOTHING;

-- 20250821_001_add_court_slug_column.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250821', '20250821_001_add_court_slug_column')
ON CONFLICT (version) DO NOTHING;

-- 20250821_002_add_rpc_function.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250821', '20250821_002_add_rpc_function')
ON CONFLICT (version) DO NOTHING;

-- 20250822_001_orphaned_judges_function.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250822', '20250822_001_orphaned_judges_function')
ON CONFLICT (version) DO NOTHING;

-- 20250822_002_add_cases_unique_constraint.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250822', '20250822_002_add_cases_unique_constraint')
ON CONFLICT (version) DO NOTHING;

-- 20250822_003_add_jurisdiction_column.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250822', '20250822_003_add_jurisdiction_column')
ON CONFLICT (version) DO NOTHING;

-- 20250823_001_create_advertising_system.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250823', '20250823_001_create_advertising_system')
ON CONFLICT (version) DO NOTHING;

-- 20250824_001_add_case_source_url.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250824', '20250824_001_add_case_source_url')
ON CONFLICT (version) DO NOTHING;

-- 20250824_002_create_app_users_table.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250824', '20250824_002_create_app_users_table')
ON CONFLICT (version) DO NOTHING;

-- 20250918_001_alter_cases_composite_unique.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250918', '20250918_001_alter_cases_composite_unique')
ON CONFLICT (version) DO NOTHING;

-- 20250919_002_ad_spots_rls_and_seed.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250919', '20250919_002_ad_spots_rls_and_seed')
ON CONFLICT (version) DO NOTHING;

-- 20250924_enable_rls_app_users.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250924', '20250924_enable_rls_app_users')
ON CONFLICT (version) DO NOTHING;

-- 20250927_001_create_profile_issues.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250927', '20250927_001_create_profile_issues')
ON CONFLICT (version) DO NOTHING;

-- 20250927_001_optimize_judge_case_indexes.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250927', '20250927_001_optimize_judge_case_indexes')
ON CONFLICT (version) DO NOTHING;

-- 20250928_public_read_policies.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250928', '20250928_public_read_policies')
ON CONFLICT (version) DO NOTHING;

-- 20250930_001_critical_performance_indexes.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250930', '20250930_001_critical_performance_indexes')
ON CONFLICT (version) DO NOTHING;

-- 20250930_002_decision_counts_materialized_view.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250930', '20250930_002_decision_counts_materialized_view')
ON CONFLICT (version) DO NOTHING;

-- 20250930_003_full_text_search.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250930', '20250930_003_full_text_search')
ON CONFLICT (version) DO NOTHING;

-- 20250930_004_validation_functions.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250930', '20250930_004_validation_functions')
ON CONFLICT (version) DO NOTHING;

-- 20251017_001_profile_issues_queue_extensions.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251017', '20251017_001_profile_issues_queue_extensions')
ON CONFLICT (version) DO NOTHING;

-- 20251017_002_cases_docket_hash.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251017', '20251017_002_cases_docket_hash')
ON CONFLICT (version) DO NOTHING;

-- 20251018_001_disable_extra_judge_positions.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251018', '20251018_001_disable_extra_judge_positions')
ON CONFLICT (version) DO NOTHING;

-- 20251018_002_pricing_tiers_refresh.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251018', '20251018_002_pricing_tiers_refresh')
ON CONFLICT (version) DO NOTHING;

-- 20251018_003_calculate_ad_pricing_v2.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251018', '20251018_003_calculate_ad_pricing_v2')
ON CONFLICT (version) DO NOTHING;

-- 20251018_004_search_sponsored_tiles.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251018', '20251018_004_search_sponsored_tiles')
ON CONFLICT (version) DO NOTHING;

-- 20251018_005_ad_impressions_helpers.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251018', '20251018_005_ad_impressions_helpers')
ON CONFLICT (version) DO NOTHING;

-- 20251018_006_ad_waitlist.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251018', '20251018_006_ad_waitlist')
ON CONFLICT (version) DO NOTHING;

-- 20251018_service_role_access.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251018', '20251018_service_role_access')
ON CONFLICT (version) DO NOTHING;

-- 20251019_001_add_max_retries_to_sync_queue.sql
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251019', '20251019_001_add_max_retries_to_sync_queue')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Verify with:
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
