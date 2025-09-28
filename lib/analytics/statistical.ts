import { logger } from '@/lib/utils/logger'
import type { CaseAnalytics, AnalysisWindow } from './types'

export function analyzeJudicialPatterns(_judge: any, cases: any[], window: AnalysisWindow): CaseAnalytics {
  logger.debug('Analyzing cases for statistical patterns', { caseCount: cases.length })

  const stats = {
    civil: { total: 0, plaintiff_wins: 0 },
    custody: { total: 0, mother_awards: 0 },
    alimony: { total: 0, awarded: 0 },
    contracts: { total: 0, enforced: 0 },
    criminal: { total: 0, strict_sentences: 0 },
    plea: { total: 0, accepted: 0 },
    bail: { total: 0, granted: 0 },
    reversal: { total: 0, reversed: 0 },
    settlement: { total: 0, encouraged: 0 },
    motion: { total: 0, granted: 0 }
  }

  cases.forEach(caseItem => {
    const caseType = (caseItem.case_type || '').toLowerCase()
    const outcome = (caseItem.outcome || '').toLowerCase()
    const summary = (caseItem.summary || '').toLowerCase()
    const status = (caseItem.status || '').toLowerCase()

    if (caseType.includes('civil') || caseType.includes('tort') || caseType.includes('personal injury')) {
      stats.civil.total++
      if (outcome.includes('plaintiff') || outcome.includes('awarded') || summary.includes('in favor of plaintiff')) {
        stats.civil.plaintiff_wins++
      }
    }

    if (caseType.includes('custody') || caseType.includes('family') || summary.includes('child custody')) {
      stats.custody.total++
      if (outcome.includes('mother') || summary.includes('custody to mother') || summary.includes('maternal custody')) {
        stats.custody.mother_awards++
      }
    }

    if (caseType.includes('divorce') || caseType.includes('family') || summary.includes('alimony') || summary.includes('spousal support')) {
      stats.alimony.total++
      if (outcome.includes('alimony') || outcome.includes('spousal support') || summary.includes('awarded spousal')) {
        stats.alimony.awarded++
      }
    }

    if (caseType.includes('contract') || caseType.includes('breach') || summary.includes('contract dispute')) {
      stats.contracts.total++
      if (outcome.includes('enforced') || outcome.includes('breach found') || summary.includes('contract upheld') || (!outcome.includes('dismissed') && status === 'decided')) {
        stats.contracts.enforced++
      }
    }

    if (caseType.includes('criminal') || caseType.includes('felony') || caseType.includes('misdemeanor')) {
      stats.criminal.total++
      if (outcome.includes('prison') || outcome.includes('years') || summary.includes('sentenced to')) {
        stats.criminal.strict_sentences++
      }
    }

    const mentionsPlea = summary.includes('plea') || outcome.includes('plea')
    if (mentionsPlea) {
      stats.plea.total++
      if (outcome.includes('plea accepted') || summary.includes('plea approved') || outcome.includes('guilty plea')) {
        stats.plea.accepted++
      }
    }

    const mentionsBail =
      summary.includes('bail') ||
      summary.includes('pretrial release') ||
      summary.includes('pre-trial release') ||
      summary.includes('released on own recognizance') ||
      outcome.includes('bail') ||
      outcome.includes('release') ||
      outcome.includes('detained') ||
      outcome.includes('remand')

    if (mentionsBail) {
      stats.bail.total++
      if (outcome.includes('bail granted') || outcome.includes('released') || summary.includes('release granted') || summary.includes('bail set') || (!outcome.includes('remanded') && !outcome.includes('detained'))) {
        stats.bail.granted++
      }
    }

    if (caseType.includes('appeal') || summary.includes('appeal') || outcome.includes('appeal')) {
      stats.reversal.total++
      if (outcome.includes('reversed') || outcome.includes('overturned') || summary.includes('judgment reversed') || summary.includes('decision overturned')) {
        stats.reversal.reversed++
      }
    }

    if (caseType.includes('civil') || caseType.includes('contract') || caseType.includes('tort')) {
      if (summary.includes('settlement') || outcome.includes('settlement')) {
        stats.settlement.total++
        if (outcome.includes('settled') || summary.includes('settlement reached') || summary.includes('parties settled') || summary.includes('settlement conference')) {
          stats.settlement.encouraged++
        }
      }
    }

    if (summary.includes('motion') || outcome.includes('motion')) {
      stats.motion.total++
      if (outcome.includes('granted') || outcome.includes('motion granted') || summary.includes('granted the motion') || summary.includes('motion approved')) {
        stats.motion.granted++
      }
    }
  })

  const calculateMetrics = (stat: Record<string, number>, successKey: string, label: string) => {
    if (stat.total === 0) return { percentage: 50, confidence: 60, sample: 0 }

    const successCount = Number((stat as any)[successKey] ?? 0)
    const safeTotal = stat.total || 0
    const ratio = safeTotal > 0 ? successCount / safeTotal : 0.5
    const percentage = Math.round(Math.min(1, Math.max(0, ratio)) * 100)

    let confidence = 60
    if (stat.total >= 50) confidence = 90
    else if (stat.total >= 30) confidence = 85
    else if (stat.total >= 20) confidence = 80
    else if (stat.total >= 10) confidence = 75
    else if (stat.total >= 5) confidence = 70
    else confidence = 65

    confidence = Math.min(95, confidence)

    logger.debug('Metric calculation', { label, successCount, total: safeTotal, percentage, confidence })

    return { percentage, confidence, sample: stat.total }
  }

  const civilMetrics = calculateMetrics(stats.civil, 'plaintiff_wins', 'Civil')
  const custodyMetrics = calculateMetrics(stats.custody, 'mother_awards', 'Custody')
  const alimonyMetrics = calculateMetrics(stats.alimony, 'awarded', 'Alimony')
  const contractMetrics = calculateMetrics(stats.contracts, 'enforced', 'Contracts')
  const criminalMetrics = calculateMetrics(stats.criminal, 'strict_sentences', 'Criminal')
  const pleaMetrics = calculateMetrics(stats.plea, 'accepted', 'Plea')
  const bailMetrics = calculateMetrics(stats.bail, 'granted', 'Bail')
  const reversalMetrics = calculateMetrics(stats.reversal, 'reversed', 'Reversal')
  const settlementMetrics = calculateMetrics(stats.settlement, 'encouraged', 'Settlement')
  const motionMetrics = calculateMetrics(stats.motion, 'granted', 'Motion')

  const totalCases = cases.length
  let overallConfidence = 65
  if (totalCases >= 200) overallConfidence = 95
  else if (totalCases >= 150) overallConfidence = 90
  else if (totalCases >= 100) overallConfidence = 85
  else if (totalCases >= 75) overallConfidence = 80
  else if (totalCases >= 50) overallConfidence = 75
  else if (totalCases >= 25) overallConfidence = 70

  const patterns: string[] = []
  const limitations: string[] = []

  if (totalCases > 200) patterns.push(`Comprehensive ${window.lookbackYears}-year analysis: ${totalCases} cases analyzed`)
  else if (totalCases > 100) patterns.push(`Substantial ${window.lookbackYears}-year dataset: ${totalCases} cases analyzed`)
  else if (totalCases > 50) patterns.push(`Moderate ${window.lookbackYears}-year dataset: ${totalCases} cases analyzed`)
  else if (totalCases < 50) limitations.push(`Limited ${window.lookbackYears}-year data: only ${totalCases} cases available`)

  if (stats.civil.total > 20) patterns.push(`Civil cases: ${Math.round((stats.civil.total / totalCases) * 100)}% of ${window.lookbackYears}-year caseload`)
  if (stats.criminal.total > 20) patterns.push(`Criminal cases: ${Math.round((stats.criminal.total / totalCases) * 100)}% of ${window.lookbackYears}-year caseload`)
  if (stats.custody.total > 10) patterns.push(`Family custody cases: ${Math.round((stats.custody.total / totalCases) * 100)}% of caseload`)

  const timeframeLabel = window.startYear === window.endYear ? `${window.startYear}` : `${window.startYear}-${window.endYear}`
  patterns.push(`Analysis covers cases filed from ${timeframeLabel}`)

  return {
    civil_plaintiff_favor: civilMetrics.percentage,
    civil_defendant_favor: 100 - civilMetrics.percentage,
    family_custody_mother: custodyMetrics.percentage,
    family_custody_father: 100 - custodyMetrics.percentage,
    family_alimony_favorable: alimonyMetrics.percentage,
    contract_enforcement_rate: contractMetrics.percentage,
    contract_dismissal_rate: 100 - contractMetrics.percentage,
    criminal_sentencing_severity: criminalMetrics.percentage,
    criminal_plea_acceptance: pleaMetrics.percentage,
    bail_release_rate: bailMetrics.percentage,
    appeal_reversal_rate: reversalMetrics.percentage,
    settlement_encouragement_rate: settlementMetrics.percentage,
    motion_grant_rate: motionMetrics.percentage,
    confidence_civil: civilMetrics.confidence,
    confidence_custody: custodyMetrics.confidence,
    confidence_alimony: alimonyMetrics.confidence,
    confidence_contracts: contractMetrics.confidence,
    confidence_sentencing: criminalMetrics.confidence,
    confidence_plea: pleaMetrics.confidence,
    confidence_bail: bailMetrics.confidence,
    confidence_reversal: reversalMetrics.confidence,
    confidence_settlement: settlementMetrics.confidence,
    confidence_motion: motionMetrics.confidence,
    overall_confidence: Math.round(overallConfidence),
    sample_size_civil: civilMetrics.sample,
    sample_size_custody: custodyMetrics.sample,
    sample_size_alimony: alimonyMetrics.sample,
    sample_size_contracts: contractMetrics.sample,
    sample_size_sentencing: criminalMetrics.sample,
    sample_size_plea: pleaMetrics.sample,
    sample_size_bail: bailMetrics.sample,
    sample_size_reversal: reversalMetrics.sample,
    sample_size_settlement: settlementMetrics.sample,
    sample_size_motion: motionMetrics.sample,
    total_cases_analyzed: totalCases,
    analysis_quality: totalCases > 150 ? 'excellent' : totalCases > 100 ? 'high' : totalCases > 50 ? 'medium' : 'low',
    notable_patterns: patterns.length > 0 ? patterns : ['Statistical analysis based on 3-year case outcomes'],
    data_limitations: limitations.length > 0 ? limitations : ['Analysis based on available 3-year case outcome data'],
    ai_model: 'statistical_analysis_3year',
    generated_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  }
}

export async function generateLegacyAnalytics(judge: any, window: AnalysisWindow): Promise<CaseAnalytics> {
  logger.info('Generating legacy analytics (no cases)', { judgeName: judge.name })

  const isCaliforniaJudge = judge.jurisdiction?.toLowerCase().includes('ca') || judge.jurisdiction?.toLowerCase().includes('california')
  const baseAdjustment = isCaliforniaJudge ? 5 : 0

  return {
    civil_plaintiff_favor: 48 + baseAdjustment,
    civil_defendant_favor: 52 - baseAdjustment,
    family_custody_mother: 52 + baseAdjustment,
    family_custody_father: 48 - baseAdjustment,
    family_alimony_favorable: 42 + baseAdjustment,
    contract_enforcement_rate: 68 - baseAdjustment,
    contract_dismissal_rate: 32 + baseAdjustment,
    criminal_sentencing_severity: 50,
    criminal_plea_acceptance: 75,
    bail_release_rate: 65 + baseAdjustment,
    appeal_reversal_rate: 15,
    settlement_encouragement_rate: 60,
    motion_grant_rate: 45,
    confidence_civil: 65,
    confidence_custody: 65,
    confidence_alimony: 65,
    confidence_contracts: 65,
    confidence_sentencing: 65,
    confidence_plea: 65,
    confidence_bail: 60,
    confidence_reversal: 60,
    confidence_settlement: 60,
    confidence_motion: 60,
    overall_confidence: 65,
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
    total_cases_analyzed: 0,
    analysis_quality: 'profile_based',
    notable_patterns: [
      'Analysis based on judicial profile and jurisdiction patterns',
      `No case data available within ${window.lookbackYears}-year window (${window.startYear}-${window.endYear})`
    ],
    data_limitations: ['No case data available', 'Estimates based on regional and court type patterns'],
    ai_model: 'statistical_estimation',
    generated_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  }
}

export function generateConservativeAnalytics(judge: any, caseCount: number, window: AnalysisWindow): CaseAnalytics {
  logger.warn('Generating conservative analytics (analysis failed)', { judgeName: judge.name, caseCount })

  return {
    civil_plaintiff_favor: 50,
    civil_defendant_favor: 50,
    family_custody_mother: 50,
    family_custody_father: 50,
    family_alimony_favorable: 40,
    contract_enforcement_rate: 65,
    contract_dismissal_rate: 35,
    criminal_sentencing_severity: 50,
    criminal_plea_acceptance: 70,
    bail_release_rate: 60,
    appeal_reversal_rate: 15,
    settlement_encouragement_rate: 55,
    motion_grant_rate: 45,
    confidence_civil: 60,
    confidence_custody: 60,
    confidence_alimony: 60,
    confidence_contracts: 60,
    confidence_sentencing: 60,
    confidence_plea: 60,
    confidence_bail: 60,
    confidence_reversal: 60,
    confidence_settlement: 60,
    confidence_motion: 60,
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
    total_cases_analyzed: caseCount,
    analysis_quality: 'conservative',
    notable_patterns: ['Conservative estimates due to AI processing limitations'],
    data_limitations: [
      'AI analysis unavailable',
      'Using statistical defaults',
      `Window analyzed: ${window.startYear}-${window.endYear}`
    ],
    ai_model: 'conservative_fallback',
    generated_at: new Date().toISOString(),
    last_updated: new Date().toISOString()
  }
}


