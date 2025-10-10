# Analytics Fixes Deployment Checklist

**Version:** 1.0.0
**Date:** 2025-10-09
**Migration IDs:** `20251008_002_onboarding_analytics_FIXED`, `20251009_006_create_judge_analytics_cache`
**Estimated Total Time:** 15-30 minutes
**Rollback Time:** 5 minutes

---

## Table of Contents

1. [Pre-Deployment Verification](#1-pre-deployment-verification)
2. [Migration Deployment Order](#2-migration-deployment-order)
3. [Step-by-Step Deployment](#3-step-by-step-deployment)
4. [Environment Variable Checks](#4-environment-variable-checks)
5. [API Endpoint Testing](#5-api-endpoint-testing)
6. [Post-Deployment Monitoring](#6-post-deployment-monitoring)
7. [Rollback Procedures](#7-rollback-procedures)
8. [Known Issues & Watchpoints](#8-known-issues--watchpoints)
9. [Support & Contacts](#9-support--contacts)

---

## 1. Pre-Deployment Verification

### 1.1 Environment Check

**Checklist:**

- [ ] Verify Supabase CLI is installed and up-to-date

  ```bash
  npx supabase --version
  # Expected: 2.48.3 or higher
  ```

- [ ] Confirm you have access to Supabase project

  ```bash
  npx supabase login
  npx supabase link --project-ref YOUR_PROJECT_REF
  ```

- [ ] Verify database connection

  ```bash
  npx supabase db remote status
  # Expected: "Database is up and running"
  ```

- [ ] Check current migration status
  ```bash
  npx supabase migration list
  # Review which migrations have already been applied
  ```

### 1.2 Backup Database

**Checklist:**

- [ ] Create database backup before deployment

  ```bash
  # Via Supabase Dashboard:
  # 1. Go to https://app.supabase.com/project/YOUR_PROJECT/database/backups
  # 2. Click "Backup now"
  # 3. Wait for confirmation
  # 4. Note backup ID: _____________
  ```

- [ ] Verify backup completion
  ```bash
  # Check backup status in Supabase Dashboard
  # Status should be "Completed"
  ```

### 1.3 Review Migration Files

**Checklist:**

- [ ] Review migration file 1: `20251008_002_onboarding_analytics_FIXED.sql`

  ```bash
  cat supabase/migrations/20251008_002_onboarding_analytics_FIXED.sql
  # Verify contents match expected changes
  ```

- [ ] Review migration file 2: `20251009_006_create_judge_analytics_cache.sql`

  ```bash
  cat supabase/migrations/20251009_006_create_judge_analytics_cache.sql
  # Verify contents match expected changes
  ```

- [ ] Check for conflicting migrations
  ```bash
  ls -la supabase/migrations/ | grep "20251008_002"
  # Should only see _FIXED version, not the non-FIXED version
  ```

### 1.4 Pre-Deployment Health Check

**Checklist:**

- [ ] Verify `app_users` table exists and has `clerk_user_id` column

  ```sql
  -- Run in Supabase SQL Editor
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'app_users'
  AND column_name = 'clerk_user_id';

  -- Expected: 1 row showing TEXT data type
  ```

- [ ] Verify `judges` table exists

  ```sql
  -- Run in Supabase SQL Editor
  SELECT COUNT(*) as judge_count FROM judges;

  -- Expected: Count of judges (should be > 0)
  -- Record count: _____________
  ```

- [ ] Check for existing `judge_analytics_cache` table

  ```sql
  -- Run in Supabase SQL Editor
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'judge_analytics_cache'
  );

  -- Expected: false (table should not exist yet)
  -- If true, migration has already been applied
  ```

- [ ] Check for existing `onboarding_analytics` table

  ```sql
  -- Run in Supabase SQL Editor
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'onboarding_analytics'
  );

  -- Expected: false OR true (if old version exists, will be fixed)
  ```

---

## 2. Migration Deployment Order

**CRITICAL: Apply migrations in this exact order**

### Order of Execution

1. **FIRST:** `20251008_002_onboarding_analytics_FIXED.sql`
   - **Purpose:** Creates/fixes onboarding analytics tracking system
   - **Dependencies:** Requires `app_users` table with `clerk_user_id` column
   - **Estimated Time:** 10-15 seconds
   - **Risk Level:** Low (creates new table, no data modifications)

2. **SECOND:** `20251009_006_create_judge_analytics_cache.sql`
   - **Purpose:** Creates judge analytics cache table for performance optimization
   - **Dependencies:** Requires `judges` table to exist
   - **Estimated Time:** 15-20 seconds
   - **Risk Level:** Low (creates new table, no data modifications)

### Why This Order?

- Both migrations are independent and create new tables
- No dependencies between them
- Can be run in parallel if needed, but sequential is safer
- Neither modifies existing data, minimizing risk

---

## 3. Step-by-Step Deployment

### 3.1 Method A: Supabase CLI (Recommended)

**Benefits:**

- Automatic migration tracking
- Built-in rollback support
- Version control integration

**Steps:**

#### Step 1: Apply First Migration

```bash
# Navigate to project root
cd c:\Users\Tanner\JudgeFinder.io\JudgeFinderPlatform

# Apply the onboarding analytics migration
npx supabase migration up --limit 1

# Watch for output
```

**Expected Output:**

```
Applying migration 20251008_002_onboarding_analytics_FIXED.sql...
✓ Migration 20251008_002_onboarding_analytics_FIXED.sql applied successfully
```

**Verification:**

- [ ] Migration applied without errors
- [ ] Output shows success message
- [ ] No SQL errors in console

#### Step 2: Verify First Migration

```bash
# Check that the onboarding_analytics table was created
npx supabase db remote exec "SELECT COUNT(*) FROM onboarding_analytics;"
```

**Expected Output:**

```
count
-----
    0
(1 row)
```

**Verification:**

- [ ] Command runs without error
- [ ] Returns count of 0 (new empty table)
- [ ] Table has correct structure

**Detailed Table Verification:**

```sql
-- Run in Supabase SQL Editor
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'onboarding_analytics'
ORDER BY ordinal_position;

-- Expected columns:
-- id (uuid), user_id (text), onboarding_started_at (timestamptz),
-- onboarding_completed_at (timestamptz), onboarding_step_completed (integer),
-- ... and many more (see migration file for complete list)
```

#### Step 3: Apply Second Migration

```bash
# Apply the judge analytics cache migration
npx supabase migration up --limit 1
```

**Expected Output:**

```
Applying migration 20251009_006_create_judge_analytics_cache.sql...
✓ Migration 20251009_006_create_judge_analytics_cache.sql applied successfully
```

**Verification:**

- [ ] Migration applied without errors
- [ ] Output shows success message
- [ ] No SQL errors in console

#### Step 4: Verify Second Migration

```bash
# Check that the judge_analytics_cache table was created
npx supabase db remote exec "SELECT COUNT(*) FROM judge_analytics_cache;"
```

**Expected Output:**

```
count
-----
    0
(1 row)
```

**Verification:**

- [ ] Command runs without error
- [ ] Returns count of 0 (new empty table)
- [ ] Table has correct structure

**Detailed Table Verification:**

```sql
-- Run in Supabase SQL Editor
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'judge_analytics_cache'
ORDER BY ordinal_position;

-- Expected columns:
-- judge_id (uuid, primary key)
-- analytics (jsonb, not null)
-- created_at (timestamptz, not null)
-- updated_at (timestamptz, not null)
-- analytics_version (integer, not null)
```

#### Step 5: Check Migration Status

```bash
# List all applied migrations
npx supabase migration list

# Should show both new migrations as applied
```

**Expected Output:**

```
20251008_002_onboarding_analytics_FIXED | Applied
20251009_006_create_judge_analytics_cache | Applied
```

**Verification:**

- [ ] Both migrations show as "Applied"
- [ ] No pending migrations for these two files
- [ ] Migration history is correct

---

### 3.2 Method B: SQL Editor (Alternative)

**Use this method if:**

- Supabase CLI is unavailable
- Direct database access is preferred
- Custom execution control needed

**Steps:**

#### Step 1: Open Supabase SQL Editor

1. Navigate to: https://app.supabase.com/project/YOUR_PROJECT/sql
2. Click "New query"

#### Step 2: Execute First Migration

1. Copy entire contents of `supabase/migrations/20251008_002_onboarding_analytics_FIXED.sql`
2. Paste into SQL Editor
3. Click "Run" or press `Ctrl+Enter`

**Expected Output:**

```
Success. No rows returned
```

**Verification:**

- [ ] Query executes without errors
- [ ] Success message appears
- [ ] No red error messages

**Verify Table Creation:**

```sql
-- Run this query in a new SQL Editor tab
SELECT
  table_name,
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_name = 'onboarding_analytics') as column_count
FROM information_schema.tables
WHERE table_name = 'onboarding_analytics';

-- Expected: 1 row with column_count = 29
```

#### Step 3: Execute Second Migration

1. Open a new query tab in SQL Editor
2. Copy entire contents of `supabase/migrations/20251009_006_create_judge_analytics_cache.sql`
3. Paste into SQL Editor
4. Click "Run" or press `Ctrl+Enter`

**Expected Output:**

```
Success. No rows returned

-- Plus NOTICE messages like:
-- NOTICE:  ============================================================================
-- NOTICE:  Judge Analytics Cache Table Created Successfully
-- NOTICE:  ============================================================================
```

**Verification:**

- [ ] Query executes without errors
- [ ] Success notices appear
- [ ] Table creation confirmation notice appears

**Verify Table Creation:**

```sql
-- Run this query in a new SQL Editor tab
SELECT
  table_name,
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_name = 'judge_analytics_cache') as column_count
FROM information_schema.tables
WHERE table_name = 'judge_analytics_cache';

-- Expected: 1 row with column_count = 5
```

#### Step 4: Manual Migration Tracking (SQL Editor Only)

**IMPORTANT:** If using SQL Editor, manually record migrations

```sql
-- Record migration in Supabase migration history
-- (Only needed if NOT using Supabase CLI)

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20251008_002', 'onboarding_analytics_FIXED'),
  ('20251009_006', 'create_judge_analytics_cache');

-- Verify recording
SELECT * FROM supabase_migrations.schema_migrations
WHERE version IN ('20251008_002', '20251009_006');
```

---

### 3.3 Comprehensive Verification After Deployment

**Run ALL these checks after deployment:**

#### Table Structure Verification

```sql
-- Verify onboarding_analytics table structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'onboarding_analytics'
ORDER BY ordinal_position;

-- Expected: 29 columns including user_id (TEXT type, not UUID)
```

```sql
-- Verify judge_analytics_cache table structure
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'judge_analytics_cache'
ORDER BY ordinal_position;

-- Expected: 5 columns (judge_id, analytics, created_at, updated_at, analytics_version)
```

**Verification Checklist:**

- [ ] onboarding_analytics has 29 columns
- [ ] onboarding_analytics.user_id is TEXT type (not UUID)
- [ ] judge_analytics_cache has 5 columns
- [ ] judge_analytics_cache.analytics is JSONB type
- [ ] All timestamps have proper defaults

#### Index Verification

```sql
-- Check indexes on onboarding_analytics
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'onboarding_analytics';

-- Expected indexes:
-- - idx_onboarding_analytics_user_id
-- - idx_onboarding_analytics_completed_at
-- - idx_onboarding_analytics_abandoned (partial index)
-- - idx_onboarding_analytics_created_at
```

```sql
-- Check indexes on judge_analytics_cache
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'judge_analytics_cache';

-- Expected indexes:
-- - judge_analytics_cache_pkey (primary key on judge_id)
-- - idx_judge_analytics_cache_freshness
-- - idx_judge_analytics_cache_created_at
```

**Verification Checklist:**

- [ ] onboarding_analytics has 4 indexes
- [ ] judge_analytics_cache has 3 indexes
- [ ] Primary key exists on judge_analytics_cache.judge_id
- [ ] All composite indexes created successfully

#### RLS Policy Verification

```sql
-- Check RLS policies on onboarding_analytics
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'onboarding_analytics';

-- Expected policies:
-- - Users can view own onboarding analytics (SELECT)
-- - Service role has full access to onboarding analytics (ALL)
```

```sql
-- Check RLS policies on judge_analytics_cache
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'judge_analytics_cache';

-- Expected policies:
-- - judge_analytics_cache_service_all (ALL)
-- - judge_analytics_cache_admin_all (ALL)
-- - judge_analytics_cache_public_select (SELECT)
```

**Verification Checklist:**

- [ ] onboarding_analytics has 2 RLS policies
- [ ] judge_analytics_cache has 3 RLS policies
- [ ] Public can read judge_analytics_cache (SELECT policy exists)
- [ ] Service role has full access to both tables

---

## 4. Environment Variable Checks

### 4.1 Required Environment Variables

**Checklist:**

- [ ] **Supabase Configuration** (Required for database access)

  ```bash
  # Check if variables are set
  echo $NEXT_PUBLIC_SUPABASE_URL
  echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
  echo $SUPABASE_SERVICE_ROLE_KEY

  # Expected: Non-empty values
  # NEXT_PUBLIC_SUPABASE_URL should start with https://
  # Keys should be JWT format (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....)
  ```

- [ ] **Redis Configuration** (Required for analytics caching)

  ```bash
  echo $UPSTASH_REDIS_REST_URL
  echo $UPSTASH_REDIS_REST_TOKEN

  # Expected: Non-empty values
  # URL should start with https://
  ```

- [ ] **AI Service Keys** (Optional but recommended for analytics generation)

  ```bash
  echo $GOOGLE_AI_API_KEY
  echo $OPENAI_API_KEY

  # Expected: At least one should be set
  # GOOGLE_AI_API_KEY preferred for cost optimization
  ```

- [ ] **Analytics Configuration** (Optional - affects lookback window)

  ```bash
  echo $JUDGE_ANALYTICS_LOOKBACK_YEARS
  echo $JUDGE_ANALYTICS_CASE_LIMIT

  # Expected: Default is 5 years and 1000 cases if not set
  # Recommended: Leave at defaults unless specific needs
  ```

### 4.2 Environment Variable Validation

```bash
# Run validation script (if available)
npm run validate-env

# Or manually check critical variables
node -e "
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'UPSTASH_REDIS_REST_URL'
  ];
  required.forEach(key => {
    if (!process.env[key]) {
      console.error('❌ Missing:', key);
    } else {
      console.log('✓', key, 'is set');
    }
  });
"
```

**Verification:**

- [ ] All required variables are set
- [ ] Variables have correct format
- [ ] No sensitive data exposed in client-side variables
- [ ] Production values differ from development values

---

## 5. API Endpoint Testing

### 5.1 Test Judge Analytics Endpoint

**Purpose:** Verify judge analytics cache is working correctly

#### Test 1: Fetch Analytics for Existing Judge

```bash
# Replace {JUDGE_ID} with an actual judge ID from your database
curl -X GET "https://YOUR_DOMAIN/api/judges/{JUDGE_ID}/analytics?debug=true" \
  -H "Content-Type: application/json"
```

**Expected Response (First Call - Cache Miss):**

```json
{
  "analytics": {
    "confidence_civil": 0.85,
    "confidence_criminal": 0.92,
    "verdict_rate_plaintiff": 0.65,
    "settlement_rate": 0.45,
    "average_trial_duration_days": 120,
    "total_cases_analyzed": 247,
    "notable_patterns": [...],
    "data_limitations": [...]
  },
  "cached": false,
  "data_source": "case_analysis",
  "document_count": 247,
  "generation_method": "case_analysis",
  "rate_limit_remaining": 19,
  "debug": {
    "steps": [
      {"step": "redis_cache_check", "success": true, "details": {"found": false}},
      {"step": "database_cache_check", "success": true, "details": {"found": false}},
      {"step": "cases_fetch", "success": true, "details": {"count": 247}},
      {"step": "analytics_generation", "success": true},
      {"step": "redis_cache_write", "success": true},
      {"step": "database_cache_write", "success": true}
    ],
    "total_duration_ms": 3500,
    "cache_status": "miss"
  }
}
```

**Verification:**

- [ ] HTTP status 200
- [ ] `cached: false` on first call
- [ ] `analytics` object present with all required fields
- [ ] `database_cache_write` step succeeded in debug output
- [ ] Response time < 10 seconds

#### Test 2: Verify Cache Hit

```bash
# Same request as Test 1 - should be much faster
curl -X GET "https://YOUR_DOMAIN/api/judges/{JUDGE_ID}/analytics?debug=true" \
  -H "Content-Type: application/json"
```

**Expected Response (Second Call - Cache Hit):**

```json
{
  "analytics": {
    "confidence_civil": 0.85
    // ... same as first call
  },
  "cached": true,
  "data_source": "redis_cache",
  "last_updated": "2025-10-09T12:34:56.789Z",
  "cache_age_days": 0,
  "rate_limit_remaining": 19,
  "debug": {
    "steps": [
      { "step": "redis_cache_check", "success": true, "details": { "found": true, "age_days": 0 } }
    ],
    "total_duration_ms": 45,
    "cache_status": "hit_redis"
  }
}
```

**Verification:**

- [ ] HTTP status 200
- [ ] `cached: true`
- [ ] `data_source: "redis_cache"` or `"database_cache"`
- [ ] Response time < 200ms (much faster than first call)
- [ ] Same analytics data as first call

#### Test 3: Force Refresh Analytics

```bash
# Test force refresh endpoint (requires authentication)
curl -X POST "https://YOUR_DOMAIN/api/judges/{JUDGE_ID}/analytics?force=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

**Expected Response:**

```json
{
  "message": "Analytics refreshed successfully",
  "analytics": {
    "confidence_civil": 0.85
    // ... updated analytics
  }
}
```

**Verification:**

- [ ] HTTP status 200
- [ ] Analytics regenerated from scratch
- [ ] Cache cleared and repopulated
- [ ] New analytics may differ slightly from cached version

#### Test 4: Verify Cache in Database

```sql
-- Check that analytics were written to cache table
SELECT
  judge_id,
  created_at,
  updated_at,
  analytics_version,
  jsonb_typeof(analytics) as analytics_type
FROM judge_analytics_cache
WHERE judge_id = 'YOUR_JUDGE_ID_FROM_TEST';

-- Expected:
-- 1 row with jsonb analytics object
-- created_at and updated_at timestamps
-- analytics_version = 1
```

**Verification:**

- [ ] Row exists in judge_analytics_cache
- [ ] `analytics` column is valid JSONB
- [ ] Timestamps are recent
- [ ] Analytics contain expected keys

### 5.2 Test Cache Refresh Endpoint

**Purpose:** Verify materialized view refresh cron job works

```bash
# Test materialized view refresh (requires CRON_SECRET)
curl -X GET "https://YOUR_DOMAIN/api/cron/refresh-analytics-views" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "All views refreshed successfully",
  "report": {
    "timestamp": "2025-10-09T12:34:56.789Z",
    "views_refreshed": [
      {
        "view_name": "decision_counts_by_judge_year",
        "duration_ms": 234,
        "success": true,
        "record_count": 1523
      },
      {
        "view_name": "top_judges_by_jurisdiction",
        "duration_ms": 156,
        "success": true,
        "record_count": 89
      }
    ],
    "total_duration_ms": 390,
    "all_success": true
  }
}
```

**Verification:**

- [ ] HTTP status 200
- [ ] `all_success: true`
- [ ] Both materialized views refreshed
- [ ] Reasonable duration times (< 5 seconds total)

---

## 6. Post-Deployment Monitoring

### 6.1 Immediate Monitoring (First 30 Minutes)

**Checklist:**

- [ ] **Monitor Error Rates**

  ```bash
  # Check application logs for errors
  # Netlify: https://app.netlify.com/sites/YOUR_SITE/logs
  # Vercel: https://vercel.com/YOUR_TEAM/YOUR_PROJECT/logs

  # Look for:
  # - "Failed to cache analytics"
  # - "judge_analytics_cache" errors
  # - "onboarding_analytics" errors
  ```

- [ ] **Monitor Response Times**

  ```bash
  # Check analytics endpoint performance
  # Should be < 200ms for cached responses
  # Should be < 10s for uncached responses

  # Test with curl and timing
  time curl -X GET "https://YOUR_DOMAIN/api/judges/{JUDGE_ID}/analytics"
  ```

- [ ] **Monitor Cache Hit Rates**

  ```sql
  -- Check cache utilization
  SELECT
    COUNT(*) as cached_judges,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600) as avg_age_hours
  FROM judge_analytics_cache;

  -- Expected: Gradual increase as judges are accessed
  ```

- [ ] **Monitor Database Performance**

  ```sql
  -- Check for slow queries
  SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time
  FROM pg_stat_statements
  WHERE query LIKE '%judge_analytics_cache%'
  OR query LIKE '%onboarding_analytics%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;

  -- Expected: All queries < 100ms average
  ```

### 6.2 Long-Term Monitoring (Weekly)

**Checklist:**

- [ ] Review cache hit rates

  ```sql
  -- Cache efficiency report
  SELECT
    COUNT(*) as total_cached,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days') as week_old,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days') as month_old
  FROM judge_analytics_cache;
  ```

- [ ] Monitor storage growth
  ```sql
  SELECT
    pg_size_pretty(pg_database_size(current_database())) as total_size,
    pg_size_pretty(pg_total_relation_size('judge_analytics_cache')) as cache_size
  FROM (SELECT 1) t;
  ```

---

## 7. Rollback Procedures

### 7.1 Quick Rollback (If Issues Detected)

**Use this if:** Issues detected within 30 minutes of deployment

```sql
-- ROLLBACK SCRIPT
-- WARNING: This will delete all cached analytics and onboarding data

BEGIN;

-- Drop tables in reverse order
DROP TABLE IF EXISTS public.judge_analytics_cache CASCADE;
DROP TABLE IF EXISTS public.onboarding_analytics CASCADE;

-- Drop associated functions
DROP FUNCTION IF EXISTS public.get_judge_analytics_cache_stats() CASCADE;
DROP FUNCTION IF EXISTS public.clear_stale_analytics_cache(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.update_judge_analytics_cache_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.get_onboarding_completion_rate() CASCADE;
DROP FUNCTION IF EXISTS public.get_feature_adoption_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.track_feature_usage(TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_onboarding_analytics() CASCADE;

-- Drop views
DROP VIEW IF EXISTS public.onboarding_metrics_summary CASCADE;

COMMIT;
```

**After Running Rollback:**

```sql
-- Verify tables are dropped
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('judge_analytics_cache', 'onboarding_analytics');

-- Expected: 0 rows (tables removed)
```

**Verification Checklist:**

- [ ] Both tables dropped successfully
- [ ] All functions removed
- [ ] Application logs show fallback behavior
- [ ] No errors after rollback

---

## 8. Known Issues & Watchpoints

### 8.1 Common Issues

#### Issue 1: Migration Already Applied Error

**Symptoms:**

```
Error: migration 20251008_002_onboarding_analytics_FIXED already applied
```

**Solution:**

```sql
-- Check if table already exists
SELECT table_name FROM information_schema.tables
WHERE table_name = 'onboarding_analytics';

-- If structure is wrong, drop and reapply
DROP TABLE IF EXISTS public.onboarding_analytics CASCADE;
-- Then rerun migration
```

#### Issue 2: Foreign Key Constraint Violation

**Symptoms:**

```
ERROR: insert or update on table "onboarding_analytics" violates
foreign key constraint "onboarding_analytics_user_id_fkey"
```

**Solution:**

```sql
-- Verify the app_users table has clerk_user_id column
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'app_users' AND column_name = 'clerk_user_id';

-- If missing, check migration history
```

#### Issue 3: Redis Connection Timeout

**Symptoms:**

```
Error: Redis connection timeout
Failed to cache analytics in Redis
```

**Solution:**

```bash
# Verify Redis credentials
curl $UPSTASH_REDIS_REST_URL/get/test \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Application will fall back to database cache if Redis fails
```

---

## 9. Support & Contacts

### 9.1 Technical Contacts

**Primary Developer:**

- Name: Tanner
- Role: Platform Developer
- Contact: (Add contact method)

### 9.2 Support Resources

**Supabase Support:**

- Dashboard: https://app.supabase.com
- Documentation: https://supabase.com/docs
- Support: support@supabase.com

**Upstash Redis Support:**

- Dashboard: https://console.upstash.com
- Documentation: https://docs.upstash.com/redis
- Support: support@upstash.com

### 9.3 Escalation Procedures

**Level 1: Minor Issues (Self-Resolvable)**

- Single API endpoint errors
- Cache misses
- **Action:** Review logs, apply fixes from Known Issues section

**Level 2: Moderate Issues (Team Collaboration)**

- Multiple endpoint failures
- Performance degradation
- **Action:** Contact technical lead, review with team

**Level 3: Critical Issues (Immediate Rollback)**

- Complete API failure
- Data corruption
- Database unavailable
- **Action:** Initiate immediate rollback, alert stakeholders

---

## 10. Deployment Sign-Off

**Sign-off checklist for deployment completion:**

- [ ] All migrations applied successfully
- [ ] All verification queries passed
- [ ] API endpoints tested and working
- [ ] Cache hit rates verified
- [ ] Error rates within normal ranges
- [ ] Performance metrics within targets
- [ ] Team notified of successful deployment

**Deployed by:** ********\_\_\_********
**Date/Time:** ********\_\_\_********
**Duration:** ********\_\_\_********
**Issues:** ********\_\_\_********
**Notes:** ********\_\_\_********

---

**Last Updated:** 2025-10-09
**Version:** 1.0.0

_Context improved by Giga AI - Used information about deployment procedures, migration tracking, and API endpoint structure_
