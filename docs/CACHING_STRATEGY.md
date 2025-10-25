# Caching Strategy

This document outlines JudgeFinder's caching strategy for API endpoints and static resources.

## Overview

JudgeFinder uses a multi-layer caching approach:

1. **CDN/Edge Caching** - Netlify CDN for public API responses
2. **Database Caching** - Materialized views and query result caching
3. **In-Memory Caching** - Redis for rate limiting and session data
4. **Client Caching** - Browser cache for static assets

## API Response Caching

### Cache Headers

All public API endpoints use standardized cache headers:

```typescript
{
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  'Vary': 'Accept-Encoding, Accept-Language',
  'CDN-Cache-Control': 'max-age=3600',
  'Cache-Tag': 'resource-type, filter1, filter2'
}
```

**Header Breakdown:**

- `Cache-Control: public` - Response can be cached by any cache (CDN, proxy, browser)
- `s-maxage=3600` - Shared caches (CDN) can serve cached response for 1 hour
- `stale-while-revalidate=86400` - Can serve stale content for 24 hours while fetching fresh data in background
- `Vary` - Cache keys must include these headers to prevent serving wrong content
- `CDN-Cache-Control` - Netlify-specific cache directive
- `Cache-Tag` - Allows targeted cache invalidation

### Endpoints with Caching

#### Courts API (`/api/courts`)

**Cache Duration:** 1 hour
**Stale-While-Revalidate:** 24 hours
**Cache Tags:**

- `courts` (all requests)
- `jurisdiction:{jurisdiction}` (if filtered)
- `type:{type}` (if filtered)
- `county:{county}` (if filtered)

**Invalidation:**

- Automatic after 1 hour
- Manual via cache tag purge when court data updates

**Implementation:**

```typescript
// app/api/courts/route.ts
response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
response.headers.set('Vary', 'Accept-Encoding, Accept-Language')
response.headers.set('CDN-Cache-Control', 'max-age=3600')

const cacheTags = ['courts']
if (jurisdiction) cacheTags.push(`jurisdiction:${jurisdiction}`)
if (type) cacheTags.push(`type:${type}`)
if (county) cacheTags.push(`county:${county}`)
response.headers.set('Cache-Tag', cacheTags.join(','))
```

#### Judges API (`/api/judges/list`)

**Cache Duration:** 30 minutes
**Cache Strategy:** Similar to courts, but shorter duration due to more frequent updates

#### Static Search Data

**Cache Duration:** 24 hours
**Cache Strategy:** Aggressive caching with long stale-while-revalidate

## Query Parameter Handling

### Cache Key Inclusion

The `Vary` header ensures different query parameters result in different cache entries:

```
URL: /api/courts?jurisdiction=CA&county=Los Angeles
Cache Key: courts:CA:Los_Angeles

URL: /api/courts?jurisdiction=CA&county=Orange
Cache Key: courts:CA:Orange
```

### Netlify Cache Behavior

Netlify CDN automatically includes query parameters in cache keys. Our `Vary` headers ensure proper cache key generation for:

- Different languages (`Accept-Language`)
- Different encodings (`Accept-Encoding`)
- Different query parameters (implicit)

## Cache Invalidation

### Automatic Invalidation

- **Time-based:** All cached responses expire after `s-maxage` duration
- **Stale content:** Served during revalidation for better UX

### Manual Invalidation

For immediate updates (e.g., admin data changes):

```bash
# Purge by cache tag (Netlify)
curl -X POST https://api.netlify.com/api/v1/purge \
  -H "Authorization: Bearer $NETLIFY_TOKEN" \
  -d '{"cache_tags": ["courts"]}'
```

### Invalidation Triggers

1. **Court data update** → Purge `courts` tag
2. **Judge data update** → Purge `judges` tag
3. **Jurisdiction change** → Purge `jurisdiction:{code}` tag
4. **County data update** → Purge `county:{name}` tag

## Database Caching

### Materialized Views

Used for expensive aggregations:

```sql
-- Judge case counts (refreshed nightly)
CREATE MATERIALIZED VIEW judge_case_counts AS
SELECT judge_id, COUNT(*) as total_cases
FROM cases
GROUP BY judge_id;

-- Refresh strategy
REFRESH MATERIALIZED VIEW CONCURRENTLY judge_case_counts;
```

**Refresh Schedule:**

- Nightly at 2 AM PST via cron job
- On-demand via admin dashboard

### Query Result Caching

Supabase automatically caches query results for 5 minutes. We supplement with:

1. **Application-level caching** for expensive joins
2. **Memoization** for repeated queries in single request
3. **Computed columns** for common calculations

## Rate Limiting Cache

Redis is used for rate limiting state:

```typescript
// lib/security/rate-limit.ts
const rateLimiter = buildRateLimiter({
  tokens: 180,
  window: '1 m',
  prefix: 'api:courts:list',
})
```

**TTL:** Matches rate limit window (60 seconds)

## Client-Side Caching

### Browser Cache

Static assets are cached aggressively:

```
Cache-Control: public, max-age=31536000, immutable
```

### API Response Cache

Browsers cache API responses per `Cache-Control` headers:

- **Public APIs:** Cached for `max-age` duration
- **User-specific data:** `private` cache control
- **Dynamic content:** `no-cache` or short TTL

## Performance Metrics

### Target Metrics

- **Cache Hit Rate:** > 80% for static endpoints
- **TTFB (Time to First Byte):** < 100ms (cached)
- **API Response Time:** < 200ms (cached), < 500ms (uncached)

### Monitoring

```typescript
// Track cache performance
response.headers.set('X-Cache-Status', cacheHit ? 'HIT' : 'MISS')
response.headers.set('X-Cache-Age', cacheAge.toString())
```

## Best Practices

### DO:

✅ Use appropriate `s-maxage` for data staleness tolerance
✅ Include `Vary` headers for content negotiation
✅ Add cache tags for granular invalidation
✅ Use `stale-while-revalidate` for better UX
✅ Monitor cache hit rates and adjust TTLs

### DON'T:

❌ Cache user-specific data with `public`
❌ Set extremely long TTLs without invalidation strategy
❌ Forget to include query params in cache keys
❌ Cache error responses for too long
❌ Ignore `Vary` header requirements

## Debugging

### Check Cache Status

```bash
# Test cache headers
curl -I https://judgefinder.io/api/courts?jurisdiction=CA

# Expected headers:
# Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
# Vary: Accept-Encoding, Accept-Language
# CDN-Cache-Control: max-age=3600
# Cache-Tag: courts,jurisdiction:CA
```

### Verify Cache Behavior

1. Make request → Check response time (should be slow)
2. Make same request → Check `X-Cache-Status: HIT` (should be fast)
3. Wait for TTL expiration → Check revalidation

### Common Issues

**Issue:** Different query params returning same response
**Fix:** Ensure `Vary` header includes relevant parameters

**Issue:** Stale data after update
**Fix:** Implement cache tag purging after data mutations

**Issue:** Cache not working in development
**Fix:** Verify `NODE_ENV=production` or use CDN preview URL

## Future Enhancements

1. **Smart Cache Warming** - Pre-populate cache for popular queries
2. **Adaptive TTLs** - Adjust cache duration based on update frequency
3. **Edge Computing** - Move more logic to CDN edge for faster responses
4. **GraphQL Caching** - Implement query-level caching for GraphQL endpoints
5. **Real-time Invalidation** - WebSocket-based cache invalidation for instant updates

## Related Documentation

- [Performance Optimization Guide](./PERFORMANCE.md)
- [API Documentation](./API.md)
- [Database Schema](./database/)
