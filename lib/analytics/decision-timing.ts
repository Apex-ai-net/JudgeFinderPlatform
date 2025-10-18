/**
 * Decision Timing Analysis Module
 * Analyzes time-to-decision patterns by case complexity
 * Provides percentile analysis for outlier detection
 */

export type ComplexityTier = 'simple' | 'moderate' | 'complex' | 'highly_complex'

export interface ComplexityTiming {
  complexity_tier: ComplexityTier
  case_count: number
  avg_days: number
  median_days: number
  percentile_25: number
  percentile_75: number
  percentile_90: number
  min_days: number
  max_days: number
  confidence: number
}

export interface TimingAnalysis {
  by_complexity: ComplexityTiming[]
  overall_avg_days: number
  overall_median_days: number
  fastest_category: string
  slowest_category: string
  total_cases_analyzed: number
  confidence_score: number
}

interface CaseWithTiming {
  case_type?: string | null
  case_value?: number | null
  filing_date?: string | null
  decision_date?: string | null
  summary?: string | null
}

/**
 * Determine case complexity tier based on value and type
 */
function determineComplexity(caseRecord: CaseWithTiming): ComplexityTier {
  const caseValue = caseRecord.case_value || 0
  const summary = (caseRecord.summary || '').toLowerCase()
  const caseType = (caseRecord.case_type || '').toLowerCase()

  // Complexity indicators
  const hasMultipleParties =
    summary.includes('multiple defendants') ||
    summary.includes('class action') ||
    summary.includes('consolidated')
  const hasExpertWitness =
    summary.includes('expert') ||
    summary.includes('testimony') ||
    summary.includes('expert witness')
  const isComplexType =
    caseType.includes('securities') ||
    caseType.includes('antitrust') ||
    caseType.includes('patent') ||
    caseType.includes('class action') ||
    caseType.includes('rico')

  // Highly Complex: High value + complexity indicators OR complex type
  if ((caseValue > 1000000 && (hasMultipleParties || hasExpertWitness)) || isComplexType) {
    return 'highly_complex'
  }

  // Complex: $250K+ value
  if (caseValue >= 250000) {
    return 'complex'
  }

  // Moderate: $50K-$250K value
  if (caseValue >= 50000) {
    return 'moderate'
  }

  // Simple: <$50K value or no value specified
  return 'simple'
}

/**
 * Calculate days between filing and decision
 */
function calculateDays(caseRecord: CaseWithTiming): number | null {
  if (!caseRecord.filing_date || !caseRecord.decision_date) return null

  try {
    const filing = new Date(caseRecord.filing_date)
    const decision = new Date(caseRecord.decision_date)

    if (Number.isNaN(filing.getTime()) || Number.isNaN(decision.getTime())) {
      return null
    }

    const days = Math.abs(decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24)

    // Filter out unrealistic values (negative or > 10 years)
    if (days < 0 || days > 3650) return null

    return days
  } catch {
    return null
  }
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
  return sortedValues[Math.max(0, index)]
}

/**
 * Calculate median from sorted array
 */
function calculateMedian(sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0

  const mid = Math.floor(sortedValues.length / 2)

  if (sortedValues.length % 2 === 0) {
    return (sortedValues[mid - 1] + sortedValues[mid]) / 2
  }

  return sortedValues[mid]
}

/**
 * Calculate confidence score based on sample size
 */
function calculateConfidence(sampleSize: number): number {
  if (sampleSize >= 100) return 95
  if (sampleSize >= 50) return 90
  if (sampleSize >= 30) return 85
  if (sampleSize >= 20) return 80
  if (sampleSize >= 10) return 75
  if (sampleSize >= 5) return 70
  return 65
}

/**
 * Analyze time-to-decision patterns by case complexity
 */
export function analyzeDecisionTiming(cases: CaseWithTiming[]): TimingAnalysis {
  // Group cases by complexity tier
  const complexityGroups: Record<ComplexityTier, number[]> = {
    simple: [],
    moderate: [],
    complex: [],
    highly_complex: [],
  }

  for (const caseRecord of cases) {
    const days = calculateDays(caseRecord)
    if (days === null) continue

    const complexity = determineComplexity(caseRecord)
    complexityGroups[complexity].push(days)
  }

  // Analyze each complexity tier
  const byComplexity: ComplexityTiming[] = []
  let totalDays = 0
  let totalCases = 0
  const allDays: number[] = []

  for (const [tier, days] of Object.entries(complexityGroups) as [ComplexityTier, number[]][]) {
    if (days.length === 0) {
      // Include tier with no data for completeness
      byComplexity.push({
        complexity_tier: tier,
        case_count: 0,
        avg_days: 0,
        median_days: 0,
        percentile_25: 0,
        percentile_75: 0,
        percentile_90: 0,
        min_days: 0,
        max_days: 0,
        confidence: 60,
      })
      continue
    }

    const sortedDays = [...days].sort((a, b) => a - b)
    const avg = days.reduce((sum, d) => sum + d, 0) / days.length
    const median = calculateMedian(sortedDays)

    totalDays += avg * days.length
    totalCases += days.length
    allDays.push(...days)

    byComplexity.push({
      complexity_tier: tier,
      case_count: days.length,
      avg_days: Math.round(avg),
      median_days: Math.round(median),
      percentile_25: Math.round(calculatePercentile(sortedDays, 25)),
      percentile_75: Math.round(calculatePercentile(sortedDays, 75)),
      percentile_90: Math.round(calculatePercentile(sortedDays, 90)),
      min_days: Math.round(sortedDays[0]),
      max_days: Math.round(sortedDays[sortedDays.length - 1]),
      confidence: calculateConfidence(days.length),
    })
  }

  // Sort by complexity (simple to highly complex)
  const tierOrder: ComplexityTier[] = ['simple', 'moderate', 'complex', 'highly_complex']
  byComplexity.sort(
    (a, b) => tierOrder.indexOf(a.complexity_tier) - tierOrder.indexOf(b.complexity_tier)
  )

  // Calculate overall metrics
  const overallAvg = totalCases > 0 ? totalDays / totalCases : 0
  const sortedAllDays = [...allDays].sort((a, b) => a - b)
  const overallMedian = calculateMedian(sortedAllDays)

  // Find fastest and slowest categories (with data)
  const withData = byComplexity.filter((c) => c.case_count > 0)
  const fastest =
    withData.length > 0
      ? withData.reduce((prev, curr) => (curr.avg_days < prev.avg_days ? curr : prev))
          .complexity_tier
      : 'none'
  const slowest =
    withData.length > 0
      ? withData.reduce((prev, curr) => (curr.avg_days > prev.avg_days ? curr : prev))
          .complexity_tier
      : 'none'

  return {
    by_complexity: byComplexity,
    overall_avg_days: Math.round(overallAvg),
    overall_median_days: Math.round(overallMedian),
    fastest_category: fastest,
    slowest_category: slowest,
    total_cases_analyzed: totalCases,
    confidence_score: calculateConfidence(totalCases),
  }
}

/**
 * Get timing expectations for a complexity tier (for benchmarking)
 */
export function getExpectedTiming(tier: ComplexityTier): {
  min: number
  max: number
  typical: number
} {
  const expectations = {
    simple: { min: 30, max: 180, typical: 90 },
    moderate: { min: 90, max: 365, typical: 180 },
    complex: { min: 180, max: 730, typical: 365 },
    highly_complex: { min: 365, max: 1460, typical: 730 },
  }

  return expectations[tier]
}

/**
 * Identify cases that are outliers (unusually fast or slow)
 */
export function identifyTimingOutliers(
  analysis: TimingAnalysis,
  cases: CaseWithTiming[]
): Array<{ case: CaseWithTiming; days: number; expected: number; deviation: string }> {
  const outliers: Array<{
    case: CaseWithTiming
    days: number
    expected: number
    deviation: string
  }> = []

  for (const caseRecord of cases) {
    const days = calculateDays(caseRecord)
    if (days === null) continue

    const complexity = determineComplexity(caseRecord)
    const complexityData = analysis.by_complexity.find((c) => c.complexity_tier === complexity)

    if (!complexityData || complexityData.case_count === 0) continue

    // Flag if more than 2x faster or slower than average
    const deviation = Math.abs(days - complexityData.avg_days) / complexityData.avg_days

    if (deviation > 2.0) {
      outliers.push({
        case: caseRecord,
        days: Math.round(days),
        expected: complexityData.avg_days,
        deviation: days > complexityData.avg_days ? 'much_slower' : 'much_faster',
      })
    }
  }

  return outliers
}
