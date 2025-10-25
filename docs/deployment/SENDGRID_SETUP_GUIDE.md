# SendGrid Email Configuration Guide

**Document Version:** 1.0.0
**Last Updated:** October 24, 2025
**Status:** Ready for Production Setup
**Platform:** Netlify Deployment

---

## Overview

This guide provides step-by-step instructions for configuring SendGrid email service for the JudgeFinder Platform. SendGrid handles all transactional emails including payment confirmations, failure notifications, dunning sequences, and subscription lifecycle events.

**Important:** Email configuration is OPTIONAL but RECOMMENDED for production. If not configured, emails will be logged to the database but not sent.

---

## Required Environment Variables

The following environment variables must be set in the Netlify dashboard:

### 1. SENDGRID_API_KEY

- **Type:** Secret (server-side only)
- **Required:** RECOMMENDED for production
- **Format:** Starts with `SG.` followed by alphanumeric characters
- **Example:** `SG.xxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyy`
- **Purpose:** Authenticates API requests to SendGrid
- **Security:** Never expose in client-side code or commit to git

### 2. SENDGRID_FROM_EMAIL

- **Type:** Configuration (server-side only)
- **Required:** RECOMMENDED for production
- **Format:** Valid email address
- **Example:** `billing@judgefinder.io`
- **Purpose:** Sender email address for all transactional emails
- **Important:** Must be verified in SendGrid before sending emails

### 3. BILLING_FROM_EMAIL (Optional Fallback)

- **Type:** Configuration (server-side only)
- **Required:** OPTIONAL (legacy fallback)
- **Format:** Valid email address
- **Example:** `noreply@judgefinder.io`
- **Purpose:** Fallback sender email if SENDGRID_FROM_EMAIL not set
- **Note:** SENDGRID_FROM_EMAIL takes precedence

---

## Complete Setup Instructions

### Step 1: Create SendGrid Account

1. **Visit SendGrid Signup**
   - URL: https://signup.sendgrid.com/
   - Click "Start for Free"

2. **Choose Account Type**
   - **Free Tier:** 100 emails/day (sufficient for testing and early production)
   - **Essentials:** 50,000 emails/month ($19.95/month)
   - **Pro:** 100,000 emails/month ($89.95/month)

3. **Complete Registration**
   - Enter business email (not Gmail/Yahoo)
   - Create password
   - Verify email address
   - Complete profile information

4. **Account Verification**
   - SendGrid may require additional verification
   - Provide business details
   - Wait for account approval (usually instant, may take 1-2 business days)

**Recommended Tier for JudgeFinder:**

- **Launch/Testing:** Free tier (100 emails/day)
- **Production (1,000 users):** Free tier sufficient (~1,220 emails/month estimated)
- **Production (10,000+ users):** Essentials tier (50,000 emails/month)

---

### Step 2: Generate API Key

1. **Navigate to API Keys**
   - Log in to SendGrid dashboard: https://app.sendgrid.com/
   - Click "Settings" in left sidebar
   - Click "API Keys"

2. **Create New API Key**
   - Click "Create API Key" button (blue button, top right)
   - Name: `JudgeFinder Production` (or `JudgeFinder Development`)
   - API Key Permissions:
     - **Recommended:** Full Access (simplest for production)
     - **Minimum:** Mail Send (if you want restricted access)

3. **Permission Details (if using restricted access):**
   - Mail Send: Full Access (required)
   - Stats: Read Access (optional, for monitoring)
   - Suppressions: Read Access (optional, for bounce management)

4. **Copy API Key**
   - Click "Create & View"
   - **CRITICAL:** Copy the API key immediately
   - Format: `SG.xxxxxxxxxxxxxx.yyyyyyyyyyyyyyyy`
   - **This is shown only ONCE** - you cannot retrieve it again
   - Store securely in password manager

5. **Test API Key (Optional)**

   ```bash
   # Test API key validity
   curl -X GET https://api.sendgrid.com/v3/user/email \
     -H "Authorization: Bearer YOUR_API_KEY_HERE"

   # Expected response:
   # {"email":"your-sendgrid-account-email@example.com"}
   ```

**Security Best Practices:**

- Never commit API key to version control
- Never expose in client-side code
- Rotate keys quarterly (create new, update Netlify, delete old)
- Use separate keys for development and production

---

### Step 3: Verify Sender Email

**Critical:** SendGrid requires sender email verification before sending emails.

#### Option A: Single Sender Verification (Easiest)

1. **Navigate to Sender Authentication**
   - SendGrid Dashboard → Settings → Sender Authentication
   - Click "Verify a Single Sender"

2. **Enter Sender Details**
   - From Name: `JudgeFinder Billing`
   - From Email: `billing@judgefinder.io`
   - Reply To: `support@judgefinder.io` (optional, can be same as from)
   - Company Address: Your business address
   - City, State, Zip, Country

3. **Verify Email**
   - Click "Create"
   - Check inbox for `billing@judgefinder.io`
   - Click verification link in email
   - Status changes to "Verified" (green checkmark)

4. **Confirmation**
   - You'll see "Sender verified successfully"
   - Email can now be used as sender address

#### Option B: Domain Authentication (Recommended for Production)

**Benefits:**

- Better email deliverability
- Professional appearance (no "via sendgrid.net")
- Verify entire domain (any email @judgefinder.io)
- Enhanced sender reputation

**Steps:**

1. **Navigate to Domain Authentication**
   - SendGrid Dashboard → Settings → Sender Authentication
   - Click "Authenticate Your Domain"

2. **Select DNS Host**
   - Choose your DNS provider (Netlify, Cloudflare, GoDaddy, etc.)
   - Domain: `judgefinder.io`
   - Advanced Settings: Leave default
   - Click "Next"

3. **Add DNS Records**
   - SendGrid provides CNAME records to add
   - Example records:
     ```
     em1234.judgefinder.io → CNAME → u1234567.wl123.sendgrid.net
     s1._domainkey.judgefinder.io → CNAME → s1.domainkey.u1234567.wl123.sendgrid.net
     s2._domainkey.judgefinder.io → CNAME → s2.domainkey.u1234567.wl123.sendgrid.net
     ```

4. **Add Records to DNS Provider**
   - Go to your DNS provider (Netlify DNS, Cloudflare, etc.)
   - Add each CNAME record exactly as shown
   - TTL: 300 (5 minutes) or default

5. **Verify Domain**
   - Return to SendGrid
   - Click "Verify" button
   - DNS propagation may take 5-60 minutes
   - Status will show "Verified" when complete

**Verification Check:**

```bash
# Check DNS propagation
dig em1234.judgefinder.io CNAME
dig s1._domainkey.judgefinder.io CNAME

# Expected: CNAME records pointing to sendgrid.net
```

---

### Step 4: Configure Netlify Environment Variables

1. **Open Netlify Dashboard**
   - Go to https://app.netlify.com
   - Select JudgeFinder site
   - Click "Site settings" in top navigation
   - Click "Environment variables" in left sidebar

2. **Add SENDGRID_API_KEY**
   - Click "Add a variable" button
   - Key: `SENDGRID_API_KEY`
   - Value: `SG.xxxxxxxxxxxxxx.yyyyyyyyyyyyyyyy` (from Step 2)
   - Scopes:
     - Check "Production"
     - Check "Deploy previews" (optional, for testing)
     - Check "Branch deploys" (optional)
   - Click "Create variable"

3. **Add SENDGRID_FROM_EMAIL**
   - Click "Add a variable" button
   - Key: `SENDGRID_FROM_EMAIL`
   - Value: `billing@judgefinder.io` (from Step 3)
   - Scopes: Same as above
   - Click "Create variable"

4. **Optional: Add BILLING_FROM_EMAIL**
   - Key: `BILLING_FROM_EMAIL`
   - Value: `noreply@judgefinder.io`
   - Purpose: Fallback if SENDGRID_FROM_EMAIL not used

5. **Save and Deploy**
   - Variables take effect on next deployment
   - No need to redeploy manually if already deployed
   - Next build will automatically use new variables

**Important Notes:**

- Environment variables are encrypted at rest in Netlify
- Changes take effect immediately for new builds
- Existing deployments do NOT pick up new variables (must redeploy)
- Variables are available to serverless functions automatically

---

### Step 5: Trigger Redeploy (if needed)

If site is already deployed and you want email to work immediately:

1. **Trigger Redeploy**
   - Netlify Dashboard → Deploys tab
   - Click "Trigger deploy" dropdown
   - Select "Clear cache and deploy site"
   - Wait for build to complete (3-5 minutes)

2. **Verify Environment Variables Loaded**
   - Netlify function logs will show environment check
   - Look for: `[Email Service] Checking configuration...`
   - Should NOT show warning about missing SENDGRID_API_KEY

---

## Email Types and Templates

The system sends 7 types of emails:

### 1. Payment Success

- **Trigger:** `invoice.payment_succeeded` webhook from Stripe
- **Purpose:** Confirm successful payment
- **Template Data:** Amount, currency, invoice URL, next billing date, payment method
- **Category:** `payment-success`

### 2. Payment Failed

- **Trigger:** `invoice.payment_failed` webhook from Stripe (first attempt)
- **Purpose:** Notify of payment failure, provide recovery instructions
- **Template Data:** Amount, attempt count, next retry date, billing portal URL
- **Category:** `payment-failed`

### 3. Dunning Sequence (Progressive Urgency)

- **Trigger:** Scheduled job or manual trigger
- **Purpose:** Recover failed payments with escalating urgency
- **Severity Levels:**
  - **Reminder** (Days 1-2): Friendly reminder
  - **Urgent** (Days 3-6): Strong call to action
  - **Final** (Day 7+): Final warning before cancellation
- **Categories:** `dunning-reminder`, `dunning-urgent`, `dunning-final`

### 4. Subscription Cancelled

- **Trigger:** `customer.subscription.deleted` webhook from Stripe
- **Purpose:** Confirm cancellation, provide reactivation option
- **Template Data:** Tier, end date, reactivation URL
- **Category:** `subscription-cancelled`

### 5. Usage Report (Monthly)

- **Trigger:** Scheduled monthly job (future implementation)
- **Purpose:** Provide usage transparency
- **Template Data:** Period, seats, API calls, total cost
- **Category:** `usage-report`

---

## Testing Procedures

### Pre-Deployment Testing (Local)

1. **Set Local Environment Variables**

   ```bash
   # Add to .env.local (DO NOT commit this file)
   SENDGRID_API_KEY=SG.your_test_api_key_here
   SENDGRID_FROM_EMAIL=billing@judgefinder.io

   # Required for database access
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Create Test Organization in Database**

   ```sql
   -- Run in Supabase SQL Editor
   INSERT INTO organizations (id, name, billing_email)
   VALUES ('org_test_sendgrid', 'Test Organization', 'your-test-email@example.com');
   ```

3. **Run Test Script**

   ```bash
   # Test single email type
   npx tsx scripts/test-email-system.ts payment-success org_test_sendgrid

   # Test all email types (7 emails)
   npx tsx scripts/test-email-system.ts all org_test_sendgrid
   ```

4. **Verify Results**
   - Check terminal output for success messages
   - Check `email_send_log` table in Supabase:
     ```sql
     SELECT * FROM email_send_log
     ORDER BY created_at DESC
     LIMIT 10;
     ```
   - Check your test email inbox
   - Verify email rendered correctly (HTML and text versions)

### Post-Deployment Testing (Production)

1. **Test with Stripe Webhook**

   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe

   # Login to Stripe
   stripe login

   # Forward webhooks to production URL
   stripe listen --forward-to https://judgefinder.io/api/webhooks/stripe

   # Trigger test payment success event
   stripe trigger invoice.payment_succeeded

   # Trigger test payment failed event
   stripe trigger invoice.payment_failed
   ```

2. **Verify in Production Database**

   ```sql
   -- Check email send log
   SELECT
     email_to,
     email_subject,
     status,
     metadata->>'provider' as provider,
     metadata->>'category' as category,
     created_at
   FROM email_send_log
   ORDER BY created_at DESC
   LIMIT 20;

   -- Expected: Recent emails with status 'sent' and provider 'sendgrid'
   ```

3. **Check SendGrid Dashboard**
   - Go to https://app.sendgrid.com/stats/overview
   - View "Requests" (emails sent)
   - View "Delivered" (successful deliveries)
   - View "Bounces" (failed deliveries)
   - View "Spam Reports" (should be 0)

4. **Monitor Netlify Function Logs**
   - Netlify Dashboard → Functions tab
   - Look for email-related function executions
   - Check for errors or warnings
   - Verify successful SendGrid API calls

---

## Monitoring and Troubleshooting

### Email Delivery Monitoring

#### SendGrid Dashboard Metrics

- **URL:** https://app.sendgrid.com/stats/overview
- **Key Metrics:**
  - **Requests:** Total emails sent
  - **Delivered:** Successfully delivered (target: >95%)
  - **Opens:** Recipient opened email (optional tracking)
  - **Bounces:** Failed deliveries (target: <5%)
  - **Spam Reports:** Marked as spam (target: 0%)

#### Database Monitoring

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

-- Failed emails with details
SELECT
  email_to,
  email_subject,
  metadata->>'error' as error_message,
  created_at
FROM email_send_log
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 50;

-- Email delivery success rate (last 7 days)
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM email_send_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

#### Sentry Error Tracking

- All email errors logged to Sentry
- Set up alerts for email delivery failures
- Monitor error frequency and patterns

### Common Issues and Solutions

#### Issue 1: Emails Not Sending

**Symptoms:**

- Email logs show `provider: 'none'` in metadata
- No emails arriving in inbox
- No SendGrid activity in dashboard

**Diagnosis:**

```bash
# Check if environment variables are set in Netlify
# Netlify Dashboard → Site settings → Environment variables
# Verify SENDGRID_API_KEY and SENDGRID_FROM_EMAIL exist

# Check function logs for warnings
# Look for: "SendGrid API key not configured"
```

**Solutions:**

1. Verify API key set in Netlify (Step 4)
2. Verify sender email verified in SendGrid (Step 3)
3. Redeploy site to pick up new environment variables
4. Check API key validity:
   ```bash
   curl -X GET https://api.sendgrid.com/v3/user/email \
     -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

#### Issue 2: Emails Marked as Spam

**Symptoms:**

- Emails delivered but land in spam folder
- High spam report rate in SendGrid dashboard

**Diagnosis:**

- Check sender reputation: https://senderscore.org/
- Check email content for spam triggers
- Verify domain authentication (SPF, DKIM)

**Solutions:**

1. **Set up Domain Authentication** (Step 3, Option B)
   - Improves sender reputation
   - Prevents "via sendgrid.net" warning

2. **Check DNS Records**

   ```bash
   # Verify SPF record
   dig judgefinder.io TXT | grep spf

   # Verify DKIM records
   dig s1._domainkey.judgefinder.io CNAME
   dig s2._domainkey.judgefinder.io CNAME
   ```

3. **Review Email Content**
   - Avoid spam trigger words (FREE, ACT NOW, URGENT)
   - Include unsubscribe link (for marketing emails)
   - Test content: https://www.mail-tester.com/

4. **Enable DMARC** (advanced)
   ```
   _dmarc.judgefinder.io → TXT → v=DMARC1; p=none; rua=mailto:dmarc@judgefinder.io
   ```

#### Issue 3: API Key Invalid Error

**Symptoms:**

- Email logs show status: 'error'
- Error message: "Unauthorized" or "403 Forbidden"
- SendGrid API returns 401/403 status

**Diagnosis:**

```sql
-- Check error logs
SELECT * FROM email_send_log
WHERE status = 'error'
  AND metadata->>'error' LIKE '%401%'
ORDER BY created_at DESC;
```

**Solutions:**

1. **Regenerate API Key**
   - SendGrid Dashboard → Settings → API Keys
   - Delete old key
   - Create new key with Full Access permissions
   - Update Netlify environment variable

2. **Check Key Format**
   - Must start with `SG.`
   - No extra spaces or newlines
   - Full key length (not truncated)

3. **Verify Permissions**
   - Key must have "Mail Send" permission at minimum
   - Recommended: Full Access for simplicity

#### Issue 4: Sender Email Not Verified

**Symptoms:**

- SendGrid API returns error about unverified sender
- Status code 403 with message about sender verification

**Solution:**

- Verify sender email in SendGrid (Step 3)
- Check verification status: Settings → Sender Authentication
- Re-send verification email if needed
- Wait for verification before sending

#### Issue 5: High Bounce Rate

**Symptoms:**

- SendGrid dashboard shows >5% bounce rate
- Email logs show delivery failures

**Types of Bounces:**

- **Hard Bounce:** Invalid email address (remove from list)
- **Soft Bounce:** Temporary issue (mailbox full, server down)

**Solutions:**

1. **Clean Email List**

   ```sql
   -- Find invalid email addresses
   SELECT DISTINCT email_to
   FROM email_send_log
   WHERE status = 'error'
     AND metadata->>'error' LIKE '%bounce%'
   ORDER BY email_to;
   ```

2. **Monitor Suppression List**
   - SendGrid Dashboard → Suppressions
   - Remove manually if bounce was temporary

3. **Validate Emails Before Sending**
   - Use email validation service
   - Check for typos in organization billing emails

---

## Cost Estimation

### SendGrid Pricing Tiers

| Tier       | Monthly Emails | Daily Limit | Price/Month | Best For                      |
| ---------- | -------------- | ----------- | ----------- | ----------------------------- |
| Free       | 3,000          | 100         | $0          | Development, Testing, Launch  |
| Essentials | 50,000         | 1,667       | $19.95      | Small Production (<5K users)  |
| Pro        | 100,000        | 3,333       | $89.95      | Growing Business (10K+ users) |
| Premier    | Custom         | Custom      | Custom      | Enterprise (100K+ users)      |

### JudgeFinder Usage Estimates

**Assumptions:**

- Payment success: 1 email per successful subscription payment
- Payment failed: 5% failure rate (industry average)
- Dunning: 3 emails per failed payment (reminder, urgent, final)
- Cancellations: 2% monthly churn
- Usage reports: 1 email per subscriber per month (future feature)

**Estimates by User Count:**

| Active Subscriptions | Monthly Emails | Recommended Tier | Cost/Month |
| -------------------- | -------------- | ---------------- | ---------- |
| 100                  | ~150           | Free             | $0         |
| 500                  | ~750           | Free             | $0         |
| 1,000                | ~1,500         | Free             | $0         |
| 5,000                | ~7,500         | Essentials       | $19.95     |
| 10,000               | ~15,000        | Essentials       | $19.95     |
| 50,000               | ~75,000        | Pro              | $89.95     |

**Calculation Breakdown (1,000 subscribers):**

- Payment success: 1,000 emails/month
- Payment failed: 50 emails/month (5% failure)
- Dunning: 150 emails/month (3 emails × 50 failures)
- Cancellations: 20 emails/month (2% churn)
- Usage reports: 0 (not yet implemented)
- **Total: ~1,220 emails/month**

**Recommendation:** Start with Free tier, upgrade to Essentials when crossing 3,000 emails/month.

---

## Security Best Practices

### API Key Management

1. **Never Commit to Git**

   ```bash
   # Verify .env.local in .gitignore
   grep "\.env\.local" .gitignore

   # Expected: .env.local is ignored
   ```

2. **Rotate Keys Regularly**
   - Schedule: Every 90 days (quarterly)
   - Process:
     1. Create new API key in SendGrid
     2. Update Netlify environment variable
     3. Trigger redeploy
     4. Verify new key working
     5. Delete old key in SendGrid

3. **Use Separate Keys for Environments**
   - Development: `JudgeFinder Development` (restricted to test domain)
   - Production: `JudgeFinder Production` (full access)

4. **Monitor API Key Usage**
   - SendGrid Dashboard → API Keys → View activity
   - Set up alerts for unusual activity

### Email Content Security

1. **Never Include Sensitive Data**
   - No passwords
   - No full credit card numbers (last 4 digits only)
   - No sensitive personal information

2. **Always Use HTTPS Links**
   - Billing portal: `https://judgefinder.io/dashboard/billing`
   - Invoice URLs from Stripe are always HTTPS

3. **Validate All User Data**
   - Sanitize organization names before including in emails
   - Escape HTML special characters
   - Prevent injection attacks

### Rate Limiting

1. **Prevent Email Bombing**
   - Max 10 emails per organization per day
   - Implemented in dunning manager
   - Database tracking prevents duplicates

2. **Exponential Backoff for Failures**
   - First retry: 1 hour
   - Second retry: 4 hours
   - Third retry: 24 hours
   - Max retries: 3 attempts

---

## Production Checklist

Before going live with SendGrid:

### Pre-Launch

- [ ] SendGrid account created and verified
- [ ] API key generated with Full Access (or Mail Send minimum)
- [ ] Sender email verified in SendGrid
- [ ] Domain authentication configured (recommended)
- [ ] DNS records added and verified (if domain authentication)
- [ ] Environment variables set in Netlify (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)
- [ ] Site redeployed after adding environment variables

### Testing

- [ ] Test script executed successfully locally
- [ ] Test email received in inbox (not spam)
- [ ] Email rendering correct (HTML and plain text)
- [ ] Stripe webhook test completed
- [ ] Email logged in database (`email_send_log` table)
- [ ] SendGrid dashboard shows delivered email

### Monitoring

- [ ] Sentry alerts configured for email errors
- [ ] SendGrid dashboard bookmarked for monitoring
- [ ] Database queries saved for email tracking
- [ ] Netlify function logs reviewed for email-related functions

### Documentation

- [ ] This setup guide reviewed
- [ ] Team members trained on email system
- [ ] Troubleshooting procedures documented
- [ ] API key rotation schedule set (quarterly)

---

## Additional Resources

### Official Documentation

- **SendGrid Docs:** https://docs.sendgrid.com/
- **SendGrid API Reference:** https://docs.sendgrid.com/api-reference/mail-send/mail-send
- **Sender Authentication:** https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication
- **Email Best Practices:** https://sendgrid.com/blog/email-best-practices/

### JudgeFinder Documentation

- **Email System Overview:** `/docs/EMAIL_SYSTEM.md`
- **Email Testing Guide:** `/docs/EMAIL_TESTING_GUIDE.md`
- **Email Implementation Summary:** `/docs/EMAIL_IMPLEMENTATION_SUMMARY.md`
- **Quick Reference:** `/docs/EMAIL_QUICK_REFERENCE.md`

### Testing Scripts

- **Email Test Script:** `/scripts/test-email-system.ts`
- **Usage:**
  ```bash
  npx tsx scripts/test-email-system.ts [email-type] [organization-id]
  npx tsx scripts/test-email-system.ts all org_test123
  ```

### Support Contacts

- **SendGrid Support:** https://support.sendgrid.com/
- **SendGrid Status:** https://status.sendgrid.com/
- **JudgeFinder Team:** dev@judgefinder.io

---

## Quick Reference

### Essential Commands

```bash
# Test API key validity
curl -X GET https://api.sendgrid.com/v3/user/email \
  -H "Authorization: Bearer $SENDGRID_API_KEY"

# Test email sending (local)
npx tsx scripts/test-email-system.ts payment-success org_test123

# Check DNS records
dig em1234.judgefinder.io CNAME
dig s1._domainkey.judgefinder.io CNAME

# Monitor email logs
psql $DATABASE_URL -c "SELECT * FROM email_send_log ORDER BY created_at DESC LIMIT 10;"

# Stripe webhook testing
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### Environment Variables Summary

| Variable            | Required    | Example                  | Location          |
| ------------------- | ----------- | ------------------------ | ----------------- |
| SENDGRID_API_KEY    | Recommended | `SG.xxx...yyy`           | Netlify Dashboard |
| SENDGRID_FROM_EMAIL | Recommended | `billing@judgefinder.io` | Netlify Dashboard |
| BILLING_FROM_EMAIL  | Optional    | `noreply@judgefinder.io` | Netlify Dashboard |

### Key URLs

| Purpose               | URL                                             |
| --------------------- | ----------------------------------------------- |
| SendGrid Dashboard    | https://app.sendgrid.com/                       |
| API Keys              | https://app.sendgrid.com/settings/api_keys      |
| Sender Authentication | https://app.sendgrid.com/settings/sender_auth   |
| Email Stats           | https://app.sendgrid.com/stats/overview         |
| Netlify Dashboard     | https://app.netlify.com/                        |
| Environment Variables | Netlify → Site Settings → Environment variables |

---

## Changelog

### Version 1.0.0 (October 24, 2025)

- Initial documentation for SendGrid setup
- Comprehensive step-by-step instructions
- Testing procedures and troubleshooting
- Cost estimation and monitoring guidance
- Security best practices

---

**Document Status:** Ready for Production Use
**Next Review:** January 24, 2026
**Maintained By:** JudgeFinder Engineering Team
