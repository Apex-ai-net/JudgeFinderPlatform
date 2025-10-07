# Deploy Performance Indexes to JudgeFinder Supabase Database

## Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg
   - Navigate to: **SQL Editor** (left sidebar)

2. **Create New Query:**
   - Click "New Query" button
   - Paste the contents of: `supabase/migrations/20250102_performance_indexes.sql`

3. **Execute the Migration:**
   - Click "Run" button
   - Wait for completion (may take 2-5 minutes for CONCURRENT index creation)
   - Check for success messages

4. **Verify Indexes Created:**
   - Run this query to check indexes:
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE schemaname = 'public'
   ORDER BY tablename, indexname;
   ```

---

## Option 2: Using Supabase CLI with Database Password

If you have your database password, you can deploy via CLI:

```bash
# Get your database password from Supabase Dashboard:
# Project Settings > Database > Connection String > Password (reveal)

# Then run:
supabase db push --db-url "postgresql://postgres:YOUR-PASSWORD@db.xstlnicbnzdxlgfiewmg.supabase.co:5432/postgres"
```

---

## Option 3: Using psql Directly

If you have your database password:

```bash
PGPASSWORD='your-password' psql \
  -h db.xstlnicbnzdxlgfiewmg.supabase.co \
  -U postgres \
  -d postgres \
  -p 5432 \
  -f supabase/migrations/20250102_performance_indexes.sql
```

---

## Expected Results

After successful execution, you should see:

```
CREATE EXTENSION
CREATE INDEX
CREATE INDEX
CREATE INDEX
... (15+ CREATE INDEX statements)
ANALYZE
ANALYZE
ANALYZE
```

**Important Notes:**
- Index creation uses `CONCURRENTLY` - **no downtime required**
- Safe to run on production without locking tables
- May take 2-5 minutes depending on data volume
- Can be run multiple times safely (uses IF NOT EXISTS)

---

## Verify Performance Improvements

After deployment, test query performance:

### Before (Expected):
- Judge search: 2-5 seconds
- Advanced search: 3-8 seconds
- Bias analysis: 3-8 seconds

### After (Expected):
- Judge search: <500ms (70-85% faster)
- Advanced search: <800ms (75-90% faster)
- Bias analysis: <2s (60-75% faster)

### Test Queries:

```sql
-- Test judge name search performance
EXPLAIN ANALYZE
SELECT * FROM judges
WHERE name ILIKE '%smith%'
LIMIT 20;

-- Test case lookups by judge
EXPLAIN ANALYZE
SELECT * FROM cases
WHERE judge_id = 'some-judge-uuid'
AND decision_date IS NOT NULL
ORDER BY decision_date DESC
LIMIT 50;
```

---

## Monitoring Index Usage

After a few days, check which indexes are being used:

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

Indexes with high `idx_scan` counts are being used effectively.

---

## Rollback (If Needed)

If you need to remove these indexes:

```sql
-- Drop all performance indexes (rarely needed)
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_court_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_court_appointed;
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_appointed_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_judges_slug;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_judge_decision;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_judge_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_judge_outcome;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_filing_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_cases_analytics;
DROP INDEX CONCURRENTLY IF EXISTS idx_courts_name_trgm;
DROP INDEX CONCURRENTLY IF EXISTS idx_courts_slug;
DROP INDEX CONCURRENTLY IF EXISTS idx_courts_level;
DROP INDEX CONCURRENTLY IF EXISTS idx_courts_jurisdiction;
```

---

## Project Information

- **Project Name:** JudgeFinder
- **Project ID:** xstlnicbnzdxlgfiewmg
- **Region:** us-west-1
- **Database Host:** db.xstlnicbnzdxlgfiewmg.supabase.co
- **Status:** ACTIVE_HEALTHY
- **PostgreSQL Version:** 17

---

## Support

If you encounter issues:

1. Check Supabase Dashboard > Database > Logs
2. Verify table names match your schema
3. Ensure pg_trgm extension is available (it is on Supabase)
4. Contact Supabase support if indexes fail to create

**Migration File Location:** `supabase/migrations/20250102_performance_indexes.sql`
