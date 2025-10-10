# 🏗️ JudgeFinder.io Architecture & Issue Map

Visual representation of where issues are occurring in the system.

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS / BROWSERS                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ HTTPS
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NETLIFY CDN / EDGE                          │
│                   ✅ SSL/TLS Certificate                         │
│                   ✅ Geographic Distribution                     │
│                   ✅ DDoS Protection                             │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌────────────────┐   ┌────────────────────────────────┐
│  STATIC FILES  │   │   SERVERLESS FUNCTIONS         │
│   ✅ WORKING   │   │   ❌ FAILING (500 Errors)      │
│                │   │                                │
│ • HTML Pages   │   │ • /api/judges/list            │
│ • CSS/JS       │   │ • /api/judges/search          │
│ • Images       │   │ • /api/search                 │
│ • Fonts        │   │ • /api/health                 │
└────────────────┘   └────────────┬───────────────────┘
                                  │
                                  │ ❌ MISSING ENV VARS
                                  │ ❌ DATABASE ERRORS
                                  ▼
                    ┌─────────────────────────┐
                    │  EXTERNAL SERVICES      │
                    └─────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   SUPABASE DB    │   │   CLERK AUTH     │   │  UPSTASH REDIS   │
│  ⚠️ BROKEN FUNC   │   │   ✅ CONFIGURED   │   │  ✅ CONFIGURED   │
│                  │   │                  │   │                  │
│ • 1,903 judges   │   │ • Auth keys set  │   │ • Rate limiting  │
│ • 442K cases     │   │ • Users active   │   │ • Caching ready  │
│ • search_judges  │   └──────────────────┘   └──────────────────┘
│   _ranked()      │
│   🔴 TYPE ERROR  │
└──────────────────┘
```

---

## Issue Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                  USER SEARCHES FOR "SMITH"                        │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │  Frontend React App    │
            │  ✅ Loads correctly    │
            └────────────┬───────────┘
                         │
                         │ POST /api/judges/search?q=smith
                         ▼
            ┌────────────────────────────────┐
            │  Netlify Serverless Function   │
            │  route.ts (search)              │
            └────────────┬───────────────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
  ┌────────────────┐      ┌─────────────────────┐
  │ Check ENV Vars │      │ Rate Limit Check    │
  │ ❌ FAILS HERE  │      │ ✅ Would work       │
  │                │      │                     │
  │ SUPABASE_URL?  │      │ Redis connection OK │
  │ SERVICE_KEY?   │      └─────────────────────┘
  │ ❌ NOT SET     │
  └────────┬───────┘
           │
           │ throw Error("Missing env vars")
           ▼
  ┌─────────────────┐
  │  Return 500     │
  │  Internal Error │
  └─────────────────┘


Alternative path IF env vars were set:

            ┌────────────────────────────────┐
            │  Create Supabase Client        │
            │  ✅ Would connect              │
            └────────────┬───────────────────┘
                         │
                         │ Call: search_judges_ranked('smith', ...)
                         ▼
            ┌────────────────────────────────┐
            │  PostgreSQL Function           │
            │  🔴 TYPE MISMATCH ERROR        │
            │                                │
            │  Returns VARCHAR(500)          │
            │  Function expects TEXT         │
            └────────────┬───────────────────┘
                         │
                         │ PostgreSQL Error 42804
                         ▼
            ┌────────────────────────────────┐
            │  Return 500                    │
            │  "Structure does not match"    │
            └────────────────────────────────┘
```

---

## Error Cascade

```
1. USER REQUEST
   └─> https://judgefinder.io/api/judges/search?q=smith
       │
       ▼
2. NETLIFY RECEIVES REQUEST ✅
   └─> Routes to serverless function
       │
       ▼
3. SERVERLESS FUNCTION STARTS
   └─> Tries to import dependencies ✅
       │
       ▼
4. ENVIRONMENT CHECK
   └─> process.env.NEXT_PUBLIC_SUPABASE_URL
       │
       ├─> ❌ NOT FOUND → Return 500 (CURRENT STATE)
       │
       └─> ✅ IF FOUND → Continue
           │
           ▼
5. SUPABASE CLIENT CREATION
   └─> createServerClient()
       │
       └─> ✅ Client created
           │
           ▼
6. DATABASE QUERY
   └─> supabase.rpc('search_judges_ranked', {...})
       │
       └─> ❌ PostgreSQL Type Error (BLOCKING)
           │
           │   Error Code: 42804
           │   "character varying(500) does not match type text"
           │
           ▼
7. ERROR RESPONSE
   └─> HTTP 500: Internal Server Error
```

---

## Critical Path to Recovery

```
PROBLEM 1: Missing Environment Variables
┌─────────────────────────────────────────┐
│ Netlify Functions                       │
│                                         │
│ Current:  ❌ No env vars                │
│ Fix:      Add vars via Netlify CLI     │
│ Time:     20 minutes                    │
│ Impact:   APIs can connect to database │
└─────────────────────────────────────────┘
                    │
                    ▼
PROBLEM 2: Database Function Type Mismatch
┌─────────────────────────────────────────┐
│ PostgreSQL Function                     │
│                                         │
│ Current:  returns TEXT (wrong)          │
│ Fix:      Apply migration to VARCHAR    │
│ Time:     10 minutes                    │
│ Impact:   Search queries succeed        │
└─────────────────────────────────────────┘
                    │
                    ▼
REBUILD: Clear cache and redeploy
┌─────────────────────────────────────────┐
│ Netlify Build                           │
│                                         │
│ Action:   Clear cache + deploy          │
│ Time:     5 minutes                     │
│ Impact:   Apply all fixes               │
└─────────────────────────────────────────┘
                    │
                    ▼
✅ SITE FUNCTIONAL
```

---

## Component Health Matrix

| Component             | Status        | Issue            | Fix Priority |
| --------------------- | ------------- | ---------------- | ------------ |
| **Frontend**          |
| Next.js App           | ✅ Working    | None             | -            |
| React Components      | ✅ Working    | None             | -            |
| Static Assets         | ✅ Serving    | None             | -            |
| Client Routing        | ✅ Working    | None             | -            |
| **Backend**           |
| Serverless Functions  | ❌ Failing    | No env vars      | 🔴 Critical  |
| API Routes            | ❌ 500 Errors | Dependencies     | 🔴 Critical  |
| Rate Limiting         | ✅ Configured | None             | -            |
| Error Handling        | ✅ Working    | None             | -            |
| **Database**          |
| Supabase Connection   | ⚠️ Blocked    | No credentials   | 🔴 Critical  |
| Judges Table          | ✅ Healthy    | None             | -            |
| Cases Table           | ✅ Healthy    | None             | -            |
| Search Function       | ❌ Broken     | Type mismatch    | 🔴 Critical  |
| Indexes               | ✅ Working    | None             | -            |
| **External Services** |
| Clerk Auth            | ✅ Configured | None             | -            |
| Upstash Redis         | ✅ Configured | None             | -            |
| Sentry                | ⚠️ Partial    | Not fully set up | ⚠️ Medium    |
| CourtListener         | ✅ Configured | None             | -            |
| **Infrastructure**    |
| Netlify CDN           | ✅ Working    | None             | -            |
| SSL/TLS               | ✅ Active     | None             | -            |
| DNS                   | ✅ Resolving  | None             | -            |
| Edge Functions        | ✅ Deployed   | None             | -            |

---

## Data Flow (Normal Operation)

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Browser │───▶│ Netlify  │───▶│   API    │───▶│ Supabase │
│         │◀───│   CDN    │◀───│ Function │◀───│ Database │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
    │              │                 │               │
    │              │                 │               │
    ▼              ▼                 ▼               ▼
 React UI      Static Files    Business Logic    Data Layer
 ✅ Works      ✅ Works         ❌ Broken         ⚠️ Partial
```

---

## Environment Variable Dependency Tree

```
API Functionality
├── Database Access
│   ├── NEXT_PUBLIC_SUPABASE_URL ❌
│   ├── NEXT_PUBLIC_SUPABASE_ANON_KEY ❌
│   ├── SUPABASE_SERVICE_ROLE_KEY ❌
│   └── SUPABASE_JWT_SECRET ❌
│
├── Authentication
│   ├── NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ❌
│   └── CLERK_SECRET_KEY ❌
│
├── Rate Limiting
│   ├── UPSTASH_REDIS_REST_URL ❌
│   └── UPSTASH_REDIS_REST_TOKEN ❌
│
├── Security
│   ├── ENCRYPTION_KEY ❌
│   ├── SYNC_API_KEY ❌
│   └── CRON_SECRET ❌
│
└── Monitoring (Optional)
    ├── SENTRY_DSN (⚠️ Recommended)
    └── NEXT_PUBLIC_GA_MEASUREMENT_ID (⚠️ Recommended)
```

---

## Fix Sequence Diagram

```
Developer                 Supabase              Netlify              Production Site
    │                        │                     │                       │
    │ 1. Apply Migration     │                     │                       │
    ├───────────────────────▶│                     │                       │
    │   search_judges_       │                     │                       │
    │   ranked() fix         │                     │                       │
    │                        │ ✅ Updated          │                       │
    │                        │                     │                       │
    │ 2. Set Env Vars        │                     │                       │
    ├────────────────────────┼────────────────────▶│                       │
    │   netlify env:set      │                     │                       │
    │   (11 variables)       │                     │                       │
    │                        │                     │ ✅ Configured         │
    │                        │                     │                       │
    │ 3. Trigger Rebuild     │                     │                       │
    ├────────────────────────┼────────────────────▶│                       │
    │   Clear cache          │                     │                       │
    │   + deploy             │                     │                       │
    │                        │                     │ ⏳ Building...        │
    │                        │                     │                       │
    │                        │                     │ ✅ Deploy Complete    │
    │                        │                     ├──────────────────────▶│
    │                        │                     │                       │
    │                        │                     │                  ✅ SITE LIVE
    │                        │                     │                       │
    │ 4. Verify              │                     │                       │
    ├────────────────────────┼─────────────────────┼──────────────────────▶│
    │   Test endpoints       │                     │                       │
    │◀────────────────────────┼─────────────────────┼───────────────────────┤
    │   ✅ 200 OK            │                     │                       │
```

---

## System Recovery Phases

### Phase 1: Emergency Triage ✅ COMPLETE

- [x] Identify critical failures
- [x] Map error sources
- [x] Document issues
- [x] Create recovery plan

### Phase 2: Database Fix ⏳ PENDING

- [ ] Apply search function migration
- [ ] Verify function works
- [ ] Test queries succeed
- **Estimated**: 10 minutes

### Phase 3: Configuration ⏳ PENDING

- [ ] Set environment variables
- [ ] Verify credentials
- [ ] Check access permissions
- **Estimated**: 20 minutes

### Phase 4: Deployment ⏳ PENDING

- [ ] Clear build cache
- [ ] Trigger rebuild
- [ ] Monitor deploy progress
- **Estimated**: 5 minutes

### Phase 5: Verification ⏳ PENDING

- [ ] Test all API endpoints
- [ ] Verify search works
- [ ] Check error rates
- **Estimated**: 15 minutes

### Phase 6: Optimization (Optional)

- [ ] Generate analytics cache
- [ ] Set up monitoring
- [ ] Configure alerts
- **Estimated**: 1 hour

---

## Quick Reference: Where Things Are

```
📁 JudgeFinderPlatform/
├── 📊 RECOVERY_SUMMARY.md ← START HERE (executive summary)
├── 📋 docs/
│   ├── SITE_DIAGNOSTIC_REPORT_2025_10_10.md ← DETAILED ANALYSIS
│   ├── QUICK_FIX_GUIDE.md ← FAST RECOVERY STEPS
│   ├── ARCHITECTURE_ISSUES_DIAGRAM.md ← THIS FILE
│   └── search/
│       └── DATABASE_SEARCH_FIX_REQUIRED.md ← DB FIX DETAILS
├── 🔧 scripts/
│   └── emergency-recovery.sh ← AUTOMATED RECOVERY
└── 🗄️ supabase/
    └── migrations/
        └── 20251001_002_fix_search_function_return_type.sql ← DATABASE FIX
```

---

## Success Indicators

When recovery is complete, you should see:

```bash
# Health check
$ curl https://judgefinder.io/api/health
{
  "status": "healthy",
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "memory": "healthy"
  }
}

# Judge list
$ curl https://judgefinder.io/api/judges/list?limit=5
{
  "judges": [...],
  "total_count": 1903,
  "page": 1
}

# Search
$ curl https://judgefinder.io/api/judges/search?q=smith
{
  "results": [...],
  "total_count": 15
}
```

---

**Last Updated**: October 10, 2025  
**Document Purpose**: Visual guide to system architecture and issue locations  
**Use Case**: Understanding where problems occur and how components interact
