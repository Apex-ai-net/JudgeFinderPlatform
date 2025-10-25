# 🔧 QUICK FIX - Migration Order Issue

**Problem:** Two migration errors blocking deployment:

1. Base schema fails: `stripe_customer_id` column doesn't exist on existing subscriptions table
2. RLS policies fail: `bookmarks` table doesn't exist (because base schema failed)

**Root Cause:** Your database has tables created by earlier migrations with different schemas than the base schema expects.

**Solution:** Apply migrations in the correct order with a patch migration to fix gaps.

---

## ✅ CORRECT MIGRATION ORDER (4 STEPS)

Apply these migrations in **this exact order** in your Supabase SQL Editor:

### 1. Base Schema (FIRST - If Not Already Applied)

**File:** `supabase/migrations/00000000000000_base_schema_idempotent.sql`

**Why:** Creates all core tables including `bookmarks`, `search_history`, `subscriptions`, etc.

**Safe:** Uses `CREATE TABLE IF NOT EXISTS` so it won't break if some tables already exist.

**How to apply:**

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `supabase/migrations/00000000000000_base_schema_idempotent.sql`
3. Paste and click "Run"
4. Expected: "Success" (may show "already exists" warnings - that's OK!)

**⚠️ If this fails with "column stripe_customer_id does not exist" → Skip to Step 2 (Patch Migration)**

### 2. **Patch Migration (SECOND - CRITICAL)** 🆕

**File:** `supabase/migrations/20251024_003_fix_base_schema_gaps.sql`

**Why:** Fixes schema mismatches between existing tables and expected base schema:

- Adds missing `stripe_customer_id` column to subscriptions table
- Creates missing tables (bookmarks, search_history, users, attorneys, attorney_slots)
- Creates required indexes
- Creates `is_admin()` helper function for RLS policies
- 100% idempotent - safe to run multiple times

**How to apply:**

1. Copy contents of this file
2. Paste in SQL Editor
3. Click "Run"
4. Expected: "Success. All base schema gaps fixed successfully!"

**This migration will show detailed output:**

- Which columns were added
- Which tables were created
- Verification that all required tables now exist

### 3. Bar Verifications Table (THIRD)

**File:** `supabase/migrations/20251024_001_bar_verifications_table.sql`

**Why:** Creates the new `bar_verifications` table for attorney verification workflow.

**How to apply:**

1. Copy contents of this file
2. Paste in SQL Editor
3. Click "Run"
4. Expected: "Success. No rows returned"

### 4. RLS Policies (FOURTH - Last)

**File:** `supabase/migrations/20251024_complete_base_schema_rls_policies.sql`

**Why:** Creates 32 security policies. MUST be applied AFTER all tables exist.

**How to apply:**

1. Copy contents of this file
2. Paste in SQL Editor
3. Click "Run"
4. Expected: "Success. 32 policies created"

---

## 🧪 VERIFY SUCCESS

After applying all 4 migrations, run this query:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('bookmarks', 'search_history', 'subscriptions', 'bar_verifications', 'users', 'attorneys', 'attorney_slots')
ORDER BY table_name;

-- Should return 7 rows
```

```sql
-- Check RLS policies created
SELECT COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public';

-- Should return > 30
```

```sql
-- Verify stripe_customer_id column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
  AND column_name IN ('stripe_customer_id', 'stripe_subscription_id');

-- Should return 2 rows
```

---

## 📧 SENDGRID - NO ACTION NEEDED

**Good news:** You already have SendGrid configured in your `.env.local`:

- `SENDGRID_API_KEY` is set
- `SENDGRID_FROM_EMAIL=billing@judgefinder.io` is set

**You don't need to do anything with SendGrid!** The email system will work with your existing configuration.

---

## 🚀 AFTER MIGRATIONS ARE APPLIED

1. ✅ Migrations applied in correct order (4 steps)
2. ✅ SendGrid already configured (no changes needed)
3. ✅ Code already deployed to GitHub (commit 302b95e)
4. ✅ Netlify auto-build should be complete by now

**Check Netlify:** https://app.netlify.com - Your deployment should show "Published" status

---

## 🎯 SUMMARY

**The Fix:**

- Apply base schema migration FIRST (if it succeeds, great!)
- If base schema fails → Apply patch migration to fix gaps
- Then apply bar verifications migration
- Finally apply RLS policies migration

**SendGrid:**

- Already configured ✅
- No action needed ✅

**Next Steps:**

- Apply the 4 migrations in order
- Verify Netlify deployment is published
- Test the new features!

---

**Total time:** ~5 minutes to apply all migrations

## 📝 TROUBLESHOOTING

**If you get "relation judges does not exist" error:**

- Your database is missing core tables (judges, courts, etc.)
- You need to apply the initial database setup migrations first
- Check `supabase/migrations/` for earlier migrations that create judges/courts tables

**If you get "function is_admin() does not exist" error:**

- The patch migration (step 2) creates this function
- Make sure you applied step 2 before step 4

**If migrations succeed but RLS policies fail:**

- Check that all 6 required tables exist: users, attorneys, attorney_slots, bookmarks, search_history, subscriptions
- Run the verification queries above to diagnose which table is missing
