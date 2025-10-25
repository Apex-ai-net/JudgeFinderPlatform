# Email System Quick Reference

## Quick Commands

```bash
# Test all email types
npx tsx scripts/test-email-system.ts all org_test123

# Test specific email
npx tsx scripts/test-email-system.ts payment-success org_test123

# Trigger Stripe webhook (requires Stripe CLI)
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted

# Check email logs
# SQL: SELECT * FROM email_send_log ORDER BY created_at DESC LIMIT 10;
```

## Email Types

| Type                       | When Sent              | Template Function                             |
| -------------------------- | ---------------------- | --------------------------------------------- |
| **Payment Success**        | Invoice paid           | `sendPaymentSuccessEmail()`                   |
| **Payment Failed**         | Invoice payment failed | `sendPaymentFailedEmail()`                    |
| **Dunning Reminder**       | 1-2 days overdue       | `sendDunningEmail(..., severity: 'reminder')` |
| **Dunning Urgent**         | 3-6 days overdue       | `sendDunningEmail(..., severity: 'urgent')`   |
| **Dunning Final**          | 7+ days overdue        | `sendDunningEmail(..., severity: 'final')`    |
| **Subscription Cancelled** | Subscription deleted   | `sendSubscriptionCancelledEmail()`            |
| **Usage Report**           | Monthly (manual)       | `sendUsageReportEmail()`                      |

## Environment Variables

```bash
SENDGRID_API_KEY=SG.your_api_key_here          # Required for sending
SENDGRID_FROM_EMAIL=billing@judgefinder.io     # Required for sending
BILLING_FROM_EMAIL=noreply@judgefinder.io      # Fallback
```

## File Locations

```
lib/email/
├── templates.ts           # Email HTML/text templates
├── service.ts             # Email sending functions
├── mailer.ts              # SendGrid integration
└── dunning-manager.ts     # Dunning logic

docs/
├── EMAIL_SYSTEM.md                    # Full documentation
├── EMAIL_TESTING_GUIDE.md             # Testing procedures
├── EMAIL_IMPLEMENTATION_SUMMARY.md    # Implementation details
└── EMAIL_QUICK_REFERENCE.md           # This file

scripts/
└── test-email-system.ts   # Manual testing script
```

## Code Examples

### Send Payment Success Email

```typescript
import { sendPaymentSuccessEmail } from '@/lib/email/service'

await sendPaymentSuccessEmail('org_abc123', {
  amount: 500.0,
  currency: 'usd',
  invoiceUrl: 'https://invoice.stripe.com/...',
  periodEnd: 'February 1, 2025',
})
```

### Send Dunning Email

```typescript
import { sendDunningEmail } from '@/lib/email/service'

await sendDunningEmail('org_abc123', {
  amount: 500.0,
  currency: 'usd',
  daysOverdue: 5,
  severity: 'urgent',
  invoiceUrl: 'https://invoice.stripe.com/...',
  billingPortalUrl: 'https://judgefinder.io/dashboard/billing',
})
```

### Process Dunning Sequence

```typescript
import { processDunningSequence } from '@/lib/email/dunning-manager'

// Automatically determines severity and sends appropriate email
await processDunningSequence('org_abc123')
```

## Webhook Integration Points

### Organization Billing (`lib/stripe/webhooks.ts`)

- Line 291-296: `notifyPaymentSucceeded()` - Payment success
- Line 352-358: `notifyPaymentFailed()` - Payment failure + dunning
- Line 230-234: `notifySubscriptionCanceled()` - Cancellation

### Ad Subscriptions (`app/api/webhooks/stripe/ad-subscriptions/route.ts`)

- Line 356-362: `notifyAdvertiserPaymentFailed()` - Advertiser notification

## Database Schema

### email_send_log Table

```sql
CREATE TABLE email_send_log (
  id UUID PRIMARY KEY,
  user_id TEXT,
  email_to TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  status TEXT CHECK (status IN ('sent', 'error')),
  metadata JSONB,  -- { provider, category, error }
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Common Queries

```sql
-- Email volume by category (last 30 days)
SELECT
  metadata->>'category' as category,
  COUNT(*) as count
FROM email_send_log
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY category
ORDER BY count DESC;

-- Recent failures
SELECT *
FROM email_send_log
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 10;

-- Emails for specific organization
SELECT e.*
FROM email_send_log e
JOIN organizations o ON e.email_to = o.billing_email
WHERE o.id = 'org_abc123'
ORDER BY e.created_at DESC;
```

## Troubleshooting

| Issue               | Solution                               |
| ------------------- | -------------------------------------- |
| Emails not sending  | Check `SENDGRID_API_KEY` is set        |
| Wrong email address | Verify `organizations.billing_email`   |
| Duplicate emails    | Check `shouldSendDunningEmail()` logic |
| Template error      | Validate HTML at validator.w3.org      |

## Testing Checklist

- [ ] Set `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`
- [ ] Verify sender email in SendGrid dashboard
- [ ] Run `npx tsx scripts/test-email-system.ts all org_test123`
- [ ] Check inbox for all 7 email types
- [ ] Verify mobile rendering
- [ ] Check spam score at mail-tester.com

## Production Deployment

```bash
# 1. Set environment variables in Netlify/Vercel
SENDGRID_API_KEY=SG.live_key_here
SENDGRID_FROM_EMAIL=billing@judgefinder.io

# 2. Verify domain authentication (SendGrid)
# - SPF record
# - DKIM record
# - DMARC record

# 3. Deploy
git push origin main

# 4. Test with real webhook
stripe trigger invoice.payment_succeeded --live

# 5. Monitor
# - SendGrid dashboard: https://app.sendgrid.com/stats/overview
# - Sentry: Check for email errors
# - Database: SELECT * FROM email_send_log WHERE status = 'error'
```

## Support Resources

- **Full Documentation:** `/docs/EMAIL_SYSTEM.md`
- **Testing Guide:** `/docs/EMAIL_TESTING_GUIDE.md`
- **Implementation Summary:** `/docs/EMAIL_IMPLEMENTATION_SUMMARY.md`
- **SendGrid Docs:** https://docs.sendgrid.com/
- **Stripe Webhooks:** https://stripe.com/docs/webhooks

## Key Metrics

- **Deliverability:** >98% (monitor in SendGrid)
- **Spam Score:** <5 (test at mail-tester.com)
- **Open Rate:** >20% (industry standard)
- **Bounce Rate:** <2% (remove invalid emails)

## Emergency Contacts

- **Email Issues:** dev@judgefinder.io
- **SendGrid Support:** https://support.sendgrid.com/
- **Stripe Support:** https://support.stripe.com/
