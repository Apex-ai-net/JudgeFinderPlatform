# Judge Analytics Request Flow - Visual Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER NAVIGATES TO                                 │
│                    /judges/john-doe                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      NETLIFY CDN/EDGE                                     │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │  Middleware (Edge Runtime)                                   │        │
│  │  - Security headers                                          │        │
│  │  - CORS configuration                                        │        │
│  │  - Cache headers                                            │        │
│  │  - Judge redirects                                           │        │
│  └──────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               SERVER COMPONENT: page.tsx                                  │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │  1. Resolve params (slug)                                    │        │
│  │  2. getJudge(slug)                                           │        │
│  │     │                                                         │        │
│  │     ├─► API Call: /api/judges/by-slug                        │        │
│  │     │   └─► Judge data (with fallback)                       │        │
│  │     │                                                         │        │
│  │  3. getRelatedJudges()                                       │        │
│  │     └─► Direct Supabase queries                              │        │
│  │                                                               │        │
│  │  4. Generate metadata & structured data                      │        │
│  │     └─► ⚠️ Date serialization risk                            │        │
│  │                                                               │        │
│  │  5. Render JSX                                               │        │
│  │     ├─► Static components                                    │        │
│  │     └─► AnalyticsSlidersShell (lazy load)                    │        │
│  └──────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     HTML RESPONSE TO BROWSER                              │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │  - Static HTML with judge profile                            │        │
│  │  - Structured data JSON-LD                                   │        │
│  │  - Placeholder for analytics (loading state)                 │        │
│  │  - Client-side JS bundles                                    │        │
│  └──────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE HYDRATION                                  │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │  React hydrates server HTML                                  │        │
│  │  Suspense boundary resolves                                  │        │
│  │  Lazy load AnalyticsSliders component                        │        │
│  └──────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            CLIENT COMPONENT: AnalyticsSliders                             │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │  useEffect() triggers on mount                               │        │
│  │     │                                                         │        │
│  │     ▼                                                         │        │
│  │  fetch(/api/judges/{id}/analytics)                           │        │
│  │     │                                                         │        │
│  │     ├─► Analytics data (JSON)                                │        │
│  │     ├─► Dates as ISO strings                                 │        │
│  │     └─► Cache metadata                                       │        │
│  │                                                               │        │
│  │  Parse & format dates on client-side                         │        │
│  │  Render analytics sliders                                    │        │
│  └──────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Route: /api/judges/by-slug

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     GET /api/judges/by-slug?slug=john-doe                │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │   Validate Slug         │
                    │   - Format check        │
                    │   - Length check        │
                    └─────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │         lookupJudge(slug)                       │
        └─────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │                                                   │
        ▼                                                   ▼
┌───────────────┐                                  ┌───────────────┐
│ In-Memory     │  HIT (30 min)                    │ Strategy 1:   │
│ Cache Check   │────────────────────►             │ Direct Slug   │
│               │                                  │ Lookup        │
│ judge_lookup: │                                  │ SELECT *      │
│   {slug}      │                                  │ FROM judges   │
│               │  MISS                            │ WHERE slug=$1 │
└───────────────┘───────┐                          └───────────────┘
                        │                                  │
                        │                                  │ FOUND
                        │                                  ▼
                        │                          ┌───────────────┐
                        │                          │ Cache Result  │
                        │                          │ Return Judge  │
                        │                          └───────────────┘
                        │
                        │ NOT FOUND
                        ▼
                ┌───────────────┐
                │ Strategy 2:   │
                │ Fuzzy Slug    │
                │ Matching      │
                │ SELECT *      │
                │ WHERE slug    │
                │ ILIKE '%{}'%  │
                └───────────────┘
                        │
                        │ NOT FOUND
                        ▼
                ┌───────────────┐
                │ Strategy 3:   │
                │ Name-Based    │
                │ Lookup        │
                │ Convert slug  │
                │ to name       │
                │ Generate      │
                │ variations    │
                └───────────────┘
                        │
                        │ NOT FOUND
                        ▼
                ┌───────────────┐
                │ Strategy 4:   │
                │ Similarity    │
                │ Search        │
                │ Levenshtein   │
                │ distance      │
                └───────────────┘
                        │
                        ▼
                ┌───────────────┐
                │ Return 404    │
                │ with          │
                │ suggestions   │
                └───────────────┘
```

---

## API Route: /api/judges/[id]/analytics

```
┌─────────────────────────────────────────────────────────────────────────┐
│                GET /api/judges/{id}/analytics                             │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                        ┌─────────────────┐
                        │  Rate Limiting  │
                        │  20 req/min/IP  │
                        └─────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │         Cache Hierarchy (5 Layers)              │
        └─────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │                                                   │
        ▼                                                   ▼
┌───────────────┐                                  ┌───────────────┐
│  Layer 1:     │                                  │  Layer 2:     │
│  Redis Cache  │  HIT (90 days)                   │  Database     │
│               │─────────────────►                │  Cache        │
│ Key: judge:   │                                  │               │
│ analytics:    │                                  │ TABLE:        │
│ {id}          │                                  │ judge_        │
│               │  MISS                            │ analytics_    │
│ ⚠️ Served     │                                  │ cache         │
│ indefinitely  │                                  │               │
└───────────────┘                                  └───────────────┘
        │                                                  │
        │                                                  │ HIT
        │                                                  ▼
        │                                          ┌───────────────┐
        │                                          │ Return Cached │
        │                                          │ Analytics     │
        │                                          └───────────────┘
        │
        │ MISS
        ▼
┌───────────────────────────────────────────────────────┐
│         GENERATE NEW ANALYTICS                        │
├───────────────────────────────────────────────────────┤
│                                                       │
│  1. Fetch Judge Data                                 │
│     └─► SELECT id, name, court_id, jurisdiction...   │
│                                                       │
│  2. Calculate Lookback Window                        │
│     └─► startDate = now - LOOKBACK_YEARS (5 yrs)     │
│                                                       │
│  3. Fetch Cases                                      │
│     └─► SELECT case_type, outcome, status...         │
│         FROM cases                                   │
│         WHERE judge_id = $1                          │
│         AND filing_date >= $2                        │
│         LIMIT {CASE_FETCH_LIMIT} (1000)              │
│                                                       │
│  4. Enrich Cases with Opinions                       │
│     └─► enrichWithOpinions(supabase, cases)          │
│                                                       │
│  5. Generate Analytics                               │
│     ├─► No cases: computeLegacy()                    │
│     └─► With cases:                                  │
│         ├─► computeStatistical()                     │
│         └─► enhanceWithAI() (if API keys present)    │
│                                                       │
└───────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │         Cache Results                           │
        ├─────────────────────────────────────────────────┤
        │  Redis:    90-day TTL, served indefinitely      │
        │  Database: Permanent until manual refresh       │
        └─────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │         Return JSON Response                    │
        ├─────────────────────────────────────────────────┤
        │  {                                              │
        │    analytics: CaseAnalytics,                    │
        │    cached: false,                               │
        │    data_source: 'case_analysis',                │
        │    document_count: 1000,                        │
        │    rate_limit_remaining: 19                     │
        │  }                                              │
        └─────────────────────────────────────────────────┘
```

---

## Data Serialization Path

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL/Supabase)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  judges table:                                                          │
│    appointed_date: TIMESTAMP → "2015-06-15T00:00:00.000Z"              │
│    created_at: TIMESTAMP     → "2024-01-15T10:30:00.000Z"              │
│    updated_at: TIMESTAMP     → "2024-10-10T14:22:00.000Z"              │
│                                                                         │
│  judge_analytics_cache table:                                          │
│    analytics: JSONB          → Stored as JSON                          │
│    created_at: TIMESTAMP     → "2024-10-10T08:00:00.000Z"              │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Supabase Client (JSON)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Server-Side JavaScript Objects                        │
├─────────────────────────────────────────────────────────────────────────┤
│  judge = {                                                              │
│    appointed_date: "2015-06-15T00:00:00.000Z",  // ✅ String           │
│    created_at: "2024-01-15T10:30:00.000Z",      // ✅ String           │
│    updated_at: "2024-10-10T14:22:00.000Z"       // ✅ String           │
│  }                                                                      │
│                                                                         │
│  analytics = {                                                          │
│    generated_at: new Date().toISOString(),      // ✅ String           │
│    last_updated: new Date().toISOString(),      // ✅ String           │
│    ...metrics                                                           │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ NextResponse.json()
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Response (JSON)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  HTTP/1.1 200 OK                                                        │
│  Content-Type: application/json                                         │
│  Cache-Control: public, s-maxage=3600, ...                             │
│                                                                         │
│  {                                                                      │
│    "judge": {                                                           │
│      "appointed_date": "2015-06-15T00:00:00.000Z",  // ✅ JSON String  │
│      "created_at": "2024-01-15T10:30:00.000Z"       // ✅ JSON String  │
│    }                                                                    │
│  }                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ Browser fetch()
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Client-Side JavaScript                                │
├─────────────────────────────────────────────────────────────────────────┤
│  const data = await response.json()                                     │
│                                                                         │
│  // Dates are still strings, parsed on-demand:                         │
│  const date = new Date(data.analytics.generated_at)  // ✅ Safe        │
│  const formatted = formatDateTime(data.analytics.last_updated)          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Structured Data Serialization (⚠️ RISK AREA)

```
┌─────────────────────────────────────────────────────────────────────────┐
│              generateJudgeStructuredData(judge, slug, baseUrl)           │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                │                                   │
                ▼                                   ▼
    ┌──────────────────────┐          ┌──────────────────────┐
    │  Review Schema       │          │  FAQ Schema          │
    │  Line 435:           │          │  Line 617:           │
    │                      │          │                      │
    │  datePublished:      │          │  ⚠️ RISK:             │
    │  new Date()          │          │  new Date(           │
    │    .toISOString()    │          │    appointed_date    │
    │    .split('T')[0]    │          │  ).toLocaleDateString│
    │                      │          │  ()                  │
    │  ✅ Returns String    │          │                      │
    │  "2024-10-10"        │          │  If appointed_date   │
    │                      │          │  is null/invalid:    │
    │                      │          │  → "Invalid Date"    │
    └──────────────────────┘          └──────────────────────┘
                │                                   │
                │                                   │
                ▼                                   ▼
    ┌──────────────────────────────────────────────────┐
    │  WebPage Schema                                  │
    │  Line 698:                                       │
    │                                                  │
    │  dateModified: new Date().toISOString()          │
    │                                                  │
    │  ✅ Returns String                                │
    │  "2024-10-10T15:30:00.000Z"                      │
    └──────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │  Structured data array (lines 28-70)            │
        │  Returns: any[]                                 │
        └─────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │  Server Component (page.tsx:259)                │
        │  try {                                          │
        │    structuredDataJson = JSON.stringify(         │
        │      generateJudgeStructuredData(...)           │
        │    )                                            │
        │  } catch (error) {                              │
        │    console.error(...)                           │
        │    structuredDataJson = '[]'                    │
        │  }                                              │
        └─────────────────────────────────────────────────┘
                                  │
                                  │ If "Invalid Date" in FAQ
                                  ▼
        ┌─────────────────────────────────────────────────┐
        │  JSON-LD in HTML                                │
        │  <script type="application/ld+json">            │
        │    [...structured data with "Invalid Date"]     │
        │  </script>                                      │
        │                                                 │
        │  ⚠️ SEO Impact: Schema validation fails          │
        │  ⚠️ Google may not parse correctly               │
        └─────────────────────────────────────────────────┘
```

---

## Build vs Runtime Behavior

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BUILD TIME (Netlify)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────┐
    │  next build                                          │
    │  └─► Generates static pages                          │
    │      └─► For dynamic routes with generateStaticParams│
    │          or on-demand ISR                            │
    └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────┐
    │  Server Component executes                           │
    │  └─► getJudge(slug)                                  │
    │      └─► fetch(`${baseUrl}/api/judges/by-slug`)     │
    │          ├─► baseUrl = "https://judgefinder.io"     │
    │          │   (or NEXT_PUBLIC_SITE_URL)              │
    │          │                                           │
    │          └─► ⚠️ PROBLEM:                             │
    │              Production URL may not be live yet!    │
    │              Build happens BEFORE deployment        │
    └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
        ┌────────────────────────────────────────┐
        │  Possible outcomes:                    │
        │  1. Fetch times out → getJudgeFallback │
        │  2. Fetch fails → getJudgeFallback     │
        │  3. Fetch succeeds (if domain is live) │
        └────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────┐
    │  Build completes with:                               │
    │  - Static HTML (may have fallback data)              │
    │  - Serverless functions deployed                     │
    │  - Client-side JS bundles                            │
    └──────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       RUNTIME (User Request)                             │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────┐
    │  User navigates to /judges/john-doe                  │
    │  └─► export const revalidate = 0                     │
    │      (Force dynamic rendering)                       │
    └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────┐
    │  Server Component executes fresh                     │
    │  └─► getJudge(slug)                                  │
    │      └─► fetch(`${baseUrl}/api/judges/by-slug`)     │
    │          ├─► baseUrl = "https://judgefinder.io"     │
    │          │   (matches current domain)               │
    │          │                                           │
    │          └─► ✅ SUCCESS:                             │
    │              Same-origin fetch works                │
    │              CORS headers allow it                  │
    │              Middleware sets proper headers         │
    └──────────────────────────────────────────────────────┘
                                  │
                                  ▼
    ┌──────────────────────────────────────────────────────┐
    │  Response served to user with:                       │
    │  - Fresh judge data                                  │
    │  - Static HTML shell                                 │
    │  - Client components hydrate                         │
    │  - Analytics load via client fetch                   │
    └──────────────────────────────────────────────────────┘
```

---

## Cache Invalidation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Cache Invalidation Triggers                           │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        │                                                   │
        ▼                                                   ▼
┌───────────────┐                                  ┌───────────────┐
│  Manual       │                                  │  Automatic    │
│  Refresh      │                                  │  Expiry       │
│               │                                  │               │
│  POST /api/   │                                  │  Redis:       │
│  judges/{id}/ │                                  │  90 days      │
│  analytics    │                                  │               │
│  ?force=true  │                                  │  In-Memory:   │
│               │                                  │  30 min       │
└───────────────┘                                  └───────────────┘
        │                                                   │
        ▼                                                   ▼
┌───────────────────────────────────────────────────────────────────┐
│  Clear Cache                                                      │
│  ├─► DELETE FROM judge_analytics_cache WHERE judge_id = $1       │
│  ├─► Redis: DEL judge:analytics:{id}                             │
│  └─► In-Memory: cache.delete('judge_lookup:{slug}')              │
└───────────────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────────────────┐
│  Regenerate Analytics                                             │
│  └─► Follow full analytics generation flow                       │
└───────────────────────────────────────────────────────────────────┘

⚠️ CURRENT ISSUE: Redis cache is served indefinitely (no freshness check)
   - Once cached, analytics never regenerate automatically
   - Requires manual intervention to update
```

---

_Diagram generated: 2025-10-10_
_Based on codebase analysis at commit: e29620b_
