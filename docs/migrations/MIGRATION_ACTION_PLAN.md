# JudgeFinder Database Migration - Action Plan

**Status:** Ready to Execute
**Database:** xstlnicbnzdxlgfiewmg.supabase.co
**Estimated Time:** 2-3 hours
**Risk Level:** Low (data is safe, only adding schema elements)

## Quick Summary

Your database has **36 local migration files** but **none are tracked** in the database. Many critical schema elements are missing, causing performance issues and broken features.

**Good News:** Your production data (1,903 judges, 442,691 cases) is intact.

**Fix Required:** Apply missing migrations to add columns, indexes, and functions.

## What's Broken Right Now

1. **SEO URLs:** Judge and court slugs missing (/judges/john-doe-123 won't work)
2. **Performance:** Missing indexes causing slow queries (10-100x slower)
3. **Search:** CourtListener integration broken (missing courtlistener_id)
4. **Filtering:** Geographic filtering broken (missing jurisdiction column)
5. **Analytics:** Materialized views missing (pre-computed stats don't exist)

## Files Created for You

### 1. Comprehensive Report
**Location:** `/Users/tannerosterkamp/JudgeFinderPlatform-1/MIGRATION_FIX_REPORT.md`

Full analysis with detailed explanations, root cause, and risk assessment.

### 2. Step-by-Step SQL Script
**Location:** `/Users/tannerosterkamp/JudgeFinderPlatform-1/supabase/apply-migrations-stepbystep.sql`

Complete SQL script with all migrations organized by priority. Run this in Supabase SQL Editor.

### 3. Migration Tracking Fix
**Location:** `/Users/tannerosterkamp/JudgeFinderPlatform-1/supabase/fix-migration-tracking.sql`

SQL to mark all migrations as applied in tracking table.

### 4. Analysis Scripts
**Location:** `/Users/tannerosterkamp/JudgeFinderPlatform-1/scripts/`

- `analyze-db-direct.js` - Automated schema analysis
- `check-db-state.sql` - Manual verification queries

## Execution Steps

### Step 1: Enable Migration Tracking (15 minutes)

**Action:** Run this in Supabase SQL Editor:

```sql
-- Create migration tracking
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT,
    inserted_at TIMESTAMPTZ DEFAULT now()
);

-- Grant permissions
GRANT ALL ON SCHEMA supabase_migrations TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE supabase_migrations.schema_migrations TO postgres, service_role;
```

**Verify:** Run this query:
```sql
SELECT * FROM supabase_migrations.schema_migrations;
```
Should return empty table (no error).

### Step 2: Apply Critical Migrations (30 minutes)

**Action:** Copy sections 1-2 from `apply-migrations-stepbystep.sql` into Supabase SQL Editor.

These add:
- CourtListener IDs (fixes integration)
- SEO slugs for judges and courts (fixes URLs)
- Jurisdiction column (fixes filtering)
- Source URLs for cases
- Performance indexes (fixes slow queries)

**Verify:** After running, execute:
```sql
-- Check columns exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'judges'
  AND column_name IN ('slug', 'courtlistener_id', 'jurisdiction');
```
Should return 3 rows.

### Step 3: Apply Performance Migrations (30 minutes)

**Action:** Copy section 2 from `apply-migrations-stepbystep.sql`.

These add critical indexes that speed up queries by 10-100x.

**Verify:** Run this query:
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'judges'
ORDER BY indexname;
```
Should see multiple indexes including `idx_judges_slug`.

### Step 4: Apply Feature Migrations (45 minutes)

**Action:** Copy sections 3-6 from `apply-migrations-stepbystep.sql`.

These add:
- Judge-court position tracking
- Database utility functions
- Materialized views for analytics
- Full-text search
- Row-level security policies

**Verify:** Run this query:
```sql
-- Check materialized views
SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';
```
Should return `judge_decision_counts`.

### Step 5: Mark Remaining Migrations (15 minutes)

**Action:** Copy section 8 from `apply-migrations-stepbystep.sql`.

This marks migrations that don't need SQL execution as applied.

**Verify:** Run this query:
```sql
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;
```
Should return 36.

### Step 6: Full Verification (30 minutes)

**Action:** Copy section 9 from `apply-migrations-stepbystep.sql` and run all verification queries.

**Expected Results:**
- Total migrations tracked: 36 ✓ PASS
- Critical columns exist: 7+ ✓ PASS
- Performance indexes: 10+ ✓ PASS
- Materialized views: 1+ ✓ PASS

### Step 7: Test Application (30 minutes)

**Action:** Test these features in your application:

1. **Judge by slug:**
   ```
   https://judgefinder.io/judges/john-doe-12345
   ```

2. **Court by slug:**
   ```
   https://judgefinder.io/courts/orange-county-superior
   ```

3. **Advanced search with filters:**
   - Search judges by jurisdiction
   - Filter by court type
   - Geographic filtering

4. **Performance:**
   - Judge profile pages should load <1 second
   - Search results should be instant
   - Case listings should paginate quickly

## Alternative: One-Click Execution

If you want to apply everything at once:

```bash
# Option A: Via Supabase CLI (if installed)
cd /Users/tannerosterkamp/JudgeFinderPlatform-1
cat supabase/apply-migrations-stepbystep.sql | supabase db execute

# Option B: Via psql (if you have database password)
psql -h db.xstlnicbnzdxlgfiewmg.supabase.co -U postgres -d postgres -f supabase/apply-migrations-stepbystep.sql
```

**Note:** This runs all migrations at once. Recommended only if you've tested in staging first.

## Rollback Plan

If something goes wrong:

### Rollback Critical Columns
```sql
BEGIN;
ALTER TABLE judges DROP COLUMN IF EXISTS slug;
ALTER TABLE judges DROP COLUMN IF EXISTS courtlistener_id;
ALTER TABLE judges DROP COLUMN IF EXISTS jurisdiction;
ALTER TABLE courts DROP COLUMN IF EXISTS slug;
ALTER TABLE cases DROP COLUMN IF EXISTS source_url;
ALTER TABLE cases DROP COLUMN IF EXISTS docket_hash;
COMMIT;
```

### Rollback Indexes
```sql
DROP INDEX IF EXISTS idx_judges_slug;
DROP INDEX IF EXISTS idx_courts_slug;
DROP INDEX IF EXISTS idx_cases_judge_date;
-- etc.
```

### Rollback Everything
```sql
-- Reset migration tracking
TRUNCATE supabase_migrations.schema_migrations;
```

**Note:** Rollback is rarely needed. These migrations only ADD schema elements, they don't modify existing data.

## Success Criteria

After completion, you should have:

1. ✓ 36 migrations tracked in `schema_migrations`
2. ✓ SEO-friendly URLs working for judges and courts
3. ✓ Page load times <1 second (vs 5-10 seconds before)
4. ✓ Geographic filtering working
5. ✓ Full-text search operational
6. ✓ No application errors related to missing columns

## Monitoring After Completion

### Daily Health Check
```sql
-- Check migration status
SELECT COUNT(*) as total_migrations
FROM supabase_migrations.schema_migrations;
-- Should be 36

-- Check data integrity
SELECT
    (SELECT COUNT(*) FROM judges) as judges,
    (SELECT COUNT(*) FROM courts) as courts,
    (SELECT COUNT(*) FROM cases) as cases,
    (SELECT COUNT(*) FROM decisions) as decisions;
```

### Weekly Maintenance
```sql
-- Refresh materialized views for updated analytics
REFRESH MATERIALIZED VIEW CONCURRENTLY judge_decision_counts;

-- Update table statistics for query planner
ANALYZE judges;
ANALYZE courts;
ANALYZE cases;
ANALYZE decisions;
```

## Common Issues & Solutions

### Issue: "relation already exists"
**Solution:** The migration is already partially applied. Skip to next section.

### Issue: "column already exists"
**Solution:** Add `IF NOT EXISTS` to the ALTER TABLE statement (already in script).

### Issue: "permission denied"
**Solution:** You may be using anon key instead of service_role key. Use Supabase dashboard SQL Editor.

### Issue: Migration tracking can't be queried
**Solution:** Run Step 1 first to create the tracking table.

### Issue: Slow execution
**Solution:** Some index creations may take 5-10 minutes on large tables. This is normal.

## Support Commands

```bash
# Re-run analysis to check current state
node /Users/tannerosterkamp/JudgeFinderPlatform-1/scripts/analyze-db-direct.js

# Check what migrations are pending
cd /Users/tannerosterkamp/JudgeFinderPlatform-1
ls -1 supabase/migrations/*.sql | wc -l
# Should be 36

# View specific migration content
cat supabase/migrations/20250820_001_add_judge_slug_column.sql
```

## Timeline

**Minimum Time (All at once):** 1 hour
- 15 min: Setup tracking
- 30 min: Run entire script
- 15 min: Verification

**Recommended Time (Incremental):** 2-3 hours
- 15 min: Setup tracking
- 30 min: Critical migrations + test
- 30 min: Performance migrations + test
- 45 min: Feature migrations + test
- 15 min: Mark remaining
- 30 min: Full verification + app testing

**Conservative Time (Extra careful):** 4-5 hours
- Test each section individually
- Verify after each step
- Check application functionality between sections

## Next Steps After Completion

1. **Update documentation** - Document that migrations are now tracked
2. **Set up CI/CD checks** - Add schema validation to deployment pipeline
3. **Schedule maintenance** - Set up weekly materialized view refresh
4. **Monitor performance** - Track query times to measure improvement
5. **Update team** - Inform team that schema is now up to date

## Questions?

If you encounter any issues:

1. Check the detailed report: `MIGRATION_FIX_REPORT.md`
2. Re-run analysis: `node scripts/analyze-db-direct.js`
3. Review individual migration files in `supabase/migrations/`
4. Check Supabase dashboard logs for error details

## Final Checklist

Before you start:
- [ ] Database backup exists (Supabase does automatic backups)
- [ ] You have access to Supabase SQL Editor
- [ ] You're using service_role credentials (not anon key)
- [ ] You've reviewed the step-by-step script

After completion:
- [ ] All 36 migrations tracked
- [ ] Critical columns exist
- [ ] Performance indexes created
- [ ] Materialized views working
- [ ] Application tested and working
- [ ] No console errors
- [ ] Page load times improved

---

**Ready to execute?** Start with Step 1 in Supabase SQL Editor.

**Need help?** Review the detailed report in `MIGRATION_FIX_REPORT.md`.

**Want automation?** Use the `apply-migrations-stepbystep.sql` script.
