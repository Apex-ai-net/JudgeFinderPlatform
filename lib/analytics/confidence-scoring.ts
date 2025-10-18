/**
 * Confidence Scoring Module
 * Implements tier-based confidence system (500-1000+ cases)
 * As specified in .cursor/rules/bias-analytics-algorithms.mdc
 */

export type ConfidenceTier = 1 | 2 | 3 | 'limited'

export interface ConfidenceScore {
  tier: ConfidenceTier
  percentage: number
  label: string
  min_cases: number
  description: string
  reliability: 'very_high' | 'high' | 'moderate' | 'low'
}

export interface DataQualityMetrics {
  total_cases: number
  effective_cases: number // After temporal weighting
  temporal_distribution_score: number // 0-100, based on case recency
  category_diversity_score: number // 0-100, based on case type variety
  data_freshness_score: number // 0-100, recent cases percentage
  overall_quality_score: number // 0-100, composite score
}

/**
 * Calculate confidence tier based on case count
 * Per specification:
 * - Tier 1 (90-95%): 1000+ cases
 * - Tier 2 (80-89%): 750-999 cases
 * - Tier 3 (70-79%): 500-749 cases
 * - Limited (<70%): <500 cases
 */
export function calculateConfidenceTier(
  caseCount: number,
  qualityMetrics?: DataQualityMetrics
): ConfidenceScore {
  // Base tier determination
  let tier: ConfidenceTier
  let basePercentage: number
  let label: string
  let reliability: 'very_high' | 'high' | 'moderate' | 'low'

  if (caseCount >= 1000) {
    tier = 1
    basePercentage = 93 // Mid-range of 90-95%
    label = 'Very High Confidence'
    reliability = 'very_high'
  } else if (caseCount >= 750) {
    tier = 2
    basePercentage = 85 // Mid-range of 80-89%
    label = 'High Confidence'
    reliability = 'high'
  } else if (caseCount >= 500) {
    tier = 3
    basePercentage = 75 // Mid-range of 70-79%
    label = 'Moderate Confidence'
    reliability = 'moderate'
  } else {
    tier = 'limited'
    basePercentage = Math.min(69, 40 + (caseCount / 500) * 29) // Scale 40-69% based on count
    label = 'Limited Confidence'
    reliability = 'low'
  }

  // Adjust based on data quality if provided
  let adjustedPercentage = basePercentage
  if (qualityMetrics) {
    const qualityAdjustment = (qualityMetrics.overall_quality_score - 70) / 10 // -3 to +3 adjustment
    adjustedPercentage = Math.max(60, Math.min(95, basePercentage + qualityAdjustment))
  }

  // Round to whole number
  const finalPercentage = Math.round(adjustedPercentage)

  return {
    tier,
    percentage: finalPercentage,
    label,
    min_cases: tier === 1 ? 1000 : tier === 2 ? 750 : tier === 3 ? 500 : 0,
    description: getConfidenceDescription(tier, caseCount),
    reliability,
  }
}

/**
 * Get human-readable confidence description
 */
function getConfidenceDescription(tier: ConfidenceTier, caseCount: number): string {
  switch (tier) {
    case 1:
      return `Comprehensive analysis based on ${caseCount} cases. Statistical patterns are highly reliable with sufficient data across multiple case types and time periods.`
    case 2:
      return `Substantial analysis based on ${caseCount} cases. Statistical patterns are reliable with good data coverage across case types and time periods.`
    case 3:
      return `Adequate analysis based on ${caseCount} cases (minimum threshold met). Statistical patterns are moderately reliable. Some categories may have limited data.`
    case 'limited':
      return `Limited analysis based on ${caseCount} cases (below recommended minimum of 500). Statistical patterns should be interpreted with caution. Results may not be representative.`
  }
}

/**
 * Calculate data quality metrics
 */
export function calculateDataQuality<
  T extends {
    filing_date?: string | null
    decision_date?: string | null
    case_type?: string | null
  },
>(cases: T[], effectiveCases?: number): DataQualityMetrics {
  const totalCases = cases.length
  const effective = effectiveCases ?? totalCases

  // Temporal distribution score (prefer recent cases)
  const now = new Date()
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate())

  let recentCases = 0
  let mediumAgeCases = 0
  let olderCases = 0

  for (const caseRecord of cases) {
    const dateStr = caseRecord.decision_date || caseRecord.filing_date
    if (!dateStr) continue

    try {
      const date = new Date(dateStr)
      if (Number.isNaN(date.getTime())) continue

      if (date >= oneYearAgo) {
        recentCases++
      } else if (date >= twoYearsAgo) {
        mediumAgeCases++
      } else if (date >= threeYearsAgo) {
        olderCases++
      }
    } catch {
      // Skip invalid dates
    }
  }

  // Score: recent cases weighted more heavily
  const temporalScore =
    totalCases > 0 ? (recentCases * 100 + mediumAgeCases * 70 + olderCases * 40) / totalCases : 50

  // Category diversity score (more case types = better)
  const caseTypes = new Set<string>()
  for (const caseRecord of cases) {
    if (caseRecord.case_type) {
      caseTypes.add(caseRecord.case_type)
    }
  }

  // Ideal: 10+ different case types
  const diversityScore = Math.min(100, (caseTypes.size / 10) * 100)

  // Data freshness: percentage of cases within 2 years
  const freshnessScore = totalCases > 0 ? ((recentCases + mediumAgeCases) / totalCases) * 100 : 0

  // Overall quality score (weighted average)
  const overallScore =
    temporalScore * 0.4 + // 40% weight on temporal distribution
    diversityScore * 0.3 + // 30% weight on category diversity
    freshnessScore * 0.3 // 30% weight on freshness

  return {
    total_cases: totalCases,
    effective_cases: effective,
    temporal_distribution_score: Math.round(temporalScore),
    category_diversity_score: Math.round(diversityScore),
    data_freshness_score: Math.round(freshnessScore),
    overall_quality_score: Math.round(overallScore),
  }
}

/**
 * Calculate confidence for a specific metric
 * Adjusts confidence based on sample size for that metric
 */
export function calculateMetricConfidence(
  sampleSize: number,
  baseConfidence: ConfidenceScore
): number {
  // Start with base confidence
  let confidence = baseConfidence.percentage

  // Adjust based on metric sample size
  if (sampleSize < 5) {
    confidence = Math.min(confidence, 65)
  } else if (sampleSize < 10) {
    confidence = Math.min(confidence, 70)
  } else if (sampleSize < 20) {
    confidence = Math.min(confidence, 75)
  } else if (sampleSize < 50) {
    confidence = Math.min(confidence, 80)
  }

  return confidence
}

/**
 * Get confidence tier requirements for display
 */
export function getConfidenceTierRequirements(): Array<{
  tier: ConfidenceTier
  range: string
  minCases: number
  description: string
}> {
  return [
    {
      tier: 1,
      range: '90-95%',
      minCases: 1000,
      description: 'Comprehensive dataset with very high statistical reliability',
    },
    {
      tier: 2,
      range: '80-89%',
      minCases: 750,
      description: 'Substantial dataset with high statistical reliability',
    },
    {
      tier: 3,
      range: '70-79%',
      minCases: 500,
      description: 'Adequate dataset meeting minimum threshold for full analytics',
    },
    {
      tier: 'limited',
      range: '<70%',
      minCases: 0,
      description: 'Limited dataset - results should be interpreted with caution',
    },
  ]
}

/**
 * Determine if full analytics should be provided
 * Per specification: require 500+ cases for full analytics
 */
export function shouldProvideFullAnalytics(caseCount: number): boolean {
  return caseCount >= 500
}

/**
 * Get recommendation for improving confidence
 */
export function getConfidenceRecommendation(
  currentScore: ConfidenceScore,
  qualityMetrics: DataQualityMetrics
): string[] {
  const recommendations: string[] = []

  if (currentScore.tier === 'limited') {
    recommendations.push(
      `Increase case dataset to at least 500 cases (currently ${qualityMetrics.total_cases}) for full analytics with moderate confidence`
    )
  }

  if (qualityMetrics.data_freshness_score < 50) {
    recommendations.push(
      'Add more recent cases (within last 2 years) to improve temporal relevance'
    )
  }

  if (qualityMetrics.category_diversity_score < 50) {
    recommendations.push('Include more diverse case types to improve pattern detection reliability')
  }

  if (currentScore.tier === 3 || currentScore.tier === 2) {
    recommendations.push(
      `Add ${currentScore.tier === 3 ? 250 : 250} more cases to reach ${currentScore.tier === 3 ? 'Tier 2 (High)' : 'Tier 1 (Very High)'} confidence`
    )
  }

  return recommendations
}
