# Netlify Environment Setup - JudgeFinder Platform

Complete guide for configuring environment variables in Netlify for production deployment.

## Quick Setup

### Access Environment Variables

1. Go to https://app.netlify.com
2. Select your site (judgefinder)
3. Site settings → Environment variables
4. Click "Add a variable"

### Bulk Import (Recommended)

Use Netlify CLI for bulk import:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link site
netlify link

# Import from .env.production
netlify env:import .env.production
```

---

## Required Environment Variables

### Critical (Site Won't Function Without These)

#### Authentication (Clerk)

```bash
# Get from: https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Important**: Use `pk_live_` and `sk_live_` for production, not `pk_test_` keys.

#### Database (Supabase)

```bash
# Get from: https://app.supabase.com → Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # DANGER: Full database access
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase
```

**Security Note**: `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Keep secure.

#### Site Configuration

```bash
NEXT_PUBLIC_SITE_URL=https://judgefinder.io
NEXT_PUBLIC_APP_URL=https://judgefinder.io
NEXT_PUBLIC_APP_NAME=JudgeFinder Platform
NODE_ENV=production
```

### High Priority (Core Features)

#### Payment Processing (Stripe)

```bash
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Get from: https://dashboard.stripe.com/webhooks
STRIPE_WEBHOOK_SECRET=whsec_...

# Get from: https://dashboard.stripe.com/products
# Create products for Universal Access
STRIPE_PRICE_MONTHLY=price_...  # $500/month
STRIPE_PRICE_YEARLY=price_...   # $5,000/year
```

**Webhook Setup**:
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://judgefinder.io/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret

#### Email Service (SendGrid)

```bash
# Get from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY=SG.abcd1234...
SENDGRID_FROM_EMAIL=billing@judgefinder.io
```

**SendGrid Setup**:
1. Create API key with "Mail Send" permission
2. Verify sender identity: `billing@judgefinder.io`
3. Add SPF/DKIM records to DNS

#### Cache & Rate Limiting (Upstash Redis)

```bash
# Get from: https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://abc-123.upstash.io
UPSTASH_REDIS_REST_TOKEN=AbCd...
```

**Upstash Setup**:
1. Create Redis database
2. Choose region closest to Netlify (US East for judgefinder.io)
3. Copy REST URL and token

### Medium Priority (Enhanced Features)

#### External Data (CourtListener)

```bash
# Get from: https://www.courtlistener.com/help/api/
COURTLISTENER_API_KEY=your-api-key

# Optional: Fine-tune API behavior
COURTLISTENER_REQUEST_DELAY_MS=1000
COURTLISTENER_MAX_RETRIES=5
COURTLISTENER_REQUEST_TIMEOUT_MS=30000
```

#### AI Services (Choose One or Both)

```bash
# Option 1: OpenAI (primary for legal queries)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...

# Option 2: Google AI (cost-effective for analytics)
# Get from: https://makersuite.google.com/app/apikey
GOOGLE_AI_API_KEY=AIzaSy...
```

**Recommendation**: Use both for redundancy. System falls back to Google if OpenAI fails.

#### Bot Protection (Cloudflare Turnstile)

```bash
# Get from: https://dash.cloudflare.com → Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
TURNSTILE_SECRET_KEY=0x4AAA...
```

**Turnstile Setup**:
1. Add site: `judgefinder.io`
2. Choose: Managed (recommended)
3. Copy site key and secret key

### Security & Internal

#### Internal API Keys

```bash
# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=YOUR_RANDOM_32_CHAR_KEY
SYNC_API_KEY=YOUR_RANDOM_32_CHAR_KEY
CRON_SECRET=YOUR_RANDOM_32_CHAR_KEY
```

**Generate Keys**:
```bash
# Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Admin Access

```bash
# Comma-separated Clerk user IDs
# Get from: https://dashboard.clerk.com → Users
ADMIN_USER_IDS=user_2abc123,user_2def456
```

### Optional (Monitoring & Analytics)

#### Error Tracking (Sentry)

```bash
# Get from: https://sentry.io/settings/projects/
SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7654321
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7654321
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ENVIRONMENT=production
```

#### Analytics

```bash
# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# PostHog (optional)
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### SEO Verification

```bash
# Google Search Console
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=abc123...

# Bing Webmaster Tools
NEXT_PUBLIC_BING_SITE_VERIFICATION=xyz789...
```

---

## Environment Variable Scoping

### Public Variables (NEXT_PUBLIC_*)

These are **exposed to the browser**. Only use for non-sensitive data:

```bash
NEXT_PUBLIC_SITE_URL=https://judgefinder.io
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Protected by RLS
```

Safe because:
- Clerk publishable key is designed for client use
- Supabase anon key is protected by Row Level Security
- Site URL is inherently public

### Private Variables (No Prefix)

These are **server-side only**. Never exposed to browser:

```bash
CLERK_SECRET_KEY=sk_live_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_live_...
OPENAI_API_KEY=sk-proj-...
```

### Context-Specific Variables

Netlify supports different values per context:

```bash
# Production only
netlify env:set SENTRY_ENVIRONMENT production --context production

# Deploy previews only
netlify env:set NODE_ENV production --context deploy-preview

# Branch deploys
netlify env:set FEATURE_FLAGS_ENABLED true --context branch-deploy
```

---

## Validation & Testing

### Validate Configuration

```bash
# Local validation
npm run validate:env

# Check specific variables
netlify env:list
```

### Test in Deploy Preview

1. Create PR with changes
2. Wait for deploy preview
3. Check preview URL in PR comments
4. Verify environment variables work

### Production Smoke Test

After setting variables:

```bash
# Trigger test deploy
git commit --allow-empty -m "test: verify env vars"
git push

# Or manual deploy
netlify deploy --prod
```

---

## Security Best Practices

### DO

✅ Use production keys (`pk_live_`, `sk_live_`) in production
✅ Rotate secrets regularly (quarterly recommended)
✅ Use different keys for staging/production
✅ Store secrets in Netlify, not in code
✅ Verify sender emails in SendGrid
✅ Enable 2FA on all service accounts
✅ Use restrictive API key permissions

### DON'T

❌ Commit `.env` files to git
❌ Use test keys in production
❌ Share secrets in chat/email
❌ Use same keys across environments
❌ Give API keys broader permissions than needed
❌ Store secrets in build logs

### Audit Trail

```bash
# Review who accessed secrets (Netlify audit log)
# Site settings → Audit log

# Check for exposed secrets
bash scripts/verify-build-security.sh

# Scan git history
git log -p | grep -i "api_key\|secret\|password"
```

---

## Troubleshooting

### Issue: Variable Not Available in Build

**Symptom**: `undefined` for environment variable

**Causes & Solutions**:

1. **Variable name typo**
   ```bash
   # Check spelling
   netlify env:list | grep VARIABLE_NAME
   ```

2. **Wrong context**
   ```bash
   # Set for all contexts
   netlify env:set VAR_NAME value --context production --context deploy-preview
   ```

3. **Cache issue**
   ```bash
   # Clear cache and rebuild
   netlify build --clear-cache
   ```

### Issue: "Environment variable is undefined"

**For NEXT_PUBLIC_* variables**:

Must be set at **build time** (not just runtime):

```bash
# Set in Netlify UI before build
# OR set in netlify.toml
[build.environment]
  NEXT_PUBLIC_SITE_URL = "https://judgefinder.io"
```

### Issue: Secrets Exposed in Client Bundle

**Check**:
```bash
# Build locally and search
npm run build
grep -r "sk_live_" .next/static/
```

**Solution**:
- Remove `NEXT_PUBLIC_` prefix from secret variables
- Move to server-side API routes
- Use Next.js API routes to proxy sensitive operations

### Issue: Stripe Webhook Fails

**Verify**:
1. Webhook URL: `https://judgefinder.io/api/stripe/webhook`
2. `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. Selected events include `checkout.session.completed`

**Test**:
```bash
# Trigger test webhook from Stripe CLI
stripe trigger checkout.session.completed
```

---

## Migration & Updates

### Updating Variables

```bash
# Update single variable
netlify env:set VARIABLE_NAME new_value

# Update multiple
netlify env:import .env.production.update
```

### Rotating Secrets

1. **Generate new secret** in service dashboard
2. **Add to Netlify** with temporary name (e.g., `STRIPE_SECRET_KEY_NEW`)
3. **Deploy with both** keys active
4. **Switch to new key** (rename variable)
5. **Remove old key** from Netlify
6. **Revoke old key** in service dashboard

### Backup Configuration

```bash
# Export current configuration
netlify env:list > env-backup-$(date +%Y%m%d).txt

# Encrypt backup
gpg -c env-backup-20250124.txt

# Store securely (1Password, LastPass, etc.)
```

---

## Quick Reference

### Most Common Issues

| Issue | Solution |
|-------|----------|
| Build fails with "env undefined" | Check variable name and context |
| Site loads but auth fails | Verify Clerk keys (use `pk_live_`, `sk_live_`) |
| Database queries fail | Check Supabase URL and keys |
| Stripe checkout fails | Verify webhook secret matches |
| Emails not sending | Check SendGrid API key and verified sender |
| Rate limiting not working | Verify Upstash Redis credentials |

### Service Dashboards

- **Netlify**: https://app.netlify.com
- **Clerk**: https://dashboard.clerk.com
- **Supabase**: https://app.supabase.com
- **Stripe**: https://dashboard.stripe.com
- **SendGrid**: https://app.sendgrid.com
- **Upstash**: https://console.upstash.com
- **Sentry**: https://sentry.io

### Support

- **Netlify Support**: https://www.netlify.com/support/
- **Documentation**: See `/docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md`

---

**Last Updated**: 2025-10-24

**Next Review**: 2025-11-24
