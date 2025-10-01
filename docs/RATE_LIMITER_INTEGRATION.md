# Global Rate Limiter Integration Guide

## Overview

The Global Rate Limiter prevents the JudgeFinder platform from exceeding CourtListener's 5,000 requests/hour API limit by implementing distributed rate tracking across all sync processes.

## Features

- **Distributed Rate Tracking**: Uses Redis to track requests across all processes
- **Sliding Window Algorithm**: Accurate hourly rate calculation
- **Buffer Protection**: Configurable buffer limit (default: 4,500) prevents API bans
- **Automatic Blocking**: Prevents requests when limit approached
- **Real-time Monitoring**: Live usage statistics and alerts
- **Graceful Degradation**: Falls back to allowing requests if Redis unavailable

## Architecture

### Redis Key Schema

```
courtlistener:rate_limit:requests          # Current request count (expires after window)
courtlistener:rate_limit:window_start      # Window start timestamp
courtlistener:rate_limit:stats             # Usage statistics
courtlistener:rate_limit:alert_sent        # Last alert timestamp
```

### Rate Limit Configuration

```typescript
const HOURLY_LIMIT = 5000        // CourtListener's actual limit
const BUFFER_LIMIT = 4500        // Safe limit (90% of actual)
const WARNING_THRESHOLD = 4000   // Alert at 80% of buffer (88% of actual)
const WINDOW_DURATION_MS = 3600000  // 1 hour
```

## Integration Instructions

### 1. Update CourtListener Client

Modify `/lib/courtlistener/client.ts` to integrate rate limiting:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

export class CourtListenerClient {
  private rateLimiter = getGlobalRateLimiter()

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}, options: RequestOptions = {}): Promise<T> {
    // Check rate limit BEFORE making request
    const limitCheck = await this.rateLimiter.checkLimit()

    if (!limitCheck.allowed) {
      const err = new Error(
        `Rate limit exceeded: ${limitCheck.currentCount}/${limitCheck.limit} requests used. ` +
        `Resets at ${limitCheck.resetAt.toISOString()}`
      )
      logger.error('Rate limit exceeded', { limitCheck })
      throw err
    }

    // Log if approaching limit
    if (limitCheck.utilizationPercent >= 85) {
      logger.warn('Approaching rate limit', {
        utilization: `${limitCheck.utilizationPercent.toFixed(2)}%`,
        remaining: limitCheck.remaining,
        resetAt: limitCheck.resetAt.toISOString()
      })
    }

    // Circuit breaker: short-circuit requests during cooldown window
    const now = Date.now()
    if (now < this.circuitOpenUntil) {
      const waitMs = this.circuitOpenUntil - now
      const err = new Error(`CourtListener circuit open, retry after ${waitMs}ms`)
      try { await this.metricsReporter?.('courtlistener_circuit_shortcircuit', 1, { waitMs }) } catch {}
      throw err
    }

    // ... existing request code ...

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()

      // Record successful request
      await this.rateLimiter.recordRequest()

      await sleep(this.requestDelay)
      this.circuitFailures = 0
      return data
    }

    // ... existing error handling ...
  }
}
```

### 2. Update Judge Sync

Modify `/lib/sync/judge-sync.ts`:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

export class JudgeSyncManager {
  private rateLimiter = getGlobalRateLimiter()

  async syncJudges(options: JudgeSyncOptions = {}): Promise<JudgeSyncResult> {
    // Check rate limit before starting sync
    const stats = await this.rateLimiter.getUsageStats()

    logger.info('Starting judge sync with rate limit check', {
      remaining: stats.remaining,
      utilization: `${stats.utilizationPercent.toFixed(2)}%`,
      resetAt: stats.windowEnd.toISOString()
    })

    if (await this.rateLimiter.isRateLimited()) {
      const resetTime = await this.rateLimiter.getResetTime()
      throw new Error(`Rate limit exceeded. Resets at ${resetTime.toISOString()}`)
    }

    // ... existing sync code ...
  }

  private async syncSingleJudge(courtlistenerJudgeId: string, options: JudgeSyncOptions) {
    // Wait for rate limit availability if needed
    if (await this.rateLimiter.isRateLimited()) {
      logger.info('Rate limit reached, waiting for availability')
      await this.rateLimiter.waitForAvailability(5 * 60 * 1000) // Wait up to 5 minutes
    }

    // ... existing judge sync code ...
  }
}
```

### 3. Update Decision Sync

Modify `/lib/sync/decision-sync.ts`:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

export class DecisionSyncManager {
  private rateLimiter = getGlobalRateLimiter()

  async syncDecisions(options: DecisionSyncOptions = {}): Promise<DecisionSyncResult> {
    // Check rate limit availability
    const remaining = await this.rateLimiter.getRemainingRequests()

    if (remaining < 100) {
      logger.warn('Low rate limit remaining, may need to wait', { remaining })
    }

    // ... existing sync code ...
  }

  private async processBatch(judges: any[], options: DecisionSyncOptions) {
    for (const judge of judges) {
      // Check before each judge to prevent mid-batch rate limit
      if (await this.rateLimiter.isRateLimited()) {
        logger.info('Rate limit reached during batch, pausing')
        await this.rateLimiter.waitForAvailability()
      }

      // ... existing processing code ...
    }
  }
}
```

### 4. Update Webhook Handler

Modify `/app/api/webhooks/courtlistener/route.ts`:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

async function handleOpinionEvent(payload: CourtListenerWebhookPayload, queueManager: SyncQueueManager) {
  // Check rate limit before queuing work
  const limiter = getGlobalRateLimiter()
  const stats = await limiter.getUsageStats()

  if (stats.remaining < 50) {
    logger.warn('Rate limit nearly exhausted, deferring webhook processing', {
      remaining: stats.remaining,
      resetAt: stats.windowEnd.toISOString()
    })

    // Queue with lower priority or defer
    return {
      message: 'Rate limit near exhaustion, deferred processing',
      handled: false
    }
  }

  // ... existing webhook code ...
}
```

## Usage Examples

### Basic Usage

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

const limiter = getGlobalRateLimiter()

// Check if request is allowed
const result = await limiter.checkLimit()
if (result.allowed) {
  // Make API call
  await makeCourtListenerRequest()

  // Record the request
  await limiter.recordRequest()
}
```

### With Rate Limit Protection Helper

```typescript
import { withRateLimitProtection } from '@/lib/courtlistener/global-rate-limiter'

// Automatically handles rate limiting
const data = await withRateLimitProtection(async () => {
  return await courtListenerClient.getJudgeById(judgeId)
})
```

### Get Current Status

```typescript
const limiter = getGlobalRateLimiter()

// Get usage statistics
const stats = await limiter.getUsageStats()
console.log(`Requests: ${stats.totalRequests}/${stats.limit}`)
console.log(`Remaining: ${stats.remaining}`)
console.log(`Utilization: ${stats.utilizationPercent.toFixed(2)}%`)
console.log(`Resets at: ${stats.windowEnd.toISOString()}`)

// Get formatted report
const report = await limiter.getStatusReport()
console.log(report)
```

### Wait for Availability

```typescript
const limiter = getGlobalRateLimiter()

try {
  // Wait up to 5 minutes for rate limit availability
  await limiter.waitForAvailability(5 * 60 * 1000)

  // Now safe to make request
  await makeCourtListenerRequest()
  await limiter.recordRequest()

} catch (error) {
  console.error('Timeout waiting for rate limit availability')
}
```

## Monitoring & Admin Dashboard

### Add Rate Limit Metrics to Admin Dashboard

Update `/components/dashboard/AdminDashboard.tsx`:

```typescript
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

function RateLimitMetrics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function loadStats() {
      const limiter = getGlobalRateLimiter()
      const data = await limiter.getUsageStats()
      setStats(data)
    }

    loadStats()
    const interval = setInterval(loadStats, 10000) // Update every 10s

    return () => clearInterval(interval)
  }, [])

  if (!stats) return <div>Loading rate limit stats...</div>

  return (
    <div className="rate-limit-metrics">
      <h3>CourtListener API Rate Limit</h3>
      <div className="metric">
        <span>Requests Used:</span>
        <span>{stats.totalRequests} / {stats.limit}</span>
      </div>
      <div className="metric">
        <span>Remaining:</span>
        <span>{stats.remaining}</span>
      </div>
      <div className="metric">
        <span>Utilization:</span>
        <span className={stats.utilizationPercent > 90 ? 'warning' : ''}>
          {stats.utilizationPercent.toFixed(2)}%
        </span>
      </div>
      <div className="metric">
        <span>Window Resets:</span>
        <span>{new Date(stats.windowEnd).toLocaleString()}</span>
      </div>
      {stats.projectedHourly && (
        <div className="metric">
          <span>Projected Hourly:</span>
          <span>{stats.projectedHourly}</span>
        </div>
      )}
    </div>
  )
}
```

### Add API Endpoint for Rate Limit Status

Create `/app/api/admin/rate-limit/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getGlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Add authentication check here

  const limiter = getGlobalRateLimiter()
  const stats = await limiter.getUsageStats()

  return NextResponse.json({
    success: true,
    stats,
    report: await limiter.getStatusReport()
  })
}

export async function POST(request: NextRequest) {
  // Add authentication check here

  const { action } = await request.json()

  if (action === 'reset') {
    const limiter = getGlobalRateLimiter()
    await limiter.resetWindow()

    return NextResponse.json({
      success: true,
      message: 'Rate limit window reset'
    })
  }

  return NextResponse.json({
    success: false,
    error: 'Invalid action'
  }, { status: 400 })
}
```

## Testing

### Run Unit Tests

```bash
npm run test -- tests/lib/courtlistener/global-rate-limiter.test.ts
```

### Manual Testing

```bash
# Start development server
npm run dev

# In another terminal, test the rate limiter
node -e "
const { getGlobalRateLimiter } = require('./lib/courtlistener/global-rate-limiter.ts');
const limiter = getGlobalRateLimiter();

limiter.getUsageStats().then(stats => {
  console.log('Rate Limit Stats:', stats);
});
"
```

### Load Testing

```bash
# Create load test script
cat > scripts/test-rate-limiter.js << 'EOF'
const { getGlobalRateLimiter } = require('../lib/courtlistener/global-rate-limiter')

async function simulateLoad() {
  const limiter = getGlobalRateLimiter()

  console.log('Starting load test...')

  for (let i = 0; i < 100; i++) {
    const result = await limiter.checkLimit()

    if (!result.allowed) {
      console.log(`Rate limit reached at request ${i + 1}`)
      console.log(`Current: ${result.currentCount}/${result.limit}`)
      break
    }

    await limiter.recordRequest()

    if (i % 10 === 0) {
      console.log(`Processed ${i + 1} requests, remaining: ${result.remaining}`)
    }
  }

  const stats = await limiter.getUsageStats()
  console.log('\nFinal Stats:')
  console.log(await limiter.getStatusReport())
}

simulateLoad().catch(console.error)
EOF

node scripts/test-rate-limiter.js
```

## Configuration

### Environment Variables

Add to `.env.local` and `.env.production`:

```bash
# Redis Configuration (Required for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Optional: Customize rate limit behavior
COURTLISTENER_HOURLY_LIMIT=5000
COURTLISTENER_BUFFER_LIMIT=4500
COURTLISTENER_WARNING_THRESHOLD=4000
```

### Custom Configuration

```typescript
import { GlobalRateLimiter } from '@/lib/courtlistener/global-rate-limiter'

// Create custom limiter with different limits
const limiter = new GlobalRateLimiter({
  hourlyLimit: 10000,
  bufferLimit: 9000,
  warningThreshold: 8000
})
```

## Troubleshooting

### Rate Limiter Not Working

1. **Check Redis credentials**:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

2. **Check Redis connectivity**:
   ```bash
   curl -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN" \
        "$UPSTASH_REDIS_REST_URL/ping"
   ```

3. **Check logs for errors**:
   ```bash
   grep "rate limit" logs/application.log
   ```

### Requests Still Exceeding Limit

1. Verify all CourtListener API calls are wrapped with rate limiting
2. Check for parallel processes not coordinating via Redis
3. Reduce buffer limit for more conservative behavior
4. Add longer delays between batch operations

### False Rate Limit Errors

1. Check Redis clock synchronization
2. Verify window reset logic is working
3. Clear rate limit keys manually if needed:
   ```bash
   redis-cli -h your-redis-host DEL "courtlistener:rate_limit:*"
   ```

## Production Deployment Checklist

- [ ] Redis credentials configured in production environment
- [ ] Rate limiter integrated into CourtListener client
- [ ] Judge sync updated with rate limit checks
- [ ] Decision sync updated with rate limit checks
- [ ] Webhook handler respects rate limits
- [ ] Admin dashboard shows rate limit metrics
- [ ] Alerts configured for high utilization
- [ ] Load testing completed successfully
- [ ] Monitoring and logging in place
- [ ] Documentation updated

## Performance Considerations

- **Redis Latency**: Each rate limit check requires 2-3 Redis calls (~5-10ms total)
- **Degraded Mode**: Falls back to allowing requests if Redis unavailable
- **Caching**: Consider caching rate limit status for 1-2 seconds in high-frequency scenarios
- **Batch Operations**: Check rate limit once per batch, not per individual request

## Future Enhancements

- [ ] Integration with Sentry for rate limit alerts
- [ ] PagerDuty integration for critical limit breaches
- [ ] Adaptive rate limiting based on API response headers
- [ ] Per-endpoint rate limit tracking
- [ ] Predictive rate limit warnings
- [ ] Auto-scaling sync batch sizes based on available quota

## Support

For issues or questions about the rate limiter:
1. Check logs: `grep "rate limit" logs/*.log`
2. Review Redis metrics in Upstash dashboard
3. Contact platform team for assistance
