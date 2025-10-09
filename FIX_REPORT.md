# Table Accessibility Issue - Investigation & Fix Report

**Date:** October 8, 2025
**Project:** JudgeFinder Platform
**Supabase Project:** xstlnicbnzdxlgfiewmg

---

## Problem Summary

After restarting the Supabase project, only 1 of 3 newly created tables was accessible via REST API:

- ✅ `onboarding_analytics` - **ACCESSIBLE**
- ❌ `audit_logs` - **NOT ACCESSIBLE** (Error: "Could not find the table 'public.audit_logs' in the schema cache")
- ❌ `performance_metrics` - **NOT ACCESSIBLE** (Error: "Could not find the table 'public.performance_metrics' in the schema cache")

---

## Investigation Results

### 1. Root Cause Analysis

The investigation revealed:

1. **Tables DO exist in the database** ✅
   - HEAD requests (count queries) work for all 3 tables
   - This confirms the tables are physically created in PostgreSQL

2. **PostgREST schema cache issue** ❌
   - SELECT queries fail for `audit_logs` and `performance_metrics`
   - Error message: "Could not find the table in the schema cache"
   - This indicates PostgREST has not loaded these tables into its internal schema cache

3. **Why onboarding_analytics works:**
   - It was likely created AFTER the last PostgREST restart/cache reload
   - Or it triggered a cache refresh when accessed

### 2. Technical Details

**PostgREST Schema Cache Behavior:**

- PostgREST caches the database schema for performance
- Cache is loaded on startup and periodically refreshed
- Manual cache reload can be triggered via `NOTIFY pgrst, 'reload schema'`
- However, this requires direct SQL execution access

**Migration Files:**

1. `supabase/migrations/20251008_001_audit_logs.sql` - Audit logging system
2. `supabase/migrations/20250108_performance_metrics.sql` - Performance monitoring
3. `supabase/migrations/20251008_002_onboarding_analytics_FIXED.sql` - Onboarding analytics

---

## Fix Implementation

### Actions Taken:

1. **Fixed .env.local file formatting** ✅
   - Removed line breaks in multi-line environment variable values
   - This was preventing Supabase CLI from working correctly

2. **Created diagnostic scripts** ✅
   - `scripts/verify-database.mjs` - Check database state via REST API
   - `scripts/fix-table-access.mjs` - Diagnose table accessibility issues
   - `scripts/verify-table-access.mjs` - Test REST API access comprehensively
   - `scripts/check-tables-exist.mjs` - Verify table existence in database

3. **Created migration application script** ✅
   - `scripts/apply-migrations-manually.sql` - Complete SQL script to apply both migrations
   - Includes DROP IF EXISTS for clean re-application
   - Includes NOTIFY command to reload PostgREST cache
   - Includes verification steps

---

## Required Manual Steps

Since the REST API cannot execute arbitrary SQL, the following manual steps are required:

### Step 1: Apply Migrations via SQL Editor

1. Go to **Supabase Dashboard → SQL Editor**
2. Open the file: `scripts/apply-migrations-manually.sql`
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click **"Run"**
6. Verify you see success messages in the output

### Step 2: Reload PostgREST Schema Cache

**Option A: Restart Supabase Project** (Recommended)

1. Go to **Dashboard → Settings → General**
2. Click **"Pause project"**
3. Wait 10 seconds
4. Click **"Resume project"**
5. Wait 30-60 seconds for full startup

**Option B: Wait for Automatic Reload**

- PostgREST may reload its cache automatically within 5-10 minutes
- Not guaranteed, restart is more reliable

### Step 3: Verify Fix

Run the verification script:

```bash
node scripts/verify-table-access.mjs
```

Expected output:

```
| Table                | Status   | Row Count |
|----------------------|----------|-----------|
| audit_logs           | ✅ PASS | 0         |
| performance_metrics  | ✅ PASS | 0         |
| onboarding_analytics | ✅ PASS | 0         |

**Summary:** 3/3 tables accessible via REST API

🎉 **ALL TABLES ARE ACCESSIBLE!**
```

---

## Prevention for Future

To prevent this issue in the future:

### 1. Migration Application Process

**Recommended workflow:**

```bash
# 1. Apply migrations using Supabase CLI
npx supabase db push --linked

# 2. Or apply via SQL Editor and then trigger cache reload
# In SQL Editor, after running migrations:
NOTIFY pgrst, 'reload schema';

# 3. Always verify after migrations
node scripts/verify-table-access.mjs
```

### 2. PostgREST Cache Management

When creating new tables, always:

1. Apply the migration SQL
2. Either restart the project OR send `NOTIFY pgrst, 'reload schema'`
3. Wait 30-60 seconds for cache to reload
4. Verify table is accessible via REST API

### 3. Environment File Maintenance

- Keep environment variables on single lines
- Use proper escaping for multi-line values
- Validate .env files before committing:
  ```bash
  npx supabase status  # Should not show parse errors
  ```

---

## Migration File Contents Summary

### audit_logs Table

- Purpose: Security audit logging for PII access and admin actions
- Key features:
  - Tracks user actions (PII access, admin actions, security events)
  - Stores IP addresses, user agents, request details
  - RLS policies for admin and user access
  - Retention policy (2 years)
  - Helper functions for analytics

### performance_metrics Table

- Purpose: Application performance monitoring
- Key features:
  - Tracks operation durations (search, analytics, API calls)
  - Stores metadata in JSONB format
  - RLS policies for admin and service role
  - Retention policy (30 days)
  - Aggregation views and functions

---

## Files Created

### Diagnostic Scripts

- `scripts/verify-database.mjs` - Database state checker
- `scripts/fix-table-access.mjs` - Table access diagnostic tool
- `scripts/verify-table-access.mjs` - Comprehensive REST API test
- `scripts/check-tables-exist.mjs` - Direct table existence check

### Migration Scripts

- `scripts/apply-migrations-manually.sql` - Complete migration SQL

### Documentation

- `FIX_REPORT.md` - This comprehensive report

---

## Current Status

✅ **Issue Diagnosed**
✅ **Root Cause Identified** (PostgREST schema cache)
✅ **Fix Script Created**
✅ **Environment Issues Resolved**
⏳ **Awaiting Manual Migration Application**

**Next Action Required:** Apply `scripts/apply-migrations-manually.sql` via Supabase SQL Editor and restart the project.

---

## Technical Notes

### Why RPC exec_sql Doesn't Exist

- Supabase doesn't provide a built-in `exec_sql` RPC function for security reasons
- Arbitrary SQL execution must be done via:
  - SQL Editor in Dashboard
  - Supabase CLI with proper authentication
  - Direct PostgreSQL connection

### Why PostgREST Cache Matters

- PostgREST serves as the REST API layer over PostgreSQL
- It caches schema information for performance
- When schema changes (new tables, altered columns), cache must be refreshed
- Cache refresh happens:
  - On PostgREST startup
  - When receiving `NOTIFY pgrst, 'reload schema'` signal
  - Periodically (implementation-dependent)

### Migration Naming Considerations

- Notice the date discrepancy: `20250108` vs `20251008`
- The `performance_metrics` migration has January 2025 date (20250108)
- This is likely a typo but doesn't affect functionality
- Consider renaming for consistency in future

---

## Verification Checklist

Before marking this issue as resolved, verify:

- [ ] `scripts/apply-migrations-manually.sql` executed successfully in SQL Editor
- [ ] No errors shown in SQL Editor output
- [ ] Supabase project restarted (paused and resumed)
- [ ] `node scripts/verify-table-access.mjs` shows 3/3 tables accessible
- [ ] REST API calls to all 3 tables work from application code
- [ ] RLS policies are functioning (insert tests blocked appropriately)

---

## Additional Resources

**Supabase Documentation:**

- [PostgREST Schema Cache](https://postgrest.org/en/stable/schema_cache.html)
- [Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)

**Project Files:**

- Migration files: `supabase/migrations/`
- Verification scripts: `scripts/`
- Environment config: `.env.local`

---

**Report Generated:** October 8, 2025
**Investigation Duration:** ~30 minutes
**Status:** ✅ Diagnosis Complete, ⏳ Awaiting Manual Fix Application
