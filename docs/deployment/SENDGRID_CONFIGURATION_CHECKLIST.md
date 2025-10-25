# SendGrid Configuration Checklist

**Quick Reference for Netlify Deployment**
**Last Updated:** October 24, 2025

---

## Required Environment Variables

Add these to Netlify Dashboard → Site Settings → Environment Variables:

### 1. SENDGRID_API_KEY

```
Variable Name: SENDGRID_API_KEY
Value: SG.xxxxxxxxxxxxxx.yyyyyyyyyyyyyyyy
Type: Secret
Required: RECOMMENDED for production
```

### 2. SENDGRID_FROM_EMAIL

```
Variable Name: SENDGRID_FROM_EMAIL
Value: billing@judgefinder.io
Type: Configuration
Required: RECOMMENDED for production
```

### 3. BILLING_FROM_EMAIL (Optional)

```
Variable Name: BILLING_FROM_EMAIL
Value: noreply@judgefinder.io
Type: Configuration
Required: OPTIONAL (fallback)
```

---

## Setup Steps

### Step 1: Create SendGrid Account (5 minutes)

- [ ] Go to https://signup.sendgrid.com/
- [ ] Sign up for free tier (100 emails/day)
- [ ] Verify email address
- [ ] Complete account profile

### Step 2: Generate API Key (2 minutes)

- [ ] Log in to SendGrid dashboard
- [ ] Navigate to Settings → API Keys
- [ ] Click "Create API Key"
- [ ] Name: `JudgeFinder Production`
- [ ] Permissions: Full Access (or Mail Send minimum)
- [ ] Copy API key immediately (shown only once!)
- [ ] Store in password manager

**Test API Key:**

```bash
curl -X GET https://api.sendgrid.com/v3/user/email \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

### Step 3: Verify Sender Email (5 minutes)

- [ ] Go to Settings → Sender Authentication
- [ ] Click "Verify a Single Sender"
- [ ] Enter email: `billing@judgefinder.io`
- [ ] Fill in required fields (name, address)
- [ ] Check inbox and click verification link
- [ ] Confirm "Verified" status in dashboard

**Optional: Domain Authentication (15 minutes)**

- [ ] Go to Settings → Sender Authentication
- [ ] Click "Authenticate Your Domain"
- [ ] Domain: `judgefinder.io`
- [ ] Copy DNS records (3 CNAME records)
- [ ] Add to DNS provider (Netlify DNS, Cloudflare, etc.)
- [ ] Wait 5-60 minutes for propagation
- [ ] Verify in SendGrid dashboard

### Step 4: Add to Netlify (3 minutes)

- [ ] Open Netlify Dashboard
- [ ] Select JudgeFinder site
- [ ] Go to Site Settings → Environment Variables
- [ ] Add `SENDGRID_API_KEY` with your API key
- [ ] Add `SENDGRID_FROM_EMAIL` with `billing@judgefinder.io`
- [ ] Select scopes: Production (required), Deploy Previews (optional)
- [ ] Save variables

### Step 5: Deploy and Test (10 minutes)

- [ ] Trigger redeploy: Netlify → Deploys → Trigger deploy → Clear cache and deploy
- [ ] Wait for build to complete
- [ ] Run test script locally:

```bash
npx tsx scripts/test-email-system.ts payment-success org_test123
```

- [ ] Check email received in inbox
- [ ] Verify email in database:

```sql
SELECT * FROM email_send_log ORDER BY created_at DESC LIMIT 5;
```

- [ ] Check SendGrid dashboard for delivery stats

---

## Verification Checklist

### Pre-Deployment

- [ ] API key generated and saved securely
- [ ] Sender email verified (green checkmark in SendGrid)
- [ ] Environment variables added to Netlify
- [ ] Site redeployed after adding variables

### Post-Deployment

- [ ] Test email sent successfully
- [ ] Email received in inbox (not spam)
- [ ] Email logged in `email_send_log` table with status 'sent'
- [ ] SendGrid dashboard shows delivered email
- [ ] No errors in Netlify function logs

### Production Readiness

- [ ] Domain authentication configured (optional but recommended)
- [ ] DNS records added and verified
- [ ] Monitoring dashboards bookmarked
- [ ] Sentry alerts configured for email errors
- [ ] Team trained on email system

---

## Testing Commands

### Local Testing

```bash
# Single email type
npx tsx scripts/test-email-system.ts payment-success org_test_sendgrid

# All email types (7 emails)
npx tsx scripts/test-email-system.ts all org_test_sendgrid
```

### Database Verification

```sql
-- Check recent emails
SELECT
  email_to,
  email_subject,
  status,
  metadata->>'provider' as provider,
  created_at
FROM email_send_log
ORDER BY created_at DESC
LIMIT 10;

-- Check for errors
SELECT * FROM email_send_log
WHERE status = 'error'
ORDER BY created_at DESC;
```

### Stripe Webhook Testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to https://judgefinder.io/api/webhooks/stripe

# Trigger events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

---

## Troubleshooting Quick Fixes

### Emails Not Sending

**Check:**

- [ ] API key set in Netlify? (Site Settings → Environment Variables)
- [ ] Sender email verified in SendGrid? (Settings → Sender Authentication)
- [ ] Site redeployed after adding variables?

**Test API Key:**

```bash
curl -X GET https://api.sendgrid.com/v3/user/email \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
```

### Emails Landing in Spam

**Fix:**

- [ ] Set up domain authentication (Settings → Sender Authentication)
- [ ] Add DNS records (SPF, DKIM)
- [ ] Check email content for spam trigger words

### API Key Invalid

**Fix:**

- [ ] Regenerate API key in SendGrid
- [ ] Update Netlify environment variable
- [ ] Redeploy site
- [ ] Verify key format: Must start with `SG.`

---

## Important Links

| Resource              | URL                                           |
| --------------------- | --------------------------------------------- |
| SendGrid Dashboard    | https://app.sendgrid.com/                     |
| API Keys              | https://app.sendgrid.com/settings/api_keys    |
| Sender Authentication | https://app.sendgrid.com/settings/sender_auth |
| Email Stats           | https://app.sendgrid.com/stats/overview       |
| Netlify Dashboard     | https://app.netlify.com/                      |
| Full Setup Guide      | `/docs/deployment/SENDGRID_SETUP_GUIDE.md`    |

---

## Email Types Sent by System

1. **Payment Success** - Confirms successful payment (invoice.payment_succeeded)
2. **Payment Failed** - Notifies of payment failure (invoice.payment_failed)
3. **Dunning Reminder** - Friendly reminder (Day 1-2 overdue)
4. **Dunning Urgent** - Strong call to action (Day 3-6 overdue)
5. **Dunning Final** - Final warning (Day 7+ overdue)
6. **Subscription Cancelled** - Confirms cancellation (customer.subscription.deleted)
7. **Usage Report** - Monthly usage summary (future feature)

---

## Cost Reference

| Tier       | Monthly Emails  | Price     | JudgeFinder Fit            |
| ---------- | --------------- | --------- | -------------------------- |
| Free       | 3,000 (100/day) | $0        | Launch, Testing, <3K users |
| Essentials | 50,000          | $19.95/mo | Production, 3K-50K users   |
| Pro        | 100,000         | $89.95/mo | Growing business, 50K-100K |

**Estimated Usage (1,000 subscribers):** ~1,220 emails/month (Free tier sufficient)

---

## Security Reminders

- [ ] NEVER commit API key to git
- [ ] Use separate keys for dev/production
- [ ] Rotate keys quarterly (every 90 days)
- [ ] Monitor API key usage in SendGrid dashboard
- [ ] Review email logs regularly for anomalies

---

## Next Steps After Configuration

1. **Monitor SendGrid Dashboard** - Check delivery stats daily for first week
2. **Set Up Alerts** - Configure Sentry alerts for email failures
3. **Schedule Key Rotation** - Add calendar reminder for 90 days
4. **Document Production Key** - Store in team password manager
5. **Train Team** - Share setup guide with team members

---

**For detailed instructions, see:** `/docs/deployment/SENDGRID_SETUP_GUIDE.md`

**Total Setup Time:** ~30 minutes (excluding DNS propagation)
