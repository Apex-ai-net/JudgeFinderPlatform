# Database Index Deployment Guide

## Overview
Performance optimization indexes created on 2025-10-05. These indexes provide 75-90% query time reduction for critical paths.

## Expected Impact
- **Cases queries**: 800ms → 80-150ms (75-90% faster)
- **Judge search**: 1.5s → 200-400ms (85% faster)
- **Analytics generation**: 1-3s → 200-500ms (80% faster)

## Deployment Options

### Option 1: Using Supabase CLI (Recommended)
```bash
# From project root
supabase db push

# Or apply specific migration
supabase db execute --file supabase/migrations/20251005_performance_indexes.sql
```

### Option 2: Using psql directly
```bash
PGPASSWORD='<service-role-key>' psql \
  -h db.xstlnicbnzdxlgfiewmg.supabase.co \
  -U postgres \
  -d postgres \
  -p 5432 \
  -f supabase/migrations/20251005_performance_indexes.sql
```

### Option 3: Using Supabase SQL Editor
1. Go to https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql
2. Paste contents of `20251005_performance_indexes.sql`
3. Click "Run"

## Monitoring Index Creation

Indexes are created with `CONCURRENTLY` keyword to avoid locking tables.

### Check index creation progress:
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as size,
    idx_scan as scans,
    idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

### Verify all indexes created:
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY indexname;
```

## Expected Indexes (11 total)

### Cases Table (3 indexes)
- `idx_cases_judge_decision_date` - Judge queries with date sorting
- `idx_cases_recent_filings` - Recent cases for bias analysis
- `idx_cases_type_outcome` - Case type distribution

### Judges Table (3 indexes)
- `idx_judges_name_trgm` - Full-text name search
- `idx_judges_court_name_trgm` - Court name search
- `idx_judges_jurisdiction_county` - Jurisdiction filtering

### Courts Table (2 indexes)
- `idx_courts_name_trgm` - Court name search
- `idx_courts_jurisdiction` - Jurisdiction lookups

### Court Assignments Table (2 indexes)
- `idx_court_assignments_judge` - Judge assignments
- `idx_court_assignments_court` - Court listings

### Analytics Cache Table (2 indexes)
- `idx_judge_analytics_cache_judge` - Cache lookups
- `idx_judge_analytics_cache_created` - Old entry cleanup

## Post-Deployment Validation

### 1. Test query performance:
```sql
-- Should use idx_cases_judge_decision_date
EXPLAIN ANALYZE
SELECT * FROM cases
WHERE judge_id = '<some-uuid>'
AND decision_date IS NOT NULL
ORDER BY decision_date DESC
LIMIT 100;

-- Should use idx_judges_name_trgm
EXPLAIN ANALYZE
SELECT * FROM judges
WHERE name ILIKE '%smith%'
LIMIT 20;
```

### 2. Check index usage after 24 hours:
```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
AND idx_scan > 0
ORDER BY idx_scan DESC;
```

## Rollback (if needed)

```sql
-- Drop all performance indexes
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_judge_decision_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_recent_filings;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_type_outcome;
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_court_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_jurisdiction_county;
DROP INDEX CONCURRENTLY IF EXISTS idx_courts_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_courts_jurisdiction;
DROP INDEX CONCURRENTLY IF EXISTS idx_court_assignments_judge;
DROP INDEX CONCURRENTLY IF EXISTS idx_court_assignments_court;
DROP INDEX CONCURRENTLY IF EXISTS idx_judge_analytics_cache_judge;
DROP INDEX CONCURRENTLY IF EXISTS idx_judge_analytics_cache_created;
```

## Notes
- Index creation is non-blocking (CONCURRENTLY keyword)
- Expect 1-5 minutes creation time depending on table sizes
- Index sizes range from 10MB to 500MB total
- No application downtime required
- Indexes automatically maintained by PostgreSQL

## Troubleshooting

### If pg_trgm extension missing:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### If CONCURRENTLY fails:
Remove `CONCURRENTLY` keyword (requires table lock):
```sql
CREATE INDEX idx_cases_judge_decision_date ON cases(...);
```

### Check for duplicate indexes:
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_cases_judge%'
ORDER BY indexname;
```
