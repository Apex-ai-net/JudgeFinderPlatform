# Migration Fix - Quick Start Guide

## TL;DR

Your database has 36 local migrations but none are tracked. Critical columns and indexes are missing.

**Fix:** Run SQL script in Supabase SQL Editor.

**Time:** 2-3 hours

**Risk:** Low (only adds schema, doesn't modify data)

## Quick Commands

### Option 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql/new
2. Copy contents of: `/Users/tannerosterkamp/JudgeFinderPlatform-1/supabase/apply-migrations-stepbystep.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait 10-15 minutes for completion

### Option 2: Command Line

```bash
cd /Users/tannerosterkamp/JudgeFinderPlatform-1

# Run analysis first
node scripts/analyze-db-direct.js

# Apply via Supabase CLI (if installed)
cat supabase/apply-migrations-stepbystep.sql | supabase db execute
```

## What Gets Fixed

| Issue | Fix |
|-------|-----|
| Broken URLs (/judges/john-doe) | Adds slug columns |
| Slow queries (5-10 seconds) | Adds 15+ indexes |
| Missing CourtListener IDs | Adds integration fields |
| No geographic filtering | Adds jurisdiction column |
| No full-text search | Adds search vectors |
| Missing analytics | Creates materialized views |

## Verification

After running, execute this in SQL Editor:

```sql
-- Should return 36
SELECT COUNT(*) FROM supabase_migrations.schema_migrations;

-- Should return 7
SELECT COUNT(*) FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'judges' AND column_name IN ('slug', 'courtlistener_id', 'jurisdiction'))
    OR (table_name = 'courts' AND column_name = 'slug')
    OR (table_name = 'cases' AND column_name IN ('source_url', 'docket_hash'))
    OR (table_name = 'sync_queue' AND column_name = 'max_retries'));

-- Should see multiple indexes
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
```

All counts should be > 0.

## Files Created

1. **MIGRATION_ACTION_PLAN.md** - Detailed step-by-step guide
2. **MIGRATION_FIX_REPORT.md** - Complete analysis and root cause
3. **supabase/apply-migrations-stepbystep.sql** - The actual SQL to run
4. **supabase/fix-migration-tracking.sql** - Just the tracking updates
5. **scripts/analyze-db-direct.js** - Re-run analysis anytime

## If Something Goes Wrong

### Rollback Critical Changes
```sql
ALTER TABLE judges DROP COLUMN IF EXISTS slug;
ALTER TABLE courts DROP COLUMN IF EXISTS slug;
TRUNCATE supabase_migrations.schema_migrations;
```

### Get Current State
```bash
node scripts/analyze-db-direct.js
```

## Support

**Detailed guide:** Read MIGRATION_ACTION_PLAN.md

**Full analysis:** Read MIGRATION_FIX_REPORT.md

**Re-analyze:** `node scripts/analyze-db-direct.js`

---

**Ready?** Copy `supabase/apply-migrations-stepbystep.sql` into Supabase SQL Editor and run.
