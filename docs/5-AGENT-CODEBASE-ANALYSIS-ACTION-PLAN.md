# 🔍 5-Agent Codebase Analysis - Action Plan

**Generated:** October 17, 2025
**Status:** 🔴 CRITICAL SECURITY ISSUES BLOCKING PRODUCTION
**Timeline:** 5-Day Launch Plan (Days 1-2 Focus)

---

## 📊 Executive Summary

### ✅ What's Working

- **Database:** ACTIVE_HEALTHY with 3,486 courts, 1,903 judges, 442,691 cases populated
- **Infrastructure:** Netlify deployment configured, Upstash Redis active
- **APIs:** All credentials present (Clerk, Stripe, OpenAI, Google AI, CourtListener)
- **Environment:** All 32 environment variables configured across dev/staging/production

### 🔴 Critical Blockers (MUST FIX FOR LAUNCH)

#### **1. Supabase Row-Level Security (RLS) Vulnerabilities** ⚠️ CRITICAL

**Risk Level:** CRITICAL - Data exposure vulnerability
**Impact:** 10 tables publicly accessible without RLS protection

**Tables Missing RLS:**

1. `app_users` - User data **WITH POLICIES BUT RLS DISABLED!** ⚠️
2. `judge_court_positions` - Judicial appointment history
3. `sync_queue` - Internal sync operations
4. `pricing_tiers` - Billing configuration
5. `law_firm_targets` - Marketing data
6. `judge_analytics` - Analytics data
7. `case_attorneys` - Attorney information
8. `courthouse_analytics` - Court statistics
9. `evaluations` - User evaluations
10. `documents` - Uploaded documents

**Tables with RLS but No Policies:** (7 tables)

- `ad_bookings`, `ad_campaigns`, `ad_creatives`
- `ad_performance_metrics`, `ad_spots`
- `advertiser_profiles`, `analytics_events`, `billing_transactions`

---

#### **2. Security Definer Views** ⚠️ HIGH RISK

**Risk Level:** HIGH - Privilege escalation vulnerability

**Affected Views:**

1. `public.onboarding_metrics_summary` - Uses view creator's permissions
2. `public.ai_search_performance_dashboard` - Bypasses RLS checks

**Issue:** These views run with the creator's permissions instead of the querying user's permissions, potentially exposing sensitive data.

---

#### **3. Function Security - Mutable Search Path** ⚠️ MEDIUM RISK

**Risk Level:** MEDIUM - SQL injection vulnerability via search path manipulation

**31 Functions Affected:**

- `update_ad_orders_updated_at`
- `refresh_analytics_materialized_views`
- `calculate_ad_pricing`
- `generate_court_slug`
- `search_judges_ranked`
- `is_service_account`, `is_admin`, `current_user_id`
- ...and 23 more

**Fix:** Add `SET search_path = public, extensions` to each function definition.

---

#### **4. CourtListener API Issues** ⚠️ MEDIUM PRIORITY

**Risk Level:** MEDIUM - Data sync failures, missing analytics

**Problems:**

- **Throttling:** Rate limit exceeded (5000/hour)
- **404 Errors:** Missing court/judge resources
- **Failed Sync:** Decision sync and analytics generation failing

**Current Config:**

```env
COURTLISTENER_API_KEY=11b745157612fd1895856aedf5421a3bc8ecea34
COURTLISTENER_REQUEST_DELAY_MS=1000
COURTLISTENER_MAX_RETRIES=5
```

---

## 🔧 Remediation Plan

### Phase 1: Critical Security Fixes (Day 1)

#### Task 1.1: Enable RLS on All Public Tables ✅

**Priority:** P0 - CRITICAL
**Estimated Time:** 2 hours

```sql
-- Enable RLS on tables missing protection
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_court_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_firm_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_attorneys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courthouse_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
```

**Verification:**

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Should return 0 rows
```

---

#### Task 1.2: Create RLS Policies for All Tables ✅

**Priority:** P0 - CRITICAL
**Estimated Time:** 4 hours

**Policy Strategy:**

1. **Service Role:** Full access (bypasses RLS)
2. **Admin Users:** Full access to all tables
3. **Authenticated Users:** Read access to public data, write access to own data
4. **Anonymous Users:** Read-only access to courts/judges/cases

**Template for Each Table:**

```sql
-- Service role bypass (already has full access)
-- Admin full access
CREATE POLICY "Admins have full access to {table}" ON public.{table}
  FOR ALL USING (public.is_admin());

-- User access (customize per table)
CREATE POLICY "Users can read public {table}" ON public.{table}
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own {table}" ON public.{table}
  FOR ALL USING (auth.uid() = user_id);
```

**Tables Requiring Policies:**

- ✅ `ad_bookings` - Allow advertiser read/write own bookings
- ✅ `ad_campaigns` - Allow advertiser manage own campaigns
- ✅ `ad_creatives` - Allow advertiser manage own creatives
- ✅ `ad_performance_metrics` - Allow advertiser read own metrics
- ✅ `ad_spots` - Public read, admin write
- ✅ `advertiser_profiles` - Allow user manage own profile
- ✅ `analytics_events` - Service role only
- ✅ `billing_transactions` - User read own, service role write
- ✅ `app_users` - User read own, service role write
- ✅ `judge_court_positions` - Public read, service role write
- ✅ `sync_queue` - Service role only
- ✅ `pricing_tiers` - Public read, admin write
- ✅ `law_firm_targets` - Admin only
- ✅ `judge_analytics` - Public read, service role write
- ✅ `case_attorneys` - Public read, service role write
- ✅ `courthouse_analytics` - Public read, service role write
- ✅ `evaluations` - User read/write own, service role full
- ✅ `documents` - User read/write own, admin verify

---

#### Task 1.3: Fix Security Definer Views ✅

**Priority:** P0 - CRITICAL
**Estimated Time:** 1 hour

```sql
-- Drop and recreate views WITHOUT security definer
DROP VIEW IF EXISTS public.onboarding_metrics_summary CASCADE;
CREATE VIEW public.onboarding_metrics_summary AS
-- ... view definition ...
-- Remove: WITH (security_definer = true)

DROP VIEW IF EXISTS public.ai_search_performance_dashboard CASCADE;
CREATE VIEW public.ai_search_performance_dashboard AS
-- ... view definition ...
-- Remove: WITH (security_definer = true)
```

---

#### Task 1.4: Fix Function Search Paths ✅

**Priority:** P1 - HIGH
**Estimated Time:** 2 hours

**Batch Update Template:**

```sql
-- Add SET search_path to each function
CREATE OR REPLACE FUNCTION public.function_name()
RETURNS return_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions  -- ← ADD THIS
AS $$
BEGIN
  -- function body
END;
$$;
```

**Functions to Update:** (31 total)

- [x] `update_ad_orders_updated_at`
- [x] `refresh_analytics_materialized_views`
- [x] `update_judge_court_positions_updated_at`
- [x] `calculate_ad_pricing`
- [x] `generate_court_slug`, `update_court_slug`
- [x] `update_onboarding_analytics`
- [x] `get_batch_decision_summaries`
- [x] `track_feature_usage`
- [x] ... (28 more functions)

---

### Phase 2: API & Data Sync Fixes (Day 2)

#### Task 2.1: Fix CourtListener Throttling ✅

**Priority:** P1 - HIGH
**Estimated Time:** 3 hours

**Strategy:**

1. ✅ Increase request delay: `1000ms → 2000ms`
2. ✅ Implement exponential backoff with jitter
3. ✅ Add circuit breaker pattern
4. ✅ Cache successful responses (24hr TTL)
5. ✅ Batch requests when possible

**Files to Update:**

- `lib/sync/court-sync.ts`
- `lib/sync/judge-sync.ts`
- `lib/sync/decision-sync.ts`
- `lib/courtlistener/client.ts`

**New Environment Variables:**

```env
COURTLISTENER_REQUEST_DELAY_MS=2000  # Increased from 1000
COURTLISTENER_BACKOFF_CAP_MS=30000   # Increased from 15000
COURTLISTENER_CIRCUIT_THRESHOLD=3    # Decreased from 5
```

---

#### Task 2.2: Handle CourtListener 404s Gracefully ✅

**Priority:** P1 - HIGH
**Estimated Time:** 2 hours

**Implementation:**

```typescript
// Add fallback strategies for missing resources
async function fetchJudgeData(judgeId: string): Promise<Judge | null> {
  try {
    return await courtListenerClient.getJudge(judgeId)
  } catch (error) {
    if (error.status === 404) {
      // Log missing resource, continue sync
      logger.warn(`Judge ${judgeId} not found in CourtListener`)
      return null
    }
    throw error // Rethrow other errors
  }
}
```

---

### Phase 3: Next.js Runtime Configuration (Day 3)

#### Task 3.1: Add Dynamic Export to API Routes ✅

**Priority:** P1 - HIGH
**Estimated Time:** 2 hours

**Pattern:**

```typescript
// Add to all API routes that use:
// - auth.userId from Clerk
// - dynamic query params
// - cookies/headers
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs' // or 'edge' if appropriate
```

**Routes Requiring Updates:** (~89 files in `app/api/`)

- `app/api/admin/**/*.ts`
- `app/api/judges/**/*.ts`
- `app/api/analytics/**/*.ts`
- `app/api/sync/**/*.ts`
- ... (all API routes)

**Verification:**

```bash
# Search for routes missing dynamic export
grep -r "export const dynamic" app/api/ --exclude-dir=node_modules -L
```

---

### Phase 4: Testing & Validation (Day 4)

#### Task 4.1: Run Endpoint Tests ✅

**Priority:** P1 - HIGH
**Estimated Time:** 4 hours

```bash
# Run existing tests
npm run test:api
npm run test:integration

# Manual endpoint testing
curl https://judgefinder.io/api/judges/[slug]
curl https://judgefinder.io/api/courts/[slug]
curl https://judgefinder.io/api/analytics/bias/[judgeId]
```

**Expected Results:**

- ✅ All auth-protected endpoints require valid session
- ✅ All RLS policies enforce correct access control
- ✅ No data leakage to anonymous users
- ✅ CourtListener sync completes without errors

---

#### Task 4.2: Security Audit ✅

**Priority:** P0 - CRITICAL
**Estimated Time:** 2 hours

**Checks:**

1. ✅ Run Supabase security advisors again (should be 0 errors)
2. ✅ Test RLS bypass attempts
3. ✅ Verify service role is not exposed client-side
4. ✅ Check for exposed secrets in client bundles

```bash
# Re-run Supabase advisor
# Using MCP: mcp_supabase_get_advisors(project_id, "security")

# Check for exposed secrets
npm run analyze:bundle
```

---

### Phase 5: Deployment (Day 5)

#### Task 5.1: Deploy to Production ✅

**Priority:** P0 - CRITICAL
**Estimated Time:** 1 hour

```bash
# Deploy to Netlify
git push origin main

# Monitor deployment
netlify deploy --prod
```

#### Task 5.2: E2E Validation ✅

**Priority:** P0 - CRITICAL
**Estimated Time:** 3 hours

**Test Scenarios:**

1. ✅ Anonymous user can search judges/courts
2. ✅ Anonymous user CANNOT access admin endpoints
3. ✅ Authenticated user can bookmark judges
4. ✅ Authenticated user can view their own data only
5. ✅ Admin user can access admin dashboard
6. ✅ Stripe checkout flow works end-to-end
7. ✅ AI analytics generation completes successfully

---

## 📝 Migration Files Needed

### Migration 1: Enable RLS on All Tables

**File:** `supabase/migrations/YYYYMMDDHHMMSS_enable_rls_all_tables.sql`

### Migration 2: Create RLS Policies

**File:** `supabase/migrations/YYYYMMDDHHMMSS_create_rls_policies.sql`

### Migration 3: Fix Security Definer Views

**File:** `supabase/migrations/YYYYMMDDHHMMSS_fix_security_definer_views.sql`

### Migration 4: Add Search Path to Functions

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_function_search_paths.sql`

---

## 🎯 Success Metrics

### Security

- [ ] 0 Supabase security advisor errors
- [ ] 100% RLS coverage on public tables
- [ ] 0 exposed secrets in client bundles
- [ ] 0 privilege escalation vulnerabilities

### Performance

- [ ] CourtListener sync completes without throttling
- [ ] < 2% error rate on API endpoints
- [ ] < 500ms p95 latency on search endpoints
- [ ] 100% uptime during launch week

### Data Quality

- [ ] 3,486 courts verified
- [ ] 1,903 judges verified
- [ ] 442,691 cases verified
- [ ] AI analytics generated for all judges

---

## 🚨 Risk Assessment

### HIGH RISK (Immediate Action Required)

1. **RLS Disabled Tables** - Direct data exposure vulnerability
2. **Security Definer Views** - Privilege escalation risk
3. **CourtListener Throttling** - Data sync failures

### MEDIUM RISK (Fix Before Launch)

1. **Function Search Paths** - Potential SQL injection vector
2. **Missing Dynamic Exports** - Stale data served to users
3. **Missing Tests** - Unknown bugs in production

### LOW RISK (Monitor Post-Launch)

1. **Materialized View API Access** - Performance impact
2. **Extension in Public Schema** - Best practice violation
3. **Postgres Version** - Security patches available

---

## 📞 Escalation Path

**Critical Issues:**

- Supabase RLS failures → Immediate rollback, enable maintenance mode
- Data breach detected → Contact security@supabase.io, notify users
- CourtListener API down → Switch to cached data, manual sync later

**Support Contacts:**

- Supabase Support: https://supabase.com/support
- Netlify Support: https://www.netlify.com/support
- Stripe Support: https://support.stripe.com

---

## ✅ Completion Checklist

### Day 1 (Security Hardening)

- [ ] Enable RLS on 10 tables
- [ ] Create RLS policies for 17 tables
- [ ] Fix 2 security definer views
- [ ] Update 31 function search paths
- [ ] Deploy security migration to staging
- [ ] Verify 0 security advisor errors

### Day 2 (Data Sync Fixes)

- [ ] Increase CourtListener delay to 2000ms
- [ ] Implement exponential backoff
- [ ] Add 404 graceful handling
- [ ] Re-run full data sync
- [ ] Verify analytics generation

### Day 3 (Runtime Config)

- [ ] Add dynamic exports to ~89 API routes
- [ ] Test dynamic route behavior
- [ ] Deploy runtime fixes to staging
- [ ] Verify no stale data served

### Day 4 (Testing)

- [ ] Run full endpoint test suite
- [ ] Manual security testing
- [ ] Performance benchmarks
- [ ] Load testing
- [ ] Bug fixes

### Day 5 (Launch)

- [ ] Deploy to production
- [ ] E2E validation
- [ ] Monitor Sentry errors
- [ ] Monitor performance metrics
- [ ] Announce launch

---

**Last Updated:** October 17, 2025
**Next Review:** After Phase 1 completion
**Owner:** Platform Team
**Status:** 🔴 IN PROGRESS
