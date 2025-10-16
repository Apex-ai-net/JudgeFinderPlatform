# Judge Analytics Request Flow - Complete Trace

## Overview

This document traces the complete request flow for loading judge analytics, from URL navigation to rendered content, identifying all data fetching, transformation, and serialization points.

---

## Flow Diagram

```
User navigates to /judges/[slug]
    ↓
Next.js App Router matches route
    ↓
Middleware (Edge Runtime)
    ├─ Security headers applied
    ├─ CORS headers set
    ├─ Cache headers determined
    └─ Judge redirects handled
    ↓
Server Component: app/judges/[slug]/page.tsx
    ├─ export const dynamic = 'force-dynamic'
    ├─ export const revalidate = 0
    └─ async function JudgePage({ params })
        ↓
    1. Resolve params (Promise handling for Next.js compatibility)
        ↓
    2. getJudge(slug) - Primary data fetch
        ├─ Validates slug format
        ├─ Calls API: GET /api/judges/by-slug?slug={slug}
        │   ├─ Cache headers: public, s-maxage=3600, stale-while-revalidate=1800
        │   ├─ Next.js cache: revalidate: 3600
        │   └─ Returns: JudgeLookupResult { judge, found_by, alternatives }
        └─ Fallback: getJudgeFallback(slug) if API fails
            └─ Direct Supabase query on 'judges' table
        ↓
    3. Validation & Redirect
        ├─ Check judge exists → notFound() if null
        ├─ Check canonical slug → redirect() if mismatch
        └─ Resolve court slug (optional Supabase query)
        ↓
    4. getRelatedJudges(currentJudge)
        └─ Supabase queries for same court/jurisdiction judges
        ↓
    5. Generate metadata (for SEO)
        └─ generateJudgeStructuredData(judge, slug, baseUrl)
        ↓
    6. Render JSX with components:
        ├─ JudgeProfile (static judge data)
        ├─ ProfessionalBackground (static judge data)
        ├─ AnalyticsSlidersShell (client component wrapper)
        │   └─ Lazy loads AnalyticsSliders component
        ├─ RecentDecisions (static/server component)
        ├─ AdvertiserSlots (static/server component)
        └─ Related content components
```

---

## API Endpoint: /api/judges/by-slug

**File:** `/app/api/judges/by-slug/route.ts`

### Configuration

```typescript
export const dynamic = 'force-dynamic'
export const revalidate = 120
```

### Flow

```
GET /api/judges/by-slug?slug={slug}
    ↓
1. Validate slug parameter
    ├─ Check slug presence
    ├─ Validate length (1-200 chars)
    └─ Validate format (isValidSlug)
    ↓
2. lookupJudge(slug)
    ├─ Check in-memory cache: judge_lookup:{slug}
    │   └─ Hit: Return cached result (30 min TTL)
    ↓
    ├─ Strategy 1: Direct slug lookup
    │   └─ SELECT * FROM judges WHERE slug = $1
    ↓
    ├─ Strategy 2: Fuzzy slug matching
    │   └─ SELECT * FROM judges WHERE slug ILIKE '%{slug}%' LIMIT 10
    ↓
    ├─ Strategy 3: Name-based lookup
    │   ├─ Convert slug to name variations
    │   └─ SELECT * FROM judges WHERE name ILIKE '%{variation}%' LIMIT 5
    ↓
    └─ Strategy 4: Similarity search (fallback)
        └─ SELECT name, slug, id, court_name, jurisdiction FROM judges LIMIT 100
        └─ Levenshtein distance comparison
    ↓
3. Cache successful lookup
    └─ cache.set('judge_lookup:{slug}', result, 1800)
    ↓
4. Log performance metrics
    └─ INSERT INTO performance_metrics (metric_name, execution_time, ...)
    ↓
5. Return response with cache headers
    └─ Cache-Control: public, s-maxage=3600, max-age=1800, stale-while-revalidate=1800
```

### Data Structure

```typescript
interface JudgeLookupResult {
  judge: Judge | null
  found_by: 'slug' | 'name_exact' | 'name_partial' | 'not_found'
  alternatives?: Judge[]
}

interface Judge {
  id: string
  name: string
  slug?: string
  court_id: string | null
  court_name: string | null
  court_slug?: string | null
  jurisdiction: string
  appointed_date: string | null // ⚠️ Date serialization point
  position_type?: string | null
  education: string | null
  profile_image_url?: string | null
  bio: string | null
  total_cases: number
  reversal_rate: number
  average_decision_time: number | null
  courtlistener_id?: string | null
  courtlistener_data?: Record<string, unknown> | null
  created_at: string // ⚠️ Date serialization point
  updated_at: string // ⚠️ Date serialization point
}
```

---

## Client Component: AnalyticsSliders

**File:** `/components/judges/AnalyticsSlidersShell.tsx` → `/components/judges/AnalyticsSliders.tsx`

### Loading Pattern

```
Server Component renders AnalyticsSlidersShell
    ↓
Client-side hydration
    ↓
Suspense boundary shows loading state
    ↓
Lazy load AnalyticsSliders component
    ↓
useEffect() fires on mount
    ↓
Fetch analytics data
```

### Analytics Fetch Flow

```typescript
// In AnalyticsSliders.tsx useEffect
fetch(`/api/judges/${judgeId}/analytics${params}`)
    ↓
Client-side fetch() call
    ├─ Uses judgeId (from props)
    ├─ Includes filter params from URL
    └─ Standard browser fetch API
    ↓
Response handling
    ├─ Parse JSON: const data = await response.json()
    ├─ Set state: setAnalytics(data.analytics)
    ├─ Set metadata: setDataSource, setLastUpdated, setIsCachedResponse
    └─ Handle errors
```

---

## API Endpoint: /api/judges/[id]/analytics

**File:** `/app/api/judges/[id]/analytics/route.ts`

### Configuration

```typescript
export const runtime = 'nodejs' // NOT edge runtime
export const dynamic = 'force-dynamic'
export const revalidate = 0
```

### Environment Variables

```typescript
LOOKBACK_YEARS = process.env.JUDGE_ANALYTICS_LOOKBACK_YEARS ?? '5'
CASE_FETCH_LIMIT = process.env.JUDGE_ANALYTICS_CASE_LIMIT ?? '1000'
```

### Complete Flow

```
GET /api/judges/[id]/analytics
    ↓
1. Rate limiting
    └─ buildRateLimiter: 20 requests per minute per IP per judge
    ↓
2. Check Redis cache
    └─ redisGetJSON('judge:analytics:{judgeId}')
    └─ If cached: Return immediately (indefinite cache)
    ↓
3. Fetch judge data
    └─ SELECT id, name, court_id, court_name, jurisdiction, total_cases,
              appointed_date, status
       FROM judges WHERE id = $1
    ↓
4. Check database cache
    └─ fetchCachedAnalytics(supabase, judgeId)
    ├─ Query 1: judge_analytics_cache table
    │   └─ SELECT analytics, created_at WHERE judge_id = $1
    └─ Query 2 (fallback): judges table
        └─ SELECT case_analytics, updated_at WHERE id = $1
    └─ If cached with confidence_civil field: Return immediately
    ↓
5. Generate new analytics (cache miss)
    ├─ Calculate lookback window
    │   └─ startDate = now - LOOKBACK_YEARS
    ↓
    ├─ Fetch cases
    │   └─ SELECT case_type, outcome, status, summary,
    │            filing_date, decision_date, case_value
    │      FROM cases
    │      WHERE judge_id = $1
    │        AND filing_date >= $2
    │      ORDER BY filing_date DESC
    │      LIMIT {CASE_FETCH_LIMIT}
    ↓
    ├─ Enrich cases with opinions
    │   └─ enrichWithOpinions(supabase, cases)
    ↓
    ├─ Generate analytics
    │   ├─ If cases.length === 0:
    │   │   └─ computeLegacy(judge, analysisWindow)
    │   └─ Else:
    │       └─ generateAnalyticsFromCases(judge, enrichedCases, window)
    │           ├─ computeStatistical(judge, cases, window)
    │           └─ If API keys present:
    │               └─ enhanceWithAI(judge, cases, analytics, window)
    ↓
6. Cache results
    ├─ Redis: redisSetJSON(key, data, 60*60*24*90) // 90 days
    └─ Database: storeAnalyticsCache(supabase, judgeId, analytics)
        └─ UPSERT INTO judge_analytics_cache (judge_id, analytics, created_at, updated_at)
    ↓
7. Return response
    └─ JSON: { analytics, cached, data_source, document_count, rate_limit_remaining }
```

### Data Structure

```typescript
interface CaseAnalytics {
  // Metric values (all numbers 0-100)
  civil_plaintiff_favor: number
  civil_defendant_favor: number
  family_custody_mother: number
  family_custody_father: number
  family_alimony_favorable: number
  contract_enforcement_rate: number
  contract_dismissal_rate: number
  criminal_sentencing_severity: number
  criminal_plea_acceptance: number
  bail_release_rate: number
  appeal_reversal_rate: number
  settlement_encouragement_rate: number
  motion_grant_rate: number

  // Confidence scores (0-100)
  confidence_civil: number
  confidence_custody: number
  confidence_alimony: number
  confidence_contracts: number
  confidence_sentencing: number
  confidence_plea: number
  confidence_bail: number
  confidence_reversal: number
  confidence_settlement: number
  confidence_motion: number
  overall_confidence: number

  // Sample sizes
  sample_size_civil: number
  sample_size_custody: number
  sample_size_alimony: number
  sample_size_contracts: number
  sample_size_sentencing: number
  sample_size_plea: number
  sample_size_bail: number
  sample_size_reversal: number
  sample_size_settlement: number
  sample_size_motion: number

  // Metadata
  total_cases_analyzed: number
  analysis_quality: string
  notable_patterns: string[]
  data_limitations: string[]
  ai_model: string
  generated_at: string // ⚠️ Date serialization point
  last_updated: string // ⚠️ Date serialization point
}
```

---

## Critical Serialization Points

### 1. Judge Data Dates

**Location:** `/app/api/judges/by-slug/route.ts`

```typescript
// Dates come from Supabase as ISO strings
judge.appointed_date: string | null  // e.g., "2015-06-15"
judge.created_at: string             // e.g., "2024-01-15T10:30:00.000Z"
judge.updated_at: string             // e.g., "2024-10-10T14:22:00.000Z"
```

**Serialization:** Already strings from Supabase → JSON.stringify() → Response
**Status:** ✅ Safe - no Date objects

### 2. Analytics Dates

**Location:** `/app/api/judges/[id]/analytics/route.ts`

```typescript
analytics.generated_at: string  // new Date().toISOString()
analytics.last_updated: string  // new Date().toISOString()
```

**Serialization:** Created as ISO strings → JSON.stringify() → Response
**Status:** ✅ Safe - no Date objects

### 3. Structured Data Generation

**Location:** `/app/judges/[slug]/page.tsx` (lines 256-266)

```typescript
try {
  structuredDataJson = JSON.stringify(generateJudgeStructuredData(judge, canonicalSlug, baseUrl))
} catch (error) {
  console.error('Failed to generate structured data JSON for judge', {
    slug: canonicalSlug,
    message: error instanceof Error ? error.message : error,
  })
  structuredDataJson = '[]'
}
```

**Potential Issue:** If `generateJudgeStructuredData()` creates Date objects
**Status:** ⚠️ Requires investigation

### 4. Client-Side Date Parsing

**Location:** `/components/judges/AnalyticsSliders.tsx` (lines 318-330, 333-352)

```typescript
const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available'
  try {
    return new Date(value).toLocaleString('en-US', {
      /* ... */
    })
  } catch {
    return 'Not available'
  }
}

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  // ... calculate relative time
}
```

**Status:** ✅ Safe - handles parsing errors gracefully

---

## Environment-Specific Differences

### Development vs Production

#### Base URL Resolution

**File:** `/lib/utils/baseUrl.ts`

**Development (server-side):**

```typescript
return `http://localhost:${process.env.PORT || 3005}`
```

**Production (server-side):**

```typescript
// Uses environment variables
process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.URL || // Netlify primary URL
  process.env.DEPLOY_PRIME_URL || // Netlify deploy preview
  'https://judgefinder.io'
```

**Client-side (all environments):**

```typescript
if (typeof window !== 'undefined') {
  return window.location.origin
}
```

#### API Calls in Server Components

**File:** `/app/judges/[slug]/page.tsx` (line 43)

```typescript
const baseUrl = getBaseUrl()
const response = await fetch(`${baseUrl}/api/judges/by-slug?slug=${encodeURIComponent(slug)}`, {
  next: { revalidate: 3600 },
  headers: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
  },
})
```

**Development:** Calls `http://localhost:3005/api/judges/by-slug`
**Production:** Calls `https://judgefinder.io/api/judges/by-slug` (or Netlify URL)

**Potential Issue:** In production, this is a **self-referential fetch** during SSR/SSG build time.

---

## Caching Layers

### Layer 1: Next.js Fetch Cache

**Location:** Server Components

```typescript
fetch(url, { next: { revalidate: 3600 } })
```

- Caches at Next.js build/request level
- 1-hour revalidation
- ⚠️ Build-time cache may be stale in production

### Layer 2: Redis Cache

**Location:** `/app/api/judges/[id]/analytics/route.ts`

```typescript
redisGetJSON('judge:analytics:{judgeId}')
redisSetJSON(key, data, 60 * 60 * 24 * 90) // 90 days
```

- Edge cache for analytics
- Indefinite serving (90-day Redis TTL)

### Layer 3: Database Cache

**Location:** `judge_analytics_cache` table

```typescript
SELECT analytics, created_at
FROM judge_analytics_cache
WHERE judge_id = $1
```

- Permanent cache until manually refreshed
- Fallback to `judges.case_analytics` column

### Layer 4: HTTP Response Cache

**Location:** API response headers

```typescript
'Cache-Control': 'public, s-maxage=3600, max-age=1800, stale-while-revalidate=1800'
```

- CDN/browser caching
- 1-hour CDN cache
- 30-minute browser cache

### Layer 5: In-Memory Cache

**Location:** `/lib/cache/simple-cache.ts`

```typescript
cache.set('judge_lookup:{slug}', result, 1800) // 30 minutes
```

- Process-local cache
- Resets on serverless function cold starts

---

## Potential Production Issues

### 1. Self-Referential Fetch During Build

**Issue:** Server component calls its own API route during SSR/SSG build
**Location:** `/app/judges/[slug]/page.tsx` line 43

**Build-time behavior:**

```
Next.js build process
    ↓
Generate static pages for judges
    ↓
Server component executes getJudge(slug)
    ↓
fetch(`${baseUrl}/api/judges/by-slug?slug=${slug}`)
    ↓
Calls production URL (not localhost)
    ↓
⚠️ May fail if build happens before deployment
    ↓
Falls back to getJudgeFallback()
```

**Mitigation:** Fallback to direct database query works, but slower

### 2. Date Serialization in Structured Data ⚠️ CRITICAL BUG FOUND

**Issue:** `generateJudgeStructuredData()` creates Date objects that cannot be serialized
**Location:** Multiple locations in `/lib/seo/structured-data.ts`

**Problem Areas:**

```typescript
// Line 435 - Review Schema
datePublished: new Date().toISOString().split('T')[0]  // ❌ WRONG - uses Date()

// Line 617 - FAQ Schema (appointed_date parsing)
new Date(judge.appointed_date).toLocaleDateString(...)  // ❌ WRONG - creates Date object

// Line 698 - WebPage Schema
dateModified: new Date().toISOString()  // ❌ WRONG - uses Date()
```

**Error in Production:**
When `JSON.stringify()` is called on the structured data, any Date objects cause serialization to fail or produce unexpected results.

**Fix Required:**

```typescript
// BEFORE (lines 435, 698)
datePublished: new Date().toISOString().split('T')[0]
dateModified: new Date().toISOString()

// AFTER
datePublished: new Date().toISOString().split('T')[0] // This is actually OK - returns string
dateModified: new Date().toISOString() // This is actually OK - returns string

// The REAL problem is line 617:
// BEFORE
new Date(judge.appointed_date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

// AFTER
judge.appointed_date
  ? new Date(judge.appointed_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  : `Information about Judge ${judgeName}'s appointment date is available through official court records.`
```

**Wait - Further Analysis:**
Actually, `new Date().toISOString()` returns a string, not a Date object. The issue is more subtle.

**Real Issue:** In FAQ schema (line 617), if `judge.appointed_date` is invalid or null, `new Date(null)` creates an invalid Date that serializes to `"Invalid Date"` string.

**Status:** ⚠️ Requires defensive null checks and error handling

### 3. Stale Build-time Cache

**Issue:** `export const revalidate = 0` but fetch has `revalidate: 3600`
**Location:** `/app/judges/[slug]/page.tsx`

**Conflict:**

```typescript
export const revalidate = 0 // Force dynamic, no static generation

// But then:
fetch(url, { next: { revalidate: 3600 } }) // Cache for 1 hour
```

**Effect:** Page is dynamic, but data is cached for 1 hour

### 4. Redis Indefinite Cache

**Issue:** Analytics never regenerate once cached
**Location:** `/app/api/judges/[id]/analytics/route.ts` line 56

```typescript
if (cachedRedis) {
  // Return cached data regardless of age to prevent regeneration costs
  return NextResponse.json({ analytics: cachedRedis.analytics, ... })
}
```

**Effect:** Stale analytics may be served indefinitely unless manually cleared

### 5. CORS Same-Origin Fetches

**Issue:** Server-side fetch may fail CORS check during build
**Location:** Middleware and Next.js config

**Middleware Fix (line 152):**

```typescript
if (origin && origin === requestUrl.origin) {
  response.headers.set('Access-Control-Allow-Origin', origin)
  // ...
}
```

**Status:** ✅ Should work for same-origin fetches

---

## Data Flow Summary

```
User Request: /judges/john-doe
    ↓
Middleware: Security + CORS + Cache headers
    ↓
Server Component: page.tsx
    ├─ API Call: /api/judges/by-slug?slug=john-doe
    │   ├─ Cache: In-memory (30 min)
    │   ├─ Database: judges table
    │   └─ Returns: Judge object (dates as strings)
    ├─ Database: Related judges query
    └─ Render: Static JSX + AnalyticsSlidersShell
    ↓
HTML Response to Browser
    ↓
Client Hydration
    ↓
AnalyticsSliders Component Mounts
    ├─ useEffect triggers
    └─ fetch(/api/judges/{id}/analytics)
        ├─ Cache: Redis (90 days, indefinite serving)
        ├─ Cache: Database (permanent)
        ├─ Generate: If cache miss
        │   ├─ Fetch cases from database
        │   ├─ Compute statistical analytics
        │   └─ Enhance with AI (if API keys present)
        └─ Returns: CaseAnalytics object (dates as strings)
    ↓
Component Re-render with Analytics Data
    ├─ Format dates on client-side
    └─ Display sliders and metrics
```

---

## Recommendations

### High Priority

1. **Investigate Structured Data Generation**
   - Check if `generateJudgeStructuredData()` creates Date objects
   - Ensure all fields are JSON-serializable
   - Add error handling for serialization failures

2. **Fix Cache Inconsistency**
   - Reconcile `revalidate: 0` with `fetch({ next: { revalidate: 3600 } })`
   - Either make page static with ISR or fully dynamic without fetch cache

3. **Add Build-Time Environment Check**
   - Detect if running in build mode
   - Use direct database queries during build instead of API calls
   - Example:
   ```typescript
   const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'
   if (isBuildTime) {
     return await getJudgeFallback(slug) // Direct DB
   } else {
     return await getJudge(slug) // API call
   }
   ```

### Medium Priority

4. **Analytics Cache Staleness**
   - Add TTL check even for cached analytics
   - Implement background refresh for old cache entries
   - Add manual refresh endpoint for admins

5. **Add Serialization Tests**
   - Unit tests for JSON.stringify on all API responses
   - Integration tests for full request flow
   - Validate no Date objects escape to JSON responses

### Low Priority

6. **Add Logging for Production Debugging**
   - Log all cache hits/misses
   - Track data source for each request
   - Monitor API call failures during builds

7. **Optimize Cache Strategy**
   - Consider edge caching at Netlify level
   - Use SWR pattern for analytics in client
   - Implement optimistic UI updates

---

## Files Reference

### Core Route Files

- `/app/judges/[slug]/page.tsx` - Main judge profile page
- `/app/api/judges/by-slug/route.ts` - Judge lookup API
- `/app/api/judges/[id]/analytics/route.ts` - Analytics API

### Component Files

- `/components/judges/AnalyticsSlidersShell.tsx` - Server wrapper
- `/components/judges/AnalyticsSliders.tsx` - Client analytics component
- `/components/judges/JudgeProfile.tsx` - Static profile component

### Library Files

- `/lib/utils/baseUrl.ts` - Base URL resolution
- `/lib/analytics/cache.ts` - Analytics caching logic
- `/lib/analytics/types.ts` - Type definitions
- `/lib/cache/redis.ts` - Redis cache utilities
- `/lib/cache/simple-cache.ts` - In-memory cache

### Configuration Files

- `/middleware.ts` - Edge middleware
- `/next.config.js` - Next.js configuration
- `/types/index.ts` - Global type definitions

---

## Testing Checklist

- [ ] Test judge page load in development
- [ ] Test judge page load in production
- [ ] Test analytics loading (cached)
- [ ] Test analytics loading (cache miss)
- [ ] Test fallback when API fails
- [ ] Test date serialization in all responses
- [ ] Test structured data JSON generation
- [ ] Test cache headers are applied
- [ ] Test CORS headers for same-origin
- [ ] Test rate limiting
- [ ] Test error handling for missing data
- [ ] Test build process with API calls
- [ ] Monitor Netlify build logs for fetch errors
- [ ] Verify no Date objects in JSON responses
- [ ] Test with various judge slugs
- [ ] Test canonical redirects

---

## Summary of Critical Findings

### Where the Chain Breaks in Production

Based on the complete flow analysis, here are the key breakage points:

#### 1. Self-Referential API Calls During Build (HIGH SEVERITY)

**Location:** `/app/judges/[slug]/page.tsx:43`

The server component makes a fetch call to its own API endpoint during SSR:

```typescript
const response = await fetch(`${baseUrl}/api/judges/by-slug?slug=${slug}`, ...)
```

**Problem:** During Netlify build time:

- The production URL may not be live yet
- Self-referential fetches may fail with network errors
- Falls back to `getJudgeFallback()` which works but is slower

**Impact:** Slower initial page loads, potential build failures

#### 2. Invalid Date Handling in Structured Data (MEDIUM SEVERITY)

**Location:** `/lib/seo/structured-data.ts:617`

```typescript
new Date(judge.appointed_date).toLocaleDateString(...)
```

**Problem:** If `appointed_date` is null or invalid:

- Creates "Invalid Date"
- Causes serialization warnings
- Produces malformed JSON-LD

**Impact:** SEO degradation, schema.org validation failures

#### 3. Indefinite Redis Cache (DESIGN ISSUE)

**Location:** `/app/api/judges/[id]/analytics/route.ts:56`

```typescript
if (cachedRedis) {
  // Return cached data regardless of age to prevent regeneration costs
  return NextResponse.json({ analytics: cachedRedis.analytics, ... })
}
```

**Problem:**

- Analytics cached indefinitely in Redis (90-day TTL but served forever)
- No freshness checks
- Manual intervention required to update

**Impact:** Stale analytics data served to users

#### 4. Cache Strategy Mismatch (MEDIUM SEVERITY)

**Location:** `/app/judges/[slug]/page.tsx`

```typescript
export const revalidate = 0 // Force dynamic

// But then:
fetch(url, { next: { revalidate: 3600 } }) // Cache for 1 hour
```

**Problem:**

- Page marked as dynamic but data is cached
- Confusing cache behavior
- May serve stale data despite `revalidate: 0`

**Impact:** Inconsistent data freshness

#### 5. Environment Variable Dependencies (LOW-MEDIUM SEVERITY)

**Location:** `/lib/utils/baseUrl.ts`

Multiple environment variables checked in production:

```typescript
process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  'https://judgefinder.io'
```

**Problem:**

- If Netlify environment variables are not set correctly, wrong base URL is used
- API calls may go to wrong domain
- CORS issues if domains don't match

**Impact:** API call failures, CORS errors

---

## Production Debugging Checklist

When analytics fail to load in production:

### Step 1: Check Network Tab

- [ ] Verify `/api/judges/by-slug` returns 200 with judge data
- [ ] Verify `/api/judges/{id}/analytics` returns 200 with analytics data
- [ ] Check for CORS errors (should see Access-Control-Allow-Origin header)
- [ ] Verify response content-type is application/json
- [ ] Check if responses are cached (look for Cache-Control headers)

### Step 2: Check Console Errors

- [ ] Look for JSON parsing errors
- [ ] Look for "Invalid Date" in structured data
- [ ] Check for React hydration mismatches
- [ ] Verify no "Failed to fetch" errors

### Step 3: Check Environment Variables

```bash
# On Netlify, verify these are set:
NEXT_PUBLIC_SITE_URL=https://judgefinder.io
NEXT_PUBLIC_APP_URL=https://judgefinder.io
```

### Step 4: Check Cache Status

- [ ] Verify Redis is accessible (check Upstash dashboard)
- [ ] Check if analytics are cached (look at `data_source` in response)
- [ ] Clear Redis cache if needed: `redis-cli KEYS "judge:analytics:*" | xargs redis-cli DEL`

### Step 5: Check Build Logs

- [ ] Review Netlify build logs for fetch errors
- [ ] Check for TypeScript errors (builds ignore them but may indicate issues)
- [ ] Verify no warnings about JSON serialization

### Step 6: Test Fallback Paths

- [ ] Disable Redis temporarily to test database cache
- [ ] Test with judge that has no cached analytics
- [ ] Verify analytics generation works for cache miss

---

## Quick Fixes for Production Issues

### Fix 1: Disable Self-Referential API Call During Build

Add to `/app/judges/[slug]/page.tsx`:

```typescript
async function getJudge(slug: string): Promise<Judge | null> {
  // Skip API call during build - use direct DB query
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Build mode: Using direct database query')
    return await getJudgeFallback(slug)
  }

  // ... existing API call code
}
```

### Fix 2: Add Safe Date Formatting in Structured Data

Update `/lib/seo/structured-data.ts:617`:

```typescript
// BEFORE
text: judge.appointed_date
  ? `Judge ${judgeName} was appointed on ${new Date(judge.appointed_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
  : `Information about Judge ${judgeName}'s appointment date is available through official court records.`

// AFTER
text: judge.appointed_date
  ? (() => {
      try {
        const date = new Date(judge.appointed_date)
        if (isNaN(date.getTime())) throw new Error('Invalid date')
        return `Judge ${judgeName} was appointed on ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
      } catch {
        return `Information about Judge ${judgeName}'s appointment date is available through official court records.`
      }
    })()
  : `Information about Judge ${judgeName}'s appointment date is available through official court records.`
```

### Fix 3: Add Freshness Check to Redis Cache

Update `/app/api/judges/[id]/analytics/route.ts:52`:

```typescript
const cachedRedis = await redisGetJSON<{ analytics: CaseAnalytics; created_at: string }>(redisKey)
if (cachedRedis) {
  // Check if cache is older than 30 days
  const cacheAge = Date.now() - new Date(cachedRedis.created_at).getTime()
  const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days

  if (cacheAge < maxAge) {
    return NextResponse.json({
      analytics: cachedRedis.analytics,
      cached: true,
      data_source: 'redis_cache',
      last_updated: cachedRedis.created_at,
      rate_limit_remaining: remaining,
    })
  }

  logger.info('Redis cache expired, regenerating analytics', { judgeId: (await params).id })
}
```

### Fix 4: Align Cache Strategy

Choose one approach in `/app/judges/[slug]/page.tsx`:

**Option A: Fully Dynamic (Recommended)**

```typescript
export const revalidate = 0

// Remove fetch cache
const response = await fetch(`${baseUrl}/api/judges/by-slug?slug=${slug}`, {
  cache: 'no-store', // No cache
  headers: {
    'Cache-Control': 'no-cache',
  },
})
```

**Option B: ISR with Consistent Caching**

```typescript
export const revalidate = 3600 // Match fetch cache

const response = await fetch(`${baseUrl}/api/judges/by-slug?slug=${slug}`, {
  next: { revalidate: 3600 }, // Match page revalidate
  headers: {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
  },
})
```

---

## Architecture Recommendations

### Short Term (1-2 weeks)

1. Add comprehensive error handling to all Date operations in structured data
2. Implement cache freshness checks in analytics API
3. Add build-time detection for API calls
4. Align cache strategies across the application
5. Add extensive logging for production debugging

### Medium Term (1-2 months)

1. Move to direct database queries for server components (eliminate self-referential fetches)
2. Implement SWR or React Query for client-side analytics
3. Add background job for cache warming
4. Implement proper cache invalidation strategy
5. Add comprehensive integration tests for full request flow

### Long Term (3-6 months)

1. Migrate to edge functions for judge lookup (reduce latency)
2. Implement proper CDN caching strategy with Netlify
3. Add real-time analytics updates via WebSockets
4. Implement optimistic UI updates for better UX
5. Add comprehensive monitoring and alerting for production issues

---

_Document generated: 2025-10-10_
_Analysis based on codebase snapshot at commit: e29620b_
_Total files analyzed: 15_
_Critical issues found: 5_
_API endpoints traced: 2_
_Component flow depth: 4 levels_
