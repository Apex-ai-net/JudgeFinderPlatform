/**
 * Case Analytics Statistics
 *
 * Provides comprehensive case statistics aggregation and analysis functions
 * for the case analytics pages.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface CaseStatistics {
  total_cases: number
  total_jurisdictions: number
  avg_decision_time_days: number
  outcome_distribution: {
    settled: number
    dismissed: number
    decided: number
    pending: number
  }
  case_types: Array<{
    case_type: string
    count: number
    avg_duration_days: number
  }>
}

export interface JurisdictionStats {
  jurisdiction: string
  county: string | null
  total_cases: number
  total_judges: number
  total_courts: number
  avg_decision_time_days: number
  settlement_rate: number
  dismissal_rate: number
  decided_rate: number
  pending_rate: number
  most_common_case_type: string | null
  most_common_case_type_count: number
}

export interface OutcomePattern {
  outcome: string
  count: number
  percentage: number
  avg_duration_days: number
}

export interface TemporalTrend {
  year: number
  month: number
  case_count: number
  avg_duration_days: number
  settlement_rate: number
}

/**
 * Fetch platform-wide case statistics
 */
export async function getPlatformStatistics(
  supabase: SupabaseClient
): Promise<CaseStatistics | null> {
  try {
    // Total cases
    const { count: totalCases } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })

    // Distinct jurisdictions
    const { data: jurisdictions } = await supabase
      .from('cases')
      .select('jurisdiction')
      .not('jurisdiction', 'is', null)

    const uniqueJurisdictions = new Set(jurisdictions?.map((j) => j.jurisdiction) || [])

    // Average decision time (only for decided cases)
    const { data: decidedCases } = await supabase
      .from('cases')
      .select('filing_date, decision_date')
      .not('decision_date', 'is', null)
      .not('filing_date', 'is', null)

    let avgDecisionTime = 0
    if (decidedCases && decidedCases.length > 0) {
      const durations = decidedCases.map((c) => {
        const filing = new Date(c.filing_date)
        const decision = new Date(c.decision_date)
        return Math.floor((decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24))
      })
      avgDecisionTime = Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length)
    }

    // Outcome distribution
    const { data: outcomes } = await supabase.from('cases').select('status')

    const outcomeDistribution = {
      settled: 0,
      dismissed: 0,
      decided: 0,
      pending: 0,
    }

    outcomes?.forEach((o) => {
      const status = o.status?.toLowerCase() || 'pending'
      if (status === 'settled') outcomeDistribution.settled++
      else if (status === 'dismissed') outcomeDistribution.dismissed++
      else if (status === 'decided') outcomeDistribution.decided++
      else outcomeDistribution.pending++
    })

    // Case types
    const { data: caseTypes } = await supabase
      .from('cases')
      .select('case_type, filing_date, decision_date')
      .not('case_type', 'is', null)

    const caseTypeMap = new Map<string, { count: number; durations: number[] }>()

    caseTypes?.forEach((c) => {
      const type = c.case_type || 'Other'
      if (!caseTypeMap.has(type)) {
        caseTypeMap.set(type, { count: 0, durations: [] })
      }
      const entry = caseTypeMap.get(type)!
      entry.count++

      if (c.filing_date && c.decision_date) {
        const filing = new Date(c.filing_date)
        const decision = new Date(c.decision_date)
        const duration = Math.floor((decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24))
        entry.durations.push(duration)
      }
    })

    const caseTypesArray = Array.from(caseTypeMap.entries())
      .map(([case_type, data]) => ({
        case_type,
        count: data.count,
        avg_duration_days:
          data.durations.length > 0
            ? Math.floor(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 case types

    return {
      total_cases: totalCases || 0,
      total_jurisdictions: uniqueJurisdictions.size,
      avg_decision_time_days: avgDecisionTime,
      outcome_distribution: outcomeDistribution,
      case_types: caseTypesArray,
    }
  } catch (error) {
    console.error('[Case Statistics] Error fetching platform statistics:', error)
    return null
  }
}

/**
 * Fetch all jurisdictions with their statistics
 */
export async function getJurisdictionsList(supabase: SupabaseClient): Promise<JurisdictionStats[]> {
  try {
    // Get all cases with their jurisdictions
    const { data: cases } = await supabase
      .from('cases')
      .select('jurisdiction, status, filing_date, decision_date, case_type, court_id')
      .not('jurisdiction', 'is', null)

    if (!cases || cases.length === 0) return []

    // Get courts to map counties
    const { data: courts } = await supabase.from('courts').select('id, jurisdiction, county')

    const courtMap = new Map(courts?.map((c) => [c.id, c]) || [])

    // Get judges count per jurisdiction
    const { data: judges } = await supabase
      .from('judges')
      .select('jurisdiction')
      .not('jurisdiction', 'is', null)

    const judgeCountMap = new Map<string, number>()
    judges?.forEach((j) => {
      const count = judgeCountMap.get(j.jurisdiction) || 0
      judgeCountMap.set(j.jurisdiction, count + 1)
    })

    // Aggregate by jurisdiction
    const jurisdictionMap = new Map<
      string,
      {
        county: string | null
        cases: Array<{ status: string; duration?: number; case_type?: string }>
        courts: Set<string>
      }
    >()

    cases.forEach((c) => {
      const jur = c.jurisdiction
      if (!jurisdictionMap.has(jur)) {
        // Try to get county from court
        const court = c.court_id ? courtMap.get(c.court_id) : null
        jurisdictionMap.set(jur, {
          county: court?.county || null,
          cases: [],
          courts: new Set(),
        })
      }

      const entry = jurisdictionMap.get(jur)!

      let duration: number | undefined
      if (c.filing_date && c.decision_date) {
        const filing = new Date(c.filing_date)
        const decision = new Date(c.decision_date)
        duration = Math.floor((decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24))
      }

      entry.cases.push({
        status: c.status || 'pending',
        duration,
        case_type: c.case_type || undefined,
      })

      if (c.court_id) {
        entry.courts.add(c.court_id)
      }
    })

    // Calculate statistics for each jurisdiction
    const stats: JurisdictionStats[] = []

    for (const [jurisdiction, data] of jurisdictionMap.entries()) {
      const totalCases = data.cases.length
      const durations = data.cases.filter((c) => c.duration !== undefined).map((c) => c.duration!)
      const avgDuration =
        durations.length > 0
          ? Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0

      const settled = data.cases.filter((c) => c.status === 'settled').length
      const dismissed = data.cases.filter((c) => c.status === 'dismissed').length
      const decided = data.cases.filter((c) => c.status === 'decided').length
      const pending = data.cases.filter((c) => c.status === 'pending').length

      // Most common case type
      const caseTypeCount = new Map<string, number>()
      data.cases.forEach((c) => {
        if (c.case_type) {
          caseTypeCount.set(c.case_type, (caseTypeCount.get(c.case_type) || 0) + 1)
        }
      })
      const mostCommon = Array.from(caseTypeCount.entries()).sort((a, b) => b[1] - a[1])[0]

      stats.push({
        jurisdiction,
        county: data.county,
        total_cases: totalCases,
        total_judges: judgeCountMap.get(jurisdiction) || 0,
        total_courts: data.courts.size,
        avg_decision_time_days: avgDuration,
        settlement_rate: totalCases > 0 ? (settled / totalCases) * 100 : 0,
        dismissal_rate: totalCases > 0 ? (dismissed / totalCases) * 100 : 0,
        decided_rate: totalCases > 0 ? (decided / totalCases) * 100 : 0,
        pending_rate: totalCases > 0 ? (pending / totalCases) * 100 : 0,
        most_common_case_type: mostCommon ? mostCommon[0] : null,
        most_common_case_type_count: mostCommon ? mostCommon[1] : 0,
      })
    }

    return stats.sort((a, b) => b.total_cases - a.total_cases)
  } catch (error) {
    console.error('[Case Statistics] Error fetching jurisdictions list:', error)
    return []
  }
}

/**
 * Fetch detailed statistics for a specific jurisdiction
 */
export async function getJurisdictionStatistics(
  supabase: SupabaseClient,
  jurisdiction: string
): Promise<{
  stats: JurisdictionStats | null
  outcomePatterns: OutcomePattern[]
  temporalTrends: TemporalTrend[]
  caseTypes: Array<{ case_type: string; count: number; avg_duration_days: number }>
}> {
  try {
    // Get all cases for this jurisdiction
    const { data: cases } = await supabase
      .from('cases')
      .select('*')
      .eq('jurisdiction', jurisdiction)

    if (!cases || cases.length === 0) {
      return {
        stats: null,
        outcomePatterns: [],
        temporalTrends: [],
        caseTypes: [],
      }
    }

    // Get jurisdiction stats
    const jurisdictionsList = await getJurisdictionsList(supabase)
    const stats = jurisdictionsList.find((j) => j.jurisdiction === jurisdiction) || null

    // Outcome patterns
    const outcomeMap = new Map<string, { count: number; durations: number[] }>()
    cases.forEach((c) => {
      const outcome = c.status || 'pending'
      if (!outcomeMap.has(outcome)) {
        outcomeMap.set(outcome, { count: 0, durations: [] })
      }
      const entry = outcomeMap.get(outcome)!
      entry.count++

      if (c.filing_date && c.decision_date) {
        const filing = new Date(c.filing_date)
        const decision = new Date(c.decision_date)
        const duration = Math.floor((decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24))
        entry.durations.push(duration)
      }
    })

    const outcomePatterns: OutcomePattern[] = Array.from(outcomeMap.entries()).map(
      ([outcome, data]) => ({
        outcome,
        count: data.count,
        percentage: (data.count / cases.length) * 100,
        avg_duration_days:
          data.durations.length > 0
            ? Math.floor(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
            : 0,
      })
    )

    // Temporal trends (by month)
    const temporalMap = new Map<string, { count: number; durations: number[]; settled: number }>()
    cases.forEach((c) => {
      if (c.filing_date) {
        const date = new Date(c.filing_date)
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`

        if (!temporalMap.has(key)) {
          temporalMap.set(key, { count: 0, durations: [], settled: 0 })
        }

        const entry = temporalMap.get(key)!
        entry.count++

        if (c.status === 'settled') entry.settled++

        if (c.filing_date && c.decision_date) {
          const filing = new Date(c.filing_date)
          const decision = new Date(c.decision_date)
          const duration = Math.floor(
            (decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24)
          )
          entry.durations.push(duration)
        }
      }
    })

    const temporalTrends: TemporalTrend[] = Array.from(temporalMap.entries())
      .map(([key, data]) => {
        const [year, month] = key.split('-').map(Number)
        return {
          year,
          month,
          case_count: data.count,
          avg_duration_days:
            data.durations.length > 0
              ? Math.floor(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
              : 0,
          settlement_rate: data.count > 0 ? (data.settled / data.count) * 100 : 0,
        }
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return a.month - b.month
      })
      .slice(-24) // Last 24 months

    // Case types
    const caseTypeMap = new Map<string, { count: number; durations: number[] }>()
    cases.forEach((c) => {
      const type = c.case_type || 'Other'
      if (!caseTypeMap.has(type)) {
        caseTypeMap.set(type, { count: 0, durations: [] })
      }
      const entry = caseTypeMap.get(type)!
      entry.count++

      if (c.filing_date && c.decision_date) {
        const filing = new Date(c.filing_date)
        const decision = new Date(c.decision_date)
        const duration = Math.floor((decision.getTime() - filing.getTime()) / (1000 * 60 * 60 * 24))
        entry.durations.push(duration)
      }
    })

    const caseTypes = Array.from(caseTypeMap.entries())
      .map(([case_type, data]) => ({
        case_type,
        count: data.count,
        avg_duration_days:
          data.durations.length > 0
            ? Math.floor(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
            : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return {
      stats,
      outcomePatterns,
      temporalTrends,
      caseTypes,
    }
  } catch (error) {
    console.error('[Case Statistics] Error fetching jurisdiction statistics:', error)
    return {
      stats: null,
      outcomePatterns: [],
      temporalTrends: [],
      caseTypes: [],
    }
  }
}
