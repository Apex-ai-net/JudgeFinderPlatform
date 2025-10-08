/**
 * Data Integrity Monitoring System
 *
 * Runs scheduled integrity checks and sends alerts on anomalies:
 * - Orphaned record detection
 * - Case count drift monitoring
 * - Missing required fields tracking
 * - Relationship consistency validation
 *
 * Designed to run as a daily cron job or scheduled task.
 */

import { createClient } from '@supabase/supabase-js'

export interface IntegrityAnomaly {
  type: 'orphaned_records' | 'case_count_drift' | 'missing_fields' | 'relationship_inconsistency'
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  count: number
  threshold: number
  details?: any
}

export interface IntegrityCheckResult {
  timestamp: string
  checks_performed: number
  anomalies: IntegrityAnomaly[]
  health_score: number
  requires_action: boolean
}

export class DataIntegrityMonitor {
  private supabase: any
  private thresholds = {
    orphaned_cases_max: 10,
    orphaned_assignments_max: 5,
    case_count_drift_percent: 5,
    missing_slugs_max: 10,
    stale_data_days: 180
  }

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async runIntegrityCheck(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      timestamp: new Date().toISOString(),
      checks_performed: 0,
      anomalies: [],
      health_score: 100,
      requires_action: false
    }

    // Run all checks
    await this.checkOrphanedRecords(result)
    await this.checkCaseCountDrift(result)
    await this.checkMissingFields(result)
    await this.checkRelationshipConsistency(result)
    await this.checkStaleData(result)

    // Calculate health score
    result.health_score = this.calculateHealthScore(result.anomalies)
    result.requires_action = result.anomalies.some(a => a.severity === 'critical' || a.severity === 'high')

    return result
  }

  private async checkOrphanedRecords(result: IntegrityCheckResult) {
    result.checks_performed++

    try {
      // Check orphaned cases
      const { data: orphanedCases, error: casesError } = await this.supabase.rpc('find_orphaned_cases')

      if (!casesError && orphanedCases) {
        const count = orphanedCases.length
        if (count > this.thresholds.orphaned_cases_max) {
          result.anomalies.push({
            type: 'orphaned_records',
            severity: count > 50 ? 'critical' : 'high',
            description: `${count} orphaned cases detected (threshold: ${this.thresholds.orphaned_cases_max})`,
            count,
            threshold: this.thresholds.orphaned_cases_max,
            details: orphanedCases.slice(0, 10)
          })
        }
      }

      // Check orphaned assignments
      const { data: orphanedAssignments, error: assignmentsError } = await this.supabase.rpc('find_orphaned_assignments')

      if (!assignmentsError && orphanedAssignments) {
        const count = orphanedAssignments.length
        if (count > this.thresholds.orphaned_assignments_max) {
          result.anomalies.push({
            type: 'orphaned_records',
            severity: count > 20 ? 'high' : 'medium',
            description: `${count} orphaned court assignments detected (threshold: ${this.thresholds.orphaned_assignments_max})`,
            count,
            threshold: this.thresholds.orphaned_assignments_max,
            details: orphanedAssignments.slice(0, 10)
          })
        }
      }
    } catch (error: any) {
      console.error('Error checking orphaned records:', error.message)
    }
  }

  private async checkCaseCountDrift(result: IntegrityCheckResult) {
    result.checks_performed++

    try {
      const { data: incorrectCounts, error } = await this.supabase.rpc('validate_judge_case_counts')

      if (!error && incorrectCounts) {
        // Filter for significant drift
        const significantDrift = incorrectCounts.filter((d: any) => {
          const drift = Math.abs(d.stored_count - d.actual_count)
          const percentDrift = (drift / Math.max(d.actual_count, 1)) * 100
          return percentDrift > this.thresholds.case_count_drift_percent
        })

        if (significantDrift.length > 0) {
          const maxDrift = Math.max(...significantDrift.map((d: any) => {
            const drift = Math.abs(d.stored_count - d.actual_count)
            return (drift / Math.max(d.actual_count, 1)) * 100
          }))

          result.anomalies.push({
            type: 'case_count_drift',
            severity: maxDrift > 20 ? 'high' : 'medium',
            description: `${significantDrift.length} judges have case count drift > ${this.thresholds.case_count_drift_percent}%`,
            count: significantDrift.length,
            threshold: this.thresholds.case_count_drift_percent,
            details: {
              max_drift_percent: maxDrift.toFixed(1),
              affected_judges: significantDrift.slice(0, 5)
            }
          })
        }
      }
    } catch (error: any) {
      console.error('Error checking case count drift:', error.message)
    }
  }

  private async checkMissingFields(result: IntegrityCheckResult) {
    result.checks_performed++

    try {
      // Check judges missing slugs
      const { data: judgesData, error: judgesError } = await this.supabase
        .from('judges')
        .select('id, name, slug')
        .is('slug', null)

      if (!judgesError && judgesData) {
        const count = judgesData.length
        if (count > this.thresholds.missing_slugs_max) {
          result.anomalies.push({
            type: 'missing_fields',
            severity: count > 50 ? 'high' : 'medium',
            description: `${count} judges missing slug field (threshold: ${this.thresholds.missing_slugs_max})`,
            count,
            threshold: this.thresholds.missing_slugs_max
          })
        }
      }

      // Check courts missing slugs
      const { data: courtsData, error: courtsError } = await this.supabase
        .from('courts')
        .select('id, name, slug')
        .is('slug', null)

      if (!courtsError && courtsData) {
        const count = courtsData.length
        if (count > this.thresholds.missing_slugs_max) {
          result.anomalies.push({
            type: 'missing_fields',
            severity: count > 20 ? 'high' : 'medium',
            description: `${count} courts missing slug field (threshold: ${this.thresholds.missing_slugs_max})`,
            count,
            threshold: this.thresholds.missing_slugs_max
          })
        }
      }

      // Check judges without names (critical)
      const { data: noNames, error: namesError } = await this.supabase
        .from('judges')
        .select('id, name')
        .or('name.is.null,name.eq.')

      if (!namesError && noNames && noNames.length > 0) {
        result.anomalies.push({
          type: 'missing_fields',
          severity: 'critical',
          description: `${noNames.length} judges without names detected`,
          count: noNames.length,
          threshold: 0,
          details: noNames.slice(0, 10)
        })
      }
    } catch (error: any) {
      console.error('Error checking missing fields:', error.message)
    }
  }

  private async checkRelationshipConsistency(result: IntegrityCheckResult) {
    result.checks_performed++

    try {
      const { data: inconsistencies, error } = await this.supabase.rpc('find_inconsistent_relationships')

      if (!error && inconsistencies && inconsistencies.length > 0) {
        const criticalIssues = inconsistencies.filter((i: any) => i.severity === 'high')
        const mediumIssues = inconsistencies.filter((i: any) => i.severity === 'medium')

        if (criticalIssues.length > 0) {
          result.anomalies.push({
            type: 'relationship_inconsistency',
            severity: 'high',
            description: `${criticalIssues.length} critical relationship inconsistencies detected`,
            count: criticalIssues.length,
            threshold: 0,
            details: criticalIssues.slice(0, 5)
          })
        }

        if (mediumIssues.length > 10) {
          result.anomalies.push({
            type: 'relationship_inconsistency',
            severity: 'medium',
            description: `${mediumIssues.length} medium relationship inconsistencies detected`,
            count: mediumIssues.length,
            threshold: 10
          })
        }
      }
    } catch (error: any) {
      console.error('Error checking relationship consistency:', error.message)
    }
  }

  private async checkStaleData(result: IntegrityCheckResult) {
    result.checks_performed++

    try {
      const { data: staleJudges, error } = await this.supabase.rpc('find_stale_judges', {
        days_threshold: this.thresholds.stale_data_days
      })

      if (!error && staleJudges && staleJudges.length > 0) {
        const count = staleJudges.length
        const veryStale = staleJudges.filter((j: any) => j.days_since_sync > 365).length

        result.anomalies.push({
          type: 'missing_fields',
          severity: veryStale > 100 ? 'high' : 'medium',
          description: `${count} judges have stale data (not synced in ${this.thresholds.stale_data_days}+ days)`,
          count,
          threshold: this.thresholds.stale_data_days,
          details: {
            very_stale: veryStale,
            oldest: staleJudges.slice(0, 5)
          }
        })
      }
    } catch (error: any) {
      console.error('Error checking stale data:', error.message)
    }
  }

  private calculateHealthScore(anomalies: IntegrityAnomaly[]): number {
    let score = 100

    anomalies.forEach(anomaly => {
      switch (anomaly.severity) {
        case 'critical':
          score -= 20
          break
        case 'high':
          score -= 10
          break
        case 'medium':
          score -= 5
          break
        case 'low':
          score -= 2
          break
      }
    })

    return Math.max(0, score)
  }

  async saveCheckResult(result: IntegrityCheckResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sync_validation_results')
        .insert({
          validation_id: `integrity_check_${Date.now()}`,
          started_at: result.timestamp,
          completed_at: new Date().toISOString(),
          duration_ms: 0,
          total_issues: result.anomalies.length,
          critical_issues: result.anomalies.filter(a => a.severity === 'critical').length,
          high_priority_issues: result.anomalies.filter(a => a.severity === 'high').length,
          medium_priority_issues: result.anomalies.filter(a => a.severity === 'medium').length,
          low_priority_issues: result.anomalies.filter(a => a.severity === 'low').length,
          issues: result.anomalies,
          summary: `Health Score: ${result.health_score}/100`
        })

      if (error) {
        console.error('Failed to save check result:', error.message)
      }
    } catch (error: any) {
      console.error('Error saving check result:', error.message)
    }
  }
}

/**
 * Send alert notification (Slack, email, etc.)
 */
export async function sendIntegrityAlert(result: IntegrityCheckResult): Promise<void> {
  if (!result.requires_action) {
    return
  }

  const criticalAnomalies = result.anomalies.filter(a => a.severity === 'critical')
  const highAnomalies = result.anomalies.filter(a => a.severity === 'high')

  const message = `
🚨 Data Integrity Alert - JudgeFinder Platform

Health Score: ${result.health_score}/100
Checks Performed: ${result.checks_performed}
Anomalies Detected: ${result.anomalies.length}

Critical Issues (${criticalAnomalies.length}):
${criticalAnomalies.map(a => `• ${a.description}`).join('\n')}

High Priority Issues (${highAnomalies.length}):
${highAnomalies.map(a => `• ${a.description}`).join('\n')}

Action Required: Review and run cleanup script
Command: npm run cleanup-production-data

Timestamp: ${result.timestamp}
  `.trim()

  // In production, send to Slack, email, or monitoring service
  console.log(message)

  // Example: Send to Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: 'Data Integrity Monitor',
          icon_emoji: ':warning:'
        })
      })
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }

  // Example: Send email via API
  if (process.env.ADMIN_EMAIL && process.env.SENDGRID_API_KEY) {
    try {
      // Implementation would go here
      console.log(`Would send email to: ${process.env.ADMIN_EMAIL}`)
    } catch (error) {
      console.error('Failed to send email alert:', error)
    }
  }
}

/**
 * Get recent integrity check history
 */
export async function getIntegrityCheckHistory(
  supabaseUrl: string,
  supabaseKey: string,
  limit: number = 10
): Promise<IntegrityCheckResult[]> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase
    .from('sync_validation_results')
    .select('*')
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to get integrity check history:', error.message)
    return []
  }

  return data.map((row: any) => ({
    timestamp: row.completed_at,
    checks_performed: 5, // Default value
    anomalies: row.issues || [],
    health_score: calculateHealthScoreFromIssues(row.issues || []),
    requires_action: row.critical_issues > 0 || row.high_priority_issues > 0
  }))
}

function calculateHealthScoreFromIssues(issues: any[]): number {
  let score = 100

  issues.forEach((issue: any) => {
    switch (issue.severity) {
      case 'critical':
        score -= 20
        break
      case 'high':
        score -= 10
        break
      case 'medium':
        score -= 5
        break
      case 'low':
        score -= 2
        break
    }
  })

  return Math.max(0, score)
}
