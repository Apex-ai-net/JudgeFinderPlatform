# CourtListener API - Quick Reference Card

**API Version**: v4
**Base URL**: `https://www.courtlistener.com/api/rest/v4`
**Auth Method**: Token-based (`Authorization: Token YOUR_KEY`)

---

## Rate Limits

| Tier | Limit | Notes |
|------|-------|-------|
| Authenticated | 5,000 req/hour | ~83 req/min, 1.4 req/sec |
| Unauthenticated | 100 req/hour | Not recommended |

**Current Implementation**: 1 req/sec (3,600/hour) - ✅ Compliant

---

## Critical Headers

### Request Headers
```http
Authorization: Token YOUR_COURTLISTENER_API_KEY
Accept: application/json
User-Agent: JudgeFinder/1.0 (https://judgefinder.io)
```

### Response Headers (Rate Limiting)
```http
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

---

## Common Endpoints

### Judges/People
```http
GET /people/                    # List all judges
GET /people/{id}/              # Get specific judge
GET /people/?name=Smith        # Search by name
GET /people/?positions__court__state=ca  # Filter by state
```

### Opinions
```http
GET /opinions/                              # List opinions
GET /opinions/{id}/                        # Get specific opinion
GET /opinions/?author={judge_id}           # Filter by author
GET /opinions/?cluster__date_filed__gte=2023-01-01  # Date range
```

### Dockets
```http
GET /dockets/                           # List dockets
GET /dockets/{id}/                     # Get specific docket
GET /dockets/?assigned_to_id={id}      # Filter by judge
GET /dockets/?date_filed__gte=2023-01-01  # Date range
```

### Clusters
```http
GET /clusters/{id}/                    # Get opinion cluster
GET /clusters/?date_filed__gte=2023-01-01  # Recent clusters
```

### Courts
```http
GET /courts/                    # List all courts
GET /courts/{id}/              # Get specific court
GET /courts/?jurisdiction=F    # Federal courts only
```

---

## Common Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `format` | Response format | `format=json` (always required) |
| `page_size` | Results per page | `page_size=50` (max: 100) |
| `offset` | Pagination offset | `offset=50` |
| `ordering` | Sort field | `ordering=-date_modified` |
| `fields` | Field selection | `fields=id,name,positions` |

### Date Filtering
```http
?date_filed__gte=2023-01-01        # Greater than or equal
?date_filed__lte=2023-12-31        # Less than or equal
?date_filed=2023-06-15             # Exact match
```

### Nested Filtering
```http
?positions__court__state=ca              # Judge's court state
?cluster__date_filed__gte=2023-01-01    # Opinion cluster date
?author__name=Smith                      # Author name
```

---

## Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 304 | Not Modified (ETag) | Use cached data |
| 400 | Bad Request | Fix query parameters |
| 401 | Unauthorized | Check API key |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Rate Limit | Wait and retry |
| 500 | Server Error | Retry with backoff |
| 503 | Service Unavailable | Retry with backoff |

---

## Retry Strategy

### JudgeFinder Implementation
```typescript
// Exponential backoff with jitter
delay = Math.min(1000 * 2^attempt + random(0, 500), 15000)

// Special handling
if (status === 429) {
  delay *= 1.5  // 50% longer for rate limits
}

// Respect Retry-After header
if (retryAfter) {
  delay = retryAfter * 1000
}
```

### Max Retries
- Default: 5 attempts
- Total time: Up to ~30 seconds
- Circuit breaker: Opens after 5 consecutive failures

---

## Pagination Patterns

### Cursor-Based (Recommended)
```typescript
let cursor = null
while (cursor !== null) {
  const response = await fetch(cursor || '/people/?format=json&page_size=50')
  cursor = response.next
  // Process results...
}
```

### Offset-Based
```typescript
for (let offset = 0; offset < totalCount; offset += 50) {
  const response = await fetch(`/people/?format=json&page_size=50&offset=${offset}`)
  // Process results...
}
```

---

## Performance Optimization

### Field Selection (50-70% size reduction)
```http
# Instead of:
GET /people/{id}/?format=json

# Use:
GET /people/{id}/?format=json&fields=id,name,positions
```

### ETag Caching
```http
# First request
GET /people/{id}/?format=json
# Response: ETag: "abc123"

# Subsequent request
GET /people/{id}/?format=json
If-None-Match: "abc123"
# Response: 304 Not Modified (no body)
```

---

## Example Workflows

### Get Judge's Recent Opinions
```typescript
// 1. Get judge ID
const judges = await fetch('/people/?name=Smith&format=json')
const judgeId = judges.results[0].id

// 2. Get recent opinions
const opinions = await fetch(
  `/opinions/?author=${judgeId}&cluster__date_filed__gte=2024-01-01&format=json`
)

// 3. Get opinion details
for (const opinion of opinions.results) {
  const cluster = await fetch(`/clusters/${opinion.cluster}/?format=json`)
  console.log(cluster.case_name)
}
```

### Get Judge's Active Dockets
```typescript
const judgeId = '12345'
const dockets = await fetch(
  `/dockets/?assigned_to_id=${judgeId}&status=Open&format=json&ordering=-date_filed`
)
```

---

## Environment Variables

```bash
# Required
COURTLISTENER_API_KEY=your-key-here

# Optional - Rate Limiting
COURTLISTENER_REQUEST_DELAY_MS=1000        # Delay between requests
COURTLISTENER_MAX_RETRIES=5                # Max retry attempts
COURTLISTENER_REQUEST_TIMEOUT_MS=30000     # Request timeout
COURTLISTENER_BACKOFF_CAP_MS=15000         # Max backoff delay
COURTLISTENER_CIRCUIT_THRESHOLD=5          # Failures before circuit opens
COURTLISTENER_CIRCUIT_COOLDOWN_MS=60000    # Circuit cooldown period

# Optional - Webhook
COURTLISTENER_WEBHOOK_SECRET=your-secret
COURTLISTENER_WEBHOOK_VERIFY_TOKEN=your-token
```

---

## Testing Quick Commands

### Unit Tests
```bash
npm run test:courtlistener
npm run test:courtlistener:watch
npm run test:courtlistener:coverage
```

### Postman/Newman
```bash
newman run tests/api/courtlistener/postman-collection.json \
  --env-var "COURTLISTENER_API_KEY=your-key"
```

### REST Client (VS Code)
1. Open `tests/api/courtlistener/rest-client.http`
2. Set `COURTLISTENER_API_KEY` in `.env`
3. Click "Send Request" above any test

---

## Common Issues & Fixes

### Rate Limit Exceeded (429)
```typescript
// ✅ Correct handling
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  await sleep(parseInt(retryAfter) * 1000)
  return retry()
}
```

### Authentication Failed (401)
```bash
# Check API key
echo $COURTLISTENER_API_KEY

# Verify format (should start with alphanumeric)
curl -H "Authorization: Token YOUR_KEY" \
  https://www.courtlistener.com/api/rest/v4/people/?format=json&page_size=1
```

### Missing format=json (400)
```http
# ❌ Wrong
GET /people/

# ✅ Correct
GET /people/?format=json
```

### Circuit Breaker Open
```typescript
// Wait for cooldown (60 seconds default)
// Or manually reset circuit breaker:
client.circuitFailures = 0
client.circuitOpenUntil = 0
```

---

## Monitoring Checklist

### Daily
- [ ] Check rate limit remaining
- [ ] Review error logs
- [ ] Verify sync jobs completed

### Weekly
- [ ] Analyze API usage patterns
- [ ] Review retry statistics
- [ ] Check circuit breaker triggers

### Monthly
- [ ] Review API changelog
- [ ] Audit data freshness
- [ ] Performance optimization review

---

## Resources

### Documentation
- **API Docs**: https://www.courtlistener.com/api/rest-info/
- **API Reference**: https://www.courtlistener.com/api/rest/v4/
- **Changelog**: https://www.courtlistener.com/help/api/changelog/

### Support
- **Email**: contact@free.law
- **GitHub**: https://github.com/freelawproject/courtlistener
- **Issues**: https://github.com/freelawproject/courtlistener/issues

### JudgeFinder Docs
- **Full Audit**: `/COURTLISTENER_API_AUDIT.md`
- **Summary**: `/AUDIT_SUMMARY.md`
- **Test Suite**: `/tests/api/courtlistener/README.md`

---

**Last Updated**: 2025-09-30
**Quick Reference Version**: 1.0
