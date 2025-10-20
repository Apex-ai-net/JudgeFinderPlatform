# Stripe Billing Schema Verification Report

**Generated:** 2025-10-19
**Project:** JudgeFinder Platform
**Purpose:** Comprehensive database schema verification for Stripe billing integration

---

## Quick Start

### Option 1: Run via Supabase SQL Editor (Recommended)
1. Open your Supabase project: https://app.supabase.com/project/_/sql/new
2. Copy and paste the SQL from `VERIFY_STRIPE_BILLING_SCHEMA.sql`
3. Click "Run" to execute

### Option 2: Run via Supabase CLI
```bash
cd /Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform
supabase db execute -f docs/database/VERIFY_STRIPE_BILLING_SCHEMA.sql --local
```

---

## Expected Schema Overview

Based on the migration files, the following tables should exist:

### 1. **judge_ad_products**
**Purpose:** Cache Stripe product and price IDs for judge-specific ad spots

**Columns:**
- `id` (uuid, PRIMARY KEY)
- `judge_id` (uuid, REFERENCES judges)
- `position` (integer, CHECK IN (1, 2))
- `stripe_product_id` (text, UNIQUE)
- `stripe_monthly_price_id` (text)
- `stripe_annual_price_id` (text)
- `court_level` (text, CHECK IN ('federal', 'state'))
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `archived_at` (timestamptz)

**Indexes:**
- `idx_judge_ad_products_judge` ON (judge_id)
- `idx_judge_ad_products_stripe_product` ON (stripe_product_id)
- `idx_judge_ad_products_active` ON (judge_id) WHERE archived_at IS NULL

**RLS Policies:**
- Service role has full access
- Advertisers can view active products (SELECT)

---

### 2. **ad_spot_bookings**
**Purpose:** Track active and historical ad spot bookings with Stripe subscriptions

**Columns:**
- `id` (uuid, PRIMARY KEY)
- `judge_id` (uuid, REFERENCES judges)
- `advertiser_id` (uuid, REFERENCES advertiser_profiles)
- `stripe_subscription_id` (text, UNIQUE)
- `stripe_product_id` (text)
- `stripe_customer_id` (text)
- `position` (integer, CHECK IN (1, 2))
- `court_level` (text, CHECK IN ('federal', 'state'))
- `billing_interval` (text, CHECK IN ('monthly', 'annual'))
- `monthly_price` (decimal(10,2))
- `status` (text, CHECK IN ('active', 'past_due', 'canceled', 'paused', 'incomplete', 'trialing'))
- `start_date` (timestamptz)
- `end_date` (timestamptz)
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `cancel_at_period_end` (boolean)
- `canceled_at` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `metadata` (jsonb)

**Indexes:**
- `idx_ad_bookings_judge` ON (judge_id)
- `idx_ad_bookings_advertiser` ON (advertiser_id)
- `idx_ad_bookings_stripe_sub` ON (stripe_subscription_id)
- `idx_ad_bookings_status` ON (status)
- `idx_ad_bookings_unique_active` UNIQUE ON (judge_id, position) WHERE status IN ('active', 'trialing', 'past_due')

**RLS Policies:**
- Service role has full access
- Advertisers can view own bookings (SELECT)
- Advertisers can update own bookings (UPDATE)
- Public can view active bookings (SELECT) - for displaying ads

---

### 3. **checkout_sessions**
**Purpose:** Temporary storage for linking checkout sessions to subscriptions

**Columns:**
- `id` (uuid, PRIMARY KEY)
- `stripe_session_id` (text, UNIQUE)
- `stripe_customer_id` (text)
- `stripe_subscription_id` (text)
- `metadata` (jsonb)
- `created_at` (timestamptz)
- `expires_at` (timestamptz, DEFAULT now() + 24 hours)

**Indexes:**
- `idx_checkout_sessions_session` ON (stripe_session_id)
- `idx_checkout_sessions_customer` ON (stripe_customer_id)
- `idx_checkout_sessions_expires` ON (expires_at)

**RLS Policies:**
- Service role has full access

---

### 4. **organizations** (Billing Columns)
**Purpose:** Team/workspace billing with Stripe integration

**Billing-Related Columns:**
- `stripe_customer_id` (text, UNIQUE)
- `stripe_subscription_id` (text, UNIQUE)
- `subscription_tier` (text, CHECK IN ('FREE', 'PRO', 'ENTERPRISE'))
- `subscription_status` (text, CHECK IN ('trial', 'active', 'past_due', 'canceled', 'paused'))
- `billing_interval` (text, CHECK IN ('monthly', 'annual'))
- `seats` (integer)
- `used_seats` (integer)
- `api_calls_used` (integer)
- `api_calls_limit` (integer)
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `trial_ends_at` (timestamptz)
- `cancel_at_period_end` (boolean)
- `canceled_at` (timestamptz)
- `payment_method_id` (text)
- `payment_method_brand` (text)
- `payment_method_last4` (text)
- `billing_email` (text)
- `billing_name` (text)

**Indexes:**
- `idx_organizations_stripe_customer` ON (stripe_customer_id)
- `idx_organizations_stripe_subscription` ON (stripe_subscription_id)
- `idx_organizations_tier` ON (subscription_tier)
- `idx_organizations_status` ON (subscription_status)

**RLS Policies:**
- Members can view their organizations (SELECT)
- Admins can update their organizations (UPDATE)

---

### 5. **invoices**
**Purpose:** Stripe invoice history for organizations

**Columns:**
- `id` (uuid, PRIMARY KEY)
- `organization_id` (uuid, REFERENCES organizations)
- `stripe_invoice_id` (text, UNIQUE)
- `stripe_customer_id` (text)
- `amount` (decimal(10,2))
- `currency` (text, DEFAULT 'usd')
- `status` (text, CHECK IN ('draft', 'open', 'paid', 'uncollectible', 'void', 'failed'))
- `invoice_pdf` (text)
- `hosted_invoice_url` (text)
- `paid_at` (timestamptz)
- `attempt_count` (integer)
- `next_payment_attempt` (timestamptz)
- `period_start` (timestamptz)
- `period_end` (timestamptz)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Indexes:**
- `idx_invoices_organization` ON (organization_id)
- `idx_invoices_stripe_id` ON (stripe_invoice_id)
- `idx_invoices_status` ON (status)
- `idx_invoices_paid_at` ON (paid_at)

**RLS Policies:**
- Members can view organization invoices (SELECT)

---

### 6. **webhook_logs**
**Purpose:** Audit log for Stripe webhook events

**Columns:**
- `id` (uuid, PRIMARY KEY)
- `event_id` (text, UNIQUE)
- `event_type` (text)
- `status` (text, CHECK IN ('success', 'failed', 'pending'))
- `error_message` (text)
- `payload` (jsonb)
- `created_at` (timestamptz)

**Indexes:**
- `idx_webhook_logs_event_id` ON (event_id)
- `idx_webhook_logs_event_type` ON (event_type)
- `idx_webhook_logs_status` ON (status)
- `idx_webhook_logs_created` ON (created_at)

**RLS Policies:**
- Service role only (no public access)

---

### 7. **ad_orders** (Status: Unknown)
**Note:** This table is mentioned in your request but does not appear in the migration files. It may be:
- ❌ Not yet created
- ⚠️ Legacy/deprecated table
- 📝 Planned for future implementation

**Action Required:** Verify if this table should exist and check application code references.

---

## Required Database Functions

### 1. **update_updated_at_column()**
**Purpose:** Automatically update `updated_at` timestamp on row updates

**Definition:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Triggers:**
- `update_judge_ad_products_updated_at` ON judge_ad_products
- `update_ad_spot_bookings_updated_at` ON ad_spot_bookings
- `update_organizations_updated_at` ON organizations
- `update_invoices_updated_at` ON invoices

---

### 2. **requesting_user_id()**
**Purpose:** Get the current user's ID for RLS policies

**Note:** This function is not explicitly defined in the migration files but may be part of the auth schema or custom implementation.

**Action Required:** Verify if this function exists or if RLS policies use `auth.uid()` instead.

---

## Verification Checklist

Run the verification SQL script and check the following:

### Table Existence
- [ ] judge_ad_products exists
- [ ] ad_spot_bookings exists
- [ ] checkout_sessions exists
- [ ] organizations exists (with billing columns)
- [ ] invoices exists
- [ ] webhook_logs exists
- [ ] ad_orders status determined

### RLS Configuration
- [ ] All tables have RLS enabled
- [ ] Service role policies exist on all tables
- [ ] User-facing policies are properly scoped
- [ ] Anonymous policies are restricted to active bookings only

### Indexes
- [ ] All foreign key columns are indexed
- [ ] Stripe ID columns are indexed
- [ ] Status columns are indexed
- [ ] Partial unique index on ad_spot_bookings prevents double-booking

### Functions & Triggers
- [ ] update_updated_at_column() function exists
- [ ] Triggers attached to all tables with updated_at columns
- [ ] Organization seat management functions exist
- [ ] Usage tracking functions exist (if applicable)

### Data Integrity
- [ ] Foreign key constraints are properly set
- [ ] CHECK constraints on enum columns
- [ ] UNIQUE constraints on Stripe IDs
- [ ] NOT NULL constraints on required fields

---

## Common Issues & Solutions

### Issue 1: Tables Don't Exist
**Symptom:** Verification shows tables as MISSING

**Solution:**
```bash
# Apply migrations in order
cd /Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform
supabase migration up
```

Or via SQL Editor:
1. Run `20250118000000_organization_billing.sql`
2. Run `20250119000000_judge_ad_products_and_bookings.sql`

---

### Issue 2: RLS Not Enabled
**Symptom:** RLS status shows DISABLED

**Solution:**
```sql
ALTER TABLE judge_ad_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_spot_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
```

---

### Issue 3: Missing Indexes
**Symptom:** Query performance is slow, indexes missing in verification

**Solution:** Re-run the migration files or manually create indexes as shown in the schema definitions above.

---

### Issue 4: Function Already Exists
**Symptom:** Error when creating `update_updated_at_column()`

**Solution:**
```sql
-- Drop and recreate
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
-- Then create as shown in migration
```

---

## Test Queries

After verification, run these test queries to ensure everything works:

```sql
-- Test 1: Check active judge ad products
SELECT
  judge_id,
  position,
  court_level,
  stripe_product_id
FROM judge_ad_products
WHERE archived_at IS NULL
LIMIT 5;

-- Test 2: Check active ad bookings
SELECT
  judge_id,
  position,
  status,
  billing_interval,
  monthly_price
FROM ad_spot_bookings
WHERE status IN ('active', 'trialing')
LIMIT 5;

-- Test 3: Check organization billing status
SELECT
  name,
  subscription_tier,
  subscription_status,
  used_seats,
  seats
FROM organizations
WHERE subscription_status = 'active'
LIMIT 5;

-- Test 4: Check recent webhook events
SELECT
  event_type,
  status,
  created_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 10;

-- Test 5: Verify RLS is working (should return only user's data)
SET ROLE authenticated;
SELECT COUNT(*) FROM ad_spot_bookings;
RESET ROLE;
```

---

## Migration Files Reference

1. **Organization Billing:**
   `/supabase/migrations/20250118000000_organization_billing.sql`

2. **Judge Ad Products & Bookings:**
   `/supabase/migrations/20250119000000_judge_ad_products_and_bookings.sql`

3. **Verification Script:**
   `/docs/database/VERIFY_STRIPE_BILLING_SCHEMA.sql`

---

## Next Steps

1. **Run the verification SQL** in Supabase SQL Editor
2. **Review the output** and check for any MISSING or DISABLED items
3. **Apply missing migrations** if tables don't exist
4. **Enable RLS** on any tables showing DISABLED
5. **Test the application** to ensure billing flows work end-to-end
6. **Monitor webhook_logs** for any Stripe integration issues

---

## Support & Troubleshooting

If you encounter issues:

1. Check Supabase logs: https://app.supabase.com/project/_/logs/explorer
2. Review migration history in `supabase_migrations` table
3. Verify environment variables are set correctly
4. Check Stripe webhook configuration matches `STRIPE_WEBHOOK_SECRET`

---

**Last Updated:** 2025-10-19
**Maintained By:** JudgeFinder Platform Team
