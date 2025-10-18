/**
 * Data Quality Validation System for JudgeFinder Platform
 *
 * Performs comprehensive validation checks on judicial data after sync operations
 * Detects: orphaned records, duplicates, stale data, missing fields, relationship inconsistencies
 *
 * @module data-quality-validator
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import { SupabaseServiceRoleFactory } from '@/lib/supabase/service-role'

export type ValidationIssueType =
  | 'orphaned_record'
  | 'duplicate_identifier'
  | 'stale_data'
  | 'missing_field'
  | 'inconsistent_relationship'
  | 'data_integrity'

export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low'

export type ValidationEntity = 'judge' | 'court' | 'case' | 'assignment' | 'opinion' | 'docket'

export interface ValidationIssue {
  type: ValidationIssueType
  severity: ValidationSeverity
  entity: ValidationEntity
  entityId: string
  message: string
  suggestedAction: string
  autoFixable: boolean
  metadata?: Record<string, any>
}

export interface ValidationReport {
  validationId: string
  startTime: Date
  endTime: Date
  duration: number
  totalIssues: number
  criticalIssues: number
  highPriorityIssues: number
  mediumPriorityIssues: number
  lowPriorityIssues: number
  issuesByType: Record<ValidationIssueType, number>
  issuesByEntity: Record<ValidationEntity, number>
  issues: ValidationIssue[]
  summary: string
  recommendations: string[]
}

export interface FixResult {
  success: boolean
  issueId: string
  action: string
  message: string
  error?: string
}

export interface ValidationStats {
  totalRecords: {
    judges: number
    courts: number
    cases: number
    assignments: number
    opinions: number
    dockets: number
  }
  healthScore: number // 0-100
  lastValidation?: Date
}

/**
 * Data Quality Validator
 * Runs comprehensive validation checks and generates actionable reports
 */
export class DataQualityValidator {
  protected readonly supabase: SupabaseClient
  protected readonly validationId: string
  protected startTime: Date
  protected issues: ValidationIssue[] = []

  // Thresholds for stale data (in days)
  private readonly STALE_JUDGE_THRESHOLD = 180 // 6 months
  private readonly STALE_CASE_THRESHOLD = 730 // 2 years
  private readonly STALE_COURT_THRESHOLD = 365 // 1 year

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase ?? this.createSupabaseServiceRoleClient()
    const timestamp = new Date().getTime()
    this.validationId = 'validation-' + timestamp.toString()
    this.startTime = new Date()
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
   * Run full validation suite
   */
  async runFullValidation(): Promise<ValidationReport> {
    logger.info('Starting full data quality validation', { validationId: this.validationId })
    this.startTime = new Date()
    this.issues = []

    try {
      // Run all validation checks in parallel
      await Promise.all([
        this.findOrphanedCases(),
        this.findOrphanedAssignments(),
        this.findOrphanedOpinions(),
        this.findDuplicateCourtListenerIds(),
        this.findDuplicateCases(),
        this.findStaleRecords(),
        this.findInvalidRecords(),
        this.findInconsistentRelationships(),
        this.findMissingRequiredFields(),
        this.validateCaseCounts(),
      ])

      const report = await this.generateReport()
      await this.saveValidationReport(report)

      return report
    } catch (error) {
      logger.error('Validation failed', { error, validationId: this.validationId })
      throw error
    }
  }

  /**
   * Find cases with invalid judge references
   */
  private async findOrphanedCases(): Promise<void> {
    logger.info('Checking for orphaned cases')

    // Try to use the SQL function if available
    let orphanedResult
    try {
      orphanedResult = await this.supabase.rpc('find_orphaned_cases')
    } catch {
      orphanedResult = { data: null, error: null }
    }

    if (orphanedResult.data && orphanedResult.data.length > 0) {
      orphanedResult.data.forEach((record: any) => {
        this.issues.push({
          type: 'orphaned_record',
          severity: 'high',
          entity: 'case',
          entityId: record.id,
          message:
            'Case "' + record.case_name + '" references non-existent judge_id: ' + record.judge_id,
          suggestedAction: 'Set judge_id to NULL or find correct judge via courtlistener_id',
          autoFixable: true,
          metadata: { caseName: record.case_name, judgeId: record.judge_id },
        })
      })
    }

    // Cases with NULL judge_id (warning level)
    const { data: nullJudges } = await this.supabase
      .from('cases')
      .select('id, case_name, decision_date')
      .is('judge_id', null)
      .order('decision_date', { ascending: false })
      .limit(100)

    if (nullJudges && nullJudges.length > 0) {
      this.issues.push({
        type: 'missing_field',
        severity: 'medium',
        entity: 'case',
        entityId: 'bulk',
        message: nullJudges.length.toString() + ' cases have no assigned judge',
        suggestedAction: 'Review cases and assign judges based on court and case metadata',
        autoFixable: false,
        metadata: { count: nullJudges.length },
      })
    }
  }

  /**
   * Find court assignments with invalid references
   */
  private async findOrphanedAssignments(): Promise<void> {
    logger.info('Checking for orphaned court assignments')

    let result
    try {
      result = await this.supabase.rpc('find_orphaned_assignments')
    } catch {
      result = { data: null, error: null }
    }

    if (result.data && result.data.length > 0) {
      result.data.forEach((record: any) => {
        this.issues.push({
          type: 'orphaned_record',
          severity: 'critical',
          entity: 'assignment',
          entityId: record.id,
          message:
            'Assignment references non-existent ' +
            record.invalid_ref_type +
            ': ' +
            record.invalid_ref_id,
          suggestedAction: 'Delete assignment or fix reference',
          autoFixable: true,
          metadata: record,
        })
      })
    }
  }

  /**
   * Find opinions with invalid case references
   */
  private async findOrphanedOpinions(): Promise<void> {
    logger.info('Checking for orphaned opinions')

    const { data } = await this.supabase
      .from('opinions')
      .select('id, case_id, author_judge_id')
      .not('case_id', 'is', null)

    if (!data || data.length === 0) return

    // Verify case_id references exist
    const caseIds = [...new Set(data.map((o) => o.case_id))]
    const { data: validCases } = await this.supabase.from('cases').select('id').in('id', caseIds)

    const validCaseIds = new Set(validCases?.map((c) => c.id) ?? [])

    data.forEach((opinion) => {
      if (!validCaseIds.has(opinion.case_id)) {
        this.issues.push({
          type: 'orphaned_record',
          severity: 'high',
          entity: 'opinion',
          entityId: opinion.id,
          message: 'Opinion references non-existent case_id: ' + opinion.case_id,
          suggestedAction: 'Delete opinion or restore case',
          autoFixable: false,
          metadata: { opinionId: opinion.id, caseId: opinion.case_id },
        })
      }
    })
  }

  /**
   * Find duplicate CourtListener IDs
   */
  private async findDuplicateCourtListenerIds(): Promise<void> {
    logger.info('Checking for duplicate CourtListener IDs')

    let judgeResult
    try {
      judgeResult = await this.supabase.rpc('find_duplicate_courtlistener_ids', {
        entity_type: 'judge',
      })
    } catch {
      judgeResult = { data: null }
    }

    if (judgeResult.data && judgeResult.data.length > 0) {
      judgeResult.data.forEach((record: any) => {
        this.issues.push({
          type: 'duplicate_identifier',
          severity: 'critical',
          entity: 'judge',
          entityId: 'multiple',
          message:
            record.count.toString() + ' judges share courtlistener_id: ' + record.courtlistener_id,
          suggestedAction: 'Merge duplicate records or invalidate incorrect ones',
          autoFixable: false,
          metadata: { courtlistenerId: record.courtlistener_id, count: record.count },
        })
      })
    }

    let courtResult
    try {
      courtResult = await this.supabase.rpc('find_duplicate_courtlistener_ids', {
        entity_type: 'court',
      })
    } catch {
      courtResult = { data: null }
    }

    if (courtResult.data && courtResult.data.length > 0) {
      courtResult.data.forEach((record: any) => {
        this.issues.push({
          type: 'duplicate_identifier',
          severity: 'critical',
          entity: 'court',
          entityId: 'multiple',
          message:
            record.count.toString() + ' courts share courtlistener_id: ' + record.courtlistener_id,
          suggestedAction: 'Merge duplicate records or invalidate incorrect ones',
          autoFixable: false,
          metadata: { courtlistenerId: record.courtlistener_id, count: record.count },
        })
      })
    }
  }

  /**
   * Find duplicate cases (same docket_number)
   */
  private async findDuplicateCases(): Promise<void> {
    logger.info('Checking for duplicate cases')

    // Manual aggregation
    const { data: allCases } = await this.supabase
      .from('cases')
      .select('id, docket_number')
      .not('docket_number', 'is', null)
      .limit(10000)

    if (allCases && allCases.length > 0) {
      const docketCounts = new Map<string, number>()
      allCases.forEach((c) => {
        const count = docketCounts.get(c.docket_number) || 0
        docketCounts.set(c.docket_number, count + 1)
      })

      docketCounts.forEach((count, docketNumber) => {
        if (count > 1) {
          this.issues.push({
            type: 'duplicate_identifier',
            severity: 'medium',
            entity: 'case',
            entityId: 'multiple',
            message: count.toString() + ' cases share docket_number: ' + docketNumber,
            suggestedAction: 'Review and merge duplicate case records',
            autoFixable: false,
            metadata: { docketNumber, count },
          })
        }
      })
    }
  }

  /**
   * Find stale records that need updating
   */
  private async findStaleRecords(): Promise<void> {
    logger.info('Checking for stale records')

    // Stale judges
    let judgeResult
    try {
      judgeResult = await this.supabase.rpc('find_stale_judges', {
        days_threshold: this.STALE_JUDGE_THRESHOLD,
      })
    } catch {
      judgeResult = { data: null }
    }

    if (judgeResult.data && judgeResult.data.length > 0) {
      judgeResult.data.forEach((judge: any) => {
        this.issues.push({
          type: 'stale_data',
          severity: 'medium',
          entity: 'judge',
          entityId: judge.id,
          message: 'Judge "' + judge.name + '" not synced in ' + judge.days_since_sync + ' days',
          suggestedAction: 'Queue judge for resync from CourtListener',
          autoFixable: true,
          metadata: {
            judgeName: judge.name,
            daysSinceSync: judge.days_since_sync,
            courtlistenerId: judge.courtlistener_id,
          },
        })
      })
    }

    // Stale courts
    const staleDate = new Date()
    staleDate.setDate(staleDate.getDate() - this.STALE_COURT_THRESHOLD)

    const { data: staleCourts } = await this.supabase
      .from('courts')
      .select('id, name, updated_at')
      .lt('updated_at', staleDate.toISOString())
      .not('courtlistener_id', 'is', null)
      .limit(50)

    if (staleCourts && staleCourts.length > 0) {
      const monthsCount = Math.floor(this.STALE_COURT_THRESHOLD / 30)
      this.issues.push({
        type: 'stale_data',
        severity: 'low',
        entity: 'court',
        entityId: 'bulk',
        message:
          staleCourts.length.toString() + ' courts not updated in over ' + monthsCount + ' months',
        suggestedAction: 'Queue courts for resync',
        autoFixable: true,
        metadata: { count: staleCourts.length },
      })
    }
  }

  /**
   * Find records with missing required fields
   */
  private async findInvalidRecords(): Promise<void> {
    logger.info('Checking for invalid records')

    // Judges without name
    const { data: noName } = await this.supabase
      .from('judges')
      .select('id')
      .or('name.is.null,name.eq.')
      .limit(50)

    if (noName && noName.length > 0) {
      this.issues.push({
        type: 'missing_field',
        severity: 'critical',
        entity: 'judge',
        entityId: 'bulk',
        message: noName.length.toString() + ' judges missing name field',
        suggestedAction: 'Delete invalid records or fetch missing data',
        autoFixable: false,
        metadata: { count: noName.length },
      })
    }

    // Cases without case_name
    const { data: noCaseName } = await this.supabase
      .from('cases')
      .select('id')
      .or('case_name.is.null,case_name.eq.')
      .limit(50)

    if (noCaseName && noCaseName.length > 0) {
      this.issues.push({
        type: 'missing_field',
        severity: 'high',
        entity: 'case',
        entityId: 'bulk',
        message: noCaseName.length.toString() + ' cases missing case_name',
        suggestedAction: 'Fetch missing case names from CourtListener',
        autoFixable: true,
        metadata: { count: noCaseName.length },
      })
    }

    // Courts without name
    const { data: noCourtName } = await this.supabase
      .from('courts')
      .select('id')
      .or('name.is.null,name.eq.')
      .limit(50)

    if (noCourtName && noCourtName.length > 0) {
      this.issues.push({
        type: 'missing_field',
        severity: 'critical',
        entity: 'court',
        entityId: 'bulk',
        message: noCourtName.length.toString() + ' courts missing name',
        suggestedAction: 'Delete invalid records or fetch missing data',
        autoFixable: false,
        metadata: { count: noCourtName.length },
      })
    }
  }

  /**
   * Find missing required fields
   */
  private async findMissingRequiredFields(): Promise<void> {
    logger.info('Checking for missing required fields')

    // Judges without jurisdiction
    const { data: noJurisdiction } = await this.supabase
      .from('judges')
      .select('id, name')
      .is('jurisdiction', null)
      .not('courtlistener_id', 'is', null)
      .limit(20)

    if (noJurisdiction && noJurisdiction.length > 0) {
      this.issues.push({
        type: 'missing_field',
        severity: 'medium',
        entity: 'judge',
        entityId: 'bulk',
        message: noJurisdiction.length.toString() + ' judges missing jurisdiction',
        suggestedAction: 'Infer jurisdiction from court assignments',
        autoFixable: true,
        metadata: { count: noJurisdiction.length },
      })
    }

    // Cases without decision_date
    const { data: noDate } = await this.supabase
      .from('cases')
      .select('id, case_name')
      .is('decision_date', null)
      .limit(20)

    if (noDate && noDate.length > 0) {
      this.issues.push({
        type: 'missing_field',
        severity: 'medium',
        entity: 'case',
        entityId: 'bulk',
        message: noDate.length.toString() + ' cases missing decision_date',
        suggestedAction: 'Fetch missing dates from source',
        autoFixable: true,
        metadata: { count: noDate.length },
      })
    }
  }

  /**
   * Find relationship inconsistencies
   */
  private async findInconsistentRelationships(): Promise<void> {
    logger.info('Checking for relationship inconsistencies')

    let result
    try {
      result = await this.supabase.rpc('find_inconsistent_relationships')
    } catch {
      result = { data: null }
    }

    if (result.data && result.data.length > 0) {
      result.data.forEach((record: any) => {
        this.issues.push({
          type: 'inconsistent_relationship',
          severity: record.severity || 'medium',
          entity: record.entity,
          entityId: record.entity_id,
          message: record.message,
          suggestedAction: record.suggested_action,
          autoFixable: record.auto_fixable || false,
          metadata: record.metadata,
        })
      })
    }
  }

  /**
   * Validate case count consistency
   */
  private async validateCaseCounts(): Promise<void> {
    logger.info('Validating case counts')

    let result
    try {
      result = await this.supabase.rpc('validate_judge_case_counts')
    } catch {
      result = { data: null }
    }

    if (result.data && result.data.length > 0) {
      result.data.forEach((judge: any) => {
        const diff = Math.abs(judge.stored_count - judge.actual_count)
        if (diff > 5) {
          this.issues.push({
            type: 'data_integrity',
            severity: diff > 20 ? 'high' : 'medium',
            entity: 'judge',
            entityId: judge.judge_id,
            message:
              'Judge case count mismatch: stored=' +
              judge.stored_count +
              ', actual=' +
              judge.actual_count,
            suggestedAction: 'Recalculate total_cases from cases table',
            autoFixable: true,
            metadata: {
              judgeName: judge.judge_name,
              storedCount: judge.stored_count,
              actualCount: judge.actual_count,
            },
          })
        }
      })
    }
  }

  /**
   * Attempt to fix an issue automatically
   */
  async fixIssue(issue: ValidationIssue): Promise<FixResult> {
    if (!issue.autoFixable) {
      return {
        success: false,
        issueId: issue.entityId,
        action: 'none',
        message: 'Issue is not auto-fixable',
      }
    }

    try {
      switch (issue.type) {
        case 'orphaned_record':
          return await this.fixOrphanedRecord(issue)

        case 'stale_data':
          return await this.fixStaleRecord(issue)

        case 'data_integrity':
          return await this.fixDataIntegrity(issue)

        default:
          return {
            success: false,
            issueId: issue.entityId,
            action: 'unsupported',
            message: 'No auto-fix handler for this issue type',
          }
      }
    } catch (error: any) {
      return {
        success: false,
        issueId: issue.entityId,
        action: 'error',
        message: 'Fix failed',
        error: error.message,
      }
    }
  }

  /**
   * Fix orphaned record by nullifying invalid references
   */
  private async fixOrphanedRecord(issue: ValidationIssue): Promise<FixResult> {
    if (issue.entity === 'case' && issue.metadata?.judgeId) {
      const { error } = await this.supabase
        .from('cases')
        .update({ judge_id: null })
        .eq('id', issue.entityId)

      return {
        success: !error,
        issueId: issue.entityId,
        action: 'nullify_reference',
        message: error ? 'Failed: ' + error.message : 'Set judge_id to NULL',
        error: error?.message,
      }
    }

    if (issue.entity === 'assignment') {
      const { error } = await this.supabase
        .from('judge_court_assignments')
        .delete()
        .eq('id', issue.entityId)

      return {
        success: !error,
        issueId: issue.entityId,
        action: 'delete_record',
        message: error ? 'Failed: ' + error.message : 'Deleted orphaned assignment',
        error: error?.message,
      }
    }

    return {
      success: false,
      issueId: issue.entityId,
      action: 'unsupported_entity',
      message: 'No fix handler for this entity type',
    }
  }

  /**
   * Fix stale record by queuing for resync
   */
  private async fixStaleRecord(issue: ValidationIssue): Promise<FixResult> {
    const entityType = issue.entity
    const entityId = issue.metadata?.courtlistenerId

    if (!entityId) {
      return {
        success: false,
        issueId: issue.entityId,
        action: 'missing_data',
        message: 'No courtlistener_id available for resync',
      }
    }

    const { error } = await this.supabase.from('sync_queue').insert({
      entity_type: entityType,
      entity_id: entityId,
      operation: 'update',
      priority: 7,
      status: 'pending',
      payload: { reason: 'stale_data_validation' },
    })

    return {
      success: !error,
      issueId: issue.entityId,
      action: 'queue_resync',
      message: error ? 'Failed: ' + error.message : 'Queued for resync',
      error: error?.message,
    }
  }

  /**
   * Fix data integrity issue
   */
  private async fixDataIntegrity(issue: ValidationIssue): Promise<FixResult> {
    if (issue.entity === 'judge' && issue.message.includes('case count')) {
      let result
      try {
        result = await this.supabase.rpc('recalculate_judge_case_count', {
          judge_id: issue.entityId,
        })
      } catch {
        result = { data: null, error: { message: 'Function not available' } }
      }

      return {
        success: !result.error,
        issueId: issue.entityId,
        action: 'recalculate',
        message: result.error
          ? 'Failed: ' + result.error.message
          : 'Updated case count to ' + result.data,
        error: result.error?.message,
      }
    }

    return {
      success: false,
      issueId: issue.entityId,
      action: 'unsupported',
      message: 'No fix handler for this integrity issue',
    }
  }

  /**
   * Generate comprehensive validation report
   */
  async generateReport(): Promise<ValidationReport> {
    const endTime = new Date()
    const duration = endTime.getTime() - this.startTime.getTime()

    const issuesByType: Record<ValidationIssueType, number> = {
      orphaned_record: 0,
      duplicate_identifier: 0,
      stale_data: 0,
      missing_field: 0,
      inconsistent_relationship: 0,
      data_integrity: 0,
    }

    const issuesByEntity: Record<ValidationEntity, number> = {
      judge: 0,
      court: 0,
      case: 0,
      assignment: 0,
      opinion: 0,
      docket: 0,
    }

    let criticalIssues = 0
    let highPriorityIssues = 0
    let mediumPriorityIssues = 0
    let lowPriorityIssues = 0

    this.issues.forEach((issue) => {
      issuesByType[issue.type]++
      issuesByEntity[issue.entity]++

      switch (issue.severity) {
        case 'critical':
          criticalIssues++
          break
        case 'high':
          highPriorityIssues++
          break
        case 'medium':
          mediumPriorityIssues++
          break
        case 'low':
          lowPriorityIssues++
          break
      }
    })

    const summary = this.generateSummary(
      criticalIssues,
      highPriorityIssues,
      mediumPriorityIssues,
      lowPriorityIssues
    )
    const recommendations = this.generateRecommendations()

    return {
      validationId: this.validationId,
      startTime: this.startTime,
      endTime,
      duration,
      totalIssues: this.issues.length,
      criticalIssues,
      highPriorityIssues,
      mediumPriorityIssues,
      lowPriorityIssues,
      issuesByType,
      issuesByEntity,
      issues: this.issues,
      summary,
      recommendations,
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(critical: number, high: number, medium: number, low: number): string {
    if (critical > 0) {
      return (
        'CRITICAL: Found ' +
        critical +
        ' critical issues requiring immediate attention. Database integrity may be compromised.'
      )
    }
    if (high > 0) {
      return 'HIGH PRIORITY: Found ' + high + ' high-priority issues that should be addressed soon.'
    }
    if (medium > 0) {
      return (
        'MODERATE: Found ' +
        medium +
        ' medium-priority issues. Consider addressing during maintenance.'
      )
    }
    if (low > 0) {
      return (
        'LOW PRIORITY: Found ' + low + ' low-priority issues. Can be addressed as time permits.'
      )
    }
    return 'HEALTHY: No data quality issues detected. Database is in good condition.'
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(): string[] {
    const recs: string[] = []

    const criticalCount = this.issues.filter((i) => i.severity === 'critical').length
    const orphanedCount = this.issues.filter((i) => i.type === 'orphaned_record').length
    const duplicateCount = this.issues.filter((i) => i.type === 'duplicate_identifier').length
    const staleCount = this.issues.filter((i) => i.type === 'stale_data').length
    const autoFixableCount = this.issues.filter((i) => i.autoFixable).length

    if (criticalCount > 0) {
      recs.push(
        'Address ' + criticalCount + ' critical issues immediately to restore data integrity'
      )
    }

    if (orphanedCount > 0) {
      recs.push('Clean up ' + orphanedCount + ' orphaned records to prevent query failures')
    }

    if (duplicateCount > 0) {
      recs.push('Resolve ' + duplicateCount + ' duplicate identifiers to ensure data uniqueness')
    }

    if (staleCount > 5) {
      recs.push('Queue ' + staleCount + ' stale records for resync to keep data current')
    }

    if (autoFixableCount > 0) {
      recs.push(autoFixableCount + ' issues can be auto-fixed. Run fix operations to resolve.')
    }

    if (this.issues.length === 0) {
      recs.push('Continue regular validation schedule to maintain data quality')
      recs.push('Consider increasing sync frequency for active judges')
    }

    return recs
  }

  /**
   * Save validation report to database
   */
  private async saveValidationReport(report: ValidationReport): Promise<void> {
    try {
      await this.supabase.from('sync_validation_results').insert({
        validation_id: report.validationId,
        started_at: report.startTime.toISOString(),
        completed_at: report.endTime.toISOString(),
        duration_ms: report.duration,
        total_issues: report.totalIssues,
        critical_issues: report.criticalIssues,
        high_priority_issues: report.highPriorityIssues,
        medium_priority_issues: report.mediumPriorityIssues,
        low_priority_issues: report.lowPriorityIssues,
        issues_by_type: report.issuesByType,
        issues_by_entity: report.issuesByEntity,
        summary: report.summary,
        recommendations: report.recommendations,
        issues: report.issues,
      })

      logger.info('Validation report saved', {
        validationId: report.validationId,
        totalIssues: report.totalIssues,
      })
    } catch (error) {
      logger.error('Failed to save validation report', { error })
    }
  }

  /**
   * Get validation statistics
   */
  async getValidationStats(): Promise<ValidationStats> {
    const [judges, courts, cases, assignments, opinions, dockets] = await Promise.all([
      this.supabase.from('judges').select('id', { count: 'exact', head: true }),
      this.supabase.from('courts').select('id', { count: 'exact', head: true }),
      this.supabase.from('cases').select('id', { count: 'exact', head: true }),
      this.supabase.from('judge_court_assignments').select('id', { count: 'exact', head: true }),
      this.supabase.from('opinions').select('id', { count: 'exact', head: true }),
      this.supabase.from('dockets').select('id', { count: 'exact', head: true }),
    ])

    const { data: lastValidation } = await this.supabase
      .from('sync_validation_results')
      .select('completed_at, total_issues')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    // Calculate health score (0-100)
    let healthScore = 100
    if (lastValidation) {
      healthScore = Math.max(0, 100 - lastValidation.total_issues * 2)
    }

    return {
      totalRecords: {
        judges: judges.count ?? 0,
        courts: courts.count ?? 0,
        cases: cases.count ?? 0,
        assignments: assignments.count ?? 0,
        opinions: opinions.count ?? 0,
        dockets: dockets.count ?? 0,
      },
      healthScore,
      lastValidation: lastValidation ? new Date(lastValidation.completed_at) : undefined,
    }
  }

  /**
   * Generate formatted text report
   */
  async generateTextReport(report: ValidationReport): Promise<string> {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('        DATA QUALITY VALIDATION REPORT')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push('Validation ID: ' + report.validationId)
    lines.push('Completed: ' + report.endTime.toISOString())
    lines.push('Duration: ' + (report.duration / 1000).toFixed(2) + 's')
    lines.push('')
    lines.push('───────────────────────────────────────────────────────────────')
    lines.push('SUMMARY')
    lines.push('───────────────────────────────────────────────────────────────')
    lines.push(report.summary)
    lines.push('')
    lines.push('Total Issues: ' + report.totalIssues)
    lines.push('  Critical:   ' + report.criticalIssues)
    lines.push('  High:       ' + report.highPriorityIssues)
    lines.push('  Medium:     ' + report.mediumPriorityIssues)
    lines.push('  Low:        ' + report.lowPriorityIssues)
    lines.push('')

    if (report.recommendations.length > 0) {
      lines.push('───────────────────────────────────────────────────────────────')
      lines.push('RECOMMENDATIONS')
      lines.push('───────────────────────────────────────────────────────────────')
      report.recommendations.forEach((rec, i) => {
        lines.push(i + 1 + '. ' + rec)
      })
      lines.push('')
    }

    if (report.criticalIssues > 0) {
      const critical = report.issues.filter((i) => i.severity === 'critical')
      lines.push('───────────────────────────────────────────────────────────────')
      lines.push('CRITICAL ISSUES')
      lines.push('───────────────────────────────────────────────────────────────')
      critical.forEach((issue, i) => {
        lines.push(i + 1 + '. [' + issue.entity.toUpperCase() + '] ' + issue.message)
        lines.push('   Action: ' + issue.suggestedAction)
        lines.push('   Auto-fixable: ' + (issue.autoFixable ? 'Yes' : 'No'))
        lines.push('')
      })
    }

    lines.push('═══════════════════════════════════════════════════════════════')

    return lines.join('\n')
  }
}

/**
 * Run quick validation check (subset of full validation)
 */
export async function runQuickValidation(supabase?: SupabaseClient): Promise<ValidationReport> {
  const validator = new DataQualityValidator(supabase)

  // Run only critical checks
  await Promise.all([
    validator['findOrphanedCases'](),
    validator['findDuplicateCourtListenerIds'](),
    validator['findInvalidRecords'](),
  ])

  return validator.generateReport()
}

/**
 * Fix all auto-fixable issues in a report
 */
export async function autoFixIssues(
  report: ValidationReport,
  supabase?: SupabaseClient
): Promise<FixResult[]> {
  const validator = new DataQualityValidator(supabase)
  const fixableIssues = report.issues.filter((i) => i.autoFixable)

  logger.info('Auto-fixing issues', { count: fixableIssues.length })

  const results = await Promise.all(fixableIssues.map((issue) => validator.fixIssue(issue)))

  return results
}
