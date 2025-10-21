# Authentication & Bot Protection Deployment Guide

## Overview

This guide covers the deployment of the authentication system, Cloudflare Turnstile bot protection, tiered rate limiting, and law professional verification system implemented on **2025-10-20**.

### Features Implemented

1. **Cloudflare Turnstile Integration** - Bot protection for sensitive features
2. **AI Chatbox Authentication** - Require sign-in to use AI assistant
3. **Tiered Rate Limiting** - Different limits for anonymous vs authenticated users
4. **Law Professional Verification** - Bar number validation system
5. **User Roles System** - user, advertiser, admin roles with automatic promotion

### Files Changed

**New Files (5):**
- `lib/auth/turnstile.ts`
- `components/auth/TurnstileWidget.tsx`
- `app/advertise/onboarding/page.tsx`
- `app/api/advertising/verify-bar/route.ts`
- `supabase/migrations/20251020_173114_add_user_roles_and_verification.sql`

**Modified Files (8):**
- `.env.example`
- `app/advertise/page.tsx`
- `app/api/chat/route.ts`
- `app/api/judges/search/route.ts`
- `components/chat/AILegalAssistant.tsx`
- `middleware.ts`
- `package.json`
- `package-lock.json`

---

## Step-by-Step Deployment

### Step 1: Database Migration

#### 1.1 Review the Migration

The migration file adds the following to the `users` table:
- `user_role` (TEXT, default 'user') - User role: user, advertiser, admin
- `bar_number` (TEXT, nullable) - State bar registration number
- `bar_state` (TEXT, nullable) - State where bar number is registered
- `bar_verified_at` (TIMESTAMPTZ, nullable) - Verification timestamp
- `verification_status` (TEXT, default 'none') - none, pending, verified, rejected

It also creates:
- Check constraints for enum validation
- Indexes for performance
- Trigger to automatically promote users to 'advertiser' when verified

#### 1.2 Apply Migration to Supabase

**Option A: Using Supabase CLI (Recommended)**

```bash
# Make sure you're in the project directory
cd /Users/tanner-osterkamp/JudgeFinderPlatform

# Link to your Supabase project (if not already linked)
supabase link --project-ref <your-project-ref>

# Push the migration
supabase db push
```

**Option B: Using Supabase Dashboard**

1. Go to https://app.supabase.com/project/<your-project-id>/sql
2. Open the migration file: `supabase/migrations/20251020_173114_add_user_roles_and_verification.sql`
3. Copy the entire SQL content
4. Paste into the SQL editor
5. Click "Run" to execute

#### 1.3 Verify Migration Success

Execute these SQL queries in Supabase SQL Editor to verify:

```sql
-- 1. Check new columns exist
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('user_role', 'bar_number', 'bar_state', 'bar_verified_at', 'verification_status')
ORDER BY column_name;
-- Expected: 5 rows returned

-- 2. Check constraints exist
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
  AND constraint_name IN ('users_user_role_check', 'users_verification_status_check');
-- Expected: 2 rows (CHECK constraints)

-- 3. Check indexes created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'users'
  AND indexname IN ('idx_users_user_role', 'idx_users_bar_number');
-- Expected: 2 rows

-- 4. Verify trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name = 'trigger_set_advertiser_role';
-- Expected: 1 row (BEFORE UPDATE trigger)

-- 5. Check function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'set_advertiser_role_on_verification';
-- Expected: 1 row
```

#### 1.4 Test the Trigger

```sql
-- Create a test user (use a fake clerk_id)
INSERT INTO users (clerk_id, email, user_role, verification_status)
VALUES ('test_trigger_123', 'test@example.com', 'user', 'none')
ON CONFLICT (clerk_id) DO UPDATE SET user_role = 'user', verification_status = 'none';

-- Verify initial state
SELECT clerk_id, user_role, verification_status
FROM users
WHERE clerk_id = 'test_trigger_123';
-- Expected: user_role = 'user', verification_status = 'none'

-- Simulate bar verification
UPDATE users
SET
  bar_number = 'TEST123456',
  bar_state = 'CA',
  verification_status = 'verified',
  bar_verified_at = NOW()
WHERE clerk_id = 'test_trigger_123';

-- Check if trigger automatically set role to 'advertiser'
SELECT clerk_id, user_role, verification_status, bar_number
FROM users
WHERE clerk_id = 'test_trigger_123';
-- Expected: user_role = 'advertiser', verification_status = 'verified'

-- Clean up test data
DELETE FROM users WHERE clerk_id = 'test_trigger_123';
```

**✅ Migration Complete** if all queries return expected results.

---

### Step 2: Configure Cloudflare Turnstile

#### 2.1 Create Turnstile Site

1. Go to https://dash.cloudflare.com/
2. Select your account
3. Navigate to **Turnstile** in the left sidebar
4. Click **Add Site**
5. Configure:
   - **Site name:** JudgeFinder Production
   - **Domain:** judgefinder.io (or your domain)
   - **Widget Mode:** Managed
   - **Widget Appearance:** Light (or auto)
6. Click **Create**
7. Copy the keys:
   - **Site Key** (starts with `0x`) - Public, safe for client-side
   - **Secret Key** (starts with `0x`) - Private, server-side only

#### 2.2 Test Keys for Development

For local development, use Cloudflare's official test keys:

```bash
# Always passes verification
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA

# Always fails verification (for testing error handling)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=2x00000000000000000000AB
TURNSTILE_SECRET_KEY=2x0000000000000000000000000000000AB
```

---

### Step 3: Configure Environment Variables

#### 3.1 Local Development (.env.local)

Update your `.env.local` file:

```bash
# Add these new variables
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

#### 3.2 Production (Netlify)

**Using Netlify CLI:**

```bash
# Navigate to project directory
cd /Users/tanner-osterkamp/JudgeFinderPlatform

# Set Turnstile keys (use your real production keys)
netlify env:set NEXT_PUBLIC_TURNSTILE_SITE_KEY "0xYourRealSiteKey"
netlify env:set TURNSTILE_SECRET_KEY "0xYourRealSecretKey"

# Verify all required environment variables are set
netlify env:list

# Check these critical variables exist:
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - CLERK_SECRET_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - UPSTASH_REDIS_REST_URL (for rate limiting)
# - UPSTASH_REDIS_REST_TOKEN (for rate limiting)
# - NEXT_PUBLIC_TURNSTILE_SITE_KEY (NEW)
# - TURNSTILE_SECRET_KEY (NEW)
```

**Using Netlify Dashboard:**

1. Go to https://app.netlify.com/sites/<your-site>/configuration/env
2. Click **Add a variable**
3. Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` with your site key
4. Add `TURNSTILE_SECRET_KEY` with your secret key
5. Click **Save**

#### 3.3 Verify Environment Configuration

```bash
# Test locally that env vars are loaded
npm run validate:env

# If validation passes, you're good to go!
```

---

### Step 4: Local Testing

Before deploying to production, test locally:

#### 4.1 Start Development Server

```bash
npm run dev
```

#### 4.2 Test Checklist

**AI Chat Authentication:**
- [ ] Visit http://localhost:3000/judges
- [ ] Scroll to AI chat widget (unauthenticated)
- [ ] Verify "Sign In Required" message appears
- [ ] Click "Sign In to Continue"
- [ ] Sign in with Clerk
- [ ] Return to /judges page
- [ ] AI chat should now be accessible
- [ ] Type a message (don't send yet)
- [ ] First message triggers Turnstile CAPTCHA
- [ ] Complete CAPTCHA
- [ ] Message sends successfully
- [ ] Try sending 20+ messages in an hour
- [ ] 21st message should hit rate limit (429 error)

**Judge Search Rate Limiting:**
- [ ] Open incognito/private browsing
- [ ] Visit http://localhost:3000/judges
- [ ] Perform 10 searches (hit the search button)
- [ ] 11th search should show rate limit error
- [ ] Sign in
- [ ] Should now have 100 searches/hour limit
- [ ] Perform several searches - should work

**Advertiser Onboarding:**
- [ ] Visit http://localhost:3000/advertise/onboarding (unauthenticated)
- [ ] Should redirect to sign-in
- [ ] Sign in and return
- [ ] Form should be visible
- [ ] Select "California" state
- [ ] Enter bar number "123456"
- [ ] Turnstile CAPTCHA should appear
- [ ] Complete CAPTCHA
- [ ] Click "Verify Bar Number"
- [ ] Should see success message
- [ ] Check Supabase users table - user_role should be 'advertiser'

**Middleware Protection:**
- [ ] Visit http://localhost:3000/api/chat directly (unauthenticated)
- [ ] Should return 401 Unauthorized

---

### Step 5: Build and Deploy

#### 5.1 Pre-Deployment Checks

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check

# Build locally to catch any build errors
npm run build

# If build succeeds, test the production build
npm start

# Visit http://localhost:3000 and smoke test
```

#### 5.2 Commit Changes

```bash
# Review all changes
git status
git diff

# Stage all files
git add .

# Commit with descriptive message
git commit -m "feat(auth): implement authentication and bot protection system

- Add Cloudflare Turnstile CAPTCHA integration for bot protection
- Require authentication for AI chatbox (prevents abuse)
- Implement tiered rate limiting:
  - Anonymous users: 10 searches/day
  - Authenticated users: 100 searches/hour, 20 chat messages/hour
- Add law professional verification system with bar number validation
- Create user roles system (user, advertiser, admin)
- Add advertiser onboarding flow with verification
- Protect sensitive routes with middleware
- Add database migration for user roles and verification columns
- Add @marsidev/react-turnstile package dependency

Technical Changes:
- New: lib/auth/turnstile.ts - Turnstile verification utilities
- New: components/auth/TurnstileWidget.tsx - Reusable CAPTCHA component
- New: app/advertise/onboarding/page.tsx - Advertiser onboarding UI
- New: app/api/advertising/verify-bar/route.ts - Bar verification endpoint
- New: supabase/migrations/20251020_173114_add_user_roles_and_verification.sql
- Modified: app/api/chat/route.ts - Added auth check + rate limiting
- Modified: app/api/judges/search/route.ts - Added tiered rate limits
- Modified: components/chat/AILegalAssistant.tsx - Auth gate + Turnstile
- Modified: middleware.ts - Protect /api/chat route

Database Changes:
- Add user_role column (user|advertiser|admin)
- Add bar_number, bar_state, bar_verified_at columns
- Add verification_status column (none|pending|verified|rejected)
- Add automatic role promotion trigger

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### 5.3 Push to GitHub

```bash
# Push to main branch
git push origin main

# Verify commit on GitHub
# Visit: https://github.com/<your-username>/<repo>/commits/main
```

#### 5.4 Monitor Netlify Deployment

```bash
# Watch deployment in terminal
netlify watch

# Or monitor in Netlify Dashboard:
# https://app.netlify.com/sites/<your-site>/deploys
```

The deployment should:
1. Detect new commit on main branch
2. Start build process
3. Run `npm run build:netlify`
4. Deploy to production
5. Provide deploy URL

**Expected Build Time:** 3-5 minutes

---

### Step 6: Post-Deployment Verification

#### 6.1 Immediate Checks (First 5 Minutes)

```bash
# Check deployment status
netlify status

# Verify site is live
curl -I https://judgefinder.io
# Expected: HTTP/2 200

# Check health endpoint (if you have one)
curl https://judgefinder.io/api/health
# Expected: {"status": "healthy"}
```

#### 6.2 Functional Testing on Production

**Test Suite:**

1. **AI Chat - Unauthenticated:**
   - [ ] Visit https://judgefinder.io/judges
   - [ ] Scroll to AI chat
   - [ ] See "Sign In Required" message
   - [ ] Click "Sign In"
   - [ ] Complete sign-in flow

2. **AI Chat - Authenticated:**
   - [ ] Return to /judges
   - [ ] AI chat should be accessible
   - [ ] Type a message
   - [ ] Turnstile CAPTCHA appears
   - [ ] Complete CAPTCHA
   - [ ] Message sends successfully
   - [ ] Receive AI response

3. **Rate Limiting - Anonymous:**
   - [ ] Open incognito browser
   - [ ] Visit https://judgefinder.io/judges
   - [ ] Perform 10 searches
   - [ ] 11th search shows rate limit error

4. **Rate Limiting - Authenticated:**
   - [ ] Sign in
   - [ ] Should have 100 searches/hour
   - [ ] Perform multiple searches successfully

5. **Advertiser Onboarding:**
   - [ ] Visit https://judgefinder.io/advertise/onboarding
   - [ ] Sign in if prompted
   - [ ] Fill out form
   - [ ] Complete Turnstile
   - [ ] Submit bar verification
   - [ ] Success message appears
   - [ ] Check Supabase: user_role = 'advertiser'

#### 6.3 Database Verification

```sql
-- Check that existing users still work
SELECT clerk_id, email, user_role, verification_status
FROM users
LIMIT 5;
-- Expected: All users should have user_role = 'user' (default)

-- Check for any errors in the trigger
SELECT clerk_id, user_role, verification_status, bar_verified_at
FROM users
WHERE verification_status = 'verified';
-- Expected: All verified users should have user_role = 'advertiser'

-- Monitor for new verifications
SELECT
  clerk_id,
  email,
  user_role,
  bar_number,
  bar_state,
  verification_status,
  bar_verified_at
FROM users
WHERE bar_verified_at > NOW() - INTERVAL '1 hour'
ORDER BY bar_verified_at DESC;
```

#### 6.4 Error Monitoring

1. **Check Sentry for errors:**
   - Go to https://sentry.io/organizations/<your-org>/issues/
   - Filter by "Last 1 hour"
   - Look for any new errors related to:
     - Turnstile verification failures
     - Rate limiting errors
     - Database migration issues

2. **Check Netlify Function Logs:**
   ```bash
   netlify logs:function api-chat
   netlify logs:function api-judges-search
   ```

3. **Monitor Upstash Redis:**
   - Check rate limit keys are being created
   - Verify TTL is set correctly on rate limit entries

---

### Step 7: Rollback Plan (If Needed)

If critical issues are detected:

#### Option 1: Rollback via Netlify Dashboard

1. Go to https://app.netlify.com/sites/<your-site>/deploys
2. Find the previous working deploy
3. Click the "Publish deploy" button
4. Site will revert to previous version in ~30 seconds

#### Option 2: Git Revert

```bash
# Revert the commit
git revert HEAD

# Push to trigger new deployment
git push origin main
```

#### Option 3: Disable Features

```bash
# Temporarily disable Turnstile
netlify env:unset NEXT_PUBLIC_TURNSTILE_SITE_KEY
netlify env:unset TURNSTILE_SECRET_KEY

# Code will fall back to development mode (bypass CAPTCHA)

# Trigger redeploy
netlify deploy --prod
```

#### Database Rollback (Last Resort)

```sql
-- Remove new columns (this will lose bar verification data!)
ALTER TABLE users DROP COLUMN IF EXISTS user_role CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS bar_number CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS bar_state CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS bar_verified_at CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS verification_status CASCADE;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_set_advertiser_role ON users;
DROP FUNCTION IF EXISTS set_advertiser_role_on_verification();
```

**⚠️ Warning:** Only rollback the database if absolutely necessary. Consider disabling features via environment variables first.

---

## Testing Matrix

### AI Chatbox Scenarios

| Scenario | Expected Behavior | Pass/Fail |
|----------|------------------|-----------|
| Anonymous user visits chat | Shows "Sign In Required" message | [ ] |
| Click "Sign In to Continue" | Redirects to Clerk sign-in | [ ] |
| After sign-in redirect | Returns to page with accessible chat | [ ] |
| First message attempt | Triggers Turnstile CAPTCHA | [ ] |
| CAPTCHA completed successfully | Message sends to AI | [ ] |
| CAPTCHA failed | Shows error, allows retry | [ ] |
| 20th message in hour | Sends successfully | [ ] |
| 21st message in hour | Returns 429 rate limit error | [ ] |
| AI response streaming | Text streams smoothly to UI | [ ] |
| OpenAI API error | Shows friendly error message | [ ] |

### Rate Limiting Scenarios

| User Type | Endpoint | Limit | Test Result |
|-----------|----------|-------|-------------|
| Anonymous | /api/judges/search | 10/day | [ ] |
| Anonymous (11th request) | /api/judges/search | 429 error | [ ] |
| Authenticated | /api/judges/search | 100/hour | [ ] |
| Authenticated | /api/chat | 20/hour | [ ] |
| Authenticated (21st chat) | /api/chat | 429 error | [ ] |

### Advertiser Onboarding Scenarios

| Scenario | Expected Behavior | Pass/Fail |
|----------|------------------|-----------|
| Unauthenticated access | Redirects to sign-in | [ ] |
| Empty bar number | Form validation error | [ ] |
| Invalid format (e.g., "abc") | Validation error | [ ] |
| Valid format (e.g., "123456") | Accepts input | [ ] |
| Submit without CAPTCHA | Button disabled | [ ] |
| Submit with CAPTCHA | API call succeeds | [ ] |
| Duplicate bar number | 409 error "already registered" | [ ] |
| Successful submission | Success message appears | [ ] |
| Database update | user_role = 'advertiser' | [ ] |
| Trigger execution | Role auto-set on verification | [ ] |
| Redirect after success | Goes to /dashboard/advertiser | [ ] |

### Security Tests

| Test | Expected | Pass/Fail |
|------|----------|-----------|
| Direct /api/chat access (no auth) | 401 Unauthorized | [ ] |
| Invalid Turnstile token | 403 Forbidden | [ ] |
| SQL injection in bar number | Sanitized/rejected | [ ] |
| XSS in chat input | Escaped output | [ ] |
| CSRF protection | Request requires valid origin | [ ] |

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Authentication Conversion:**
   - How many users sign in to access AI chat?
   - Drop-off rate at authentication gate
   - Time to complete sign-in flow

2. **Turnstile Performance:**
   - CAPTCHA completion rate
   - CAPTCHA failure rate
   - Time to complete CAPTCHA
   - User abandonment after seeing CAPTCHA

3. **Rate Limiting:**
   - Number of rate limit hits per day
   - Anonymous vs authenticated usage
   - Most rate-limited endpoints

4. **Bar Verification:**
   - Verification completion rate
   - Most common verification errors
   - Time to complete onboarding flow

### Monitoring Queries

```sql
-- User role distribution
SELECT user_role, COUNT(*) as count
FROM users
GROUP BY user_role
ORDER BY count DESC;

-- Recent bar verifications
SELECT
  DATE(bar_verified_at) as date,
  COUNT(*) as verifications
FROM users
WHERE bar_verified_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(bar_verified_at)
ORDER BY date DESC;

-- Verification status breakdown
SELECT verification_status, COUNT(*) as count
FROM users
GROUP BY verification_status;

-- Top states for bar verifications
SELECT bar_state, COUNT(*) as count
FROM users
WHERE bar_state IS NOT NULL
GROUP BY bar_state
ORDER BY count DESC;
```

### Alerts to Set Up

1. **High Rate Limit Hit Rate:**
   - Alert if > 100 rate limit hits per hour
   - May indicate need to adjust limits

2. **Turnstile Failure Spike:**
   - Alert if CAPTCHA failure rate > 20%
   - May indicate bot attack or UX issue

3. **Authentication Errors:**
   - Alert on Clerk authentication failures
   - May indicate configuration issue

4. **Database Trigger Failures:**
   - Monitor for any errors in role promotion trigger
   - Critical for advertiser onboarding

---

## Troubleshooting

### Issue: Turnstile widget not appearing

**Symptoms:** CAPTCHA doesn't show up in AI chat or onboarding form

**Diagnosis:**
```bash
# Check if site key is set
echo $NEXT_PUBLIC_TURNSTILE_SITE_KEY

# Check browser console for errors
# Look for: "Turnstile site key not configured"
```

**Solutions:**
1. Verify `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set in Netlify
2. Check that key starts with `0x` (production) or `1x` (test)
3. Ensure environment variable is prefixed with `NEXT_PUBLIC_`
4. Redeploy after setting environment variable

### Issue: Rate limiting not working

**Symptoms:** Users can exceed rate limits without getting 429 errors

**Diagnosis:**
```bash
# Check if Redis is configured
netlify env:get UPSTASH_REDIS_REST_URL
netlify env:get UPSTASH_REDIS_REST_TOKEN

# Check Redis connection in logs
netlify logs:function api-chat | grep "rate_limit"
```

**Solutions:**
1. Verify Upstash Redis credentials are set
2. Check Redis connection in Upstash dashboard
3. Ensure Redis is not hitting its connection limit
4. Check for Redis connection errors in Sentry

### Issue: Bar verification fails

**Symptoms:** Users can't complete advertiser onboarding

**Diagnosis:**
1. Check Netlify function logs for errors
2. Check Supabase logs for database errors
3. Verify migration was applied correctly

**Solutions:**
```sql
-- Check if columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users';

-- Re-run migration if needed
-- (paste migration SQL in Supabase SQL editor)
```

### Issue: Trigger not promoting users to advertiser

**Symptoms:** Users stay as 'user' even after verification

**Diagnosis:**
```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers
WHERE trigger_name = 'trigger_set_advertiser_role';

-- Check if function exists
SELECT proname FROM pg_proc
WHERE proname = 'set_advertiser_role_on_verification';
```

**Solutions:**
1. Re-run trigger creation part of migration
2. Manually update affected users:
```sql
UPDATE users
SET user_role = 'advertiser'
WHERE verification_status = 'verified'
  AND bar_verified_at IS NOT NULL
  AND user_role != 'advertiser';
```

### Issue: Authentication redirect loop

**Symptoms:** Users stuck in redirect loop after sign-in

**Diagnosis:**
- Check Clerk configuration
- Verify middleware is not blocking too many routes

**Solutions:**
1. Check that `/api/auth` routes are excluded from middleware
2. Verify Clerk webhook URLs are correct
3. Check for conflicting middleware rules

---

## Next Steps

### Week 1 Post-Launch
- [ ] Monitor error rates daily
- [ ] Review user feedback on authentication gate
- [ ] Analyze conversion rates
- [ ] Check for accessibility issues with CAPTCHA

### Week 2 Post-Launch
- [ ] Review rate limit effectiveness
- [ ] Adjust limits if needed based on usage patterns
- [ ] Analyze advertiser onboarding drop-off points
- [ ] Optimize Turnstile placement if UX issues

### Month 1 Post-Launch
- [ ] Evaluate bot prevention effectiveness
- [ ] Consider integrating actual State Bar API for verification
- [ ] Review and adjust rate limit thresholds
- [ ] A/B test CAPTCHA placement and timing

### Future Enhancements
- [ ] Implement actual State Bar API integration for real-time verification
- [ ] Add email notification when bar verification is approved/rejected
- [ ] Create admin dashboard to manage advertiser applications
- [ ] Add analytics dashboard for rate limiting insights
- [ ] Consider implementing risk-based CAPTCHA (only show for suspicious activity)

---

## Success Criteria

✅ **Deployment is successful if:**

1. **Database Migration:**
   - [x] All new columns created successfully
   - [x] Constraints applied correctly
   - [x] Indexes created
   - [x] Trigger and function working
   - [x] No errors for existing users

2. **Environment Configuration:**
   - [ ] Turnstile keys configured in Netlify
   - [ ] All required env vars present
   - [ ] Local .env.local updated

3. **Functional Tests:**
   - [ ] AI chat requires authentication
   - [ ] Turnstile CAPTCHA appears and verifies
   - [ ] Rate limiting enforces correct limits
   - [ ] Advertiser onboarding works end-to-end
   - [ ] User roles persist correctly

4. **No Regressions:**
   - [ ] Existing functionality still works
   - [ ] No increase in error rates
   - [ ] No performance degradation
   - [ ] All tests passing

5. **Monitoring:**
   - [ ] Sentry tracking errors
   - [ ] Analytics tracking events
   - [ ] Database queries performing well
   - [ ] Redis rate limiting operational

---

## Appendix

### A. Rate Limit Configuration

Current rate limits (can be adjusted in code):

```typescript
// Anonymous users
- Judge search: 10 requests per day (lib/api/judges/search/route.ts)

// Authenticated users
- Judge search: 100 requests per hour (lib/api/judges/search/route.ts)
- AI chat: 20 messages per hour (app/api/chat/route.ts)
```

### B. User Role Definitions

| Role | Permissions | How to Get |
|------|------------|------------|
| `user` | Basic access, search judges, AI chat | Default for all signed-in users |
| `advertiser` | Create ad campaigns, premium features | Verify bar number via onboarding |
| `admin` | Full platform access, user management | Manual promotion by super admin |

### C. Verification Status Flow

```
none (default)
  ↓
pending (after submitting bar number - currently auto-verified)
  ↓
verified (trigger sets role to 'advertiser') OR rejected
```

### D. Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Yes | Cloudflare Turnstile public key | `0x4AAA...` |
| `TURNSTILE_SECRET_KEY` | Yes | Cloudflare Turnstile secret key | `0x4BBB...` |
| `UPSTASH_REDIS_REST_URL` | Yes | Redis URL for rate limiting | `https://...` |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Redis auth token | `AXX...` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk public key | `pk_test...` |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key | `sk_test...` |

---

**Deployment Guide Version:** 1.0
**Last Updated:** 2025-10-20
**Maintained By:** Development Team
