# Email Notification System

## Overview

JudgeFinder's email notification system provides automated transactional emails for all Stripe payment events, including payment confirmations, failure notifications, dunning sequences, and subscription lifecycle events.

## Architecture

### Components

1. **Email Templates** (`lib/email/templates.ts`)
   - HTML and text templates for all email types
   - Branded, responsive design
   - Data-driven rendering

2. **Email Service** (`lib/email/service.ts`)
   - Centralized email sending logic
   - Organization email lookup
   - Template rendering and dispatch

3. **Email Mailer** (`lib/email/mailer.ts`)
   - SendGrid API integration
   - Email logging for auditing
   - Fallback for missing configuration

4. **Dunning Manager** (`lib/email/dunning-manager.ts`)
   - Progressive urgency email sequence
   - Payment failure tracking
   - Duplicate email prevention

## Email Types

### 1. Payment Success

**Trigger:** `invoice.payment_succeeded` webhook event

**Purpose:** Confirm successful payment and provide invoice details

**Template Data:**

- Organization name
- Amount paid
- Currency
- Invoice URL (optional)
- Next billing date
- Payment method used

**Example:**

```typescript
await sendPaymentSuccessEmail(organizationId, {
  amount: 500.0,
  currency: 'usd',
  invoiceUrl: 'https://invoice.stripe.com/...',
  periodEnd: 'February 1, 2025',
})
```

---

### 2. Payment Failed

**Trigger:** `invoice.payment_failed` webhook event (first attempt)

**Purpose:** Notify customer of payment failure and provide recovery instructions

**Template Data:**

- Organization name
- Amount due
- Currency
- Attempt count
- Next retry date (optional)
- Invoice URL (optional)
- Billing portal URL

**Example:**

```typescript
await sendPaymentFailedEmail(organizationId, {
  amount: 500.0,
  currency: 'usd',
  attemptCount: 1,
  nextAttempt: 'January 3, 2025',
  invoiceUrl: 'https://invoice.stripe.com/...',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})
```

---

### 3. Dunning Sequence (Progressive)

**Trigger:** Scheduled job or webhook event

**Purpose:** Progressive urgency emails to recover failed payments

**Severity Levels:**

- **Reminder** (Day 1-2): Friendly reminder
- **Urgent** (Day 3-6): Strong call to action
- **Final** (Day 7+): Final warning before cancellation

**Template Data:**

- Organization name
- Amount due
- Currency
- Days overdue
- Severity level
- Invoice URL (optional)
- Billing portal URL

**Example:**

```typescript
await sendDunningEmail(organizationId, {
  amount: 500.0,
  currency: 'usd',
  daysOverdue: 5,
  severity: 'urgent',
  invoiceUrl: 'https://invoice.stripe.com/...',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})
```

---

### 4. Subscription Cancelled

**Trigger:** `customer.subscription.deleted` webhook event

**Purpose:** Confirm cancellation and provide reactivation option

**Template Data:**

- Organization name
- Subscription tier
- Access end date
- Reactivation URL (optional)

**Example:**

```typescript
await sendSubscriptionCancelledEmail(organizationId, {
  tier: 'PRO',
  endDate: 'January 31, 2025',
  reactivationUrl: 'https://judgefinder.io/dashboard/billing',
})
```

---

### 5. Usage Report (Monthly)

**Trigger:** Scheduled monthly job

**Purpose:** Provide usage summary and billing transparency

**Template Data:**

- Organization name
- Reporting period (start/end)
- Seat usage (used/total)
- API call usage (used/limit)
- Total cost
- Currency

**Example:**

```typescript
await sendUsageReportEmail(organizationId, {
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

---

## Setup Instructions

### 1. SendGrid Configuration

1. **Create SendGrid Account**
   - Visit: https://app.sendgrid.com/signup
   - Choose free tier (100 emails/day) or paid plan

2. **Generate API Key**
   - Navigate to: Settings → API Keys
   - Click "Create API Key"
   - Select "Full Access"
   - Copy the API key (shown only once!)

3. **Verify Sender Email**
   - Navigate to: Settings → Sender Authentication
   - Verify your domain (recommended) or single sender email
   - Use: `billing@judgefinder.io` or `noreply@judgefinder.io`

4. **Set Environment Variables**

   ```bash
   SENDGRID_API_KEY=SG.your_api_key_here
   SENDGRID_FROM_EMAIL=billing@judgefinder.io
   ```

5. **Test Email Sending**

   ```bash
   # From project root
   npm run dev

   # Trigger a test webhook
   stripe trigger invoice.payment_succeeded
   ```

---

### 2. Alternative Providers (Future)

The system is designed to be provider-agnostic. To switch from SendGrid to another provider:

#### Resend (Recommended for Next.js)

```typescript
// lib/email/mailer.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({ to, subject, html, text }) {
  await resend.emails.send({
    from: 'JudgeFinder <billing@judgefinder.io>',
    to,
    subject,
    html,
    text,
  })
}
```

#### Postmark

```typescript
import { ServerClient } from 'postmark'

const client = new ServerClient(process.env.POSTMARK_API_KEY)

export async function sendEmail({ to, subject, html, text }) {
  await client.sendEmail({
    From: 'billing@judgefinder.io',
    To: to,
    Subject: subject,
    HtmlBody: html,
    TextBody: text,
  })
}
```

---

## Dunning Sequence Logic

### Progressive Urgency

The dunning manager automatically escalates email urgency based on payment age:

```typescript
function getDunningSeverity(daysOverdue: number): DunningSeverity {
  if (daysOverdue >= 7) return 'final'
  if (daysOverdue >= 3) return 'urgent'
  return 'reminder'
}
```

### Duplicate Prevention

The system prevents spam by:

- **Time throttling:** Max 1 email per 24 hours per invoice
- **Severity tracking:** Same severity level sent only once
- **Database tracking:** All dunning emails logged with metadata

### Manual Trigger

To manually process dunning for an organization:

```typescript
import { processDunningSequence } from '@/lib/email/dunning-manager'

await processDunningSequence('org_abc123')
```

---

## Testing

### Test Mode

When `SENDGRID_API_KEY` is not configured:

- Emails are **not sent**
- All emails are **logged** to `email_send_log` table
- Console shows email content (development mode)

### Webhook Testing

Use Stripe CLI to trigger test webhooks:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```

### Manual Email Testing

```typescript
// Test payment success email
import { sendPaymentSuccessEmail } from '@/lib/email/service'

await sendPaymentSuccessEmail('org_test123', {
  amount: 500.0,
  currency: 'usd',
  invoiceUrl: 'https://example.com/invoice',
  periodEnd: 'February 1, 2025',
})
```

---

## Database Schema

### email_send_log Table

All emails are logged for auditing:

```sql
CREATE TABLE email_send_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  email_to TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  status TEXT CHECK (status IN ('sent', 'error')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Metadata fields:**

- `provider`: 'sendgrid', 'none', etc.
- `category`: 'payment-success', 'dunning-urgent', etc.
- `error`: Error message (if failed)

---

## Monitoring

### Email Delivery Monitoring

1. **SendGrid Dashboard**
   - View: https://app.sendgrid.com/stats/overview
   - Metrics: Delivered, Opened, Clicked, Bounced, Spam

2. **Database Queries**

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

   -- Failed emails
   SELECT *
   FROM email_send_log
   WHERE status = 'error'
   ORDER BY created_at DESC
   LIMIT 100;
   ```

3. **Sentry Integration**
   - All email errors are logged to Sentry
   - Set up alerts for email delivery failures

---

## Best Practices

### Email Content

1. **Always include:**
   - Clear subject line
   - Organization/customer name
   - Amount and currency
   - Call-to-action (CTA) button
   - Invoice URL (when available)
   - Support contact information

2. **Avoid:**
   - Jargon or technical terms
   - Aggressive language (even in final notices)
   - Excessive emojis
   - Breaking changes to template structure

### Deliverability

1. **Domain Authentication**
   - Set up SPF, DKIM, and DMARC records
   - Use verified sending domain
   - Avoid generic domains (gmail.com, yahoo.com)

2. **Content Guidelines**
   - Keep spam score low (test at mail-tester.com)
   - Include plain text version
   - Provide unsubscribe link (for marketing emails)
   - Avoid spam trigger words

3. **Monitoring**
   - Track bounce and complaint rates
   - Remove invalid email addresses
   - Monitor sender reputation

---

## Troubleshooting

### Emails Not Sending

1. **Check environment variables**

   ```bash
   echo $SENDGRID_API_KEY
   echo $SENDGRID_FROM_EMAIL
   ```

2. **Verify SendGrid API key**

   ```bash
   curl -X GET https://api.sendgrid.com/v3/user/email \
     -H "Authorization: Bearer $SENDGRID_API_KEY"
   ```

3. **Check email_send_log table**
   ```sql
   SELECT * FROM email_send_log
   WHERE status = 'error'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

### Duplicate Emails

1. **Check dunning prevention logic**
   - Verify `shouldSendDunningEmail()` is called
   - Check metadata in invoices table

2. **Review webhook logs**
   ```sql
   SELECT * FROM webhook_logs
   WHERE event_type LIKE 'invoice.%'
   ORDER BY created_at DESC;
   ```

### Template Issues

1. **Test template rendering**

   ```typescript
   import { getPaymentSuccessTemplate } from '@/lib/email/templates'

   const template = getPaymentSuccessTemplate({
     organizationName: 'Test Org',
     amount: 500,
     currency: 'usd',
     periodEnd: 'Feb 1, 2025',
   })

   console.log(template.html)
   ```

2. **Validate HTML**
   - Use: https://validator.w3.org/
   - Test responsive design: https://responsivedesignchecker.com/

---

## Scheduled Jobs (Future Implementation)

For automated dunning and usage reports, set up scheduled functions:

### Netlify Functions (Recommended)

```typescript
// netlify/functions/scheduled-dunning.mts
import { schedule } from '@netlify/functions'
import { processDunningSequence } from '@/lib/email/dunning-manager'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const handler = schedule('0 12 * * *', async () => {
  // Run daily at 12:00 PM UTC
  const supabase = await createServiceRoleClient()

  // Get all organizations with past_due subscriptions
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('subscription_status', 'past_due')

  for (const org of orgs || []) {
    await processDunningSequence(org.id)
  }

  return { statusCode: 200 }
})
```

### Vercel Cron Jobs

```typescript
// app/api/cron/dunning/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { processDunningSequence } from '@/lib/email/dunning-manager'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Process dunning...
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'
```

**Configure in `vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/dunning",
      "schedule": "0 12 * * *"
    }
  ]
}
```

---

## Security Considerations

### Environment Variables

- **Never commit** API keys to version control
- Use Netlify/Vercel environment variable management
- Rotate keys regularly (quarterly recommended)

### Email Content

- **Never include** sensitive data (passwords, full card numbers)
- **Always use HTTPS** for all links
- **Validate** all user data before including in emails

### Rate Limiting

- Prevent email bombing with rate limits
- Max 10 emails per organization per day
- Implement exponential backoff for failures

---

## Cost Estimation

### SendGrid Pricing

| Tier       | Monthly Emails        | Price  | Best For            |
| ---------- | --------------------- | ------ | ------------------- |
| Free       | 100/day (3,000/month) | $0     | Development/Testing |
| Essentials | 50,000/month          | $19.95 | Small organizations |
| Pro        | 100,000/month         | $89.95 | Growing businesses  |
| Premier    | Custom                | Custom | Enterprise          |

### JudgeFinder Estimates

Assuming 1,000 active subscriptions:

- Payment success: ~1,000/month
- Payment failed: ~50/month (5% failure rate)
- Dunning: ~150/month (3 emails per failed payment)
- Cancellations: ~20/month
- **Total: ~1,220 emails/month**

**Recommended tier:** Free tier (sufficient for launch)

---

## Support

For questions or issues:

- **Email:** dev@judgefinder.io
- **Slack:** #engineering-email-system
- **Docs:** This file and inline code comments
