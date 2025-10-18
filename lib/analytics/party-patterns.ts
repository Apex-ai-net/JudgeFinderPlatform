/**
 * Party Pattern Analysis Module
 * Detects patterns in case outcomes based on party types
 * Identifies potential biases in favor of or against specific party categories
 */

export type PartyType =
  | 'individual'
  | 'corporation'
  | 'small_business'
  | 'government'
  | 'non_profit'
  | 'insurance_company'
  | 'unknown'

export type RepresentationType = 'pro_se' | 'private_counsel' | 'public_defender' | 'unknown'

export interface PartyPattern {
  party_type: PartyType
  case_count: number
  favorable_outcomes: number
  unfavorable_outcomes: number
  favorable_rate: number
  avg_outcome_value: number
  avg_case_duration_days: number
  confidence: number
}

export interface RepresentationPattern {
  representation_type: RepresentationType
  case_count: number
  favorable_outcomes: number
  favorable_rate: number
  confidence: number
}

export interface PartyAnalysis {
  party_patterns: PartyPattern[]
  representation_patterns: RepresentationPattern[]
  individual_vs_corporation_rate: number // % favorable to individual when vs corporation
  plaintiff_vs_defendant_rate: number // % favorable to plaintiff overall
  pro_se_success_rate: number
  total_cases_analyzed: number
  confidence_score: number
}

interface CaseWithParty {
  case_type?: string | null
  outcome?: string | null
  status?: string | null
  summary?: string | null
  case_value?: number | null
  filing_date?: string | null
  decision_date?: string | null
  // Party information (may be in summary/case_type)
  plaintiff_type?: string | null
  defendant_type?: string | null
}

/**
 * Extract party type from case text
 */
function extractPartyType(text: string): PartyType {
  const lower = text.toLowerCase()

  if (
    lower.includes('corporation') ||
    lower.includes('inc.') ||
    lower.includes('llc') ||
    lower.includes('ltd') ||
    lower.includes('company')
  ) {
    // Check if it's a small business
    if (lower.includes('small business') || lower.includes('sole proprietor')) {
      return 'small_business'
    }
    return 'corporation'
  }

  if (
    lower.includes('government') ||
    lower.includes('state of') ||
    lower.includes('county of') ||
    lower.includes('city of') ||
    lower.includes('united states') ||
    lower.includes('federal')
  ) {
    return 'government'
  }

  if (
    lower.includes('insurance') ||
    lower.includes('assurance') ||
    lower.includes('mutual') ||
    lower.includes('underwriter')
  ) {
    return 'insurance_company'
  }

  if (lower.includes('non-profit') || lower.includes('nonprofit') || lower.includes('foundation')) {
    return 'non_profit'
  }

  if (
    lower.includes('individual') ||
    lower.includes('person') ||
    lower.includes('plaintiff') ||
    lower.includes('defendant')
  ) {
    return 'individual'
  }

  return 'unknown'
}

/**
 * Extract representation type from case text
 */
function extractRepresentationType(text: string): RepresentationType {
  const lower = text.toLowerCase()

  if (lower.includes('pro se') || lower.includes('self-represented') || lower.includes('pro per')) {
    return 'pro_se'
  }

  if (
    lower.includes('public defender') ||
    lower.includes('court-appointed') ||
    lower.includes('appointed counsel')
  ) {
    return 'public_defender'
  }

  if (
    lower.includes('counsel') ||
    lower.includes('attorney') ||
    lower.includes('represented by') ||
    lower.includes('law firm')
  ) {
    return 'private_counsel'
  }

  return 'unknown'
}

/**
 * Determine if outcome was favorable (simplified heuristic)
 */
function isFavorableOutcome(outcome: string, status: string, isPlaintiff: boolean): boolean | null {
  const outcomeText = outcome.toLowerCase()
  const statusText = status.toLowerCase()
  const text = `${outcomeText} ${statusText}`

  if (isPlaintiff) {
    // Favorable for plaintiff
    if (
      text.includes('judgment for plaintiff') ||
      text.includes('awarded') ||
      text.includes('granted') ||
      text.includes('won') ||
      text.includes('prevailed')
    ) {
      return true
    }
    // Unfavorable for plaintiff
    if (
      text.includes('dismissed') ||
      text.includes('judgment for defendant') ||
      text.includes('denied') ||
      text.includes('lost')
    ) {
      return false
    }
  } else {
    // Favorable for defendant (opposite)
    if (
      text.includes('dismissed') ||
      text.includes('judgment for defendant') ||
      text.includes('denied') ||
      text.includes('won')
    ) {
      return true
    }
    if (
      text.includes('judgment for plaintiff') ||
      text.includes('awarded') ||
      text.includes('liable') ||
      text.includes('guilty')
    ) {
      return false
    }
  }

  return null // Unknown outcome
}

/**
 * Calculate case duration in days
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
 * Analyze party patterns in case outcomes
 */
export function analyzePartyPatterns(cases: CaseWithParty[]): PartyAnalysis {
  // Initialize tracking structures
  const partyStats: Record<
    PartyType,
    {
      count: number
      favorable: number
      unfavorable: number
      totalValue: number
      totalDuration: number
      durationCount: number
    }
  > = {
    individual: {
      count: 0,
      favorable: 0,
      unfavorable: 0,
      totalValue: 0,
      totalDuration: 0,
      durationCount: 0,
    },
    corporation: {
      count: 0,
      favorable: 0,
      unfavorable: 0,
      totalValue: 0,
      totalDuration: 0,
      durationCount: 0,
    },
    small_business: {
      count: 0,
      favorable: 0,
      unfavorable: 0,
      totalValue: 0,
      totalDuration: 0,
      durationCount: 0,
    },
    government: {
      count: 0,
      favorable: 0,
      unfavorable: 0,
      totalValue: 0,
      totalDuration: 0,
      durationCount: 0,
    },
    non_profit: {
      count: 0,
      favorable: 0,
      unfavorable: 0,
      totalValue: 0,
      totalDuration: 0,
      durationCount: 0,
    },
    insurance_company: {
      count: 0,
      favorable: 0,
      unfavorable: 0,
      totalValue: 0,
      totalDuration: 0,
      durationCount: 0,
    },
    unknown: {
      count: 0,
      favorable: 0,
      unfavorable: 0,
      totalValue: 0,
      totalDuration: 0,
      durationCount: 0,
    },
  }

  const repStats: Record<
    RepresentationType,
    { count: number; favorable: number; unfavorable: number }
  > = {
    pro_se: { count: 0, favorable: 0, unfavorable: 0 },
    private_counsel: { count: 0, favorable: 0, unfavorable: 0 },
    public_defender: { count: 0, favorable: 0, unfavorable: 0 },
    unknown: { count: 0, favorable: 0, unfavorable: 0 },
  }

  let individualVsCorp = { individual_wins: 0, total: 0 }
  let plaintiffVsDefendant = { plaintiff_wins: 0, total: 0 }

  // Analyze each case
  for (const caseRecord of cases) {
    const summary = caseRecord.summary || ''
    const caseType = caseRecord.case_type || ''
    const text = `${summary} ${caseType}`

    // Extract party types
    const partyType = extractPartyType(text)
    const repType = extractRepresentationType(text)

    // Determine if plaintiff or defendant (simplified)
    const isPlaintiff =
      text.toLowerCase().includes('plaintiff') || caseType.toLowerCase().includes('plaintiff')

    // Determine outcome
    const outcome = caseRecord.outcome || ''
    const status = caseRecord.status || ''
    const isFavorable = isFavorableOutcome(outcome, status, isPlaintiff)

    // Update party stats
    if (partyType !== 'unknown') {
      partyStats[partyType].count++

      if (isFavorable === true) {
        partyStats[partyType].favorable++
      } else if (isFavorable === false) {
        partyStats[partyType].unfavorable++
      }

      if (caseRecord.case_value) {
        partyStats[partyType].totalValue += caseRecord.case_value
      }

      const duration = calculateDuration(caseRecord.filing_date, caseRecord.decision_date)
      if (duration) {
        partyStats[partyType].totalDuration += duration
        partyStats[partyType].durationCount++
      }
    }

    // Update representation stats
    if (repType !== 'unknown') {
      repStats[repType].count++

      if (isFavorable === true) {
        repStats[repType].favorable++
      } else if (isFavorable === false) {
        repStats[repType].unfavorable++
      }
    }

    // Track individual vs corporation cases
    if (
      (partyType === 'individual' && text.toLowerCase().includes('corporation')) ||
      (partyType === 'corporation' && text.toLowerCase().includes('individual'))
    ) {
      individualVsCorp.total++
      if (partyType === 'individual' && isFavorable === true) {
        individualVsCorp.individual_wins++
      } else if (partyType === 'corporation' && isFavorable === false) {
        individualVsCorp.individual_wins++
      }
    }

    // Track plaintiff vs defendant rates
    if (isFavorable !== null) {
      plaintiffVsDefendant.total++
      if (isPlaintiff && isFavorable === true) {
        plaintiffVsDefendant.plaintiff_wins++
      }
    }
  }

  // Build party patterns array
  const partyPatterns: PartyPattern[] = []
  for (const [type, stats] of Object.entries(partyStats) as [
    PartyType,
    typeof partyStats.individual,
  ][]) {
    const totalWithOutcome = stats.favorable + stats.unfavorable
    const favorableRate = totalWithOutcome > 0 ? stats.favorable / totalWithOutcome : 0
    const avgValue = stats.count > 0 ? stats.totalValue / stats.count : 0
    const avgDuration = stats.durationCount > 0 ? stats.totalDuration / stats.durationCount : 0

    if (stats.count > 0) {
      partyPatterns.push({
        party_type: type,
        case_count: stats.count,
        favorable_outcomes: stats.favorable,
        unfavorable_outcomes: stats.unfavorable,
        favorable_rate: favorableRate,
        avg_outcome_value: Math.round(avgValue),
        avg_case_duration_days: Math.round(avgDuration),
        confidence: calculateConfidence(totalWithOutcome),
      })
    }
  }

  // Sort by case count
  partyPatterns.sort((a, b) => b.case_count - a.case_count)

  // Build representation patterns array
  const representationPatterns: RepresentationPattern[] = []
  for (const [type, stats] of Object.entries(repStats) as [
    RepresentationType,
    typeof repStats.pro_se,
  ][]) {
    const totalWithOutcome = stats.favorable + stats.unfavorable
    const favorableRate = totalWithOutcome > 0 ? stats.favorable / totalWithOutcome : 0

    if (stats.count > 0) {
      representationPatterns.push({
        representation_type: type,
        case_count: stats.count,
        favorable_outcomes: stats.favorable,
        favorable_rate: favorableRate,
        confidence: calculateConfidence(totalWithOutcome),
      })
    }
  }

  // Calculate aggregate metrics
  const individualVsCorpRate =
    individualVsCorp.total > 0 ? individualVsCorp.individual_wins / individualVsCorp.total : 0.5

  const plaintiffVsDefendantRate =
    plaintiffVsDefendant.total > 0
      ? plaintiffVsDefendant.plaintiff_wins / plaintiffVsDefendant.total
      : 0.5

  const proSeStats = repStats.pro_se
  const proSeRate =
    proSeStats.favorable + proSeStats.unfavorable > 0
      ? proSeStats.favorable / (proSeStats.favorable + proSeStats.unfavorable)
      : 0

  const totalAnalyzed = cases.length

  return {
    party_patterns: partyPatterns,
    representation_patterns: representationPatterns,
    individual_vs_corporation_rate: individualVsCorpRate,
    plaintiff_vs_defendant_rate: plaintiffVsDefendantRate,
    pro_se_success_rate: proSeRate,
    total_cases_analyzed: totalAnalyzed,
    confidence_score: calculateConfidence(totalAnalyzed),
  }
}

/**
 * Identify potential party-based bias
 */
export function identifyPartyBias(analysis: PartyAnalysis): Array<{
  pattern: string
  severity: 'low' | 'medium' | 'high'
  description: string
}> {
  const biases: Array<{
    pattern: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }> = []

  // Check individual vs corporation rate
  if (analysis.individual_vs_corporation_rate > 0.7) {
    biases.push({
      pattern: 'Individual Favor',
      severity: 'medium',
      description: `${Math.round(analysis.individual_vs_corporation_rate * 100)}% favorable to individuals vs corporations`,
    })
  } else if (analysis.individual_vs_corporation_rate < 0.3) {
    biases.push({
      pattern: 'Corporation Favor',
      severity: 'medium',
      description: `${Math.round((1 - analysis.individual_vs_corporation_rate) * 100)}% favorable to corporations vs individuals`,
    })
  }

  // Check plaintiff vs defendant rate
  if (analysis.plaintiff_vs_defendant_rate > 0.7) {
    biases.push({
      pattern: 'Plaintiff Favor',
      severity: 'low',
      description: `${Math.round(analysis.plaintiff_vs_defendant_rate * 100)}% favorable to plaintiffs`,
    })
  } else if (analysis.plaintiff_vs_defendant_rate < 0.3) {
    biases.push({
      pattern: 'Defendant Favor',
      severity: 'low',
      description: `${Math.round((1 - analysis.plaintiff_vs_defendant_rate) * 100)}% favorable to defendants`,
    })
  }

  // Check pro se success rate (typically should be lower, but not too low)
  if (analysis.pro_se_success_rate < 0.2) {
    biases.push({
      pattern: 'Low Pro Se Success',
      severity: 'medium',
      description: `Only ${Math.round(analysis.pro_se_success_rate * 100)}% success rate for pro se litigants`,
    })
  }

  return biases
}
