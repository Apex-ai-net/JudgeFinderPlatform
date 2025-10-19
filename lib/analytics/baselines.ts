import { Redis } from '@upstash/redis'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { cache as memoryCache } from '@/lib/cache/simple-cache'
import {
  analyzeCaseTypePatterns,
  analyzeOutcomes,
  analyzeTemporalPatterns,
  calculateBiasIndicators,
  type BiasMetrics,
  type CaseRecord,
} from '@/lib/analytics/bias-calculations'

interface CourtBaseline {
  metrics: BiasMetrics
  sample_size: number
  generated_at: string
}

let redisClient: Redis | null = null

function getRedis(): Redis | null {
  if (redisClient) return redisClient
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redisClient = new Redis({ url, token })
  return redisClient
}

function cacheKey(courtId: string): string {
  return `analytics:baseline:court:${courtId}`
}

export async function getCourtBaseline(courtId: string): Promise<CourtBaseline | null> {
  const key = cacheKey(courtId)
  const redis = getRedis()

  if (redis) {
    try {
      const cached = await redis.get<CourtBaseline>(key)
      if (cached) {
        return cached
      }
    } catch (error) {
      // ignore redis errors and fall back to in-memory cache
    }
  }

  const cached = memoryCache.get<CourtBaseline>(key)
  if (cached) {
    return cached
  }

  const supabase = await createServiceRoleClient()
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 3)

  const { data: caseRows, error } = await supabase
    .from('cases')
    .select('case_type, outcome, status, case_value, filing_date, decision_date')
    .eq('court_id', courtId)
    .not('decision_date', 'is', null)
    .gte('decision_date', cutoff.toISOString())
    .limit(10000)

  if (error || !caseRows) {
    return null
  }

  const records = caseRows as CaseRecord[]
  if (records.length === 0) {
    return null
  }

  const caseTypePatterns = analyzeCaseTypePatterns(records)
  const outcomeAnalysis = analyzeOutcomes(records)
  const temporalPatterns = analyzeTemporalPatterns(records)
  const biasIndicators = calculateBiasIndicators(records, caseTypePatterns, outcomeAnalysis)

  const baseline: CourtBaseline = {
    metrics: {
      case_type_patterns: caseTypePatterns,
      outcome_analysis: outcomeAnalysis,
      temporal_patterns: temporalPatterns,
      bias_indicators: biasIndicators,
    },
    sample_size: records.length,
    generated_at: new Date().toISOString(),
  }

  if (redis) {
    try {
      await redis.set(key, baseline, { ex: 3600 })
    } catch (error) {
      // ignore cache set failures
    }
  } else {
    memoryCache.set(key, baseline, 3600)
  }

  return baseline
}

// ============================================================================
// JURISDICTION BASELINE TYPES
// ============================================================================

/**
 * Jurisdiction-level baseline metrics for comparing judges to their peers
 */
export interface JurisdictionBaseline {
  jurisdiction: string
  metrics: {
    settlement_rate: {
      mean: number
      std_dev: number
      sample_size: number
    }
    motion_grant_rate: {
      mean: number
      std_dev: number
      sample_size: number
    }
    avg_case_duration_days: {
      mean: number
      std_dev: number
      sample_size: number
    }
    plaintiff_favorable_rate: {
      mean: number
      std_dev: number
      sample_size: number
    }
  }
  total_cases: number
  judge_count: number
  generated_at: string
}

/**
 * Individual metric comparison result
 */
export interface MetricComparison {
  metric: string
  judge_value: number
  baseline_value: number
  std_deviations: number
  is_significant: boolean
  interpretation: string
}

/**
 * Complete deviation analysis comparing judge to jurisdiction baseline
 */
export interface DeviationAnalysis {
  jurisdiction: string
  comparisons: MetricComparison[]
  overall_deviation_score: number
}

/**
 * Interpretation of overall deviation score
 */
export interface DeviationInterpretation {
  score: number
  category: 'well_within_norms' | 'minor_variance' | 'notable_deviation' | 'significant_deviation'
  description: string
  severity: 'low' | 'medium' | 'high'
}

// ============================================================================
// JURISDICTION BASELINE FUNCTIONS
// ============================================================================

/**
 * Get jurisdiction-level baseline metrics for peer comparison
 */
export async function getJurisdictionBaseline(
  jurisdiction: string
): Promise<JurisdictionBaseline | null> {
  const key = `analytics:baseline:jurisdiction:${jurisdiction}`
  const redis = getRedis()

  // Try Redis cache first
  if (redis) {
    try {
      const cached = await redis.get<JurisdictionBaseline>(key)
      if (cached) {
        return cached
      }
    } catch (error) {
      // Ignore redis errors and fall back to in-memory cache
    }
  }

  // Try in-memory cache
  const cached = memoryCache.get<JurisdictionBaseline>(key)
  if (cached) {
    return cached
  }

  // Query database for jurisdiction-wide metrics
  const supabase = await createServiceRoleClient()
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 3)

  // Get all judges in the jurisdiction
  const { data: judges, error: judgesError } = await supabase
    .from('judges')
    .select('id')
    .eq('jurisdiction', jurisdiction)

  if (judgesError || !judges || judges.length === 0) {
    return null
  }

  const judgeIds = judges.map((j) => j.id)

  // Get all cases for judges in this jurisdiction
  const { data: caseRows, error: casesError } = await supabase
    .from('cases')
    .select(
      'judge_id, case_type, outcome, status, case_value, filing_date, decision_date, motion_type, judgment_amount, claimed_amount'
    )
    .in('judge_id', judgeIds)
    .not('decision_date', 'is', null)
    .gte('decision_date', cutoff.toISOString())
    .limit(50000) // Reasonable limit for jurisdiction-wide data

  if (casesError || !caseRows || caseRows.length === 0) {
    return null
  }

  // Calculate aggregate statistics
  const settlementCases = caseRows.filter(
    (c) => c.outcome === 'settled' || c.outcome === 'dismissed'
  )
  const settlementRate = settlementCases.length / caseRows.length

  const motionCases = caseRows.filter((c) => c.motion_type)
  const grantedMotions = motionCases.filter((c) => c.outcome === 'granted')
  const motionGrantRate = motionCases.length > 0 ? grantedMotions.length / motionCases.length : 0

  const casesWithDuration = caseRows.filter((c) => c.filing_date && c.decision_date)
  const durations = casesWithDuration.map((c) => {
    const filing = new Date(c.filing_date!)
    const decision = new Date(c.decision_date!)
    return (decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24) // days
  })
  const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

  const plaintiffFavorableCases = caseRows.filter(
    (c) => c.outcome === 'plaintiff_verdict' || c.outcome === 'settlement'
  )
  const plaintiffFavorableRate = plaintiffFavorableCases.length / caseRows.length

  // Calculate standard deviations (simplified - using per-judge variance)
  const groupByJudge = new Map<string, typeof caseRows>()
  for (const judgeId of judgeIds) {
    const judgeCases = caseRows.filter((c) => c.judge_id === judgeId)
    if (judgeCases.length >= 10) {
      // Minimum cases per judge for inclusion
      groupByJudge.set(judgeId, judgeCases)
    }
  }

  const judgeMetrics = Array.from(groupByJudge.values()).map((judgeCases) => {
    const settled = judgeCases.filter((c) => c.outcome === 'settled' || c.outcome === 'dismissed')
    const motions = judgeCases.filter((c) => c.motion_type)
    const granted = motions.filter((c) => c.outcome === 'granted')
    const withDuration = judgeCases.filter((c) => c.filing_date && c.decision_date)
    const jDurations = withDuration.map((c) => {
      const filing = new Date(c.filing_date!)
      const decision = new Date(c.decision_date!)
      return (decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24)
    })
    const plaintiffFav = judgeCases.filter(
      (c) => c.outcome === 'plaintiff_verdict' || c.outcome === 'settlement'
    )

    return {
      settlementRate: settled.length / judgeCases.length,
      motionGrantRate: motions.length > 0 ? granted.length / motions.length : 0,
      avgDuration: jDurations.length > 0 ? jDurations.reduce((a, b) => a + b, 0) / jDurations.length : 0,
      plaintiffFavorableRate: plaintiffFav.length / judgeCases.length,
    }
  })

  const calculateStdDev = (values: number[], mean: number): number => {
    if (values.length === 0) return 0
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    return Math.sqrt(variance)
  }

  const settlementRates = judgeMetrics.map((m) => m.settlementRate)
  const motionGrantRates = judgeMetrics.filter((m) => m.motionGrantRate > 0).map((m) => m.motionGrantRate)
  const avgDurations = judgeMetrics.filter((m) => m.avgDuration > 0).map((m) => m.avgDuration)
  const plaintiffRates = judgeMetrics.map((m) => m.plaintiffFavorableRate)

  const baseline: JurisdictionBaseline = {
    jurisdiction,
    metrics: {
      settlement_rate: {
        mean: settlementRate,
        std_dev: calculateStdDev(settlementRates, settlementRate),
        sample_size: caseRows.length,
      },
      motion_grant_rate: {
        mean: motionGrantRate,
        std_dev: calculateStdDev(motionGrantRates, motionGrantRate),
        sample_size: motionCases.length,
      },
      avg_case_duration_days: {
        mean: avgDuration,
        std_dev: calculateStdDev(avgDurations, avgDuration),
        sample_size: casesWithDuration.length,
      },
      plaintiff_favorable_rate: {
        mean: plaintiffFavorableRate,
        std_dev: calculateStdDev(plaintiffRates, plaintiffFavorableRate),
        sample_size: caseRows.length,
      },
    },
    total_cases: caseRows.length,
    judge_count: groupByJudge.size,
    generated_at: new Date().toISOString(),
  }

  // Cache the result
  if (redis) {
    try {
      await redis.set(key, baseline, { ex: 3600 }) // 1 hour cache
    } catch (error) {
      // Ignore cache set failures
    }
  } else {
    memoryCache.set(key, baseline, 3600)
  }

  return baseline
}

/**
 * Compare judge metrics to jurisdiction baseline
 */
export function compareToBaseline(
  judgeMetrics: {
    settlement_rate: number
    motion_grant_rate: number
    avg_case_duration_days: number
    plaintiff_favorable_rate: number
  },
  baseline: JurisdictionBaseline
): DeviationAnalysis {
  const comparisons: MetricComparison[] = []

  // Settlement Rate
  const settlementDeviation =
    baseline.metrics.settlement_rate.std_dev > 0
      ? (judgeMetrics.settlement_rate - baseline.metrics.settlement_rate.mean) /
        baseline.metrics.settlement_rate.std_dev
      : 0

  comparisons.push({
    metric: 'Settlement Rate',
    judge_value: judgeMetrics.settlement_rate,
    baseline_value: baseline.metrics.settlement_rate.mean,
    std_deviations: settlementDeviation,
    is_significant: Math.abs(settlementDeviation) > 2,
    interpretation:
      Math.abs(settlementDeviation) > 2
        ? `${settlementDeviation > 0 ? 'Significantly higher' : 'Significantly lower'} settlement rate than jurisdiction average (${Math.abs(settlementDeviation).toFixed(1)}σ)`
        : 'Settlement rate within normal range',
  })

  // Motion Grant Rate
  const motionDeviation =
    baseline.metrics.motion_grant_rate.std_dev > 0
      ? (judgeMetrics.motion_grant_rate - baseline.metrics.motion_grant_rate.mean) /
        baseline.metrics.motion_grant_rate.std_dev
      : 0

  comparisons.push({
    metric: 'Motion Grant Rate',
    judge_value: judgeMetrics.motion_grant_rate,
    baseline_value: baseline.metrics.motion_grant_rate.mean,
    std_deviations: motionDeviation,
    is_significant: Math.abs(motionDeviation) > 2,
    interpretation:
      Math.abs(motionDeviation) > 2
        ? `${motionDeviation > 0 ? 'Significantly higher' : 'Significantly lower'} motion grant rate than peers (${Math.abs(motionDeviation).toFixed(1)}σ)`
        : 'Motion grant rate within normal range',
  })

  // Case Duration
  const durationDeviation =
    baseline.metrics.avg_case_duration_days.std_dev > 0
      ? (judgeMetrics.avg_case_duration_days - baseline.metrics.avg_case_duration_days.mean) /
        baseline.metrics.avg_case_duration_days.std_dev
      : 0

  comparisons.push({
    metric: 'Case Duration',
    judge_value: judgeMetrics.avg_case_duration_days,
    baseline_value: baseline.metrics.avg_case_duration_days.mean,
    std_deviations: durationDeviation,
    is_significant: Math.abs(durationDeviation) > 2,
    interpretation:
      Math.abs(durationDeviation) > 2
        ? `Cases ${durationDeviation > 0 ? 'significantly slower' : 'significantly faster'} than jurisdiction average (${Math.abs(durationDeviation).toFixed(1)}σ)`
        : 'Case duration within normal range',
  })

  // Plaintiff Favorable Rate
  const plaintiffDeviation =
    baseline.metrics.plaintiff_favorable_rate.std_dev > 0
      ? (judgeMetrics.plaintiff_favorable_rate - baseline.metrics.plaintiff_favorable_rate.mean) /
        baseline.metrics.plaintiff_favorable_rate.std_dev
      : 0

  comparisons.push({
    metric: 'Plaintiff Favorable Rate',
    judge_value: judgeMetrics.plaintiff_favorable_rate,
    baseline_value: baseline.metrics.plaintiff_favorable_rate.mean,
    std_deviations: plaintiffDeviation,
    is_significant: Math.abs(plaintiffDeviation) > 2,
    interpretation:
      Math.abs(plaintiffDeviation) > 2
        ? `${plaintiffDeviation > 0 ? 'Significantly more' : 'Significantly less'} plaintiff-favorable than peers (${Math.abs(plaintiffDeviation).toFixed(1)}σ)`
        : 'Plaintiff favorable rate within normal range',
  })

  // Calculate overall deviation score (0-100)
  const deviations = [
    Math.abs(settlementDeviation),
    Math.abs(motionDeviation),
    Math.abs(durationDeviation),
    Math.abs(plaintiffDeviation),
  ]
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length
  const overallScore = Math.min(100, Math.round(avgDeviation * 25)) // Scale to 0-100

  return {
    jurisdiction: baseline.jurisdiction,
    comparisons,
    overall_deviation_score: overallScore,
  }
}

/**
 * Interpret overall deviation score with human-readable description
 */
export function interpretDeviationScore(score: number): DeviationInterpretation {
  if (score <= 20) {
    return {
      score,
      category: 'well_within_norms',
      description: 'Performance metrics are well within jurisdictional norms',
      severity: 'low',
    }
  } else if (score <= 50) {
    return {
      score,
      category: 'minor_variance',
      description: 'Minor variance from jurisdictional averages, within acceptable range',
      severity: 'low',
    }
  } else if (score <= 75) {
    return {
      score,
      category: 'notable_deviation',
      description: 'Notable deviation from peer patterns, warrants closer review',
      severity: 'medium',
    }
  } else {
    return {
      score,
      category: 'significant_deviation',
      description: 'Significant deviation from jurisdictional norms across multiple metrics',
      severity: 'high',
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type { CourtBaseline }
