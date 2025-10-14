# Ad Purchase Deployment Guide

**Last Updated:** October 13, 2025
**Target Audience:** DevOps Engineers
**Version:** 1.0.0

## Table of Contents

1. [Deployment Checklist](#deployment-checklist)
2. [Environment Variables](#environment-variables)
3. [Database Migration](#database-migration)
4. [Stripe Product Configuration](#stripe-product-configuration)
5. [Deployment Steps](#deployment-steps)
6. [Smoke Testing](#smoke-testing)
7. [Monitoring](#monitoring)
8. [Rollback Plan](#rollback-plan)

---

## Deployment Checklist

Use this checklist to ensure all prerequisites are met before deploying the Stripe ad purchase integration.

### Pre-Deployment

- [ ] **Code Review**: All pull requests reviewed and approved
- [ ] **Tests Passing**: All unit and integration tests passing locally
- [ ] **Documentation Updated**: All documentation current and accurate
- [ ] **Stripe Account Ready**: Account active with API access
- [ ] **Database Backup**: Recent backup of production database available
- [ ] **Monitoring Setup**: Error tracking and logging configured

### Stripe Configuration

- [ ] **Stripe Product Created**: Ad space product configured in Stripe
- [ ] **Pricing Set**: Price ID obtained for `STRIPE_PRICE_ADSPACE`
- [ ] **Test Mode Validated**: Tested in Stripe test mode
- [ ] **Live Mode Ready**: Ready to switch to live mode

### Webhook Configuration

- [ ] **Webhook Endpoint Created**: Webhook configured in Stripe Dashboard
- [ ] **Events Selected**: `checkout.session.completed`, `checkout.session.expired`
- [ ] **Signing Secret Obtained**: Webhook signing secret copied
- [ ] **Test Webhook Sent**: Test webhook successfully delivered

### Environment Configuration

- [ ] **Environment Variables Set**: All required variables in Netlify
- [ ] **Secrets Secure**: No secrets committed to version control
- [ ] **Production Keys Used**: Live mode keys for production deployment
- [ ] **URLs Correct**: Application URLs point to production domain

### Database

- [ ] **Migration Applied**: `20251013_001_ad_orders_table.sql` executed
- [ ] **Table Created**: `ad_orders` table exists
- [ ] **Indexes Created**: All indexes created successfully
- [ ] **RLS Policies Active**: Row-level security policies enabled
- [ ] **Service Role Access**: Service role can insert orders

### Testing

- [ ] **Unit Tests Pass**: 53 unit tests passing (100% coverage)
- [ ] **Integration Tests Pass**: 19 integration tests passing
- [ ] **Smoke Tests Ready**: Smoke test plan prepared
- [ ] **Test Data Ready**: Test credit cards and data available

### Post-Deployment

- [ ] **Deployment Successful**: Code deployed to production
- [ ] **Smoke Tests Pass**: All smoke tests passing
- [ ] **Monitoring Active**: Logs and metrics being collected
- [ ] **Alerts Configured**: Alert thresholds set
- [ ] **Team Notified**: Relevant stakeholders informed
- [ ] **Documentation Published**: User-facing docs available

---

## Environment Variables

### Required Variables

Configure these environment variables in Netlify before deploying:

| Variable                        | Description               | Where to Get                                          | Example                   |
| ------------------------------- | ------------------------- | ----------------------------------------------------- | ------------------------- |
| `STRIPE_SECRET_KEY`             | Stripe API secret key     | Stripe Dashboard → Developers → API Keys              | `sk_live_51ABC...`        |
| `STRIPE_WEBHOOK_SECRET`         | Webhook signing secret    | Stripe Dashboard → Developers → Webhooks → [Endpoint] | `whsec_XYZ789...`         |
| `STRIPE_PRICE_ADSPACE`          | Price ID for ad products  | Stripe Dashboard → Products → [Product]               | `price_1DEF456...`        |
| `NEXT_PUBLIC_APP_URL`           | Application base URL      | Your domain                                           | `https://judgefinder.io`  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL      | Supabase Dashboard → Settings → API                   | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key    | Supabase Dashboard → Settings → API                   | `eyJhbG...`               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key | Supabase Dashboard → Settings → API                   | `eyJhbG...`               |

### Setting Variables in Netlify Dashboard

#### Option 1: Netlify Dashboard UI

1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Select the JudgeFinder site
3. Click **Site settings**
4. Click **Environment variables**
5. Click **Add a variable**
6. Enter key and value
7. Select scopes (Production, Deploy Previews, Branch deploys)
8. Click **Save**

#### Option 2: Netlify CLI

```bash
# Install Netlify CLI if not already installed
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to site
netlify link

# Set environment variables
netlify env:set STRIPE_SECRET_KEY "sk_live_51ABC..."
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_XYZ789..."
netlify env:set STRIPE_PRICE_ADSPACE "price_1DEF456..."
netlify env:set NEXT_PUBLIC_APP_URL "https://judgefinder.io"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbG..."

# Verify variables are set
netlify env:list
```

#### Option 3: netlify.toml (Not Recommended for Secrets)

**Warning:** Only use for non-sensitive configuration. Never commit secrets to version control.

```toml
[build.environment]
  NEXT_PUBLIC_APP_URL = "https://judgefinder.io"
  # DO NOT add secret keys here!
```

### Environment Variable Verification

After setting variables, verify they're accessible:

```bash
# Using Netlify CLI
netlify env:list

# Expected output:
# STRIPE_SECRET_KEY: sk_live_51ABC... (Production)
# STRIPE_WEBHOOK_SECRET: whsec_XYZ789... (Production)
# STRIPE_PRICE_ADSPACE: price_1DEF456... (Production)
# ...
```

### Test vs Production Values

| Environment           | Stripe Keys   | Webhook Secret      | App URL                          |
| --------------------- | ------------- | ------------------- | -------------------------------- |
| **Local Development** | `sk_test_...` | `whsec_test_...`    | `http://localhost:3000`          |
| **Staging**           | `sk_test_...` | `whsec_staging_...` | `https://staging.judgefinder.io` |
| **Production**        | `sk_live_...` | `whsec_prod_...`    | `https://judgefinder.io`         |

**Important:** Use test mode keys for development and staging. Only use live mode keys in production.

---

## Database Migration

### Migration File

**Location:** `/Users/tannerosterkamp/JudgeFinder/JudgeFinderPlatform/supabase/migrations/20251013_001_ad_orders_table.sql`

### Prerequisites

- [ ] Supabase project accessible
- [ ] Database credentials available
- [ ] Backup of database completed
- [ ] Migration file reviewed

### Option 1: Supabase Dashboard

1. **Navigate to SQL Editor:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Click **SQL Editor** in sidebar

2. **Load Migration:**
   - Click **New query**
   - Copy contents of `20251013_001_ad_orders_table.sql`
   - Paste into SQL editor

3. **Execute Migration:**
   - Click **Run** button
   - Wait for completion
   - Check for errors in output

4. **Verify Success:**
   - Check "Query executed successfully" message
   - View results showing tables created

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to project
supabase link --project-ref your-project-ref

# Apply migration
supabase db push

# Verify migration applied
supabase db diff
```

### Option 3: Direct Database Connection

```bash
# Connect to database
psql "postgresql://postgres:[password]@[host]:5432/postgres"

# Run migration
\i supabase/migrations/20251013_001_ad_orders_table.sql

# Exit
\q
```

### Verification Queries

After running migration, execute these queries to verify:

#### 1. Table Exists

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'ad_orders'
);
-- Expected: true
```

#### 2. Columns Exist

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ad_orders'
ORDER BY ordinal_position;

-- Expected: 18 columns
```

#### 3. Indexes Created

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'ad_orders';

-- Expected: 6 indexes
-- - ad_orders_pkey (primary key)
-- - idx_ad_orders_stripe_session
-- - idx_ad_orders_email
-- - idx_ad_orders_status
-- - idx_ad_orders_created_at
-- - idx_ad_orders_ad_type
```

#### 4. RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'ad_orders';

-- Expected: rowsecurity = true
```

#### 5. Policies Exist

```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'ad_orders';

-- Expected: 3 policies
-- - Service role has full access to ad_orders
-- - Admins can view all ad orders
-- - Users can view their own ad orders
```

#### 6. Triggers Exist

```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'ad_orders';

-- Expected: update_ad_orders_updated_at trigger
```

### Test Insert

Verify service role can insert records:

```sql
INSERT INTO ad_orders (
  stripe_session_id,
  organization_name,
  customer_email,
  ad_type,
  amount_total,
  currency,
  status
) VALUES (
  'test_migration_' || gen_random_uuid()::text,
  'Test Organization',
  'test@example.com',
  'judge-profile',
  29900,
  'usd',
  'paid'
) RETURNING id;

-- Expected: Returns UUID of inserted row
```

Clean up test data:

```sql
DELETE FROM ad_orders WHERE organization_name = 'Test Organization';
```

### Rollback Procedure

If migration fails or needs to be rolled back:

```sql
-- Drop table (WARNING: Deletes all data)
DROP TABLE IF EXISTS public.ad_orders CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS public.update_ad_orders_updated_at() CASCADE;

-- Verify cleanup
SELECT tablename FROM pg_tables WHERE tablename = 'ad_orders';
-- Expected: 0 rows
```

**Note:** Always backup data before rollback.

---

## Stripe Product Configuration

### Create Ad Space Product

#### Step 1: Create Product

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Live mode** (for production deployment)
3. Click **Products** in left sidebar
4. Click **+ Add product**
5. Fill in details:
   - **Name**: `JudgeFinder Ad Space`
   - **Description**: `Premium advertising placement on JudgeFinder.io for legal professionals`
   - **Image**: Upload company logo (optional)
6. Click **Save product**

#### Step 2: Create Pricing

1. Under **Pricing** section, click **Add pricing**
2. Configure pricing:
   - **Model**: One time
   - **Price**: `$299.00` (or your pricing)
   - **Billing period**: N/A (one-time payment)
   - **Currency**: USD
3. Click **Add pricing**

**Note:** You can create multiple price points for different ad types (judge-profile, court-listing, featured-spot) or use metadata to differentiate.

#### Step 3: Copy Price ID

1. After creating pricing, view the product
2. Find the **API ID** under pricing
3. Copy the Price ID (starts with `price_`)
4. Save for environment variable configuration

Example: `price_1NABCDEF123456789`

### Product Configuration Options

#### Option A: Single Product with Metadata

**Recommended approach:**

- Single product: "JudgeFinder Ad Space"
- Single price: $299.00
- Differentiate ad types using metadata in checkout session
- Simpler configuration
- Easier to manage

#### Option B: Multiple Products

Alternative approach:

- Product 1: "Judge Profile Ad" - $299/month
- Product 2: "Court Listing Ad" - $199/month
- Product 3: "Featured Spot" - $499/month
- Different price IDs for each
- More complex configuration
- Better reporting by ad type

### Test Mode Configuration

Before production, test in test mode:

1. Switch Stripe Dashboard to **Test mode**
2. Create test product with same configuration
3. Copy test price ID
4. Use in staging environment
5. Validate checkout flow with test cards
6. Verify webhook delivery

---

## Deployment Steps

### Complete Deployment Procedure

Follow these steps in order to deploy the ad purchase integration to production.

### Step 1: Pre-Deployment Verification

```bash
# Ensure on correct branch
git checkout main
git pull origin main

# Run all tests
npm run test

# Expected output:
# ✓ 53 unit tests passed
# ✓ 19 integration tests passed
# Coverage: 100%

# Check for linting errors
npm run lint

# Build production bundle
npm run build

# Expected: Build succeeds with no errors
```

### Step 2: Create Stripe Product

Follow [Stripe Product Configuration](#stripe-product-configuration) section:

1. Create product in Stripe Dashboard (Live mode)
2. Set pricing ($299.00 or as configured)
3. Copy Price ID
4. Save for next step

**Checkpoint:** Price ID obtained (e.g., `price_1ABC...`)

### Step 3: Configure Webhook

Follow [Webhook Setup Guide](./WEBHOOK_SETUP.md):

1. Create webhook endpoint in Stripe
2. URL: `https://judgefinder.io/api/stripe/webhook`
3. Events: `checkout.session.completed`, `checkout.session.expired`
4. Copy webhook signing secret
5. Save for next step

**Checkpoint:** Webhook signing secret obtained (e.g., `whsec_...`)

### Step 4: Set Environment Variables in Netlify

```bash
# Using Netlify CLI
netlify login
netlify link

# Set all required variables
netlify env:set STRIPE_SECRET_KEY "sk_live_YOUR_KEY"
netlify env:set STRIPE_WEBHOOK_SECRET "whsec_YOUR_SECRET"
netlify env:set STRIPE_PRICE_ADSPACE "price_YOUR_PRICE_ID"
netlify env:set NEXT_PUBLIC_APP_URL "https://judgefinder.io"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "YOUR_SERVICE_KEY"

# Verify all variables set
netlify env:list

# Expected: All 7 required variables present
```

**Checkpoint:** All environment variables configured

### Step 5: Run Database Migration

```bash
# Option 1: Using Supabase CLI
supabase login
supabase link --project-ref your-project-ref
supabase db push

# Option 2: Using Supabase Dashboard
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Copy migration file contents
# 3. Execute migration
# 4. Verify success
```

Verify migration:

```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'ad_orders';
-- Expected: 1
```

**Checkpoint:** Database migration completed successfully

### Step 6: Deploy Code

```bash
# Commit any final changes
git add .
git commit -m "feat: add Stripe ad purchase integration"

# Push to main branch (triggers Netlify deploy)
git push origin main

# Or trigger manual deploy via Netlify CLI
netlify deploy --prod

# Monitor deployment
netlify open:site
```

**Checkpoint:** Code deployed to production

### Step 7: Verify Deployment

Check deployment status:

```bash
# View recent deploy
netlify status

# Expected output:
# Current site: judgefinder
# Deploy state: ready
# Site URL: https://judgefinder.io
```

Check functions deployed:

1. Go to Netlify Dashboard → Functions
2. Verify functions present:
   - `api/checkout/adspace`
   - `api/stripe/webhook`

**Checkpoint:** Deployment successful

### Step 8: Run Smoke Tests

Execute smoke tests from [Smoke Testing](#smoke-testing) section:

- [ ] Checkout endpoint responds
- [ ] Webhook endpoint responds
- [ ] Database operations work
- [ ] Purchase form loads
- [ ] End-to-end test completes

**Checkpoint:** All smoke tests passing

### Step 9: Monitor Logs

Check initial logs for errors:

```bash
# Using Netlify CLI
netlify logs

# Or in Netlify Dashboard
# Go to: Deploys → Functions → Logs
```

Look for:

- No startup errors
- Configuration loaded correctly
- Functions responding to requests

**Checkpoint:** No errors in logs

### Step 10: Enable Production Monitoring

1. **Sentry**: Verify error tracking active
2. **Stripe Dashboard**: Monitor webhook deliveries
3. **Supabase Dashboard**: Check database performance
4. **Netlify Analytics**: Monitor traffic and errors

**Checkpoint:** Monitoring active

### Step 11: Notify Team

Send deployment notification:

**To:** Engineering team, product managers, support team

**Subject:** Stripe Ad Purchase Integration Deployed to Production

**Body:**

```
The Stripe ad purchase integration has been deployed to production.

Deployment Details:
- Deployment time: [timestamp]
- Git commit: [commit hash]
- Deployed by: [your name]

Features Enabled:
- Ad space purchase at judgefinder.io/ads/buy
- Stripe checkout integration
- Automated order processing
- Email confirmations (coming soon)

Monitoring:
- Sentry: [link]
- Stripe Dashboard: [link]
- Netlify Dashboard: [link]

Documentation:
- User Guide: /docs/AD_PURCHASE_USER_GUIDE.md
- Technical Guide: /docs/STRIPE_INTEGRATION.md

Please report any issues to dev@judgefinder.io
```

**Checkpoint:** Team notified

---

## Smoke Testing

### Smoke Test Plan

Execute these tests immediately after deployment to verify basic functionality.

### Test 1: Checkout Endpoint Health

**Objective:** Verify checkout endpoint is accessible and returns appropriate errors.

```bash
# Test 1: Endpoint responds
curl -X POST https://judgefinder.io/api/checkout/adspace \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 Bad Request
# Expected body: {"error":"Missing required fields..."}

# Test 2: Rate limiting works
for i in {1..12}; do
  curl -X POST https://judgefinder.io/api/checkout/adspace \
    -H "Content-Type: application/json" \
    -d '{"organization_name":"Test","email":"test@example.com","ad_type":"judge-profile"}'
done

# Expected: First 10 succeed, last 2 return 429
```

**Pass Criteria:**

- [ ] Endpoint responds (not 404)
- [ ] Returns appropriate error for missing fields
- [ ] Rate limiting enforced after 10 requests

### Test 2: Webhook Endpoint Health

**Objective:** Verify webhook endpoint is accessible.

```bash
# Test webhook endpoint
curl -X POST https://judgefinder.io/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Expected: 400 Bad Request
# Expected body: {"error":"Missing signature"}
```

**Pass Criteria:**

- [ ] Endpoint responds (not 404)
- [ ] Returns error for missing signature (correct behavior)

### Test 3: Database Operations

**Objective:** Verify database connection and operations work.

```sql
-- Connect to production database
-- Execute test insert
INSERT INTO ad_orders (
  stripe_session_id,
  organization_name,
  customer_email,
  ad_type,
  amount_total,
  currency,
  status
) VALUES (
  'smoke_test_' || gen_random_uuid()::text,
  'Smoke Test Org',
  'smoke@test.com',
  'judge-profile',
  29900,
  'usd',
  'paid'
) RETURNING id;

-- Expected: Returns UUID

-- Query inserted record
SELECT * FROM ad_orders WHERE organization_name = 'Smoke Test Org';

-- Expected: 1 row returned

-- Clean up
DELETE FROM ad_orders WHERE organization_name = 'Smoke Test Org';

-- Expected: 1 row deleted
```

**Pass Criteria:**

- [ ] Insert succeeds
- [ ] Query returns data
- [ ] Delete succeeds

### Test 4: Purchase Form UI

**Objective:** Verify UI loads and form is functional.

1. **Navigate to purchase page:**
   - Open browser
   - Go to `https://judgefinder.io/ads/buy`

2. **Verify page loads:**
   - [ ] Page loads without errors
   - [ ] Form fields visible
   - [ ] Pricing information displayed
   - [ ] No console errors

3. **Test form validation:**
   - [ ] Submit empty form → shows validation errors
   - [ ] Enter invalid email → shows error
   - [ ] Select ad type → no errors

**Pass Criteria:**

- [ ] Page loads successfully
- [ ] Form validation works
- [ ] No JavaScript errors

### Test 5: End-to-End Purchase Flow

**Objective:** Complete full purchase flow with test card.

**Warning:** This will create a real order in Stripe (in test mode, if using test keys).

1. **Start purchase:**
   - Navigate to `https://judgefinder.io/ads/buy`
   - Fill form:
     - Organization: "Smoke Test Law Firm"
     - Email: "smoke-test@example.com"
     - Ad Type: "judge-profile"
     - Notes: "E2E smoke test"
   - Click "Continue to Payment"

2. **Complete Stripe checkout:**
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - Name: "Test User"
   - Complete checkout

3. **Verify redirect:**
   - [ ] Redirects to success page
   - [ ] Success message displayed
   - [ ] Order ID shown

4. **Verify webhook:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Check recent deliveries
   - [ ] Webhook delivered with 200 status

5. **Verify database:**

   ```sql
   SELECT * FROM ad_orders
   WHERE customer_email = 'smoke-test@example.com'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

   - [ ] Order exists in database
   - [ ] Status is 'paid'
   - [ ] Amount is correct

6. **Clean up:**
   ```sql
   DELETE FROM ad_orders
   WHERE customer_email = 'smoke-test@example.com';
   ```

**Pass Criteria:**

- [ ] Checkout session created
- [ ] Payment completed
- [ ] Redirected to success page
- [ ] Webhook delivered
- [ ] Order in database

### Smoke Test Summary

Create a summary report:

```
Smoke Test Results - [Date] [Time]

Test 1: Checkout Endpoint Health
Status: PASS
Notes: Endpoint responding correctly, rate limiting enforced

Test 2: Webhook Endpoint Health
Status: PASS
Notes: Endpoint accessible, signature verification working

Test 3: Database Operations
Status: PASS
Notes: Insert, select, delete all working

Test 4: Purchase Form UI
Status: PASS
Notes: Form loads, validation working, no errors

Test 5: End-to-End Purchase Flow
Status: PASS
Notes: Complete purchase flow successful
Session ID: cs_test_abc123...
Order ID: [uuid]

Overall Status: PASS
Deployed by: [name]
Deployment time: [timestamp]
Git commit: [hash]

Issues Found: None
```

---

## Monitoring

### Monitoring Setup

Configure monitoring systems to track performance and errors.

### Sentry Error Tracking

**Setup:**

1. Ensure Sentry DSN is configured:

   ```bash
   netlify env:set NEXT_PUBLIC_SENTRY_DSN "https://[key]@sentry.io/[project]"
   ```

2. Verify Sentry initialization in code:

   ```typescript
   // app/layout.tsx or _app.tsx
   import * as Sentry from '@sentry/nextjs'

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
   })
   ```

**Monitor:**

- Go to [Sentry Dashboard](https://sentry.io)
- Filter by project: JudgeFinder
- Set up alerts for:
  - Webhook verification failures
  - Database errors
  - Checkout session errors
  - High error rates

### Stripe Dashboard Monitoring

**Key Metrics:**

1. **Webhook Delivery:**
   - Go to Developers → Webhooks → [Your Endpoint]
   - Monitor success rate (should be >99%)
   - Check response times (should be <5s)

2. **Payment Success Rate:**
   - Go to Payments
   - Filter by product: "JudgeFinder Ad Space"
   - Monitor conversion rate
   - Track failed payments

3. **Revenue:**
   - Go to Payments → Overview
   - Track total revenue from ad sales
   - Monitor trends

**Set Up Alerts:**

1. Go to Settings → Notifications
2. Enable:
   - Failed webhook deliveries
   - High webhook failure rate
   - Disputed payments

### Supabase Monitoring

**Database Performance:**

1. Go to Supabase Dashboard
2. Click **Database** → **Logs**
3. Monitor:
   - Query performance
   - Insert operations
   - RLS policy evaluations
   - Connection counts

**Set Up Alerts:**

- Slow query alerts (>1s)
- High error rates
- Connection pool exhaustion

### Netlify Monitoring

**Function Performance:**

1. Go to Netlify Dashboard
2. Click **Functions**
3. Monitor:
   - Invocation count
   - Execution duration
   - Error rate
   - Cold starts

**Analytics:**

1. Click **Analytics**
2. Monitor:
   - Page views on `/ads/buy`
   - Conversion rate
   - Traffic sources
   - User behavior

### Custom Monitoring

**Create dashboards for:**

1. **Purchase Funnel:**
   - Page views on `/ads/buy`
   - Checkout sessions created
   - Completed payments
   - Orders created in database
   - Conversion rate

2. **Revenue Tracking:**
   - Total orders by day/week/month
   - Revenue by ad type
   - Average order value
   - Refund rate

3. **Error Tracking:**
   - Webhook verification failures
   - Database insert failures
   - Rate limit hits
   - Checkout errors

### Log Aggregation

**Recommended tools:**

- **Datadog**: Full observability platform
- **LogRocket**: Session replay and monitoring
- **Better Stack** (formerly Logtail): Log management

**Key logs to track:**

```typescript
// Successful checkout
logger.info('Checkout session created', {
  session_id,
  organization_name,
  ad_type,
  amount,
})

// Successful webhook
logger.info('Order created successfully', {
  order_id,
  session_id,
  amount,
})

// Errors
logger.error('Webhook verification failed', { error })
logger.error('Database insert failed', { error })
```

### Alerting Thresholds

Configure alerts for:

| Metric               | Threshold    | Severity | Action                     |
| -------------------- | ------------ | -------- | -------------------------- |
| Webhook failure rate | >5%          | High     | Investigate immediately    |
| Checkout error rate  | >10%         | High     | Check Stripe configuration |
| Database errors      | >3 in 1 hour | Critical | Check database health      |
| Response time        | >3 seconds   | Medium   | Optimize queries           |
| Rate limit hits      | >50 per hour | Low      | Review rate limits         |

---

## Rollback Plan

### When to Rollback

Consider rollback if:

- Critical bugs affecting purchases
- High error rates (>20%)
- Data integrity issues
- Security vulnerabilities discovered
- Payment processing failures

### Rollback Procedure

#### Option 1: Quick Rollback (Recommended)

Revert to previous deployment:

```bash
# Using Netlify Dashboard
# 1. Go to Deploys tab
# 2. Find last stable deploy
# 3. Click "..." menu
# 4. Click "Publish deploy"
# 5. Confirm

# Using Netlify CLI
netlify api listSiteDeploys --data='{"site_id":"YOUR_SITE_ID"}'
netlify api restoreSiteDeploy --data='{"deploy_id":"PREVIOUS_DEPLOY_ID"}'
```

**Timeline:** 2-5 minutes

#### Option 2: Git Revert

Revert changes via Git:

```bash
# Find commit to revert
git log --oneline

# Revert the deploy commit
git revert [commit-hash]

# Push revert
git push origin main

# This triggers new deploy with reverted changes
```

**Timeline:** 5-10 minutes

#### Option 3: Disable Features

Disable Stripe features without full rollback:

```bash
# Remove Stripe environment variables
netlify env:unset STRIPE_SECRET_KEY
netlify env:unset STRIPE_WEBHOOK_SECRET
netlify env:unset STRIPE_PRICE_ADSPACE

# Trigger redeploy
netlify deploy --prod

# The application will detect missing config and disable Stripe features
```

**Timeline:** 2-5 minutes

### Post-Rollback Steps

1. **Verify rollback successful:**
   - Check site is accessible
   - Verify previous functionality working
   - Confirm Stripe features disabled/removed

2. **Notify stakeholders:**

   ```
   Subject: Stripe Integration Rolled Back

   The Stripe ad purchase integration has been rolled back due to [reason].

   Impact:
   - Ad purchase functionality temporarily unavailable
   - Previous features fully functional
   - No data loss

   Next Steps:
   - Investigation in progress
   - Fix expected: [timeframe]
   - Redeployment planned: [date/time]

   Contact dev@judgefinder.io for questions.
   ```

3. **Investigate issue:**
   - Review error logs
   - Analyze failed transactions
   - Identify root cause
   - Document findings

4. **Fix and redeploy:**
   - Fix identified issues
   - Test thoroughly in staging
   - Run full test suite
   - Redeploy following deployment steps

### Database Rollback

If database migration needs rollback:

```sql
-- DANGER: This deletes all order data
-- Only execute if absolutely necessary

-- Drop table
DROP TABLE IF EXISTS public.ad_orders CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS public.update_ad_orders_updated_at() CASCADE;

-- Verify cleanup
SELECT tablename FROM pg_tables WHERE tablename = 'ad_orders';
-- Expected: 0 rows
```

**Warning:** This deletes all order data. Backup first!

**Backup before rollback:**

```sql
-- Create backup table
CREATE TABLE ad_orders_backup AS SELECT * FROM ad_orders;

-- Verify backup
SELECT COUNT(*) FROM ad_orders_backup;

-- Then proceed with rollback if necessary
```

### Communication Plan

**Who to notify:**

- Engineering team
- Product management
- Customer support
- Marketing (if ads are promoted)
- Affected customers (if any payments were processed)

**Communication channels:**

- Slack: #engineering, #product
- Email: stakeholders list
- Status page: Update if customer-facing
- Support team: Brief on what to tell customers

**Message template:**

```
ROLLBACK NOTIFICATION

Component: Stripe Ad Purchase Integration
Status: Rolled back to previous version
Time: [timestamp]
Duration of downtime: [duration]

Reason:
[Brief explanation of why rollback was necessary]

Impact:
- Ad purchase functionality: DISABLED
- Other functionality: UNAFFECTED
- Customer data: SECURE (no loss)
- Processed payments: [status]

Next Steps:
1. Root cause analysis: [ETA]
2. Fix implementation: [ETA]
3. Redeployment: [ETA]

Point of Contact:
[Name] - [Email] - [Slack]
```

---

## Related Documentation

- [Technical Integration Guide](./STRIPE_INTEGRATION.md) - Detailed implementation docs
- [Webhook Setup Guide](./WEBHOOK_SETUP.md) - Webhook configuration
- [User Guide](./AD_PURCHASE_USER_GUIDE.md) - User-facing documentation
- [Stripe Documentation](https://stripe.com/docs) - Official Stripe docs

---

**Questions?**
Contact the DevOps team at devops@judgefinder.io or via Slack #devops
