# JudgeFinder Platform - Deployment Checklist

A comprehensive checklist to ensure safe and successful production deployments.

## Pre-Deployment Checklist

### 1. Code Quality & Testing

- [ ] All tests passing (`npm test`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Smoke tests run successfully (`npx playwright test tests/smoke/production.spec.ts`)
- [ ] No critical console errors or warnings
- [ ] Code reviewed and approved (if using PRs)

### 2. Environment Variables

- [ ] All required environment variables configured in Netlify
- [ ] Environment validator passes (`node -e "require('./lib/utils/env-validator').validateEnvironmentOnStartup()"`)
- [ ] No test/development keys in production environment
  - [ ] `STRIPE_SECRET_KEY` uses `sk_live_` prefix (not `sk_test_`)
  - [ ] `CLERK_SECRET_KEY` is production key (not test)
  - [ ] `NEXT_PUBLIC_SITE_URL` points to production domain
- [ ] API keys have sufficient rate limits for production traffic
- [ ] Redis/Upstash credentials are production-ready

### 3. Database & Data

- [ ] Database migrations applied and tested
- [ ] Database backup created
- [ ] Connection pooling configured properly
- [ ] Row-level security (RLS) policies verified
- [ ] Database indices optimized
- [ ] No orphaned or invalid data relationships

### 4. Security

- [ ] All secrets rotated (if compromised)
- [ ] API authentication working correctly
- [ ] Rate limiting configured and tested
- [ ] CORS policies configured correctly
- [ ] Security headers verified (run `curl -I https://judgefinder.io`)
- [ ] SSL certificate valid and not expiring soon
- [ ] No sensitive data exposed in client-side code
- [ ] Admin access restricted to authorized users only

### 5. Third-Party Services

- [ ] Supabase connection verified
- [ ] Clerk authentication working
- [ ] CourtListener API accessible with valid key
- [ ] Stripe webhooks configured (if using payments)
- [ ] Sentry error tracking configured and tested
- [ ] Analytics tracking working (Google Analytics, PostHog)
- [ ] Email service configured (if applicable)

### 6. Performance & Monitoring

- [ ] Lighthouse score > 90 for key pages
- [ ] Core Web Vitals within acceptable ranges
  - [ ] LCP (Largest Contentful Paint) < 2.5s
  - [ ] FID (First Input Delay) < 100ms
  - [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] API response times < 500ms for critical endpoints
- [ ] Database query performance optimized
- [ ] Caching configured correctly
- [ ] CDN working properly
- [ ] Monitoring dashboards accessible

### 7. SEO & Content

- [ ] Sitemap.xml accessible and up-to-date
- [ ] Robots.txt configured correctly
- [ ] Meta tags present on all pages
- [ ] Canonical URLs set correctly
- [ ] Open Graph tags configured
- [ ] Twitter Card tags configured
- [ ] Structured data (JSON-LD) implemented
- [ ] 404 page working correctly
- [ ] Legal documents accessible:
  - [ ] Terms of Service
  - [ ] Privacy Policy
  - [ ] Cookie Policy (if applicable)

### 8. DNS & Infrastructure

- [ ] DNS records configured correctly
- [ ] Domain pointing to Netlify
- [ ] SSL certificate provisioned
- [ ] Redirects working (www to non-www, or vice versa)
- [ ] Old URLs redirecting to new structure (if applicable)
- [ ] Custom domain verified in Netlify

### 9. Feature Verification

- [ ] Homepage loads correctly
- [ ] Search functionality working
- [ ] Judge profiles displaying correctly
- [ ] Court pages loading
- [ ] User authentication flows working
- [ ] Ad display system functional (if applicable)
- [ ] Forms submitting correctly
- [ ] Analytics tracking events

### 10. Deployment Configuration

- [ ] Netlify build settings verified
- [ ] Environment variables set in Netlify dashboard
- [ ] Build command correct: `npm run build`
- [ ] Publish directory correct: `.next`
- [ ] Node version matches production: `22`
- [ ] Deploy notifications configured
- [ ] Branch deploy rules set correctly

## Deployment Process

### Before Deploying

1. **Create a backup**
   ```bash
   # Backup database
   # (Use your Supabase dashboard or CLI to create a backup)
   ```

2. **Run pre-deployment tests**
   ```bash
   npm run test
   npm run type-check
   npm run lint
   ```

3. **Verify environment variables**
   ```bash
   node -e "require('./lib/utils/env-validator').validateEnvironmentOnStartup()"
   ```

4. **Review changes**
   ```bash
   git log --oneline main..HEAD
   git diff main
   ```

### During Deployment

1. **Deploy to production**
   ```bash
   git push origin main
   # Or use Netlify CLI: netlify deploy --prod
   ```

2. **Monitor build logs**
   - Watch Netlify dashboard for build progress
   - Check for any build errors or warnings

3. **Wait for deployment to complete**
   - Netlify will provide a deploy URL
   - Verify build completed successfully

### After Deployment

1. **Run deployment verification**
   ```bash
   DEPLOY_URL=https://judgefinder.io ./scripts/verify-deployment.sh
   ```

2. **Manual smoke testing**
   - [ ] Visit homepage
   - [ ] Perform a search
   - [ ] View a judge profile
   - [ ] Check court listings
   - [ ] Test authentication (sign in/out)
   - [ ] Verify mobile responsiveness

3. **Check monitoring tools**
   - [ ] Sentry: No new errors
   - [ ] Google Analytics: Tracking events
   - [ ] Server logs: No critical errors
   - [ ] Health check endpoint: Returns healthy

4. **Verify performance**
   ```bash
   curl -o /dev/null -s -w "Response time: %{time_total}s\n" https://judgefinder.io/api/health
   ```

5. **Run production smoke tests**
   ```bash
   PROD_URL=https://judgefinder.io npx playwright test tests/smoke/production.spec.ts
   ```

## Post-Deployment Monitoring

### First Hour

- [ ] Monitor error rates in Sentry
- [ ] Check server response times
- [ ] Verify user traffic is flowing normally
- [ ] Watch for any spike in errors
- [ ] Check database connection pool
- [ ] Monitor memory usage

### First 24 Hours

- [ ] Review analytics for traffic patterns
- [ ] Check for any user-reported issues
- [ ] Monitor API rate limits
- [ ] Verify scheduled jobs running correctly
- [ ] Review server logs for anomalies

### First Week

- [ ] Analyze performance metrics
- [ ] Review user feedback
- [ ] Check for any edge cases or bugs
- [ ] Verify all integrations working smoothly

## Rollback Procedure

If critical issues are detected after deployment:

1. **Immediate rollback via Netlify**
   - Go to Netlify dashboard → Deploys
   - Find the previous working deploy
   - Click "Publish deploy" to rollback

2. **Investigate the issue**
   - Check Sentry for error details
   - Review server logs
   - Reproduce the issue locally

3. **Fix and redeploy**
   - Create a hotfix branch
   - Fix the issue
   - Test thoroughly
   - Deploy again following this checklist

## Emergency Contacts

- **Technical Lead**: [Name/Contact]
- **DevOps**: [Name/Contact]
- **On-Call Engineer**: [Name/Contact]

## Useful Commands

```bash
# Verify environment variables
node -e "require('./lib/utils/env-validator').validateEnvironmentOnStartup()"

# Run deployment verification
DEPLOY_URL=https://judgefinder.io ./scripts/verify-deployment.sh

# Run smoke tests
PROD_URL=https://judgefinder.io npx playwright test tests/smoke/production.spec.ts

# Check health endpoint
curl https://judgefinder.io/api/health | jq

# View recent logs (Netlify CLI)
netlify logs:function api/health

# Check site performance
curl -o /dev/null -s -w "Total: %{time_total}s\n" https://judgefinder.io
```

## Notes

- Always deploy during low-traffic hours if possible
- Have a rollback plan ready
- Communicate deployment schedule to team
- Document any issues encountered
- Update this checklist with lessons learned

---

**Last Updated**: 2025-10-08
**Maintained By**: DevOps Team
