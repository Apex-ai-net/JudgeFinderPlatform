/**
 * Value Analysis Module
 * Analyzes settlement and judgment patterns across different case value ranges
 * Provides granular insights into value-based decision patterns
 */

export interface ValueBracket {
  range_label: string
  min_value: number
  max_value: number
  case_count: number
  settlement_rate: number
  dismissal_rate: number
  judgment_rate: number
  avg_judgment_amount: number
  avg_claimed_amount: number
  judgment_to_claim_ratio: number
  avg_case_duration_days: number
  confidence: number
}

export interface ValueAnalysis {
  value_brackets: ValueBracket[]
  overall_settlement_rate: number
  high_value_settlement_rate: number // For cases > $250K
  low_value_settlement_rate: number // For cases < $50K
  settlement_value_correlation: number // -1 to 1, indicates if higher values settle more/less
  total_cases_analyzed: number
  confidence_score: number
}

interface CaseWithValue {
  case_value?: number | null
  outcome?: string | null
  status?: string | null
  filing_date?: string | null
  decision_date?: string | null
  summary?: string | null
  // Judgment details
  judgment_amount?: number | null
  claimed_amount?: number | null
}

/**
 * Define value brackets for analysis
 */
const VALUE_BRACKETS = [
  { label: 'Under $10K', min: 0, max: 10000 },
  { label: '$10K - $25K', min: 10000, max: 25000 },
  { label: '$25K - $50K', min: 25000, max: 50000 },
  { label: '$50K - $100K', min: 50000, max: 100000 },
  { label: '$100K - $250K', min: 100000, max: 250000 },
  { label: '$250K - $500K', min: 250000, max: 500000 },
  { label: '$500K - $1M', min: 500000, max: 1000000 },
  { label: '$1M - $5M', min: 1000000, max: 5000000 },
  { label: '$5M+', min: 5000000, max: Number.POSITIVE_INFINITY },
] as const

/**
 * Classify outcome type
 */
function classifyOutcome(
  outcome: string,
  status: string
): 'settled' | 'dismissed' | 'judgment' | 'other' {
  const text = `${outcome} ${status}`.toLowerCase()

  if (text.includes('settle') || text.includes('compromise') || text.includes('agreed')) {
    return 'settled'
  }

  if (text.includes('dismiss') || text.includes('withdrawn')) {
    return 'dismissed'
  }

  if (
    text.includes('judgment') ||
    text.includes('verdict') ||
    text.includes('awarded') ||
    text.includes('granted')
  ) {
    return 'judgment'
  }

  return 'other'
}

/**
 * Calculate case duration
 */
function calculateDuration(
  filingDate?: string | null,
  decisionDate?: string | null
): number | null {
  if (!filingDate || !decisionDate) return null

  try {
    const filing = new Date(filingDate)
    const decision = new Date(decisionDate)

    if (Number.isNaN(filing.getTime()) || Number.isNaN(decision.getTime())) {
      return null
    }

    return Math.abs(decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24)
  } catch {
    return null
  }
}

/**
 * Extract judgment and claim amounts from case data
 */
function extractAmounts(caseRecord: CaseWithValue): {
  judgment: number | null
  claimed: number | null
} {
  // Use explicit fields if available
  const judgment = caseRecord.judgment_amount || null
  const claimed = caseRecord.claimed_amount || caseRecord.case_value || null

  // Could add text parsing logic here if needed

  return { judgment, claimed }
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
 * Analyze value-based patterns in case outcomes
 */
export function analyzeValuePatterns(cases: CaseWithValue[]): ValueAnalysis {
  // Group cases by value bracket
  const bracketStats = VALUE_BRACKETS.map((bracket) => ({
    ...bracket,
    cases: [] as CaseWithValue[],
    settled: 0,
    dismissed: 0,
    judgment: 0,
    other: 0,
    judgmentAmounts: [] as number[],
    claimedAmounts: [] as number[],
    durations: [] as number[],
  }))

  // Categorize each case
  for (const caseRecord of cases) {
    const value = caseRecord.case_value
    if (!value || Number.isNaN(value) || value <= 0) continue

    // Find matching bracket
    const bracket = bracketStats.find((b) => value >= b.min && value < b.max)
    if (!bracket) continue

    bracket.cases.push(caseRecord)

    // Classify outcome
    const outcome = caseRecord.outcome || ''
    const status = caseRecord.status || ''
    const outcomeType = classifyOutcome(outcome, status)

    bracket[outcomeType]++

    // Extract amounts
    const amounts = extractAmounts(caseRecord)
    if (amounts.judgment !== null) {
      bracket.judgmentAmounts.push(amounts.judgment)
    }
    if (amounts.claimed !== null) {
      bracket.claimedAmounts.push(amounts.claimed)
    }

    // Track duration
    const duration = calculateDuration(caseRecord.filing_date, caseRecord.decision_date)
    if (duration !== null) {
      bracket.durations.push(duration)
    }
  }

  // Build value brackets array
  const valueBrackets: ValueBracket[] = []
  let totalCases = 0
  let totalSettled = 0
  let highValueCases = 0
  let highValueSettled = 0
  let lowValueCases = 0
  let lowValueSettled = 0

  for (const bracket of bracketStats) {
    const caseCount = bracket.cases.length
    if (caseCount === 0) continue

    totalCases += caseCount

    const totalWithOutcome = bracket.settled + bracket.dismissed + bracket.judgment
    const settlementRate = totalWithOutcome > 0 ? bracket.settled / totalWithOutcome : 0
    const dismissalRate = totalWithOutcome > 0 ? bracket.dismissed / totalWithOutcome : 0
    const judgmentRate = totalWithOutcome > 0 ? bracket.judgment / totalWithOutcome : 0

    const avgJudgment =
      bracket.judgmentAmounts.length > 0
        ? bracket.judgmentAmounts.reduce((sum, amt) => sum + amt, 0) /
          bracket.judgmentAmounts.length
        : 0

    const avgClaimed =
      bracket.claimedAmounts.length > 0
        ? bracket.claimedAmounts.reduce((sum, amt) => sum + amt, 0) / bracket.claimedAmounts.length
        : 0

    const ratio = avgClaimed > 0 ? avgJudgment / avgClaimed : 0

    const avgDuration =
      bracket.durations.length > 0
        ? bracket.durations.reduce((sum, d) => sum + d, 0) / bracket.durations.length
        : 0

    totalSettled += bracket.settled

    // Track high/low value patterns
    if (bracket.min >= 250000) {
      highValueCases += caseCount
      highValueSettled += bracket.settled
    } else if (bracket.max <= 50000) {
      lowValueCases += caseCount
      lowValueSettled += bracket.settled
    }

    valueBrackets.push({
      range_label: bracket.label,
      min_value: bracket.min,
      max_value: bracket.max,
      case_count: caseCount,
      settlement_rate: settlementRate,
      dismissal_rate: dismissalRate,
      judgment_rate: judgmentRate,
      avg_judgment_amount: Math.round(avgJudgment),
      avg_claimed_amount: Math.round(avgClaimed),
      judgment_to_claim_ratio: Math.round(ratio * 100) / 100,
      avg_case_duration_days: Math.round(avgDuration),
      confidence: calculateConfidence(totalWithOutcome),
    })
  }

  // Calculate aggregate metrics
  const overallSettlementRate = totalCases > 0 ? totalSettled / totalCases : 0
  const highValueSettlementRate = highValueCases > 0 ? highValueSettled / highValueCases : 0
  const lowValueSettlementRate = lowValueCases > 0 ? lowValueSettled / lowValueCases : 0

  // Calculate correlation between value and settlement rate
  // Simplified: compare high vs low value settlement rates
  const settlementValueCorrelation =
    highValueCases > 0 && lowValueCases > 0
      ? (highValueSettlementRate - lowValueSettlementRate) * 2 // Scale to approx -1 to 1
      : 0

  return {
    value_brackets: valueBrackets,
    overall_settlement_rate: overallSettlementRate,
    high_value_settlement_rate: highValueSettlementRate,
    low_value_settlement_rate: lowValueSettlementRate,
    settlement_value_correlation: Math.max(-1, Math.min(1, settlementValueCorrelation)),
    total_cases_analyzed: totalCases,
    confidence_score: calculateConfidence(totalCases),
  }
}

/**
 * Identify unusual value-based patterns
 */
export function identifyValueAnomalies(
  analysis: ValueAnalysis
): Array<{ pattern: string; severity: 'low' | 'medium' | 'high'; description: string }> {
  const anomalies: Array<{
    pattern: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }> = []

  // Check if high value cases settle significantly more/less than low value
  const diff = Math.abs(analysis.high_value_settlement_rate - analysis.low_value_settlement_rate)

  if (diff > 0.3 && analysis.high_value_settlement_rate > analysis.low_value_settlement_rate) {
    anomalies.push({
      pattern: 'High Value Settlement Preference',
      severity: 'medium',
      description: `High-value cases settle ${Math.round(analysis.high_value_settlement_rate * 100)}% vs ${Math.round(analysis.low_value_settlement_rate * 100)}% for low-value cases`,
    })
  } else if (
    diff > 0.3 &&
    analysis.low_value_settlement_rate > analysis.high_value_settlement_rate
  ) {
    anomalies.push({
      pattern: 'Low Value Settlement Preference',
      severity: 'medium',
      description: `Low-value cases settle ${Math.round(analysis.low_value_settlement_rate * 100)}% vs ${Math.round(analysis.high_value_settlement_rate * 100)}% for high-value cases`,
    })
  }

  // Check judgment-to-claim ratios for extreme values
  for (const bracket of analysis.value_brackets) {
    if (bracket.judgment_to_claim_ratio > 0 && bracket.case_count >= 10) {
      if (bracket.judgment_to_claim_ratio > 0.9) {
        anomalies.push({
          pattern: 'High Judgment Awards',
          severity: 'low',
          description: `${bracket.range_label} cases: ${Math.round(bracket.judgment_to_claim_ratio * 100)}% of claimed amount awarded on average`,
        })
      } else if (bracket.judgment_to_claim_ratio < 0.3) {
        anomalies.push({
          pattern: 'Low Judgment Awards',
          severity: 'low',
          description: `${bracket.range_label} cases: Only ${Math.round(bracket.judgment_to_claim_ratio * 100)}% of claimed amount awarded on average`,
        })
      }
    }
  }

  return anomalies
}

/**
 * Get expected settlement rate for a value bracket (for benchmarking)
 */
export function getExpectedSettlementRate(minValue: number, maxValue: number): number {
  // General expectations based on value ranges
  if (maxValue <= 10000) return 0.35 // Small claims often dismissed
  if (maxValue <= 50000) return 0.45 // Lower value cases
  if (maxValue <= 250000) return 0.55 // Mid-range cases
  if (maxValue <= 1000000) return 0.65 // Higher value cases tend to settle
  return 0.7 // Very high value cases often settle to avoid trial costs
}
