# Pagination System - Root Cause Analysis

**Date:** 2025-10-15
**Inspection:** Puppeteer Live Production Testing
**Target:** https://judgefinder.io/judges
**Status:** 🔴 **CRITICAL BUG CONFIRMED**

---

## Executive Summary

**Pagination is BROKEN in production** due to an **API caching issue**. The frontend code is correct, but the backend API endpoint at `/api/judges/list` is **ignoring the `page` parameter** and always returning page 1 data, regardless of what page is requested.

---

## Detailed Findings

### 1. Frontend Working Correctly ✅

**DOM Inspection Results:**

- ✅ Pagination component renders correctly
- ✅ Next/Previous buttons exist and are enabled
- ✅ Page number buttons (1, 2, 3, 4, ..., 80) render properly
- ✅ Event listeners attached (buttons are clickable)
- ✅ URL updates correctly when clicking pagination buttons

**Evidence:**

```
Pagination Container: ✅ Found
Next Button: ✅ Found (not disabled)
Previous Button: ✅ Found (disabled on page 1)
Page Number Buttons: 5 buttons found
Current Page: 1
Event Listeners: ✅ Attached
```

### 2. Network Requests Working Correctly ✅

When clicking pagination buttons, the **correct API requests are made**:

| User Action          | Request URL                        | Status    |
| -------------------- | ---------------------------------- | --------- |
| Click "Next" (1→2)   | `/api/judges/list?page=2&limit=24` | ✅ 200 OK |
| Click page "4"       | `/api/judges/list?page=4&limit=24` | ✅ 200 OK |
| Click "Previous"     | `/api/judges/list?page=3&limit=24` | ✅ 200 OK |
| Direct URL `?page=5` | `/api/judges/list?page=5&limit=24` | ✅ 200 OK |

**Conclusion:** Frontend is sending correct page parameters.

### 3. API Response BROKEN 🔴

**CRITICAL ISSUE:** All API responses return page 1 data, regardless of requested page!

**Evidence from Network Activity:**

```json
// Request: GET /api/judges/list?page=2&limit=24
{
  "judges": [...24 judges...],
  "page": 1,           // ❌ SHOULD BE 2
  "total_count": 1903,
  "has_more": true
}

// Request: GET /api/judges/list?page=4&limit=24
{
  "judges": [...24 judges...],
  "page": 1,           // ❌ SHOULD BE 4
  "total_count": 1903,
  "has_more": true
}

// Request: GET /api/judges/list?page=5&limit=24
{
  "judges": [...24 judges...],
  "page": 1,           // ❌ SHOULD BE 5
  "total_count": 1903,
  "has_more": true
}
```

**Result:** The UI always displays page 1 judges, even when requesting pages 2-5.

---

## Root Cause Analysis

### Suspected Issue: Redis Cache Key Problem

The API route uses Redis caching via `withRedisCache()`. The cache key is built using:

```typescript
const cacheKey = buildCacheKey('judges:list', {
  q: sanitizedQuery,
  limit,
  page, // ← Page is included in cache key
  jurisdiction,
  court_id,
  onlyWithDecisions,
  recentYears,
  includeDecisions,
})
```

**However, there are TWO potential problems:**

### Problem 1: Cache Key Not Including Page Number

If `buildCacheKey()` is not properly including the `page` parameter in the cache key, all requests would hit the same cached entry (page 1).

**Example of broken behavior:**

```
Request page 1 → Cached as "judges:list:default"
Request page 2 → Hits cache "judges:list:default" → Returns page 1 data ❌
Request page 4 → Hits cache "judges:list:default" → Returns page 1 data ❌
```

### Problem 2: Cache TTL Too Long

The cache TTL is set to 600 seconds (10 minutes) for browse results:

```typescript
const ttlSeconds = sanitizedQuery.trim() ? 120 : 600
```

If the cache key doesn't properly differentiate pages, page 1 gets cached for 10 minutes and serves stale data for all page requests.

---

## Investigation Workflow

### Step 1: Verify Cache Key Implementation

Check [lib/cache/redis.ts](../../lib/cache/redis.ts) to see how `buildCacheKey()` handles the page parameter.

**Expected:**

```typescript
export function buildCacheKey(prefix: string, params: Record<string, any>): string {
  // Should include ALL params including page
  const sortedKeys = Object.keys(params).sort()
  const keyParts = sortedKeys.map((key) => `${key}:${params[key]}`)
  return `${prefix}:${keyParts.join(':')}`
}
// Result: "judges:list:page:2:limit:24:jurisdiction:CA"
```

**If broken:**

```typescript
export function buildCacheKey(prefix: string, params: Record<string, any>): string {
  // Missing page parameter
  return `${prefix}:${params.jurisdiction || 'all'}`
}
// Result: "judges:list:CA" (same for all pages!)
```

### Step 2: Check Redis Cache Hits

The API response should include `X-Cache` header:

```typescript
response.headers.get('X-Cache') === 'HIT' // Cache hit
response.headers.get('X-Cache') === 'MISS' // Cache miss
```

**From our test:** All requests show cache HIT (likely returning cached page 1).

### Step 3: Verify Supabase Query

The query itself looks correct:

```typescript
const from = (page - 1) * limit  // page 2 → from = 24
const to = from + limit - 1      // to = 47

queryBuilder
  .from('judges')
  .select(...)
  .range(from, to)  // ✅ Correct range
```

**Conclusion:** The Supabase query would work correctly if the cache wasn't broken.

---

## Proof of Concept

### What SHOULD Happen:

```
User clicks page 2
  ↓
Frontend: setPage(2) + URL to ?page=2
  ↓
API Request: GET /api/judges/list?page=2&limit=24
  ↓
Cache Miss (unique key: "judges:list:page:2:...")
  ↓
Supabase Query: .range(24, 47) → judges 24-47
  ↓
Response: { page: 2, judges: [...24 new judges...] }
  ↓
Frontend: Renders judges 24-47 on page 2 ✅
```

### What IS Happening:

```
User clicks page 2
  ↓
Frontend: setPage(2) + URL to ?page=2
  ↓
API Request: GET /api/judges/list?page=2&limit=24
  ↓
Cache HIT (broken key: "judges:list:CA")  ❌
  ↓
Returns cached page 1 data
  ↓
Response: { page: 1, judges: [...same 24 judges...] }
  ↓
Frontend: Renders judges 0-23 again ❌
```

---

## Fix Required

### Option 1: Fix Cache Key (Recommended)

Update `buildCacheKey()` to properly include the `page` parameter:

```typescript
// lib/cache/redis.ts
export function buildCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedKeys = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null)
    .sort()

  const keyParts = sortedKeys.map((key) => {
    const value = params[key]
    return `${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`
  })

  return `${prefix}:${keyParts.join(':')}`
}
```

### Option 2: Disable Caching for Pagination (Quick Fix)

Temporarily disable Redis cache for the judges list endpoint:

```typescript
// app/api/judges/list/route.ts
// Remove the withRedisCache wrapper
const result = await fetchJudgesDirectly(page, limit, ...)
return NextResponse.json(result)
```

### Option 3: Use Per-Page Cache Keys Explicitly

Manually construct cache keys with page number:

```typescript
const cacheKey = `judges:list:page:${page}:limit:${limit}:jurisdiction:${jurisdiction}`
```

---

## Test Plan

After implementing the fix:

1. **Clear Redis cache**

   ```bash
   redis-cli FLUSHDB
   ```

2. **Test pagination in production**

   ```bash
   curl "https://judgefinder.io/api/judges/list?page=1&limit=24" | jq '.page'
   # Should return: 1

   curl "https://judgefinder.io/api/judges/list?page=2&limit=24" | jq '.page'
   # Should return: 2

   curl "https://judgefinder.io/api/judges/list?page=4&limit=24" | jq '.page'
   # Should return: 4
   ```

3. **Re-run Puppeteer inspection**

   ```bash
   npx ts-node scripts/inspect-pagination.ts
   # Should show 5/5 tests passed
   ```

4. **Manual testing**
   - Open https://judgefinder.io/judges
   - Click page 2 → Verify different judges appear
   - Click page 4 → Verify different judges appear
   - URL should show `?page=N`

---

## Impact Assessment

### Current State:

- 🔴 **Users cannot browse beyond page 1**
- 🔴 **Pagination appears broken (clicking does nothing)**
- 🔴 **Only 24 judges visible out of 1,903 total**
- 🔴 **98.7% of judges are inaccessible**

### After Fix:

- ✅ All 1,903 judges accessible
- ✅ Pagination works smoothly
- ✅ Users can navigate all 80 pages
- ✅ Proper caching per page (improved performance)

---

## Related Issues

### Previous Fixes (Not Related to This Bug):

- ✅ **e9f0834** - Fixed race condition in JudgesView.tsx (frontend)
- ✅ **e96883f** - Removed standalone output mode (deployment)
- ✅ **74d24ce** - Allow setPage when totalPages unknown (frontend)

**Note:** These fixes were correct and necessary, but they didn't address the backend caching bug.

---

## Recommendations

1. **URGENT:** Implement cache key fix (Option 1)
2. Deploy to production immediately
3. Clear Redis cache after deployment
4. Run Puppeteer inspection to verify
5. Add monitoring for pagination API responses
6. Add E2E tests for pagination to prevent regression

---

**Priority:** 🔴 **CRITICAL**
**Estimated Fix Time:** 30 minutes
**Deployment Risk:** Low (cache key change only)
**User Impact:** High (major functionality broken)

---

**Next Steps:**

1. Investigate `buildCacheKey()` implementation
2. Implement fix
3. Test locally
4. Deploy to production
5. Verify with Puppeteer
