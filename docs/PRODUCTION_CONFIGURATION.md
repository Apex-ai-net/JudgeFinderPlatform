# JudgeFinder Platform - Production Configuration Guide

Complete guide for configuring and deploying the JudgeFinder platform to production.

## Table of Contents

1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Deployment Process](#deployment-process)
5. [Monitoring & Observability](#monitoring--observability)
6. [Security Best Practices](#security-best-practices)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

## Overview

JudgeFinder is deployed on Netlify with the following architecture:

- **Frontend**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Cache/Rate Limiting**: Upstash Redis
- **CDN**: Netlify Edge Network
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics 4, PostHog

### Production URLs

- **Production**: `https://judgefinder.io`
- **Staging**: `https://staging.judgefinder.io` (if configured)
- **Deploy Previews**: `https://deploy-preview-{PR#}--{site-name}.netlify.app`

## Environment Variables

### Required Variables

These variables MUST be set for the application to function:

#### Database (Supabase)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get these:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Settings → API
4. Copy URL and keys

#### Authentication (Clerk)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_live_YOUR_SECRET_HERE
```

**Where to get these:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. API Keys
4. Use LIVE keys for production, TEST keys for development

#### External APIs

```bash
COURTLISTENER_API_KEY=YOUR_COURTLISTENER_API_KEY_HERE
```

**Where to get this:**
1. Register at [CourtListener](https://www.courtlistener.com)
2. Account → API Access
3. Generate new token

#### Cache & Rate Limiting (Upstash Redis)

```bash
UPSTASH_REDIS_REST_URL=https://YOUR_INSTANCE.upstash.io
UPSTASH_REDIS_REST_TOKEN=AYourTokenHere
```

**Where to get these:**
1. Go to [Upstash Console](https://console.upstash.com)
2. Create or select Redis database
3. REST API → Copy URL and Token

#### Security

```bash
SYNC_API_KEY=generate_random_32_char_string
CRON_SECRET=generate_random_32_char_string
```

**How to generate:**
```bash
openssl rand -base64 32
```

#### Site Configuration

```bash
NEXT_PUBLIC_SITE_URL=https://judgefinder.io
NEXT_PUBLIC_APP_URL=https://judgefinder.io
NODE_ENV=production
```

### Recommended Variables

These variables are strongly recommended for production:

#### Error Tracking (Sentry)

```bash
SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/YOUR_PROJECT_ID
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

**Setup:**
1. Create project at [Sentry.io](https://sentry.io)
2. Get DSN from Settings → Client Keys
3. Configure source maps for better error tracking

#### Payment Processing (Stripe)

```bash
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
```

**Setup:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Developers → API Keys
3. Use LIVE mode keys for production
4. Configure webhooks endpoint: `https://judgefinder.io/api/stripe/webhook`

#### AI Services

```bash
GOOGLE_AI_API_KEY=AIzaSyYOUR_KEY_HERE
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
```

**Setup:**
- Google AI: [Google AI Studio](https://makersuite.google.com/app/apikey)
- OpenAI: [OpenAI Platform](https://platform.openai.com/api-keys)

#### Analytics

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Optional Variables

#### Admin Configuration

```bash
ADMIN_USER_IDS=user_2abc123def,user_2xyz456ghi
```

Get user IDs from Clerk dashboard → Users

#### SEO Verification

```bash
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_verification_code
NEXT_PUBLIC_BING_SITE_VERIFICATION=your_verification_code
```

#### Feature Flags

```bash
ENABLE_BETA_FEATURES=false
DEBUG_MODE=false
MAINTENANCE_MODE=false
```

## Infrastructure Setup

### Netlify Configuration

#### 1. Create Netlify Site

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to existing site or create new
netlify link
```

#### 2. Configure Build Settings

In Netlify dashboard or `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "22"
  NPM_FLAGS = "--legacy-peer-deps"
```

#### 3. Set Environment Variables

In Netlify dashboard:
1. Site Settings → Environment Variables
2. Add all required variables
3. Mark sensitive variables as "Secret"

Or via CLI:
```bash
netlify env:set NEXT_PUBLIC_SUPABASE_URL "https://xxx.supabase.co"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJ..." --secret
```

#### 4. Configure Custom Domain

1. Site Settings → Domain Management
2. Add custom domain: `judgefinder.io`
3. Update DNS records (A/CNAME)
4. Enable HTTPS (automatic with Netlify)

### Supabase Setup

#### 1. Database Configuration

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Apply migrations
-- (Run your migration files)
```

#### 2. Row Level Security (RLS)

Ensure RLS policies are configured:

```sql
-- Example: Enable RLS on judges table
ALTER TABLE judges ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Judges are viewable by everyone"
  ON judges FOR SELECT
  USING (true);

-- Admin write access
CREATE POLICY "Admins can manage judges"
  ON judges FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

#### 3. Connection Pooling

Configure in Supabase dashboard:
- Database → Settings → Connection Pooling
- Enable transaction pooling
- Set max connections based on your plan

### DNS Configuration

Point your domain to Netlify:

#### Using Netlify DNS (Recommended)

1. Update nameservers to Netlify:
   ```
   dns1.p01.nsone.net
   dns2.p01.nsone.net
   dns3.p01.nsone.net
   dns4.p01.nsone.net
   ```

2. Configure records in Netlify dashboard

#### Using External DNS

Add these records:

```
Type  Name  Value
A     @     75.2.60.5
CNAME www   {site-name}.netlify.app
```

## Deployment Process

### 1. Pre-Deployment Checks

Run the deployment checklist:

```bash
# Verify environment variables
node -e "require('./lib/utils/env-validator').validateEnvironmentOnStartup()"

# Run tests
npm run test:ci

# Type checking
npm run type-check

# Linting
npm run lint
```

### 2. Deploy to Production

#### Via Git Push (Recommended)

```bash
git push origin main
```

Netlify will automatically build and deploy.

#### Via Netlify CLI

```bash
# Build locally
npm run build

# Deploy to production
netlify deploy --prod
```

### 3. Post-Deployment Verification

Run automated checks:

```bash
# Deployment verification script
DEPLOY_URL=https://judgefinder.io ./scripts/verify-deployment.sh

# Smoke tests
PROD_URL=https://judgefinder.io npx playwright test tests/smoke/production.spec.ts
```

Manual verification:
- [ ] Homepage loads
- [ ] Search works
- [ ] Authentication works
- [ ] No console errors

### 4. Deployment Notifications

Configure webhook for deployment notifications:

```bash
# In Netlify: Site Settings → Build & Deploy → Deploy notifications
# Add webhook: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Or use our notification script
DEPLOY_HOOK_URL=https://hooks.slack.com/... \
DEPLOY_NOTIFICATION_TYPE=slack \
ts-node scripts/notify-deployment.ts
```

## Monitoring & Observability

### Health Check Endpoint

```bash
curl https://judgefinder.io/api/health
```

Returns:
```json
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "healthy",
    "external_apis": "healthy"
  },
  "performance": {
    "responseTime": 123,
    "databaseLatency": 45,
    "redisLatency": 12
  }
}
```

### Monitoring Dashboard

Access the admin dashboard:
```
https://judgefinder.io/admin/deployments
```

Features:
- Real-time health status
- Environment variable summary
- Performance metrics
- Quick links to external dashboards

### Sentry Error Tracking

Configure Sentry alerts:
1. Project Settings → Alerts
2. Create alert for high error rates
3. Set notification channels (email, Slack)

Monitor errors:
```
https://sentry.io/organizations/{org}/issues/
```

### Analytics

- **Google Analytics**: [GA Dashboard](https://analytics.google.com)
- **PostHog**: [PostHog Dashboard](https://app.posthog.com)

Key metrics to monitor:
- Page load time
- Search usage
- User engagement
- Error rates
- API latency

### Uptime Monitoring

Configure external uptime monitoring:

**Option 1: UptimeRobot**
- Monitor: `https://judgefinder.io/api/health`
- Interval: 5 minutes
- Alert: email/SMS on downtime

**Option 2: Pingdom**
- Create HTTP check
- Monitor health endpoint
- Set alert thresholds

## Security Best Practices

### 1. Environment Variables

- ✓ Never commit secrets to git
- ✓ Use different keys for dev/prod
- ✓ Rotate secrets regularly (quarterly)
- ✓ Mark sensitive vars as "Secret" in Netlify
- ✓ Use strong random values for API keys

### 2. API Security

- ✓ Rate limiting enabled (via Upstash)
- ✓ CORS configured correctly
- ✓ Authentication required for sensitive endpoints
- ✓ Input validation on all endpoints
- ✓ SQL injection prevention (use Supabase client)

### 3. Database Security

- ✓ Row Level Security (RLS) enabled
- ✓ Service role key server-side only
- ✓ Regular backups configured
- ✓ Connection pooling enabled
- ✓ SSL connections enforced

### 4. Security Headers

Configured in `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

### 5. SSL/TLS

- ✓ HTTPS enforced
- ✓ TLS 1.2+ required
- ✓ Auto-renewing certificates (Netlify)
- ✓ HSTS enabled

## Performance Optimization

### 1. Caching Strategy

- **Static Assets**: 1 year cache (CDN)
- **API Responses**: Varies by endpoint
- **Database Queries**: Redis cache for expensive queries
- **Images**: Optimized with Next.js Image component

### 2. Database Optimization

```sql
-- Add indices for common queries
CREATE INDEX idx_judges_name ON judges(name);
CREATE INDEX idx_courts_slug ON courts(slug);
CREATE INDEX idx_cases_judge_id ON cases(judge_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM judges WHERE name ILIKE '%smith%';
```

### 3. Bundle Optimization

- Code splitting via Next.js dynamic imports
- Tree shaking enabled
- Minification in production
- Source maps for error tracking (not served to clients)

### 4. CDN Configuration

Netlify Edge Network provides:
- Global CDN
- Edge functions
- Automatic image optimization
- Gzip/Brotli compression

### 5. Performance Budget

Target metrics:
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Total Bundle Size: < 300KB (gzipped)

Monitor with Lighthouse CI in GitHub Actions.

## Troubleshooting

### Build Failures

**Problem**: Build fails on Netlify

**Solutions**:
1. Check build logs in Netlify dashboard
2. Verify Node version matches local (22)
3. Clear cache and retry: Site Settings → Build & Deploy → Clear cache
4. Check for missing environment variables

### Database Connection Issues

**Problem**: Can't connect to Supabase

**Solutions**:
1. Verify credentials are correct
2. Check Supabase project is not paused
3. Verify connection pooling configured
4. Check IP allowlist (if configured)
5. Test connection: `curl https://YOUR_PROJECT.supabase.co/rest/v1/`

### High Memory Usage

**Problem**: Functions timing out or memory errors

**Solutions**:
1. Check `/api/health` for memory metrics
2. Reduce concurrent operations
3. Implement pagination for large queries
4. Add database indices
5. Use connection pooling

### Rate Limiting Issues

**Problem**: 429 errors from CourtListener

**Solutions**:
1. Verify API key is valid
2. Check rate limit configuration:
   ```bash
   COURTLISTENER_REQUEST_DELAY_MS=1000
   COURTLISTENER_MAX_RETRIES=5
   ```
3. Implement exponential backoff
4. Cache responses when possible

### Authentication Errors

**Problem**: Clerk authentication not working

**Solutions**:
1. Verify publishable key matches environment
2. Check Clerk dashboard for API status
3. Verify redirect URLs configured
4. Clear browser cookies and try again
5. Check for CORS issues in console

## Deployment Rollback

If issues occur after deployment:

### 1. Instant Rollback via Netlify

1. Go to Netlify dashboard
2. Deploys tab
3. Find last working deploy
4. Click "Publish deploy"

### 2. Git Revert

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin main --force
```

### 3. Database Rollback

If database migration issues:

```bash
# Using Supabase CLI
supabase db reset --db-url "postgresql://..."

# Or run down migrations
psql $DATABASE_URL < migrations/down.sql
```

## Maintenance Windows

Schedule maintenance during low-traffic periods:

1. Enable maintenance mode:
   ```bash
   netlify env:set MAINTENANCE_MODE true
   ```

2. Redeploy to apply

3. Perform maintenance tasks

4. Disable maintenance mode:
   ```bash
   netlify env:set MAINTENANCE_MODE false
   ```

5. Redeploy

## Support & Resources

### Documentation

- [Next.js Docs](https://nextjs.org/docs)
- [Netlify Docs](https://docs.netlify.com)
- [Supabase Docs](https://supabase.com/docs)
- [Clerk Docs](https://clerk.com/docs)

### Internal Resources

- Deployment Checklist: `docs/DEPLOYMENT_CHECKLIST.md`
- Environment Variables: `.env.example`
- Monitoring Dashboard: `/admin/deployments`

### Emergency Contacts

- **On-Call Engineer**: [contact info]
- **DevOps Team**: [contact info]
- **Technical Lead**: [contact info]

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-08
**Maintained By**: DevOps Team
**Next Review**: 2025-11-08
