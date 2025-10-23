# Manual Migration Required: Add Positions Column

## ⚠️ Action Required

The `positions` JSONB column needs to be added to the `judges` table. Since we don't have direct SQL execution access via scripts, you need to apply this manually.

## Option 1: Supabase Dashboard (Recommended - 2 minutes)

1. Go to: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql/new
2. Paste this SQL:

```sql
-- Add positions column (safe - uses IF NOT EXISTS)
ALTER TABLE judges
ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT '[]'::jsonb;

-- Add helpful comment
COMMENT ON COLUMN judges.positions IS 'JSON array of position history from CourtListener including court assignments, titles, and tenure dates';

-- Verify it worked
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'judges' AND column_name = 'positions';
```

3. Click "Run"
4. You should see: `positions | jsonb`

## Option 2: Supabase CLI (if installed)

```bash
npx supabase db execute --db-url "postgresql://postgres:[password]@db.xstlnicbnzdxlgfiewmg.supabase.co:5432/postgres" \
  --file supabase/migrations/20250817_001_add_courtlistener_fields.sql
```

## Option 3: Environment Variable Approach

If you have `psql` installed:

1. Get your database password from Supabase Dashboard → Settings → Database
2. Run:

```bash
export DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.xstlnicbnzdxlgfiewmg.supabase.co:5432/postgres"
psql $DATABASE_URL -c "ALTER TABLE judges ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT '[]'::jsonb"
```

## Verification

After applying, run:

```bash
node scripts/check-migration-status.js
```

You should see: `✅ positions column EXISTS`

## Why This Migration Is Needed

The `positions` column will store judge position history from CourtListener, including:
- Court assignments over time
- Job titles (Judge, Chief Judge, etc.)
- Appointment dates and tenure
- Jurisdictions served

This enriches judge profiles with career history data.

## Next Steps

Once this column is added, I'll proceed with:
1. Education data sync (fills in missing education for 86.7% of judges)
2. Political affiliations sync
3. Position history sync
4. Bulk bootstrap tool for future expansion

---

**Note**: This migration is safe to run multiple times (uses `IF NOT EXISTS`). If the column already exists, it will be skipped.
