# Database Migration Instructions - Practice Areas

**Migration:** `20251017_add_practice_areas_to_app_users.sql`
**Date:** October 17, 2025
**Purpose:** Add `practice_areas` JSONB column to support Practice Areas dashboard feature

---

## What This Migration Does

1. ✅ Adds `practice_areas` JSONB column to `app_users` table
2. ✅ Sets default value to empty array `[]`
3. ✅ Adds GIN index for efficient JSONB queries
4. ✅ Includes verification checks
5. ✅ Safe to run multiple times (idempotent)

---

## Option 1: Run via Supabase Dashboard (Recommended)

### Steps:

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/lgmqmpmaqkuwybqpofwc/sql
   - Or: Project → SQL Editor → New Query

2. **Copy Migration SQL**
   - Open: `supabase/migrations/20251017_add_practice_areas_to_app_users.sql`
   - Copy entire contents

3. **Paste and Execute**
   - Paste SQL into Supabase SQL Editor
   - Click "Run" or press `Ctrl/Cmd + Enter`

4. **Verify Success**
   - You should see: `✓ SUCCESS: practice_areas column and index created successfully`
   - Check the "Results" tab for confirmation

---

## Option 2: Run via Supabase CLI

### Prerequisites:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login
```

### Steps:

```bash
# Navigate to project directory
cd /Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform

# Link to your Supabase project (if not already linked)
supabase link --project-ref lgmqmpmaqkuwybqpofwc

# Run the migration
supabase db push

# Alternative: Run specific migration file
psql "$DATABASE_URL" -f supabase/migrations/20251017_add_practice_areas_to_app_users.sql
```

---

## Option 3: Run via psql (Direct Database Connection)

### Steps:

1. **Get Database Connection String**
   - Go to: Project Settings → Database → Connection String
   - Copy the connection string (starts with `postgresql://`)

2. **Run Migration**
   ```bash
   # Replace with your actual connection string
   psql "postgresql://postgres:[YOUR-PASSWORD]@db.lgmqmpmaqkuwybqpofwc.supabase.co:5432/postgres" \
     -f supabase/migrations/20251017_add_practice_areas_to_app_users.sql
   ```

---

## Verification Queries

After running the migration, verify it worked:

### 1. Check Column Exists

```sql
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'app_users'
  AND column_name = 'practice_areas';
```

**Expected Result:**

```
column_name     | data_type | column_default | is_nullable
----------------+-----------+----------------+-------------
practice_areas  | jsonb     | '[]'::jsonb    | NO
```

### 2. Check Index Exists

```sql
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'app_users'
  AND indexname = 'idx_app_users_practice_areas';
```

**Expected Result:**

```
indexname                       | indexdef
--------------------------------+--------------------------------------------------
idx_app_users_practice_areas    | CREATE INDEX ... USING gin (practice_areas)
```

### 3. Test Insert

```sql
-- Test inserting practice areas
UPDATE app_users
SET practice_areas = '["criminal", "civil"]'::jsonb
WHERE id = (SELECT id FROM app_users LIMIT 1)
RETURNING id, practice_areas;
```

### 4. Test Query

```sql
-- Test JSONB containment query
SELECT id, email, practice_areas
FROM app_users
WHERE practice_areas @> '["criminal"]'::jsonb
LIMIT 5;
```

---

## Rollback Instructions

If you need to rollback this migration:

```sql
-- Drop the index
DROP INDEX IF EXISTS public.idx_app_users_practice_areas;

-- Drop the column
ALTER TABLE public.app_users
DROP COLUMN IF EXISTS practice_areas;
```

⚠️ **Warning:** This will delete all practice area data!

---

## Expected Database State After Migration

### Table: `app_users`

```sql
Column Name       | Type      | Default     | Nullable
------------------+-----------+-------------+----------
id                | uuid      | ...         | NO
clerk_user_id     | varchar   | -           | YES
email             | varchar   | -           | YES
full_name         | varchar   | -           | YES
practice_areas    | jsonb     | '[]'::jsonb | NO  ← NEW
metadata          | jsonb     | -           | YES
created_at        | timestamp | now()       | YES
updated_at        | timestamp | now()       | YES
```

### Indexes:

- `idx_app_users_practice_areas` (GIN index on practice_areas)

---

## Testing the Practice Areas Feature

After migration, test the feature:

1. **Visit Practice Areas Page**

   ```
   https://judgefinder.io/dashboard/practice-areas
   ```

2. **Select Practice Areas**
   - Choose 2-3 practice areas
   - Click "Save Changes"

3. **Verify in Database**

   ```sql
   SELECT
     id,
     email,
     practice_areas,
     updated_at
   FROM app_users
   WHERE practice_areas != '[]'::jsonb
   ORDER BY updated_at DESC
   LIMIT 10;
   ```

4. **Test API Endpoint**

   ```bash
   # GET practice areas
   curl -X GET https://judgefinder.io/api/user/practice-areas \
     -H "Authorization: Bearer YOUR_TOKEN"

   # POST practice areas
   curl -X POST https://judgefinder.io/api/user/practice-areas \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"practice_areas": ["criminal", "civil", "family"]}'
   ```

---

## Troubleshooting

### Issue: "column already exists"

**Solution:** Migration is idempotent, it will skip if column exists. No action needed.

### Issue: "permission denied"

**Solution:**

1. Make sure you're connected as the database owner
2. Check your database connection credentials
3. Verify you have ALTER TABLE permissions

### Issue: Index creation fails

**Solution:**

```sql
-- Drop existing index if corrupt
DROP INDEX IF EXISTS public.idx_app_users_practice_areas;

-- Recreate
CREATE INDEX idx_app_users_practice_areas
ON public.app_users USING GIN (practice_areas);
```

### Issue: Default value not working

**Solution:**

```sql
-- Update existing NULL values
UPDATE app_users
SET practice_areas = '[]'::jsonb
WHERE practice_areas IS NULL;

-- Ensure NOT NULL constraint
ALTER TABLE app_users
ALTER COLUMN practice_areas SET NOT NULL;
```

---

## Related Files

- **Migration File:** `supabase/migrations/20251017_add_practice_areas_to_app_users.sql`
- **Page Component:** `app/dashboard/practice-areas/page.tsx`
- **UI Component:** `components/dashboard/PracticeAreasDashboard.tsx`
- **API Route:** `app/api/user/practice-areas/route.ts`

---

## Support

If you encounter issues:

1. Check Supabase logs: Project → Logs → Postgres Logs
2. Review migration file for syntax errors
3. Verify database connection
4. Check user permissions

---

## Migration Checklist

- [ ] Migration file created
- [ ] Review SQL syntax
- [ ] Backup database (recommended for production)
- [ ] Run migration via preferred method
- [ ] Verify column exists
- [ ] Verify index exists
- [ ] Test practice areas page
- [ ] Test API endpoints
- [ ] Monitor for errors
- [ ] Document completion

---

**Status:** Ready to Execute
**Risk Level:** Low (idempotent, safe to retry)
**Estimated Time:** < 1 minute

_Migration created by Claude Code - Dashboard Implementation_
