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
  isDataFresh,
} from '@/lib/analytics/cache'
import type { CaseAnalytics, AnalysisWindow } from '@/lib/analytics/types'

// AI analytics pipeline is used internally by '@/lib/analytics/ai-augment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// PERFORMANCE CONFIGURATION: Limit case queries to prevent database overload
// - Default 1000 cases provides statistical significance (95% confidence)
// - Prevents slow queries for judges with 5000+ cases
// - Configurable via JUDGE_ANALYTICS_CASE_LIMIT env variable
// - Combined with LOOKBACK_YEARS to focus on recent judicial behavior
const LOOKBACK_YEARS = Math.max(1, parseInt(process.env.JUDGE_ANALYTICS_LOOKBACK_YEARS ?? '5', 10))
const CASE_FETCH_LIMIT = Math.max(
  200,
  parseInt(process.env.JUDGE_ANALYTICS_CASE_LIMIT ?? '1000', 10)
)

// Types imported from '@/lib/analytics/types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const resolvedParams = await params
  const judgeId = resolvedParams.id
  const { searchParams } = new URL(request.url)
  const debugMode = searchParams.get('debug') === 'true'

  // Initialize debug diagnostics
  const diagnostics = {
    judgeId,
    startTime: new Date().toISOString(),
    steps: [] as Array<{
      step: string
      timestamp: string
      duration_ms: number
      success: boolean
      details?: any
    }>,
    errors: [] as Array<{ stage: string; error: string; details?: any }>,
  }

  const recordStep = (step: string, success: boolean, details?: any) => {
    const stepTime = Date.now()
    diagnostics.steps.push({
      step,
      timestamp: new Date().toISOString(),
      duration_ms: stepTime - startTime,
      success,
      details,
    })
  }

  const recordError = (stage: string, error: Error | string, details?: any) => {
    const errorMessage = error instanceof Error ? error.message : error
    diagnostics.errors.push({ stage, error: errorMessage, details })
    logger.error(
      `Analytics error at ${stage}`,
      { judgeId, stage, details },
      error instanceof Error ? error : undefined
    )
  }

  try {
    // Log incoming request
    const ip = getClientIp(request)
    logger.apiRequest('GET', `/api/judges/${judgeId}/analytics`, {
      ip,
      debugMode,
      userAgent: request.headers.get('user-agent'),
    })

    // Rate limit per IP per judge analytics
    const rl = buildRateLimiter({ tokens: 20, window: '1 m', prefix: 'api:judge-analytics' })
    const judgeKey = judgeId
    const { success, remaining } = await rl.limit(`${ip}:${judgeKey}`)
    if (!success) {
      recordStep('rate_limit_check', false, { remaining: 0 })
      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 429, duration, {
        reason: 'rate_limit_exceeded',
      })
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429 }
      )
    }
    recordStep('rate_limit_check', true, { remaining })

    // Redis edge cache first - use cached data if available (indefinite cache)
    const redisKey = `judge:analytics:${judgeKey}`
    const cachedRedis = await redisGetJSON<{ analytics: CaseAnalytics; created_at: string }>(
      redisKey
    )
    recordStep('redis_cache_check', true, {
      found: !!cachedRedis,
      age_days: cachedRedis ? getDaysSince(cachedRedis.created_at) : null,
    })

    if (cachedRedis) {
      // Validate cached analytics has required fields
      const validationResult = validateAnalytics(cachedRedis.analytics)
      if (!validationResult.valid) {
        recordError('redis_cache_validation', 'Invalid cached analytics structure', {
          missing_fields: validationResult.missing,
        })
        logger.warn('Redis cache has invalid analytics structure, clearing cache', {
          judgeId,
          missing: validationResult.missing,
        })
        // Continue to regenerate rather than serving invalid data
      } else {
        const cacheAge = getDaysSince(cachedRedis.created_at)
        const headers = new Headers()

        // Add warning header if cache is older than 30 days
        if (cacheAge > 30) {
          headers.set(
            'X-Analytics-Warning',
            `Data is ${cacheAge} days old. Consider refreshing for most current insights.`
          )
          headers.set('X-Cache-Age-Days', cacheAge.toString())
        }

        const response = {
          analytics: cachedRedis.analytics,
          cached: true,
          data_source: 'redis_cache',
          last_updated: cachedRedis.created_at,
          cache_age_days: cacheAge,
          rate_limit_remaining: remaining,
        }

        if (debugMode) {
          ;(response as any).debug = {
            ...diagnostics,
            total_duration_ms: Date.now() - startTime,
            cache_status: 'hit_redis',
            cache_age_days: cacheAge,
            validation: validationResult,
          }
        }

        const duration = Date.now() - startTime
        logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 200, duration, {
          source: 'redis_cache',
          cache_age_days: cacheAge,
        })

        return NextResponse.json(response, { headers })
      }
    }

    const supabase = await createServiceRoleClient()
    recordStep('supabase_client_created', true)

    // Get judge data - only fields needed for analytics generation
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select(
        'id, name, court_id, court_name, jurisdiction, total_cases, appointed_date, status, education, bio, reversal_rate, average_decision_time, created_at, updated_at'
      )
      .eq('id', judgeId)
      .single()

    if (judgeError || !judge) {
      recordStep('judge_fetch', false, { error: judgeError?.message })
      recordError('judge_fetch', judgeError || 'Judge not found')

      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 404, duration, {
        reason: 'judge_not_found',
      })

      return NextResponse.json(
        {
          error: 'Judge not found',
          message: `Unable to locate judge with ID: ${judgeId}. Please verify the judge ID and try again.`,
          ...(debugMode && { debug: diagnostics }),
        },
        { status: 404 }
      )
    }
    recordStep('judge_fetch', true, { judge_name: judge.name, court: judge.court_name })

    // Check if we have cached analytics - use indefinitely to prevent regeneration costs
    const cachedData = await fetchCachedAnalytics(supabase, judgeId)
    recordStep('database_cache_check', true, {
      found: !!cachedData,
      age_days: cachedData ? getDaysSince(cachedData.created_at) : null,
    })

    // Use cached data if available, regardless of age (cost protection)
    if (cachedData && cachedData.analytics.confidence_civil) {
      // Validate cached analytics
      const validationResult = validateAnalytics(cachedData.analytics)
      if (!validationResult.valid) {
        recordError('database_cache_validation', 'Invalid cached analytics structure', {
          missing_fields: validationResult.missing,
        })
        logger.warn('Database cache has invalid analytics structure', {
          judgeId,
          missing: validationResult.missing,
        })
        // Continue to regenerate
      } else {
        logger.info('Using cached analytics (indefinite cache)', { judgeId })
        const cacheAge = getDaysSince(cachedData.created_at)
        const headers = new Headers()

        // Add warning header if cache is older than 30 days
        if (cacheAge > 30) {
          headers.set(
            'X-Analytics-Warning',
            `Data is ${cacheAge} days old. Consider refreshing for most current insights.`
          )
          headers.set('X-Cache-Age-Days', cacheAge.toString())
        }

        const response = {
          analytics: cachedData.analytics,
          cached: true,
          data_source: 'database_cache',
          last_updated: cachedData.created_at,
          cache_age_days: cacheAge,
          rate_limit_remaining: remaining,
        }

        if (debugMode) {
          ;(response as any).debug = {
            ...diagnostics,
            total_duration_ms: Date.now() - startTime,
            cache_status: 'hit_database',
            cache_age_days: cacheAge,
            validation: validationResult,
          }
        }

        const duration = Date.now() - startTime
        logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 200, duration, {
          source: 'database_cache',
          cache_age_days: cacheAge,
        })

        return NextResponse.json(response, { headers })
      }
    }

    logger.info('Regenerating analytics', {
      judgeId,
      reason: cachedData ? 'old format or invalid' : 'no cache',
    })
    recordStep('cache_decision', true, {
      decision: 'regenerate',
      reason: cachedData ? 'invalid_or_old_format' : 'no_cache',
    })

    // Get cases for this judge from the configured lookback window
    const now = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - LOOKBACK_YEARS)
    const lookbackStartDate = startDate.toISOString().split('T')[0]
    const analysisWindow = {
      lookbackYears: LOOKBACK_YEARS,
      startYear: startDate.getFullYear(),
      endYear: now.getFullYear(),
    }

    // PERFORMANCE: Select only fields required for analytics calculations
    // Fields needed: case_type (classification), outcome/status (results), summary (AI analysis),
    // filing_date/decision_date (temporal analysis), case_value (financial metrics)
    const caseFetchStart = Date.now()
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('case_type, outcome, status, summary, filing_date, decision_date, case_value')
      .eq('judge_id', judgeId)
      .gte('filing_date', lookbackStartDate) // Only cases filed within lookback window
      .order('filing_date', { ascending: false })
      .limit(CASE_FETCH_LIMIT)

    const caseFetchDuration = Date.now() - caseFetchStart

    // FIX #1: Handle cases query failure properly instead of silent failure
    if (casesError) {
      recordStep('cases_fetch', false, {
        error: casesError.message,
        duration_ms: caseFetchDuration,
      })
      recordError('cases_fetch', casesError.message, { code: casesError.code })
      logger.error(
        'Failed to fetch cases for analytics generation',
        {
          judgeId,
          judge_name: judge.name,
          duration_ms: caseFetchDuration,
        },
        casesError as Error
      )

      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 500, duration, {
        reason: 'cases_fetch_failed',
        error: casesError.message,
      })

      return NextResponse.json(
        {
          error: 'Database query failed',
          message:
            'Unable to retrieve case data for this judge. This may be a temporary database issue. Please try again in a few moments.',
          technical_details: casesError.message,
          judge_name: judge.name,
          suggested_action:
            'If this error persists, please contact support with the judge ID and timestamp.',
          ...(debugMode && { debug: diagnostics }),
        },
        { status: 500 }
      )
    }

    recordStep('cases_fetch', true, {
      count: cases?.length || 0,
      duration_ms: caseFetchDuration,
      lookback_years: LOOKBACK_YEARS,
      limit: CASE_FETCH_LIMIT,
    })
    logger.performance('cases_fetch', caseFetchDuration, { judgeId, count: cases?.length || 0 })

    const enrichStart = Date.now()
    const enrichedCases = await enrichWithOpinions(supabase, cases || [])
    const enrichDuration = Date.now() - enrichStart
    recordStep('case_enrichment', true, {
      enriched_count: enrichedCases.length,
      duration_ms: enrichDuration,
    })
    logger.performance('case_enrichment', enrichDuration, { judgeId, count: enrichedCases.length })

    // Generate analytics based on available data
    let analytics: CaseAnalytics
    let generationMethod: string

    const analyticsStart = Date.now()
    if (enrichedCases.length === 0) {
      // No cases available - use traditional method with lower confidence
      generationMethod = 'legacy_estimation'
      analytics = await computeLegacy(judge, analysisWindow)
      recordStep('analytics_generation', true, {
        method: generationMethod,
        duration_ms: Date.now() - analyticsStart,
        reason: 'no_cases_available',
      })
      logger.warn('Generated analytics without case data', {
        judgeId,
        judge_name: judge.name,
        method: generationMethod,
      })
    } else {
      // Generate analytics from real case data
      generationMethod = 'case_analysis'
      analytics = await generateAnalyticsFromCases(judge, enrichedCases, analysisWindow)
      recordStep('analytics_generation', true, {
        method: generationMethod,
        case_count: enrichedCases.length,
        duration_ms: Date.now() - analyticsStart,
      })
    }
    logger.performance('analytics_generation', Date.now() - analyticsStart, {
      judgeId,
      method: generationMethod,
      case_count: enrichedCases.length,
    })

    // FIX #2: Validate analytics before caching
    const validationResult = validateAnalytics(analytics)
    if (!validationResult.valid) {
      recordError('analytics_validation', 'Generated analytics missing required fields', {
        missing_fields: validationResult.missing,
      })
      logger.error('Generated analytics failed validation', {
        judgeId,
        missing: validationResult.missing,
        method: generationMethod,
      })

      const duration = Date.now() - startTime
      logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 500, duration, {
        reason: 'analytics_validation_failed',
        missing_fields: validationResult.missing,
      })

      return NextResponse.json(
        {
          error: 'Analytics generation produced incomplete results',
          message:
            'The analytics calculation completed but is missing required data fields. This indicates a system issue.',
          missing_fields: validationResult.missing,
          judge_name: judge.name,
          suggested_action:
            'Please report this issue to technical support with the judge ID and timestamp.',
          ...(debugMode && { debug: diagnostics }),
        },
        { status: 500 }
      )
    }
    recordStep('analytics_validation', true, { all_required_fields_present: true })

    // Cache the results with INDEFINITE TTL to prevent regeneration costs
    // Redis: 90 days (practical limit), DB: permanent until manually refreshed
    const cacheStart = Date.now()
    try {
      await redisSetJSON(
        redisKey,
        { analytics, created_at: new Date().toISOString() },
        60 * 60 * 24 * 90
      )
      recordStep('redis_cache_write', true, { ttl_days: 90 })
    } catch (redisError) {
      recordError(
        'redis_cache_write',
        redisError instanceof Error ? redisError.message : 'Redis write failed'
      )
      logger.warn('Failed to cache analytics in Redis', { judgeId }, redisError as Error)
      // Continue - Redis cache is optional
    }

    try {
      await storeAnalyticsCache(supabase, judgeId, analytics)
      recordStep('database_cache_write', true)
    } catch (dbError) {
      recordError(
        'database_cache_write',
        dbError instanceof Error ? dbError.message : 'Database write failed'
      )
      logger.warn('Failed to cache analytics in database', { judgeId }, dbError as Error)
      // Continue - we still return the result
    }
    logger.performance('cache_write', Date.now() - cacheStart, { judgeId })

    const response: any = {
      analytics,
      cached: false,
      data_source: enrichedCases.length > 0 ? 'case_analysis' : 'profile_estimation',
      document_count: enrichedCases.length,
      generation_method: generationMethod,
      analysis_window: analysisWindow,
      rate_limit_remaining: remaining,
    }

    // FIX #3: Add debug mode with detailed diagnostics
    if (debugMode) {
      response.debug = {
        ...diagnostics,
        total_duration_ms: Date.now() - startTime,
        cache_status: 'miss',
        generation_method: generationMethod,
        case_count: enrichedCases.length,
        lookback_config: {
          years: LOOKBACK_YEARS,
          case_limit: CASE_FETCH_LIMIT,
          start_date: lookbackStartDate,
        },
        performance_breakdown: {
          case_fetch_ms: caseFetchDuration,
          enrichment_ms: enrichDuration,
          analytics_generation_ms: Date.now() - analyticsStart,
          cache_write_ms: Date.now() - cacheStart,
        },
        validation: validationResult,
      }
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 200, duration, {
      source: generationMethod,
      case_count: enrichedCases.length,
      cached: false,
    })

    return NextResponse.json(response)
  } catch (error) {
    recordError('unhandled_exception', error instanceof Error ? error.message : 'Unknown error')
    logger.error('Analytics generation error', { judgeId }, error as Error)

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/judges/${judgeId}/analytics`, 500, duration, {
      reason: 'unhandled_exception',
      error: error instanceof Error ? error.message : 'unknown',
    })

    // FIX #5: Improved error messages with actionable guidance
    return NextResponse.json(
      {
        error: 'Failed to generate analytics',
        message:
          'An unexpected error occurred while generating analytics. This has been logged and will be investigated.',
        technical_details: error instanceof Error ? error.message : 'Unknown error',
        suggested_action:
          'Please try again in a few moments. If the issue persists, contact support with this judge ID.',
        judge_id: judgeId,
        timestamp: new Date().toISOString(),
        ...(debugMode && { debug: diagnostics }),
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to calculate days since a timestamp
 */
function getDaysSince(timestamp: string): number {
  const then = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * FIX #2: Validate analytics object has required fields before caching
 */
function validateAnalytics(analytics: CaseAnalytics): { valid: boolean; missing: string[] } {
  const requiredFields = [
    'confidence_civil',
    'confidence_criminal',
    'confidence_family',
    'confidence_administrative',
    'verdict_rate_plaintiff',
    'verdict_rate_defendant',
    'settlement_rate',
    'average_trial_duration_days',
  ]

  const missing: string[] = []

  for (const field of requiredFields) {
    if (!(field in analytics) || analytics[field as keyof CaseAnalytics] === undefined) {
      missing.push(field)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Generate analytics from actual case data
 */
async function generateAnalyticsFromCases(
  judge: any,
  cases: any[],
  window: AnalysisWindow
): Promise<CaseAnalytics> {
  try {
    logger.info('Generating analytics from cases', {
      judgeName: judge.name,
      caseCount: cases.length,
    })

    const analytics = computeStatistical(judge, cases, window)

    if (process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        return await enhanceWithAI(judge, cases, analytics, window)
      } catch (aiError) {
        logger.warn('AI enhancement failed, using statistical analysis', {
          judgeName: judge.name,
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error',
        })
      }
    }

    return analytics
  } catch (error) {
    logger.error('Analytics generation failed', { judgeName: judge.name }, error as Error)
    return computeConservative(judge, cases.length, window)
  }
}

/**
 * Force refresh analytics (for admin use)
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('force') === 'true'

    if (!forceRefresh) {
      return NextResponse.json({ error: 'Force refresh required' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    // Clear existing cache
    await supabase.from('judge_analytics_cache').delete().eq('judge_id', resolvedParams.id)

    // Regenerate analytics
    const response = await GET(request, { params: Promise.resolve(resolvedParams) })
    const data = await response.json()

    return NextResponse.json({
      message: 'Analytics refreshed successfully',
      analytics: data.analytics,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to refresh analytics' }, { status: 500 })
  }
}
