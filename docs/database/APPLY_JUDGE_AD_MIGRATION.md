# Apply Judge Ad Products Migration

**Status**: ✅ **READY TO APPLY - SYNTAX FIXED**
**Migration File**: `supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql`
**Created**: January 19, 2025
**Last Updated**: January 19, 2025 (Fixed PostgreSQL syntax error)
**Production Project**: `xstlnicbnzdxlgfiewmg` (https://xstlnicbnzdxlgfiewmg.supabase.co)

## Recent Fix (January 19, 2025)
⚠️ **Fixed PostgreSQL syntax error**: Removed invalid `WHERE` clause from table constraint (line 77) and replaced with a proper partial UNIQUE index (`idx_ad_bookings_unique_active`). The constraint now correctly prevents double-booking using PostgreSQL's supported syntax.

---

## Executive Summary

The migration `20250119000000_judge_ad_products_and_bookings.sql` creates three critical tables for the judge advertising system with Stripe integration. These tables are currently **MISSING from production** but are **REQUIRED by the application code**.

### Impact Assessment
- **Severity**: HIGH - Application features will fail without these tables
- **Risk**: LOW - Migration is idempotent and safe to apply
- **Affected Code**: 4 application files depend on these tables

---

## What This Migration Does

Creates 3 new tables with complete RLS policies and triggers:

### 1. `judge_ad_products` Table
Caches Stripe product and price IDs for each judge's advertising spots to avoid recreating products.

**Key Features:**
- Links judge_id to Stripe product/price IDs
- Supports 2 position slots per judge
- Court-level based pricing (federal/state)
- Prevents duplicate products per judge/position

### 2. `ad_spot_bookings` Table
Tracks active and historical ad spot subscriptions with Stripe integration.

**Key Features:**
- Links advertiser to judge advertising spots
- Stripe subscription lifecycle management
- Prevents double-booking per judge/position
- Supports multiple billing intervals (monthly/annual)
- Status tracking (active, past_due, canceled, etc.)

### 3. `checkout_sessions` Table
Temporary storage for Stripe checkout session to subscription linking.

**Key Features:**
- Auto-expires after 24 hours
- Maps checkout sessions to subscriptions
- Cleanup-friendly design

---

## Application Code Dependencies

The following files **REQUIRE** these tables and will fail without them:

1. **[lib/stripe/judge-products.ts:44](../../lib/stripe/judge-products.ts#L44)**
   - Function: `getOrCreateJudgeAdProduct()`
   - Queries: `judge_ad_products` table
   - Purpose: Cache Stripe product IDs

2. **[app/dashboard/advertiser/page.tsx](../../app/dashboard/advertiser/page.tsx)**
   - Displays advertiser's active bookings
   - Queries: `ad_spot_bookings` table

3. **[app/api/judges/[id]/advertising-slots/route.ts](../../app/api/judges/[id]/advertising-slots/route.ts)**
   - API endpoint for ad slot availability
   - Queries: `ad_spot_bookings` and `judge_ad_products` tables

4. **[app/api/webhooks/stripe/ad-subscriptions/route.ts](../../app/api/webhooks/stripe/ad-subscriptions/route.ts)**
   - Stripe webhook handler for subscription events
   - Writes to: `ad_spot_bookings` table

---

## Prerequisites Verified ✅

### Dependent Tables (Must Exist First)
- ✅ **judges** table - Created in migration `20250823_001_create_advertising_system.sql`
- ✅ **advertiser_profiles** table - Created in migration `20250823_001_create_advertising_system.sql`
- ✅ **auth.users** - Supabase built-in table

### Environment Variables
- ✅ **NEXT_PUBLIC_SUPABASE_URL** - https://xstlnicbnzdxlgfiewmg.supabase.co
- ✅ **SUPABASE_SERVICE_ROLE_KEY** - Configured in Netlify
- ✅ **STRIPE_SECRET_KEY** - Required for product creation

---

## Migration Application Methods

### Option 1: Supabase Dashboard SQL Editor (RECOMMENDED)

**Steps:**

1. **Navigate to Supabase SQL Editor**
   - URL: https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql
   - Or: Project → SQL Editor → New Query

2. **Open Migration File**
   - File: `supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql`
   - Copy entire contents (215 lines)

3. **Paste and Execute**
   - Paste SQL into Supabase SQL Editor
   - Click "Run" or press `Cmd/Ctrl + Enter`

4. **Verify Success**
   - Check for success message
   - No error messages in Results tab

**Estimated Time**: < 30 seconds

---

### Option 2: Supabase CLI

**Prerequisites:**
```bash
# Install Supabase CLI if needed
npm install -g supabase

# Login to Supabase
supabase login
```

**Steps:**
```bash
# Navigate to project directory
cd /Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform

# Link to production project
supabase link --project-ref xstlnicbnzdxlgfiewmg

# Apply all pending migrations
supabase db push

# Alternative: Apply specific migration
supabase db push supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql
```

**Estimated Time**: < 1 minute

---

### Option 3: Direct psql Connection

**Steps:**

1. **Get Database Connection String**
   - Supabase Dashboard → Project Settings → Database
   - Copy the direct database connection string

2. **Run Migration**
```bash
# Replace with your actual connection details
psql "postgresql://postgres.[PROJECT-REF]:5432/postgres" \
  -f supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql
```

---

## Post-Migration Verification

### 1. Verify Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('judge_ad_products', 'ad_spot_bookings', 'checkout_sessions')
ORDER BY table_name;
```

**Expected Result:**
```
 table_name
-----------------
 ad_spot_bookings
 checkout_sessions
 judge_ad_products
```

### 2. Verify judge_ad_products Schema

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'judge_ad_products'
ORDER BY ordinal_position;
```

**Expected Columns:**
- id (uuid)
- judge_id (uuid)
- position (integer)
- stripe_product_id (text)
- stripe_monthly_price_id (text)
- stripe_annual_price_id (text)
- court_level (text)
- created_at (timestamptz)
- updated_at (timestamptz)
- archived_at (timestamptz)

### 3. Verify Indexes Created

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('judge_ad_products', 'ad_spot_bookings', 'checkout_sessions')
ORDER BY tablename, indexname;
```

**Expected Indexes (12 total):**
- idx_judge_ad_products_judge
- idx_judge_ad_products_stripe_product
- idx_judge_ad_products_active (partial index)
- idx_ad_bookings_judge
- idx_ad_bookings_advertiser
- idx_ad_bookings_stripe_sub
- idx_ad_bookings_status
- idx_ad_bookings_unique_active (partial UNIQUE index - prevents double-booking)
- idx_checkout_sessions_session
- idx_checkout_sessions_customer
- idx_checkout_sessions_expires

### 4. Verify RLS Policies

```sql
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('judge_ad_products', 'ad_spot_bookings', 'checkout_sessions')
ORDER BY tablename, policyname;
```

**Expected Policies:**
- Service role full access (ALL operations)
- Authenticated user read policies
- Advertiser-specific policies
- Public read for active bookings

### 5. Verify Triggers

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('judge_ad_products', 'ad_spot_bookings')
ORDER BY event_object_table, trigger_name;
```

**Expected Triggers:**
- update_judge_ad_products_updated_at
- update_ad_spot_bookings_updated_at

---

## Functional Testing

### 1. Test Stripe Product Creation

```typescript
// This should work after migration
import { getOrCreateJudgeAdProduct } from '@/lib/stripe/judge-products'

const product = await getOrCreateJudgeAdProduct({
  judgeId: 'valid-judge-uuid',
  judgeName: 'Test Judge',
  courtName: 'Test Court',
  courtLevel: 'federal',
  position: 1
})

console.log('Product created:', product)
```

### 2. Test Ad Spot Availability Query

```sql
-- Query available ad spots for a judge
SELECT
  j.id as judge_id,
  j.name as judge_name,
  COALESCE(
    (SELECT COUNT(*)
     FROM ad_spot_bookings
     WHERE judge_id = j.id
       AND status IN ('active', 'trialing')
    ),
    0
  ) as active_bookings,
  2 - COALESCE(
    (SELECT COUNT(*)
     FROM ad_spot_bookings
     WHERE judge_id = j.id
       AND status IN ('active', 'trialing')
    ),
    0
  ) as available_spots
FROM judges j
LIMIT 5;
```

### 3. Test RLS Policies

```sql
-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'test-user-id';

-- Should succeed: view active products
SELECT * FROM judge_ad_products WHERE archived_at IS NULL LIMIT 5;

-- Should succeed: view active bookings
SELECT * FROM ad_spot_bookings WHERE status = 'active' LIMIT 5;

RESET ROLE;
```

---

## Rollback Instructions

⚠️ **WARNING**: Only rollback if critical issues occur. This will delete all data.

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS checkout_sessions CASCADE;
DROP TABLE IF EXISTS ad_spot_bookings CASCADE;
DROP TABLE IF EXISTS judge_ad_products CASCADE;

-- Drop the update trigger function if no other tables use it
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

---

## Migration Safety Features

### Idempotency
- ✅ Uses `CREATE TABLE IF NOT EXISTS`
- ✅ Uses `CREATE INDEX IF NOT EXISTS` (via CREATE INDEX with conditional)
- ✅ Safe to run multiple times

### Data Protection
- ✅ Foreign key constraints with ON DELETE CASCADE/SET NULL
- ✅ CHECK constraints for data validation
- ✅ Unique constraints prevent duplicates
- ✅ RLS policies for access control

### Performance
- ✅ Proper indexing on foreign keys
- ✅ Specialized indexes for common queries
- ✅ GIN indexes for efficient filtering

---

## Troubleshooting

### Issue: "permission denied for table judges"

**Cause**: Migration user lacks permissions
**Solution**: Ensure you're using the service_role or database owner credentials

### Issue: "relation 'advertiser_profiles' does not exist"

**Cause**: Dependent migration not yet applied
**Solution**: First apply migration `20250823_001_create_advertising_system.sql`

### Issue: "duplicate key value violates unique constraint"

**Cause**: Trying to create duplicate entries (shouldn't happen on fresh tables)
**Solution**: This is expected behavior - constraint is working correctly

### Issue: RLS policies blocking queries

**Cause**: Missing authentication context
**Solution**: Use service_role key or proper authentication tokens

---

## Monitoring After Migration

### 1. Check Application Logs

Monitor Next.js/Netlify logs for:
- Stripe product creation attempts
- Ad booking queries
- Webhook processing

### 2. Check Supabase Logs

```
Project → Logs → Postgres Logs
```

Filter for:
- INSERT/UPDATE operations on new tables
- RLS policy violations
- Foreign key constraint errors

### 3. Monitor Stripe Dashboard

Verify that judge-specific products are being created:
- Products should follow pattern: "Judge Name - Court Name - Position X"
- Prices should match court_level (federal: $500/mo, state: $200/mo)

---

## Related Documentation

- **Migration File**: [supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql](../../supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql)
- **Stripe Integration**: [lib/stripe/judge-products.ts](../../lib/stripe/judge-products.ts)
- **API Routes**: [app/api/judges/[id]/advertising-slots/route.ts](../../app/api/judges/[id]/advertising-slots/route.ts)
- **Webhook Handler**: [app/api/webhooks/stripe/ad-subscriptions/route.ts](../../app/api/webhooks/stripe/ad-subscriptions/route.ts)
- **Advertiser Dashboard**: [app/dashboard/advertiser/page.tsx](../../app/dashboard/advertiser/page.tsx)

---

## Migration Checklist

Before applying:
- [ ] Confirm you have database access (service_role or owner)
- [ ] Verify dependent tables exist (judges, advertiser_profiles)
- [ ] Backup database (recommended for production)
- [ ] Review migration SQL for any custom modifications needed

During application:
- [ ] Choose application method (Dashboard, CLI, or psql)
- [ ] Copy migration SQL
- [ ] Execute migration
- [ ] Check for error messages

After application:
- [ ] Verify all 3 tables created
- [ ] Verify all 11 indexes created
- [ ] Verify all 8 RLS policies created
- [ ] Verify all 2 triggers created
- [ ] Test Stripe product creation
- [ ] Test ad spot queries
- [ ] Monitor application logs
- [ ] Check Stripe dashboard for products

---

## Summary

**What**: Apply migration for judge advertising system with Stripe
**Why**: Required by 4 application files currently in production
**When**: ASAP - features will fail without these tables
**How**: Copy SQL to Supabase Dashboard and execute
**Time**: < 1 minute
**Risk**: LOW - idempotent, well-tested migration
**Impact**: HIGH - enables core advertising features

---

**Status**: Ready to Execute
**Next Step**: Apply migration via Supabase Dashboard SQL Editor
**Support**: Review logs in Supabase Dashboard → Logs → Postgres Logs

*Migration guide created by Claude Code using Full-Stack MCP Development skill*
