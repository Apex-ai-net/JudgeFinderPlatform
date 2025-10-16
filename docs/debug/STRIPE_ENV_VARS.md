# Stripe Environment Variables - Production Configuration

**Last Updated**: 2025-01-16
**Target**: Netlify Production Environment
**Status**: ⚠️ **ACTION REQUIRED**

---

## Critical Missing Variables

These environment variables **MUST** be set in Netlify for the ad purchase flow to work:

### 1. Monthly Subscription Price ID

```bash
STRIPE_PRICE_MONTHLY=price_1SHzV3B1lwwjVYGvds7yjy18
```

- **Product**: JudgeFinder Universal Access
- **Amount**: $500.00/month ($50,000 cents)
- **Type**: Recurring subscription
- **Mode**: Test

### 2. Annual Subscription Price ID

```bash
STRIPE_PRICE_YEARLY=price_1SHzV3B1lwwjVYGv1CPvzsC0
```

- **Product**: JudgeFinder Universal Access
- **Amount**: $5,000.00/year ($500,000 cents)
- **Savings**: $1,000 vs monthly
- **Type**: Recurring subscription
- **Mode**: Test

---

## How to Set in Netlify

### Option 1: Netlify Dashboard (Recommended)

1. Go to https://app.netlify.com
2. Select your site (JudgeFinder)
3. Navigate to: **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Enter:
   - **Key**: `STRIPE_PRICE_MONTHLY`
   - **Value**: `price_1SHzV3B1lwwjVYGvds7yjy18`
   - **Scopes**: All (Production, Deploy Previews, Branch Deploys)
6. Repeat for `STRIPE_PRICE_YEARLY`
7. Click **Save**
8. **Trigger a new deploy** for changes to take effect

### Option 2: Netlify CLI

```bash
# Set monthly price
netlify env:set STRIPE_PRICE_MONTHLY "price_1SHzV3B1lwwjVYGvds7yjy18"

# Set annual price
netlify env:set STRIPE_PRICE_YEARLY "price_1SHzV3B1lwwjVYGv1CPvzsC0"

# Trigger redeploy
netlify deploy --prod
```

---

## Existing Variables (Verify These)

### 1. Stripe Secret Key

```bash
STRIPE_SECRET_KEY=sk_test_... (or sk_live_... for production)
```

- **Status**: ✅ **SHOULD BE SET** (Stripe MCP works)
- **Location**: Netlify → Environment Variables
- **Security**: ⚠️ Server-side only, never expose to client

### 2. Stripe Webhook Secret

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

- **Status**: ❓ **VERIFY IN NETLIFY**
- **Get From**: Stripe Dashboard → Developers → Webhooks → Signing secret
- **Purpose**: Verifies webhook signatures

### 3. Stripe Publishable Key (Client-side)

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
```

- **Status**: ❓ **VERIFY IN NETLIFY**
- **Security**: ✅ Safe for client-side use
- **Purpose**: Stripe.js initialization (future use)

---

## Verification Steps

### 1. Check Variables Are Set

```bash
# Via Netlify CLI
netlify env:list

# Expected output should include:
# STRIPE_PRICE_MONTHLY
# STRIPE_PRICE_YEARLY
# STRIPE_SECRET_KEY
# STRIPE_WEBHOOK_SECRET
```

### 2. Test Configuration Endpoint

After deploying fixes, visit:

```
https://judgefinder.io/api/admin/stripe-status
```

**Expected Response** (when working):

```json
{
  "stripe_configured": true,
  "has_secret_key": true,
  "has_webhook_secret": true,
  "has_price_monthly": true,
  "has_price_yearly": true,
  "price_monthly_id": "price_1SH...",
  "price_yearly_id": "price_1SH...",
  "mode": "test"
}
```

### 3. Test Checkout Flow

1. Sign in to https://judgefinder.io
2. Click "Buy Ad Space"
3. Select a plan
4. Click "Proceed to Checkout"
5. **Expected**: Redirect to Stripe Checkout
6. **If fails**: Check browser console for errors

---

## Production vs Test Mode

### Current Status: TEST MODE

All price IDs above are for **Stripe Test Mode**. This means:

- ✅ No real payments processed
- ✅ Can use test cards (4242 4242 4242 4242)
- ✅ Webhook events are test events
- ⚠️ **Subscriptions are not real**

### For Production (Live Mode)

**DO NOT** use these price IDs. Instead:

1. Go to Stripe Dashboard → **Live mode** (toggle top-right)
2. Create new product: "JudgeFinder Universal Access"
3. Create two prices:
   - Monthly: $500/month
   - Annual: $5,000/year
4. Get the **live mode** price IDs (start with `price_1...`)
5. Update environment variables in Netlify:
   ```bash
   STRIPE_PRICE_MONTHLY=price_1ABC... (live mode)
   STRIPE_PRICE_YEARLY=price_1XYZ... (live mode)
   STRIPE_SECRET_KEY=sk_live_... (live mode)
   ```

---

## Common Issues

### Issue: API Returns 503 "Pricing configuration error"

**Cause**: `STRIPE_PRICE_MONTHLY` or `STRIPE_PRICE_YEARLY` not set

**Solution**:

1. Set both environment variables in Netlify
2. Redeploy the site
3. Clear cache: `netlify cache:clear`

### Issue: Checkout Creates Session But Wrong Amount

**Cause**: Wrong price ID used

**Solution**:

1. Verify price IDs in Stripe Dashboard
2. Check amount matches (monthly=$500, annual=$5000)
3. Update env vars if wrong

### Issue: Webhook Fails with "Invalid Signature"

**Cause**: `STRIPE_WEBHOOK_SECRET` not set or incorrect

**Solution**:

1. Get signing secret from Stripe Dashboard
2. Set `STRIPE_WEBHOOK_SECRET` in Netlify
3. Redeploy

---

## Security Checklist

- [ ] `STRIPE_SECRET_KEY` is **NEVER** exposed to client code
- [ ] Webhook secret is stored securely in Netlify
- [ ] Price IDs are correct (test mode for staging, live mode for prod)
- [ ] Test mode keys are used for non-production environments
- [ ] Netlify environment variable scopes are set correctly
- [ ] Old/deprecated price IDs removed (e.g., `STRIPE_PRICE_ADSPACE`)

---

## Next Steps After Setting Variables

1. **Redeploy**: Trigger new Netlify deploy
2. **Test**: Follow verification steps above
3. **Monitor**: Check Stripe Dashboard → Events for webhook delivery
4. **Verify**: Confirm checkout session creation works
5. **Document**: Update this file with any changes

---

## Reference Links

- **Stripe Dashboard**: https://dashboard.stripe.com
- **Netlify Dashboard**: https://app.netlify.com
- **Price IDs Source**: Retrieved via Stripe MCP on 2025-01-16
- **Related Docs**: See `STRIPE_INTEGRATION.md` for full technical guide

---

**Questions?** Consult dev team or Stripe documentation.
