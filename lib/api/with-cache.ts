import { NextResponse } from 'next/server'
import type { Middleware, RouteHandler } from './middleware'
import { buildCacheKey, withRedisCache } from '@/lib/cache/redis'
import { logger } from '@/lib/utils/logger'

/**
 * Configuration options for caching middleware.
 */
interface CacheConfig {
  /**
   * Time-to-live in seconds for cached responses.
   * @default 60
   */
  ttl?: number

  /**
   * Cache key prefix for namespacing.
   * @default 'api:cache'
   */
  prefix?: string

  /**
   * Custom cache key generator function.
   * By default, generates key from request URL and query parameters.
   * @param req - The incoming request
   * @returns A cache key string
   */
  keyGenerator?: (req: Request) => string | Promise<string>

  /**
   * Function to determine if a response should be cached.
   * Only successful responses (2xx) are cached by default.
   * @param response - The response to potentially cache
   * @returns Whether the response should be cached
   */
  shouldCache?: (response: NextResponse) => boolean

  /**
   * Whether to add Cache-Control headers to the response.
   * @default true
   */
  addHeaders?: boolean

  /**
   * Custom Cache-Control header value.
   * If not provided, generates from TTL.
   */
  cacheControl?: string

  /**
   * Whether to cache only GET requests.
   * @default true
   */
  getOnly?: boolean

  /**
   * Include specific query parameters in cache key.
   * If not specified, all query parameters are included.
   */
  includeParams?: string[]

  /**
   * Exclude specific query parameters from cache key.
   */
  excludeParams?: string[]
}

/**
 * Caching middleware using Redis for response caching.
 *
 * Features:
 * - Automatic cache key generation from URL and query params
 * - Configurable TTL (time-to-live)
 * - Custom cache key generation support
 * - Selective parameter inclusion/exclusion
 * - Automatic Cache-Control header injection
 * - Development mode support
 * - Only caches successful responses (2xx) by default
 * - GET-only caching by default (safe for idempotent operations)
 *
 * @example
 * ```typescript
 * // Basic usage with default 60s TTL
 * export const GET = compose(
 *   withCache(),
 *   withErrorHandling()
 * )(async (req, ctx) => {
 *   const data = await fetchExpensiveData()
 *   return NextResponse.json(data)
 * })
 *
 * // Custom TTL and prefix
 * export const GET = compose(
 *   withCache({
 *     ttl: 300,              // 5 minutes
 *     prefix: 'api:judges',  // Namespace
 *   })
 * )(async (req, ctx) => {
 *   // Handler logic
 * })
 *
 * // Include only specific query parameters in cache key
 * export const GET = compose(
 *   withCache({
 *     ttl: 180,
 *     includeParams: ['id', 'limit'] // Only these params affect caching
 *   })
 * )(async (req, ctx) => {
 *   // Handler logic
 * })
 *
 * // Custom cache key generator
 * export const GET = compose(
 *   withCache({
 *     keyGenerator: async (req) => {
 *       const userId = req.headers.get('x-user-id')
 *       const { pathname } = new URL(req.url)
 *       return `user:${userId}:${pathname}`
 *     }
 *   })
 * )(async (req, ctx) => {
 *   // Handler logic
 * })
 *
 * // Cache POST requests (use with caution!)
 * export const POST = compose(
 *   withCache({
 *     ttl: 30,
 *     getOnly: false,
 *     keyGenerator: async (req) => {
 *       const body = await req.json()
 *       return `search:${JSON.stringify(body)}`
 *     }
 *   })
 * )(async (req, ctx) => {
 *   // Handler logic
 * })
 * ```
 *
 * @param config - Cache configuration options
 * @returns Middleware function that handles caching
 */
export function withCache(config?: CacheConfig): Middleware {
  return (handler): RouteHandler => async (req, ctx): Promise<NextResponse> => {
    const ttl = config?.ttl ?? 60
    const prefix = config?.prefix ?? 'api:cache'
    const getOnly = config?.getOnly !== false
    const addHeaders = config?.addHeaders !== false

    // Skip caching for non-GET requests if getOnly is true
    if (getOnly && req.method !== 'GET') {
      return handler(req, ctx)
    }

    try {
      // Generate cache key
      let cacheKey: string
      if (config?.keyGenerator) {
        cacheKey = await config.keyGenerator(req)
      } else {
        const url = new URL(req.url)
        const { pathname, searchParams } = url

        // Filter query parameters
        const params: Record<string, string> = {}
        for (const [key, value] of searchParams.entries()) {
          // Include only specified params if includeParams is set
          if (config?.includeParams && !config.includeParams.includes(key)) {
            continue
          }
          // Exclude specified params
          if (config?.excludeParams && config.excludeParams.includes(key)) {
            continue
          }
          params[key] = value
        }

        cacheKey = buildCacheKey(pathname, params)
      }

      // Add prefix
      const fullKey = `${prefix}:${cacheKey}`

      // Try to get from cache
      const startTime = Date.now()
      const { data: cachedResult, cached: fromCache } = await withRedisCache(
        fullKey,
        ttl,
        async () => {
          // Cache miss - execute handler
          const response = await handler(req, ctx)

          // Check if response should be cached
          const shouldCache = config?.shouldCache
            ? config.shouldCache(response)
            : response.status >= 200 && response.status < 300

          if (!shouldCache) {
            // Return a special marker to indicate "don't cache"
            return { __skipCache: true, response }
          }

          // Extract response data for caching
          const responseClone = response.clone()
          const data = await responseClone.json()

          return {
            data,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          }
        }
      )

      const duration = Date.now() - startTime

      // Log cache performance
      logger.debug('Cache middleware', {
        scope: 'api_middleware',
        key: fullKey,
        fromCache,
        duration,
        ttl
      })

      // Handle skip cache marker
      if (cachedResult && '__skipCache' in cachedResult && cachedResult.response) {
        return cachedResult.response
      }

      // Reconstruct response from cached data
      if (cachedResult && 'data' in cachedResult) {
        const response = NextResponse.json(cachedResult.data, {
          status: cachedResult.status
        })

        // Restore cached headers
        if (cachedResult.headers) {
          for (const [key, value] of Object.entries(cachedResult.headers)) {
            response.headers.set(key, value as string)
          }
        }

        // Add cache headers
        if (addHeaders) {
          const cacheControl = config?.cacheControl ??
            `public, s-maxage=${ttl}, stale-while-revalidate=${Math.floor(ttl / 2)}`
          response.headers.set('Cache-Control', cacheControl)
          response.headers.set('X-Cache', fromCache ? 'HIT' : 'MISS')
        }

        return response
      }

      // Should not reach here, but handle gracefully
      logger.warn('Cache middleware: unexpected cached result format', {
        scope: 'api_middleware',
        cachedResult
      })

      return handler(req, ctx)

    } catch (error) {
      // Log error but don't fail the request
      logger.error('Cache middleware error', {
        scope: 'api_middleware',
        error
      }, error as Error)

      // Fall through to handler on cache errors
      return handler(req, ctx)
    }
  }
}

/**
 * Preset cache configurations for common use cases.
 */
export const CachePresets = {
  /** Very short: 30 seconds */
  short: { ttl: 30 },

  /** Default: 1 minute */
  default: { ttl: 60 },

  /** Medium: 5 minutes */
  medium: { ttl: 300 },

  /** Long: 15 minutes */
  long: { ttl: 900 },

  /** Very long: 1 hour */
  hour: { ttl: 3600 },

  /** Static content: 24 hours */
  static: { ttl: 86400 }
} as const

/**
 * Convenience wrapper for short caching (30s).
 */
export const withShortCache = (prefix?: string) =>
  withCache({ ...CachePresets.short, prefix })

/**
 * Convenience wrapper for medium caching (5min).
 */
export const withMediumCache = (prefix?: string) =>
  withCache({ ...CachePresets.medium, prefix })

/**
 * Convenience wrapper for long caching (15min).
 */
export const withLongCache = (prefix?: string) =>
  withCache({ ...CachePresets.long, prefix })

/**
 * Convenience wrapper for hourly caching (1h).
 */
export const withHourlyCache = (prefix?: string) =>
  withCache({ ...CachePresets.hour, prefix })
