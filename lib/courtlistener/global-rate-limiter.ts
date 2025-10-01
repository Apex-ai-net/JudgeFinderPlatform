/**
 * Global Rate Limiter for CourtListener API
 *
 * Implements distributed rate tracking across all processes to prevent
 * exceeding CourtListener's 5,000 requests/hour limit.
 *
 * Features:
 * - Sliding window rate tracking via Redis
 * - Buffer limit (4,500) to prevent API bans
 * - Real-time monitoring and alerting
 * - Automatic blocking when limit approached
 * - Cross-process synchronization
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/utils/logger'

// Redis key constants
const RATE_LIMIT_KEY = 'courtlistener:rate_limit:requests'
const RATE_LIMIT_WINDOW_KEY = 'courtlistener:rate_limit:window_start'
const USAGE_STATS_KEY = 'courtlistener:rate_limit:stats'
const ALERT_SENT_KEY = 'courtlistener:rate_limit:alert_sent'

// Configuration constants
const HOURLY_LIMIT = 5000 // CourtListener's actual limit
const BUFFER_LIMIT = 4500 // Safe limit (leaves 500 for manual queries)
const WARNING_THRESHOLD = 4000 // Trigger alerts at 80% of buffer
const WINDOW_DURATION_MS = 60 * 60 * 1000 // 1 hour in milliseconds
const ALERT_COOLDOWN_MS = 15 * 60 * 1000 // 15 minutes between alerts

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
  resetAt: Date
  currentCount: number
  utilizationPercent: number
}

export interface UsageStats {
  totalRequests: number
  windowStart: Date
  windowEnd: Date
  limit: number
  remaining: number
  utilizationPercent: number
  lastRequest?: Date
  projectedHourly?: number
}

export interface RateLimitConfig {
  hourlyLimit?: number
  bufferLimit?: number
  warningThreshold?: number
}

/**
 * Global Rate Limiter for CourtListener API
 *
 * Uses Redis to track requests across all processes and enforce rate limits
 * with a sliding window algorithm.
 */
export class GlobalRateLimiter {
  private redis: Redis | null = null
  private readonly hourlyLimit: number
  private readonly bufferLimit: number
  private readonly warningThreshold: number
  private initAttempted = false

  constructor(config: RateLimitConfig = {}) {
    this.hourlyLimit = config.hourlyLimit ?? HOURLY_LIMIT
    this.bufferLimit = config.bufferLimit ?? BUFFER_LIMIT
    this.warningThreshold = config.warningThreshold ?? WARNING_THRESHOLD
  }

  /**
   * Initialize Redis connection
   */
  private initRedis(): Redis | null {
    if (this.redis) {
      return this.redis
    }

    if (this.initAttempted) {
      return null
    }

    this.initAttempted = true

    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      logger.warn('Redis credentials not configured - rate limiting disabled', {
        hasUrl: !!url,
        hasToken: !!token
      })
      return null
    }

    try {
      this.redis = new Redis({ url, token })
      logger.info('Redis connection initialized for rate limiting')
      return this.redis
    } catch (error) {
      logger.error('Failed to initialize Redis for rate limiting', { error })
      return null
    }
  }

  /**
   * Check if a request is allowed under the current rate limit
   *
   * @returns RateLimitResult with decision and current state
   */
  async checkLimit(): Promise<RateLimitResult> {
    const redis = this.initRedis()

    // If Redis not available, allow request (degraded mode)
    if (!redis) {
      return {
        allowed: true,
        remaining: this.bufferLimit,
        limit: this.bufferLimit,
        resetAt: new Date(Date.now() + WINDOW_DURATION_MS),
        currentCount: 0,
        utilizationPercent: 0
      }
    }

    try {
      const now = Date.now()

      // Get current window start
      const windowStart = await redis.get<number>(RATE_LIMIT_WINDOW_KEY)

      // If no window exists or window expired, start new window
      if (!windowStart || now - windowStart >= WINDOW_DURATION_MS) {
        await this.resetWindow(redis, now)
        return {
          allowed: true,
          remaining: this.bufferLimit - 1,
          limit: this.bufferLimit,
          resetAt: new Date(now + WINDOW_DURATION_MS),
          currentCount: 0,
          utilizationPercent: 0
        }
      }

      // Get current request count
      const currentCount = (await redis.get<number>(RATE_LIMIT_KEY)) ?? 0

      // Calculate remaining and utilization
      const remaining = Math.max(0, this.bufferLimit - currentCount)
      const utilizationPercent = (currentCount / this.bufferLimit) * 100
      const resetAt = new Date(windowStart + WINDOW_DURATION_MS)

      // Check if over buffer limit
      const allowed = currentCount < this.bufferLimit

      // Check if warning threshold reached
      if (currentCount >= this.warningThreshold && currentCount < this.warningThreshold + 10) {
        await this.sendWarningAlert(currentCount, utilizationPercent)
      }

      return {
        allowed,
        remaining,
        limit: this.bufferLimit,
        resetAt,
        currentCount,
        utilizationPercent
      }

    } catch (error) {
      logger.error('Rate limit check failed', { error })
      // On error, allow request (fail open for availability)
      return {
        allowed: true,
        remaining: this.bufferLimit,
        limit: this.bufferLimit,
        resetAt: new Date(Date.now() + WINDOW_DURATION_MS),
        currentCount: 0,
        utilizationPercent: 0
      }
    }
  }

  /**
   * Wait until a request slot becomes available
   *
   * Blocks execution until rate limit allows the request.
   *
   * @param maxWaitMs Maximum time to wait in milliseconds (default: 5 minutes)
   * @throws Error if maxWaitMs exceeded
   */
  async waitForAvailability(maxWaitMs: number = 5 * 60 * 1000): Promise<void> {
    const startTime = Date.now()

    while (true) {
      const result = await this.checkLimit()

      if (result.allowed) {
        return
      }

      // Check if max wait time exceeded
      if (Date.now() - startTime >= maxWaitMs) {
        throw new Error(`Rate limit wait timeout exceeded: ${maxWaitMs}ms`)
      }

      // Calculate wait time until window resets
      const waitTime = Math.min(
        result.resetAt.getTime() - Date.now(),
        10000 // Check at least every 10 seconds
      )

      logger.info('Rate limit reached, waiting for availability', {
        currentCount: result.currentCount,
        limit: result.limit,
        resetAt: result.resetAt.toISOString(),
        waitTimeMs: waitTime
      })

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, Math.max(waitTime, 1000)))
    }
  }

  /**
   * Record a request after it has been made
   *
   * Call this after successfully making a CourtListener API request.
   */
  async recordRequest(): Promise<void> {
    const redis = this.initRedis()

    if (!redis) {
      return // No-op if Redis not available
    }

    try {
      const now = Date.now()

      // Get or initialize window
      const windowStart = await redis.get<number>(RATE_LIMIT_WINDOW_KEY)

      if (!windowStart || now - windowStart >= WINDOW_DURATION_MS) {
        await this.resetWindow(redis, now)
      }

      // Increment request counter
      await redis.incr(RATE_LIMIT_KEY)

      // Update stats
      await this.updateStats(redis, now)

    } catch (error) {
      logger.error('Failed to record request', { error })
      // Don't throw - recording errors shouldn't break the application
    }
  }

  /**
   * Get current rate limit usage statistics
   */
  async getUsageStats(): Promise<UsageStats> {
    const redis = this.initRedis()

    if (!redis) {
      return {
        totalRequests: 0,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + WINDOW_DURATION_MS),
        limit: this.bufferLimit,
        remaining: this.bufferLimit,
        utilizationPercent: 0
      }
    }

    try {
      const now = Date.now()
      const windowStart = (await redis.get<number>(RATE_LIMIT_WINDOW_KEY)) ?? now
      const totalRequests = (await redis.get<number>(RATE_LIMIT_KEY)) ?? 0
      const stats = await redis.get<any>(USAGE_STATS_KEY)

      const remaining = Math.max(0, this.bufferLimit - totalRequests)
      const utilizationPercent = (totalRequests / this.bufferLimit) * 100

      // Calculate projected hourly rate
      const windowElapsed = now - windowStart
      const projectedHourly = windowElapsed > 0
        ? Math.round((totalRequests / windowElapsed) * WINDOW_DURATION_MS)
        : 0

      return {
        totalRequests,
        windowStart: new Date(windowStart),
        windowEnd: new Date(windowStart + WINDOW_DURATION_MS),
        limit: this.bufferLimit,
        remaining,
        utilizationPercent,
        lastRequest: stats?.lastRequest ? new Date(stats.lastRequest) : undefined,
        projectedHourly
      }

    } catch (error) {
      logger.error('Failed to get usage stats', { error })
      return {
        totalRequests: 0,
        windowStart: new Date(),
        windowEnd: new Date(Date.now() + WINDOW_DURATION_MS),
        limit: this.bufferLimit,
        remaining: this.bufferLimit,
        utilizationPercent: 0
      }
    }
  }

  /**
   * Get remaining requests in current window
   */
  async getRemainingRequests(): Promise<number> {
    const stats = await this.getUsageStats()
    return stats.remaining
  }

  /**
   * Get time when current rate limit window resets
   */
  async getResetTime(): Promise<Date> {
    const redis = this.initRedis()

    if (!redis) {
      return new Date(Date.now() + WINDOW_DURATION_MS)
    }

    try {
      const windowStart = await redis.get<number>(RATE_LIMIT_WINDOW_KEY)

      if (!windowStart) {
        return new Date(Date.now() + WINDOW_DURATION_MS)
      }

      return new Date(windowStart + WINDOW_DURATION_MS)

    } catch (error) {
      logger.error('Failed to get reset time', { error })
      return new Date(Date.now() + WINDOW_DURATION_MS)
    }
  }

  /**
   * Manually reset the rate limit window
   *
   * Use with caution - typically only for testing or emergency situations.
   */
  async resetWindow(redis?: Redis, timestamp?: number): Promise<void> {
    const client = redis ?? this.initRedis()

    if (!client) {
      return
    }

    try {
      const now = timestamp ?? Date.now()

      await Promise.all([
        client.set(RATE_LIMIT_WINDOW_KEY, now),
        client.set(RATE_LIMIT_KEY, 0),
        client.del(ALERT_SENT_KEY)
      ])

      logger.info('Rate limit window reset', { timestamp: new Date(now).toISOString() })

    } catch (error) {
      logger.error('Failed to reset window', { error })
    }
  }

  /**
   * Update usage statistics
   */
  private async updateStats(redis: Redis, timestamp: number): Promise<void> {
    try {
      const stats = {
        lastRequest: timestamp,
        lastUpdated: timestamp
      }

      await redis.set(USAGE_STATS_KEY, JSON.stringify(stats), {
        ex: Math.ceil(WINDOW_DURATION_MS / 1000) * 2 // TTL: 2 hours
      })

    } catch (error) {
      logger.error('Failed to update stats', { error })
    }
  }

  /**
   * Send warning alert when approaching rate limit
   */
  private async sendWarningAlert(currentCount: number, utilizationPercent: number): Promise<void> {
    const redis = this.initRedis()

    if (!redis) {
      return
    }

    try {
      // Check if alert already sent recently
      const alertSent = await redis.get<number>(ALERT_SENT_KEY)
      const now = Date.now()

      if (alertSent && now - alertSent < ALERT_COOLDOWN_MS) {
        return // Don't spam alerts
      }

      // Log warning
      logger.warn('CourtListener rate limit warning', {
        currentCount,
        limit: this.bufferLimit,
        utilizationPercent: utilizationPercent.toFixed(2),
        threshold: this.warningThreshold
      })

      // Mark alert as sent
      await redis.set(ALERT_SENT_KEY, now, {
        ex: Math.ceil(ALERT_COOLDOWN_MS / 1000)
      })

      // Could integrate with monitoring services here (e.g., Sentry, PagerDuty)

    } catch (error) {
      logger.error('Failed to send warning alert', { error })
    }
  }

  /**
   * Check if system is currently rate limited
   */
  async isRateLimited(): Promise<boolean> {
    const result = await this.checkLimit()
    return !result.allowed
  }

  /**
   * Get a formatted status report
   */
  async getStatusReport(): Promise<string> {
    const stats = await this.getUsageStats()

    return `
CourtListener Rate Limit Status
================================
Current Requests: ${stats.totalRequests}
Buffer Limit: ${stats.limit}
Remaining: ${stats.remaining}
Utilization: ${stats.utilizationPercent.toFixed(2)}%
Window Start: ${stats.windowStart.toISOString()}
Window End: ${stats.windowEnd.toISOString()}
Projected Hourly: ${stats.projectedHourly ?? 'N/A'}
Last Request: ${stats.lastRequest?.toISOString() ?? 'N/A'}
`.trim()
  }
}

/**
 * Singleton instance for application-wide use
 */
let globalInstance: GlobalRateLimiter | null = null

export function getGlobalRateLimiter(): GlobalRateLimiter {
  if (!globalInstance) {
    globalInstance = new GlobalRateLimiter()
  }
  return globalInstance
}

/**
 * Helper function to execute a CourtListener request with rate limiting
 *
 * @param fn Function that makes the CourtListener API call
 * @param options Optional configuration
 * @returns Result of the API call
 * @throws Error if rate limit exceeded or maxWait exceeded
 */
export async function withRateLimitProtection<T>(
  fn: () => Promise<T>,
  options: {
    maxWait?: number
    throwOnLimit?: boolean
  } = {}
): Promise<T> {
  const limiter = getGlobalRateLimiter()
  const { maxWait = 5 * 60 * 1000, throwOnLimit = false } = options

  // Check rate limit
  const result = await limiter.checkLimit()

  if (!result.allowed) {
    if (throwOnLimit) {
      throw new Error(`Rate limit exceeded: ${result.currentCount}/${result.limit} requests used`)
    }

    // Wait for availability
    await limiter.waitForAvailability(maxWait)
  }

  // Execute request
  try {
    const response = await fn()

    // Record successful request
    await limiter.recordRequest()

    return response

  } catch (error) {
    // Still record the request even if it failed
    // (it still counts against the rate limit)
    await limiter.recordRequest()
    throw error
  }
}
