# Email System Testing Guide

## Quick Start Testing

### 1. Local Development Testing (No Real Emails)

When `SENDGRID_API_KEY` is not set, emails are logged to console and database only.

```bash
# Start development server
npm run dev

# Trigger test webhook (requires Stripe CLI)
stripe trigger invoice.payment_succeeded
```

**Expected Output:**

```
[INFO] Payment succeeded notification sent for org org_abc123: $500
Email logged to database (provider: none)
```

---

## SendGrid Test Mode Setup

### Step 1: Create SendGrid Account

1. Visit: https://app.sendgrid.com/signup
2. Sign up with email
3. Verify email address
4. Choose **Free Plan** (100 emails/day)

### Step 2: Generate API Key

1. Navigate to: **Settings → API Keys**
2. Click **"Create API Key"**
3. Name: `JudgeFinder Development`
4. Permissions: **Full Access**
5. Copy API key (starts with `SG.`)

**IMPORTANT:** Save this key - it's only shown once!

### Step 3: Verify Sender Email

**Option A: Single Sender Verification (Fastest)**

1. Navigate to: **Settings → Sender Authentication → Single Sender Verification**
2. Click **"Create New Sender"**
3. Fill in:
   - **From Name:** JudgeFinder Billing
   - **From Email:** your-personal-email@gmail.com (for testing)
   - **Reply To:** Same as above
   - **Company:** JudgeFinder
4. Click **"Create"**
5. Check your email and click verification link

**Option B: Domain Authentication (Production)**

1. Navigate to: **Settings → Sender Authentication → Authenticate Your Domain**
2. Follow DNS setup instructions
3. Wait for DNS propagation (up to 48 hours)

### Step 4: Configure Environment

```bash
# .env.local
SENDGRID_API_KEY=SG.your_actual_api_key_here
SENDGRID_FROM_EMAIL=your-verified-email@gmail.com
```

### Step 5: Test Email Sending

```bash
# Restart dev server
npm run dev

# In another terminal, trigger webhook
stripe trigger invoice.payment_succeeded

# Check console for:
# "Payment success email sent" with email address
```

**Check your email inbox for the payment confirmation!**

---

## Testing Each Email Type

### 1. Payment Success Email

**Trigger Webhook:**

```bash
stripe trigger invoice.payment_succeeded
```

**Or Manual Test:**

```typescript
// Create test script: scripts/test-email-payment-success.ts
import { sendPaymentSuccessEmail } from '@/lib/email/service'

await sendPaymentSuccessEmail('org_test123', {
  amount: 500.0,
  currency: 'usd',
  invoiceUrl: 'https://invoice.stripe.com/test',
  periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
})

console.log('Payment success email sent!')
```

**Run:**

```bash
npx tsx scripts/test-email-payment-success.ts
```

**Expected Email:**

- Subject: "Payment Received - JudgeFinder Subscription"
- Green checkmark header
- Amount: $500.00 USD
- Next billing date
- View Invoice button (if URL provided)

---

### 2. Payment Failed Email

**Trigger Webhook:**

```bash
stripe trigger invoice.payment_failed
```

**Or Manual Test:**

```typescript
// scripts/test-email-payment-failed.ts
import { sendPaymentFailedEmail } from '@/lib/email/service'

await sendPaymentFailedEmail('org_test123', {
  amount: 500.0,
  currency: 'usd',
  attemptCount: 1,
  nextAttempt: new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }),
  invoiceUrl: 'https://invoice.stripe.com/test',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})

console.log('Payment failed email sent!')
```

**Expected Email:**

- Subject: "Action Required: Payment Failed - JudgeFinder"
- Red warning header
- Amount due: $500.00 USD
- Attempt: 1
- Next retry date
- Update Payment Method button

---

### 3. Dunning Emails (Progressive Urgency)

**Test Reminder (Day 1-2):**

```typescript
// scripts/test-email-dunning-reminder.ts
import { sendDunningEmail } from '@/lib/email/service'

await sendDunningEmail('org_test123', {
  amount: 500.0,
  currency: 'usd',
  daysOverdue: 1,
  severity: 'reminder',
  invoiceUrl: 'https://invoice.stripe.com/test',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})
```

**Test Urgent (Day 3-6):**

```typescript
await sendDunningEmail('org_test123', {
  amount: 500.0,
  currency: 'usd',
  daysOverdue: 5,
  severity: 'urgent',
  invoiceUrl: 'https://invoice.stripe.com/test',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})
```

**Test Final (Day 7+):**

```typescript
await sendDunningEmail('org_test123', {
  amount: 500.0,
  currency: 'usd',
  daysOverdue: 8,
  severity: 'final',
  invoiceUrl: 'https://invoice.stripe.com/test',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})
```

**Expected Differences:**

- **Reminder:** Yellow header, friendly tone, bell icon
- **Urgent:** Orange header, stronger CTA, warning icon
- **Final:** Red header, final warning, alert icon

---

### 4. Subscription Cancelled Email

**Trigger Webhook:**

```bash
stripe trigger customer.subscription.deleted
```

**Or Manual Test:**

```typescript
// scripts/test-email-subscription-cancelled.ts
import { sendSubscriptionCancelledEmail } from '@/lib/email/service'

await sendSubscriptionCancelledEmail('org_test123', {
  tier: 'PRO',
  endDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
  reactivationUrl: 'https://judgefinder.io/dashboard/billing',
})
```

**Expected Email:**

- Subject: "Subscription Cancelled - JudgeFinder"
- Gray header with wave emoji
- Plan: PRO
- Access until date
- Reactivate Subscription button

---

### 5. Usage Report Email

**Manual Test Only:**

```typescript
// scripts/test-email-usage-report.ts
import { sendUsageReportEmail } from '@/lib/email/service'

await sendUsageReportEmail('org_test123', {
  periodStart: 'January 1, 2025',
  periodEnd: 'January 31, 2025',
  seats: 10,
  usedSeats: 8,
  apiCallsUsed: 750,
  apiCallsLimit: 1000,
  totalCost: 490.0,
  currency: 'usd',
})
```

**Expected Email:**

- Subject: "Monthly Usage Report - January 1, 2025 to January 31, 2025"
- Chart icon header
- Seat usage: 8/10 (80%)
- API usage: 750/1,000 (75%)
- Progress bars for visualization
- Total cost: $490.00 USD

---

## Testing Dunning Sequence Logic

### Test Duplicate Prevention

```typescript
// scripts/test-dunning-duplicate-prevention.ts
import { sendDunningNotification, shouldSendDunningEmail } from '@/lib/email/dunning-manager'

// First send
await sendDunningNotification({
  organizationId: 'org_test123',
  stripeInvoiceId: 'in_test123',
  amount: 500,
  currency: 'usd',
  attemptCount: 1,
  invoiceUrl: 'https://invoice.stripe.com/test',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})

console.log('First dunning email sent')

// Try to send again immediately
const shouldSend = await shouldSendDunningEmail('org_test123', 'in_test123', 'reminder')
console.log('Should send again?', shouldSend) // Expected: false

// Wait 25 hours, then should send with higher severity
```

---

## Testing Advertiser Payment Failure

### Setup Test Advertiser

1. Create test advertiser in Stripe Dashboard
2. Create test subscription for judge ad
3. Trigger payment failure

**Or use webhook:**

```bash
stripe trigger invoice.payment_failed \
  --add invoice.subscription=sub_test123 \
  --add invoice.metadata.ad_type=judge-profile \
  --add invoice.metadata.judge_name="Hon. Jane Smith" \
  --add invoice.metadata.court_name="Superior Court of California"
```

**Expected Email:**

- Subject: "Action Required: Payment Failed for Judge Ad - JudgeFinder"
- Judge and court details
- Amount due
- Dashboard link

---

## Email Validation Checklist

For each email template, verify:

### Content

- [ ] Correct subject line
- [ ] Personalized greeting (organization name)
- [ ] Clear call-to-action (CTA)
- [ ] All amounts formatted as currency ($500.00)
- [ ] All dates formatted consistently
- [ ] Proper grammar and spelling

### Links

- [ ] All links work (test in email client)
- [ ] HTTPS protocol used
- [ ] No broken images
- [ ] CTA buttons are prominent

### Design

- [ ] Mobile responsive (test on phone)
- [ ] Renders correctly in Gmail
- [ ] Renders correctly in Outlook
- [ ] Renders correctly in Apple Mail
- [ ] No layout issues with long text

### Technical

- [ ] Plain text version included
- [ ] HTML validated (no errors)
- [ ] Spam score acceptable (<5)
- [ ] Unsubscribe link (for marketing emails)

---

## Testing Tools

### 1. Email Preview Tools

**Litmus (Paid)**

- https://litmus.com/
- Test across 100+ email clients
- Spam filter testing

**Email on Acid (Paid)**

- https://www.emailonacid.com/
- Similar to Litmus

**Free Alternatives:**

- **Mailtrap** - https://mailtrap.io/ (catch-all for testing)
- **Mailhog** - Local email server for development

### 2. Spam Testing

**Mail Tester**

- Visit: https://www.mail-tester.com/
- Send test email to provided address
- Get spam score (aim for 8+/10)

**GlockApps**

- https://glockapps.com/
- Comprehensive deliverability testing

### 3. HTML Validation

**W3C Validator**

- https://validator.w3.org/
- Paste HTML and check for errors

### 4. Responsive Design Testing

**Responsive Design Checker**

- https://responsivedesignchecker.com/
- Test email on different screen sizes

---

## Automated Testing (Unit Tests)

### Template Rendering Tests

```typescript
// tests/unit/email/templates.test.ts
import { describe, it, expect } from 'vitest'
import { getPaymentSuccessTemplate } from '@/lib/email/templates'

describe('Email Templates', () => {
  describe('getPaymentSuccessTemplate', () => {
    it('should render payment success email', () => {
      const template = getPaymentSuccessTemplate({
        organizationName: 'Test Org',
        amount: 500,
        currency: 'usd',
        periodEnd: 'February 1, 2025',
      })

      expect(template.subject).toBe('Payment Received - JudgeFinder Subscription')
      expect(template.html).toContain('Test Org')
      expect(template.html).toContain('$500.00')
      expect(template.text).toContain('Test Org')
    })

    it('should include invoice URL when provided', () => {
      const template = getPaymentSuccessTemplate({
        organizationName: 'Test Org',
        amount: 500,
        currency: 'usd',
        invoiceUrl: 'https://invoice.stripe.com/test',
        periodEnd: 'February 1, 2025',
      })

      expect(template.html).toContain('https://invoice.stripe.com/test')
    })
  })
})
```

**Run tests:**

```bash
npm run test:unit tests/unit/email/
```

---

## Integration Testing

### Webhook Flow Test

```typescript
// tests/integration/email-webhook.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { handleStripeWebhook } from '@/lib/stripe/webhooks'
import { createClient } from '@/lib/supabase/server'

describe('Email Webhook Integration', () => {
  beforeEach(async () => {
    // Setup test organization
    const supabase = await createClient()
    await supabase.from('organizations').insert({
      id: 'org_test123',
      name: 'Test Organization',
      billing_email: 'test@example.com',
      subscription_tier: 'PRO',
    })
  })

  it('should send payment success email on invoice.payment_succeeded', async () => {
    const webhook = {
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'in_test123',
          customer: 'cus_test123',
          amount_paid: 50000, // $500.00
          // ... other invoice fields
        },
      },
    }

    await handleStripeWebhook(webhook)

    // Check email_send_log
    const supabase = await createClient()
    const { data } = await supabase
      .from('email_send_log')
      .select('*')
      .eq('email_to', 'test@example.com')
      .eq('email_subject', 'Payment Received - JudgeFinder Subscription')
      .single()

    expect(data).toBeTruthy()
    expect(data.status).toBe('sent')
  })
})
```

---

## Production Testing Checklist

Before deploying to production:

### Configuration

- [ ] `SENDGRID_API_KEY` set in Netlify/Vercel
- [ ] `SENDGRID_FROM_EMAIL` verified in SendGrid
- [ ] Domain authentication completed
- [ ] SPF, DKIM, DMARC records configured

### Testing

- [ ] All email types tested manually
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Spam scores acceptable (>8/10)
- [ ] Mobile rendering verified

### Monitoring

- [ ] Sentry alerts configured for email errors
- [ ] SendGrid webhook configured for bounce tracking
- [ ] Database monitoring set up for email_send_log

### Documentation

- [ ] Team trained on email system
- [ ] Runbook created for incidents
- [ ] Support team has email templates reference

---

## Common Issues & Solutions

### Issue: Emails not sending (no errors)

**Solution:**

1. Check `email_send_log` table for entries
2. Verify `SENDGRID_API_KEY` is set correctly
3. Test API key with curl:
   ```bash
   curl -X GET https://api.sendgrid.com/v3/user/email \
     -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

### Issue: Emails going to spam

**Solution:**

1. Verify domain authentication
2. Check spam score at mail-tester.com
3. Review content for spam trigger words
4. Add unsubscribe link (for marketing emails)

### Issue: Template rendering issues

**Solution:**

1. Validate HTML at validator.w3.org
2. Test in multiple email clients
3. Use inline CSS (external CSS not supported)
4. Avoid complex layouts

### Issue: Duplicate emails sent

**Solution:**

1. Check webhook logs for duplicates
2. Verify idempotency in webhook handler
3. Review dunning manager logic
4. Check `shouldSendDunningEmail()` function

---

## Support Resources

- **SendGrid Docs:** https://docs.sendgrid.com/
- **Stripe Webhook Docs:** https://stripe.com/docs/webhooks
- **Email Best Practices:** https://www.emailonacid.com/blog/
- **Deliverability Guide:** https://www.validity.com/resource-center/email-deliverability-guide/
