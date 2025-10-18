/**
 * Data Snapshot Generator
 *
 * Creates point-in-time snapshots of judicial data for auditing and analysis.
 * Provides comprehensive statistics on judges, courts, cases, and assignments.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceRoleFactory } from '@/lib/supabase/service-role'
import { logger } from '@/lib/utils/logger'

export interface DataSnapshot {
  snapshot_id: string
  timestamp: string
  duration_ms: number
  judges: JudgeSnapshot
  courts: CourtSnapshot
  cases: CaseSnapshot
  assignments: AssignmentSnapshot
  quality_metrics: QualityMetrics
  health_score: number
}

export interface JudgeSnapshot {
  total: number
  with_primary_court: number
  without_primary_court: number
  below_threshold: number // < 500 cases
  above_threshold: number // >= 500 cases
  by_jurisdiction: Record<string, number>
  active: number
  retired: number
  avg_cases_per_judge: number
}

export interface CourtSnapshot {
  total: number
  with_judges: number
  without_judges: number
  by_jurisdiction: Record<string, number>
  by_type: Record<string, number>
  avg_judges_per_court: number
}

export interface CaseSnapshot {
  total: number
  linked_to_judge: number
  orphaned: number
  with_valid_outcome: number
  with_invalid_outcome: number
  avg_cases_per_judge: number
  by_outcome: Record<string, number>
  recent_cases: number // Within last year
  stale_cases: number // Older than 3 years
}

export interface AssignmentSnapshot {
  total: number
  active: number
  ended: number
  primary: number
  visiting: number
  temporary: number
  retired: number
  overlapping: number
  jurisdiction_mismatches: number
}

export interface QualityMetrics {
  orphaned_records: number
  duplicate_identifiers: number
  missing_required_fields: number
  standardization_issues: number
  relationship_inconsistencies: number
  temporal_overlaps: number
  jurisdiction_mismatches: number
}

/**
 * Data Snapshot Generator
 * Creates comprehensive snapshots of judicial data
 */
export class SnapshotGenerator {
  private readonly supabase: SupabaseClient

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? this.createSupabaseServiceRoleClient()
  }

  private createSupabaseServiceRoleClient(): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase credentials missing')
    }

    return new SupabaseServiceRoleFactory({
      url: supabaseUrl,
      serviceRoleKey,
    }).create()
  }

  /**
   * Generate complete data snapshot
   */
  async generateSnapshot(): Promise<DataSnapshot> {
    const startTime = Date.now()
    const snapshotId = `snapshot-${startTime}`

    logger.info('Generating data snapshot', { snapshotId })

    try {
      // Generate all snapshots in parallel for performance
      const [judges, courts, cases, assignments, qualityMetrics] = await Promise.all([
        this.generateJudgeSnapshot(),
        this.generateCourtSnapshot(),
        this.generateCaseSnapshot(),
        this.generateAssignmentSnapshot(),
        this.generateQualityMetrics(),
      ])

      const duration = Date.now() - startTime

      // Calculate overall health score (0-100)
      const healthScore = this.calculateHealthScore(qualityMetrics, judges, cases, assignments)

      const snapshot: DataSnapshot = {
        snapshot_id: snapshotId,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        judges,
        courts,
        cases,
        assignments,
        quality_metrics: qualityMetrics,
        health_score: healthScore,
      }

      logger.info('Snapshot generated successfully', {
        snapshotId,
        duration,
        healthScore,
      })

      return snapshot
    } catch (error) {
      logger.error('Snapshot generation failed', { error, snapshotId })
      throw error
    }
  }

  /**
   * Generate judge snapshot
   */
  private async generateJudgeSnapshot(): Promise<JudgeSnapshot> {
    const [total, withPrimary, belowThreshold, byJurisdiction, avgCases] = await Promise.all([
      this.countJudges(),
      this.countJudgesWithPrimaryCourt(),
      this.countJudgesBelowThreshold(),
      this.countJudgesByJurisdiction(),
      this.calculateAvgCasesPerJudge(),
    ])

    return {
      total: total.count,
      with_primary_court: withPrimary,
      without_primary_court: total.count - withPrimary,
      below_threshold: belowThreshold,
      above_threshold: total.count - belowThreshold,
      by_jurisdiction: byJurisdiction,
      active: total.active,
      retired: total.retired,
      avg_cases_per_judge: avgCases,
    }
  }

  /**
   * Generate court snapshot
   */
  private async generateCourtSnapshot(): Promise<CourtSnapshot> {
    const [total, withJudges, byJurisdiction, byType, avgJudges] = await Promise.all([
      this.countCourts(),
      this.countCourtsWithJudges(),
      this.countCourtsByJurisdiction(),
      this.countCourtsByType(),
      this.calculateAvgJudgesPerCourt(),
    ])

    return {
      total: total,
      with_judges: withJudges,
      without_judges: total - withJudges,
      by_jurisdiction: byJurisdiction,
      by_type: byType,
      avg_judges_per_court: avgJudges,
    }
  }

  /**
   * Generate case snapshot
   */
  private async generateCaseSnapshot(): Promise<CaseSnapshot> {
    const [total, linked, avgCases, byOutcome, recent, stale] = await Promise.all([
      this.countCases(),
      this.countLinkedCases(),
      this.calculateAvgCasesPerJudge(),
      this.countCasesByOutcome(),
      this.countRecentCases(),
      this.countStaleCases(),
    ])

    return {
      total: total,
      linked_to_judge: linked,
      orphaned: total - linked,
      with_valid_outcome: byOutcome.valid,
      with_invalid_outcome: byOutcome.invalid,
      avg_cases_per_judge: avgCases,
      by_outcome: byOutcome.distribution,
      recent_cases: recent,
      stale_cases: stale,
    }
  }

  /**
   * Generate assignment snapshot
   */
  private async generateAssignmentSnapshot(): Promise<AssignmentSnapshot> {
    const [total, active, byType, overlapping, jurisdictionMismatches] = await Promise.all([
      this.countAssignments(),
      this.countActiveAssignments(),
      this.countAssignmentsByType(),
      this.countOverlappingAssignments(),
      this.countJurisdictionMismatches(),
    ])

    return {
      total: total,
      active: active,
      ended: total - active,
      primary: byType.primary || 0,
      visiting: byType.visiting || 0,
      temporary: byType.temporary || 0,
      retired: byType.retired || 0,
      overlapping: overlapping,
      jurisdiction_mismatches: jurisdictionMismatches,
    }
  }

  /**
   * Generate quality metrics
   */
  private async generateQualityMetrics(): Promise<QualityMetrics> {
    const [
      orphaned,
      duplicates,
      missingFields,
      standardization,
      relationships,
      overlaps,
      jurisdictionIssues,
    ] = await Promise.all([
      this.countOrphanedRecords(),
      this.countDuplicateIdentifiers(),
      this.countMissingRequiredFields(),
      this.countStandardizationIssues(),
      this.countRelationshipInconsistencies(),
      this.countOverlappingAssignments(),
      this.countJurisdictionMismatches(),
    ])

    return {
      orphaned_records: orphaned,
      duplicate_identifiers: duplicates,
      missing_required_fields: missingFields,
      standardization_issues: standardization,
      relationship_inconsistencies: relationships,
      temporal_overlaps: overlaps,
      jurisdiction_mismatches: jurisdictionIssues,
    }
  }

  // Helper query methods

  private async countJudges(): Promise<{ count: number; active: number; retired: number }> {
    const { count: total } = await this.supabase
      .from('judges')
      .select('*', { count: 'exact', head: true })

    // Count retired judges (have a retired assignment)
    const { data: retiredAssignments } = await this.supabase
      .from('judge_court_assignments')
      .select('judge_id')
      .eq('assignment_type', 'retired')
      .is('end_date', null)

    const retiredCount = new Set(retiredAssignments?.map((a) => a.judge_id) || []).size

    return {
      count: total || 0,
      active: (total || 0) - retiredCount,
      retired: retiredCount,
    }
  }

  private async countJudgesWithPrimaryCourt(): Promise<number> {
    const { data } = await this.supabase
      .from('judge_court_assignments')
      .select('judge_id')
      .eq('assignment_type', 'primary')
      .is('end_date', null)

    return new Set(data?.map((a) => a.judge_id) || []).size
  }

  private async countJudgesBelowThreshold(): Promise<number> {
    const { count } = await this.supabase
      .from('judges')
      .select('*', { count: 'exact', head: true })
      .lt('total_cases', 500)

    return count || 0
  }

  private async countJudgesByJurisdiction(): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from('judges')
      .select('jurisdiction')
      .not('jurisdiction', 'is', null)

    const counts: Record<string, number> = {}
    data?.forEach((j) => {
      counts[j.jurisdiction] = (counts[j.jurisdiction] || 0) + 1
    })

    return counts
  }

  private async calculateAvgCasesPerJudge(): Promise<number> {
    const { data } = await this.supabase.from('judges').select('total_cases')

    if (!data || data.length === 0) return 0

    const total = data.reduce((sum, j) => sum + (j.total_cases || 0), 0)
    return Math.round(total / data.length)
  }

  private async countCourts(): Promise<number> {
    const { count } = await this.supabase.from('courts').select('*', { count: 'exact', head: true })

    return count || 0
  }

  private async countCourtsWithJudges(): Promise<number> {
    const { data } = await this.supabase
      .from('judge_court_assignments')
      .select('court_id')
      .is('end_date', null)

    return new Set(data?.map((a) => a.court_id) || []).size
  }

  private async countCourtsByJurisdiction(): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from('courts')
      .select('jurisdiction')
      .not('jurisdiction', 'is', null)

    const counts: Record<string, number> = {}
    data?.forEach((c) => {
      counts[c.jurisdiction] = (counts[c.jurisdiction] || 0) + 1
    })

    return counts
  }

  private async countCourtsByType(): Promise<Record<string, number>> {
    const { data } = await this.supabase.from('courts').select('court_type')

    const counts: Record<string, number> = {}
    data?.forEach((c) => {
      const type = c.court_type || 'unknown'
      counts[type] = (counts[type] || 0) + 1
    })

    return counts
  }

  private async calculateAvgJudgesPerCourt(): Promise<number> {
    const { data } = await this.supabase
      .from('judge_court_assignments')
      .select('court_id')
      .is('end_date', null)

    if (!data || data.length === 0) return 0

    const courtCounts: Record<string, number> = {}
    data.forEach((a) => {
      courtCounts[a.court_id] = (courtCounts[a.court_id] || 0) + 1
    })

    const courts = Object.keys(courtCounts).length
    return courts > 0 ? Math.round(data.length / courts) : 0
  }

  private async countCases(): Promise<number> {
    const { count } = await this.supabase.from('cases').select('*', { count: 'exact', head: true })

    return count || 0
  }

  private async countLinkedCases(): Promise<number> {
    const { count } = await this.supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .not('judge_id', 'is', null)

    return count || 0
  }

  private async countCasesByOutcome(): Promise<{
    valid: number
    invalid: number
    distribution: Record<string, number>
  }> {
    const validOutcomes = [
      'settled',
      'dismissed',
      'judgment',
      'granted',
      'denied',
      'withdrawn',
      'remanded',
      'affirmed',
      'reversed',
      'vacated',
      'other',
    ]

    const { data } = await this.supabase.from('cases').select('outcome')

    let valid = 0
    let invalid = 0
    const distribution: Record<string, number> = {}

    data?.forEach((c) => {
      const outcome = (c.outcome || '').toLowerCase().trim()
      if (!outcome) return

      const isValid = validOutcomes.some((v) => outcome.includes(v))
      if (isValid) {
        valid++
      } else {
        invalid++
      }

      distribution[outcome] = (distribution[outcome] || 0) + 1
    })

    return { valid, invalid, distribution }
  }

  private async countRecentCases(): Promise<number> {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const { count } = await this.supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .gte('decision_date', oneYearAgo.toISOString())

    return count || 0
  }

  private async countStaleCases(): Promise<number> {
    const threeYearsAgo = new Date()
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

    const { count } = await this.supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .lt('decision_date', threeYearsAgo.toISOString())

    return count || 0
  }

  private async countAssignments(): Promise<number> {
    const { count } = await this.supabase
      .from('judge_court_assignments')
      .select('*', { count: 'exact', head: true })

    return count || 0
  }

  private async countActiveAssignments(): Promise<number> {
    const { count } = await this.supabase
      .from('judge_court_assignments')
      .select('*', { count: 'exact', head: true })
      .is('end_date', null)

    return count || 0
  }

  private async countAssignmentsByType(): Promise<Record<string, number>> {
    const { data } = await this.supabase
      .from('judge_court_assignments')
      .select('assignment_type')
      .is('end_date', null)

    const counts: Record<string, number> = {}
    data?.forEach((a) => {
      counts[a.assignment_type] = (counts[a.assignment_type] || 0) + 1
    })

    return counts
  }

  private async countOrphanedRecords(): Promise<number> {
    const { count: orphanedCases } = await this.supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .is('judge_id', null)

    return orphanedCases || 0
  }

  private async countDuplicateIdentifiers(): Promise<number> {
    // This is complex - would need to use RPC function
    // For now, return 0 as placeholder
    return 0
  }

  private async countMissingRequiredFields(): Promise<number> {
    const [missingJudgeNames, missingCaseNames, missingCourtNames] = await Promise.all([
      this.supabase
        .from('judges')
        .select('*', { count: 'exact', head: true })
        .or('name.is.null,name.eq.'),
      this.supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .or('case_name.is.null,case_name.eq.'),
      this.supabase
        .from('courts')
        .select('*', { count: 'exact', head: true })
        .or('name.is.null,name.eq.'),
    ])

    return (
      (missingJudgeNames.count || 0) +
      (missingCaseNames.count || 0) +
      (missingCourtNames.count || 0)
    )
  }

  private async countStandardizationIssues(): Promise<number> {
    // Check for names with title prefixes, all caps, etc.
    const { data } = await this.supabase.from('judges').select('name').not('name', 'is', null)

    let issues = 0
    data?.forEach((j) => {
      if (/^(Hon\.|Hon |Honorable |Judge |Justice )/i.test(j.name)) issues++
      else if (j.name === j.name.toUpperCase() && j.name.length > 3) issues++
      else if (j.name === j.name.toLowerCase()) issues++
    })

    return issues
  }

  private async countRelationshipInconsistencies(): Promise<number> {
    // Count judges with multiple primary assignments
    const { data } = await this.supabase
      .from('judge_court_assignments')
      .select('judge_id')
      .eq('assignment_type', 'primary')
      .is('end_date', null)

    if (!data) return 0

    const judgeCounts = new Map<string, number>()
    data.forEach((a) => {
      judgeCounts.set(a.judge_id, (judgeCounts.get(a.judge_id) || 0) + 1)
    })

    let issues = 0
    judgeCounts.forEach((count) => {
      if (count > 1) issues++
    })

    return issues
  }

  private async countOverlappingAssignments(): Promise<number> {
    // Complex query - would need RPC function
    // Placeholder for now
    return 0
  }

  private async countJurisdictionMismatches(): Promise<number> {
    const { data } = await this.supabase
      .from('judge_court_assignments')
      .select(
        `
        judges!inner(jurisdiction),
        courts!inner(jurisdiction)
      `
      )
      .limit(1000)

    if (!data) return 0

    let mismatches = 0
    data.forEach((a: any) => {
      const judgeJur = a.judges?.jurisdiction?.toLowerCase().trim()
      const courtJur = a.courts?.jurisdiction?.toLowerCase().trim()
      if (judgeJur && courtJur && judgeJur !== courtJur) {
        mismatches++
      }
    })

    return mismatches
  }

  /**
   * Calculate overall health score (0-100)
   * Higher is better
   */
  private calculateHealthScore(
    quality: QualityMetrics,
    judges: JudgeSnapshot,
    cases: CaseSnapshot,
    assignments: AssignmentSnapshot
  ): number {
    let score = 100

    // Deduct points for quality issues
    score -= quality.orphaned_records * 0.5
    score -= quality.duplicate_identifiers * 2
    score -= quality.missing_required_fields * 1
    score -= quality.standardization_issues * 0.2
    score -= quality.relationship_inconsistencies * 3
    score -= quality.temporal_overlaps * 2
    score -= quality.jurisdiction_mismatches * 1

    // Deduct for judges without primary court
    score -= judges.without_primary_court * 0.5

    // Deduct for orphaned cases
    score -= (cases.orphaned / Math.max(cases.total, 1)) * 10

    // Deduct for judges below threshold
    score -= (judges.below_threshold / Math.max(judges.total, 1)) * 5

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Save snapshot to database
   */
  async saveSnapshot(snapshot: DataSnapshot): Promise<void> {
    try {
      await this.supabase.from('data_snapshots').insert({
        snapshot_id: snapshot.snapshot_id,
        timestamp: snapshot.timestamp,
        duration_ms: snapshot.duration_ms,
        data: snapshot,
        health_score: snapshot.health_score,
      })

      logger.info('Snapshot saved to database', {
        snapshotId: snapshot.snapshot_id,
      })
    } catch (error) {
      logger.error('Failed to save snapshot', { error })
    }
  }
}
