import { NextResponse } from 'next/server'
import type { Middleware } from './middleware'
import { logger } from '@/lib/utils/logger'

/**
 * Configuration options for rate limiting middleware.
 */
interface RateLimitConfig {
  /** Maximum number of requests allowed within the time window */
  tokens?: number
  /** Time window for rate limiting (e.g., '1 m', '10 s', '1 h') */
  window?: string
  /** Prefix for the rate limit key in Redis */
  prefix?: string
  /**
   * Custom key generator function.
   * By default, uses client IP address.
   * @param req - The incoming request
   * @returns A string key to identify the client
   */
  keyGenerator?: (req: Request) => string | Promise<string>
  /**
   * Custom response when rate limit is exceeded.
   * By default, returns 429 with error message.
   */
  onRateLimitExceeded?: (remaining: number, reset: number) => NextResponse
}

/**
 * Rate limiting middleware using Upstash Redis.
 *
 * Protects API routes from abuse by limiting the number of requests
 * a client can make within a specified time window.
 *
 * Features:
 * - Sliding window rate limiting
 * - Client IP-based identification by default
 * - Custom key generation support
 * - Automatic Redis connection handling
 * - Development mode pass-through (no Redis required)
 * - Production enforcement (fails if Redis unavailable)
 *
 * @example
 * ```typescript
 * // Basic usage with default limits (40 requests per minute)
 * export const GET = compose(
 *   withRateLimit(),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   return NextResponse.json({ data: 'success' })
 * })
 *
 * // Custom configuration
 * export const POST = compose(
 *   withRateLimit({
 *     tokens: 10,           // 10 requests
 *     window: '1 m',        // per minute
 *     prefix: 'api:create', // Redis key prefix
 *   }),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   // Handler logic
 * })
 *
 * // Custom key generator (e.g., by user ID)
 * export const PUT = compose(
 *   withRateLimit({
 *     tokens: 20,
 *     keyGenerator: async (req) => {
 *       const userId = req.headers.get('x-user-id')
 *       return userId || 'anonymous'
 *     }
 *   })
 * )(async (req, ctx) => {
 *   // Handler logic
 * })
 * ```
 *
 * @param config - Rate limit configuration options
 * @returns Middleware function that enforces rate limiting
 */
export function withRateLimit(config?: RateLimitConfig): Middleware {
  return (handler) => async (req, ctx) => {
    const startTime = Date.now()

    try {
      // Dynamic import to avoid issues in edge runtime
      const { buildRateLimiter, getClientIp } = await import('@/lib/security/rate-limit')

      // Build rate limiter with provided config
      const rl = buildRateLimiter({
        tokens: config?.tokens ?? 40,
        window: config?.window ?? '1 m',
        prefix: config?.prefix ?? 'api:global'
      })

      // Generate rate limit key
      let key: string
      if (config?.keyGenerator) {
        key = await config.keyGenerator(req)
      } else {
        const clientIp = getClientIp(req)
        key = `${clientIp}:global`
      }

      // Check rate limit
      const { success, remaining, reset } = await rl.limit(key)

      // Log rate limit check
      logger.debug('Rate limit check', {
        scope: 'api_middleware',
        prefix: config?.prefix,
        key,
        success,
        remaining,
        duration: Date.now() - startTime
      })

      // Rate limit exceeded
      if (!success) {
        logger.warn('Rate limit exceeded', {
          scope: 'api_middleware',
          prefix: config?.prefix,
          key,
          remaining,
          reset
        })

        // Use custom response if provided
        if (config?.onRateLimitExceeded) {
          return config.onRateLimitExceeded(remaining, reset)
        }

        // Default 429 response
        const response = NextResponse.json(
          {
            error: 'Rate limit exceeded',
            remaining,
            reset: new Date(reset).toISOString()
          },
          { status: 429 }
        )

        // Add standard rate limit headers
        response.headers.set('X-RateLimit-Remaining', remaining.toString())
        response.headers.set('X-RateLimit-Reset', reset.toString())
        response.headers.set('Retry-After', Math.ceil((reset - Date.now()) / 1000).toString())

        return response
      }

      // Pass rate limit info to handler via context
      ctx.rateLimitRemaining = remaining
      ctx.rateLimitReset = reset

      // Execute handler
      const response = await handler(req, ctx)

      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', reset.toString())

      return response

    } catch (error) {
      // Log error but don't fail the request
      logger.error('Rate limit middleware error', {
        scope: 'api_middleware',
        error
      }, error as Error)

      // In development, allow request to proceed
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Rate limiting bypassed due to error (development only)', {
          scope: 'api_middleware'
        })
        return handler(req, ctx)
      }

      // In production, this is a critical error
      throw error
    }
  }
}

/**
 * Preset rate limit configurations for common use cases.
 */
export const RateLimitPresets = {
  /** Very strict: 5 requests per minute */
  strict: { tokens: 5, window: '1 m' as const },

  /** Conservative: 10 requests per minute */
  conservative: { tokens: 10, window: '1 m' as const },

  /** Default: 40 requests per minute */
  default: { tokens: 40, window: '1 m' as const },

  /** Generous: 100 requests per minute */
  generous: { tokens: 100, window: '1 m' as const },

  /** API key: 1000 requests per hour */
  apiKey: { tokens: 1000, window: '1 h' as const },

  /** Burst: 10 requests per 10 seconds */
  burst: { tokens: 10, window: '10 s' as const },

  /** Public endpoints: 200 requests per minute */
  public: { tokens: 200, window: '1 m' as const }
} as const

/**
 * Convenient wrapper for strict rate limiting (5 req/min).
 */
export const withStrictRateLimit = (prefix?: string) =>
  withRateLimit({ ...RateLimitPresets.strict, prefix })

/**
 * Convenient wrapper for conservative rate limiting (10 req/min).
 */
export const withConservativeRateLimit = (prefix?: string) =>
  withRateLimit({ ...RateLimitPresets.conservative, prefix })

/**
 * Convenient wrapper for generous rate limiting (100 req/min).
 */
export const withGenerousRateLimit = (prefix?: string) =>
  withRateLimit({ ...RateLimitPresets.generous, prefix })
