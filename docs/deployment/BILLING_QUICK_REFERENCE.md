# Billing System - Quick Reference Card

**Status**: ✅ PRODUCTION READY
**Date Applied**: October 19, 2025
**Supabase Project**: xstlnicbnzdxlgfiewmg

---

## Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `ad_orders` | Completed purchases | stripe_session_id, customer_email, amount_total, status |
| `judge_ad_products` | Stripe product cache | judge_id, position, stripe_product_id, court_level |
| `ad_spot_bookings` | Active subscriptions | judge_id, advertiser_id, stripe_subscription_id, status |
| `checkout_sessions` | Temp webhook data | stripe_session_id, stripe_customer_id, expires_at |

---

## Key Functions

### `requesting_user_id()`
Returns the Clerk user ID from the JWT token's `sub` claim.

**Usage in RLS**:
```sql
USING (created_by = public.requesting_user_id())
```

---

## Common Queries

### Check Recent Orders
```sql
SELECT * FROM ad_orders
ORDER BY created_at DESC
LIMIT 10;
```

### Check Active Bookings
```sql
SELECT
  b.*,
  j.name as judge_name,
  a.organization_name as advertiser
FROM ad_spot_bookings b
LEFT JOIN judges j ON b.judge_id = j.id
LEFT JOIN advertiser_profiles a ON b.advertiser_id = a.id
WHERE b.status IN ('active', 'trialing')
ORDER BY b.created_at DESC;
```

### Find Expired Sessions (Cleanup)
```sql
SELECT * FROM checkout_sessions
WHERE expires_at < NOW();
```

### Check for Double-Bookings (Should be 0)
```sql
SELECT judge_id, position, COUNT(*) as booking_count
FROM ad_spot_bookings
WHERE status IN ('active', 'trialing', 'past_due')
GROUP BY judge_id, position
HAVING COUNT(*) > 1;
```

---

## Webhook Events

### Stripe → Supabase Flow

| Event | Action | Table Updated |
|-------|--------|---------------|
| `checkout.session.completed` | Create order record | `ad_orders` |
| `customer.subscription.created` | Create booking | `ad_spot_bookings` |
| `customer.subscription.updated` | Update status | `ad_spot_bookings` |
| `customer.subscription.deleted` | Mark canceled | `ad_spot_bookings` |

**Webhook URL**: `https://judgefinder.io/api/stripe/webhook`

---

## Security Model

### RLS Policies Summary

**ad_orders**:
- Service role: Full access
- Users: Read their own orders (by `created_by` = Clerk ID)
- Users: Insert/update their own orders

**judge_ad_products**:
- Service role: Full access
- Authenticated: Read active products
- Public: No access

**ad_spot_bookings**:
- Service role: Full access
- Advertisers: Read/update their own bookings
- Public: Read only active bookings (for displaying ads)

**checkout_sessions**:
- Service role: Full access only

---

## Business Rules

### Double-Booking Prevention
- Unique partial index: `idx_ad_bookings_unique_active`
- Constraint: `(judge_id, position)` WHERE status IN ('active', 'trialing', 'past_due')
- Result: Only 1 active ad per judge per position slot

### Pricing Tiers
- **Federal Courts**: $500/month or $5,000/year
- **State Courts**: $200/month or $2,000/year
- Position 1: Standard rotation
- Position 2: Premium rotation (1.75x visibility)

### Subscription Statuses
- `active` - Currently subscribed and paid
- `trialing` - In trial period
- `past_due` - Payment failed, grace period
- `canceled` - Ended by user/admin
- `paused` - Temporarily suspended
- `incomplete` - Initial payment pending

---

## Troubleshooting

### Issue: Orders not appearing for user
**Check**:
```sql
SELECT created_by FROM ad_orders WHERE stripe_session_id = 'cs_xxx';
```
**Fix**: Ensure `created_by` matches Clerk user ID from JWT

### Issue: Double booking occurred
**Check**:
```sql
SELECT * FROM ad_spot_bookings
WHERE judge_id = 'xxx' AND position = 1
AND status IN ('active', 'trialing', 'past_due');
```
**Fix**: Manually cancel one booking, verify index exists

### Issue: Webhook not processing
**Check**:
1. Verify webhook URL in Stripe Dashboard
2. Check `STRIPE_WEBHOOK_SECRET` environment variable
3. Review Netlify function logs for errors
4. Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

---

## Monitoring Queries

### Daily Order Volume
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) as orders,
  SUM(amount_total) / 100 as revenue_usd
FROM ad_orders
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Active Subscriptions by Court Level
```sql
SELECT
  court_level,
  billing_interval,
  COUNT(*) as active_bookings,
  SUM(monthly_price) as monthly_revenue
FROM ad_spot_bookings
WHERE status = 'active'
GROUP BY court_level, billing_interval;
```

### Subscription Health
```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM ad_spot_bookings
GROUP BY status
ORDER BY count DESC;
```

---

## Migration Files Reference

| File | Size | Location |
|------|------|----------|
| `20251013_001_ad_orders_table.sql` | 3.9K | `/supabase/migrations/` |
| `20251015_002_auth_gated_ad_orders.sql` | 3.2K | `/supabase/migrations/` |
| `20250119000000_judge_ad_products_and_bookings.sql` | 8.2K | `/supabase/migrations/` |

---

## API Endpoints

### Create Checkout Session
```
POST /api/checkout/adspace
Body: { judgeId, position, billingInterval }
Returns: { url: "https://checkout.stripe.com/..." }
```

### Stripe Webhook Handler
```
POST /api/stripe/webhook
Headers: { stripe-signature }
Processes: checkout.session.completed, subscription events
```

---

## Testing Commands

### Test Database Connection
```bash
node -e "const { createClient } = require('@supabase/supabase-js'); \
const supabase = createClient('URL', 'KEY'); \
supabase.from('ad_orders').select('count').then(console.log);"
```

### Test Clerk JWT Function
```sql
SELECT public.requesting_user_id();
-- Should return empty string (no JWT in psql context)
```

### Test RLS Policies
```sql
-- As service role (should work)
SELECT * FROM ad_orders;

-- As authenticated user (requires JWT with sub claim)
SET request.jwt.claims = '{"sub": "user_2abc123"}';
SELECT * FROM ad_orders; -- Should only see user's orders
RESET request.jwt.claims;
```

---

## Support

**Documentation**: `/docs/deployment/BILLING_MIGRATIONS_APPLIED.md`
**Code**: `/app/api/stripe/webhook/route.ts`
**Schemas**: `/supabase/migrations/`

---

*Last Updated: October 19, 2025*
*Status: Production Ready*
