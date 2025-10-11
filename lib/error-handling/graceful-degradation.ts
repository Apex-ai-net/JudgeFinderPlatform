/**
 * Graceful Degradation Patterns
 * Provides fallback mechanisms when services fail
 */

import { logger } from '@/lib/utils/logger'
import type { CaseAnalytics, AnalysisWindow } from '@/lib/analytics/types'
import type { Judge } from '@/types'

export interface DegradationLevel {
  level: 'optimal' | 'degraded' | 'minimal' | 'fallback'
  features: {
    materialized_views: boolean
    redis_cache: boolean
    ai_enhancement: boolean
    case_enrichment: boolean
  }
  reason?: string
}

export interface ServiceHealthCheck {
  service: string
  healthy: boolean
  latency?: number
  error?: string
}

/**
 * Health check results for analytics dependencies
 */
export class AnalyticsHealthMonitor {
  private healthStatus = new Map<string, ServiceHealthCheck>()

  recordHealth(service: string, healthy: boolean, latency?: number, error?: string): void {
    this.healthStatus.set(service, {
      service,
      healthy,
      latency,
      error,
    })
  }

  getHealth(service: string): ServiceHealthCheck | null {
    return this.healthStatus.get(service) || null
  }

  getAllHealth(): ServiceHealthCheck[] {
    return Array.from(this.healthStatus.values())
  }

  getDegradationLevel(): DegradationLevel {
    const redis = this.getHealth('redis')
    const supabase = this.getHealth('supabase')
    const materializedViews = this.getHealth('materialized_views')

    // Optimal: All services healthy
    if (redis?.healthy && supabase?.healthy && materializedViews?.healthy) {
      return {
        level: 'optimal',
        features: {
          materialized_views: true,
          redis_cache: true,
          ai_enhancement: true,
          case_enrichment: true,
        },
      }
    }

    // Degraded: Core services work, caching degraded
    if (supabase?.healthy && materializedViews?.healthy) {
      return {
        level: 'degraded',
        features: {
          materialized_views: true,
          redis_cache: false,
          ai_enhancement: true,
          case_enrichment: true,
        },
        reason: 'Redis cache unavailable',
      }
    }

    // Minimal: Direct database queries only
    if (supabase?.healthy) {
      return {
        level: 'minimal',
        features: {
          materialized_views: false,
          redis_cache: false,
          ai_enhancement: false,
          case_enrichment: true,
        },
        reason: 'Materialized views unavailable, using direct queries',
      }
    }

    // Fallback: Use cached data or statistical estimates
    return {
      level: 'fallback',
      features: {
        materialized_views: false,
        redis_cache: false,
        ai_enhancement: false,
        case_enrichment: false,
      },
      reason: 'All services degraded, using fallback mode',
    }
  }

  reset(): void {
    this.healthStatus.clear()
  }
}

/**
 * Fallback analytics generator for when all services fail
 */
export function generateFallbackAnalytics(
  judge: Partial<Judge>,
  window: AnalysisWindow,
  reason: string
): CaseAnalytics {
  logger.warn('Generating fallback analytics', {
    judgeName: judge.name,
    reason,
  })

  // Use jurisdiction-based estimates
  const isCaliforniaJudge =
    judge.jurisdiction?.toLowerCase().includes('ca') ||
    judge.jurisdiction?.toLowerCase().includes('california')

  const isFederalJudge =
    judge.jurisdiction?.toLowerCase().includes('federal') ||
    judge.court_name?.toLowerCase().includes('federal') ||
    judge.court_name?.toLowerCase().includes('u.s.') ||
    judge.court_name?.toLowerCase().includes('united states')

  // Adjust baselines by jurisdiction type
  const baseAdjustment = isCaliforniaJudge ? 5 : 0
  const federalAdjustment = isFederalJudge ? -3 : 0

  return {
    civil_plaintiff_favor: 48 + baseAdjustment + federalAdjustment,
    civil_defendant_favor: 52 - baseAdjustment - federalAdjustment,
    family_custody_mother: 52 + baseAdjustment,
    family_custody_father: 48 - baseAdjustment,
    family_alimony_favorable: 42 + baseAdjustment,
    contract_enforcement_rate: 68 - baseAdjustment,
    contract_dismissal_rate: 32 + baseAdjustment,
    criminal_sentencing_severity: 50 + federalAdjustment,
    criminal_plea_acceptance: 75,
    bail_release_rate: 65 + baseAdjustment,
    appeal_reversal_rate: 15,
    settlement_encouragement_rate: 60,
    motion_grant_rate: 45,

    confidence_civil: 60,
    confidence_custody: 60,
    confidence_alimony: 60,
    confidence_contracts: 60,
    confidence_sentencing: 60,
    confidence_plea: 60,
    confidence_bail: 55,
    confidence_reversal: 55,
    confidence_settlement: 55,
    confidence_motion: 55,
    overall_confidence: 60,

    sample_size_civil: 0,
    sample_size_custody: 0,
    sample_size_alimony: 0,
    sample_size_contracts: 0,
    sample_size_sentencing: 0,
    sample_size_plea: 0,
    sample_size_bail: 0,
    sample_size_reversal: 0,
    sample_size_settlement: 0,
    sample_size_motion: 0,

    total_cases_analyzed: judge.total_cases || 0,
    analysis_quality: 'fallback_mode',
    notable_patterns: [
      'Analysis generated in fallback mode due to service degradation',
      `Based on ${judge.jurisdiction || 'jurisdiction'} patterns and court type`,
      `Timeframe: ${window.startYear}-${window.endYear}`,
    ],
    data_limitations: [
      'Service degradation prevented full analysis',
      'Estimates based on jurisdictional and court type patterns',
      `Reason: ${reason}`,
    ],
    ai_model: 'fallback_jurisdictional_estimation',
    generated_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  }
}

/**
 * Timeout wrapper with graceful degradation
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  fallback: () => T | Promise<T>,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timeout after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([operation(), timeoutPromise])
  } catch (error) {
    logger.warn('Operation timed out, using fallback', {
      operationName,
      timeout: timeoutMs,
      error: (error as Error).message,
    })

    return await fallback()
  }
}

/**
 * Try multiple fallback strategies in sequence
 */
export async function withFallbackChain<T>(
  strategies: Array<{
    name: string
    operation: () => Promise<T>
    condition?: () => boolean
  }>,
  finalFallback: () => T
): Promise<{ result: T; strategy: string }> {
  for (const strategy of strategies) {
    // Skip if condition is provided and returns false
    if (strategy.condition && !strategy.condition()) {
      logger.debug('Skipping strategy due to condition', {
        strategy: strategy.name,
      })
      continue
    }

    try {
      logger.debug('Attempting strategy', { strategy: strategy.name })
      const result = await strategy.operation()

      logger.info('Strategy succeeded', { strategy: strategy.name })
      return { result, strategy: strategy.name }
    } catch (error) {
      logger.warn('Strategy failed, trying next', {
        strategy: strategy.name,
        error: (error as Error).message,
      })
    }
  }

  logger.warn('All strategies failed, using final fallback')
  return { result: finalFallback(), strategy: 'final_fallback' }
}

/**
 * Partial result aggregation - combine successful and failed operations
 */
export async function aggregatePartialResults<T, R>(
  operations: Array<{
    name: string
    operation: () => Promise<T>
    required: boolean
  }>,
  combiner: (results: Map<string, T | null>) => R
): Promise<{ result: R; failures: string[] }> {
  const results = new Map<string, T | null>()
  const failures: string[] = []

  await Promise.all(
    operations.map(async ({ name, operation, required }) => {
      try {
        const result = await operation()
        results.set(name, result)
      } catch (error) {
        logger.warn('Partial operation failed', {
          operation: name,
          required,
          error: (error as Error).message,
        })

        results.set(name, null)
        failures.push(name)

        if (required) {
          throw new Error(`Required operation "${name}" failed: ${(error as Error).message}`)
        }
      }
    })
  )

  const result = combiner(results)
  return { result, failures }
}
