# Webhook Setup Guide - Stripe Integration

**Last Updated:** October 13, 2025
**Target Audience:** System Administrators
**Version:** 1.0.0

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Testing Webhooks](#testing-webhooks)
4. [Monitoring Webhooks](#monitoring-webhooks)
5. [Security Best Practices](#security-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up webhooks, ensure you have:

### Required Access

- [ ] Access to Stripe Dashboard (Account Owner or Developer role)
- [ ] Access to Netlify Dashboard (Admin or Owner role)
- [ ] Production domain configured (`judgefinder.io`)
- [ ] SSL certificate active (HTTPS required)

### Required Information

- **Production Endpoint URL**: `https://judgefinder.io/api/stripe/webhook`
- **Staging Endpoint URL** (optional): `https://staging.judgefinder.io/api/stripe/webhook`
- **Local Development URL** (for testing): Use Stripe CLI (covered in Testing section)

### Accounts Setup

1. **Stripe Account**
   - Active Stripe account with API access
   - Test mode enabled for initial setup
   - Live mode credentials ready for production

2. **Netlify Account**
   - JudgeFinder project deployed
   - Environment variables access
   - Build & deploy permissions

3. **Supabase Database**
   - Migration applied: `20251013_001_ad_orders_table.sql`
   - Service role key available
   - Database accessible from production environment

---

## Step-by-Step Setup

### Step 1: Create Webhook Endpoint in Stripe Dashboard

#### 1.1 Navigate to Webhooks Section

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to **Test mode** (toggle in top right)
3. Click **Developers** in the left sidebar
4. Click **Webhooks**

![Stripe Dashboard Navigation]
Navigate to: Dashboard → Developers → Webhooks

#### 1.2 Add Endpoint

1. Click **+ Add endpoint** button
2. Enter the endpoint URL:
   - **Test Mode**: `https://staging.judgefinder.io/api/stripe/webhook`
   - **Live Mode**: `https://judgefinder.io/api/stripe/webhook`

![Add Endpoint Form]
URL field: Enter your webhook endpoint URL

#### 1.3 Configure Endpoint Description

1. **Description** (optional but recommended): `JudgeFinder Ad Purchase Webhooks`
2. **API version**: Select latest version (should auto-select current version)

#### 1.4 Select Events to Listen To

**Required Events** (select both):

- [x] `checkout.session.completed`
- [x] `checkout.session.expired`

**How to select events:**

1. Click **Select events** button
2. Search for "checkout" in the filter box
3. Under "Checkout" section, check:
   - `checkout.session.completed`
   - `checkout.session.expired`
4. Click **Add events** button

![Event Selection]
Filter by "checkout" and select the two required events

#### 1.5 Save Endpoint

1. Click **Add endpoint** button at the bottom
2. Webhook endpoint is now created

---

### Step 2: Copy Webhook Signing Secret

#### 2.1 Locate Signing Secret

After creating the endpoint, you'll see the endpoint details page:

1. Find the **Signing secret** section
2. Click **Reveal** to show the secret
3. The secret starts with `whsec_`

![Webhook Signing Secret]
Look for: "Signing secret" section with "Reveal" button

#### 2.2 Copy the Secret

1. Click the **Copy** icon next to the signing secret
2. Save it temporarily in a secure location (you'll need it in the next step)

**Example format:**

```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

**Security Note:** Never commit this secret to version control or share it publicly.

---

### Step 3: Add to Netlify Environment Variables

#### 3.1 Navigate to Netlify Environment Variables

1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Select the **JudgeFinder** site
3. Click **Site settings**
4. Click **Environment variables** in the left sidebar

![Netlify Environment Variables]
Navigate to: Site settings → Build & deploy → Environment variables

#### 3.2 Add STRIPE_WEBHOOK_SECRET

1. Click **Add a variable** or **Edit variables**
2. Click **Add a single variable**
3. Fill in the details:
   - **Key**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: Paste the webhook signing secret from Step 2.2
   - **Scopes**: Select all environments (Production, Deploy Previews, Branch deploys)

![Add Environment Variable Form]
Key: STRIPE*WEBHOOK_SECRET
Value: whsec*...
Scopes: All scopes selected

4. Click **Save** or **Create variable**

#### 3.3 Verify Other Required Environment Variables

Ensure these variables are also set:

| Variable                    | Description              | Example Value                  |
| --------------------------- | ------------------------ | ------------------------------ |
| `STRIPE_SECRET_KEY`         | Stripe API secret key    | `sk_live_...` (for production) |
| `STRIPE_PRICE_ADSPACE`      | Price ID for ad products | `price_1ABCdefGHI...`          |
| `NEXT_PUBLIC_APP_URL`       | Application base URL     | `https://judgefinder.io`       |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service key     | `eyJhbG...`                    |

**How to verify:**

1. In Netlify environment variables page
2. Check that all variables are present
3. Verify production values are correct (not test keys)

#### 3.4 Trigger Redeploy

After adding/updating environment variables:

1. Go to **Deploys** tab
2. Click **Trigger deploy** dropdown
3. Select **Deploy site**
4. Wait for deployment to complete (usually 2-5 minutes)

![Trigger Deploy]
Deploys tab → Trigger deploy → Deploy site

**Why redeploy?**
Environment variables are only loaded at build time. A redeploy ensures the new webhook secret is available to the application.

---

### Step 4: Test Webhook Configuration

#### 4.1 Send Test Webhook from Stripe

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **Send test webhook** button
4. Select event: `checkout.session.completed`
5. Click **Send test webhook**

![Send Test Webhook]
Click "Send test webhook" → Select "checkout.session.completed"

#### 4.2 Verify Successful Delivery

After sending the test webhook:

1. Check the **Response** section shows:
   - Status: `200`
   - Body: `{"received":true}`
2. Check the **Request** section shows the payload sent
3. If status is not 200, see [Troubleshooting](#troubleshooting) section

![Webhook Response]
Response status: 200
Response body: {"received":true}

#### 4.3 Verify Application Logs

Check Netlify function logs:

1. In Netlify Dashboard, go to **Functions** tab
2. Click on `api/stripe/webhook` function
3. Click **Function log**
4. Look for recent webhook event logs

Expected log entries:

```
INFO: Webhook received { event_type: 'checkout.session.completed', event_id: 'evt_...' }
```

---

### Step 5: Repeat for Production (Live Mode)

Once test mode is working correctly:

#### 5.1 Switch to Live Mode

1. In Stripe Dashboard, toggle to **Live mode** (top right)
2. Repeat Steps 1-4 with production settings:
   - **Endpoint URL**: `https://judgefinder.io/api/stripe/webhook`
   - **Events**: Same events (checkout.session.completed, checkout.session.expired)
   - **Signing Secret**: Copy the **live mode** signing secret

#### 5.2 Update Production Environment Variables

In Netlify:

1. Navigate to **Environment variables**
2. Edit `STRIPE_WEBHOOK_SECRET`
3. Update the value with the **live mode** webhook secret
4. **Important**: Make sure to update the production scope specifically
5. Trigger a production deploy

#### 5.3 Verify Production Webhook

1. In Stripe Live mode, send a test webhook
2. Verify 200 response
3. Check production logs
4. Confirm order appears in production database (for test events)

---

## Testing Webhooks

### Local Testing with Stripe CLI

For development and testing before deploying to production.

#### Install Stripe CLI

**macOS:**

```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**

```bash
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Windows:**
Download from [Stripe CLI Releases](https://github.com/stripe/stripe-cli/releases)

#### Authenticate CLI

```bash
stripe login
```

Follow the prompts to authenticate with your Stripe account.

#### Forward Webhooks to Local Development Server

```bash
# Start your local dev server first
npm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Output:

```
> Ready! Your webhook signing secret is whsec_ABC123... (^C to quit)
```

Copy this webhook signing secret and add to your `.env.local` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_ABC123...
```

Restart your dev server after updating `.env.local`.

#### Trigger Test Events

In another terminal:

```bash
# Trigger checkout.session.completed event
stripe trigger checkout.session.completed

# Trigger checkout.session.expired event
stripe trigger checkout.session.expired
```

Check your dev server logs to see the webhook processing.

### Testing on Staging Environment

Before deploying to production, test on staging:

1. Deploy code to staging environment
2. Create webhook endpoint for staging URL
3. Update staging environment variables
4. Send test webhooks from Stripe Dashboard
5. Verify staging database receives orders
6. Check staging logs for errors

### End-to-End Testing

Complete the full purchase flow:

1. Navigate to staging site: `https://staging.judgefinder.io/ads/buy`
2. Fill out purchase form with test data
3. Use Stripe test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Complete checkout
7. Verify redirect to success page
8. Check database for order record
9. Verify webhook delivery in Stripe Dashboard

**Test Cards:**

| Card Number           | Scenario           |
| --------------------- | ------------------ |
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined      |
| `4000 0000 0000 9995` | Insufficient funds |

---

## Monitoring Webhooks

### Stripe Dashboard Monitoring

#### View Webhook Delivery Attempts

1. Go to **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. View recent deliveries in the **Attempts** section

**Key metrics to monitor:**

- **Success Rate**: Should be >99%
- **Response Time**: Should be <5 seconds
- **Failed Deliveries**: Investigate any failures

#### Webhook Attempt Details

Click on any attempt to view:

- **Request headers**: Includes Stripe-Signature
- **Request body**: Event payload sent
- **Response status**: Your endpoint's response code
- **Response body**: Your endpoint's response data
- **Response time**: How long your endpoint took to respond

#### Retry Behavior

Stripe automatically retries failed webhooks:

- First retry: Immediately
- Additional retries: With exponential backoff
- Max retries: Up to 3 days
- After 3 days: Webhook marked as failed

### Application Logs

#### Netlify Function Logs

1. Go to Netlify Dashboard
2. Select your site
3. Click **Functions** tab
4. Click on `api/stripe/webhook`
5. View real-time logs

**Look for:**

- Successful webhook processing: `INFO: Webhook received`
- Order creation: `INFO: Order created successfully`
- Errors: `ERROR: Webhook processing error`

#### Supabase Logs

Monitor database operations:

1. Go to Supabase Dashboard
2. Select your project
3. Click **Logs** in sidebar
4. Filter by `ad_orders` table

**Look for:**

- Insert operations on `ad_orders` table
- RLS policy evaluations
- Database errors or slow queries

### Alerting

#### Set Up Stripe Email Alerts

1. In Stripe Dashboard, go to **Settings** → **Notifications**
2. Under **Developer notifications**, enable:
   - Failed webhook deliveries
   - High webhook failure rates
3. Add your team's email address

#### Set Up Sentry Error Tracking

If using Sentry for error tracking:

1. Ensure Sentry is initialized in webhook handler
2. Configure alerts for:
   - Webhook verification failures
   - Database insertion errors
   - High error rates

### Regular Checks

Perform these checks weekly:

- [ ] Review webhook success rate in Stripe Dashboard
- [ ] Check for any failed webhook deliveries
- [ ] Verify recent orders appear in database
- [ ] Review application logs for errors
- [ ] Confirm webhook signing secret is not expired

---

## Security Best Practices

### Webhook Signature Verification

**Critical:** Always verify webhook signatures before processing events.

**Why it matters:**

Without signature verification, attackers could send fake webhook events to your endpoint, creating fraudulent orders or manipulating data.

**Verification process:**

1. Extract `Stripe-Signature` header from request
2. Use raw request body (not parsed JSON)
3. Verify signature using `STRIPE_WEBHOOK_SECRET`
4. Only process events with valid signatures

**Implementation:**

```typescript
const signature = request.headers.get('stripe-signature')
const body = await request.text()

try {
  const event = verifyWebhookSignature(body, signature)
  // Process verified event
} catch (error) {
  // Reject invalid signature
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
}
```

**Monitoring:**

- Log all signature verification failures
- Alert on high failure rates (may indicate attack)
- Review failed verifications weekly

### Secret Rotation

Rotate webhook signing secrets regularly:

**Recommended schedule:** Every 6 months

**Rotation process:**

1. In Stripe Dashboard, go to webhook endpoint settings
2. Click **Roll signing secret**
3. Copy new signing secret
4. Update `STRIPE_WEBHOOK_SECRET` in Netlify
5. Deploy updated configuration
6. Old secret remains valid for 24 hours (grace period)
7. Test webhook delivery with new secret
8. Verify no failed deliveries

**Emergency rotation:**

If signing secret is compromised:

1. Immediately roll signing secret in Stripe
2. Update environment variable
3. Deploy immediately (no grace period needed)
4. Monitor for suspicious webhook activity

### IP Whitelisting

**Note:** Stripe does not publish static IP ranges for webhook delivery.

**Alternative approaches:**

1. **Signature Verification** (required): Validates request authenticity
2. **Rate Limiting**: Prevent abuse from any IP
3. **DDoS Protection**: Use Netlify's built-in protection
4. **WAF Rules**: Configure Web Application Firewall if using Cloudflare

### HTTPS Requirement

**Mandatory:** Webhook endpoints must use HTTPS.

**Stripe requirements:**

- Valid SSL/TLS certificate
- TLS 1.2 or higher
- Certificate must be from a trusted CA
- No self-signed certificates in production

**Verification:**

```bash
# Test SSL certificate
curl -I https://judgefinder.io/api/stripe/webhook

# Check TLS version
openssl s_client -connect judgefinder.io:443 -tls1_2
```

**Netlify automatically provides:**

- Free SSL certificates via Let's Encrypt
- Automatic certificate renewal
- TLS 1.2+ support
- HTTPS enforcement

### Access Control

Restrict access to webhook configuration:

**Stripe Dashboard:**

- Limit Developer role to essential team members
- Use separate test and live mode API keys
- Enable two-factor authentication for all admins
- Audit API key usage regularly

**Netlify Dashboard:**

- Restrict environment variable access to admins
- Enable SSO if available
- Use separate staging and production environments
- Audit deploy permissions regularly

**Environment Variables:**

- Never commit to version control
- Use separate keys for each environment
- Rotate keys on team member departures
- Store securely in password manager

---

## Troubleshooting

### Issue: Webhook Returns 404 Not Found

**Symptoms:**

```
Response status: 404
Response body: Not Found
```

**Possible causes:**

1. Incorrect endpoint URL in Stripe
2. Function not deployed
3. Routing configuration issue

**Solutions:**

1. **Verify endpoint URL:**

   ```
   Correct: https://judgefinder.io/api/stripe/webhook
   Incorrect: https://judgefinder.io/stripe/webhook
   Incorrect: https://judgefinder.io/api/webhook
   ```

2. **Check function is deployed:**
   - Go to Netlify Dashboard → Functions
   - Verify `api/stripe/webhook` appears in list
   - Check recent deploy logs for build errors

3. **Test endpoint directly:**

   ```bash
   curl -X POST https://judgefinder.io/api/stripe/webhook \
     -H "Content-Type: application/json" \
     -d '{"test":"data"}'

   # Expected: 400 (missing signature) NOT 404
   ```

4. **Redeploy site:**
   - Trigger new deploy in Netlify
   - Wait for completion
   - Test webhook again

---

### Issue: Webhook Returns 400 Invalid Signature

**Symptoms:**

```
Response status: 400
Response body: {"error":"Invalid signature"}
```

**Possible causes:**

1. Wrong `STRIPE_WEBHOOK_SECRET` value
2. Test mode secret used in live mode (or vice versa)
3. Environment variable not loaded
4. Secret was rotated but not updated

**Solutions:**

1. **Verify signing secret matches:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Click on your endpoint
   - Click **Reveal** on Signing secret
   - Compare with Netlify environment variable
   - Ensure test/live mode match

2. **Check environment variable is set:**

   ```bash
   # In Netlify CLI
   netlify env:list

   # Should show STRIPE_WEBHOOK_SECRET
   ```

3. **Update environment variable:**
   - Copy correct signing secret from Stripe
   - Update in Netlify Dashboard
   - Trigger redeploy
   - Test again

4. **Verify mode consistency:**
   - Webhook endpoint mode (test/live) must match API key mode
   - Test webhook secret starts with `whsec_test_`
   - Live webhook secret starts with `whsec_`

---

### Issue: Webhook Returns 500 Internal Server Error

**Symptoms:**

```
Response status: 500
Response body: {"error":"Webhook processing failed"}
```

**Possible causes:**

1. Database connection error
2. Missing environment variables
3. Application code error
4. Supabase RLS policy blocking insert

**Solutions:**

1. **Check Netlify function logs:**
   - Go to Functions → api/stripe/webhook → Logs
   - Look for error messages
   - Note the stack trace

2. **Verify database connection:**
   - Check Supabase is online
   - Verify `SUPABASE_SERVICE_ROLE_KEY` is set
   - Test connection manually

3. **Check environment variables:**
   - All required variables set
   - No typos in variable names
   - Values are correct for environment

4. **Review application logs:**

   ```
   Look for:
   - "Failed to create order record"
   - "Supabase error"
   - "Database connection failed"
   ```

5. **Test database manually:**
   ```sql
   -- Test insert with service role
   INSERT INTO ad_orders (
     stripe_session_id,
     organization_name,
     customer_email,
     ad_type,
     amount_total,
     currency,
     status
   ) VALUES (
     'test_' || gen_random_uuid()::text,
     'Test',
     'test@example.com',
     'judge-profile',
     29900,
     'usd',
     'paid'
   );
   ```

---

### Issue: Webhook Received but Order Not in Database

**Symptoms:**

- Stripe shows 200 response
- No error in logs
- Order not appearing in `ad_orders` table

**Possible causes:**

1. RLS policy blocking insert
2. Unique constraint violation (duplicate session ID)
3. Transaction rolled back silently
4. Wrong database environment

**Solutions:**

1. **Check RLS policies:**

   ```sql
   -- Verify service role policy exists
   SELECT * FROM pg_policies
   WHERE tablename = 'ad_orders'
   AND policyname = 'Service role has full access to ad_orders';
   ```

2. **Check for duplicate session IDs:**

   ```sql
   -- Search for existing session
   SELECT * FROM ad_orders
   WHERE stripe_session_id = 'cs_test_...';
   ```

3. **Verify database environment:**
   - Check `NEXT_PUBLIC_SUPABASE_URL` points to correct project
   - Verify using production database (not test)
   - Confirm service role key matches database

4. **Enable detailed logging:**
   - Add debug logs in webhook handler
   - Log full error objects
   - Check for silent failures

---

### Issue: Webhook Timeout

**Symptoms:**

```
Response status: 504 Gateway Timeout
```

**Possible causes:**

1. Database query taking too long
2. Function execution time limit reached
3. Network connectivity issues

**Solutions:**

1. **Optimize database queries:**
   - Add indexes on frequently queried columns
   - Review query execution plans
   - Check for missing indexes

2. **Increase function timeout:**
   - Netlify default: 10 seconds
   - Increase if needed in `netlify.toml`:
     ```toml
     [functions]
     included_files = ["api/**"]
     timeout = 26  # Max 26 seconds
     ```

3. **Check network connectivity:**
   - Verify Supabase is reachable
   - Test connection from deployment region
   - Check for rate limiting on Supabase

4. **Implement retry logic:**
   - Let Stripe retry on timeout
   - Use idempotency checks to prevent duplicates
   - Log timeout events for investigation

---

### Issue: Duplicate Webhooks Creating Multiple Orders

**Symptoms:**

- Multiple orders for same session
- Duplicate entries in database

**Possible causes:**

1. Unique constraint not enforced
2. Race condition on webhook processing
3. Stripe retrying duplicate events

**Solutions:**

1. **Verify unique constraint exists:**

   ```sql
   -- Check constraint on stripe_session_id
   SELECT * FROM information_schema.table_constraints
   WHERE table_name = 'ad_orders'
   AND constraint_type = 'UNIQUE';
   ```

2. **Add unique constraint if missing:**

   ```sql
   ALTER TABLE ad_orders
   ADD CONSTRAINT ad_orders_stripe_session_id_unique
   UNIQUE (stripe_session_id);
   ```

3. **Check webhook handler:**
   - Should return 200 even if database insert fails due to unique constraint
   - This prevents Stripe from retrying

4. **Clean up duplicates:**

   ```sql
   -- Find duplicates
   SELECT stripe_session_id, COUNT(*)
   FROM ad_orders
   GROUP BY stripe_session_id
   HAVING COUNT(*) > 1;

   -- Keep first, delete rest
   DELETE FROM ad_orders
   WHERE id NOT IN (
     SELECT MIN(id)
     FROM ad_orders
     GROUP BY stripe_session_id
   );
   ```

---

### Getting Help

If you're unable to resolve the issue:

1. **Gather information:**
   - Webhook endpoint URL
   - Event ID from Stripe Dashboard
   - Error message and status code
   - Application logs
   - Database logs

2. **Check Stripe status:**
   - Visit [Stripe Status Page](https://status.stripe.com)
   - Check for ongoing incidents

3. **Contact support:**
   - Email: dev@judgefinder.io
   - Include all gathered information
   - Specify environment (test/live, staging/production)

4. **Review documentation:**
   - [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
   - [Technical Integration Guide](./STRIPE_INTEGRATION.md)
   - [Deployment Guide](./AD_PURCHASE_DEPLOYMENT.md)

---

## Related Documentation

- [Technical Integration Guide](./STRIPE_INTEGRATION.md) - Detailed implementation documentation
- [Deployment Guide](./AD_PURCHASE_DEPLOYMENT.md) - Deployment procedures and checklists
- [User Guide](./AD_PURCHASE_USER_GUIDE.md) - User-facing documentation
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks) - Official Stripe docs

---

**Need Help?**
Contact the system administration team at sysadmin@judgefinder.io
