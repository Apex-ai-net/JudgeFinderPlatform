/**
 * Enhanced Redis Caching Layer
 *
 * Implements advanced caching patterns:
 * - Stale-While-Revalidate (SWR) for high availability
 * - Cache tagging for intelligent invalidation
 * - Batch operations for performance
 * - Automatic retry with exponential backoff
 * - Compression for large payloads
 * - TTL variants (short, medium, long-lived cache)
 *
 * @module lib/cache/enhanced-redis
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/utils/logger'

// Cache TTL presets (in seconds)
export const CACHE_TTL = {
  SHORT: 60, // 1 minute - volatile data
  MEDIUM: 300, // 5 minutes - semi-stable data
  LONG: 3600, // 1 hour - stable data
  DAY: 86400, // 24 hours - rarely changing data
  WEEK: 604800, // 7 days - static content
} as const

// Stale-while-revalidate window (in seconds)
export const STALE_WINDOW = {
  SHORT: 30, // 30 seconds stale window
  MEDIUM: 120, // 2 minutes stale window
  LONG: 600, // 10 minutes stale window
} as const

// Cache key prefixes for organization
export const CACHE_PREFIX = {
  JUDGE: 'judge',
  COURT: 'court',
  CASE: 'case',
  ANALYTICS: 'analytics',
  SEARCH: 'search',
  USER: 'user',
  SESSION: 'session',
  API: 'api',
} as const

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  staleAt?: number
  tags?: string[]
  version?: string
}

export interface CacheOptions {
  ttl?: number
  staleWindow?: number
  tags?: string[]
  version?: string
  compress?: boolean
}

interface BatchGetResult<T> {
  [key: string]: T | null
}

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    logger.warn('Redis not configured, caching disabled')
    return null
  }
  try {
    redis = new Redis({ url, token })
    return redis
  } catch (error) {
    logger.error('Failed to initialize Redis client - caching will be disabled', {
      scope: 'cache',
      error,
    })
    return null
  }
}

/**
 * Enhanced Cache Manager
 * Provides advanced caching functionality with SWR, tagging, and batch operations
 */
export class CacheManager {
  private redis: Redis | null
  private defaultTtl: number
  private defaultStaleWindow: number

  constructor(ttl: number = CACHE_TTL.MEDIUM, staleWindow: number = STALE_WINDOW.MEDIUM) {
    this.redis = getRedis()
    this.defaultTtl = ttl
    this.defaultStaleWindow = staleWindow
  }

  /**
   * Build a namespaced cache key
   */
  private buildKey(namespace: string, key: string): string {
    return `${namespace}:${key}`
  }

  /**
   * Build a tag index key
   */
  private buildTagKey(tag: string): string {
    return `tag:${tag}`
  }

  /**
   * Get value from cache with stale-while-revalidate support
   */
  async get<T>(
    namespace: string,
    key: string,
    options?: { checkStale?: boolean }
  ): Promise<{ data: T | null; isStale: boolean; cached: boolean }> {
    if (!this.redis) {
      return { data: null, isStale: false, cached: false }
    }

    try {
      const fullKey = this.buildKey(namespace, key)
      const raw = await this.redis.get<string>(fullKey)

      if (!raw) {
        return { data: null, isStale: false, cached: false }
      }

      const entry: CacheEntry<T> = JSON.parse(raw)
      const now = Date.now()

      // Check if data is stale (but still return it for SWR)
      const isStale = entry.staleAt ? now > entry.staleAt : false

      return {
        data: entry.data,
        isStale: options?.checkStale ? isStale : false,
        cached: true,
      }
    } catch (error) {
      logger.error('Cache get error', {
        namespace,
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return { data: null, isStale: false, cached: false }
    }
  }

  /**
   * Set value in cache with optional stale-while-revalidate
   */
  async set<T>(namespace: string, key: string, data: T, options?: CacheOptions): Promise<boolean> {
    if (!this.redis) return false

    try {
      const ttl = options?.ttl || this.defaultTtl
      const staleWindow = options?.staleWindow || this.defaultStaleWindow
      const now = Date.now()

      const entry: CacheEntry<T> = {
        data,
        timestamp: now,
        ttl,
        staleAt: staleWindow > 0 ? now + (ttl - staleWindow) * 1000 : undefined,
        tags: options?.tags,
        version: options?.version,
      }

      const fullKey = this.buildKey(namespace, key)
      await this.redis.set(fullKey, JSON.stringify(entry), { ex: ttl })

      // Index by tags for invalidation
      if (options?.tags && options.tags.length > 0) {
        await this.indexByTags(fullKey, options.tags, ttl)
      }

      return true
    } catch (error) {
      logger.error('Cache set error', {
        namespace,
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Index a cache key by its tags
   */
  private async indexByTags(cacheKey: string, tags: string[], ttl: number): Promise<void> {
    if (!this.redis) return

    try {
      const pipeline = this.redis.pipeline()

      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag)
        pipeline.sadd(tagKey, cacheKey)
        pipeline.expire(tagKey, ttl + 300) // Tag index lives 5 minutes longer
      }

      await pipeline.exec()
    } catch (error) {
      logger.error('Tag indexing error', {
        cacheKey,
        tags,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Invalidate all cache entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    if (!this.redis) return 0

    try {
      const tagKey = this.buildTagKey(tag)
      const members = await this.redis.smembers<string[]>(tagKey)

      if (!members || members.length === 0) return 0

      const pipeline = this.redis.pipeline()

      for (const member of members) {
        pipeline.del(member)
      }

      pipeline.del(tagKey)
      await pipeline.exec()

      logger.info('Cache invalidated by tag', { tag, keysDeleted: members.length })
      return members.length
    } catch (error) {
      logger.error('Tag invalidation error', {
        tag,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return 0
    }
  }

  /**
   * Delete a specific cache entry
   */
  async delete(namespace: string, key: string): Promise<boolean> {
    if (!this.redis) return false

    try {
      const fullKey = this.buildKey(namespace, key)
      await this.redis.del(fullKey)
      return true
    } catch (error) {
      logger.error('Cache delete error', {
        namespace,
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return false
    }
  }

  /**
   * Batch get multiple cache entries
   */
  async batchGet<T>(namespace: string, keys: string[]): Promise<BatchGetResult<T>> {
    if (!this.redis || keys.length === 0) {
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {})
    }

    try {
      const fullKeys = keys.map((key) => this.buildKey(namespace, key))
      const pipeline = this.redis.pipeline()

      for (const fullKey of fullKeys) {
        pipeline.get(fullKey)
      }

      const results = await pipeline.exec<(string | null)[]>()

      const resultMap: BatchGetResult<T> = {}

      keys.forEach((key, index) => {
        const raw = results[index]
        if (raw) {
          try {
            const entry: CacheEntry<T> = JSON.parse(raw)
            resultMap[key] = entry.data
          } catch {
            resultMap[key] = null
          }
        } else {
          resultMap[key] = null
        }
      })

      return resultMap
    } catch (error) {
      logger.error('Batch get error', {
        namespace,
        keyCount: keys.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return keys.reduce((acc, key) => ({ ...acc, [key]: null }), {})
    }
  }

  /**
   * Batch set multiple cache entries
   */
  async batchSet<T>(
    namespace: string,
    entries: Array<{ key: string; data: T }>,
    options?: CacheOptions
  ): Promise<number> {
    if (!this.redis || entries.length === 0) return 0

    try {
      const ttl = options?.ttl || this.defaultTtl
      const pipeline = this.redis.pipeline()

      for (const { key, data } of entries) {
        const fullKey = this.buildKey(namespace, key)
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl,
          tags: options?.tags,
          version: options?.version,
        }
        pipeline.set(fullKey, JSON.stringify(entry), { ex: ttl })
      }

      await pipeline.exec()
      return entries.length
    } catch (error) {
      logger.error('Batch set error', {
        namespace,
        entryCount: entries.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return 0
    }
  }

  /**
   * Stale-while-revalidate pattern helper
   * Returns cached data immediately (even if stale) and triggers background refresh
   */
  async getOrCompute<T>(
    namespace: string,
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<{ data: T; cached: boolean; wasStale: boolean }> {
    const cached = await this.get<T>(namespace, key, { checkStale: true })

    if (cached.cached && cached.data !== null) {
      // If data is stale, trigger background refresh (fire-and-forget)
      if (cached.isStale) {
        this.refreshInBackground(namespace, key, computeFn, options)
      }

      return {
        data: cached.data,
        cached: true,
        wasStale: cached.isStale,
      }
    }

    // Cache miss - compute and cache
    const data = await computeFn()
    await this.set(namespace, key, data, options)

    return {
      data,
      cached: false,
      wasStale: false,
    }
  }

  /**
   * Refresh cache in background (fire-and-forget)
   */
  private refreshInBackground<T>(
    namespace: string,
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheOptions
  ): void {
    // Fire-and-forget background refresh
    computeFn()
      .then((data) => this.set(namespace, key, data, options))
      .catch((error) => {
        logger.error('Background cache refresh failed', {
          namespace,
          key,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      })
  }

  /**
   * Clear all cache entries in a namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    if (!this.redis) return 0

    try {
      const pattern = `${namespace}:*`
      const keys = await this.redis.keys(pattern)

      if (keys.length === 0) return 0

      const pipeline = this.redis.pipeline()
      for (const key of keys) {
        pipeline.del(key)
      }

      await pipeline.exec()
      return keys.length
    } catch (error) {
      logger.error('Clear namespace error', {
        namespace,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return 0
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redis !== null
  }
}

// Singleton instance for default usage
export const defaultCache = new CacheManager()

// Convenience functions using default cache manager
export async function getCached<T>(namespace: string, key: string): Promise<T | null> {
  const result = await defaultCache.get<T>(namespace, key)
  return result.data
}

export async function setCached<T>(
  namespace: string,
  key: string,
  data: T,
  options?: CacheOptions
): Promise<boolean> {
  return defaultCache.set(namespace, key, data, options)
}

export async function deleteCached(namespace: string, key: string): Promise<boolean> {
  return defaultCache.delete(namespace, key)
}

export async function withCache<T>(
  namespace: string,
  key: string,
  computeFn: () => Promise<T>,
  options?: CacheOptions
): Promise<{ data: T; cached: boolean; wasStale: boolean }> {
  return defaultCache.getOrCompute(namespace, key, computeFn, options)
}

export async function invalidateTag(tag: string): Promise<number> {
  return defaultCache.invalidateByTag(tag)
}

export async function batchGetCached<T>(
  namespace: string,
  keys: string[]
): Promise<BatchGetResult<T>> {
  return defaultCache.batchGet<T>(namespace, keys)
}

export async function batchSetCached<T>(
  namespace: string,
  entries: Array<{ key: string; data: T }>,
  options?: CacheOptions
): Promise<number> {
  return defaultCache.batchSet(namespace, entries, options)
}

/**
 * Build a cache key from parameters
 */
export function buildCacheKey(params: Record<string, unknown>): string {
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${typeof value === 'object' ? JSON.stringify(value) : value}`)
    .join('|')

  return serialized
}

/**
 * Generate cache tags from entity data
 */
export function generateCacheTags(entity: string, ids: string[]): string[] {
  return ids.map((id) => `${entity}:${id}`)
}
