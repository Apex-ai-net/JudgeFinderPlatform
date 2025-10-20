# Stripe Billing - Production Deployment Action Plan
**Generated**: 2025-10-19
**Owner**: DevOps Team
**Timeline**: 1-2 weeks for full deployment

---

## 🎯 Goal
Deploy fully functional Stripe billing for JudgeFinder platform with two billing models:
1. Judge-specific ad subscriptions
2. Organization-level SaaS billing (optional/future)

---

## 📋 Quick Start: Minimum Viable Deployment

If you need to deploy billing quickly, follow these **5 critical steps**:

### Step 1: Get Real Stripe Credentials (30 minutes)
```bash
# 1. Login to Stripe Dashboard (https://dashboard.stripe.com)
# 2. Switch to LIVE mode (top-left toggle)
# 3. Go to Developers → API Keys
# 4. Copy:
#    - Publishable key (starts with pk_live_)
#    - Secret key (starts with sk_live_)
```

### Step 2: Verify Universal Access Product (15 minutes)
```bash
# Product should already exist:
# - Name: "JudgeFinder Universal Access"
# - Product ID: prod_TESP0WJ36DprgV
# - Monthly Price: price_1SHzV3B1lwwjVYGvds7yjy18 ($500/month)
# - Annual Price: price_1SHzV3B1lwwjVYGv1CPvzsC0 ($5,000/year)

# If not, the platform will create judge-specific products dynamically
```

### Step 3: Configure Webhook (15 minutes)
```bash
# 1. Go to Stripe Dashboard → Developers → Webhooks
# 2. Click "+ Add endpoint"
# 3. Set Endpoint URL: https://judgefinder.io/api/stripe/webhook
# 4. Select events to listen to:
#    - checkout.session.completed
#    - checkout.session.expired
#    - invoice.payment_succeeded
#    - invoice.payment_failed
#    - customer.subscription.created
#    - customer.subscription.updated
#    - customer.subscription.deleted
# 5. Click "Add endpoint"
# 6. Click "Reveal" on the Signing secret
# 7. Copy the webhook secret (starts with whsec_)
```

### Step 4: Update Netlify Environment Variables (15 minutes)
```bash
# Go to: https://app.netlify.com/sites/judgefinder/configuration/env

# Add/Update these variables:
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SIGNING_SECRET
STRIPE_PRICE_MONTHLY=price_1SHzV3B1lwwjVYGvds7yjy18
STRIPE_PRICE_YEARLY=price_1SHzV3B1lwwjVYGv1CPvzsC0

# Optional (for email notifications):
SENDGRID_API_KEY=YOUR_SENDGRID_API_KEY
SENDGRID_FROM_EMAIL=billing@judgefinder.io
```

### Step 5: Apply Database Migrations (30 minutes)
```bash
# Option A: Via Supabase CLI (recommended)
supabase db push

# Option B: Via Supabase Dashboard
# 1. Go to https://app.supabase.com/project/juwrgqiqgwbqmnoxqpje/sql/new
# 2. Copy and run these migrations in order:
#    - 20251013_001_ad_orders_table.sql
#    - 20251015_002_auth_gated_ad_orders.sql
#    - 20250119000000_judge_ad_products_and_bookings.sql

# Option C: Run verification script
node scripts/apply-billing-migrations.js
```

---

## 🚀 Detailed Deployment Guide

### Phase 1: Stripe Account Setup (1-2 hours)

#### 1.1 Switch to Live Mode
```
✓ Login to Stripe Dashboard
✓ Toggle "Test mode" → "Live mode" (top-left)
✓ Accept Stripe Terms of Service (if first time)
```

#### 1.2 Verify Account Details
```
✓ Business name correct
✓ Business address complete
✓ Tax ID configured (if applicable)
✓ Bank account connected for payouts
✓ Identity verification completed
```

#### 1.3 Configure Checkout Settings
```
Navigation: Settings → Checkout and payment links
✓ Brand logo uploaded
✓ Brand color configured
✓ Support phone/email set
✓ Terms of service URL added
✓ Privacy policy URL added
```

#### 1.4 Configure Email Receipts
```
Navigation: Settings → Emails
✓ Customer emails enabled
✓ Failed payment emails enabled
✓ Receipt footer customized
```

### Phase 2: Product & Price Configuration (30 minutes)

#### 2.1 Verify Universal Access Product
Run this verification:
```bash
# Use Stripe CLI to list products
stripe products list --limit 100 | grep "JudgeFinder Universal Access"

# Or check via Stripe MCP (if available)
# The product should already exist with:
# - Name: "JudgeFinder Universal Access"
# - Description: "Unified access to all courts and judges..."
# - Metadata: scope=universal_access, domain=judgefinder
```

#### 2.2 Verify Prices
```bash
# Monthly price check
stripe prices retrieve price_1SHzV3B1lwwjVYGvds7yjy18

# Expected output:
# - amount: 50000 ($500.00)
# - interval: month
# - active: true

# Annual price check
stripe prices retrieve price_1SHzV3B1lwwjVYGv1CPvzsC0

# Expected output:
# - amount: 500000 ($5,000.00)
# - interval: year
# - active: true
```

#### 2.3 Judge-Specific Products
**No action needed** - Products are created dynamically:
- When a user purchases an ad for a specific judge
- Cached in `judge_ad_products` table
- Pricing based on court level (federal/state)

### Phase 3: Webhook Configuration (20 minutes)

#### 3.1 Create Webhook Endpoint
```
Dashboard: Developers → Webhooks → Add endpoint

Endpoint URL: https://judgefinder.io/api/stripe/webhook

Description: JudgeFinder production webhook for subscriptions and payments

Version: Latest API version (2023-10-16 or newer)
```

#### 3.2 Select Events
**Required events**:
```
✓ checkout.session.completed
✓ checkout.session.expired
✓ invoice.payment_succeeded
✓ invoice.payment_failed
```

**Optional (for organization billing)**:
```
✓ customer.subscription.created
✓ customer.subscription.updated
✓ customer.subscription.deleted
✓ payment_method.attached
✓ customer.updated
```

#### 3.3 Copy Signing Secret
```bash
# Click "Reveal" on the signing secret
# Copy the value (starts with whsec_)
# Save to STRIPE_WEBHOOK_SECRET environment variable
```

#### 3.4 Test Webhook
```bash
# Option 1: Use Stripe CLI
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Option 2: Send test event from Dashboard
# Click "Send test webhook" in webhook settings
# Select "checkout.session.completed"
# Verify 200 response
```

### Phase 4: Database Setup (45 minutes)

#### 4.1 Backup Production Database
```bash
# Via Supabase Dashboard
# Project Settings → Database → Create backup

# Or via pg_dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 4.2 Apply Billing Migrations
Run migrations in this order:

**Migration 1: Ad Orders Table**
```sql
-- File: 20251013_001_ad_orders_table.sql
-- Creates: ad_orders table with Stripe integration
-- Apply via: Supabase SQL Editor or CLI
```

**Migration 2: Auth-Gated Orders**
```sql
-- File: 20251015_002_auth_gated_ad_orders.sql
-- Creates: requesting_user_id() function
-- Creates: RLS policies for user isolation
-- Apply via: Supabase SQL Editor or CLI
```

**Migration 3: Judge Ad Products**
```sql
-- File: 20250119000000_judge_ad_products_and_bookings.sql
-- Creates: judge_ad_products, ad_spot_bookings, checkout_sessions
-- Creates: Indexes and RLS policies
-- Apply via: Supabase SQL Editor or CLI
```

#### 4.3 Verify Migrations
```bash
# Run verification script
node scripts/verify-billing-schema.js

# Expected output:
# ✅ ad_orders - EXISTS
# ✅ judge_ad_products - EXISTS
# ✅ ad_spot_bookings - EXISTS
# ✅ checkout_sessions - EXISTS
```

#### 4.4 Test RLS Policies
```bash
# Create test script
node scripts/test-rls-policies.js

# Should verify:
# - Users can only see their own orders
# - Service role has full access
# - Anonymous users have no access
```

### Phase 5: Environment Configuration (30 minutes)

#### 5.1 Netlify Environment Variables
```bash
# Navigate to:
# https://app.netlify.com/sites/judgefinder/configuration/env

# Set these variables:
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_1SHzV3B1lwwjVYGvds7yjy18
STRIPE_PRICE_YEARLY=price_1SHzV3B1lwwjVYGv1CPvzsC0

# Optional:
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=billing@judgefinder.io
UNIVERSAL_PURCHASE_ENABLED=true
```

#### 5.2 Verify Environment Variables
```bash
# After deploying, check:
curl https://judgefinder.io/api/admin/stripe-status

# Expected response:
{
  "stripe_configured": true,
  "has_secret_key": true,
  "has_webhook_secret": true,
  "has_price_monthly": true,
  "has_price_yearly": true,
  "mode": "live"
}
```

### Phase 6: Deploy & Test (1-2 hours)

#### 6.1 Deploy to Production
```bash
# Option 1: Git push (automatic deploy)
git add .
git commit -m "feat: enable production Stripe billing"
git push origin main

# Option 2: Manual deploy via Netlify
# Dashboard → Deploys → Trigger deploy
```

#### 6.2 Verify Deployment
```bash
# Wait for deploy to complete
# Check deploy logs for errors

# Verify endpoints:
curl https://judgefinder.io/api/health
curl https://judgefinder.io/api/stripe/webhook
```

#### 6.3 Test Purchase Flow (Use Stripe Test Cards)
**Test Card Numbers**:
```
Successful payment:
  Card: 4242 4242 4242 4242
  Expiry: Any future date
  CVC: Any 3 digits
  ZIP: Any 5 digits

3D Secure required:
  Card: 4000 0027 6000 3184

Payment fails:
  Card: 4000 0000 0000 0341
```

**Test Steps**:
1. Sign in to JudgeFinder
2. Navigate to judge profile
3. Click "Advertise Here" or similar
4. Select pricing plan (monthly/annual)
5. Click "Proceed to Checkout"
6. Use test card number above
7. Complete Stripe Checkout
8. Verify redirect back to success page
9. Check `/dashboard/billing` for order
10. Check Stripe Dashboard for payment

#### 6.4 Verify Webhook Processing
```bash
# Check webhook logs in Stripe Dashboard
# Navigate to: Developers → Webhooks → [your endpoint] → Attempts

# Should see:
# - checkout.session.completed delivered successfully
# - Response: 200 OK
# - Response time: < 5 seconds

# Check database for created record
node scripts/check-last-order.js
```

### Phase 7: Email Configuration (Optional, 30 minutes)

#### 7.1 SendGrid Setup
```bash
# 1. Create SendGrid account: https://sendgrid.com/
# 2. Create API key: Settings → API Keys → Create API Key
# 3. Verify sender email: Settings → Sender Authentication
# 4. Add to Netlify environment:
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=billing@judgefinder.io
```

#### 7.2 Test Email Sending
```bash
# Trigger a test purchase
# Check email_send_log table for records:
node scripts/check-email-logs.js

# Verify email received at customer address
```

### Phase 8: Monitoring Setup (1 hour)

#### 8.1 Stripe Dashboard Monitoring
```
Bookmark these pages:
✓ Payments: https://dashboard.stripe.com/payments
✓ Subscriptions: https://dashboard.stripe.com/subscriptions
✓ Webhooks: https://dashboard.stripe.com/webhooks
✓ Customers: https://dashboard.stripe.com/customers
```

#### 8.2 Configure Alerts
```
Stripe Dashboard → Settings → Email notifications

Enable alerts for:
✓ Failed payments (threshold: 3+ in 24h)
✓ High chargeback rate
✓ Webhook failures
✓ Unusual spending patterns
```

#### 8.3 Sentry Integration
```bash
# Verify Sentry captures Stripe errors
# Check: https://sentry.io/organizations/your-org/issues/

# Look for:
# - Webhook processing errors
# - Checkout creation failures
# - Database insertion errors
```

---

## ✅ Post-Deployment Verification

### Automated Tests
```bash
# Run E2E tests against production
PROD_URL=https://judgefinder.io npm run test:e2e

# Expected: All tests pass
```

### Manual Verification Checklist
```
Environment:
✓ All environment variables set correctly
✓ Stripe keys are LIVE mode (not test mode)
✓ Webhook endpoint reachable from internet
✓ Database migrations applied successfully

Purchase Flow:
✓ User can authenticate with Clerk
✓ Purchase form loads without errors
✓ Can select pricing plan (monthly/annual)
✓ Redirects to Stripe Checkout
✓ Checkout displays correct amount
✓ Can complete test purchase
✓ Redirects back to success page
✓ Order appears in user's billing dashboard
✓ Payment appears in Stripe Dashboard

Webhook Processing:
✓ Webhook receives events from Stripe
✓ Signature verification passes
✓ Events are processed correctly
✓ Database records created
✓ Email sent (if configured)
✓ No errors in logs

Security:
✓ Unauthenticated users cannot purchase
✓ Users can only see own orders
✓ Service role access works
✓ No sensitive data exposed in logs
✓ Webhook signature required

Performance:
✓ Checkout creation < 2 seconds
✓ Webhook processing < 5 seconds
✓ Page load times acceptable
✓ No memory leaks observed
```

---

## 🚨 Troubleshooting Guide

### Issue: Webhook Not Receiving Events
**Symptoms**: No database records created after payment

**Solutions**:
```bash
# 1. Check webhook endpoint is accessible
curl https://judgefinder.io/api/stripe/webhook
# Expected: 405 Method Not Allowed (GET not supported)

# 2. Check webhook logs in Stripe Dashboard
# Navigate to: Developers → Webhooks → [endpoint] → Attempts
# Look for delivery failures

# 3. Verify signing secret matches
echo $STRIPE_WEBHOOK_SECRET
# Should match value in Stripe Dashboard

# 4. Check application logs
netlify functions:log api-stripe-webhook
```

### Issue: Checkout Session Creation Fails
**Symptoms**: Error when clicking "Proceed to Checkout"

**Solutions**:
```bash
# 1. Check Stripe API keys are valid
stripe balance list --api-key $STRIPE_SECRET_KEY

# 2. Verify price IDs exist
stripe prices retrieve $STRIPE_PRICE_MONTHLY

# 3. Check application logs for errors
netlify logs --watch

# 4. Verify Clerk authentication working
# User should be signed in and have valid session
```

### Issue: Database Record Not Created
**Symptoms**: Webhook processed but no order in database

**Solutions**:
```bash
# 1. Check RLS policies allow insert
# Test with service role:
node scripts/test-service-role-insert.js

# 2. Verify clerk_user_id in webhook metadata
# Check webhook payload in Stripe Dashboard

# 3. Check database connection
node scripts/test-supabase-connection.js

# 4. Review error logs
SELECT * FROM webhook_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Issue: Users See Wrong Orders
**Symptoms**: RLS not working correctly

**Solutions**:
```bash
# 1. Verify RLS enabled on table
SELECT tablename, relname, relrowsecurity
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE schemaname = 'public'
AND tablename = 'ad_orders';

# 2. Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'ad_orders';

# 3. Test requesting_user_id() function
SELECT requesting_user_id();

# 4. Verify JWT token has correct claims
# Check Clerk dashboard for user ID format
```

---

## 📞 Support & Escalation

### Level 1: Self-Service
- Check Stripe Dashboard for payment status
- Review webhook logs for errors
- Verify environment variables
- Check application logs in Netlify

### Level 2: Development Team
- Review code in affected files
- Check database for data integrity
- Test in staging environment
- Deploy hotfix if needed

### Level 3: Stripe Support
- Contact: https://support.stripe.com
- Provide: Account ID, webhook endpoint, event ID
- Check: https://status.stripe.com for outages

### Emergency Rollback
```bash
# If critical issues arise:
# 1. Revert to previous deployment
netlify rollback

# 2. Disable webhook temporarily
# Stripe Dashboard → Webhooks → [endpoint] → Disable

# 3. Investigate root cause
# 4. Apply fix
# 5. Re-enable webhook
```

---

## 📅 Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Stripe Account Setup | 1-2 hours | Business verification |
| Product Configuration | 30 min | Stripe account ready |
| Webhook Setup | 20 min | Production URL available |
| Database Migrations | 45 min | Backup completed |
| Environment Config | 30 min | All secrets available |
| Deploy & Test | 1-2 hours | All above complete |
| Email Configuration | 30 min | SendGrid account (optional) |
| Monitoring Setup | 1 hour | Production running |

**Total Estimated Time**: 1-2 working days (with optional items)
**Minimum Time**: 4-5 hours (critical path only)

---

## 📝 Next Steps After Deployment

1. **Monitor for 48 hours**
   - Watch for errors in Sentry
   - Check webhook delivery success rate
   - Monitor payment success rate

2. **Create Operational Runbooks**
   - Failed payment handling procedure
   - Refund process documentation
   - Subscription cancellation workflow

3. **Train Support Team**
   - How to look up orders in database
   - How to check payment status in Stripe
   - Common customer questions

4. **Build Admin Dashboard** (if needed)
   - View all subscriptions
   - Issue refunds
   - Manage customer disputes

5. **Optimize Conversion Funnel**
   - Add A/B testing
   - Track checkout abandonment
   - Implement cart recovery

---

**Document Status**: ✅ Ready for Implementation
**Owner**: DevOps/Backend Team
**Reviewer**: Technical Lead
**Approval Required**: Product Manager, CTO

*Context improved by Giga AI: Used information about the judicial analytics system and court advertising platform that implements the billing functionality.*
