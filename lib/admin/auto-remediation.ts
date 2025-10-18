/**
 * Auto-Remediation Engine
 *
 * Implements automated fixes for data quality issues.
 * Applies safe transformations with confidence scoring.
 *
 * Remediation Types:
 * - Date normalization to ISO 8601
 * - Judge name standardization
 * - Outcome taxonomy mapping
 * - Orphan cleanup (nullify invalid references)
 * - Assignment conflict resolution
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceRoleFactory } from '@/lib/supabase/service-role'
import { logger } from '@/lib/utils/logger'
import type { ValidationIssue } from '@/lib/sync/data-quality-validator'

export interface RemediationResult {
  issue_id: string
  success: boolean
  action_taken: string
  records_affected: number
  changes_made: Record<string, any>
  error?: string
  rollback_info?: RollbackInfo
}

export interface RollbackInfo {
  table: string
  record_id: string
  original_values: Record<string, any>
  timestamp: string
}

export interface RemediationSummary {
  total_issues: number
  attempted: number
  successful: number
  failed: number
  skipped: number
  duration_ms: number
  results: RemediationResult[]
}

/**
 * Auto-Remediation Engine
 * Applies automated fixes to data quality issues
 */
export class AutoRemediationEngine {
  private readonly supabase: SupabaseClient
  private readonly dryRun: boolean
  private results: RemediationResult[] = []

  constructor(supabase?: SupabaseClient, options?: { dryRun?: boolean }) {
    this.supabase = supabase ?? this.createSupabaseServiceRoleClient()
    this.dryRun = options?.dryRun ?? false
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
   * Execute remediation for all auto-fixable issues
   */
  async executeRemediation(issues: ValidationIssue[]): Promise<RemediationSummary> {
    const startTime = Date.now()
    this.results = []

    logger.info('Starting auto-remediation', {
      totalIssues: issues.length,
      dryRun: this.dryRun,
    })

    const autoFixableIssues = issues.filter((issue) => issue.autoFixable)

    logger.info(`Found ${autoFixableIssues.length} auto-fixable issues`)

    for (const issue of autoFixableIssues) {
      try {
        const result = await this.remediateIssue(issue)
        this.results.push(result)
      } catch (error) {
        logger.error('Remediation failed for issue', { issue, error })
        this.results.push({
          issue_id: issue.entityId,
          success: false,
          action_taken: 'error',
          records_affected: 0,
          changes_made: {},
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    const duration = Date.now() - startTime
    const successful = this.results.filter((r) => r.success).length
    const failed = this.results.filter((r) => !r.success).length

    const summary: RemediationSummary = {
      total_issues: issues.length,
      attempted: autoFixableIssues.length,
      successful,
      failed,
      skipped: issues.length - autoFixableIssues.length,
      duration_ms: duration,
      results: this.results,
    }

    logger.info('Auto-remediation completed', summary)

    return summary
  }

  /**
   * Remediate a single issue
   */
  private async remediateIssue(issue: ValidationIssue): Promise<RemediationResult> {
    logger.debug('Remediating issue', { issue })

    switch (issue.type) {
      case 'orphaned_record':
        return await this.fixOrphanedRecord(issue)

      case 'inconsistent_relationship':
        return await this.fixInconsistentRelationship(issue)

      case 'data_integrity':
        return await this.fixDataIntegrity(issue)

      case 'stale_data':
        return await this.fixStaleData(issue)

      default:
        return {
          issue_id: issue.entityId,
          success: false,
          action_taken: 'unsupported',
          records_affected: 0,
          changes_made: {},
          error: `No remediation handler for issue type: ${issue.type}`,
        }
    }
  }

  /**
   * Fix orphaned record by nullifying invalid references
   */
  private async fixOrphanedRecord(issue: ValidationIssue): Promise<RemediationResult> {
    if (this.dryRun) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'dry_run:nullify_reference',
        records_affected: 1,
        changes_made: { judge_id: null },
      }
    }

    if (issue.entity === 'case') {
      // Get original value for rollback
      const { data: originalCase } = await this.supabase
        .from('cases')
        .select('judge_id')
        .eq('id', issue.entityId)
        .single()

      const { error } = await this.supabase
        .from('cases')
        .update({ judge_id: null })
        .eq('id', issue.entityId)

      return {
        issue_id: issue.entityId,
        success: !error,
        action_taken: 'nullify_judge_reference',
        records_affected: error ? 0 : 1,
        changes_made: { judge_id: null },
        error: error?.message,
        rollback_info: originalCase
          ? {
              table: 'cases',
              record_id: issue.entityId,
              original_values: { judge_id: originalCase.judge_id },
              timestamp: new Date().toISOString(),
            }
          : undefined,
      }
    }

    if (issue.entity === 'assignment') {
      const { error } = await this.supabase
        .from('judge_court_assignments')
        .delete()
        .eq('id', issue.entityId)

      return {
        issue_id: issue.entityId,
        success: !error,
        action_taken: 'delete_orphaned_assignment',
        records_affected: error ? 0 : 1,
        changes_made: { deleted: true },
        error: error?.message,
      }
    }

    return {
      issue_id: issue.entityId,
      success: false,
      action_taken: 'unsupported_entity',
      records_affected: 0,
      changes_made: {},
      error: `Cannot fix orphaned record for entity: ${issue.entity}`,
    }
  }

  /**
   * Fix inconsistent relationship
   * Handles multiple primary courts and temporal overlaps
   */
  private async fixInconsistentRelationship(issue: ValidationIssue): Promise<RemediationResult> {
    // Multiple primary courts fix
    if (issue.metadata?.assignment_ids && Array.isArray(issue.metadata.assignment_ids)) {
      return await this.fixMultiplePrimaryCourts(issue)
    }

    // Temporal overlap fix
    if (issue.metadata?.assignment1_id && issue.metadata?.assignment2_id) {
      return await this.fixTemporalOverlap(issue)
    }

    return {
      issue_id: issue.entityId,
      success: false,
      action_taken: 'unknown_relationship_issue',
      records_affected: 0,
      changes_made: {},
      error: 'Could not determine relationship issue type',
    }
  }

  /**
   * Fix multiple primary courts
   * Keep most recent, convert others to visiting
   */
  private async fixMultiplePrimaryCourts(issue: ValidationIssue): Promise<RemediationResult> {
    const assignmentIds = issue.metadata?.assignment_ids as string[]

    if (this.dryRun) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'dry_run:convert_to_visiting',
        records_affected: assignmentIds.length - 1,
        changes_made: { assignment_type: 'visiting' },
      }
    }

    // Get all assignments to find most recent
    const { data: assignments } = await this.supabase
      .from('judge_court_assignments')
      .select('*')
      .in('id', assignmentIds)
      .order('start_date', { ascending: false })

    if (!assignments || assignments.length === 0) {
      return {
        issue_id: issue.entityId,
        success: false,
        action_taken: 'no_assignments_found',
        records_affected: 0,
        changes_made: {},
        error: 'Could not find assignments to fix',
      }
    }

    // Keep the most recent one as primary, convert others to visiting
    const [mostRecent, ...older] = assignments
    const olderIds = older.map((a) => a.id)

    if (olderIds.length === 0) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'no_action_needed',
        records_affected: 0,
        changes_made: {},
      }
    }

    const { error } = await this.supabase
      .from('judge_court_assignments')
      .update({ assignment_type: 'visiting' })
      .in('id', olderIds)

    return {
      issue_id: issue.entityId,
      success: !error,
      action_taken: 'convert_older_to_visiting',
      records_affected: error ? 0 : olderIds.length,
      changes_made: {
        kept_primary: mostRecent.id,
        converted_to_visiting: olderIds,
      },
      error: error?.message,
      rollback_info: {
        table: 'judge_court_assignments',
        record_id: olderIds.join(','),
        original_values: { assignment_type: 'primary' },
        timestamp: new Date().toISOString(),
      },
    }
  }

  /**
   * Fix temporal overlap
   * End the earlier assignment when the later one starts
   */
  private async fixTemporalOverlap(issue: ValidationIssue): Promise<RemediationResult> {
    const assignment1Id = issue.metadata?.assignment1_id as string
    const assignment2Id = issue.metadata?.assignment2_id as string
    const dates2 = issue.metadata?.assignment2_dates as { start: string; end: string | null }

    if (this.dryRun) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'dry_run:set_end_date',
        records_affected: 1,
        changes_made: { end_date: dates2.start },
      }
    }

    // Get original assignment for rollback
    const { data: original } = await this.supabase
      .from('judge_court_assignments')
      .select('end_date')
      .eq('id', assignment1Id)
      .single()

    // Set end_date of assignment1 to be the start_date of assignment2
    const { error } = await this.supabase
      .from('judge_court_assignments')
      .update({ end_date: dates2.start })
      .eq('id', assignment1Id)

    return {
      issue_id: issue.entityId,
      success: !error,
      action_taken: 'set_end_date_to_eliminate_overlap',
      records_affected: error ? 0 : 1,
      changes_made: {
        assignment_id: assignment1Id,
        end_date: dates2.start,
      },
      error: error?.message,
      rollback_info: original
        ? {
            table: 'judge_court_assignments',
            record_id: assignment1Id,
            original_values: { end_date: original.end_date },
            timestamp: new Date().toISOString(),
          }
        : undefined,
    }
  }

  /**
   * Fix data integrity issues
   * Handles name standardization and outcome taxonomy
   */
  private async fixDataIntegrity(issue: ValidationIssue): Promise<RemediationResult> {
    // Case count recalculation
    if (issue.message.includes('case count')) {
      return await this.recalculateCaseCount(issue)
    }

    // Name standardization
    if (issue.metadata?.current_name && issue.metadata?.issues) {
      return await this.standardizeName(issue)
    }

    // Outcome taxonomy mapping
    if (issue.metadata?.suggested_mapping) {
      return await this.mapOutcome(issue)
    }

    return {
      issue_id: issue.entityId,
      success: false,
      action_taken: 'unknown_integrity_issue',
      records_affected: 0,
      changes_made: {},
      error: 'Could not determine integrity issue type',
    }
  }

  /**
   * Recalculate case count for a judge
   */
  private async recalculateCaseCount(issue: ValidationIssue): Promise<RemediationResult> {
    if (this.dryRun) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'dry_run:recalculate_case_count',
        records_affected: 1,
        changes_made: { total_cases: 'recalculated' },
      }
    }

    // Count actual cases
    const { count } = await this.supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('judge_id', issue.entityId)

    const actualCount = count || 0

    // Get original for rollback
    const { data: original } = await this.supabase
      .from('judges')
      .select('total_cases')
      .eq('id', issue.entityId)
      .single()

    const { error } = await this.supabase
      .from('judges')
      .update({ total_cases: actualCount })
      .eq('id', issue.entityId)

    return {
      issue_id: issue.entityId,
      success: !error,
      action_taken: 'recalculate_case_count',
      records_affected: error ? 0 : 1,
      changes_made: { total_cases: actualCount },
      error: error?.message,
      rollback_info: original
        ? {
            table: 'judges',
            record_id: issue.entityId,
            original_values: { total_cases: original.total_cases },
            timestamp: new Date().toISOString(),
          }
        : undefined,
    }
  }

  /**
   * Standardize judge name
   */
  private async standardizeName(issue: ValidationIssue): Promise<RemediationResult> {
    let name = issue.metadata?.current_name as string
    const issues = issue.metadata?.issues as string[]

    // Apply standardization rules
    if (issues.includes('Contains title prefix (Hon., Judge, Justice)')) {
      name = name.replace(/^(Hon\.|Hon |Honorable |Judge |Justice )/i, '').trim()
    }

    if (issues.includes('Name is all uppercase')) {
      // Convert to title case
      name = name
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    if (issues.includes('Name is all lowercase')) {
      // Convert to title case
      name = name
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    }

    if (issues.includes('Contains excessive whitespace')) {
      name = name.replace(/\s{2,}/g, ' ').trim()
    }

    if (this.dryRun) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'dry_run:standardize_name',
        records_affected: 1,
        changes_made: { name },
      }
    }

    // Get original for rollback
    const { data: original } = await this.supabase
      .from('judges')
      .select('name')
      .eq('id', issue.entityId)
      .single()

    const { error } = await this.supabase.from('judges').update({ name }).eq('id', issue.entityId)

    return {
      issue_id: issue.entityId,
      success: !error,
      action_taken: 'standardize_name',
      records_affected: error ? 0 : 1,
      changes_made: { name },
      error: error?.message,
      rollback_info: original
        ? {
            table: 'judges',
            record_id: issue.entityId,
            original_values: { name: original.name },
            timestamp: new Date().toISOString(),
          }
        : undefined,
    }
  }

  /**
   * Map case outcome to standard taxonomy
   */
  private async mapOutcome(issue: ValidationIssue): Promise<RemediationResult> {
    const suggestedMapping = issue.metadata?.suggested_mapping as string

    if (this.dryRun) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'dry_run:map_outcome',
        records_affected: 1,
        changes_made: { outcome: suggestedMapping },
      }
    }

    // Get original for rollback
    const { data: original } = await this.supabase
      .from('cases')
      .select('outcome')
      .eq('id', issue.entityId)
      .single()

    const { error } = await this.supabase
      .from('cases')
      .update({ outcome: suggestedMapping })
      .eq('id', issue.entityId)

    return {
      issue_id: issue.entityId,
      success: !error,
      action_taken: 'map_outcome_to_taxonomy',
      records_affected: error ? 0 : 1,
      changes_made: { outcome: suggestedMapping },
      error: error?.message,
      rollback_info: original
        ? {
            table: 'cases',
            record_id: issue.entityId,
            original_values: { outcome: original.outcome },
            timestamp: new Date().toISOString(),
          }
        : undefined,
    }
  }

  /**
   * Fix stale data by queuing for resync
   */
  private async fixStaleData(issue: ValidationIssue): Promise<RemediationResult> {
    const entityType = issue.entity
    const courtlistenerId = issue.metadata?.courtlistenerId as string | undefined

    if (!courtlistenerId) {
      return {
        issue_id: issue.entityId,
        success: false,
        action_taken: 'missing_courtlistener_id',
        records_affected: 0,
        changes_made: {},
        error: 'No courtlistener_id available for resync',
      }
    }

    if (this.dryRun) {
      return {
        issue_id: issue.entityId,
        success: true,
        action_taken: 'dry_run:queue_resync',
        records_affected: 1,
        changes_made: { queued_for_sync: true },
      }
    }

    const { error } = await this.supabase.from('sync_queue').insert({
      entity_type: entityType,
      entity_id: courtlistenerId,
      operation: 'update',
      priority: 7,
      status: 'pending',
      payload: { reason: 'stale_data_auto_remediation' },
    })

    return {
      issue_id: issue.entityId,
      success: !error,
      action_taken: 'queue_for_resync',
      records_affected: error ? 0 : 1,
      changes_made: { sync_queued: true },
      error: error?.message,
    }
  }

  /**
   * Rollback a remediation action
   */
  async rollback(rollbackInfo: RollbackInfo): Promise<boolean> {
    logger.info('Rolling back remediation', rollbackInfo)

    try {
      const { error } = await this.supabase
        .from(rollbackInfo.table)
        .update(rollbackInfo.original_values)
        .eq('id', rollbackInfo.record_id)

      if (error) {
        logger.error('Rollback failed', { error, rollbackInfo })
        return false
      }

      logger.info('Rollback successful', rollbackInfo)
      return true
    } catch (error) {
      logger.error('Rollback exception', { error, rollbackInfo })
      return false
    }
  }
}
