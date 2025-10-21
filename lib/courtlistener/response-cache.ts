/**
 * Response Cache for CourtListener API
 *
 * Implements a two-tier caching strategy:
 * 1. Redis cache (primary) - distributed, persistent across requests
 * 2. LRU in-memory cache (fallback) - fast, process-local
 *
 * Cache TTL: 24 hours for successful responses
 * Features:
 * - Automatic cache key generation from request parameters
 * - Graceful degradation if Redis unavailable
 * - Cache warming support
 * - Metrics tracking
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/utils/logger'

// Cache configuration
const CACHE_TTL_SECONDS = 24 * 60 * 60 // 24 hours
const CACHE_KEY_PREFIX = 'courtlistener:response:'
const MAX_LRU_SIZE = 1000 // Maximum in-memory cache entries

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
}

/**
 * Simple LRU cache implementation for in-memory fallback
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private maxSize: number

  constructor(maxSize: number = MAX_LRU_SIZE) {
    this.maxSize = maxSize
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.data
  }

  set(key: string, value: T, ttlSeconds: number = CACHE_TTL_SECONDS): void {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlSeconds * 1000,
    }

    this.cache.set(key, entry)
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

export class CourtListenerResponseCache {
  private redis: Redis | null = null
  private lruCache: LRUCache<any>
  private initAttempted = false
  private metricsReporter?: (
    name: string,
    value: number,
    meta?: Record<string, unknown>
  ) => void | Promise<void>

  constructor() {
    this.lruCache = new LRUCache()
  }

  /**
   * Set metrics reporter for cache statistics
   */
  setMetricsReporter(
    reporter: (name: string, value: number, meta?: Record<string, unknown>) => void | Promise<void>
  ) {
    this.metricsReporter = reporter
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
      logger.info('Redis not configured - using in-memory cache only', {
        context: 'courtlistener_cache',
      })
      return null
    }

    try {
      this.redis = new Redis({ url, token })
      logger.info('Redis initialized for CourtListener response caching')
      return this.redis
    } catch (error) {
      logger.error('Failed to initialize Redis for caching', { error })
      return null
    }
  }

  /**
   * Generate cache key from endpoint and parameters
   */
  private generateCacheKey(endpoint: string, params: Record<string, string> = {}): string {
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&')

    const keyBase = `${endpoint}${sortedParams ? `?${sortedParams}` : ''}`

    // Use simple hash or just the endpoint+params as key
    return `${CACHE_KEY_PREFIX}${Buffer.from(keyBase).toString('base64')}`
  }

  /**
   * Get cached response
   */
  async get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    const cacheKey = this.generateCacheKey(endpoint, params)

    // Try LRU cache first (fastest)
    const lruResult = this.lruCache.get(cacheKey)
    if (lruResult !== null) {
      logger.debug('CourtListener cache hit (LRU)', { endpoint })
      try {
        await this.metricsReporter?.('courtlistener_cache_hit_lru', 1, { endpoint })
      } catch {}
      return lruResult as T
    }

    // Try Redis cache
    const redis = this.initRedis()
    if (redis) {
      try {
        const redisResult = await redis.get<T>(cacheKey)

        if (redisResult !== null) {
          logger.debug('CourtListener cache hit (Redis)', { endpoint })

          // Populate LRU cache for faster subsequent access
          this.lruCache.set(cacheKey, redisResult, CACHE_TTL_SECONDS)

          try {
            await this.metricsReporter?.('courtlistener_cache_hit_redis', 1, { endpoint })
          } catch {}

          return redisResult
        }
      } catch (error) {
        logger.warn('Redis cache read failed, falling back to uncached', { endpoint, error })
      }
    }

    // Cache miss
    logger.debug('CourtListener cache miss', { endpoint })
    try {
      await this.metricsReporter?.('courtlistener_cache_miss', 1, { endpoint })
    } catch {}

    return null
  }

  /**
   * Set cached response
   */
  async set<T>(
    endpoint: string,
    params: Record<string, string> = {},
    data: T,
    ttlSeconds: number = CACHE_TTL_SECONDS
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(endpoint, params)

    // Always set in LRU cache (fast)
    this.lruCache.set(cacheKey, data, ttlSeconds)

    // Try to set in Redis (persistent)
    const redis = this.initRedis()
    if (redis) {
      try {
        await redis.set(cacheKey, JSON.stringify(data), {
          ex: ttlSeconds,
        })

        logger.debug('CourtListener response cached', { endpoint, ttl: ttlSeconds })

        try {
          await this.metricsReporter?.('courtlistener_cache_set', 1, { endpoint })
        } catch {}
      } catch (error) {
        logger.warn('Redis cache write failed, LRU cache still active', { endpoint, error })
      }
    }
  }

  /**
   * Check if response is cached
   */
  async has(endpoint: string, params: Record<string, string> = {}): Promise<boolean> {
    const cacheKey = this.generateCacheKey(endpoint, params)

    // Check LRU first
    if (this.lruCache.has(cacheKey)) {
      return true
    }

    // Check Redis
    const redis = this.initRedis()
    if (redis) {
      try {
        const exists = await redis.exists(cacheKey)
        return exists === 1
      } catch (error) {
        logger.warn('Redis cache check failed', { endpoint, error })
      }
    }

    return false
  }

  /**
   * Delete cached response
   */
  async delete(endpoint: string, params: Record<string, string> = {}): Promise<void> {
    const cacheKey = this.generateCacheKey(endpoint, params)

    // Delete from LRU
    this.lruCache.delete(cacheKey)

    // Delete from Redis
    const redis = this.initRedis()
    if (redis) {
      try {
        await redis.del(cacheKey)
      } catch (error) {
        logger.warn('Redis cache delete failed', { endpoint, error })
      }
    }
  }

  /**
   * Clear all cached responses
   */
  async clear(): Promise<void> {
    // Clear LRU cache
    this.lruCache.clear()

    // Clear Redis cache (pattern-based delete)
    const redis = this.initRedis()
    if (redis) {
      try {
        // Note: Redis SCAN is more efficient than KEYS in production
        // This is a simple implementation - for production, consider using SCAN
        const pattern = `${CACHE_KEY_PREFIX}*`

        // Upstash Redis doesn't support SCAN, so we'll skip Redis clear
        // Individual keys will expire naturally after 24 hours
        logger.info('LRU cache cleared, Redis entries will expire naturally')
      } catch (error) {
        logger.warn('Redis cache clear failed', { error })
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    lruSize: number
    lruMaxSize: number
    redisAvailable: boolean
  } {
    return {
      lruSize: this.lruCache.size,
      lruMaxSize: MAX_LRU_SIZE,
      redisAvailable: this.redis !== null,
    }
  }

  /**
   * Warm cache with common queries
   */
  async warmCache(warmingFn: () => Promise<void>): Promise<void> {
    logger.info('Starting cache warming...')
    try {
      await warmingFn()
      logger.info('Cache warming completed', this.getStats())
    } catch (error) {
      logger.error('Cache warming failed', { error })
    }
  }
}

/**
 * Singleton instance for application-wide use
 */
let globalCacheInstance: CourtListenerResponseCache | null = null

export function getCourtListenerCache(): CourtListenerResponseCache {
  if (!globalCacheInstance) {
    globalCacheInstance = new CourtListenerResponseCache()
  }
  return globalCacheInstance
}
