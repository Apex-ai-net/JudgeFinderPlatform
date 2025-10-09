/**
 * Multi-Tier Cache System
 *
 * Implements a hierarchical caching strategy with three tiers:
 * - Tier 1: In-memory LRU cache (fastest, ~1-5ms)
 * - Tier 2: Redis distributed cache (~10-20ms)
 * - Tier 3: Database/Compute (slowest, 50-500ms)
 *
 * Cache promotion strategy:
 * - Hot data: Exists in all tiers
 * - Warm data: Exists in Tier 2 (Redis)
 * - Cold data: Computed on-demand, cached in Tier 2
 *
 * Features:
 * - Automatic cache promotion (cold → warm → hot)
 * - Write-through and write-behind strategies
 * - Cache coherence across tiers
 * - Memory pressure handling
 * - Metrics and monitoring
 *
 * @module lib/cache/multi-tier-cache
 */

import { LRUCache } from 'lru-cache'
import {
  CacheManager,
  CACHE_TTL,
  CACHE_PREFIX,
  type CacheOptions,
  buildCacheKey as buildRedisCacheKey,
} from './enhanced-redis'
import { logger } from '@/lib/utils/logger'

// Re-export for convenience
export { CACHE_TTL }
export const buildCacheKey = buildRedisCacheKey

interface TierCacheOptions<T> {
  maxSize?: number // Tier 1 max entries
  ttl?: number // Default TTL in seconds
  onEvict?: (key: string, value: T) => void
  enableMetrics?: boolean
}

interface CacheMetrics {
  tier1Hits: number
  tier1Misses: number
  tier2Hits: number
  tier2Misses: number
  computeCalls: number
  promotions: number
  evictions: number
}

interface CacheResult<T> {
  data: T
  tier: 1 | 2 | 3 // Which tier served the data
  cached: boolean
  wasStale: boolean
  latencyMs: number
}

/**
 * Multi-Tier Cache Manager
 * Orchestrates caching across in-memory (LRU) and Redis tiers
 */
export class MultiTierCache<T extends {} = any> {
  private tier1: LRUCache<string, T, unknown> // In-memory LRU
  private tier2: CacheManager // Redis
  private namespace: string
  private metrics: CacheMetrics
  private enableMetrics: boolean

  constructor(namespace: string, options?: TierCacheOptions<T>) {
    this.namespace = namespace

    // Initialize Tier 1: In-memory LRU cache
    this.tier1 = new LRUCache<string, T, unknown>({
      max: options?.maxSize || 1000,
      ttl: (options?.ttl || CACHE_TTL.MEDIUM) * 1000, // Convert to ms
      updateAgeOnGet: true, // Update TTL on access (LRU behavior)
      dispose: (value, key) => {
        this.metrics.evictions++
        if (options?.onEvict) {
          options.onEvict(key, value)
        }
      },
    })

    // Initialize Tier 2: Redis cache
    this.tier2 = new CacheManager(options?.ttl || CACHE_TTL.MEDIUM)

    // Initialize metrics
    this.enableMetrics = options?.enableMetrics ?? true
    this.metrics = {
      tier1Hits: 0,
      tier1Misses: 0,
      tier2Hits: 0,
      tier2Misses: 0,
      computeCalls: 0,
      promotions: 0,
      evictions: 0,
    }
  }

  /**
   * Get data from cache (checks all tiers)
   */
  async get(key: string): Promise<CacheResult<T> | null> {
    const startTime = Date.now()

    // Check Tier 1: In-memory cache
    const tier1Data = this.tier1.get(key)
    if (tier1Data !== undefined) {
      if (this.enableMetrics) this.metrics.tier1Hits++

      return {
        data: tier1Data,
        tier: 1,
        cached: true,
        wasStale: false,
        latencyMs: Date.now() - startTime,
      }
    }

    if (this.enableMetrics) this.metrics.tier1Misses++

    // Check Tier 2: Redis cache
    const tier2Result = await this.tier2.get<T>(this.namespace, key, { checkStale: true })

    if (tier2Result.cached && tier2Result.data !== null) {
      if (this.enableMetrics) this.metrics.tier2Hits++

      // Promote to Tier 1 (hot path optimization)
      this.tier1.set(key, tier2Result.data)
      if (this.enableMetrics) this.metrics.promotions++

      return {
        data: tier2Result.data,
        tier: 2,
        cached: true,
        wasStale: tier2Result.isStale,
        latencyMs: Date.now() - startTime,
      }
    }

    if (this.enableMetrics) this.metrics.tier2Misses++

    // Cache miss on both tiers
    return null
  }

  /**
   * Set data in cache (write-through to both tiers)
   */
  async set(key: string, data: T, options?: CacheOptions): Promise<void> {
    // Write to Tier 1 (in-memory)
    this.tier1.set(key, data)

    // Write to Tier 2 (Redis)
    await this.tier2.set(this.namespace, key, data, options)
  }

  /**
   * Get data with automatic computation and caching
   */
  async getOrCompute(
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<CacheResult<T>> {
    const startTime = Date.now()

    // Try to get from cache
    const cached = await this.get(key)
    if (cached) {
      return cached
    }

    // Cache miss - compute data
    if (this.enableMetrics) this.metrics.computeCalls++

    const data = await computeFn()
    await this.set(key, data, options)

    return {
      data,
      tier: 3, // Computed (not cached)
      cached: false,
      wasStale: false,
      latencyMs: Date.now() - startTime,
    }
  }

  /**
   * Stale-while-revalidate pattern with multi-tier support
   */
  async getOrComputeSWR(
    key: string,
    computeFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<CacheResult<T>> {
    const startTime = Date.now()

    // Check Tier 1 first
    const tier1Data = this.tier1.get(key)
    if (tier1Data !== undefined) {
      if (this.enableMetrics) this.metrics.tier1Hits++

      return {
        data: tier1Data,
        tier: 1,
        cached: true,
        wasStale: false,
        latencyMs: Date.now() - startTime,
      }
    }

    // Check Tier 2 with SWR support
    const tier2Result = await this.tier2.getOrCompute<T>(this.namespace, key, computeFn, options)

    // Promote to Tier 1 if data was cached
    if (tier2Result.cached) {
      this.tier1.set(key, tier2Result.data)
      if (this.enableMetrics) this.metrics.promotions++
    } else {
      if (this.enableMetrics) this.metrics.computeCalls++
    }

    return {
      data: tier2Result.data,
      tier: tier2Result.cached ? 2 : 3,
      cached: tier2Result.cached,
      wasStale: tier2Result.wasStale,
      latencyMs: Date.now() - startTime,
    }
  }

  /**
   * Delete from all cache tiers
   */
  async delete(key: string): Promise<void> {
    this.tier1.delete(key)
    await this.tier2.delete(this.namespace, key)
  }

  /**
   * Invalidate by tag (Tier 2 only, Tier 1 handles via TTL)
   */
  async invalidateByTag(tag: string): Promise<number> {
    return this.tier2.invalidateByTag(tag)
  }

  /**
   * Batch get from cache
   */
  async batchGet(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>()
    const tier1Misses: string[] = []

    // Check Tier 1 for all keys
    for (const key of keys) {
      const tier1Data = this.tier1.get(key)
      if (tier1Data !== undefined) {
        results.set(key, tier1Data)
        if (this.enableMetrics) this.metrics.tier1Hits++
      } else {
        tier1Misses.push(key)
        if (this.enableMetrics) this.metrics.tier1Misses++
      }
    }

    // Check Tier 2 for missed keys
    if (tier1Misses.length > 0) {
      const tier2Results = await this.tier2.batchGet<T>(this.namespace, tier1Misses)

      for (const [key, value] of Object.entries(tier2Results)) {
        if (value !== null) {
          results.set(key, value)
          // Promote to Tier 1
          this.tier1.set(key, value)
          if (this.enableMetrics) {
            this.metrics.tier2Hits++
            this.metrics.promotions++
          }
        } else {
          if (this.enableMetrics) this.metrics.tier2Misses++
        }
      }
    }

    return results
  }

  /**
   * Batch set to cache
   */
  async batchSet(entries: Array<{ key: string; data: T }>, options?: CacheOptions): Promise<void> {
    // Write to Tier 1
    for (const { key, data } of entries) {
      this.tier1.set(key, data)
    }

    // Write to Tier 2
    await this.tier2.batchSet(this.namespace, entries, options)
  }

  /**
   * Clear entire cache (all tiers)
   */
  async clear(): Promise<void> {
    this.tier1.clear()
    await this.tier2.clearNamespace(this.namespace)
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  /**
   * Calculate cache hit rate
   */
  getHitRate(): {
    tier1: number
    tier2: number
    overall: number
  } {
    const tier1Total = this.metrics.tier1Hits + this.metrics.tier1Misses
    const tier2Total = this.metrics.tier2Hits + this.metrics.tier2Misses
    const overallTotal = tier1Total + tier2Total

    return {
      tier1: tier1Total > 0 ? this.metrics.tier1Hits / tier1Total : 0,
      tier2: tier2Total > 0 ? this.metrics.tier2Hits / tier2Total : 0,
      overall:
        overallTotal > 0 ? (this.metrics.tier1Hits + this.metrics.tier2Hits) / overallTotal : 0,
    }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      tier1Hits: 0,
      tier1Misses: 0,
      tier2Hits: 0,
      tier2Misses: 0,
      computeCalls: 0,
      promotions: 0,
      evictions: 0,
    }
  }

  /**
   * Get cache size info
   */
  getSizeInfo(): {
    tier1Size: number
    tier1MaxSize: number
    tier1Usage: number
  } {
    return {
      tier1Size: this.tier1.size,
      tier1MaxSize: this.tier1.max,
      tier1Usage: this.tier1.size / this.tier1.max,
    }
  }

  /**
   * Log cache statistics
   */
  logStats(): void {
    const hitRate = this.getHitRate()
    const sizeInfo = this.getSizeInfo()

    logger.info('Multi-tier cache statistics', {
      namespace: this.namespace,
      hitRate: {
        tier1: `${(hitRate.tier1 * 100).toFixed(2)}%`,
        tier2: `${(hitRate.tier2 * 100).toFixed(2)}%`,
        overall: `${(hitRate.overall * 100).toFixed(2)}%`,
      },
      metrics: this.metrics,
      size: sizeInfo,
    })
  }
}

// Pre-configured cache instances for common use cases

/**
 * Judge profile cache (hot path - high hit rate expected)
 */
export const judgeCache = new MultiTierCache<any>(CACHE_PREFIX.JUDGE, {
  maxSize: 500, // Top 500 judges in memory
  ttl: CACHE_TTL.LONG, // 1 hour TTL
  enableMetrics: true,
})

/**
 * Court data cache (warm path - medium hit rate)
 */
export const courtCache = new MultiTierCache<any>(CACHE_PREFIX.COURT, {
  maxSize: 200, // Top 200 courts in memory
  ttl: CACHE_TTL.LONG, // 1 hour TTL
  enableMetrics: true,
})

/**
 * Search results cache (hot path - very high hit rate)
 */
export const searchCache = new MultiTierCache<any>(CACHE_PREFIX.SEARCH, {
  maxSize: 1000, // 1000 search queries in memory
  ttl: CACHE_TTL.MEDIUM, // 5 minutes TTL
  enableMetrics: true,
})

/**
 * Analytics cache (warm path - pre-computed data)
 */
export const analyticsCache = new MultiTierCache<any>(CACHE_PREFIX.ANALYTICS, {
  maxSize: 300, // 300 analytics results in memory
  ttl: CACHE_TTL.LONG, // 1 hour TTL
  enableMetrics: true,
})

/**
 * API response cache (cold path - lower hit rate, higher volume)
 */
export const apiCache = new MultiTierCache<any>(CACHE_PREFIX.API, {
  maxSize: 500, // 500 API responses in memory
  ttl: CACHE_TTL.MEDIUM, // 5 minutes TTL
  enableMetrics: true,
})

/**
 * Log all cache statistics (useful for monitoring)
 */
export function logAllCacheStats(): void {
  judgeCache.logStats()
  courtCache.logStats()
  searchCache.logStats()
  analyticsCache.logStats()
  apiCache.logStats()
}

/**
 * Cache strategy selector helper
 * Returns the appropriate cache instance based on data type
 */
export function getCacheForType(type: keyof typeof CACHE_PREFIX): MultiTierCache<any> {
  switch (type) {
    case 'JUDGE':
      return judgeCache
    case 'COURT':
      return courtCache
    case 'SEARCH':
      return searchCache
    case 'ANALYTICS':
      return analyticsCache
    case 'API':
      return apiCache
    default:
      // Default to API cache for unknown types
      return apiCache
  }
}

/**
 * Example usage patterns
 */

// HOT PATH: Judge profile lookup
// async function getJudgeProfile(judgeId: string) {
//   return judgeCache.getOrComputeSWR(
//     judgeId,
//     async () => {
//       // Fetch from database
//       return await fetchJudgeFromDB(judgeId)
//     },
//     {
//       ttl: CACHE_TTL.LONG,
//       tags: ['judge', judgeId],
//     }
//   )
// }

// WARM PATH: Court data
// async function getCourtData(courtId: string) {
//   return courtCache.getOrCompute(
//     courtId,
//     async () => await fetchCourtFromDB(courtId),
//     { ttl: CACHE_TTL.LONG }
//   )
// }

// COLD PATH: Search query
// async function searchJudges(query: string) {
//   return searchCache.getOrCompute(
//     query,
//     async () => await performSearch(query),
//     { ttl: CACHE_TTL.MEDIUM }
//   )
// }

// BATCH OPERATIONS: Analytics dashboard
// async function getDashboardData(judgeIds: string[]) {
//   const cached = await analyticsCache.batchGet(judgeIds)
//   const missing = judgeIds.filter(id => !cached.has(id))
//
//   if (missing.length > 0) {
//     const computed = await fetchAnalytics(missing)
//     await analyticsCache.batchSet(
//       computed.map((data, i) => ({ key: missing[i], data }))
//     )
//     computed.forEach((data, i) => cached.set(missing[i], data))
//   }
//
//   return cached
// }
