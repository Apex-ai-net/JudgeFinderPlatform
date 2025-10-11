# Quick Deploy: Analytics Composite Indexes

## One-Command Deployment

```bash
supabase db push
```

## What This Does

Adds 3 composite indexes to optimize analytics queries:

1. **idx_cases_judge_outcome_date** - Bias outcome aggregation
2. **idx_cases_judge_type_outcome** - Case type patterns
3. **idx_cases_bias_analysis** - Recent 2-year bias analysis (partial index)

## Performance Impact

- 300-500ms → 50-100ms (75-90% faster)
- Judges with 5000+ cases benefit most
- Storage: +37-47MB (~$0.006/month)

## Verification (Run After Deployment)

```sql
-- Check indexes created
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE tablename = 'cases'
  AND indexname IN (
    'idx_cases_judge_outcome_date',
    'idx_cases_judge_type_outcome',
    'idx_cases_bias_analysis'
  );
```

Expected: 3 rows (18-22MB, 16-20MB, 3-5MB)

## Rollback (If Needed)

```sql
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_judge_outcome_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_judge_type_outcome;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_bias_analysis;
ANALYZE cases;
```

## Documentation

- Full Details: `ANALYTICS_INDEXES_SUMMARY.md`
- Deployment Guide: `supabase/migrations/ANALYTICS_INDEX_GUIDE.md`
- Migration SQL: `supabase/migrations/20251010_002_analytics_composite_indexes.sql`
