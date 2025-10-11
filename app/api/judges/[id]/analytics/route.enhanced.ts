import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'
import { redisGetJSON, redisSetJSON } from '@/lib/cache/redis'
import { logger } from '@/lib/utils/logger'
import {
  analyzeJudicialPatterns as computeStatistical,
  generateLegacyAnalytics as computeLegacy,
  generateConservativeAnalytics as computeConservative,
} from '@/lib/analytics/statistical'
import { enhanceAnalyticsWithAI as enhanceWithAI } from '@/lib/analytics/ai-augment'
import { enrichCasesWithOpinions as enrichWithOpinions } from '@/lib/analytics/enrichment'
import {
  getCachedAnalytics as fetchCachedAnalytics,
  cacheAnalytics as storeAnalyticsCache,
} from '@/lib/analytics/cache'
import type { CaseAnalytics, AnalysisWindow } from '@/lib/analytics/types'
import type { Judge } from '@/types'

// Error handling imports
import { getCircuitBreaker, CircuitState } from '@/lib/error-handling/circuit-breaker'
import { retryWithBackoff, RetryError } from '@/lib/error-handling/retry'
import {
  AnalyticsHealthMonitor,
  generateFallbackAnalytics,
  withTimeout,
  withFallbackChain,
  aggregatePartialResults,
} from '@/lib/error-handling/graceful-degradation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Configuration constants
const LOOKBACK_YEARS = Math.max(1, parseInt(process.env.JUDGE_ANALYTICS_LOOKBACK_YEARS ?? '5', 10))
const CASE_FETCH_LIMIT = Math.max(
  200,
  parseInt(process.env.JUDGE_ANALYTICS_CASE_LIMIT ?? '1000', 10)
)
const MATERIALIZED_VIEW_FRESHNESS_HOURS = 24
const DATABASE_TIMEOUT_MS = 30000 // 30 seconds
const REDIS_TIMEOUT_MS = 5000 // 5 seconds
const ANALYTICS_GENERATION_TIMEOUT_MS = 60000 // 60 seconds

// Circuit breakers for each service
const redisCircuitBreaker = getCircuitBreaker('redis-analytics', {
  failureThreshold: 3,
  timeout: 30000,
})
const supabaseCircuitBreaker = getCircuitBreaker('supabase-analytics', {
  failureThreshold: 5,
  timeout: 60000,
})
const materializedViewCircuitBreaker = getCircuitBreaker('materialized-views', {
  failureThreshold: 3,
  timeout: 45000,
})

// Global health monitor
const healthMonitor = new AnalyticsHealthMonitor()

/**
 * Main GET handler with comprehensive error handling
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  let judgeId: string | undefined

  try {
    // STEP 1: Resolve params with error handling
    const resolvedParams = await retryWithBackoff(
      async () => {
        const p = await params
        if (!p?.id) {
          throw new Error('Invalid judge ID in params')
        }
        return p
      },
      { maxAttempts: 2, initialDelay: 100, name: 'resolve-params' }
    )
    judgeId = resolvedParams.id

    // STEP 2: Rate limiting with fallback
    let remaining = 0
    try {
      const rl = buildRateLimiter({ tokens: 20, window: '1 m', prefix: 'api:judge-analytics' })
      const ip = getClientIp(request)
      const { success, remaining: r } = await rl.limit(`${ip}:${judgeId}`)
      remaining = r

      if (!success) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
      }
    } catch (rateLimitError) {
      // Log but don't fail on rate limit errors in development
      logger.warn('Rate limiting unavailable, continuing without rate limit', {
        error: (rateLimitError as Error).message,
      })
    }

    // STEP 3: Try Redis cache with circuit breaker and timeout
    const redisKey = `judge:analytics:${judgeId}`
    let cachedRedis: { analytics: CaseAnalytics; created_at: string } | null = null

    try {
      cachedRedis = await redisCircuitBreaker.execute(async () => {
        return await withTimeout(
          () => redisGetJSON<{ analytics: CaseAnalytics; created_at: string }>(redisKey),
          REDIS_TIMEOUT_MS,
          () => null,
          'redis-get'
        )
      })

      healthMonitor.recordHealth('redis', true, Date.now() - startTime)

      if (cachedRedis) {
        logger.info('Cache hit: Redis', { judgeId })
        return NextResponse.json({
          analytics: cachedRedis.analytics,
          cached: true,
          data_source: 'redis_cache',
          last_updated: cachedRedis.created_at,
          rate_limit_remaining: remaining,
          degradation_level: 'optimal',
        })
      }
    } catch (error) {
      healthMonitor.recordHealth('redis', false, Date.now() - startTime, (error as Error).message)
      logger.warn('Redis cache unavailable', {
        judgeId,
        error: (error as Error).message,
        circuitState: redisCircuitBreaker.getStats().state,
      })
    }

    // STEP 4: Get Supabase client with retry
    const supabase = await retryWithBackoff(
      async () => {
        const client = await createServiceRoleClient()
        if (!client) {
          throw new Error('Failed to create Supabase client')
        }
        return client
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        name: 'create-supabase-client',
        retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
      }
    )

    // STEP 5: Fetch judge with circuit breaker
    const judge = await supabaseCircuitBreaker.execute(async () => {
      return await withTimeout(
        async () => {
          const { data, error } = await supabase
            .from('judges')
            .select(
              'id, name, court_id, court_name, jurisdiction, total_cases, appointed_date, status'
            )
            .eq('id', judgeId!)
            .single()

          if (error || !data) {
            throw new Error(error?.message || 'Judge not found')
          }

          return data
        },
        DATABASE_TIMEOUT_MS,
        async () => {
          throw new Error('Judge query timeout')
        },
        'fetch-judge'
      )
    })

    healthMonitor.recordHealth('supabase', true, Date.now() - startTime)

    // STEP 6: Check database cache with timeout
    let cachedData: { analytics: CaseAnalytics; created_at: string } | null = null

    try {
      cachedData = await withTimeout(
        () => fetchCachedAnalytics(supabase, judgeId!),
        DATABASE_TIMEOUT_MS,
        () => null,
        'fetch-cached-analytics'
      )

      if (cachedData && cachedData.analytics.confidence_civil) {
        logger.info('Cache hit: Database', { judgeId })
        return NextResponse.json({
          analytics: cachedData.analytics,
          cached: true,
          data_source: 'database_cache',
          last_updated: cachedData.created_at,
          rate_limit_remaining: remaining,
          degradation_level: 'degraded', // Redis unavailable but DB cache works
        })
      }
    } catch (error) {
      logger.warn('Database cache check failed', {
        judgeId,
        error: (error as Error).message,
      })
    }

    // STEP 7: Generate analytics with fallback chain
    logger.info('Regenerating analytics', {
      judgeId,
      reason: cachedData ? 'old format' : 'no cache',
    })

    const window: AnalysisWindow = {
      lookbackYears: LOOKBACK_YEARS,
      startYear: new Date().getFullYear() - LOOKBACK_YEARS,
      endYear: new Date().getFullYear(),
    }

    // Try multiple generation strategies
    const { result: analytics, strategy } = await withFallbackChain(
      [
        {
          name: 'materialized_views',
          operation: async () => {
            return await materializedViewCircuitBreaker.execute(async () => {
              const mvStats = await checkMaterializedViewFreshness(supabase, judgeId!)

              if (!mvStats.isFresh || !mvStats.hasData) {
                throw new Error('Materialized views not fresh or missing')
              }

              healthMonitor.recordHealth('materialized_views', true)

              return await generateAnalyticsFromMaterializedViews(judge, supabase, judgeId!)
            })
          },
        },
        {
          name: 'case_analysis',
          operation: async () => {
            return await generateAnalyticsFromCases(judge, supabase, judgeId!, window)
          },
        },
        {
          name: 'legacy_estimation',
          operation: async () => {
            return computeLegacy(judge, window)
          },
        },
      ],
      () => {
        const degradation = healthMonitor.getDegradationLevel()
        return generateFallbackAnalytics(
          judge,
          window,
          degradation.reason || 'All analytics generation methods failed'
        )
      }
    )

    // STEP 8: Cache results (best effort, don't fail on cache errors)
    try {
      await Promise.allSettled([
        redisCircuitBreaker.execute(() =>
          redisSetJSON(
            redisKey,
            { analytics, created_at: new Date().toISOString() },
            60 * 60 * 24 * 90
          )
        ),
        storeAnalyticsCache(supabase, judgeId!, analytics),
      ])
    } catch (cacheError) {
      logger.warn('Failed to cache analytics', {
        judgeId,
        error: (cacheError as Error).message,
      })
    }

    // STEP 9: Return response with degradation info
    const degradationLevel = healthMonitor.getDegradationLevel()
    const duration = Date.now() - startTime

    logger.info('Analytics generated successfully', {
      judgeId,
      strategy,
      duration,
      degradationLevel: degradationLevel.level,
    })

    return NextResponse.json({
      analytics,
      cached: false,
      data_source: strategy,
      degradation_level: degradationLevel.level,
      degradation_reason: degradationLevel.reason,
      generation_time_ms: duration,
      rate_limit_remaining: remaining,
      circuit_breaker_stats: {
        redis: redisCircuitBreaker.getStats(),
        supabase: supabaseCircuitBreaker.getStats(),
        materialized_views: materializedViewCircuitBreaker.getStats(),
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    const degradationLevel = healthMonitor.getDegradationLevel()

    logger.error(
      'Analytics route error',
      {
        judgeId,
        duration,
        degradationLevel: degradationLevel.level,
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      error as Error
    )

    // Return appropriate error response
    if (error instanceof RetryError) {
      return NextResponse.json(
        {
          error: 'Service temporarily unavailable',
          details: 'Multiple retry attempts failed',
          degradation_level: degradationLevel.level,
          retry_after: 60,
        },
        { status: 503 }
      )
    }

    if (
      (error as Error).message.includes('Judge not found') ||
      (error as Error).message.includes('Invalid judge ID')
    ) {
      return NextResponse.json(
        {
          error: 'Judge not found',
          details: (error as Error).message,
        },
        { status: 404 }
      )
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Failed to generate analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
        degradation_level: degradationLevel.level,
        duration_ms: duration,
      },
      { status: 500 }
    )
  }
}

/**
 * Check materialized view freshness with error handling
 */
async function checkMaterializedViewFreshness(
  supabase: any,
  judgeId: string
): Promise<{
  isFresh: boolean
  hasData: boolean
  ageHours: number | null
  totalCases: number
}> {
  try {
    const { data: stats, error } = await supabase
      .from('mv_judge_statistics_summary')
      .select('statistics_generated_at, total_cases')
      .eq('judge_id', judgeId)
      .single()

    if (error || !stats) {
      return { isFresh: false, hasData: false, ageHours: null, totalCases: 0 }
    }

    const generatedAt = new Date(stats.statistics_generated_at)
    const ageMs = Date.now() - generatedAt.getTime()
    const ageHours = ageMs / (1000 * 60 * 60)
    const isFresh = ageHours <= MATERIALIZED_VIEW_FRESHNESS_HOURS

    return {
      isFresh,
      hasData: true,
      ageHours: Math.round(ageHours * 10) / 10,
      totalCases: stats.total_cases || 0,
    }
  } catch (error) {
    logger.warn('Failed to check materialized view freshness', { judgeId, error })
    return { isFresh: false, hasData: false, ageHours: null, totalCases: 0 }
  }
}

/**
 * Generate analytics from materialized views with error handling
 */
async function generateAnalyticsFromMaterializedViews(
  judge: Partial<Judge>,
  supabase: any,
  judgeId: string
): Promise<CaseAnalytics> {
  const { result, failures } = await aggregatePartialResults(
    [
      {
        name: 'statistics',
        required: true,
        operation: () =>
          supabase
            .from('mv_judge_statistics_summary')
            .select('*')
            .eq('judge_id', judgeId)
            .single()
            .then((r: any) => r.data),
      },
      {
        name: 'outcomes',
        required: false,
        operation: () =>
          supabase
            .from('mv_judge_outcome_distributions')
            .select('*')
            .eq('judge_id', judgeId)
            .then((r: any) => r.data || []),
      },
      {
        name: 'case_types',
        required: false,
        operation: () =>
          supabase
            .from('mv_judge_case_type_summary')
            .select('*')
            .eq('judge_id', judgeId)
            .order('case_count', { ascending: false })
            .then((r: any) => r.data || []),
      },
    ],
    (results) => {
      const stats = results.get('statistics')
      const outcomes = results.get('outcomes') || []
      const caseTypes = results.get('case_types') || []

      if (!stats) {
        throw new Error('Required statistics not available from materialized views')
      }

      return convertMaterializedViewToAnalytics(judge, stats, outcomes, caseTypes)
    }
  )

  if (failures.length > 0) {
    logger.warn('Some materialized view queries failed', {
      failures,
      judgeName: judge.name,
    })
  }

  return result
}

/**
 * Convert materialized view data to analytics format
 */
function convertMaterializedViewToAnalytics(
  judge: Partial<Judge>,
  stats: any,
  outcomes: any[],
  caseTypes: any[]
): CaseAnalytics {
  const totalCases = stats.total_cases || 0
  const confidence = Math.min(0.95, 0.3 + (totalCases / 1000) * 0.65)

  const window: AnalysisWindow = {
    lookbackYears: LOOKBACK_YEARS,
    startYear: stats.earliest_decision_date
      ? new Date(stats.earliest_decision_date).getFullYear()
      : new Date().getFullYear() - LOOKBACK_YEARS,
    endYear: stats.latest_decision_date
      ? new Date(stats.latest_decision_date).getFullYear()
      : new Date().getFullYear(),
  }

  const baseAnalytics = computeConservative(judge, totalCases, window)

  return {
    ...baseAnalytics,
    confidence_civil: confidence,
    settlement_rate_civil: (stats.settlement_rate_percent || 0) / 100,
    plaintiff_win_rate: (stats.plaintiff_win_rate_percent || 0) / 100,
    case_volume_score: Math.min(100, (stats.cases_last_year || 0) * 2),
    recent_activity_level: stats.is_recently_active ? 'High' : 'Low',
    specialization_areas: caseTypes
      .filter((ct) => ct.case_type_percentage >= 25)
      .slice(0, 3)
      .map((ct) => ct.case_type),
    years_on_bench: stats.latest_decision_date
      ? new Date().getFullYear() - new Date(stats.earliest_decision_date).getFullYear()
      : 0,
    total_cases_analyzed: totalCases,
    data_quality: {
      has_recent_cases: stats.is_recently_active || false,
      case_count: totalCases,
      date_range_years: window.endYear - window.startYear,
      confidence_level: confidence,
    },
  }
}

/**
 * Generate analytics from raw case data with error handling
 */
async function generateAnalyticsFromCases(
  judge: Partial<Judge>,
  supabase: any,
  judgeId: string,
  window: AnalysisWindow
): Promise<CaseAnalytics> {
  const startDate = new Date()
  startDate.setFullYear(startDate.getFullYear() - LOOKBACK_YEARS)
  const lookbackStartDate = startDate.toISOString().split('T')[0]

  const { data: cases, error: casesError } = await supabase
    .from('cases')
    .select('case_type, outcome, status, summary, filing_date, decision_date')
    .eq('judge_id', judgeId)
    .gte('filing_date', lookbackStartDate)
    .order('filing_date', { ascending: false })
    .limit(CASE_FETCH_LIMIT)

  if (casesError) {
    logger.error('Error fetching cases', { judgeId }, casesError as Error)
    throw casesError
  }

  if (!cases || cases.length === 0) {
    return computeLegacy(judge, window)
  }

  let enrichedCases = cases
  try {
    enrichedCases = await withTimeout(
      () => enrichWithOpinions(supabase, cases),
      30000,
      () => cases,
      'enrich-cases'
    )
  } catch (error) {
    logger.warn('Case enrichment failed, using unenriched cases', {
      judgeId,
      error: (error as Error).message,
    })
  }

  const analytics = computeStatistical(judge, enrichedCases, window)

  // Try AI enhancement if enabled
  if (process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      return await withTimeout(
        () => enhanceWithAI(judge, enrichedCases, analytics, window),
        ANALYTICS_GENERATION_TIMEOUT_MS,
        () => analytics,
        'ai-enhancement'
      )
    } catch (error) {
      logger.warn('AI enhancement failed, using statistical analysis', {
        judgeId,
        error: (error as Error).message,
      })
    }
  }

  return analytics
}

/**
 * Force refresh endpoint with comprehensive error handling
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('force') === 'true'

    if (!forceRefresh) {
      return NextResponse.json({ error: 'Force refresh required' }, { status: 400 })
    }

    // Clear caches with error handling
    try {
      const supabase = await createServiceRoleClient()
      await Promise.allSettled([
        supabase.from('judge_analytics_cache').delete().eq('judge_id', resolvedParams.id),
        redisCircuitBreaker.execute(() =>
          redisSetJSON(`judge:analytics:${resolvedParams.id}`, null, 0)
        ),
      ])
    } catch (error) {
      logger.warn('Failed to clear some caches during refresh', {
        judgeId: resolvedParams.id,
        error: (error as Error).message,
      })
    }

    // Reset circuit breakers
    redisCircuitBreaker.reset()
    supabaseCircuitBreaker.reset()
    materializedViewCircuitBreaker.reset()
    healthMonitor.reset()

    // Regenerate analytics
    const response = await GET(request, { params: Promise.resolve(resolvedParams) })
    const data = await response.json()

    return NextResponse.json({
      message: 'Analytics refreshed successfully',
      analytics: data.analytics,
      refreshed_at: new Date().toISOString(),
    })
  } catch (error) {
    logger.error('Failed to refresh analytics', undefined, error as Error)
    return NextResponse.json(
      {
        error: 'Failed to refresh analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
