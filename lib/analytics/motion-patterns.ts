/**
 * Motion Pattern Analysis Module
 * Analyzes motion grant/deny rates by motion type
 * Tracks decision timing for different motion categories
 */

export interface MotionTypePattern {
  motion_type: string
  total_motions: number
  granted: number
  denied: number
  grant_rate: number
  deny_rate: number
  avg_days_to_decision: number
  median_days_to_decision: number
  sample_size: number
  confidence: number
}

export interface MotionAnalysis {
  patterns_by_type: MotionTypePattern[]
  overall_grant_rate: number
  overall_deny_rate: number
  avg_decision_time: number
  total_motions_analyzed: number
  confidence_score: number
}

interface CaseWithMotion {
  case_type?: string | null
  outcome?: string | null
  summary?: string | null
  filing_date?: string | null
  decision_date?: string | null
  motion_type?: string | null
}

/**
 * Extract motion type from case data
 */
function extractMotionType(caseRecord: CaseWithMotion): string | null {
  const summary = (caseRecord.summary || '').toLowerCase()
  const outcome = (caseRecord.outcome || '').toLowerCase()
  const explicitMotionType = caseRecord.motion_type?.toLowerCase()

  // Check explicit motion_type field first
  if (explicitMotionType) {
    if (explicitMotionType.includes('summary judgment')) return 'Summary Judgment'
    if (explicitMotionType.includes('dismiss')) return 'Motion to Dismiss'
    if (explicitMotionType.includes('compel')) return 'Motion to Compel Discovery'
    if (explicitMotionType.includes('suppress')) return 'Motion to Suppress Evidence'
    if (explicitMotionType.includes('continuance')) return 'Motion for Continuance'
    if (explicitMotionType.includes('protective')) return 'Protective Order'
    if (explicitMotionType.includes('strike')) return 'Motion to Strike'
    if (explicitMotionType.includes('amend')) return 'Motion to Amend'
    if (explicitMotionType.includes('reconsider')) return 'Motion for Reconsideration'
    if (explicitMotionType.includes('sanctions')) return 'Motion for Sanctions'
  }

  // Parse from summary/outcome text
  const text = `${summary} ${outcome}`

  if (text.includes('summary judgment') || text.includes('msj')) return 'Summary Judgment'
  if (text.includes('motion to dismiss') || text.includes('mtd')) return 'Motion to Dismiss'
  if (text.includes('compel discovery') || text.includes('motion to compel'))
    return 'Motion to Compel Discovery'
  if (text.includes('suppress evidence') || text.includes('motion to suppress'))
    return 'Motion to Suppress Evidence'
  if (text.includes('continuance')) return 'Motion for Continuance'
  if (text.includes('protective order')) return 'Protective Order'
  if (text.includes('motion to strike')) return 'Motion to Strike'
  if (text.includes('motion to amend')) return 'Motion to Amend'
  if (text.includes('reconsider')) return 'Motion for Reconsideration'
  if (text.includes('sanctions')) return 'Motion for Sanctions'
  if (text.includes('default judgment')) return 'Motion for Default Judgment'
  if (text.includes('preliminary injunction')) return 'Motion for Preliminary Injunction'

  // Generic motion
  if (text.includes('motion')) return 'Other Motion'

  return null
}

/**
 * Determine if motion was granted
 */
function isMotionGranted(caseRecord: CaseWithMotion): boolean | null {
  const outcome = (caseRecord.outcome || '').toLowerCase()
  const summary = (caseRecord.summary || '').toLowerCase()
  const text = `${outcome} ${summary}`

  if (
    text.includes('granted') ||
    text.includes('motion granted') ||
    text.includes('approved') ||
    text.includes('motion approved')
  ) {
    return true
  }

  if (
    text.includes('denied') ||
    text.includes('motion denied') ||
    text.includes('rejected') ||
    text.includes('dismissed')
  ) {
    return false
  }

  return null // Unknown
}

/**
 * Calculate days between filing and decision
 */
function calculateDecisionDays(caseRecord: CaseWithMotion): number | null {
  if (!caseRecord.filing_date || !caseRecord.decision_date) return null

  try {
    const filing = new Date(caseRecord.filing_date)
    const decision = new Date(caseRecord.decision_date)

    if (Number.isNaN(filing.getTime()) || Number.isNaN(decision.getTime())) {
      return null
    }

    const days = Math.abs(decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24)
    return days
  } catch {
    return null
  }
}

/**
 * Calculate median from array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }

  return sorted[mid]
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
 * Analyze motion patterns from case data
 */
export function analyzeMotionPatterns(cases: CaseWithMotion[]): MotionAnalysis {
  // Group cases by motion type
  const motionGroups: Record<string, CaseWithMotion[]> = {}

  for (const caseRecord of cases) {
    const motionType = extractMotionType(caseRecord)
    if (!motionType) continue

    if (!motionGroups[motionType]) {
      motionGroups[motionType] = []
    }
    motionGroups[motionType].push(caseRecord)
  }

  // Analyze each motion type
  const patterns: MotionTypePattern[] = []
  let totalGranted = 0
  let totalDenied = 0
  let totalWithOutcome = 0
  let totalDecisionDays = 0
  let totalWithTiming = 0

  for (const [motionType, motionCases] of Object.entries(motionGroups)) {
    let granted = 0
    let denied = 0
    const decisionDays: number[] = []

    for (const caseRecord of motionCases) {
      const isGranted = isMotionGranted(caseRecord)
      if (isGranted === true) {
        granted++
        totalGranted++
      } else if (isGranted === false) {
        denied++
        totalDenied++
      }

      if (isGranted !== null) {
        totalWithOutcome++
      }

      const days = calculateDecisionDays(caseRecord)
      if (days !== null) {
        decisionDays.push(days)
      }
    }

    const total = motionCases.length
    const withOutcome = granted + denied
    const grantRate = withOutcome > 0 ? granted / withOutcome : 0
    const denyRate = withOutcome > 0 ? denied / withOutcome : 0

    const avgDays =
      decisionDays.length > 0
        ? decisionDays.reduce((sum, d) => sum + d, 0) / decisionDays.length
        : 0

    const medianDays = calculateMedian(decisionDays)

    totalDecisionDays += avgDays * decisionDays.length
    totalWithTiming += decisionDays.length

    patterns.push({
      motion_type: motionType,
      total_motions: total,
      granted,
      denied,
      grant_rate: grantRate,
      deny_rate: denyRate,
      avg_days_to_decision: Math.round(avgDays),
      median_days_to_decision: Math.round(medianDays),
      sample_size: withOutcome,
      confidence: calculateConfidence(withOutcome),
    })
  }

  // Sort by sample size (most common motion types first)
  patterns.sort((a, b) => b.total_motions - a.total_motions)

  // Calculate overall metrics
  const overallGrantRate = totalWithOutcome > 0 ? totalGranted / totalWithOutcome : 0
  const overallDenyRate = totalWithOutcome > 0 ? totalDenied / totalWithOutcome : 0
  const avgDecisionTime = totalWithTiming > 0 ? totalDecisionDays / totalWithTiming : 0

  return {
    patterns_by_type: patterns,
    overall_grant_rate: overallGrantRate,
    overall_deny_rate: overallDenyRate,
    avg_decision_time: Math.round(avgDecisionTime),
    total_motions_analyzed: totalWithOutcome,
    confidence_score: calculateConfidence(totalWithOutcome),
  }
}

/**
 * Filter motion patterns to include only significant types
 * (those with at least minSamples motions)
 */
export function filterSignificantMotionTypes(
  analysis: MotionAnalysis,
  minSamples = 5
): MotionAnalysis {
  return {
    ...analysis,
    patterns_by_type: analysis.patterns_by_type.filter((p) => p.sample_size >= minSamples),
  }
}
