# 🚨 CRITICAL: Database Search Function Fix Required

## Issue Summary

The judge search functionality is currently **BROKEN** due to a PostgreSQL type mismatch error in the `search_judges_ranked` database function.

### Error Details

```
Search error: {
  code: '42804',
  details: 'Returned type character varying(500) does not match expected type text in column 7.',
  message: 'structure of query does not match function result type'
}
```

### Root Cause

- **Database Column**: `judges.profile_image_url` is type `VARCHAR(500)`
- **Function Return**: `search_judges_ranked()` declares return type `TEXT` for column 7 (profile_image_url)
- **PostgreSQL Enforcement**: PostgreSQL 15+ strictly enforces return type matching

This mismatch causes all search queries to fail with a 500 error.

## Impact

- ❌ Judge search API (`/api/judges/search`) returns 500 errors
- ❌ Homepage search broken
- ❌ Advanced search broken
- ❌ Any UI component using judge search is non-functional
- ✅ Judge list API still works (doesn't use search function)
- ✅ Analytics endpoints work
- ✅ Judge profile pages work

## Solution

Two migration files have been created to fix this issue:

### Option 1: Change Database Column to TEXT (Recommended)

File: `supabase/migrations/20251001_001_fix_profile_image_url_type.sql`

```sql
ALTER TABLE judges ALTER COLUMN profile_image_url TYPE TEXT;
```

**Pros**: More flexible for long URLs, matches function signature
**Cons**: Requires ALTER TABLE (may take a few seconds on large table)

### Option 2: Change Function Return Type to VARCHAR(500)

File: `supabase/migrations/20251001_002_fix_search_function_return_type.sql`

```sql
-- Updates search_judges_ranked() to return VARCHAR(500) instead of TEXT
```

**Pros**: No table modification needed, faster to apply
**Cons**: Less flexible for very long URLs

## How to Apply the Fix

### Method 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg
2. Navigate to **SQL Editor**
3. Copy contents of ONE of the migration files above
4. Click **Run**
5. Verify with test query:
   ```sql
   SELECT * FROM search_judges_ranked('smith', NULL, 5, 0.3);
   ```

### Method 2: Supabase CLI

```bash
# Apply migration 001 (change column type)
npx supabase db push --db-url "your-connection-string"

# OR apply migration 002 (change function)
npx supabase db push --db-url "your-connection-string"
```

### Method 3: Node Script (Automated)

```bash
node scripts/apply-search-fix-migration.js
```

**Note**: This script applies migration 002 (function update)

### Method 4: Direct PostgreSQL Connection

```bash
psql "postgresql://postgres:PASSWORD@db.xstlnicbnzdxlgfiewmg.supabase.co:5432/postgres" < supabase/migrations/20251001_002_fix_search_function_return_type.sql
```

## Verification

After applying the fix, test the search endpoint:

```bash
curl "http://localhost:3005/api/judges/search?q=smith&limit=5" | jq '.'
```

**Expected Result**: JSON with search results (not error)

```json
{
  "results": [
    {
      "id": "...",
      "type": "judge",
      "title": "Judge John Smith",
      "subtitle": "Superior Court of California",
      "description": "California • 150 cases",
      "url": "/judges/john-smith"
    }
  ],
  "total_count": 15,
  "page": 1,
  "per_page": 5,
  "has_more": true
}
```

## Production Deployment Checklist

- [ ] Apply database migration (Option 1 OR Option 2)
- [ ] Test search locally: `curl http://localhost:3005/api/judges/search?q=test`
- [ ] Verify no errors in dev server logs
- [ ] Test on production: `curl https://judgefinder.io/api/judges/search?q=test`
- [ ] Smoke test homepage search functionality
- [ ] Monitor Sentry for search-related errors
- [ ] Check Supabase logs for function errors

## Additional Notes

- **Why this happened**: The original `20250930_003_full_text_search.sql` migration declared `profile_image_url TEXT` but the actual column in the database was already `varchar(500)` from an earlier migration
- **Prevention**: Always check existing column types before creating functions that return table columns
- **Database Health**: All other database operations are functioning normally

## Related Files

- Migration Files:
  - `supabase/migrations/20251001_001_fix_profile_image_url_type.sql`
  - `supabase/migrations/20251001_002_fix_search_function_return_type.sql`
  - `supabase/migrations/20250930_003_full_text_search.sql` (original function definition)

- API Files:
  - `app/api/judges/search/route.ts` (calls the broken function)

- Helper Scripts:
  - `scripts/apply-search-fix-migration.js` (automated migration application)

## Timeline

- **2025-10-01**: Issue discovered during production verification
- **2025-10-01**: Migration files created and committed
- **Status**: AWAITING DATABASE FIX APPLICATION

## Contact

For questions or issues applying this fix, refer to `CLAUDE.md` for platform details.

---

**Priority**: 🔴 **CRITICAL** - Must be applied before production launch
**Estimated Fix Time**: 5 minutes
**Downtime Required**: None (hot-apply migration)
