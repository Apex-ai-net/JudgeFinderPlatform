# Error Handling & Resilience Patterns

Comprehensive error handling implementation for the JudgeFinder platform with retry logic, circuit breakers, and graceful degradation.

## Overview

This error handling system provides:

- **Circuit Breakers**: Prevent cascading failures by failing fast when services are down
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **Graceful Degradation**: Fallback mechanisms to maintain service availability
- **Health Monitoring**: Track service health and degradation levels

## Components

### 1. Circuit Breaker (`circuit-breaker.ts`)

Prevents cascading failures by tracking error rates and opening circuit when threshold exceeded.

#### States

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Failures exceeded threshold, reject requests immediately
- **HALF_OPEN**: Testing if service recovered

#### Usage

```typescript
import { getCircuitBreaker } from '@/lib/error-handling/circuit-breaker'

const breaker = getCircuitBreaker('my-service', {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes in half-open
  timeout: 60000, // Try recovery after 60 seconds
})

const result = await breaker.execute(async () => {
  return await someRiskyOperation()
})

// Check circuit state
const stats = breaker.getStats()
console.log(stats.state) // CLOSED, OPEN, or HALF_OPEN
```

#### Configuration

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number // Failures before opening (default: 5)
  successThreshold: number // Successes to close from half-open (default: 2)
  timeout: number // Ms before attempting reset (default: 60000)
  name: string // Circuit identifier
}
```

### 2. Retry Logic (`retry.ts`)

Implements exponential backoff with jitter for handling transient failures.

#### Features

- Exponential backoff with configurable multiplier
- Jitter to prevent thundering herd
- Retryable error detection
- Custom retry conditions
- Batch retry support

#### Usage

```typescript
import { retryWithBackoff } from '@/lib/error-handling/retry'

const result = await retryWithBackoff(
  async (context) => {
    console.log(`Attempt ${context.attempt}`)
    return await fetchData()
  },
  {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds max
    backoffMultiplier: 2, // Double delay each time
    name: 'fetch-data',
  }
)
```

#### Default Retryable Errors

The system automatically retries these error types:

- `ECONNRESET` - Connection reset
- `ETIMEDOUT` - Operation timeout
- `ENOTFOUND` - DNS resolution failure
- `ECONNREFUSED` - Connection refused
- Network errors
- Fetch failures

#### Custom Retry Conditions

```typescript
import { retryWithCondition } from '@/lib/error-handling/retry'

const result = await retryWithCondition(
  async () => fetchAPI(),
  (error, attempt) => {
    // Only retry on specific status codes
    return error.message.includes('503') && attempt < 5
  },
  { maxAttempts: 5 }
)
```

### 3. Graceful Degradation (`graceful-degradation.ts`)

Provides fallback mechanisms to maintain service availability when components fail.

#### Features

- Health monitoring across services
- Degradation level detection
- Fallback analytics generation
- Timeout wrappers
- Fallback chains
- Partial result aggregation

#### Usage

```typescript
import {
  AnalyticsHealthMonitor,
  withFallbackChain,
  withTimeout,
} from '@/lib/error-handling/graceful-degradation'

// Health monitoring
const monitor = new AnalyticsHealthMonitor()
monitor.recordHealth('redis', true, 45)
monitor.recordHealth('supabase', true, 120)

const degradation = monitor.getDegradationLevel()
console.log(degradation.level) // 'optimal', 'degraded', 'minimal', 'fallback'

// Fallback chain
const { result, strategy } = await withFallbackChain(
  [
    {
      name: 'primary',
      operation: async () => fetchFromPrimary(),
    },
    {
      name: 'cache',
      operation: async () => fetchFromCache(),
    },
  ],
  () => getDefaultValue()
)

// Timeout wrapper
const data = await withTimeout(
  () => slowOperation(),
  5000, // 5 second timeout
  () => getCachedData(), // Fallback
  'slow-operation'
)
```

#### Degradation Levels

1. **Optimal**: All services healthy
   - Materialized views available
   - Redis cache working
   - AI enhancement enabled
   - Case enrichment enabled

2. **Degraded**: Core services work, caching degraded
   - Materialized views available
   - Redis cache unavailable
   - AI enhancement enabled
   - Case enrichment enabled

3. **Minimal**: Direct database queries only
   - Materialized views unavailable
   - Redis cache unavailable
   - AI enhancement disabled
   - Case enrichment enabled

4. **Fallback**: Statistical estimates only
   - All services degraded
   - Using jurisdiction-based estimates

## Analytics Route Implementation

The enhanced analytics route (`route.enhanced.ts`) demonstrates comprehensive error handling:

### Error Handling Flow

```
1. Resolve params with retry
   ↓
2. Rate limiting (gracefully fails in dev)
   ↓
3. Try Redis cache with circuit breaker + timeout
   ↓ (cache miss)
4. Get Supabase client with retry
   ↓
5. Fetch judge with circuit breaker + timeout
   ↓
6. Check database cache with timeout
   ↓ (cache miss)
7. Generate analytics with fallback chain:
   - Try materialized views (circuit breaker)
   - Try case analysis (with enrichment timeout)
   - Try legacy estimation
   - Final fallback to jurisdictional estimates
   ↓
8. Cache results (best effort, non-blocking)
   ↓
9. Return with degradation metadata
```

### Key Features

1. **Multi-layer Caching**
   - Redis (fastest, with circuit breaker)
   - Database cache (reliable fallback)
   - In-memory fallback

2. **Service Isolation**
   - Each service has its own circuit breaker
   - Failures don't cascade
   - Independent health tracking

3. **Graceful Timeouts**
   - Database queries: 30 seconds
   - Redis operations: 5 seconds
   - Analytics generation: 60 seconds
   - Each with fallback mechanism

4. **Comprehensive Logging**
   - All errors logged with context
   - Performance metrics captured
   - Circuit breaker states tracked

### Response Format

```typescript
{
  analytics: CaseAnalytics,
  cached: boolean,
  data_source: 'redis_cache' | 'database_cache' | 'materialized_view' | 'case_analysis' | 'legacy_estimation' | 'final_fallback',
  degradation_level: 'optimal' | 'degraded' | 'minimal' | 'fallback',
  degradation_reason?: string,
  generation_time_ms: number,
  rate_limit_remaining: number,
  circuit_breaker_stats: {
    redis: CircuitBreakerStats,
    supabase: CircuitBreakerStats,
    materialized_views: CircuitBreakerStats
  }
}
```

## Error Response Codes

### 404 Not Found

```json
{
  "error": "Judge not found",
  "details": "Invalid judge ID or judge does not exist"
}
```

### 429 Too Many Requests

```json
{
  "error": "Rate limit exceeded"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to generate analytics",
  "details": "Specific error message",
  "degradation_level": "fallback",
  "duration_ms": 1500
}
```

### 503 Service Unavailable

```json
{
  "error": "Service temporarily unavailable",
  "details": "Multiple retry attempts failed",
  "degradation_level": "minimal",
  "retry_after": 60
}
```

## Monitoring

### Circuit Breaker Stats

```typescript
interface CircuitBreakerStats {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  failures: number // Current failure count
  successes: number // Current success count (half-open)
  lastFailureTime: number | null
  totalCalls: number // Lifetime calls
  totalFailures: number // Lifetime failures
}
```

### Health Check

```typescript
interface ServiceHealthCheck {
  service: string
  healthy: boolean
  latency?: number
  error?: string
}
```

## Best Practices

### 1. Always Use Circuit Breakers for External Services

```typescript
const redisBreaker = getCircuitBreaker('redis-service')
const data = await redisBreaker.execute(() => redis.get(key))
```

### 2. Wrap Database Queries with Timeouts

```typescript
const judge = await withTimeout(
  () => supabase.from('judges').select('*').single(),
  30000,
  () => null,
  'fetch-judge'
)
```

### 3. Implement Fallback Chains

```typescript
const { result, strategy } = await withFallbackChain(
  [
    { name: 'cache', operation: () => getFromCache() },
    { name: 'database', operation: () => getFromDB() },
    { name: 'api', operation: () => getFromAPI() },
  ],
  () => getDefaultValue()
)
```

### 4. Cache with Best Effort

```typescript
// Don't fail if caching fails
try {
  await cacheResult(data)
} catch (error) {
  logger.warn('Cache write failed', { error })
  // Continue anyway
}
```

### 5. Always Log with Context

```typescript
logger.error(
  'Operation failed',
  {
    judgeId,
    strategy,
    degradationLevel,
    circuitState,
  },
  error
)
```

## Testing

### Unit Tests

```typescript
import { getCircuitBreaker } from '@/lib/error-handling/circuit-breaker'

describe('Circuit Breaker', () => {
  it('opens after threshold failures', async () => {
    const breaker = getCircuitBreaker('test', { failureThreshold: 3 })

    // Cause 3 failures
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error('fail')))
      } catch {}
    }

    expect(breaker.getStats().state).toBe('OPEN')
  })
})
```

### Integration Tests

Test the full fallback chain:

```typescript
describe('Analytics Route', () => {
  it('falls back to legacy analytics when materialized views fail', async () => {
    // Mock materialized view failure
    mockSupabase.from('mv_judge_statistics_summary').mockRejectedValue(new Error('DB down'))

    const response = await GET(request, { params })
    const data = await response.json()

    expect(data.degradation_level).toBe('minimal')
    expect(data.data_source).toBe('legacy_estimation')
  })
})
```

## Migration Guide

To migrate existing routes to use error handling:

1. **Wrap database calls with circuit breakers**
2. **Add retry logic for transient failures**
3. **Implement fallback mechanisms**
4. **Add health monitoring**
5. **Update response format to include degradation info**

See `route.enhanced.ts` for complete example.

## Performance Impact

- Circuit breaker overhead: < 1ms per request
- Retry logic: Only on failures, adds configured backoff
- Health monitoring: < 0.5ms per health check
- Graceful degradation: Minimal overhead, only fallback execution

## Configuration

Environment variables:

```bash
# Analytics timeouts
ANALYTICS_DATABASE_TIMEOUT_MS=30000
ANALYTICS_REDIS_TIMEOUT_MS=5000
ANALYTICS_GENERATION_TIMEOUT_MS=60000

# Circuit breaker defaults
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT_MS=60000

# Retry defaults
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=1000
RETRY_MAX_DELAY_MS=10000
```

## Troubleshooting

### Circuit Breaker Stuck Open

Check the circuit breaker stats and manually reset if needed:

```typescript
const breaker = getCircuitBreaker('my-service')
console.log(breaker.getStats())
breaker.reset() // Manual reset
```

### Too Many Retries

Reduce `maxAttempts` or increase `maxDelay`:

```typescript
await retryWithBackoff(operation, {
  maxAttempts: 2, // Reduce from 3
  maxDelay: 5000, // Cap at 5 seconds
})
```

### Fallback Always Used

Check health monitor to see which services are failing:

```typescript
const health = monitor.getAllHealth()
console.log(health) // See which services are unhealthy
```

## Related Documentation

- [Next.js Error Handling](https://nextjs.org/docs/app/building-your-application/routing/error-handling)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Graceful Degradation](https://en.wikipedia.org/wiki/Fault_tolerance#Graceful_degradation)
