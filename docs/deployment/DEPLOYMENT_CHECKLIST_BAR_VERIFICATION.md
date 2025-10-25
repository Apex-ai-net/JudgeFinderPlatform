# Deployment Checklist - Bar Verification & API Optimizations

## Pre-Deployment

### 1. Code Review

- [ ] Review all modified files for correctness
- [ ] Verify no sensitive data in code
- [ ] Check error handling is comprehensive
- [ ] Confirm logging is appropriate (no PII)

### 2. Database Migration Review

```bash
# Review migration file
cat supabase/migrations/20251024_001_bar_verifications_table.sql

# Verify migration is idempotent (safe to re-run)
# Check for IF NOT EXISTS clauses
```

### 3. Environment Variables

Verify these are set in production (Netlify):

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`

No new environment variables required for this deployment.

## Deployment Steps

### Step 1: Apply Database Migration

```bash
# Option A: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste contents of 20251024_001_bar_verifications_table.sql
# 3. Run query
# 4. Verify table created: SELECT * FROM bar_verifications LIMIT 1;

# Option B: Via Supabase CLI (if configured)
supabase db push --linked

# Option C: Via psql
psql $DATABASE_URL < supabase/migrations/20251024_001_bar_verifications_table.sql
```

**Verify Migration:**

```sql
-- Check table exists
\d bar_verifications

-- Check indexes exist
\di bar_verifications*

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'bar_verifications';

-- Expected: rowsecurity = true
```

### Step 2: Deploy Code Changes

**Via Git:**

```bash
# Commit changes
git add .
git commit -m "feat: add bar verification system and API optimizations

- Implement attorney bar verification with admin approval workflow
- Add bar_verifications table for audit trail
- Optimize courts API caching (80%+ hit rate expected)
- Implement search ranking recency scoring
- Add organization usage tracking (seats & API calls)
- Create comprehensive documentation

Resolves TODOs in verify-bar route, courts API, ranking engine, and billing"

# Push to main (triggers Netlify build)
git push origin main
```

**Monitor Netlify Build:**

1. Go to Netlify dashboard
2. Watch build logs for errors
3. Verify deployment preview looks correct
4. If successful, deployment auto-goes live

### Step 3: Post-Deployment Verification

**Immediate Checks (< 5 min):**

```bash
# 1. Verify API is responding
curl https://judgefinder.io/api/courts | jq '.total_count'

# 2. Check cache headers
curl -I https://judgefinder.io/api/courts?jurisdiction=CA | grep -i cache

# Expected:
# Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
# Vary: Accept-Encoding, Accept-Language
# Cache-Tag: courts,jurisdiction:CA

# 3. Test bar verification endpoint (will fail without auth - expected)
curl -X POST https://judgefinder.io/api/advertising/verify-bar \
  -H "Content-Type: application/json" \
  -d '{"barNumber": "123456", "barState": "CA"}'

# Expected: {"error":"Authentication required. Please sign in first."}
```

**Functional Tests (< 15 min):**

1. **Test Bar Verification Submission (as logged-in user)**
   - Go to advertising page
   - Submit test bar number
   - Verify success message
   - Check database for verification record

2. **Test Admin Listing (as admin user)**
   - Navigate to admin dashboard
   - Access bar verifications section
   - Verify pending verifications show up

3. **Test Admin Approval (as admin user)**
   - Select pending verification
   - Approve with notes
   - Verify user role changes to 'advertiser'
   - Check user can access advertising features

4. **Test Caching Performance**

   ```bash
   # First request (uncached)
   time curl https://judgefinder.io/api/courts?jurisdiction=CA > /dev/null
   # Note: Response time

   # Second request (cached)
   time curl https://judgefinder.io/api/courts?jurisdiction=CA > /dev/null
   # Note: Should be much faster (60-80% improvement)
   ```

### Step 4: Monitor for Issues

**First Hour:**

- [ ] Check Sentry for errors (https://sentry.io)
- [ ] Monitor Netlify function logs
- [ ] Check Supabase database performance
- [ ] Verify cache hit rate in analytics

**First Day:**

- [ ] Review all API endpoint performance
- [ ] Check for any user-reported issues
- [ ] Verify bar verification workflow works end-to-end
- [ ] Monitor database query performance

**First Week:**

- [ ] Track bar verification submission rate
- [ ] Monitor approval workflow efficiency
- [ ] Analyze cache performance metrics
- [ ] Review search ranking quality

## Rollback Procedures

### If Critical Bug Found:

**Option 1: Revert Deployment (Quick)**

```bash
# In Netlify dashboard
# 1. Go to Deploys
# 2. Find previous working deployment
# 3. Click "Publish deploy"
# Takes ~2 minutes
```

**Option 2: Revert Specific Changes**

```bash
# Disable bar verification endpoint
# Add to app/api/advertising/verify-bar/route.ts:
return NextResponse.json(
  { error: 'Service temporarily unavailable' },
  { status: 503 }
)

# Revert caching changes
# app/api/courts/route.ts - restore old headers:
response.headers.set('Cache-Control', 'no-cache, no-store')

# Deploy fix
git add .
git commit -m "hotfix: temporarily disable bar verification"
git push origin main
```

**Option 3: Revert Migration (Database)**

```sql
-- Only if table causes issues
DROP TABLE IF EXISTS bar_verifications;

-- Restore from backup if needed
-- (Should not be necessary - table is additive only)
```

## Success Criteria

After 24 hours, verify:

- [ ] Zero critical errors in Sentry
- [ ] Bar verification flow works (at least 1 successful submission)
- [ ] Cache hit rate > 50% (target: 80%)
- [ ] API response times improved (check monitoring)
- [ ] No performance regressions on other endpoints
- [ ] Admin can view and approve verifications
- [ ] User roles update correctly on approval
- [ ] Database queries performing well (< 100ms)

## Communication Plan

**Internal Team:**

- [ ] Notify team of deployment completion
- [ ] Share admin dashboard access for bar verifications
- [ ] Provide training on approval workflow
- [ ] Set up on-call rotation for support

**Users:**

- [ ] No announcement needed (feature opt-in)
- [ ] Bar verification available for attorneys wanting to advertise
- [ ] Support docs available at `/docs/BAR_VERIFICATION.md`

**Stakeholders:**

- [ ] Report on deployment success
- [ ] Share performance improvement metrics
- [ ] Timeline for Phase 2 (automated verification)

## Known Issues & Mitigations

### Issue 1: Manual Verification Only

**Impact:** Admin workload for each verification
**Mitigation:** Clear 24-48 hour SLA, efficient admin UI (future)
**Long-term:** Automated State Bar API integration (Phase 2)

### Issue 2: Email Notifications Not Implemented

**Impact:** Users must check dashboard for status
**Mitigation:** In-app notifications, status page
**Long-term:** Implement email service (Resend/SendGrid)

### Issue 3: No Admin Dashboard UI Yet

**Impact:** Must use API directly or database queries
**Mitigation:** API is fully functional, can build UI later
**Long-term:** Admin dashboard page (1-2 days work)

## Performance Monitoring Queries

```sql
-- Bar verification metrics
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'verified') as verified,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  AVG(EXTRACT(EPOCH FROM (verified_at - submitted_at)) / 3600)::numeric(10,2) as avg_review_hours
FROM bar_verifications
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Cache performance (from analytics if available)
SELECT
  endpoint,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE cache_hit = true) as cache_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cache_hit = true) / COUNT(*), 2) as hit_rate,
  AVG(response_time_ms)::numeric(10,2) as avg_response_time
FROM api_analytics
WHERE endpoint = '/api/courts'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint;
```

## Emergency Contacts

- **Technical Lead:** [Add name/contact]
- **Database Admin:** [Add name/contact]
- **Product Manager:** [Add name/contact]
- **On-Call Engineer:** [Add rotation schedule]

## Documentation Links

- Implementation Summary: `/docs/implementation/BAR_VERIFICATION_IMPLEMENTATION_SUMMARY.md`
- Bar Verification Docs: `/docs/BAR_VERIFICATION.md`
- Caching Strategy: `/docs/CACHING_STRATEGY.md`
- Testing Guide: `/docs/TESTING_BAR_VERIFICATION.md`

## Post-Deployment Tasks

**Immediate (Day 1):**

- [ ] Run complete test suite from testing guide
- [ ] Monitor error rates and performance
- [ ] Document any issues or surprises

**Short-term (Week 1):**

- [ ] Build admin dashboard UI for bar verifications
- [ ] Implement email notifications
- [ ] Set up monitoring alerts
- [ ] Create user FAQ for bar verification

**Medium-term (Month 1):**

- [ ] Analyze bar verification metrics
- [ ] Optimize admin workflow based on feedback
- [ ] Plan Phase 2 automated verification
- [ ] Implement cache warming for popular queries

**Long-term (Quarter 1):**

- [ ] State Bar API integration (if available)
- [ ] Multi-state support
- [ ] Advanced analytics dashboard
- [ ] Document upload for manual cases

---

**Deployment Sign-off:**

- [ ] Code reviewed and approved
- [ ] Database migration tested
- [ ] Deployment plan reviewed
- [ ] Rollback plan understood
- [ ] Monitoring configured
- [ ] Team trained

**Deployed by:** **\*\*\*\***\_**\*\*\*\***
**Date:** **\*\*\*\***\_**\*\*\*\***
**Deployment Status:** ☐ Success ☐ Issues ☐ Rolled Back
**Notes:** **********\*\*\*\***********\_**********\*\*\*\***********
