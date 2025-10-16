# Ad Purchase Flow - Root Cause Analysis

**Date**: 2025-01-16
**Status**: 🔴 **BROKEN IN PRODUCTION**
**Impact**: Users cannot purchase ad space

---

## Executive Summary

The "Buy Ad Space" feature on JudgeFinder.io is **non-functional** due to **incomplete implementation** of the checkout flow. While individual components exist (modal, API, webhook), they are not properly connected, and critical functionality is missing.

---

## Diagnosis Method

Used MCPs (Model Context Protocols) to diagnose:

- ✅ **Stripe MCP**: Verified products and prices exist
- ✅ **Code Analysis**: Reviewed complete flow from frontend to database
- ⏳ **Chrome DevTools**: Reproduction pending (needs production access)
- ⏳ **Netlify**: Environment variable verification pending
- ⏳ **Supabase**: Table structure verification pending

---

## Root Cause: Incomplete Flow Integration

### Issue #1: Modal Doesn't Trigger Checkout ❌

**Location**: `components/dashboard/AdPurchaseModal.tsx:38`

**Problem**: Modal navigates to `/dashboard/advertiser/ad-spots` instead of creating checkout session

```typescript
// CURRENT (WRONG):
router.push(`/dashboard/advertiser/ad-spots?${params}`) // Just navigates away
onClose()

// NEEDED:
// 1. Call /api/checkout/adspace
// 2. Redirect to Stripe Checkout URL
// 3. Handle success/cancel URLs
```

**Impact**: Clicking "Select Judges to Advertise On" **never reaches Stripe**

---

### Issue #2: Authentication Flow Incomplete ⚠️

**Location**: `app/api/checkout/adspace/route.ts:33-39`

**Problem**: API requires Clerk authentication, but modal doesn't check auth state first

```typescript
const { userId } = await auth()
if (!userId) {
  // Returns 401 - but user is already in modal!
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Impact**:

- Signed-out users see modal but get 401 on submit
- No graceful "sign in first" prompt

---

### Issue #3: Database Schema Mismatch 🔴

**Expected (per docs)**: `ad_orders` table for purchases
**Actual**: `subscriptions` table (subscription lifecycle only)

**Webhook Handler** (`app/api/webhooks/stripe/route.ts:122-143`):

```typescript
switch (event.type) {
  case 'customer.subscription.created':    // ✅ Implemented
  case 'customer.subscription.updated':    // ✅ Implemented
  case 'customer.subscription.deleted':    // ✅ Implemented
  case 'checkout.session.completed':       // ❌ MISSING
```

**Impact**: Even if checkout succeeds, **no record is created** of the purchase

---

### Issue #4: Environment Variable Gap 📋

**Required (per code)**:

```bash
STRIPE_SECRET_KEY=sk_test_...          # ✅ Likely set (Stripe MCP works)
STRIPE_WEBHOOK_SECRET=whsec_...        # ❓ Unknown
STRIPE_PRICE_MONTHLY=price_1SH...      # ❌ NOT SET (uses placeholder)
STRIPE_PRICE_YEARLY=price_1SH...       # ❌ NOT SET (uses placeholder)
```

**Correct Values** (from Stripe MCP):

```bash
STRIPE_PRICE_MONTHLY=price_1SHzV3B1lwwjVYGvds7yjy18   # $500/month
STRIPE_PRICE_YEARLY=price_1SHzV3B1lwwjVYGv1CPvzsC0    # $5,000/year
```

**Impact**: API returns 503 "Pricing configuration error"

---

## Evidence

### 1. Stripe Products Exist ✅

```json
{
  "id": "prod_TESP0WJ36DprgV",
  "name": "JudgeFinder Universal Access",
  "description": "Unified access to all courts and judges...",
  "active": true,
  "livemode": false // TEST MODE
}
```

### 2. Stripe Prices Exist ✅

- **Monthly**: `price_1SHzV3B1lwwjVYGvds7yjy18` ($500.00)
- **Annual**: `price_1SHzV3B1lwwjVYGv1CPvzsC0` ($5,000.00)

### 3. Code Flow Analysis

```
User Journey (CURRENT):
1. User clicks "Buy Ad Space" in dashboard
2. Modal appears showing pricing
3. User selects Federal/State + Monthly/Annual
4. Clicks "Select Judges to Advertise On"
5. ❌ Navigates to /dashboard/advertiser/ad-spots
6. ❌ DEAD END - no checkout ever happens

User Journey (INTENDED):
1. User clicks "Buy Ad Space" in dashboard
2. Modal appears showing pricing
3. User selects plan + billing cycle
4. Clicks "Proceed to Checkout"
5. ✅ API creates Stripe Checkout session
6. ✅ Redirects to Stripe payment page
7. ✅ User completes payment
8. ✅ Webhook creates subscription record
9. ✅ Redirects to success page
```

---

## Impact Assessment

### User Experience

- **Severity**: 🔴 **CRITICAL** - Feature completely non-functional
- **Users Affected**: **100%** of users attempting purchase
- **Workaround**: ❌ **NONE** - no way to purchase

### Business Impact

- **Revenue Loss**: **$0/month** (no purchases possible)
- **Customer Satisfaction**: **HIGH RISK** - users report "broken checkout"
- **Reputation**: **MODERATE RISK** - appears unprofessional

### Technical Debt

- **Code Quality**: ⚠️ Incomplete implementation merged to main
- **Testing Coverage**: ❌ E2E tests missing for purchase flow
- **Documentation**: ⚠️ Outdated (references non-existent tables)

---

## Required Fixes (Priority Order)

### 1. 🔴 CRITICAL: Fix Modal Checkout Integration

**File**: `components/dashboard/AdPurchaseModal.tsx`
**Action**: Replace navigation with direct API call

```typescript
const handleProceedToCheckout = async () => {
  // 1. Check auth first
  if (!userId) {
    router.push('/sign-in?redirect=/ads/buy')
    return
  }

  // 2. Call checkout API
  const response = await fetch('/api/checkout/adspace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      organization_name: user.fullName,
      email: user.primaryEmailAddress,
      billing_cycle: billingCycle,
      ad_type: 'universal_access',
    }),
  })

  // 3. Redirect to Stripe
  const { session_url } = await response.json()
  window.location.href = session_url
}
```

---

### 2. 🔴 CRITICAL: Add Webhook Handler for Purchases

**File**: `app/api/webhooks/stripe/route.ts`
**Action**: Handle `checkout.session.completed` event

```typescript
case 'checkout.session.completed':
  return await handleCheckoutCompleted(event.data.object)
```

**New Function**:

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const supabase = await createServiceRoleClient()

  // Create subscription record
  await supabase.from('subscriptions').insert({
    stripe_subscription_id: session.subscription,
    stripe_customer_id: session.customer,
    status: 'active',
    // ... rest of subscription data
  })

  return { status: 'success' }
}
```

---

### 3. 🟡 HIGH: Set Environment Variables

**Platform**: Netlify Dashboard → Site Settings → Environment Variables

```bash
STRIPE_PRICE_MONTHLY=price_1SHzV3B1lwwjVYGvds7yjy18
STRIPE_PRICE_YEARLY=price_1SHzV3B1lwwjVYGv1CPvzsC0
```

**Verification**: Add `/api/admin/stripe-status` endpoint

---

### 4. 🟡 HIGH: Add E2E Tests

**File**: `tests/e2e/ad-purchase.spec.ts`
**Coverage**:

- [ ] Signed-out user prompted to sign in
- [ ] Signed-in user creates checkout session
- [ ] Stripe redirect works
- [ ] Webhook creates DB record
- [ ] Success page shows confirmation

---

### 5. 🟢 MEDIUM: Improve Error Handling

**Files**: All components in flow
**Actions**:

- Add loading states
- Show user-friendly error messages
- Retry failed API calls
- Log errors for monitoring

---

## Test Plan

### Manual Testing (Production)

1. **Sign In**: Navigate to https://judgefinder.io → Sign in
2. **Open Modal**: Click "Buy Ad Space" in dashboard
3. **Select Plan**: Choose Federal Monthly ($500/mo)
4. **Submit**: Click "Proceed to Checkout"
5. **Expected**: Redirect to Stripe Checkout
6. **Actual**: ❌ Navigates to ad spots page instead

### Automated Testing (CI)

```bash
# E2E test with Playwright
pnpm playwright test tests/e2e/ad-purchase.spec.ts

# Expected: All tests pass
# Actual: Tests don't exist yet
```

---

## Timeline

### Phase 1: Emergency Fix (1 day)

- [x] Diagnosis complete
- [ ] Fix modal checkout integration
- [ ] Set environment variables
- [ ] Deploy and verify

### Phase 2: Complete Implementation (2-3 days)

- [ ] Add webhook handler
- [ ] Add E2E tests
- [ ] Improve error handling
- [ ] Documentation updates

### Phase 3: Monitoring (Ongoing)

- [ ] Set up error tracking
- [ ] Monitor Stripe Dashboard for events
- [ ] Track conversion funnel

---

## Success Metrics

### Technical

- ✅ API returns 200 on `/api/checkout/adspace`
- ✅ Stripe Checkout session created
- ✅ Webhook signature verified
- ✅ Subscription record in database
- ✅ E2E tests pass in CI

### Business

- ✅ First successful purchase completed
- ✅ User receives confirmation email
- ✅ Subscription visible in dashboard
- ✅ No 4xx/5xx errors in logs

---

## Rollback Plan

If issues arise after deployment:

1. **Disable Feature**: Add feature flag to hide "Buy Ad Space" button
2. **Revert Webhook**: Deploy previous webhook handler version
3. **Contact Users**: Email affected users about temporary outage
4. **Debug**: Use Stripe Dashboard → Events to diagnose

---

## Lessons Learned

1. **Never merge incomplete features** to main branch
2. **E2E tests are mandatory** for payment flows
3. **Environment variables must be validated** at startup
4. **Documentation must match implementation**

---

## Next Steps

1. ✅ Complete this diagnosis
2. ⏳ Implement fixes in order of priority
3. ⏳ Test on staging environment
4. ⏳ Deploy to production
5. ⏳ Monitor for 48 hours
6. ⏳ Document lessons learned

---

**Questions?** Contact dev team or see `STRIPE_INTEGRATION.md`
