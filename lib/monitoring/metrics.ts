/**
 * Performance Metrics Collection
 *
 * Provides structured performance tracking with minimal overhead (<5ms)
 * All metrics collection is async and non-blocking
 */

import * as Sentry from '@sentry/nextjs'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export type MetricType =
  | 'search_query'
  | 'analytics_generation'
  | 'judge_profile_load'
  | 'database_query'
  | 'external_api_call'
  | 'cache_operation'

export interface MetricData {
  type: MetricType
  operation: string
  duration_ms: number
  success: boolean
  metadata?: Record<string, any>
  error?: string
  timestamp?: Date
}

export interface PerformanceSnapshot {
  endpoint: string
  p50: number
  p95: number
  p99: number
  avg: number
  count: number
  error_rate: number
  period_start: Date
  period_end: Date
}

/**
 * Track a custom performance metric
 * Non-blocking - uses fire-and-forget pattern
 */
export function trackMetric(data: MetricData): void {
  // Fire and forget - don't block the request
  Promise.resolve()
    .then(async () => {
      try {
        const startTime = Date.now()

        // Log to application logs
        logger.info('Performance metric', {
          scope: 'metrics',
          ...data,
        })

        // Send to Sentry as custom metric (only if Sentry is available)
        // Note: setMeasurement is deprecated in Sentry v8, using setAttribute instead
        if (typeof Sentry !== 'undefined' && typeof Sentry.getActiveSpan === 'function') {
          const span = Sentry.getActiveSpan()
          if (span) {
            span.setAttribute(`${data.type}.${data.operation}.duration_ms`, data.duration_ms)
          }
        }

        // Store in database for historical analysis (async, non-blocking)
        if (process.env.NODE_ENV === 'production') {
          await storeMetricInDatabase(data)
        }

        const overhead = Date.now() - startTime
        if (overhead > 5) {
          logger.warn('Metric collection overhead exceeded threshold', {
            scope: 'metrics',
            overhead_ms: overhead,
            metric_type: data.type,
          })
        }
      } catch (error) {
        // Never let metrics collection break the application
        logger.error('Failed to track metric', {
          scope: 'metrics',
          error,
          metric_type: data.type,
        })
      }
    })
    .catch(() => {
      // Silent failure - metrics collection should never break the app
    })
}

/**
 * Create a Sentry span for tracking slow operations
 * Note: startTransaction is deprecated in Sentry v8
 * This function is kept for backwards compatibility but returns null
 * Use Sentry.startSpan() directly for new code
 */
export function startTransaction(
  name: string,
  operation: string,
  metadata?: Record<string, unknown>
): unknown | null {
  try {
    // Note: The new Sentry v8 API doesn't support the old transaction pattern
    // Spans are now created automatically with startSpan
    logger.debug('Transaction tracking deprecated, use startSpan', {
      scope: 'metrics',
      name,
      operation,
    })
    return null
  } catch (error) {
    logger.error('Failed to start transaction', {
      scope: 'metrics',
      error,
      name,
      operation,
    })
    return null
  }
}

/**
 * Wrapper to track async function performance
 */
export async function trackAsyncOperation<T>(
  type: MetricType,
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const startTime = Date.now()
  let success = false
  let error: string | undefined

  try {
    const result = await fn()
    success = true
    return result
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    throw err
  } finally {
    const duration = Date.now() - startTime

    trackMetric({
      type,
      operation,
      duration_ms: duration,
      success,
      metadata,
      error,
    })
  }
}

/**
 * Track search query performance
 */
export function trackSearchQuery(
  query: string,
  resultCount: number,
  duration: number,
  filters?: Record<string, any>
): void {
  trackMetric({
    type: 'search_query',
    operation: 'execute_search',
    duration_ms: duration,
    success: true,
    metadata: {
      query_length: query.length,
      result_count: resultCount,
      has_filters: !!filters,
      filter_count: filters ? Object.keys(filters).length : 0,
    },
  })
}

/**
 * Track analytics generation performance
 */
export function trackAnalyticsGeneration(
  judgeId: string,
  caseCount: number,
  duration: number,
  success: boolean,
  error?: string
): void {
  trackMetric({
    type: 'analytics_generation',
    operation: 'generate_bias_analytics',
    duration_ms: duration,
    success,
    metadata: {
      judge_id: judgeId,
      case_count: caseCount,
    },
    error,
  })
}

/**
 * Track judge profile load performance
 */
export function trackJudgeProfileLoad(judgeId: string, duration: number, cached: boolean): void {
  trackMetric({
    type: 'judge_profile_load',
    operation: 'load_profile',
    duration_ms: duration,
    success: true,
    metadata: {
      judge_id: judgeId,
      cached,
    },
  })
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(
  query: string,
  duration: number,
  rowCount?: number,
  error?: string
): void {
  trackMetric({
    type: 'database_query',
    operation: query,
    duration_ms: duration,
    success: !error,
    metadata: {
      row_count: rowCount,
    },
    error,
  })
}

/**
 * Track external API call performance
 */
export function trackExternalApiCall(
  service: string,
  endpoint: string,
  duration: number,
  statusCode?: number,
  error?: string
): void {
  trackMetric({
    type: 'external_api_call',
    operation: `${service}:${endpoint}`,
    duration_ms: duration,
    success: !error && statusCode !== undefined && statusCode < 400,
    metadata: {
      service,
      endpoint,
      status_code: statusCode,
    },
    error,
  })
}

/**
 * Track cache operation performance
 */
export function trackCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  key: string,
  duration: number,
  success: boolean
): void {
  trackMetric({
    type: 'cache_operation',
    operation,
    duration_ms: duration,
    success,
    metadata: {
      key_length: key.length,
    },
  })
}

/**
 * Store metric in database for historical analysis
 * This is async and should not block the request
 */
async function storeMetricInDatabase(data: MetricData): Promise<void> {
  try {
    const supabase = await createServiceRoleClient()

    await supabase
      .from('performance_metrics')
      .insert({
        metric_type: data.type,
        operation: data.operation,
        duration_ms: data.duration_ms,
        success: data.success,
        metadata: data.metadata || {},
        error_message: data.error,
        recorded_at: data.timestamp || new Date(),
      })
      .select()
  } catch (error) {
    // Silent failure - database issues shouldn't break metrics collection
    logger.error('Failed to store metric in database', {
      scope: 'metrics',
      error,
      metric_type: data.type,
    })
  }
}

/**
 * Calculate performance percentiles for a given endpoint
 */
export async function getPerformanceSnapshot(
  endpoint: string,
  periodMinutes: number = 60
): Promise<PerformanceSnapshot | null> {
  try {
    const supabase = await createServiceRoleClient()
    const periodStart = new Date(Date.now() - periodMinutes * 60 * 1000)

    const { data: metrics, error } = await supabase
      .from('performance_metrics')
      .select('duration_ms, success')
      .eq('operation', endpoint)
      .gte('recorded_at', periodStart.toISOString())
      .order('duration_ms', { ascending: true })

    if (error || !metrics || metrics.length === 0) {
      return null
    }

    const durations = metrics.map((m) => m.duration_ms)
    const errors = metrics.filter((m) => !m.success).length

    return {
      endpoint,
      p50: calculatePercentile(durations, 50),
      p95: calculatePercentile(durations, 95),
      p99: calculatePercentile(durations, 99),
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      count: metrics.length,
      error_rate: errors / metrics.length,
      period_start: periodStart,
      period_end: new Date(),
    }
  } catch (error) {
    logger.error('Failed to get performance snapshot', {
      scope: 'metrics',
      error,
      endpoint,
    })
    return null
  }
}

/**
 * Calculate percentile from sorted array of values
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
  return sortedValues[Math.max(0, index)]
}

/**
 * Get Redis cache statistics
 */
export async function getCacheStats(): Promise<{
  hit_rate: number
  total_operations: number
  avg_latency_ms: number
} | null> {
  try {
    const supabase = await createServiceRoleClient()
    const periodStart = new Date(Date.now() - 60 * 60 * 1000) // Last hour

    const { data: cacheMetrics, error } = await supabase
      .from('performance_metrics')
      .select('operation, duration_ms')
      .eq('metric_type', 'cache_operation')
      .gte('recorded_at', periodStart.toISOString())

    if (error || !cacheMetrics || cacheMetrics.length === 0) {
      return null
    }

    const hits = cacheMetrics.filter((m) => m.operation === 'hit').length
    const total = cacheMetrics.length
    const avgLatency = cacheMetrics.reduce((sum, m) => sum + m.duration_ms, 0) / total

    return {
      hit_rate: total > 0 ? hits / total : 0,
      total_operations: total,
      avg_latency_ms: avgLatency,
    }
  } catch (error) {
    logger.error('Failed to get cache stats', {
      scope: 'metrics',
      error,
    })
    return null
  }
}

/**
 * Helper to measure execution time of a function
 */
export class PerformanceTimer {
  private startTime: number
  private marks: Map<string, number>

  constructor() {
    this.startTime = Date.now()
    this.marks = new Map()
  }

  mark(label: string): void {
    this.marks.set(label, Date.now())
  }

  measure(label: string): number {
    const markTime = this.marks.get(label)
    if (!markTime) {
      return Date.now() - this.startTime
    }
    return Date.now() - markTime
  }

  elapsed(): number {
    return Date.now() - this.startTime
  }

  reset(): void {
    this.startTime = Date.now()
    this.marks.clear()
  }
}
