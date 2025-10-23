# Position 3 Ad Slot Booking Test Plan

**Date:** 2025-10-22
**Purpose:** Validate Stripe integration for position 3 ad slot bookings
**Status:** Ready for Testing (pending database migration)

---

## Executive Summary

The Stripe integration is **code-ready** for position 3 ad slot bookings. All application code (checkout flow, webhook handlers, type definitions, and Stripe product management) fully supports positions 1, 2, and 3.

**Blocker:** Database constraints currently limit positions to 1 and 2. Migration `20251022_001_support_three_ad_positions.sql` must be applied before testing.

---

## Pre-Test Requirements

### 1. Database Migration (REQUIRED)

**File:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251022_001_support_three_ad_positions.sql`

**Action:** Apply this migration in Supabase Dashboard SQL Editor or via CLI:
```bash
npx supabase db push
```

**What it does:**
- Updates `ad_spot_bookings` constraint: `CHECK (position IN (1, 2))` → `CHECK (position IN (1, 2, 3))`
- Updates `judge_ad_products` constraint: `CHECK (position IN (1, 2))` → `CHECK (position IN (1, 2, 3))`
- Updates `pending_checkouts` constraint: `CHECK (ad_position IN (1, 2))` → `CHECK (ad_position IN (1, 2, 3))`
- Updates `ad_spots` constraint to allow position 3 for judges
- Changes position 3 status from 'maintenance' to 'available'
- Creates missing position 3 ad_spot rows for all judges

**Verification Query:**
```sql
-- All judges should have 3 ad slots
SELECT entity_id, COUNT(*) as slot_count
FROM ad_spots
WHERE entity_type = 'judge'
GROUP BY entity_id
HAVING COUNT(*) != 3;
-- Should return 0 rows

-- Count available position 3 slots
SELECT COUNT(*) FROM ad_spots
WHERE entity_type = 'judge' AND position = 3 AND status = 'available';
-- Should match total judge count
```

### 2. Environment Variables (Already Configured)

Required Stripe environment variables (verify in Netlify):
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
- `STRIPE_PRICE_MONTHLY` - Universal $500/month price ID
- `STRIPE_PRICE_YEARLY` - Universal $5,000/year price ID

---

## Code Readiness Assessment

### ✅ Checkout Flow Code (READY)

**File:** `/Users/tanner-osterkamp/JudgeFinderPlatform/app/api/checkout/adspace/route.ts`

**Position 3 Support:**
- Line 26: `ad_position?: 1 | 2 | 3` - Type definition accepts position 3
- Lines 148-155: Validates `ad_position` must be 1, 2, or 3
- Line 227: Saves `ad_position` to `pending_checkouts` table
- Line 302: Passes `ad_position` to Stripe metadata
- Line 63: Frontend sends `ad_position: parseInt(position)` from query params

**Test Coverage:**
```typescript
// Valid positions accepted
if (ad_position && (ad_position < 1 || ad_position > 3)) {
  return NextResponse.json(
    { error: 'ad_position must be 1, 2, or 3' },
    { status: 400 }
  )
}
```

### ✅ Judge Product Management (READY)

**File:** `/Users/tanner-osterkamp/JudgeFinderPlatform/lib/stripe/judge-products.ts`

**Position 3 Support:**
- Line 19: `position: 1 | 2 | 3` - Type definition supports position 3
- Line 58: Database query filters by `position` (1, 2, or 3)
- Line 79: Stripe product metadata includes position 1-3
- Line 97: Dynamic price selection works for any position

**Pricing (Universal):**
- Federal judges: $500/month, $5,000/year (Line 32-35)
- State judges: $500/month, $5,000/year (Line 36-39)

**Product Naming:**
```typescript
name: `Ad Spot for Judge ${params.judgeName}`
description: `Premium advertising placement on Judge ${params.judgeName}'s profile at ${params.courtName} (Rotation Slot ${params.position})`
```

### ✅ Checkout Page Frontend (READY)

**File:** `/Users/tanner-osterkamp/JudgeFinderPlatform/app/ads/checkout/judge/page.tsx`

**Position 3 Support:**
- Line 18: Reads `position` from URL query params
- Line 64: Sends `ad_position: parseInt(position)` to API
- Line 153: Displays "Rotation Slot #{position}" in UI
- Line 247: Shows position in order summary

**Universal Pricing Display:**
- Line 25-29: All judges show $500/month, $5,000/year
- No special handling needed for position 3

### ✅ Webhook Handler (READY)

**File:** `/Users/tanner-osterkamp/JudgeFinderPlatform/app/api/webhooks/stripe/ad-subscriptions/route.ts`

**Position 3 Support:**
- Line 122: Extracts `ad_position` from subscription metadata
- Line 168: Parses position with fallback to '1': `parseInt(ad_position || '1')`
- Lines 114-193: Creates `ad_spot_bookings` record with position field
- All webhook events (created, updated, deleted, payment success/failed) handle position 3 identically to positions 1 and 2

**Type Safety:**
```typescript
position: parseInt(ad_position || '1'),  // Accepts 1, 2, or 3
```

### ✅ Type Definitions (READY)

**Files Checked:**
- `/Users/tanner-osterkamp/JudgeFinderPlatform/lib/stripe/judge-products.ts` - `position: 1 | 2 | 3`
- `/Users/tanner-osterkamp/JudgeFinderPlatform/app/api/checkout/adspace/route.ts` - `ad_position?: 1 | 2 | 3`
- TypeScript enforces position must be 1, 2, or 3 throughout codebase

---

## Test Scenarios

### Scenario 1: Manual Position 3 Booking (Stripe Test Mode)

**Prerequisites:**
- Database migration applied
- Stripe test mode enabled
- Test judge profile exists
- User authenticated via Clerk

**Steps:**
1. Navigate to any judge profile page
2. Click "Book Ad Spot" for position 3
3. Verify checkout page URL includes `?position=3`
4. Select monthly billing ($500/month)
5. Click "Continue to Secure Checkout"
6. Complete Stripe test checkout with card `4242 4242 4242 4242`

**Expected Behavior:**
- `POST /api/checkout/adspace` succeeds (status 200)
- `pending_checkouts` record created with `ad_position = 3`
- Stripe Checkout session created successfully
- Session metadata includes `ad_position: "3"`
- Redirect to Stripe Checkout page
- After payment, webhook processes position 3 booking
- `ad_spot_bookings` record created with `position = 3`
- `judge_ad_products` record created with `position = 3`

**What Could Go Wrong:**
- ❌ Database constraint violation (if migration not applied)
- ❌ Frontend validation rejects position 3 (NOT EXPECTED - code is ready)
- ❌ Webhook fails to parse position 3 (NOT EXPECTED - code is ready)

### Scenario 2: Position 3 Stripe Product Creation

**Purpose:** Verify Stripe products are created correctly for position 3

**Steps:**
1. Trigger position 3 checkout (as in Scenario 1)
2. Check Stripe Dashboard > Products
3. Verify new product created with:
   - Name: "Ad Spot for Judge [Name]"
   - Description: "...Rotation Slot 3"
   - Metadata: `position: "3"`
   - Monthly price: $50,000 cents ($500.00)
   - Annual price: $500,000 cents ($5,000.00)

**Verification Queries:**
```sql
-- Check judge_ad_products cache
SELECT judge_id, position, stripe_product_id, court_level
FROM judge_ad_products
WHERE position = 3;

-- Check ad_spot_bookings
SELECT judge_id, position, status, monthly_price
FROM ad_spot_bookings
WHERE position = 3;
```

**Expected:**
- Product cached in `judge_ad_products` table with `position = 3`
- Product re-used for subsequent bookings of same judge + position

### Scenario 3: Webhook Processing for Position 3

**Purpose:** Verify all webhook events handle position 3 correctly

**Webhook Events to Test:**

1. **checkout.session.completed**
   - Metadata includes `ad_position: "3"`
   - Stored in `checkout_sessions` table

2. **customer.subscription.created**
   - Booking created with `position = 3`
   - Links to correct judge and advertiser
   - Status = subscription status

3. **invoice.payment_succeeded**
   - Booking status updated to 'active'
   - Position 3 ad goes live on judge profile

4. **customer.subscription.deleted**
   - Booking status updated to 'canceled'
   - Position 3 slot freed for new advertiser

**Test Method:**
- Use Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe/ad-subscriptions`
- Complete test checkout
- Monitor webhook logs in console

**Expected Logs:**
```
[Webhook] Processing webhook event: customer.subscription.created
[Webhook] Ad spot booking created { subscriptionId: "sub_xxx", judgeId: "...", position: "3", price: 500 }
```

### Scenario 4: Multiple Position 3 Bookings (Conflict Handling)

**Purpose:** Verify database enforces one booking per judge + position

**Steps:**
1. Complete position 3 booking for Judge A (status = active)
2. Attempt second position 3 booking for same Judge A
3. Verify database constraint or application logic prevents conflict

**Expected Behavior:**
- First booking succeeds
- Second booking either:
  - Shows "Position 3 sold out" in UI (recommended)
  - Or allows booking with status = 'pending' until first cancels

**Database Check:**
```sql
-- Verify uniqueness constraint
SELECT judge_id, position, COUNT(*) as booking_count
FROM ad_spot_bookings
WHERE status = 'active' AND position = 3
GROUP BY judge_id, position
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### Scenario 5: Annual Billing for Position 3

**Purpose:** Verify annual pricing works for position 3

**Steps:**
1. Navigate to position 3 checkout
2. Select "Annual" billing ($5,000/year)
3. Complete checkout
4. Verify Stripe subscription uses annual price

**Expected:**
- Annual price ID selected: `productInfo.annualPriceId`
- Subscription created with `recurring.interval = 'year'`
- 2 months free discount reflected ($5,000 vs $6,000)

---

## Stripe Products Created During Testing

### Test Mode Products

Each unique judge + position combination creates ONE Stripe product with TWO prices:

**Example: Judge Jane Doe, Position 3, State Court**

**Product:**
- ID: `prod_xxxxxxxxxxxxx` (auto-generated)
- Name: "Ad Spot for Judge Jane Doe"
- Description: "Premium advertising placement on Judge Jane Doe's profile at Los Angeles Superior Court (Rotation Slot 3)"
- Metadata:
  - `judge_id`: "[UUID]"
  - `judge_name`: "Jane Doe"
  - `court_name`: "Los Angeles Superior Court"
  - `court_level`: "state"
  - `position`: "3"
  - `product_type`: "judge_ad_spot"

**Monthly Price:**
- ID: `price_xxxxxxxxxxxxx` (auto-generated)
- Amount: $500.00 ($50,000 cents)
- Currency: USD
- Recurring: Every 1 month
- Metadata: `billing_interval: "monthly"`, `court_level: "state"`, `judge_id: "[UUID]"`

**Annual Price:**
- ID: `price_xxxxxxxxxxxxx` (auto-generated)
- Amount: $5,000.00 ($500,000 cents)
- Currency: USD
- Recurring: Every 1 year
- Metadata: `billing_interval: "annual"`, `court_level: "state"`, `judge_id: "[UUID]"`

**Caching:**
Product and price IDs stored in `judge_ad_products` table to avoid recreating on subsequent bookings.

---

## Expected Behavior at Each Step

### Step 1: User Clicks "Book Position 3"
- **Action:** Link to `/ads/checkout/judge?id=[UUID]&name=[Name]&court=[Court]&level=[federal|state]&position=3`
- **Expected:** Checkout page loads with position 3 selected
- **UI Display:** "Rotation Slot #3" shown in order summary

### Step 2: User Submits Checkout Form
- **Action:** `POST /api/checkout/adspace`
- **Expected:**
  - Validation passes for `ad_position = 3`
  - Record created in `pending_checkouts` with `ad_position = 3`
  - Stripe product/prices fetched or created via `getOrCreateJudgeAdProduct()`
  - Checkout session created with correct price ID
  - Response: `{ session_url: "https://checkout.stripe.com/...", session_id: "cs_..." }`

### Step 3: User Completes Stripe Checkout
- **Action:** Payment on Stripe Checkout page
- **Expected:**
  - Stripe fires `checkout.session.completed` webhook
  - Webhook handler stores session info in `checkout_sessions` table
  - Metadata preserved: `ad_position: "3"`

### Step 4: Stripe Creates Subscription
- **Action:** Stripe fires `customer.subscription.created` webhook
- **Expected:**
  - Handler extracts `ad_position` from metadata
  - Record created in `ad_spot_bookings`:
    - `judge_id`: Judge UUID
    - `position`: 3
    - `monthly_price`: 500
    - `status`: "active"
    - `stripe_subscription_id`: Subscription ID

### Step 5: First Invoice Payment
- **Action:** Stripe fires `invoice.payment_succeeded` webhook
- **Expected:**
  - Booking status confirmed as 'active'
  - Ad spot goes live on judge profile
  - Position 3 marked as occupied in `ad_spots` table

### Step 6: Subscription Lifecycle
- **Renewals:** `invoice.payment_succeeded` webhook keeps booking active
- **Failed Payments:** `invoice.payment_failed` webhook sets booking to 'past_due'
- **Cancellation:** `customer.subscription.deleted` webhook frees position 3 slot

---

## Potential Issues to Watch For

### Issue 1: Database Constraint Violation (HIGH PRIORITY)

**Symptom:**
```
ERROR: new row for relation "ad_spot_bookings" violates check constraint "ad_spot_bookings_position_check"
DETAIL: Failing row contains (position = 3)
```

**Cause:** Migration `20251022_001` not applied

**Fix:** Run migration immediately

**Verification:**
```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'ad_spot_bookings_position_check';
-- Should show: CHECK (position IN (1, 2, 3))
```

### Issue 2: Missing Position 3 Ad Spots (MEDIUM PRIORITY)

**Symptom:** Position 3 not available for booking even after migration

**Cause:** `ad_spots` table missing position 3 rows for some judges

**Fix:** Migration Step 6 creates them, but verify:
```sql
SELECT COUNT(*) FROM ad_spots
WHERE entity_type = 'judge' AND position = 3;
-- Should match judge count
```

### Issue 3: Stripe Product Metadata Missing Position (LOW PRIORITY)

**Symptom:** Webhook can't determine position from subscription metadata

**Cause:** Metadata not passed correctly during checkout

**Debug:**
- Check Stripe Dashboard > Subscription > Metadata
- Should include `ad_position: "3"`

**Fallback Behavior:**
- Code defaults to position 1 if missing: `parseInt(ad_position || '1')`
- Not ideal but prevents failure

### Issue 4: Frontend Validation Blocking Position 3 (UNLIKELY)

**Symptom:** Checkout page rejects position 3

**Cause:** Client-side validation restricting to positions 1-2

**Debug:** Check browser console for validation errors

**Investigation:** Review `/Users/tanner-osterkamp/JudgeFinderPlatform/app/ads/checkout/judge/page.tsx` lines 35-39 (initial validation)

**Status:** NOT EXPECTED - Code review shows no restrictions

### Issue 5: Webhook Processing Race Condition (LOW PRIORITY)

**Symptom:** Webhook processed before `judge_ad_products` cache populated

**Cause:** Asynchronous product creation vs webhook arrival

**Mitigation:** Webhook calls `getOrCreateJudgeAdProduct()` which handles cache miss gracefully

---

## Success Criteria

Position 3 integration is considered **ready for production** when:

- [ ] Database migration applied successfully (all constraints updated)
- [ ] All judges have 3 ad_spots records (positions 1, 2, 3)
- [ ] Position 3 checkout completes without errors
- [ ] Stripe product created with correct metadata (position = 3)
- [ ] Webhook creates `ad_spot_bookings` record with position = 3
- [ ] Position 3 ad displays on judge profile after payment
- [ ] Subsequent bookings reuse cached Stripe product
- [ ] Cancellation frees position 3 slot for new advertiser
- [ ] Both monthly and annual billing work for position 3
- [ ] Test mode checkout succeeds for 3 different judges

---

## Testing Checklist

### Pre-Test Setup
- [ ] Apply migration `20251022_001_support_three_ad_positions.sql`
- [ ] Verify database constraints updated (see verification queries above)
- [ ] Confirm all judges have 3 ad_spot records
- [ ] Set Stripe to test mode
- [ ] Configure webhook forwarding: `stripe listen --forward-to localhost:3000/api/webhooks/stripe/ad-subscriptions`

### Position 3 Checkout Flow
- [ ] Navigate to judge profile
- [ ] Click "Book Ad Spot - Position 3"
- [ ] Verify checkout page displays position 3 correctly
- [ ] Select monthly billing ($500/month)
- [ ] Submit checkout form
- [ ] Verify API returns session URL (no 400/500 errors)
- [ ] Complete Stripe Checkout with test card
- [ ] Confirm redirect to success page

### Database Verification
- [ ] `pending_checkouts` record exists with `ad_position = 3`
- [ ] Stripe Checkout session ID stored correctly
- [ ] Webhook creates `ad_spot_bookings` record with `position = 3`
- [ ] `judge_ad_products` record created with `position = 3`
- [ ] Booking status = 'active' after payment

### Stripe Dashboard Verification
- [ ] Product created with name "Ad Spot for Judge [Name]"
- [ ] Product description mentions "Rotation Slot 3"
- [ ] Product metadata includes `position: "3"`
- [ ] Monthly price = $500.00
- [ ] Annual price = $5,000.00
- [ ] Subscription created and active

### Webhook Event Testing
- [ ] `checkout.session.completed` - Metadata preserved
- [ ] `customer.subscription.created` - Booking created
- [ ] `invoice.payment_succeeded` - Booking activated
- [ ] `customer.subscription.updated` - Status synced
- [ ] `customer.subscription.deleted` - Slot freed

### Annual Billing Test
- [ ] Select annual billing ($5,000/year)
- [ ] Complete checkout
- [ ] Verify annual price ID used in subscription
- [ ] Confirm 2-month discount reflected

### Edge Cases
- [ ] Attempt booking same judge position 3 twice (conflict handling)
- [ ] Cancel position 3 subscription (slot becomes available again)
- [ ] Test with both federal and state judges
- [ ] Verify payment failure webhook handling (test card `4000 0000 0000 0341`)

---

## Rollback Plan

If position 3 causes issues in production:

### Option 1: Quick Disable (No Data Loss)
```sql
-- Mark all position 3 slots as maintenance
UPDATE ad_spots
SET status = 'maintenance'
WHERE entity_type = 'judge' AND position = 3;
```

This hides position 3 from UI without deleting data.

### Option 2: Full Rollback (Restore to 2 Positions)

**WARNING:** This cancels active position 3 subscriptions in Stripe.

```sql
BEGIN;

-- Revert constraints
ALTER TABLE ad_spot_bookings DROP CONSTRAINT IF EXISTS ad_spot_bookings_position_check;
ALTER TABLE ad_spot_bookings ADD CONSTRAINT ad_spot_bookings_position_check CHECK (position IN (1, 2));

ALTER TABLE judge_ad_products DROP CONSTRAINT IF EXISTS judge_ad_products_position_check;
ALTER TABLE judge_ad_products ADD CONSTRAINT judge_ad_products_position_check CHECK (position IN (1, 2));

-- Archive position 3 products
UPDATE judge_ad_products SET archived_at = NOW() WHERE position = 3;

-- Cancel active position 3 bookings (requires Stripe API calls)
UPDATE ad_spot_bookings
SET status = 'canceled', end_date = NOW(), canceled_at = NOW()
WHERE position = 3 AND status = 'active';

COMMIT;
```

---

## Post-Deployment Monitoring

After position 3 goes live in production:

### Key Metrics to Track
- Position 3 bookings per week
- Revenue from position 3 ($500 per booking)
- Webhook success rate for position 3 events
- Database query performance (with 50% more ad_spot records)

### Monitoring Queries
```sql
-- Position 3 adoption rate
SELECT
  COUNT(*) FILTER (WHERE position = 3 AND status = 'active') as position_3_active,
  COUNT(*) FILTER (WHERE position IN (1,2) AND status = 'active') as position_1_2_active,
  COUNT(*) as total_active_bookings
FROM ad_spot_bookings
WHERE status = 'active';

-- Revenue impact
SELECT
  position,
  COUNT(*) as booking_count,
  SUM(monthly_price) as total_monthly_revenue
FROM ad_spot_bookings
WHERE status = 'active'
GROUP BY position
ORDER BY position;
```

### Error Monitoring (Sentry)
- Search for errors containing "position 3" or "ad_position"
- Monitor webhook processing failures
- Track Stripe API errors during product creation

---

## Technical Reference

### Key Files
- **Checkout API:** `/Users/tanner-osterkamp/JudgeFinderPlatform/app/api/checkout/adspace/route.ts`
- **Checkout Page:** `/Users/tanner-osterkamp/JudgeFinderPlatform/app/ads/checkout/judge/page.tsx`
- **Product Manager:** `/Users/tanner-osterkamp/JudgeFinderPlatform/lib/stripe/judge-products.ts`
- **Webhook Handler:** `/Users/tanner-osterkamp/JudgeFinderPlatform/app/api/webhooks/stripe/ad-subscriptions/route.ts`
- **Stripe Client:** `/Users/tanner-osterkamp/JudgeFinderPlatform/lib/stripe/client.ts`
- **Migration:** `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20251022_001_support_three_ad_positions.sql`

### Database Tables
- `ad_spots` - Inventory of available ad slots (3 per judge)
- `ad_spot_bookings` - Active/historical bookings with position field
- `judge_ad_products` - Stripe product/price cache by judge + position
- `pending_checkouts` - Pre-checkout form submissions

### Stripe API Endpoints Used
- `stripe.products.create()` - Create judge ad product
- `stripe.prices.create()` - Create monthly/annual prices
- `stripe.checkout.sessions.create()` - Create checkout session
- `stripe.webhooks.constructEvent()` - Verify webhook signatures
- `stripe.subscriptions.retrieve()` - Get subscription details in webhooks

---

## Contact & Support

**Questions about this test plan?**
- Review migration analysis: `/Users/tanner-osterkamp/JudgeFinderPlatform/docs/AD_SLOT_SCHEMA_ANALYSIS.md`
- Review quick guide: `/Users/tanner-osterkamp/JudgeFinderPlatform/docs/ENABLE_POSITION_3_QUICK_GUIDE.md`
- Check Stripe integration docs: `/Users/tanner-osterkamp/JudgeFinderPlatform/docs/STRIPE_INTEGRATION.md`

**Stripe Dashboard:**
- Test mode: https://dashboard.stripe.com/test/
- Webhook logs: https://dashboard.stripe.com/test/webhooks
- Products: https://dashboard.stripe.com/test/products

**Supabase Dashboard:**
- Database: https://app.supabase.com/project/[project-id]/editor
- SQL Editor: https://app.supabase.com/project/[project-id]/sql

---

**Last Updated:** 2025-10-22
**Version:** 1.0
**Author:** JudgeFinder Platform Team
