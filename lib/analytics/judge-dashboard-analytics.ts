import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  analyzeCaseTypePatterns,
  analyzeOutcomes,
  analyzeTemporalPatterns,
  calculateBiasIndicators,
  type BiasMetrics,
  type CaseTypePattern,
} from './bias-calculations'

export interface JudgeAnalyticsSummary {
  judge_id: string
  judge_name: string
  court_name: string
  total_cases: number
  settlement_rate: number
  dismissal_rate: number
  judgment_rate: number
  avg_case_duration_days: number
  consistency_score: number
  primary_case_types: CaseTypePattern[]
  recent_trend: 'improving' | 'declining' | 'stable'
}

export interface DashboardJudgeAnalytics {
  judges_summary: JudgeAnalyticsSummary[]
  total_bookmarked: number
  avg_settlement_rate: number
  avg_consistency_score: number
  top_case_types: string[]
}

/**
 * Fetches analytics for bookmarked judges on dashboard
 */
export async function getDashboardJudgeAnalytics(
  userId: string
): Promise<DashboardJudgeAnalytics | null> {
  const supabase = await createServiceRoleClient()

  try {
    // Get bookmarked judges
    const { data: bookmarks } = await supabase
      .from('user_bookmarks')
      .select('judge_id')
      .eq('user_id', userId)
      .limit(5) // Limit to 5 for dashboard performance

    if (!bookmarks || bookmarks.length === 0) {
      return {
        judges_summary: [],
        total_bookmarked: 0,
        avg_settlement_rate: 0,
        avg_consistency_score: 0,
        top_case_types: [],
      }
    }

    const judgeIds = bookmarks.map((b) => b.judge_id)

    // Fetch judge information
    const { data: judges } = await supabase
      .from('judges')
      .select('id, name, court_id')
      .in('id', judgeIds)

    // Fetch court information
    const courtIds = judges?.map((j) => j.court_id) || []
    const { data: courts } = await supabase.from('courts').select('id, name').in('id', courtIds)

    const courtMap =
      courts?.reduce(
        (map, court) => {
          map[court.id] = court.name
          return map
        },
        {} as Record<string, string>
      ) || {}

    // Fetch cases for each judge (limit to 500 for performance)
    const judgesSummary: JudgeAnalyticsSummary[] = []

    for (const judge of judges || []) {
      const { data: cases } = await supabase
        .from('cases')
        .select('case_type, outcome, status, case_value, filing_date, decision_date')
        .eq('judge_id', judge.id)
        .not('decision_date', 'is', null)
        .order('decision_date', { ascending: false })
        .limit(500)

      if (!cases || cases.length === 0) continue

      // Analyze cases
      const caseTypePatterns = analyzeCaseTypePatterns(cases)
      const outcomeAnalysis = analyzeOutcomes(cases)
      const temporalPatterns = analyzeTemporalPatterns(cases)
      const biasIndicators = calculateBiasIndicators(cases, caseTypePatterns, outcomeAnalysis)

      // Calculate recent trend
      const recentCases = cases.slice(0, Math.floor(cases.length / 4)) // Last 25%
      const recentSettlementRate =
        recentCases.filter((c) => (c.outcome || c.status)?.toLowerCase().includes('settle'))
          .length / recentCases.length

      const trend =
        recentSettlementRate > outcomeAnalysis.overall_settlement_rate * 1.1
          ? 'improving'
          : recentSettlementRate < outcomeAnalysis.overall_settlement_rate * 0.9
            ? 'declining'
            : 'stable'

      judgesSummary.push({
        judge_id: judge.id,
        judge_name: judge.name,
        court_name: courtMap[judge.court_id] || 'Unknown Court',
        total_cases: cases.length,
        settlement_rate: outcomeAnalysis.overall_settlement_rate,
        dismissal_rate: outcomeAnalysis.dismissal_rate,
        judgment_rate: outcomeAnalysis.judgment_rate,
        avg_case_duration_days: outcomeAnalysis.average_case_duration,
        consistency_score: biasIndicators.consistency_score,
        primary_case_types: caseTypePatterns.slice(0, 3),
        recent_trend: trend,
      })
    }

    // Calculate aggregates
    const avgSettlementRate =
      judgesSummary.length > 0
        ? judgesSummary.reduce((sum, j) => sum + j.settlement_rate, 0) / judgesSummary.length
        : 0

    const avgConsistencyScore =
      judgesSummary.length > 0
        ? judgesSummary.reduce((sum, j) => sum + j.consistency_score, 0) / judgesSummary.length
        : 0

    const topCaseTypes: Record<string, number> = {}
    judgesSummary.forEach((j) => {
      j.primary_case_types.forEach((ct) => {
        topCaseTypes[ct.case_type] = (topCaseTypes[ct.case_type] || 0) + 1
      })
    })

    const topCaseTypesList = Object.entries(topCaseTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type)

    return {
      judges_summary: judgesSummary,
      total_bookmarked: judgeIds.length,
      avg_settlement_rate: Math.round(avgSettlementRate * 100) / 100,
      avg_consistency_score: Math.round(avgConsistencyScore * 100) / 100,
      top_case_types: topCaseTypesList,
    }
  } catch (error) {
    console.error('Error fetching judge analytics:', error)
    return null
  }
}
