/**
 * Plain-Language Summary Generator
 * Converts technical metrics into accessible narrative summaries
 * Provides context and qualifiers appropriate for general audiences
 */

import type { JudicialBiasReport, Anomaly, MetricRow } from './report-builder'

export interface NarrativeSummary {
  overview: string
  key_patterns: string[]
  strengths: string[]
  concerns: string[]
  context_notes: string[]
  recommendations: string[]
}

/**
 * Generate plain-language summary from report
 */
export function generateNarrativeSummary(report: JudicialBiasReport): NarrativeSummary {
  const summary: NarrativeSummary = {
    overview: generateOverview(report),
    key_patterns: extractKeyPatterns(report),
    strengths: identifyStrengths(report),
    concerns: identifyConcerns(report),
    context_notes: generateContextNotes(report),
    recommendations: generateRecommendations(report),
  }

  return summary
}

/**
 * Generate overview paragraph
 */
function generateOverview(report: JudicialBiasReport): string {
  const { metadata, confidence_tier, flagged_anomalies } = report

  const dataQuality =
    confidence_tier.tier === 1
      ? 'comprehensive'
      : confidence_tier.tier === 2
        ? 'substantial'
        : confidence_tier.tier === 3
          ? 'adequate'
          : 'limited'

  const anomalyLevel =
    flagged_anomalies.length === 0
      ? 'no significant anomalies'
      : flagged_anomalies.filter((a) => a.severity === 'high').length > 0
        ? 'several notable patterns requiring attention'
        : 'some minor deviations from typical patterns'

  return `This analysis of ${metadata.judge_name}'s judicial patterns is based on ${dataQuality} data comprising ${metadata.total_cases} cases spanning ${formatDateRange(metadata.start_date, metadata.end_date)}. The analysis reveals ${anomalyLevel}. Overall confidence in these findings is ${confidence_tier.label.toLowerCase()} (${confidence_tier.percentage}%).`
}

/**
 * Extract key patterns in plain language
 */
function extractKeyPatterns(report: JudicialBiasReport): string[] {
  const patterns: string[] = []
  const { detailed_findings } = report

  // Settlement patterns
  const settlementRate = detailed_findings.value_analysis.overall_settlement_rate
  if (settlementRate > 0.65) {
    patterns.push(
      `Encourages settlement in ${Math.round(settlementRate * 100)}% of eligible cases, which is higher than typical judicial averages. This suggests a preference for negotiated resolutions over trial.`
    )
  } else if (settlementRate < 0.35) {
    patterns.push(
      `Cases settle less frequently (${Math.round(settlementRate * 100)}% rate) compared to typical courts, indicating a willingness to take matters to trial or judgment.`
    )
  } else {
    patterns.push(
      `Settlement rate of ${Math.round(settlementRate * 100)}% is within the normal range for judicial proceedings.`
    )
  }

  // Motion decisions
  const motionGrantRate = detailed_findings.motion_analysis.overall_grant_rate
  if (motionGrantRate > 0.6) {
    patterns.push(
      `Grants motions at a ${Math.round(motionGrantRate * 100)}% rate, suggesting a relatively permissive approach to procedural requests.`
    )
  } else if (motionGrantRate < 0.35) {
    patterns.push(
      `Denies most motions (${Math.round((1 - motionGrantRate) * 100)}% denial rate), demonstrating high scrutiny of procedural requests.`
    )
  }

  // Case speed
  const avgDuration = detailed_findings.timing_analysis.overall_avg_days
  if (avgDuration < 120) {
    patterns.push(
      `Resolves cases quickly with an average of ${avgDuration} days from filing to decision, which is faster than typical case timelines.`
    )
  } else if (avgDuration > 240) {
    patterns.push(
      `Cases take an average of ${avgDuration} days to resolve, which is longer than typical judicial timelines. This may reflect case complexity or docket management.`
    )
  }

  // Party patterns
  const individualVsCorp = detailed_findings.party_analysis.individual_vs_corporation_rate
  if (individualVsCorp > 0.6 && individualVsCorp < 1) {
    patterns.push(
      `In disputes between individuals and corporations, outcomes favor individuals ${Math.round(individualVsCorp * 100)}% of the time.`
    )
  } else if (individualVsCorp < 0.4 && individualVsCorp > 0) {
    patterns.push(
      `In disputes between individuals and corporations, outcomes favor corporations ${Math.round((1 - individualVsCorp) * 100)}% of the time.`
    )
  }

  // Value patterns
  const highValueRate = detailed_findings.value_analysis.high_value_settlement_rate
  const lowValueRate = detailed_findings.value_analysis.low_value_settlement_rate
  const valueDiff = Math.abs(highValueRate - lowValueRate)

  if (valueDiff > 0.25 && highValueRate > lowValueRate) {
    patterns.push(
      `Shows different approaches based on case value: high-value cases (over $250K) settle ${Math.round(highValueRate * 100)}% of the time compared to ${Math.round(lowValueRate * 100)}% for lower-value cases.`
    )
  }

  return patterns
}

/**
 * Identify judicial strengths
 */
function identifyStrengths(report: JudicialBiasReport): string[] {
  const strengths: string[] = []
  const { detailed_findings, flagged_anomalies } = report

  // Fast case resolution
  if (detailed_findings.timing_analysis.overall_avg_days < 150) {
    strengths.push(
      `Efficient case management with average resolution time of ${detailed_findings.timing_analysis.overall_avg_days} days`
    )
  }

  // Consistent patterns (low deviation)
  const hasLowDeviation =
    !report.detailed_findings.baseline_comparison ||
    report.detailed_findings.baseline_comparison.overall_deviation_score < 30

  if (hasLowDeviation) {
    strengths.push(
      'Judicial patterns are consistent with jurisdiction norms, demonstrating predictable decision-making'
    )
  }

  // Balanced party outcomes
  const plaintiffRate = detailed_findings.party_analysis.plaintiff_vs_defendant_rate
  if (plaintiffRate >= 0.45 && plaintiffRate <= 0.55) {
    strengths.push(
      'Balanced outcomes between plaintiffs and defendants suggest impartial case evaluation'
    )
  }

  // Pro se consideration
  if (detailed_findings.party_analysis.pro_se_success_rate > 0.3) {
    strengths.push(
      `Self-represented litigants achieve favorable outcomes ${Math.round(detailed_findings.party_analysis.pro_se_success_rate * 100)}% of the time, indicating consideration for pro se parties`
    )
  }

  // No major anomalies
  if (flagged_anomalies.filter((a) => a.severity === 'high').length === 0) {
    strengths.push('No high-severity anomalies detected in judicial pattern analysis')
  }

  return strengths
}

/**
 * Identify areas of concern
 */
function identifyConcerns(report: JudicialBiasReport): string[] {
  const concerns: string[] = []
  const { flagged_anomalies, confidence_tier, detailed_findings } = report

  // High-severity anomalies
  const highSeverityAnomalies = flagged_anomalies.filter((a) => a.severity === 'high')
  for (const anomaly of highSeverityAnomalies) {
    concerns.push(anomaly.description)
  }

  // Data quality concerns
  if (confidence_tier.tier === 'limited') {
    concerns.push(
      `Limited dataset (${report.metadata.total_cases} cases) reduces statistical reliability of findings`
    )
  }

  // Extreme motion grant rates
  if (
    detailed_findings.motion_analysis.overall_grant_rate > 0.8 ||
    detailed_findings.motion_analysis.overall_grant_rate < 0.2
  ) {
    concerns.push(
      `Motion grant rate of ${Math.round(detailed_findings.motion_analysis.overall_grant_rate * 100)}% is outside typical judicial range (35-65%)`
    )
  }

  // Very slow case resolution
  if (detailed_findings.timing_analysis.overall_avg_days > 365) {
    concerns.push(
      `Extended case duration (${detailed_findings.timing_analysis.overall_avg_days} days average) may indicate docket congestion or complex caseload`
    )
  }

  // Strong party bias
  const individualVsCorp = detailed_findings.party_analysis.individual_vs_corporation_rate
  if (individualVsCorp > 0.75 || individualVsCorp < 0.25) {
    concerns.push(
      `Notable imbalance in individual vs. corporation outcomes may warrant further examination`
    )
  }

  return concerns
}

/**
 * Generate contextual notes
 */
function generateContextNotes(report: JudicialBiasReport): string[] {
  const notes: string[] = []

  // Statistical context
  notes.push(
    'Statistical patterns reflect aggregated case outcomes and do not account for individual case merits, complexity, or legal standards applicable to each matter.'
  )

  // Temporal context
  if (report.data_quality.data_freshness_score < 60) {
    notes.push(
      'A significant portion of analyzed cases are older than 2 years, which may not fully reflect current judicial patterns.'
    )
  }

  // Baseline context
  if (report.detailed_findings.baseline_comparison) {
    notes.push(
      `Comparisons are made against ${report.metadata.jurisdiction} jurisdiction averages based on ${report.detailed_findings.baseline_comparison.jurisdiction} peer judges.`
    )
  }

  // Methodology context
  notes.push(
    'Analysis applies temporal weighting to prioritize recent cases while maintaining historical context.'
  )

  // Interpretation guidance
  notes.push(
    'Deviation from jurisdiction averages does not necessarily indicate improper bias - judges may specialize in specific case types or handle unique dockets.'
  )

  return notes
}

/**
 * Generate recommendations
 */
function generateRecommendations(report: JudicialBiasReport): string[] {
  const recommendations: string[] = []

  // Data improvement recommendations
  if (report.confidence_tier.tier === 'limited') {
    recommendations.push(
      'Expand analysis to include additional cases (target: 500+ cases) for more reliable pattern detection'
    )
  }

  if (report.data_quality.data_freshness_score < 60) {
    recommendations.push(
      'Update analysis with more recent case data to reflect current judicial patterns'
    )
  }

  if (report.data_quality.category_diversity_score < 50) {
    recommendations.push(
      'Include more diverse case types to improve comprehensiveness of pattern analysis'
    )
  }

  // Anomaly-based recommendations
  const highSeverityCount = report.flagged_anomalies.filter((a) => a.severity === 'high').length

  if (highSeverityCount > 0) {
    recommendations.push(
      'Review high-severity anomalies with subject matter experts to determine if additional context is needed'
    )
  }

  // Baseline comparison recommendations
  if (
    report.detailed_findings.baseline_comparison &&
    report.detailed_findings.baseline_comparison.anomaly_count >= 3
  ) {
    recommendations.push(
      'Consider detailed case-by-case review of significant deviations from jurisdiction norms'
    )
  }

  return recommendations
}

/**
 * Format date range for display
 */
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const startStr = start.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

  return `${startStr} to ${endStr}`
}

/**
 * Generate formatted text report (for export/display)
 */
export function generateTextReport(report: JudicialBiasReport): string {
  const narrative = generateNarrativeSummary(report)
  const sections: string[] = []

  sections.push('='.repeat(80))
  sections.push(`JUDICIAL PATTERN ANALYSIS REPORT`)
  sections.push(`Judge: ${report.metadata.judge_name}`)
  sections.push(`Jurisdiction: ${report.metadata.jurisdiction}`)
  sections.push(`Report Date: ${new Date(report.metadata.report_date).toLocaleDateString()}`)
  sections.push(
    `Analysis Period: ${formatDateRange(report.metadata.start_date, report.metadata.end_date)}`
  )
  sections.push(`Total Cases: ${report.metadata.total_cases}`)
  sections.push(
    `Confidence: ${report.confidence_tier.label} (${report.confidence_tier.percentage}%)`
  )
  sections.push('='.repeat(80))
  sections.push('')

  sections.push('EXECUTIVE SUMMARY')
  sections.push('-'.repeat(80))
  sections.push(report.executive_summary)
  sections.push('')

  sections.push('OVERVIEW')
  sections.push('-'.repeat(80))
  sections.push(narrative.overview)
  sections.push('')

  if (narrative.key_patterns.length > 0) {
    sections.push('KEY PATTERNS IDENTIFIED')
    sections.push('-'.repeat(80))
    for (let i = 0; i < narrative.key_patterns.length; i++) {
      sections.push(`${i + 1}. ${narrative.key_patterns[i]}`)
    }
    sections.push('')
  }

  if (narrative.strengths.length > 0) {
    sections.push('STRENGTHS')
    sections.push('-'.repeat(80))
    for (const strength of narrative.strengths) {
      sections.push(`✓ ${strength}`)
    }
    sections.push('')
  }

  if (narrative.concerns.length > 0) {
    sections.push('AREAS REQUIRING ATTENTION')
    sections.push('-'.repeat(80))
    for (const concern of narrative.concerns) {
      sections.push(`⚠ ${concern}`)
    }
    sections.push('')
  }

  if (report.flagged_anomalies.length > 0) {
    sections.push('FLAGGED ANOMALIES')
    sections.push('-'.repeat(80))
    for (const anomaly of report.flagged_anomalies) {
      const severityIcon =
        anomaly.severity === 'high' ? '🔴' : anomaly.severity === 'medium' ? '🟡' : '🟢'
      sections.push(
        `${severityIcon} [${anomaly.severity.toUpperCase()}] ${anomaly.category}: ${anomaly.metric}`
      )
      sections.push(`   ${anomaly.description}`)
      sections.push(
        `   Judge Value: ${anomaly.judge_value} | Baseline: ${anomaly.baseline_value} | Deviation: ${anomaly.std_deviations.toFixed(1)}σ`
      )
      sections.push('')
    }
  }

  sections.push('CONTEXT & LIMITATIONS')
  sections.push('-'.repeat(80))
  for (const note of narrative.context_notes) {
    sections.push(`• ${note}`)
  }
  sections.push('')

  if (narrative.recommendations.length > 0) {
    sections.push('RECOMMENDATIONS')
    sections.push('-'.repeat(80))
    for (let i = 0; i < narrative.recommendations.length; i++) {
      sections.push(`${i + 1}. ${narrative.recommendations[i]}`)
    }
    sections.push('')
  }

  sections.push('METHODOLOGY')
  sections.push('-'.repeat(80))
  for (const note of report.methodology_notes) {
    sections.push(`• ${note}`)
  }
  sections.push('')

  sections.push('='.repeat(80))
  sections.push(`End of Report - Generated on ${new Date().toLocaleString()}`)
  sections.push('='.repeat(80))

  return sections.join('\n')
}
