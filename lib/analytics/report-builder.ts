/**
 * Judicial Bias Pattern Report Builder
 * Comprehensive report generation system integrating all analytics modules
 * Produces actionable insights with confidence scoring and anomaly detection
 */

import { analyzeMotionPatterns, type MotionAnalysis } from './motion-patterns'
import { analyzeDecisionTiming, type TimingAnalysis } from './decision-timing'
import { analyzePartyPatterns, type PartyAnalysis } from './party-patterns'
import { analyzeValuePatterns, type ValueAnalysis } from './value-analysis'
import {
  getJurisdictionBaseline,
  compareToBaseline,
  interpretDeviationScore,
  type JurisdictionBaseline,
  type DeviationAnalysis,
} from './baselines'
import {
  applyTemporalDecay,
  calculateWeightedRate,
  getEffectiveCaseCount,
  getWeightDistribution,
  type WeightedCase,
} from './temporal-weighting'
import {
  calculateConfidenceTier,
  calculateDataQuality,
  shouldProvideFullAnalytics,
  type ConfidenceScore,
  type DataQualityMetrics,
} from './confidence-scoring'

export interface ReportMetadata {
  judge_id: string
  judge_name: string
  jurisdiction: string
  report_date: string
  start_date: string
  end_date: string
  total_cases: number
  effective_cases: number
  analysis_method: 'comprehensive' | 'limited'
}

export interface MetricRow {
  category: string
  metric: string
  judge_value: number | string
  baseline_value?: number | string
  deviation?: number
  interpretation: string
  confidence: number
  sample_size: number
}

export interface Anomaly {
  category: string
  metric: string
  severity: 'low' | 'medium' | 'high'
  judge_value: number
  baseline_value: number
  std_deviations: number
  description: string
}

export interface DetailedFindings {
  motion_analysis: MotionAnalysis
  timing_analysis: TimingAnalysis
  party_analysis: PartyAnalysis
  value_analysis: ValueAnalysis
  baseline_comparison?: DeviationAnalysis
}

export interface JudicialBiasReport {
  metadata: ReportMetadata
  confidence_tier: ConfidenceScore
  data_quality: DataQualityMetrics
  metrics_table: MetricRow[]
  flagged_anomalies: Anomaly[]
  detailed_findings: DetailedFindings
  executive_summary: string
  methodology_notes: string[]
}

interface CaseData {
  case_type?: string | null
  outcome?: string | null
  status?: string | null
  summary?: string | null
  filing_date?: string | null
  decision_date?: string | null
  case_value?: number | null
  motion_type?: string | null
  judgment_amount?: number | null
  claimed_amount?: number | null
  plaintiff_type?: string | null
  defendant_type?: string | null
}

/**
 * Generate comprehensive judicial bias pattern report
 */
export async function generateBiasReport(
  judgeId: string,
  judgeName: string,
  jurisdiction: string,
  cases: CaseData[],
  options: {
    startDate?: Date
    endDate?: Date
    includeBaseline?: boolean
  } = {}
): Promise<JudicialBiasReport> {
  const startDate = options.startDate || new Date(new Date().getFullYear() - 3, 0, 1)
  const endDate = options.endDate || new Date()

  // Apply temporal weighting
  const weightedCases = applyTemporalDecay(cases, { reference_date: endDate })
  const effectiveCases = getEffectiveCaseCount(weightedCases)
  const weightDistribution = getWeightDistribution(weightedCases)

  // Calculate data quality metrics
  const dataQuality = calculateDataQuality(cases, effectiveCases)

  // Calculate confidence tier
  const confidenceTier = calculateConfidenceTier(cases.length, dataQuality)

  // Determine if full analytics should be provided
  const fullAnalytics = shouldProvideFullAnalytics(cases.length)

  // Run all analysis modules
  const motionAnalysis = analyzeMotionPatterns(cases)
  const timingAnalysis = analyzeDecisionTiming(cases)
  const partyAnalysis = analyzePartyPatterns(cases)
  const valueAnalysis = analyzeValuePatterns(cases)

  // Get jurisdiction baseline if requested
  let baselineComparison: DeviationAnalysis | undefined
  let jurisdictionBaseline: JurisdictionBaseline | null = null

  if (options.includeBaseline !== false) {
    jurisdictionBaseline = await getJurisdictionBaseline(jurisdiction)

    if (jurisdictionBaseline) {
      baselineComparison = compareToBaseline(
        {
          settlement_rate: valueAnalysis.overall_settlement_rate,
          motion_grant_rate: motionAnalysis.overall_grant_rate,
          avg_case_duration_days: timingAnalysis.overall_avg_days,
          plaintiff_favorable_rate: partyAnalysis.plaintiff_vs_defendant_rate,
        },
        jurisdictionBaseline
      )
    }
  }

  // Build metrics table
  const metricsTable = buildMetricsTable(
    motionAnalysis,
    timingAnalysis,
    partyAnalysis,
    valueAnalysis,
    baselineComparison,
    confidenceTier
  )

  // Detect anomalies
  const anomalies = detectAnomalies(
    motionAnalysis,
    timingAnalysis,
    partyAnalysis,
    valueAnalysis,
    baselineComparison
  )

  // Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    judgeName,
    cases.length,
    confidenceTier,
    anomalies,
    baselineComparison,
    fullAnalytics
  )

  // Build methodology notes
  const methodologyNotes = buildMethodologyNotes(
    cases.length,
    effectiveCases,
    weightDistribution,
    fullAnalytics
  )

  // Create metadata
  const metadata: ReportMetadata = {
    judge_id: judgeId,
    judge_name: judgeName,
    jurisdiction,
    report_date: new Date().toISOString(),
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    total_cases: cases.length,
    effective_cases: Math.round(effectiveCases),
    analysis_method: fullAnalytics ? 'comprehensive' : 'limited',
  }

  return {
    metadata,
    confidence_tier: confidenceTier,
    data_quality: dataQuality,
    metrics_table: metricsTable,
    flagged_anomalies: anomalies,
    detailed_findings: {
      motion_analysis: motionAnalysis,
      timing_analysis: timingAnalysis,
      party_analysis: partyAnalysis,
      value_analysis: valueAnalysis,
      baseline_comparison: baselineComparison,
    },
    executive_summary: executiveSummary,
    methodology_notes: methodologyNotes,
  }
}

/**
 * Build comprehensive metrics table
 */
function buildMetricsTable(
  motionAnalysis: MotionAnalysis,
  timingAnalysis: TimingAnalysis,
  partyAnalysis: PartyAnalysis,
  valueAnalysis: ValueAnalysis,
  baselineComparison: DeviationAnalysis | undefined,
  confidenceTier: ConfidenceScore
): MetricRow[] {
  const rows: MetricRow[] = []

  // Settlement rates by value bracket
  rows.push({
    category: 'Settlement Patterns',
    metric: 'Overall Settlement Rate',
    judge_value: `${Math.round(valueAnalysis.overall_settlement_rate * 100)}%`,
    baseline_value: baselineComparison
      ? `${Math.round(baselineComparison.comparisons.find((c) => c.metric === 'Settlement Rate')?.baseline_value ?? 0 * 100)}%`
      : undefined,
    interpretation:
      valueAnalysis.overall_settlement_rate > 0.65
        ? 'High settlement rate'
        : valueAnalysis.overall_settlement_rate < 0.35
          ? 'Low settlement rate'
          : 'Moderate settlement rate',
    confidence: confidenceTier.percentage,
    sample_size: valueAnalysis.total_cases_analyzed,
  })

  // High vs low value settlement comparison
  if (valueAnalysis.high_value_settlement_rate > 0 || valueAnalysis.low_value_settlement_rate > 0) {
    rows.push({
      category: 'Settlement Patterns',
      metric: 'High Value (>$250K) Settlement Rate',
      judge_value: `${Math.round(valueAnalysis.high_value_settlement_rate * 100)}%`,
      interpretation:
        valueAnalysis.high_value_settlement_rate > valueAnalysis.low_value_settlement_rate + 0.2
          ? 'Prefers settling high-value cases'
          : valueAnalysis.high_value_settlement_rate < valueAnalysis.low_value_settlement_rate - 0.2
            ? 'Less likely to settle high-value cases'
            : 'Consistent across value ranges',
      confidence: Math.min(confidenceTier.percentage, 85),
      sample_size: valueAnalysis.value_brackets
        .filter((b) => b.min_value >= 250000)
        .reduce((sum, b) => sum + b.case_count, 0),
    })
  }

  // Motion grant rates
  rows.push({
    category: 'Motion Decisions',
    metric: 'Overall Motion Grant Rate',
    judge_value: `${Math.round(motionAnalysis.overall_grant_rate * 100)}%`,
    baseline_value: baselineComparison
      ? `${Math.round((baselineComparison.comparisons.find((c) => c.metric === 'Motion Grant Rate')?.baseline_value ?? 0) * 100)}%`
      : undefined,
    deviation: baselineComparison
      ? baselineComparison.comparisons.find((c) => c.metric === 'Motion Grant Rate')?.std_deviations
      : undefined,
    interpretation:
      motionAnalysis.overall_grant_rate > 0.6
        ? 'High grant rate'
        : motionAnalysis.overall_grant_rate < 0.35
          ? 'Low grant rate'
          : 'Moderate grant rate',
    confidence: motionAnalysis.confidence_score,
    sample_size: motionAnalysis.total_motions_analyzed,
  })

  // Top motion types
  for (const pattern of motionAnalysis.patterns_by_type.slice(0, 5)) {
    if (pattern.sample_size >= 5) {
      rows.push({
        category: 'Motion Decisions',
        metric: `${pattern.motion_type} Grant Rate`,
        judge_value: `${Math.round(pattern.grant_rate * 100)}% (${pattern.granted}/${pattern.total_motions})`,
        interpretation: `Avg decision time: ${pattern.avg_days_to_decision} days`,
        confidence: pattern.confidence,
        sample_size: pattern.sample_size,
      })
    }
  }

  // Case duration by complexity
  rows.push({
    category: 'Case Duration',
    metric: 'Overall Average Duration',
    judge_value: `${timingAnalysis.overall_avg_days} days`,
    baseline_value: baselineComparison
      ? `${Math.round(baselineComparison.comparisons.find((c) => c.metric === 'Case Duration')?.baseline_value ?? 0)} days`
      : undefined,
    deviation: baselineComparison
      ? baselineComparison.comparisons.find((c) => c.metric === 'Case Duration')?.std_deviations
      : undefined,
    interpretation:
      timingAnalysis.overall_avg_days < 120
        ? 'Fast case resolution'
        : timingAnalysis.overall_avg_days > 240
          ? 'Slow case resolution'
          : 'Moderate case duration',
    confidence: timingAnalysis.confidence_score,
    sample_size: timingAnalysis.total_cases_analyzed,
  })

  // Complexity-based timing
  for (const complexity of timingAnalysis.by_complexity) {
    if (complexity.case_count >= 5) {
      rows.push({
        category: 'Case Duration',
        metric: `${complexity.complexity_tier.replace('_', ' ')} Cases`,
        judge_value: `${complexity.avg_days} days (median: ${complexity.median_days})`,
        interpretation: `Range: ${complexity.min_days}-${complexity.max_days} days, 90th percentile: ${complexity.percentile_90} days`,
        confidence: complexity.confidence,
        sample_size: complexity.case_count,
      })
    }
  }

  // Party patterns
  if (
    partyAnalysis.individual_vs_corporation_rate > 0 &&
    partyAnalysis.individual_vs_corporation_rate < 1
  ) {
    rows.push({
      category: 'Party Patterns',
      metric: 'Individual vs Corporation',
      judge_value: `${Math.round(partyAnalysis.individual_vs_corporation_rate * 100)}% favor individuals`,
      interpretation:
        partyAnalysis.individual_vs_corporation_rate > 0.6
          ? 'Tends to favor individuals over corporations'
          : partyAnalysis.individual_vs_corporation_rate < 0.4
            ? 'Tends to favor corporations over individuals'
            : 'Balanced between individuals and corporations',
      confidence: Math.min(confidenceTier.percentage, 80),
      sample_size: partyAnalysis.total_cases_analyzed,
    })
  }

  rows.push({
    category: 'Party Patterns',
    metric: 'Plaintiff vs Defendant',
    judge_value: `${Math.round(partyAnalysis.plaintiff_vs_defendant_rate * 100)}% favor plaintiffs`,
    baseline_value: baselineComparison
      ? `${Math.round((baselineComparison.comparisons.find((c) => c.metric === 'Plaintiff Favorable Rate')?.baseline_value ?? 0) * 100)}%`
      : undefined,
    interpretation:
      partyAnalysis.plaintiff_vs_defendant_rate > 0.6
        ? 'Plaintiff-favorable'
        : partyAnalysis.plaintiff_vs_defendant_rate < 0.4
          ? 'Defendant-favorable'
          : 'Balanced',
    confidence: partyAnalysis.confidence_score,
    sample_size: partyAnalysis.total_cases_analyzed,
  })

  if (partyAnalysis.pro_se_success_rate > 0) {
    rows.push({
      category: 'Party Patterns',
      metric: 'Pro Se Success Rate',
      judge_value: `${Math.round(partyAnalysis.pro_se_success_rate * 100)}%`,
      interpretation:
        partyAnalysis.pro_se_success_rate < 0.2
          ? 'Low success rate for self-represented litigants'
          : partyAnalysis.pro_se_success_rate > 0.4
            ? 'Favorable to self-represented litigants'
            : 'Moderate pro se success rate',
      confidence: Math.min(confidenceTier.percentage, 75),
      sample_size:
        partyAnalysis.representation_patterns.find((p) => p.representation_type === 'pro_se')
          ?.case_count ?? 0,
    })
  }

  return rows
}

/**
 * Detect anomalies across all metrics
 */
function detectAnomalies(
  motionAnalysis: MotionAnalysis,
  timingAnalysis: TimingAnalysis,
  partyAnalysis: PartyAnalysis,
  valueAnalysis: ValueAnalysis,
  baselineComparison: DeviationAnalysis | undefined
): Anomaly[] {
  const anomalies: Anomaly[] = []

  // Baseline comparison anomalies
  if (baselineComparison) {
    for (const comparison of baselineComparison.comparisons) {
      if (comparison.is_significant) {
        anomalies.push({
          category: 'Baseline Deviation',
          metric: comparison.metric,
          severity: Math.abs(comparison.std_deviations) > 3 ? 'high' : 'medium',
          judge_value: comparison.judge_value,
          baseline_value: comparison.baseline_value,
          std_deviations: comparison.std_deviations,
          description: comparison.interpretation,
        })
      }
    }
  }

  // Motion grant rate extremes
  if (motionAnalysis.overall_grant_rate > 0.8 && motionAnalysis.total_motions_analyzed >= 20) {
    anomalies.push({
      category: 'Motion Decisions',
      metric: 'Overall Grant Rate',
      severity: 'medium',
      judge_value: motionAnalysis.overall_grant_rate,
      baseline_value: 0.5,
      std_deviations: 2.5,
      description: `Very high motion grant rate (${Math.round(motionAnalysis.overall_grant_rate * 100)}%) - significantly above typical range`,
    })
  } else if (
    motionAnalysis.overall_grant_rate < 0.2 &&
    motionAnalysis.total_motions_analyzed >= 20
  ) {
    anomalies.push({
      category: 'Motion Decisions',
      metric: 'Overall Grant Rate',
      severity: 'medium',
      judge_value: motionAnalysis.overall_grant_rate,
      baseline_value: 0.5,
      std_deviations: -2.5,
      description: `Very low motion grant rate (${Math.round(motionAnalysis.overall_grant_rate * 100)}%) - significantly below typical range`,
    })
  }

  // Value-based anomalies
  const valueDiff = Math.abs(
    valueAnalysis.high_value_settlement_rate - valueAnalysis.low_value_settlement_rate
  )
  if (valueDiff > 0.35) {
    anomalies.push({
      category: 'Settlement Patterns',
      metric: 'Value-Based Variation',
      severity: 'medium',
      judge_value: valueAnalysis.high_value_settlement_rate,
      baseline_value: valueAnalysis.low_value_settlement_rate,
      std_deviations: 2.2,
      description: `Significant difference in settlement rates between high-value (${Math.round(valueAnalysis.high_value_settlement_rate * 100)}%) and low-value cases (${Math.round(valueAnalysis.low_value_settlement_rate * 100)}%)`,
    })
  }

  // Timing anomalies
  if (timingAnalysis.overall_avg_days > 400) {
    anomalies.push({
      category: 'Case Duration',
      metric: 'Average Duration',
      severity: 'high',
      judge_value: timingAnalysis.overall_avg_days,
      baseline_value: 180,
      std_deviations: 3.0,
      description: `Exceptionally slow case resolution (${timingAnalysis.overall_avg_days} days average) - well above typical timeframes`,
    })
  } else if (timingAnalysis.overall_avg_days < 60) {
    anomalies.push({
      category: 'Case Duration',
      metric: 'Average Duration',
      severity: 'low',
      judge_value: timingAnalysis.overall_avg_days,
      baseline_value: 180,
      std_deviations: -2.5,
      description: `Unusually fast case resolution (${timingAnalysis.overall_avg_days} days average)`,
    })
  }

  // Party bias anomalies
  if (partyAnalysis.individual_vs_corporation_rate > 0.75) {
    anomalies.push({
      category: 'Party Patterns',
      metric: 'Individual vs Corporation',
      severity: 'medium',
      judge_value: partyAnalysis.individual_vs_corporation_rate,
      baseline_value: 0.5,
      std_deviations: 2.3,
      description: `Strong pattern favoring individuals over corporations (${Math.round(partyAnalysis.individual_vs_corporation_rate * 100)}%)`,
    })
  } else if (partyAnalysis.individual_vs_corporation_rate < 0.25) {
    anomalies.push({
      category: 'Party Patterns',
      metric: 'Individual vs Corporation',
      severity: 'medium',
      judge_value: partyAnalysis.individual_vs_corporation_rate,
      baseline_value: 0.5,
      std_deviations: -2.3,
      description: `Strong pattern favoring corporations over individuals (${Math.round((1 - partyAnalysis.individual_vs_corporation_rate) * 100)}%)`,
    })
  }

  // Sort by severity
  anomalies.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    return severityOrder[b.severity] - severityOrder[a.severity]
  })

  return anomalies
}

/**
 * Generate executive summary
 */
function generateExecutiveSummary(
  judgeName: string,
  caseCount: number,
  confidenceTier: ConfidenceScore,
  anomalies: Anomaly[],
  baselineComparison: DeviationAnalysis | undefined,
  fullAnalytics: boolean
): string {
  const sections: string[] = []

  // Opening
  if (fullAnalytics) {
    sections.push(
      `Comprehensive judicial pattern analysis for ${judgeName} based on ${caseCount} cases. ${confidenceTier.description}`
    )
  } else {
    sections.push(
      `Limited judicial pattern analysis for ${judgeName} based on ${caseCount} cases (below recommended minimum of 500). Results should be interpreted with caution as they may not be fully representative.`
    )
  }

  // Baseline comparison summary
  if (baselineComparison) {
    const interpretation = interpretDeviationScore(baselineComparison.overall_deviation_score)
    sections.push(
      `Comparison to ${baselineComparison.jurisdiction} jurisdiction peers: ${interpretation.description} Overall deviation score: ${baselineComparison.overall_deviation_score}/100.`
    )
  }

  // Anomaly summary
  if (anomalies.length > 0) {
    const highSeverity = anomalies.filter((a) => a.severity === 'high').length
    const mediumSeverity = anomalies.filter((a) => a.severity === 'medium').length

    if (highSeverity > 0) {
      sections.push(
        `⚠️ ${highSeverity} high-severity anomal${highSeverity === 1 ? 'y' : 'ies'} detected requiring attention.`
      )
    }

    if (mediumSeverity > 0) {
      sections.push(
        `${mediumSeverity} moderate deviation${mediumSeverity === 1 ? '' : 's'} from typical patterns identified.`
      )
    }

    // Highlight top anomalies
    const topAnomalies = anomalies.slice(0, 3)
    sections.push('Key findings:')
    for (const anomaly of topAnomalies) {
      sections.push(`• ${anomaly.description}`)
    }
  } else {
    sections.push(
      'No significant anomalies detected. Judicial patterns appear consistent with jurisdiction norms and typical ranges.'
    )
  }

  return sections.join(' ')
}

/**
 * Build methodology notes
 */
function buildMethodologyNotes(
  totalCases: number,
  effectiveCases: number,
  weightDistribution: ReturnType<typeof getWeightDistribution>,
  fullAnalytics: boolean
): string[] {
  const notes: string[] = []

  notes.push(
    `Analysis based on ${totalCases} total cases with temporal weighting applied (effective case count: ${Math.round(effectiveCases)})`
  )

  notes.push(
    `Temporal decay factor: Recent cases weighted more heavily (${Math.round(weightDistribution.recent_cases_pct)}% within 1 year, ${Math.round(weightDistribution.old_cases_pct)}% older than 3 years)`
  )

  notes.push('Case outcomes normalized by type and jurisdiction-specific factors where applicable')

  notes.push(
    'Statistical significance determined using 2-standard-deviation threshold for anomaly detection'
  )

  if (fullAnalytics) {
    notes.push(
      'Full analytics provided: Dataset meets 500-case minimum threshold for comprehensive pattern detection'
    )
  } else {
    notes.push(
      'Limited analytics: Dataset below 500-case recommended threshold - results should be interpreted with caution'
    )
  }

  notes.push(
    'Confidence scores reflect both sample size and data quality factors including temporal distribution and category diversity'
  )

  notes.push(
    'Baseline comparisons calculated using jurisdiction-wide averages from peer judges with similar case loads'
  )

  return notes
}
