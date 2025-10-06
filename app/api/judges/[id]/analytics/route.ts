import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildRateLimiter, getClientIp } from '@/lib/security/rate-limit'
import { redisGetJSON, redisSetJSON } from '@/lib/cache/redis'
import { logger } from '@/lib/utils/logger'
import { analyzeJudicialPatterns as computeStatistical, generateLegacyAnalytics as computeLegacy, generateConservativeAnalytics as computeConservative } from '@/lib/analytics/statistical'
import { enhanceAnalyticsWithAI as enhanceWithAI } from '@/lib/analytics/ai-augment'
import { enrichCasesWithOpinions as enrichWithOpinions } from '@/lib/analytics/enrichment'
import { getCachedAnalytics as fetchCachedAnalytics, cacheAnalytics as storeAnalyticsCache, isDataFresh } from '@/lib/analytics/cache'
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
const CASE_FETCH_LIMIT = Math.max(200, parseInt(process.env.JUDGE_ANALYTICS_CASE_LIMIT ?? '1000', 10))

// Types imported from '@/lib/analytics/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit per IP per judge analytics
    const rl = buildRateLimiter({ tokens: 20, window: '1 m', prefix: 'api:judge-analytics' })
    const ip = getClientIp(request)
    const judgeKey = (await params).id
    const { success, remaining } = await rl.limit(`${ip}:${judgeKey}`)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Redis edge cache first - use cached data if available (indefinite cache)
    const redisKey = `judge:analytics:${judgeKey}`
    const cachedRedis = await redisGetJSON<{ analytics: CaseAnalytics; created_at: string }>(redisKey)
    if (cachedRedis) {
      // Return cached data regardless of age to prevent regeneration costs
      return NextResponse.json({
        analytics: cachedRedis.analytics,
        cached: true,
        data_source: 'redis_cache',
        last_updated: cachedRedis.created_at,
        rate_limit_remaining: remaining
      })
    }

    const resolvedParams = await params
    const supabase = await createServiceRoleClient()
    
    // Get judge data
    const { data: judge, error: judgeError } = await supabase
      .from('judges')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()

    if (judgeError || !judge) {
      return NextResponse.json(
        { error: 'Judge not found' },
        { status: 404 }
      )
    }

    // Check if we have cached analytics - use indefinitely to prevent regeneration costs
    const cachedData = await fetchCachedAnalytics(supabase, resolvedParams.id)

    // Use cached data if available, regardless of age (cost protection)
    if (cachedData && cachedData.analytics.confidence_civil) {
      logger.info('Using cached analytics (indefinite cache)', { judgeId: resolvedParams.id })
      return NextResponse.json({
        analytics: cachedData.analytics,
        cached: true,
        data_source: 'database_cache',
        last_updated: cachedData.created_at
      })
    }
    
    logger.info('Regenerating analytics', { judgeId: resolvedParams.id, reason: cachedData ? 'old format' : 'no cache' })

    // Get cases for this judge from the configured lookback window
    const now = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - LOOKBACK_YEARS)
    const lookbackStartDate = startDate.toISOString().split('T')[0]
    const analysisWindow = {
      lookbackYears: LOOKBACK_YEARS,
      startYear: startDate.getFullYear(),
      endYear: now.getFullYear()
    }
    
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('*')
      .eq('judge_id', resolvedParams.id)
      .gte('filing_date', lookbackStartDate) // Only cases filed within lookback window
      .order('filing_date', { ascending: false })
      .limit(CASE_FETCH_LIMIT)

    if (casesError) {
      logger.error('Error fetching cases', undefined, casesError as Error)
      // Don't fail completely, continue with empty cases array
    }

    const enrichedCases = await enrichWithOpinions(supabase, cases || [])

    // Generate analytics based on available data
    let analytics: CaseAnalytics

    if (enrichedCases.length === 0) {
      // No cases available - use traditional method with lower confidence
      analytics = await computeLegacy(judge, analysisWindow)
    } else {
      // Generate analytics from real case data
      analytics = await generateAnalyticsFromCases(judge, enrichedCases, analysisWindow)
    }

    // Cache the results with INDEFINITE TTL to prevent regeneration costs
    // Redis: 90 days (practical limit), DB: permanent until manually refreshed
    await redisSetJSON(redisKey, { analytics, created_at: new Date().toISOString() }, 60 * 60 * 24 * 90)
    await storeAnalyticsCache(supabase, resolvedParams.id, analytics)

    return NextResponse.json({ 
      analytics,
      cached: false,
      data_source: enrichedCases.length > 0 ? 'case_analysis' : 'profile_estimation',
      document_count: enrichedCases.length,
      rate_limit_remaining: remaining
    })

  } catch (error) {
    logger.error('Analytics generation error', undefined, error as Error)
    return NextResponse.json(
      { 
        error: 'Failed to generate analytics', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Generate analytics from actual case data
 */
async function generateAnalyticsFromCases(judge: any, cases: any[], window: AnalysisWindow): Promise<CaseAnalytics> {
  try {
    logger.info('Generating analytics from cases', { judgeName: judge.name, caseCount: cases.length })

    const analytics = computeStatistical(judge, cases, window)

    if (process.env.GOOGLE_AI_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        return await enhanceWithAI(judge, cases, analytics, window)
      } catch (aiError) {
        logger.warn('AI enhancement failed, using statistical analysis', {
          judgeName: judge.name,
          error: aiError instanceof Error ? aiError.message : 'Unknown AI error'
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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('force') === 'true'
    
    if (!forceRefresh) {
      return NextResponse.json(
        { error: 'Force refresh required' },
        { status: 400 }
      )
    }

    const supabase = await createServiceRoleClient()
    
    // Clear existing cache
    await supabase
      .from('judge_analytics_cache')
      .delete()
      .eq('judge_id', resolvedParams.id)

    // Regenerate analytics
    const response = await GET(request, { params: Promise.resolve(resolvedParams) })
    const data = await response.json()
    
    return NextResponse.json({
      message: 'Analytics refreshed successfully',
      analytics: data.analytics
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to refresh analytics' },
      { status: 500 }
    )
  }
}
