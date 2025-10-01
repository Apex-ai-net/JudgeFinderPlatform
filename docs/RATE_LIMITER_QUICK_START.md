# Rate Limiter Quick Start Guide

## Overview

This guide provides a quick reference for integrating the CourtListener API Rate Limiter into your code.

## Setup (One-Time)

### 1. Configure Redis (Production)

Add to Netlify environment variables:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### 2. Configure Redis (Local Development)

Add to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

## Usage Patterns

### Pattern 1: Basic Rate Limit Check (Recommended)

Use this pattern in `CourtListenerClient.makeRequest()`:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  // Check rate limit BEFORE making request
  const limiter = getGlobalRateLimiter()
  const check = await limiter.checkLimit()

  if (!check.allowed) {
    throw new Error(
      `Rate limit exceeded: ${check.currentCount}/${check.limit} requests. ` +
      `Resets at ${check.resetAt.toISOString()}`
    )
  }

  // Log warning if approaching limit
  if (check.utilizationPercent >= 85) {
    logger.warn('Approaching rate limit', {
      utilization: `${check.utilizationPercent.toFixed(2)}%`,
      remaining: check.remaining
    })
  }

  // Make the actual API call
  const response = await fetch(url.toString(), { method: 'GET', headers })

  if (response.ok) {
    const data = await response.json()

    // Record successful request
    await limiter.recordRequest()

    return data
  }

  // Handle errors...
}
```

### Pattern 2: Helper Function (Easiest)

Use the built-in helper for automatic rate limiting:

```typescript
import { withRateLimitProtection } from '@/lib/courtlistener/global-rate-limiter'

// Automatically handles rate limiting
const judgeData = await withRateLimitProtection(async () => {
  return await this.courtListener.getJudgeById(judgeId)
})
```

### Pattern 3: Wait for Availability (Sync Operations)

Use in sync managers when rate limit is reached:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

async syncJudges(options: JudgeSyncOptions): Promise<JudgeSyncResult> {
  const limiter = getGlobalRateLimiter()

  // Check if rate limited before starting
  if (await limiter.isRateLimited()) {
    logger.info('Rate limit reached, waiting for availability')
    await limiter.waitForAvailability(5 * 60 * 1000) // Wait up to 5 minutes
  }

  // Proceed with sync...
}
```

### Pattern 4: Check Before Batch Operations

Use at the start of batch operations to avoid mid-batch failures:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

private async processBatch(judges: any[]): Promise<void> {
  const limiter = getGlobalRateLimiter()

  for (const judge of judges) {
    // Check before each judge to prevent mid-batch rate limit
    const remaining = await limiter.getRemainingRequests()

    if (remaining < 10) {
      logger.warn('Low rate limit remaining, pausing batch')
      await limiter.waitForAvailability()
    }

    // Process judge...
  }
}
```

### Pattern 5: Monitoring (Admin Dashboard)

Display real-time statistics:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

async function RateLimitStatus() {
  const limiter = getGlobalRateLimiter()
  const stats = await limiter.getUsageStats()

  return (
    <div>
      <h3>Rate Limit Status</h3>
      <p>Requests: {stats.totalRequests} / {stats.limit}</p>
      <p>Remaining: {stats.remaining}</p>
      <p>Utilization: {stats.utilizationPercent.toFixed(2)}%</p>
      <p>Resets: {stats.windowEnd.toLocaleString()}</p>
    </div>
  )
}
```

## Files to Update

### Priority 1: CourtListener Client (REQUIRED)

**File:** `/lib/courtlistener/client.ts`

**Changes:**
1. Import rate limiter at top of file
2. Add rate limit check in `makeRequest()` method
3. Record request after successful API call

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

export class CourtListenerClient {
  private rateLimiter = getGlobalRateLimiter()

  private async makeRequest<T>(endpoint: string, ...): Promise<T> {
    // Add rate limit check (see Pattern 1 above)
    const check = await this.rateLimiter.checkLimit()
    if (!check.allowed) {
      throw new Error(`Rate limit exceeded`)
    }

    // ... existing code ...

    // Record request after success
    await this.rateLimiter.recordRequest()
    return data
  }
}
```

### Priority 2: Judge Sync (REQUIRED)

**File:** `/lib/sync/judge-sync.ts`

**Changes:**
1. Import rate limiter
2. Check rate limit before starting sync
3. Wait for availability if needed

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

export class JudgeSyncManager {
  private rateLimiter = getGlobalRateLimiter()

  async syncJudges(options: JudgeSyncOptions): Promise<JudgeSyncResult> {
    // Check rate limit before starting
    if (await this.rateLimiter.isRateLimited()) {
      await this.rateLimiter.waitForAvailability()
    }

    // ... existing sync code ...
  }
}
```

### Priority 3: Decision Sync (REQUIRED)

**File:** `/lib/sync/decision-sync.ts`

**Changes:**
1. Import rate limiter
2. Monitor remaining quota
3. Check before batch operations

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

export class DecisionSyncManager {
  private rateLimiter = getGlobalRateLimiter()

  private async processBatch(judges: any[]): Promise<void> {
    for (const judge of judges) {
      if (await this.rateLimiter.isRateLimited()) {
        await this.rateLimiter.waitForAvailability()
      }
      // ... process judge ...
    }
  }
}
```

### Priority 4: Webhook Handler (RECOMMENDED)

**File:** `/app/api/webhooks/courtlistener/route.ts`

**Changes:**
1. Check rate limit before queuing webhook work
2. Defer processing if near limit

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

async function handleOpinionEvent(payload: any): Promise<any> {
  const limiter = getGlobalRateLimiter()
  const remaining = await limiter.getRemainingRequests()

  if (remaining < 50) {
    logger.warn('Rate limit nearly exhausted, deferring webhook')
    return { message: 'Deferred due to rate limit', handled: false }
  }

  // ... queue webhook work ...
}
```

## Quick Commands

### Check Current Status

```bash
# Via API
curl http://localhost:3005/api/admin/rate-limit

# Via Script
node -e "
const { getGlobalRateLimiter } = require('./lib/courtlistener/global-rate-limiter');
getGlobalRateLimiter().getStatusReport().then(console.log);
"
```

### Reset Rate Limit Window (Emergency)

```bash
curl -X POST http://localhost:3005/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -d '{"action":"reset"}'
```

### Run Tests

```bash
node tests/lib/courtlistener/global-rate-limiter.manual.test.js
```

## Common Scenarios

### Scenario 1: Full Judge Sync

```typescript
// Before: No rate limiting
await syncAllJudges()

// After: With rate limiting
const limiter = getGlobalRateLimiter()

if (await limiter.isRateLimited()) {
  const resetTime = await limiter.getResetTime()
  logger.info(`Rate limited until ${resetTime.toISOString()}`)
  await limiter.waitForAvailability()
}

await syncAllJudges()
```

### Scenario 2: Multiple API Calls in Loop

```typescript
// Before: No rate limiting
for (const judgeId of judgeIds) {
  await client.getJudgeById(judgeId)
}

// After: With rate limiting (automatic via client integration)
for (const judgeId of judgeIds) {
  await client.getJudgeById(judgeId) // Client handles rate limiting internally
}
```

### Scenario 3: Batch Operations with Monitoring

```typescript
const limiter = getGlobalRateLimiter()

for (let i = 0; i < batches.length; i++) {
  const stats = await limiter.getUsageStats()

  if (stats.utilizationPercent > 90) {
    logger.warn('High utilization, pausing')
    await limiter.waitForAvailability()
  }

  await processBatch(batches[i])
}
```

## Troubleshooting

### Rate Limit Not Working

**Check:** Redis credentials configured
```bash
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN
```

**Solution:** Add to environment variables

### Still Exceeding Limit

**Check:** All API calls wrapped with rate limiting
```bash
grep -r "courtListener\." lib/sync/*.ts
```

**Solution:** Ensure all calls go through integrated client

### False Rate Limit Errors

**Check:** Redis connectivity
```bash
curl -H "Authorization: Bearer $TOKEN" "$URL/ping"
```

**Solution:** Restart Redis or clear keys manually

## Production Checklist

- [ ] Redis credentials in Netlify environment
- [ ] CourtListener client updated
- [ ] Judge sync updated
- [ ] Decision sync updated
- [ ] Webhook handler updated
- [ ] Admin dashboard added (optional)
- [ ] Load testing completed
- [ ] Monitoring alerts configured

## Support

- **Documentation:** `/docs/RATE_LIMITER_INTEGRATION.md`
- **Implementation Details:** `/docs/RATE_LIMITER_IMPLEMENTATION_SUMMARY.md`
- **Tests:** `node tests/lib/courtlistener/global-rate-limiter.manual.test.js`
- **API Status:** `GET /api/admin/rate-limit`
