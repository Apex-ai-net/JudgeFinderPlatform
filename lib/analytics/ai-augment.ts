import { logger } from '@/lib/utils/logger'
import type { CaseAnalytics, AnalysisWindow } from './types'

const { generateJudicialAnalytics, generateAnalyticsWithOpenAI } = require('@/lib/ai/judicial-analytics')

export async function enhanceAnalyticsWithAI(
  judge: any,
  cases: any[],
  baseAnalytics: CaseAnalytics,
  window: AnalysisWindow
): Promise<CaseAnalytics> {
  const analyzableDocuments = cases
    .filter((doc: any) => doc.plain_text)
    .map((doc: any) => ({
      case_name: doc.case_name || 'Unknown Case',
      case_category: doc.case_type || doc.case_category || 'Unknown',
      case_subcategory: doc.case_subcategory || doc.case_type_subcategory || null,
      case_outcome: doc.outcome || doc.status || 'Unknown',
      decision_date: doc.decision_date || doc.filing_date || null,
      plain_text: doc.plain_text,
      analyzable: doc.analyzable !== false
    }))
    .filter((doc: any) => doc.analyzable && doc.plain_text)
    .slice(0, 60)

  if (analyzableDocuments.length === 0) {
    logger.info('No analyzable case documents available for AI enhancement')
    return baseAnalytics
  }

  let aiAnalytics: any = null

  try {
    aiAnalytics = await generateJudicialAnalytics(judge, analyzableDocuments)

    if (aiAnalytics?.ai_model === 'fallback' && process.env.OPENAI_API_KEY) {
      logger.info('Gemini fallback detected, attempting OpenAI backup')
      aiAnalytics = await generateAnalyticsWithOpenAI(judge, analyzableDocuments)
    }
  } catch (error) {
    logger.error('AI analytics generation failed, attempting fallback if available', undefined, error as Error)
    if (process.env.OPENAI_API_KEY) {
      try {
        aiAnalytics = await generateAnalyticsWithOpenAI(judge, analyzableDocuments)
      } catch (fallbackError) {
        logger.error('OpenAI fallback also failed', undefined, fallbackError as Error)
      }
    }
  }

  if (!aiAnalytics || aiAnalytics.ai_model === 'fallback') {
    return baseAnalytics
  }

  const blendNumericMetric = (
    metric: string,
    sampleKey: string,
    defaultValue: number
  ) => {
    const baseValue = Number((baseAnalytics as any)[metric] ?? defaultValue)
    const aiValue = Number(aiAnalytics[metric] ?? defaultValue)
    const baseSample = Number((baseAnalytics as any)[sampleKey] ?? baseAnalytics.total_cases_analyzed)
    const aiSample = Number(aiAnalytics[sampleKey] ?? aiAnalytics.total_cases_analyzed)

    const totalWeight = Math.max(0, (isFinite(baseSample) ? baseSample : 0)) + Math.max(0, (isFinite(aiSample) ? aiSample : 0))

    if (!totalWeight) {
      return Math.round((baseValue + aiValue) / 2)
    }

    return Math.round(
      ((isFinite(baseSample) ? baseSample : 0) * baseValue + (isFinite(aiSample) ? aiSample : 0) * aiValue) /
        totalWeight
    )
  }

  const blendConfidence = (key: string) => {
    const baseValue = Number((baseAnalytics as any)[key] ?? 60)
    const aiValue = Number(aiAnalytics[key] ?? 60)
    const baseSample = Math.max(0, baseAnalytics.total_cases_analyzed)
    const aiSample = Math.max(0, aiAnalytics.total_cases_analyzed ?? analyzableDocuments.length)
    const totalWeight = baseSample + aiSample

    if (!totalWeight) {
      return Math.round((baseValue + aiValue) / 2)
    }

    return Math.round((baseValue * baseSample + aiValue * aiSample) / totalWeight)
  }

  const merged: CaseAnalytics = {
    ...baseAnalytics,
    civil_plaintiff_favor: blendNumericMetric('civil_plaintiff_favor', 'sample_size_civil', baseAnalytics.civil_plaintiff_favor),
    civil_defendant_favor: 100 - blendNumericMetric('civil_plaintiff_favor', 'sample_size_civil', baseAnalytics.civil_plaintiff_favor),
    family_custody_mother: blendNumericMetric('family_custody_mother', 'sample_size_custody', baseAnalytics.family_custody_mother),
    family_custody_father: 100 - blendNumericMetric('family_custody_mother', 'sample_size_custody', baseAnalytics.family_custody_mother),
    family_alimony_favorable: blendNumericMetric('family_alimony_favorable', 'sample_size_alimony', baseAnalytics.family_alimony_favorable),
    contract_enforcement_rate: blendNumericMetric('contract_enforcement_rate', 'sample_size_contracts', baseAnalytics.contract_enforcement_rate),
    contract_dismissal_rate: 100 - blendNumericMetric('contract_enforcement_rate', 'sample_size_contracts', baseAnalytics.contract_enforcement_rate),
    criminal_sentencing_severity: blendNumericMetric('criminal_sentencing_severity', 'sample_size_sentencing', baseAnalytics.criminal_sentencing_severity),
    criminal_plea_acceptance: blendNumericMetric('criminal_plea_acceptance', 'sample_size_plea', baseAnalytics.criminal_plea_acceptance),
    confidence_civil: blendConfidence('confidence_civil'),
    confidence_custody: blendConfidence('confidence_custody'),
    confidence_alimony: blendConfidence('confidence_alimony'),
    confidence_contracts: blendConfidence('confidence_contracts'),
    confidence_sentencing: blendConfidence('confidence_sentencing'),
    confidence_plea: blendConfidence('confidence_plea'),
    overall_confidence: blendConfidence('overall_confidence'),
    notable_patterns: Array.from(new Set([...(baseAnalytics.notable_patterns || []), ...(aiAnalytics.notable_patterns || [])].filter(Boolean))),
    data_limitations: Array.from(new Set([...(baseAnalytics.data_limitations || []), ...(aiAnalytics.data_limitations || [])].filter(Boolean))),
    analysis_quality: 'augmented_ai',
    ai_model: aiAnalytics.ai_model,
    generated_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    total_cases_analyzed: baseAnalytics.total_cases_analyzed
  }

  const aiPattern = `AI-enhanced review of ${analyzableDocuments.length} case documents within ${window.lookbackYears}-year window`
  if (!merged.notable_patterns.includes(aiPattern)) {
    merged.notable_patterns.push(aiPattern)
  }
  const aiLimitation = `AI analysis limited to ${analyzableDocuments.length} documents (${window.startYear}-${window.endYear})`
  if (!merged.data_limitations.includes(aiLimitation)) {
    merged.data_limitations.push(aiLimitation)
  }

  return merged
}

