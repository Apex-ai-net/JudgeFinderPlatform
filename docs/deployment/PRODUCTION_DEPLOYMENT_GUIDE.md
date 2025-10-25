# Production Deployment Guide - JudgeFinder Platform

Complete guide for deploying JudgeFinder Platform to production on Netlify (judgefinder.io).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Environment Variables](#environment-variables)
- [GitHub Actions Setup](#github-actions-setup)
- [Deployment Process](#deployment-process)
- [Monitoring & Verification](#monitoring--verification)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Deployment Architecture

```
GitHub Repository (main branch)
    ↓
GitHub Actions (CI/CD)
    ↓
Build & Test
    ↓
Security Checks
    ↓
Netlify Deployment
    ↓
Production (judgefinder.io)
```

### Key Features

- Automated CI/CD pipeline with GitHub Actions
- Comprehensive pre-deployment validation
- Security scanning and secret detection
- Deploy previews for pull requests
- Instant rollback capability
- Post-deployment verification
- Performance monitoring

---

## Prerequisites

### Required Accounts & Access

1. **GitHub Repository Access**
   - Admin or maintainer role
   - Ability to manage secrets
   - Ability to configure workflows

2. **Netlify Account**
   - Site created: judgefinder.io
   - Admin access to site settings
   - API access token generated

3. **External Services** (API Keys Required)
   - Clerk (Authentication)
   - Supabase (Database)
   - Stripe (Payments)
   - SendGrid (Email)
   - Upstash Redis (Rate Limiting)
   - CourtListener (Data Sync)
   - OpenAI or Google AI (Analytics)
   - Cloudflare Turnstile (Bot Protection)

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/YOUR_ORG/JudgeFinderPlatform.git
cd JudgeFinderPlatform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Validate setup
npm run validate:env

# Run development server
npm run dev
```

---

## Initial Setup

### 1. Netlify Site Configuration

#### Create Site (if not exists)

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: Leave empty (handled by Next.js plugin)
   - **Functions directory**: Leave empty (handled by Next.js plugin)
5. Click "Deploy site"

#### Configure Custom Domain

1. In Netlify dashboard → Site settings → Domain management
2. Click "Add custom domain"
3. Enter: `judgefinder.io`
4. Configure DNS:
   ```
   Type    Name    Value
   A       @       75.2.60.5
   CNAME   www     judgefinder.netlify.app
   ```
5. Enable HTTPS (automatic with Netlify)
6. Force HTTPS redirect (enabled by default)

#### Get Netlify Credentials

```bash
# Site ID
# Found in: Site settings → General → Site details → API ID
NETLIFY_SITE_ID=abc123def456

# Auth Token
# Generate at: User settings → Applications → Personal access tokens
NETLIFY_AUTH_TOKEN=your_token_here
```

### 2. Configure Environment Variables in Netlify

Go to: Site settings → Environment variables

#### Required Variables (Production)

**Authentication (Clerk)**
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_key
CLERK_SECRET_KEY=sk_live_your_key
```

**Database (Supabase)**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

**Payments (Stripe)**
```bash
STRIPE_SECRET_KEY=sk_live_your_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PRICE_MONTHLY=price_monthly_id
STRIPE_PRICE_YEARLY=price_yearly_id
```

**Email (SendGrid)**
```bash
SENDGRID_API_KEY=SG.your_api_key
SENDGRID_FROM_EMAIL=billing@judgefinder.io
```

**Cache & Rate Limiting (Upstash)**
```bash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
```

**External APIs**
```bash
COURTLISTENER_API_KEY=your_api_key
OPENAI_API_KEY=sk-your_key  # OR
GOOGLE_AI_API_KEY=your_google_key  # Use one or both
```

**Bot Protection (Cloudflare Turnstile)**
```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAA...
TURNSTILE_SECRET_KEY=0x4AAA...
```

**Security & Internal**
```bash
ENCRYPTION_KEY=your_32_char_random_key
SYNC_API_KEY=your_32_char_random_key
CRON_SECRET=your_32_char_random_key
```

**Site Configuration**
```bash
NEXT_PUBLIC_SITE_URL=https://judgefinder.io
NEXT_PUBLIC_APP_URL=https://judgefinder.io
NEXT_PUBLIC_APP_NAME=JudgeFinder Platform
NODE_ENV=production
```

**Admin Access**
```bash
ADMIN_USER_IDS=user_clerk_id_1,user_clerk_id_2
```

**Optional: Monitoring**
```bash
SENTRY_DSN=https://your_key@your_org.ingest.sentry.io/project_id
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key
```

#### Generate Random Keys

```bash
# Generate encryption keys
openssl rand -base64 32

# Generate API keys
openssl rand -hex 32
```

---

## GitHub Actions Setup

### 1. Configure GitHub Secrets

Go to: Repository → Settings → Secrets and variables → Actions

#### Add Repository Secrets

**Netlify Credentials**
```
NETLIFY_SITE_ID=your_site_id
NETLIFY_AUTH_TOKEN=your_auth_token
```

**Build-Time Variables** (subset needed for builds)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_JWT_SECRET
```

Note: Full environment variables are configured in Netlify. GitHub secrets are only needed for build-time operations in CI.

### 2. Enable GitHub Actions

1. Go to: Repository → Settings → Actions → General
2. Enable "Allow all actions and reusable workflows"
3. Set "Workflow permissions" to "Read and write permissions"
4. Enable "Allow GitHub Actions to create and approve pull requests"

### 3. Verify Workflows

Workflows are located in `.github/workflows/`:

- `deploy-production.yml` - Production deployments (main branch)
- `preview-deployment.yml` - PR preview deploys
- `rollback.yml` - Manual rollback workflow
- `security-audit.yml` - Weekly security audits
- `test.yml` - Continuous integration tests
- `accessibility.yml` - Accessibility compliance checks

---

## Deployment Process

### Automated Deployment (Recommended)

**Trigger**: Push to `main` branch

```bash
# 1. Make changes on a feature branch
git checkout -b feature/my-feature

# 2. Commit changes
git add .
git commit -m "feat: add new feature"

# 3. Push and create PR
git push origin feature/my-feature

# 4. GitHub Actions runs:
#    - Validation
#    - Tests
#    - Security checks
#    - Deploy preview (PR preview URL)

# 5. Review PR and preview deployment

# 6. Merge to main (triggers production deploy)
gh pr merge --squash

# 7. GitHub Actions runs production deployment:
#    ✓ Pre-deployment validation
#    ✓ Run test suite
#    ✓ Build production bundle
#    ✓ Security scan
#    ✓ Deploy to Netlify
#    ✓ Post-deployment verification
#    ✓ Health checks
```

### Manual Deployment (Emergency)

**From GitHub UI:**

1. Go to: Actions → Production Deployment
2. Click "Run workflow"
3. Select branch: `main`
4. Optionally check "Skip tests" for emergency deploys
5. Click "Run workflow"

**From CLI (with Netlify CLI):**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build
npm run build:production

# Deploy
netlify deploy --prod --site=your_site_id

# Verify
curl https://judgefinder.io
```

### Deployment Steps Explained

#### 1. Pre-Deployment Validation (2-3 minutes)

- Code checkout
- Dependency installation
- Security scanning
- Environment variable validation
- Build configuration checks

#### 2. Test Suite (15-20 minutes)

Runs in parallel:
- Unit tests
- Integration tests
- E2E tests (Playwright)
- Type checking
- Linting

#### 3. Build (5-7 minutes)

- Next.js production build
- Static optimization
- Bundle size analysis
- Post-build security check

#### 4. Deployment (2-3 minutes)

- Upload build artifacts to Netlify
- Deploy to production
- Invalidate CDN cache
- Update deployment status

#### 5. Verification (2-3 minutes)

- Health check (/)
- Critical page checks
- API endpoint verification
- Sitemap validation

**Total Time**: ~25-35 minutes for full deployment

---

## Monitoring & Verification

### Post-Deployment Checklist

#### Immediate Checks (0-5 minutes)

```bash
# 1. Site is live
curl -I https://judgefinder.io
# Expected: 200 OK

# 2. Critical pages load
curl -I https://judgefinder.io/judges
curl -I https://judgefinder.io/courts

# 3. API health
curl https://judgefinder.io/api/health | jq
# Expected: {"status":"healthy"}

# 4. Sitemap accessible
curl -I https://judgefinder.io/sitemap.xml
# Expected: 200 OK
```

#### Functional Verification (5-15 minutes)

1. **Authentication Flow**
   - Visit /sign-in
   - Test login/logout
   - Check session persistence

2. **Search Functionality**
   - Test judge search
   - Verify results load
   - Check pagination

3. **AI Chat**
   - Open chat widget
   - Send test query
   - Verify response

4. **Analytics Generation**
   - View judge profile with analytics
   - Check bias detection display
   - Verify data accuracy

5. **Payment Flow** (if applicable)
   - Test Stripe checkout
   - Verify webhook handling
   - Check email notifications

#### Performance Checks (15-30 minutes)

```bash
# Lighthouse audit
npm run lighthouse

# Expected scores:
# Performance: >90
# Accessibility: >95
# Best Practices: >90
# SEO: >90
```

### Monitoring Dashboards

#### Netlify Analytics
- URL: https://app.netlify.com/sites/YOUR_SITE/analytics
- Monitor: Response times, bandwidth, error rates

#### Sentry Error Tracking
- URL: https://sentry.io/organizations/YOUR_ORG/issues/
- Monitor: JavaScript errors, API failures

#### Supabase Logs
- URL: https://app.supabase.com/project/YOUR_PROJECT/logs
- Monitor: Database queries, RLS violations

#### Upstash Redis
- URL: https://console.upstash.com/
- Monitor: Rate limit hits, cache performance

### Alerts & Notifications

**GitHub Actions**
- Failed deployments trigger notifications
- PR comments on deploy previews
- Commit comments on production deploys

**Sentry Alerts**
- Critical errors → Email/Slack
- High error rates → Email/Slack
- Performance degradation → Email

---

## Rollback Procedures

### Instant Rollback via Netlify UI

**Fastest method (2-3 minutes):**

1. Go to: https://app.netlify.com/sites/YOUR_SITE/deploys
2. Find previous successful deploy
3. Click "..." menu → "Publish deploy"
4. Confirm rollback
5. Wait ~30 seconds for propagation
6. Verify site: `curl https://judgefinder.io`

### Rollback via GitHub Actions

**For tracked rollbacks (5 minutes):**

1. Go to: Repository → Actions → Rollback Deployment
2. Click "Run workflow"
3. Leave deployment ID empty (rolls back to previous)
4. Enter reason: "Reason for rollback"
5. Click "Run workflow"
6. Monitor progress in Actions tab

Workflow will:
- Fetch deployment history
- Restore previous deployment
- Verify site health
- Notify on completion

### Rollback via Netlify CLI

```bash
# List recent deployments
netlify deploy:list

# Rollback to specific deployment
netlify deploy:rollback --deploy-id=abc123

# Or rollback to previous
netlify api rollbackSiteDeploy --site=YOUR_SITE_ID
```

### Emergency Rollback (Git Revert)

If Netlify rollback fails:

```bash
# 1. Revert problematic commit
git revert HEAD
git push origin main

# 2. This triggers new deployment with reverted code

# 3. Or force push to previous commit (use with caution)
git reset --hard HEAD~1
git push --force origin main
```

**WARNING**: Force push will trigger deployment but loses commit history.

---

## Troubleshooting

### Build Failures

#### Issue: "Module not found" errors

```bash
# Solution: Clear cache and rebuild
npm run clean
npm ci --legacy-peer-deps
npm run build
```

#### Issue: TypeScript errors in build

```bash
# Check errors locally
npm run type-check

# Fix errors, then rebuild
npm run build
```

#### Issue: Out of memory during build

**In netlify.toml:**
```toml
[build.environment]
  NODE_OPTIONS = "--max-old-space-size=4096"
```

Or in package.json:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### Deployment Failures

#### Issue: Netlify authentication failed

```bash
# Regenerate auth token
# Go to: https://app.netlify.com/user/applications
# Create new token
# Update GitHub secret: NETLIFY_AUTH_TOKEN
```

#### Issue: Site won't start after deploy

**Check Netlify function logs:**
1. Go to: Site → Functions
2. Check for errors in function logs
3. Common issues:
   - Missing environment variables
   - Invalid Clerk keys
   - Database connection failures

**Verify environment variables:**
```bash
# In Netlify dashboard
Site settings → Environment variables

# Required variables checklist:
□ CLERK_SECRET_KEY
□ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
□ SUPABASE_SERVICE_ROLE_KEY
□ NEXT_PUBLIC_SUPABASE_URL
□ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Runtime Errors

#### Issue: "Authentication not configured"

**Cause**: Missing or invalid Clerk keys

**Solution**:
1. Verify keys in Netlify: Site settings → Environment variables
2. Check Clerk dashboard for correct keys
3. Ensure using `pk_live_` and `sk_live_` for production
4. Redeploy after updating

#### Issue: Database queries failing

**Cause**: Invalid Supabase credentials or RLS policies

**Solution**:
1. Test Supabase connection:
   ```bash
   curl https://YOUR_PROJECT.supabase.co/rest/v1/judges?limit=1 \
     -H "apikey: YOUR_ANON_KEY"
   ```
2. Check RLS policies in Supabase dashboard
3. Verify service role key for admin operations

#### Issue: Rate limiting not working

**Cause**: Upstash Redis connection issues

**Solution**:
1. Check Upstash credentials in Netlify
2. Test Redis connection:
   ```bash
   curl https://YOUR_INSTANCE.upstash.io \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
3. Graceful degradation: App continues without rate limiting

### Performance Issues

#### Issue: Slow page loads

**Diagnose**:
```bash
# Run Lighthouse
npm run lighthouse

# Check Netlify analytics
# Go to: Site → Analytics → Performance
```

**Common fixes**:
1. Enable caching headers (already in netlify.toml)
2. Optimize images with Next.js Image
3. Review bundle size: `npm run build` (check .next/analyze)
4. Enable ISR (Incremental Static Regeneration) for judge pages

#### Issue: API timeouts

**Check**:
1. Netlify function logs
2. Supabase performance metrics
3. External API rate limits (CourtListener, OpenAI)

**Solutions**:
1. Increase function timeout in netlify.toml (max 26s standard, 300s background)
2. Implement request queueing for long operations
3. Use background functions for data sync

### Security Issues

#### Issue: Secrets exposed in logs

**Action**:
1. Immediately rotate exposed secrets
2. Review GitHub Actions logs
3. Check Netlify build logs
4. Run security scan: `bash scripts/verify-build-security.sh`

#### Issue: CORS errors

**Cause**: Incorrect CORS headers

**Solution**: Already configured in `next.config.js` and `netlify.toml`:
```javascript
// next.config.js
headers: [
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: 'https://judgefinder.io' }
    ]
  }
]
```

---

## Additional Resources

### Documentation

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Netlify Next.js Plugin](https://github.com/netlify/netlify-plugin-nextjs)

### Internal Docs

- `/docs/DEPLOYMENT_CHECKLIST.md` - Pre-deployment checklist
- `/docs/NETLIFY_TROUBLESHOOTING.md` - Common Netlify issues
- `/docs/deployment/DEPLOYMENT_VERIFICATION.md` - Verification procedures
- `/.env.example` - Environment variable reference

### Support Contacts

- **Netlify Support**: https://www.netlify.com/support/
- **GitHub Support**: https://support.github.com/
- **Project Team**: [Your team contact info]

---

## Deployment Checklist

Use this checklist for each production deployment:

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Type checking clean (`npm run type-check`)
- [ ] Linting passing (`npm run lint`)
- [ ] Security scan clean (`bash scripts/verify-build-security.sh`)
- [ ] Database migrations prepared (if any)
- [ ] Environment variables verified
- [ ] Rollback plan identified

### During Deployment

- [ ] PR approved and merged
- [ ] GitHub Actions workflow started
- [ ] Build completes successfully
- [ ] Deployment to Netlify succeeds
- [ ] Post-deployment verification passes

### Post-Deployment

- [ ] Site loads correctly
- [ ] Critical pages accessible
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] No critical errors in Sentry
- [ ] Performance metrics acceptable
- [ ] Database migrations applied (if any)
- [ ] Team notified of deployment

### 24-Hour Monitoring

- [ ] Error rates normal in Sentry
- [ ] Response times acceptable in Netlify
- [ ] No user-reported issues
- [ ] Email system working (check logs)
- [ ] Scheduled jobs running (cron)

---

**Last Updated**: 2025-10-24

**Maintained By**: Deployment Team

**Next Review**: 2025-11-24
