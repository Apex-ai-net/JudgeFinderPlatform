# SendGrid Environment Configuration Summary

**Document Type:** Deployment Configuration Guide
**Created:** October 24, 2025
**Status:** Ready for Implementation
**Platform:** Netlify

---

## Executive Summary

This document provides a comprehensive overview of SendGrid email system configuration for the JudgeFinder Platform. SendGrid handles all transactional emails including payment confirmations, failure notifications, dunning sequences, and subscription lifecycle events.

**Key Points:**

- Configuration is OPTIONAL but RECOMMENDED for production
- If not configured, emails are logged but not sent
- Setup time: ~30 minutes
- Free tier supports up to 3,000 emails/month (100/day)
- No code changes required - environment variables only

---

## Required Environment Variables for Netlify

### Summary Table

| Variable            | Required Level | Example Value            | Purpose                  |
| ------------------- | -------------- | ------------------------ | ------------------------ |
| SENDGRID_API_KEY    | RECOMMENDED    | `SG.xxx...yyy`           | SendGrid authentication  |
| SENDGRID_FROM_EMAIL | RECOMMENDED    | `billing@judgefinder.io` | Sender email address     |
| BILLING_FROM_EMAIL  | OPTIONAL       | `noreply@judgefinder.io` | Fallback sender (legacy) |

---

## Complete Configuration Requirements

### 1. SENDGRID_API_KEY

**Description:** API key for authenticating requests to SendGrid's email service.

**Required:** RECOMMENDED for production

- If missing: Emails logged to database but NOT sent
- If present: Emails sent via SendGrid and logged to database

**Format:**

- Must start with `SG.`
- Full format: `SG.xxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyy`
- Example: `SG.AbC123dEf456GhI789.JkL012mNo345PqR678StU901VwX234YzA567BcD890`

**How to Obtain:**

1. Create SendGrid account at https://signup.sendgrid.com/
2. Navigate to Settings → API Keys
3. Click "Create API Key"
4. Name: "JudgeFinder Production"
5. Permissions: Full Access (or minimum "Mail Send")
6. Copy key immediately (shown only once)

**Security:**

- NEVER commit to version control
- NEVER expose in client-side code
- Stored as secret in Netlify environment variables
- Rotate quarterly (every 90 days recommended)

**Where to Set:**

- Netlify Dashboard → Site Settings → Environment Variables
- Scope: Production (required), Deploy Previews (optional)

**Verification:**

```bash
# Test API key validity
curl -X GET https://api.sendgrid.com/v3/user/email \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"

# Expected response:
# {"email":"your-sendgrid-account-email@example.com"}
```

---

### 2. SENDGRID_FROM_EMAIL

**Description:** Email address used as sender for all transactional emails.

**Required:** RECOMMENDED for production

- If missing: System falls back to BILLING_FROM_EMAIL
- If both missing: Emails logged but not sent

**Format:**

- Valid email address
- Must be verified in SendGrid
- Recommended format: `billing@judgefinder.io`

**How to Obtain:**

1. Log in to SendGrid dashboard
2. Navigate to Settings → Sender Authentication
3. Choose verification method:
   - **Single Sender Verification** (easier, 5 minutes)
     - Click "Verify a Single Sender"
     - Enter: `billing@judgefinder.io`
     - Fill in required details
     - Check inbox and verify
   - **Domain Authentication** (recommended, 15-30 minutes)
     - Click "Authenticate Your Domain"
     - Domain: `judgefinder.io`
     - Add DNS records (3 CNAME records)
     - Wait for DNS propagation
     - Verify in dashboard

**Security:**

- Must be verified before sending emails
- SendGrid blocks unverified senders
- Domain authentication improves deliverability

**Where to Set:**

- Netlify Dashboard → Site Settings → Environment Variables
- Scope: Production (required), Deploy Previews (optional)

**Verification:**

```bash
# Check sender verification status in SendGrid Dashboard
# Settings → Sender Authentication
# Status should show green "Verified" checkmark
```

---

### 3. BILLING_FROM_EMAIL (Optional)

**Description:** Fallback sender email address if SENDGRID_FROM_EMAIL not set.

**Required:** OPTIONAL (legacy fallback)

- Purpose: Backward compatibility
- SENDGRID_FROM_EMAIL takes precedence if both set

**Format:**

- Valid email address
- Example: `noreply@judgefinder.io`

**Recommendation:**

- Use SENDGRID_FROM_EMAIL instead
- Only set this for backward compatibility if needed

---

## Step-by-Step Setup Instructions

### Phase 1: SendGrid Account Setup (10 minutes)

1. **Create Account**
   - Go to https://signup.sendgrid.com/
   - Sign up for Free tier (100 emails/day, 3,000/month)
   - Verify email address
   - Complete account profile

2. **Generate API Key**
   - Log in to SendGrid dashboard
   - Settings → API Keys
   - Create API Key → "JudgeFinder Production"
   - Permissions: Full Access
   - Copy key immediately
   - Save in password manager

3. **Verify Sender Email**
   - Settings → Sender Authentication
   - Verify a Single Sender
   - Email: `billing@judgefinder.io`
   - Complete verification via email link
   - Confirm "Verified" status

**Optional but Recommended:** 4. **Set Up Domain Authentication**

- Settings → Sender Authentication
- Authenticate Your Domain → `judgefinder.io`
- Copy 3 CNAME records
- Add to DNS provider
- Wait for verification (5-60 minutes)

---

### Phase 2: Netlify Configuration (5 minutes)

1. **Open Netlify Dashboard**
   - Go to https://app.netlify.com
   - Select JudgeFinder site
   - Navigate to Site Settings → Environment Variables

2. **Add SENDGRID_API_KEY**
   - Click "Add a variable"
   - Key: `SENDGRID_API_KEY`
   - Value: Paste your API key (SG.xxx...)
   - Scopes: Check "Production" (required), optionally "Deploy previews"
   - Click "Create variable"

3. **Add SENDGRID_FROM_EMAIL**
   - Click "Add a variable"
   - Key: `SENDGRID_FROM_EMAIL`
   - Value: `billing@judgefinder.io`
   - Scopes: Same as above
   - Click "Create variable"

4. **Trigger Redeploy**
   - Go to Deploys tab
   - Click "Trigger deploy" → "Clear cache and deploy site"
   - Wait for build to complete (3-5 minutes)

---

### Phase 3: Testing (15 minutes)

1. **Local Testing** (Optional)

   ```bash
   # Add to .env.local (DO NOT commit)
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=billing@judgefinder.io

   # Create test organization in database
   # (Run in Supabase SQL Editor)
   INSERT INTO organizations (id, name, billing_email)
   VALUES ('org_test_sendgrid', 'Test Org', 'your-email@example.com');

   # Run test script
   npx tsx scripts/test-email-system.ts payment-success org_test_sendgrid

   # Check results
   # 1. Terminal output shows success
   # 2. Email received in your inbox
   # 3. Database log shows sent status
   ```

2. **Production Testing**

   ```bash
   # Test with Stripe webhook (requires Stripe CLI)
   stripe listen --forward-to https://judgefinder.io/api/webhooks/stripe
   stripe trigger invoice.payment_succeeded

   # Verify in database
   SELECT * FROM email_send_log ORDER BY created_at DESC LIMIT 5;

   # Expected: Recent email with status 'sent', provider 'sendgrid'
   ```

3. **SendGrid Dashboard Verification**
   - Go to https://app.sendgrid.com/stats/overview
   - Check "Requests" count (should increase)
   - Check "Delivered" count (should match requests)
   - Verify no bounces or spam reports

---

## Email Types Implemented

The system sends 7 types of transactional emails:

### 1. Payment Success

- **Trigger:** Stripe webhook `invoice.payment_succeeded`
- **Purpose:** Confirm successful payment
- **Recipients:** Organization billing email
- **Data:** Amount, currency, invoice URL, next billing date, payment method

### 2. Payment Failed

- **Trigger:** Stripe webhook `invoice.payment_failed`
- **Purpose:** Notify of payment failure, provide recovery steps
- **Recipients:** Organization billing email
- **Data:** Amount, attempt count, next retry date, billing portal URL

### 3. Dunning Emails (Progressive Urgency)

- **Trigger:** Automated dunning sequence
- **Severity Levels:**
  - **Reminder** (Days 1-2): Friendly reminder
  - **Urgent** (Days 3-6): Strong call to action
  - **Final** (Day 7+): Final warning before cancellation
- **Recipients:** Organization billing email
- **Data:** Amount overdue, days past due, invoice URL, billing portal

### 4. Subscription Cancelled

- **Trigger:** Stripe webhook `customer.subscription.deleted`
- **Purpose:** Confirm cancellation, offer reactivation
- **Recipients:** Organization billing email
- **Data:** Subscription tier, end date, reactivation URL

### 5. Usage Report (Future)

- **Trigger:** Scheduled monthly job (not yet implemented)
- **Purpose:** Provide monthly usage transparency
- **Recipients:** Organization billing email
- **Data:** Period, seats used, API calls, total cost

---

## Testing Procedures

### Manual Testing Script

**Location:** `/scripts/test-email-system.ts`

**Usage:**

```bash
# Test single email type
npx tsx scripts/test-email-system.ts [email-type] [organization-id]

# Available email types:
# - payment-success
# - payment-failed
# - dunning-reminder
# - dunning-urgent
# - dunning-final
# - subscription-cancelled
# - usage-report
# - all (sends all 7 types)

# Examples:
npx tsx scripts/test-email-system.ts payment-success org_test123
npx tsx scripts/test-email-system.ts all org_test123
```

**Prerequisites:**

1. Organization exists in database with valid billing_email
2. Environment variables set (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)
3. Sender email verified in SendGrid

**Expected Output:**

```
📧 Email System Test
Organization ID: org_test123
Email Type: payment-success

🧪 Testing Payment Success Email...
✅ Payment Success Email sent!

📊 Check email_send_log table in Supabase for delivery status.
📬 Check your inbox (billing email for organization) for the email.
```

### Database Verification

```sql
-- Check recent emails
SELECT
  email_to,
  email_subject,
  status,
  metadata->>'provider' as provider,
  metadata->>'category' as category,
  created_at
FROM email_send_log
ORDER BY created_at DESC
LIMIT 10;

-- Expected results:
-- status: 'sent'
-- provider: 'sendgrid'
-- category: 'payment-success', 'dunning-urgent', etc.

-- Check for errors
SELECT * FROM email_send_log
WHERE status = 'error'
ORDER BY created_at DESC;

-- Should be empty (no errors)
```

### Stripe Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local or production
stripe listen --forward-to https://judgefinder.io/api/webhooks/stripe

# In another terminal, trigger events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted

# Check Netlify function logs for webhook processing
# Check email_send_log for new entries
```

---

## Monitoring and Troubleshooting

### Monitoring Dashboards

1. **SendGrid Dashboard**
   - URL: https://app.sendgrid.com/stats/overview
   - Metrics: Requests, Delivered, Bounces, Spam Reports
   - Review: Daily for first week, then weekly

2. **Database Logs**

   ```sql
   -- Email volume by category (last 30 days)
   SELECT
     metadata->>'category' as category,
     status,
     COUNT(*) as count
   FROM email_send_log
   WHERE created_at > NOW() - INTERVAL '30 days'
   GROUP BY category, status
   ORDER BY count DESC;

   -- Delivery success rate
   SELECT
     status,
     COUNT(*) as count,
     ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
   FROM email_send_log
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY status;
   ```

3. **Netlify Function Logs**
   - Netlify Dashboard → Functions tab
   - Filter for email-related function executions
   - Check for errors or warnings

### Common Issues and Quick Fixes

| Issue               | Symptoms                          | Solution                                                                                         |
| ------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Emails not sending  | Logs show `provider: 'none'`      | 1. Check API key set in Netlify<br>2. Verify sender email in SendGrid<br>3. Redeploy site        |
| Emails in spam      | High spam report rate             | 1. Set up domain authentication<br>2. Add SPF/DKIM DNS records<br>3. Check email content         |
| API key invalid     | Status 401/403 errors             | 1. Regenerate API key<br>2. Update Netlify variable<br>3. Redeploy                               |
| Sender not verified | SendGrid error about verification | 1. Complete sender verification<br>2. Check verification status<br>3. Re-send verification email |
| High bounce rate    | >5% bounce rate in dashboard      | 1. Validate billing emails<br>2. Remove invalid addresses<br>3. Check suppression list           |

---

## Cost Analysis

### SendGrid Pricing Tiers

| Tier       | Monthly Volume | Daily Limit | Cost/Month | JudgeFinder Fit                 |
| ---------- | -------------- | ----------- | ---------- | ------------------------------- |
| Free       | 3,000          | 100         | $0         | Launch, up to 3K emails/month   |
| Essentials | 50,000         | ~1,667      | $19.95     | Production, 3K-50K emails/month |
| Pro        | 100,000        | ~3,333      | $89.95     | Growth, 50K-100K emails/month   |

### Usage Estimates

**Assumptions:**

- 1 email per successful payment
- 5% payment failure rate
- 3 emails per failed payment (dunning sequence)
- 2% monthly churn (cancellations)

**Projections:**

| Active Subscriptions | Emails/Month | Recommended Tier | Monthly Cost |
| -------------------- | ------------ | ---------------- | ------------ |
| 100                  | ~150         | Free             | $0           |
| 1,000                | ~1,500       | Free             | $0           |
| 5,000                | ~7,500       | Essentials       | $19.95       |
| 10,000               | ~15,000      | Essentials       | $19.95       |
| 50,000               | ~75,000      | Pro              | $89.95       |

**Recommendation:** Start with Free tier, upgrade when approaching 3,000 emails/month limit.

---

## Security Best Practices

### API Key Security

1. **Never Commit to Git**
   - API keys excluded from version control
   - Stored only in Netlify environment variables
   - Added to `.gitignore` (`.env.local` pattern)

2. **Rotate Regularly**
   - Schedule: Every 90 days (quarterly)
   - Process:
     1. Generate new key in SendGrid
     2. Update Netlify variable
     3. Trigger redeploy
     4. Verify working
     5. Delete old key

3. **Use Separate Keys**
   - Development: Restricted test key
   - Production: Full access production key
   - Never use production key in development

4. **Monitor Usage**
   - SendGrid Dashboard → API Keys
   - Review activity logs
   - Set up alerts for unusual activity

### Email Content Security

1. **Data Protection**
   - Never include passwords
   - Never include full credit card numbers
   - Sanitize all user-generated content
   - Escape HTML special characters

2. **Link Security**
   - All links use HTTPS
   - Billing portal: `https://judgefinder.io/dashboard/billing`
   - Invoice URLs from Stripe (always HTTPS)

3. **Rate Limiting**
   - Max 10 emails per organization per day
   - Exponential backoff for failures
   - Duplicate prevention in dunning manager

---

## Documentation References

### Primary Documentation

1. **Full Setup Guide**
   - File: `/docs/deployment/SENDGRID_SETUP_GUIDE.md`
   - Purpose: Comprehensive setup instructions with detailed explanations
   - Length: ~500 lines
   - Use for: Initial setup, troubleshooting, training

2. **Quick Checklist**
   - File: `/docs/deployment/SENDGRID_CONFIGURATION_CHECKLIST.md`
   - Purpose: Fast reference for setup steps
   - Length: ~200 lines
   - Use for: Quick verification, deployment prep

3. **This Document**
   - File: `/SENDGRID_ENVIRONMENT_CONFIGURATION.md`
   - Purpose: Environment variable reference and summary
   - Use for: Understanding requirements, reference

### Supporting Documentation

4. **Email System Overview**
   - File: `/docs/EMAIL_SYSTEM.md`
   - Purpose: Architecture, templates, integration details

5. **Email Testing Guide**
   - File: `/docs/EMAIL_TESTING_GUIDE.md`
   - Purpose: Testing procedures and validation

6. **Email Implementation Summary**
   - File: `/docs/implementation/STRIPE_EMAIL_SYSTEM_COMPLETE.md`
   - Purpose: Implementation details, code structure

### External Resources

- **SendGrid Documentation:** https://docs.sendgrid.com/
- **SendGrid API Reference:** https://docs.sendgrid.com/api-reference/mail-send/mail-send
- **Sender Authentication:** https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
- **Netlify Environment Variables:** https://docs.netlify.com/environment-variables/overview/

---

## Quick Reference

### Essential URLs

| Purpose               | URL                                           |
| --------------------- | --------------------------------------------- |
| SendGrid Signup       | https://signup.sendgrid.com/                  |
| SendGrid Dashboard    | https://app.sendgrid.com/                     |
| API Keys Management   | https://app.sendgrid.com/settings/api_keys    |
| Sender Authentication | https://app.sendgrid.com/settings/sender_auth |
| Email Statistics      | https://app.sendgrid.com/stats/overview       |
| Netlify Dashboard     | https://app.netlify.com/                      |
| Netlify Env Vars      | Site Settings → Environment Variables         |

### Essential Commands

```bash
# Test API key
curl -X GET https://api.sendgrid.com/v3/user/email \
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# Test email sending
npx tsx scripts/test-email-system.ts payment-success org_test123

# Check database logs
psql $DATABASE_URL -c "SELECT * FROM email_send_log ORDER BY created_at DESC LIMIT 5;"

# Stripe webhook testing
stripe trigger invoice.payment_succeeded
```

---

## Production Readiness Checklist

### Pre-Launch

- [ ] SendGrid account created
- [ ] API key generated (Full Access or Mail Send)
- [ ] Sender email verified (`billing@judgefinder.io`)
- [ ] Domain authentication configured (optional but recommended)
- [ ] Environment variables added to Netlify
- [ ] Site redeployed after variable addition

### Testing Complete

- [ ] Test script executed successfully
- [ ] Test email received in inbox
- [ ] Email not marked as spam
- [ ] Database shows status: 'sent'
- [ ] SendGrid dashboard shows delivery
- [ ] Stripe webhook test completed

### Monitoring Setup

- [ ] SendGrid dashboard bookmarked
- [ ] Database queries saved for monitoring
- [ ] Netlify function logs reviewed
- [ ] Sentry alerts configured
- [ ] Key rotation scheduled (90 days)

### Documentation

- [ ] Team trained on email system
- [ ] Setup guides reviewed
- [ ] Troubleshooting procedures documented
- [ ] Support contacts identified

---

## Next Steps After Configuration

1. **Monitor Initial Week**
   - Check SendGrid dashboard daily
   - Review email_send_log for errors
   - Verify delivery rates >95%
   - Watch for spam reports

2. **Set Up Alerts**
   - Sentry: Email delivery failures
   - SendGrid: High bounce rate (>5%)
   - SendGrid: Spam reports (>0.1%)

3. **Schedule Maintenance**
   - Quarterly API key rotation (90 days)
   - Monthly monitoring review
   - Annual pricing tier review

4. **Team Training**
   - Share documentation with team
   - Review troubleshooting procedures
   - Document escalation process

---

## Summary

SendGrid email system configuration requires:

- 2 environment variables (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)
- ~30 minutes setup time
- Free tier sufficient for launch
- Optional but recommended for production

**Configuration is complete when:**

- Environment variables set in Netlify
- Sender email verified in SendGrid
- Test email sent and received successfully
- Database logs show successful delivery

**For detailed instructions, see:**

- `/docs/deployment/SENDGRID_SETUP_GUIDE.md` (comprehensive guide)
- `/docs/deployment/SENDGRID_CONFIGURATION_CHECKLIST.md` (quick checklist)

---

**Document Status:** Ready for Production Use
**Maintained By:** JudgeFinder Engineering Team
**Last Updated:** October 24, 2025
**Next Review:** January 24, 2026
