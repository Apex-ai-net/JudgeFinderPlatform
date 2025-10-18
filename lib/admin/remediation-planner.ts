/**
 * Remediation Planner
 *
 * Analyzes validation issues and generates prioritized remediation plans.
 * Provides confidence scores, impact analysis, and risk assessment.
 */

import type { ValidationIssue, ValidationReport } from '../sync/data-quality-validator'
import { logger } from '@/lib/utils/logger'

export interface RemediationPlan {
  plan_id: string
  created_at: string
  summary: RemediationSummary
  actions: RemediationAction[]
  execution_order: string[] // Action IDs in recommended order
  estimated_duration_ms: number
  risk_assessment: RiskAssessment
}

export interface RemediationSummary {
  total_issues: number
  critical: number
  high: number
  medium: number
  low: number
  auto_fixable: number
  requires_review: number
  estimated_records_affected: number
}

export interface RemediationAction {
  action_id: string
  issue_type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  entity: string
  entity_id: string
  description: string
  action_type: 'update' | 'delete' | 'create' | 'nullify' | 'recalculate' | 'queue_sync'
  target_table: string
  target_record_id: string
  changes: Record<string, any>
  confidence_score: number // 0-100
  risk_level: 'low' | 'medium' | 'high'
  impact_analysis: ImpactAnalysis
  requires_manual_review: boolean
  estimated_duration_ms: number
  dependencies: string[] // Other action IDs that must complete first
  rollback_supported: boolean
}

export interface ImpactAnalysis {
  records_affected: number
  tables_affected: string[]
  downstream_effects: string[]
  reversibility: 'fully_reversible' | 'partially_reversible' | 'irreversible'
  data_loss_risk: 'none' | 'low' | 'medium' | 'high'
}

export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high'
  high_risk_actions: number
  irreversible_actions: number
  data_loss_potential: boolean
  recommended_backup: boolean
  warnings: string[]
}

/**
 * Remediation Planner
 * Generates prioritized remediation plans from validation issues
 */
export class RemediationPlanner {
  /**
   * Generate comprehensive remediation plan
   */
  generatePlan(validationReport: ValidationReport): RemediationPlan {
    const planId = `REM-${Date.now()}`
    const timestamp = new Date().toISOString()

    logger.info('Generating remediation plan', {
      planId,
      totalIssues: validationReport.totalIssues,
    })

    // Convert issues to remediation actions
    const actions = this.createRemediationActions(validationReport.issues)

    // Determine execution order based on dependencies and priority
    const executionOrder = this.determineExecutionOrder(actions)

    // Calculate estimated duration
    const estimatedDuration = actions.reduce((sum, a) => sum + a.estimated_duration_ms, 0)

    // Assess risks
    const riskAssessment = this.assessRisks(actions)

    // Create summary
    const summary = this.createSummary(validationReport, actions)

    const plan: RemediationPlan = {
      plan_id: planId,
      created_at: timestamp,
      summary,
      actions,
      execution_order: executionOrder,
      estimated_duration_ms: estimatedDuration,
      risk_assessment: riskAssessment,
    }

    logger.info('Remediation plan generated', {
      planId,
      totalActions: actions.length,
      estimatedDuration,
      overallRisk: riskAssessment.overall_risk,
    })

    return plan
  }

  /**
   * Create remediation actions from validation issues
   */
  private createRemediationActions(issues: ValidationIssue[]): RemediationAction[] {
    const actions: RemediationAction[] = []

    for (const issue of issues) {
      const action = this.createActionForIssue(issue)
      if (action) {
        actions.push(action)
      }
    }

    return actions
  }

  /**
   * Create a remediation action for a single issue
   */
  private createActionForIssue(issue: ValidationIssue): RemediationAction | null {
    const actionId = `ACT-${issue.entityId}-${issue.type}`

    // Determine action type
    let actionType: RemediationAction['action_type'] = 'update'
    let targetTable = ''
    let changes: Record<string, any> = {}
    let confidenceScore = issue.metadata?.fix_confidence || 0
    let requiresReview = !issue.autoFixable

    switch (issue.type) {
      case 'orphaned_record':
        if (issue.entity === 'case') {
          actionType = 'nullify'
          targetTable = 'cases'
          changes = { judge_id: null }
          confidenceScore = 95
        } else if (issue.entity === 'assignment') {
          actionType = 'delete'
          targetTable = 'judge_court_assignments'
          changes = { deleted: true }
          confidenceScore = 90
        }
        break

      case 'inconsistent_relationship':
        if (issue.metadata?.assignment_ids) {
          // Multiple primary courts
          actionType = 'update'
          targetTable = 'judge_court_assignments'
          changes = { assignment_type: 'visiting' }
          confidenceScore = 90
        } else if (issue.metadata?.assignment1_id) {
          // Temporal overlap
          actionType = 'update'
          targetTable = 'judge_court_assignments'
          changes = { end_date: issue.metadata.assignment2_dates?.start }
          confidenceScore = 85
        }
        break

      case 'data_integrity':
        if (issue.message.includes('case count')) {
          actionType = 'recalculate'
          targetTable = 'judges'
          changes = { total_cases: 'recalculated' }
          confidenceScore = 98
        } else if (issue.metadata?.current_name) {
          actionType = 'update'
          targetTable = 'judges'
          changes = { name: 'standardized' }
          confidenceScore = 75
        } else if (issue.metadata?.suggested_mapping) {
          actionType = 'update'
          targetTable = 'cases'
          changes = { outcome: issue.metadata.suggested_mapping }
          confidenceScore = 80
        }
        break

      case 'stale_data':
        actionType = 'queue_sync'
        targetTable = 'sync_queue'
        changes = { queued: true }
        confidenceScore = 100
        break

      default:
        return null
    }

    // Calculate impact
    const impactAnalysis = this.analyzeImpact(issue, actionType, targetTable)

    // Determine risk level
    const riskLevel = this.determineRiskLevel(confidenceScore, actionType, impactAnalysis)

    // Estimate duration
    const estimatedDuration = this.estimateDuration(actionType, impactAnalysis)

    return {
      action_id: actionId,
      issue_type: issue.type,
      severity: issue.severity,
      entity: issue.entity,
      entity_id: issue.entityId,
      description: issue.message,
      action_type: actionType,
      target_table: targetTable,
      target_record_id: issue.entityId,
      changes,
      confidence_score: confidenceScore,
      risk_level: riskLevel,
      impact_analysis: impactAnalysis,
      requires_manual_review: requiresReview,
      estimated_duration_ms: estimatedDuration,
      dependencies: this.findDependencies(issue),
      rollback_supported: actionType !== 'delete',
    }
  }

  /**
   * Analyze impact of a remediation action
   */
  private analyzeImpact(
    issue: ValidationIssue,
    actionType: RemediationAction['action_type'],
    targetTable: string
  ): ImpactAnalysis {
    const recordsAffected = issue.metadata?.impacted_records?.length || 1
    const tablesAffected = [targetTable]

    // Determine downstream effects
    const downstreamEffects: string[] = []
    if (targetTable === 'judges' && issue.type === 'data_integrity') {
      downstreamEffects.push('May affect analytics calculations')
      downstreamEffects.push('May affect search results')
    }
    if (targetTable === 'cases' && actionType === 'nullify') {
      downstreamEffects.push('Case will become orphaned')
      downstreamEffects.push('May need reassignment later')
    }
    if (targetTable === 'judge_court_assignments') {
      downstreamEffects.push('May affect case distribution')
      downstreamEffects.push('May affect court statistics')
    }

    // Determine reversibility
    let reversibility: ImpactAnalysis['reversibility'] = 'fully_reversible'
    if (actionType === 'delete') {
      reversibility = 'irreversible'
    } else if (actionType === 'recalculate') {
      reversibility = 'partially_reversible'
    }

    // Determine data loss risk
    let dataLossRisk: ImpactAnalysis['data_loss_risk'] = 'none'
    if (actionType === 'delete') {
      dataLossRisk = 'high'
    } else if (actionType === 'nullify') {
      dataLossRisk = 'low'
    }

    return {
      records_affected: recordsAffected,
      tables_affected: tablesAffected,
      downstream_effects: downstreamEffects,
      reversibility,
      data_loss_risk: dataLossRisk,
    }
  }

  /**
   * Determine risk level for an action
   */
  private determineRiskLevel(
    confidenceScore: number,
    actionType: RemediationAction['action_type'],
    impact: ImpactAnalysis
  ): 'low' | 'medium' | 'high' {
    // High risk if low confidence
    if (confidenceScore < 70) return 'high'

    // High risk if irreversible or high data loss
    if (impact.reversibility === 'irreversible' || impact.data_loss_risk === 'high') {
      return 'high'
    }

    // High risk if delete action
    if (actionType === 'delete') return 'high'

    // Medium risk if partially reversible
    if (impact.reversibility === 'partially_reversible') return 'medium'

    // Medium risk if affects multiple records
    if (impact.records_affected > 5) return 'medium'

    // Otherwise low risk
    return 'low'
  }

  /**
   * Estimate duration for an action
   */
  private estimateDuration(
    actionType: RemediationAction['action_type'],
    impact: ImpactAnalysis
  ): number {
    const baseTime = {
      update: 50,
      delete: 30,
      create: 60,
      nullify: 40,
      recalculate: 100,
      queue_sync: 20,
    }

    const base = baseTime[actionType] || 50
    const multiplier = Math.max(1, impact.records_affected)

    return base * multiplier
  }

  /**
   * Find dependencies between actions
   */
  private findDependencies(issue: ValidationIssue): string[] {
    // Currently no cross-action dependencies
    // In the future, could enforce ordering like:
    // - Fix orphans before fixing relationships
    // - Standardize names before deduplication
    return []
  }

  /**
   * Determine execution order for actions
   */
  private determineExecutionOrder(actions: RemediationAction[]): string[] {
    // Sort by priority:
    // 1. Critical severity first
    // 2. High confidence score
    // 3. Low risk
    // 4. Fewer dependencies

    const sorted = [...actions].sort((a, b) => {
      // Severity priority
      const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 }
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff

      // Confidence score (higher is better)
      const confidenceDiff = b.confidence_score - a.confidence_score
      if (confidenceDiff !== 0) return confidenceDiff

      // Risk level (lower is better)
      const riskOrder = { low: 1, medium: 2, high: 3 }
      const riskDiff = riskOrder[a.risk_level] - riskOrder[b.risk_level]
      if (riskDiff !== 0) return riskDiff

      // Dependencies (fewer is better)
      return a.dependencies.length - b.dependencies.length
    })

    return sorted.map((a) => a.action_id)
  }

  /**
   * Assess overall risks
   */
  private assessRisks(actions: RemediationAction[]): RiskAssessment {
    const highRiskActions = actions.filter((a) => a.risk_level === 'high').length
    const irreversibleActions = actions.filter(
      (a) => a.impact_analysis.reversibility === 'irreversible'
    ).length
    const dataLossPotential = actions.some((a) => a.impact_analysis.data_loss_risk === 'high')

    // Determine overall risk
    let overallRisk: 'low' | 'medium' | 'high' = 'low'
    if (highRiskActions > 5 || irreversibleActions > 3) {
      overallRisk = 'high'
    } else if (highRiskActions > 0 || irreversibleActions > 0) {
      overallRisk = 'medium'
    }

    // Generate warnings
    const warnings: string[] = []
    if (highRiskActions > 0) {
      warnings.push(
        `${highRiskActions} high-risk action${highRiskActions > 1 ? 's' : ''} identified`
      )
    }
    if (irreversibleActions > 0) {
      warnings.push(
        `${irreversibleActions} irreversible action${irreversibleActions > 1 ? 's' : ''} (deletions)`
      )
    }
    if (dataLossPotential) {
      warnings.push('Some actions have potential for data loss')
    }

    const recommendBackup = overallRisk === 'high' || irreversibleActions > 0 || dataLossPotential

    if (recommendBackup) {
      warnings.push('⚠️  Database backup strongly recommended before execution')
    }

    return {
      overall_risk: overallRisk,
      high_risk_actions: highRiskActions,
      irreversible_actions: irreversibleActions,
      data_loss_potential: dataLossPotential,
      recommended_backup: recommendBackup,
      warnings,
    }
  }

  /**
   * Create summary from validation report and actions
   */
  private createSummary(
    report: ValidationReport,
    actions: RemediationAction[]
  ): RemediationSummary {
    const autoFixable = actions.filter((a) => !a.requires_manual_review).length
    const requiresReview = actions.filter((a) => a.requires_manual_review).length
    const estimatedRecordsAffected = actions.reduce(
      (sum, a) => sum + a.impact_analysis.records_affected,
      0
    )

    return {
      total_issues: report.totalIssues,
      critical: report.criticalIssues,
      high: report.highPriorityIssues,
      medium: report.mediumPriorityIssues,
      low: report.lowPriorityIssues,
      auto_fixable: autoFixable,
      requires_review: requiresReview,
      estimated_records_affected: estimatedRecordsAffected,
    }
  }

  /**
   * Generate human-readable report
   */
  generateTextReport(plan: RemediationPlan): string {
    const lines: string[] = []

    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('              REMEDIATION PLAN')
    lines.push('═══════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push(`Plan ID: ${plan.plan_id}`)
    lines.push(`Created: ${plan.created_at}`)
    lines.push(`Estimated Duration: ${(plan.estimated_duration_ms / 1000).toFixed(2)}s`)
    lines.push('')
    lines.push('───────────────────────────────────────────────────────────────')
    lines.push('SUMMARY')
    lines.push('───────────────────────────────────────────────────────────────')
    lines.push(`Total Issues: ${plan.summary.total_issues}`)
    lines.push(`  Critical:   ${plan.summary.critical}`)
    lines.push(`  High:       ${plan.summary.high}`)
    lines.push(`  Medium:     ${plan.summary.medium}`)
    lines.push(`  Low:        ${plan.summary.low}`)
    lines.push('')
    lines.push(`Auto-fixable:      ${plan.summary.auto_fixable}`)
    lines.push(`Requires Review:   ${plan.summary.requires_review}`)
    lines.push(`Records Affected:  ${plan.summary.estimated_records_affected}`)
    lines.push('')
    lines.push('───────────────────────────────────────────────────────────────')
    lines.push('RISK ASSESSMENT')
    lines.push('───────────────────────────────────────────────────────────────')
    lines.push(`Overall Risk: ${plan.risk_assessment.overall_risk.toUpperCase()}`)
    lines.push(`High-risk Actions: ${plan.risk_assessment.high_risk_actions}`)
    lines.push(`Irreversible Actions: ${plan.risk_assessment.irreversible_actions}`)
    lines.push(`Backup Recommended: ${plan.risk_assessment.recommended_backup ? 'YES' : 'No'}`)
    lines.push('')

    if (plan.risk_assessment.warnings.length > 0) {
      lines.push('Warnings:')
      plan.risk_assessment.warnings.forEach((w) => {
        lines.push(`  • ${w}`)
      })
      lines.push('')
    }

    if (plan.actions.length > 0) {
      lines.push('───────────────────────────────────────────────────────────────')
      lines.push('TOP 10 PRIORITY ACTIONS')
      lines.push('───────────────────────────────────────────────────────────────')

      const topActions = plan.execution_order
        .slice(0, 10)
        .map((id) => plan.actions.find((a) => a.action_id === id)!)

      topActions.forEach((action, i) => {
        lines.push(`${i + 1}. [${action.severity.toUpperCase()}] ${action.description}`)
        lines.push(`   Action: ${action.action_type} on ${action.target_table}`)
        lines.push(`   Confidence: ${action.confidence_score}% | Risk: ${action.risk_level}`)
        lines.push(
          `   Affects: ${action.impact_analysis.records_affected} record${action.impact_analysis.records_affected > 1 ? 's' : ''} | Rollback: ${action.rollback_supported ? 'Yes' : 'No'}`
        )
        if (action.requires_manual_review) {
          lines.push('   ⚠️  Requires manual review before execution')
        }
        lines.push('')
      })
    }

    lines.push('═══════════════════════════════════════════════════════════════')

    return lines.join('\n')
  }
}
