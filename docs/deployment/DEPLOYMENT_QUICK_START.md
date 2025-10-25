# Deployment Quick Start - JudgeFinder Platform

Fast-track guide to deploy judgefinder.io to production in under 1 hour.

## Prerequisites

- [ ] GitHub repository admin access
- [ ] Netlify account with site created
- [ ] All service API keys ready (see checklist below)

---

## Step 1: GitHub Secrets (5 minutes)

### Navigate to Repository Secrets

```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

### Add These Secrets

```bash
# Netlify (from Netlify dashboard)
NETLIFY_SITE_ID=your_site_id
NETLIFY_AUTH_TOKEN=your_auth_token

# Supabase (from Supabase dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_JWT_SECRET=your-jwt-secret

# Clerk (from Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

**Where to find**:
- Netlify Site ID: Site settings → Site details → API ID
- Netlify Token: User settings → Applications → New token
- Supabase: Project → Settings → API
- Clerk: Dashboard → API Keys

---

## Step 2: Netlify Environment Variables (15 minutes)

### Quick Import Method (Recommended)

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Link site
netlify link

# 4. Set variables (one by one or bulk)
netlify env:set VARIABLE_NAME value
```

### Required Variables Checklist

Copy this list to a text file and fill in values:

```bash
# === CRITICAL (Site won't work without these) ===

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_
CLERK_SECRET_KEY=sk_live_

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ
SUPABASE_SERVICE_ROLE_KEY=eyJ
SUPABASE_JWT_SECRET=

# Site Config
NEXT_PUBLIC_SITE_URL=https://judgefinder.io
NEXT_PUBLIC_APP_URL=https://judgefinder.io
NEXT_PUBLIC_APP_NAME=JudgeFinder Platform
NODE_ENV=production

# === HIGH PRIORITY (Core features) ===

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_
STRIPE_WEBHOOK_SECRET=whsec_
STRIPE_PRICE_MONTHLY=price_
STRIPE_PRICE_YEARLY=price_

# SendGrid Email
SENDGRID_API_KEY=SG.
SENDGRID_FROM_EMAIL=billing@judgefinder.io

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://
UPSTASH_REDIS_REST_TOKEN=

# === MEDIUM PRIORITY (Enhanced features) ===

# CourtListener API
COURTLISTENER_API_KEY=

# AI Services (choose one or both)
OPENAI_API_KEY=sk-proj-
# OR
GOOGLE_AI_API_KEY=AIzaSy

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4
TURNSTILE_SECRET_KEY=0x4

# === SECURITY ===

# Generate with: openssl rand -base64 32
ENCRYPTION_KEY=
SYNC_API_KEY=
CRON_SECRET=

# Admin Access (comma-separated Clerk user IDs)
ADMIN_USER_IDS=user_

# === OPTIONAL (Monitoring) ===

# Sentry
SENTRY_DSN=https://
NEXT_PUBLIC_SENTRY_DSN=https://

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-
```

**Quick generate random keys**:
```bash
# Generate 3 random keys for security variables
openssl rand -base64 32  # ENCRYPTION_KEY
openssl rand -base64 32  # SYNC_API_KEY
openssl rand -base64 32  # CRON_SECRET
```

---

## Step 3: Enable GitHub Actions (2 minutes)

### Configure Permissions

```
Repository → Settings → Actions → General
```

**Set these options**:
- [x] Allow all actions and reusable workflows
- [x] Read and write permissions (under Workflow permissions)
- [x] Allow GitHub Actions to create and approve pull requests

---

## Step 4: Test Deployment (30 minutes)

### Option A: Preview Deploy First (Recommended)

```bash
# 1. Create test branch
git checkout -b test/deployment-setup

# 2. Make small change
echo "# Deployment Test" >> docs/DEPLOYMENT_TEST.md
git add docs/DEPLOYMENT_TEST.md
git commit -m "test: verify deployment pipeline"

# 3. Push and create PR
git push origin test/deployment-setup
gh pr create --title "Test: Deployment Setup" --body "Testing CI/CD pipeline"

# 4. Wait for GitHub Actions to complete (~15 min)
# Check: Repository → Actions tab

# 5. Find preview URL in PR comments
# Should see: "🚀 Preview Deployment Ready! **Preview URL**: https://deploy-preview-XX--judgefinder.netlify.app"

# 6. Test preview site
curl https://deploy-preview-XX--judgefinder.netlify.app

# 7. If successful, merge PR
gh pr merge --squash
```

### Option B: Direct Production Deploy

```bash
# Only if you're confident in setup

# 1. Trigger manual deploy
git commit --allow-empty -m "chore: trigger initial production deploy"
git push origin main

# 2. Monitor GitHub Actions
# Repository → Actions → Production Deployment

# 3. Wait for completion (~25-35 min)

# 4. Verify site
curl https://judgefinder.io
```

---

## Step 5: Verify Deployment (5 minutes)

### Automated Checks

GitHub Actions runs these automatically:
- ✅ Health check (/)
- ✅ Critical pages (/judges, /courts)
- ✅ API endpoints
- ✅ Sitemap

### Manual Verification

```bash
# 1. Site loads
open https://judgefinder.io

# 2. Search works
# Try searching for a judge name

# 3. Authentication works
# Click "Sign In" → should redirect to Clerk

# 4. Judge profile loads
# Navigate to any judge → verify analytics display

# 5. AI chat works (if configured)
# Open chat widget → send test message
```

### Check Monitoring

1. **Netlify**: https://app.netlify.com/sites/YOUR_SITE/overview
   - Should show "Published" status
   - Check deploy time and duration

2. **Sentry** (if configured): https://sentry.io
   - Should have no critical errors

3. **GitHub Actions**: Repository → Actions
   - All workflows should be green ✅

---

## Troubleshooting Quick Fixes

### Build Fails: "Environment variable undefined"

**Solution**: Add to Netlify environment variables
```bash
netlify env:set VARIABLE_NAME value
```

### Build Fails: "Module not found"

**Solution**: Clear cache and rebuild
```bash
# In Netlify UI: Deploys → Trigger deploy → Clear cache and deploy site
```

### Site Loads but Auth Fails

**Solution**: Verify Clerk keys
```bash
# Check you're using production keys (pk_live_, sk_live_)
# Not test keys (pk_test_, sk_test_)
netlify env:get NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
netlify env:get CLERK_SECRET_KEY
```

### Stripe Checkout Fails

**Solution**: Set up webhook
1. Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://judgefinder.io/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`
4. Copy webhook signing secret → Add to Netlify as `STRIPE_WEBHOOK_SECRET`

### Emails Not Sending

**Solution**: Verify SendGrid sender
1. SendGrid → Settings → Sender Authentication
2. Verify `billing@judgefinder.io`
3. Add SPF/DKIM records to DNS
4. Check API key permissions (Mail Send)

---

## Post-Deployment Checklist

### Immediate (0-30 minutes)

- [ ] Site loads at https://judgefinder.io
- [ ] Homepage renders correctly
- [ ] Search functionality works
- [ ] Judge profiles load with analytics
- [ ] Authentication redirects to Clerk
- [ ] No JavaScript errors in console
- [ ] API endpoints responding

### First Hour

- [ ] Test full user flow (search → profile → sign in)
- [ ] Verify email system (trigger test email)
- [ ] Check Sentry for errors (should be zero critical)
- [ ] Review Netlify Analytics (response times)
- [ ] Test on mobile device
- [ ] Verify SEO elements (view source → meta tags)

### First Day

- [ ] Monitor error rates (Sentry dashboard)
- [ ] Check scheduled jobs (cron functions)
- [ ] Verify data sync working
- [ ] Test payment flow (if applicable)
- [ ] Review Lighthouse scores (should be >90)
- [ ] Gather user feedback

### First Week

- [ ] Security audit passing (weekly workflow)
- [ ] No critical vulnerabilities (npm audit)
- [ ] Performance metrics stable
- [ ] Rollback tested and working
- [ ] Team trained on deployment process
- [ ] Documentation reviewed and updated

---

## Success Indicators

### Green Lights ✅

- GitHub Actions workflows all passing
- Netlify deploy status: "Published"
- Site responding with 200 OK
- No critical Sentry errors
- API endpoints returning data
- Authentication working
- Scheduled jobs running

### Red Flags 🚨

- Build failures in GitHub Actions
- 500 errors on site
- Authentication redirects failing
- API timeouts
- High error rates in Sentry
- Missing environment variables

---

## Next Steps

### After Successful Deploy

1. **Set up monitoring alerts**
   - Sentry: Configure alert rules
   - Netlify: Enable email notifications
   - Uptime monitoring: Add to UptimeRobot or similar

2. **Test rollback procedure**
   ```bash
   # Practice rolling back (won't affect production)
   gh workflow run rollback.yml -f reason="Rollback test"
   ```

3. **Document custom processes**
   - Team-specific deployment schedule
   - On-call rotation for deployment issues
   - Escalation procedures

4. **Schedule regular maintenance**
   - Weekly: Review security audit
   - Monthly: Dependency updates
   - Quarterly: Secret rotation

### Resources

- **Full Guide**: `/docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Environment Setup**: `/docs/deployment/NETLIFY_ENVIRONMENT_SETUP.md`
- **CI/CD Details**: `/docs/deployment/CI_CD_SETUP_COMPLETE.md`
- **Troubleshooting**: `/docs/NETLIFY_TROUBLESHOOTING.md`

---

## Quick Reference

### Essential Commands

```bash
# Check deployment status
netlify status

# List recent deploys
netlify deploy:list

# View environment variables
netlify env:list

# Trigger manual deploy
gh workflow run deploy-production.yml

# Rollback deployment
gh workflow run rollback.yml -f reason="Issue description"

# View workflow runs
gh run list

# Check site health
curl https://judgefinder.io/api/health
```

### Service Dashboards

| Service | URL |
|---------|-----|
| Netlify | https://app.netlify.com |
| GitHub Actions | https://github.com/YOUR_ORG/REPO/actions |
| Clerk | https://dashboard.clerk.com |
| Supabase | https://app.supabase.com |
| Stripe | https://dashboard.stripe.com |
| SendGrid | https://app.sendgrid.com |
| Sentry | https://sentry.io |

### Support

- **Documentation**: `/docs/deployment/`
- **GitHub Issues**: For bugs and feature requests
- **Team Channel**: [Your team chat]

---

## Estimated Time

| Task | Duration |
|------|----------|
| GitHub Secrets | 5 min |
| Netlify Environment Variables | 15 min |
| Enable GitHub Actions | 2 min |
| Test Deployment | 30 min |
| Verification | 5 min |
| **Total** | **~1 hour** |

Plus monitoring time in first 24 hours.

---

**Status**: Ready to Deploy
**Target**: judgefinder.io
**Method**: Automated CI/CD via GitHub Actions
**Estimated Downtime**: 0 seconds (new deployment)

🚀 **You're ready to go live!**

---

**Last Updated**: 2025-10-24
