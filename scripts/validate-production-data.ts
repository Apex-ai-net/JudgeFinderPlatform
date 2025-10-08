#!/usr/bin/env node

/**
 * Pre-Launch Production Data Validation Script
 *
 * Performs comprehensive validation checks before production deployment:
 * - Zero judges without names
 * - Orphaned cases (judge_id references non-existent judge)
 * - Duplicate CourtListener IDs
 * - Case count accuracy (stored vs. actual)
 * - Judges with 500+ cases have analytics
 *
 * Exit codes:
 * - 0: All validations passed
 * - 1: Critical issues found (blocking deployment)
 * - 2: Warnings found (review recommended)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ValidationIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  count?: number
  details?: any
  autoFixable?: boolean
  fixCommand?: string
}

interface ValidationReport {
  timestamp: string
  duration_ms: number
  status: 'passed' | 'failed' | 'warnings'
  totalIssues: number
  criticalIssues: number
  highPriorityIssues: number
  mediumPriorityIssues: number
  lowPriorityIssues: number
  issues: ValidationIssue[]
  statistics: Record<string, any>
  recommendations: string[]
}

class ProductionDataValidator {
  private startTime: number = Date.now()
  private report: ValidationReport = {
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    status: 'passed',
    totalIssues: 0,
    criticalIssues: 0,
    highPriorityIssues: 0,
    mediumPriorityIssues: 0,
    lowPriorityIssues: 0,
    issues: [],
    statistics: {},
    recommendations: []
  }

  private addIssue(issue: ValidationIssue) {
    this.report.issues.push(issue)
    this.report.totalIssues++

    switch (issue.severity) {
      case 'critical':
        this.report.criticalIssues++
        break
      case 'high':
        this.report.highPriorityIssues++
        break
      case 'medium':
        this.report.mediumPriorityIssues++
        break
      case 'low':
        this.report.lowPriorityIssues++
        break
    }
  }

  async runValidation(): Promise<ValidationReport> {
    console.log('🔍 Starting Pre-Launch Production Data Validation...\n')

    try {
      // Critical validations (blocking)
      await this.validateJudgesHaveNames()
      await this.validateOrphanedCases()
      await this.validateDuplicateCourtListenerIds()
      await this.validateCaseCountAccuracy()
      await this.validateAnalyticsCoverage()

      // High priority validations (should be fixed)
      await this.validateCourtReferences()
      await this.validateRequiredFields()
      await this.validateDataIntegrity()

      // Medium priority validations (review recommended)
      await this.validateDataQuality()
      await this.validateRelationshipConsistency()

      // Gather statistics
      await this.gatherStatistics()

      // Generate recommendations
      this.generateRecommendations()

    } catch (error: any) {
      console.error('❌ Validation failed with error:', error.message)
      this.addIssue({
        severity: 'critical',
        category: 'SYSTEM_ERROR',
        description: `Validation process failed: ${error.message}`,
        details: error.stack
      })
    }

    // Calculate duration
    this.report.duration_ms = Date.now() - this.startTime

    // Determine final status
    if (this.report.criticalIssues > 0) {
      this.report.status = 'failed'
    } else if (this.report.highPriorityIssues > 0 || this.report.mediumPriorityIssues > 0) {
      this.report.status = 'warnings'
    }

    return this.report
  }

  private async validateJudgesHaveNames() {
    console.log('✓ Validating judges have names...')

    const { data, error } = await supabase
      .from('judges')
      .select('id, name')
      .or('name.is.null,name.eq.')

    if (error) {
      this.addIssue({
        severity: 'critical',
        category: 'DATABASE_ERROR',
        description: `Failed to query judges: ${error.message}`
      })
      return
    }

    if (data && data.length > 0) {
      this.addIssue({
        severity: 'critical',
        category: 'MISSING_DATA',
        description: `${data.length} judges without names found`,
        count: data.length,
        details: data.slice(0, 10),
        autoFixable: false
      })
      console.log(`  ⚠️  Found ${data.length} judges without names`)
    } else {
      console.log('  ✓ All judges have names')
    }
  }

  private async validateOrphanedCases() {
    console.log('✓ Validating orphaned cases...')

    const { data, error } = await supabase.rpc('find_orphaned_cases')

    if (error) {
      console.log(`  ⚠️  Could not check orphaned cases: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      this.addIssue({
        severity: 'critical',
        category: 'REFERENTIAL_INTEGRITY',
        description: `${data.length} orphaned cases found (judge_id references non-existent judge)`,
        count: data.length,
        details: data.slice(0, 10),
        autoFixable: true,
        fixCommand: 'npm run cleanup-production-data'
      })
      console.log(`  ⚠️  Found ${data.length} orphaned cases`)
    } else {
      console.log('  ✓ No orphaned cases found')
    }
  }

  private async validateDuplicateCourtListenerIds() {
    console.log('✓ Validating duplicate CourtListener IDs...')

    // Check judges
    const { data: judgeDupes, error: judgeError } = await supabase.rpc(
      'find_duplicate_courtlistener_ids',
      { entity_type: 'judge' }
    )

    if (!judgeError && judgeDupes && judgeDupes.length > 0) {
      this.addIssue({
        severity: 'critical',
        category: 'DATA_DUPLICATION',
        description: `${judgeDupes.length} duplicate CourtListener IDs found in judges table`,
        count: judgeDupes.length,
        details: judgeDupes.slice(0, 10),
        autoFixable: true,
        fixCommand: 'npm run cleanup-production-data'
      })
      console.log(`  ⚠️  Found ${judgeDupes.length} duplicate judge CourtListener IDs`)
    } else {
      console.log('  ✓ No duplicate judge CourtListener IDs')
    }

    // Check courts
    const { data: courtDupes, error: courtError } = await supabase.rpc(
      'find_duplicate_courtlistener_ids',
      { entity_type: 'court' }
    )

    if (!courtError && courtDupes && courtDupes.length > 0) {
      this.addIssue({
        severity: 'critical',
        category: 'DATA_DUPLICATION',
        description: `${courtDupes.length} duplicate CourtListener IDs found in courts table`,
        count: courtDupes.length,
        details: courtDupes.slice(0, 10),
        autoFixable: true,
        fixCommand: 'npm run cleanup-production-data'
      })
      console.log(`  ⚠️  Found ${courtDupes.length} duplicate court CourtListener IDs`)
    } else {
      console.log('  ✓ No duplicate court CourtListener IDs')
    }
  }

  private async validateCaseCountAccuracy() {
    console.log('✓ Validating case count accuracy...')

    const { data, error } = await supabase.rpc('validate_judge_case_counts')

    if (error) {
      console.log(`  ⚠️  Could not validate case counts: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      const significantDrift = data.filter((d: any) => {
        const drift = Math.abs(d.stored_count - d.actual_count)
        const percentDrift = (drift / Math.max(d.actual_count, 1)) * 100
        return percentDrift > 10
      })

      if (significantDrift.length > 0) {
        this.addIssue({
          severity: 'high',
          category: 'DATA_ACCURACY',
          description: `${significantDrift.length} judges have case count drift > 10%`,
          count: significantDrift.length,
          details: significantDrift.slice(0, 10),
          autoFixable: true,
          fixCommand: 'npm run cleanup-production-data'
        })
        console.log(`  ⚠️  Found ${significantDrift.length} judges with significant case count drift`)
      } else {
        console.log('  ✓ Case counts are accurate')
      }
    } else {
      console.log('  ✓ Case counts are accurate')
    }
  }

  private async validateAnalyticsCoverage() {
    console.log('✓ Validating analytics coverage...')

    // Get judges with 500+ cases
    const { data: eligibleJudges, error: judgeError } = await supabase
      .from('judges')
      .select('id, name, total_cases')
      .gte('total_cases', 500)

    if (judgeError) {
      console.log(`  ⚠️  Could not check eligible judges: ${judgeError.message}`)
      return
    }

    if (!eligibleJudges || eligibleJudges.length === 0) {
      console.log('  ✓ No judges with 500+ cases yet')
      return
    }

    // Check which ones have analytics
    const { data: judgesWithAnalytics, error: analyticsError } = await supabase
      .from('judge_analytics')
      .select('judge_id')
      .in('judge_id', eligibleJudges.map(j => j.id))

    if (analyticsError) {
      console.log(`  ⚠️  Could not check analytics: ${analyticsError.message}`)
      return
    }

    const analyticsJudgeIds = new Set(judgesWithAnalytics?.map(a => a.judge_id) || [])
    const missingAnalytics = eligibleJudges.filter(j => !analyticsJudgeIds.has(j.id))

    if (missingAnalytics.length > 0) {
      this.addIssue({
        severity: 'high',
        category: 'MISSING_ANALYTICS',
        description: `${missingAnalytics.length} judges with 500+ cases lack analytics`,
        count: missingAnalytics.length,
        details: missingAnalytics.slice(0, 10),
        autoFixable: true,
        fixCommand: 'npm run batch-generate-analytics'
      })
      console.log(`  ⚠️  Found ${missingAnalytics.length} judges missing analytics`)
    } else {
      console.log(`  ✓ All ${eligibleJudges.length} eligible judges have analytics`)
    }
  }

  private async validateCourtReferences() {
    console.log('✓ Validating court references...')

    const { data, error } = await supabase.rpc('find_orphaned_assignments')

    if (error) {
      console.log(`  ⚠️  Could not check orphaned assignments: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      this.addIssue({
        severity: 'high',
        category: 'REFERENTIAL_INTEGRITY',
        description: `${data.length} orphaned court assignments found`,
        count: data.length,
        details: data.slice(0, 10),
        autoFixable: true,
        fixCommand: 'npm run cleanup-production-data'
      })
      console.log(`  ⚠️  Found ${data.length} orphaned court assignments`)
    } else {
      console.log('  ✓ All court assignments are valid')
    }
  }

  private async validateRequiredFields() {
    console.log('✓ Validating required fields...')

    // Check judges missing critical fields
    const { data: judgesData, error: judgesError } = await supabase
      .from('judges')
      .select('id, name, courtlistener_id, slug')

    if (!judgesError && judgesData) {
      const missingSlug = judgesData.filter(j => !j.slug).length
      const missingCourtListenerId = judgesData.filter(j => !j.courtlistener_id).length

      if (missingSlug > 0) {
        this.addIssue({
          severity: 'high',
          category: 'MISSING_DATA',
          description: `${missingSlug} judges missing slug field`,
          count: missingSlug
        })
        console.log(`  ⚠️  ${missingSlug} judges missing slug`)
      }

      if (missingCourtListenerId > 0) {
        this.addIssue({
          severity: 'medium',
          category: 'MISSING_DATA',
          description: `${missingCourtListenerId} judges missing CourtListener ID`,
          count: missingCourtListenerId
        })
        console.log(`  ⚠️  ${missingCourtListenerId} judges missing CourtListener ID`)
      }
    }

    // Check courts missing critical fields
    const { data: courtsData, error: courtsError } = await supabase
      .from('courts')
      .select('id, name, slug, jurisdiction')

    if (!courtsError && courtsData) {
      const missingSlug = courtsData.filter(c => !c.slug).length
      const missingJurisdiction = courtsData.filter(c => !c.jurisdiction).length

      if (missingSlug > 0) {
        this.addIssue({
          severity: 'high',
          category: 'MISSING_DATA',
          description: `${missingSlug} courts missing slug field`,
          count: missingSlug
        })
        console.log(`  ⚠️  ${missingSlug} courts missing slug`)
      }

      if (missingJurisdiction > 0) {
        this.addIssue({
          severity: 'medium',
          category: 'MISSING_DATA',
          description: `${missingJurisdiction} courts missing jurisdiction`,
          count: missingJurisdiction
        })
        console.log(`  ⚠️  ${missingJurisdiction} courts missing jurisdiction`)
      }
    }
  }

  private async validateDataIntegrity() {
    console.log('✓ Validating data integrity...')

    const { data, error } = await supabase.rpc('find_inconsistent_relationships')

    if (error) {
      console.log(`  ⚠️  Could not check relationships: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      const criticalIssues = data.filter((d: any) => d.severity === 'high')
      const mediumIssues = data.filter((d: any) => d.severity === 'medium')

      if (criticalIssues.length > 0) {
        this.addIssue({
          severity: 'high',
          category: 'DATA_INTEGRITY',
          description: `${criticalIssues.length} critical relationship inconsistencies`,
          count: criticalIssues.length,
          details: criticalIssues.slice(0, 10)
        })
      }

      if (mediumIssues.length > 0) {
        this.addIssue({
          severity: 'medium',
          category: 'DATA_INTEGRITY',
          description: `${mediumIssues.length} medium relationship inconsistencies`,
          count: mediumIssues.length,
          details: mediumIssues.slice(0, 10)
        })
      }

      console.log(`  ⚠️  Found ${data.length} relationship inconsistencies`)
    } else {
      console.log('  ✓ All relationships are consistent')
    }
  }

  private async validateDataQuality() {
    console.log('✓ Validating data quality...')

    // Check for stale data
    const { data: staleJudges, error: staleError } = await supabase.rpc('find_stale_judges', { days_threshold: 180 })

    if (!staleError && staleJudges && staleJudges.length > 0) {
      this.addIssue({
        severity: 'medium',
        category: 'DATA_FRESHNESS',
        description: `${staleJudges.length} judges not synced in 180+ days`,
        count: staleJudges.length,
        details: staleJudges.slice(0, 10)
      })
      console.log(`  ⚠️  ${staleJudges.length} judges have stale data`)
    }

    // Check for judges needing backfill
    const { data: needBackfill, error: backfillError } = await supabase.rpc('find_judges_needing_backfill')

    if (!backfillError && needBackfill && needBackfill.length > 0) {
      this.addIssue({
        severity: 'low',
        category: 'DATA_COMPLETENESS',
        description: `${needBackfill.length} judges need case data backfill`,
        count: needBackfill.length
      })
      console.log(`  ⚠️  ${needBackfill.length} judges need backfill`)
    }
  }

  private async validateRelationshipConsistency() {
    console.log('✓ Validating relationship consistency...')

    const { data: validationStats, error } = await supabase.rpc('get_validation_stats')

    if (!error && validationStats) {
      this.report.statistics.validation_stats = validationStats
    }
  }

  private async gatherStatistics() {
    console.log('✓ Gathering statistics...')

    // Get total counts
    const { count: judgeCount } = await supabase
      .from('judges')
      .select('*', { count: 'exact', head: true })

    const { count: courtCount } = await supabase
      .from('courts')
      .select('*', { count: 'exact', head: true })

    const { count: caseCount } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })

    const { count: analyticsCount } = await supabase
      .from('judge_analytics')
      .select('*', { count: 'exact', head: true })

    this.report.statistics = {
      ...this.report.statistics,
      total_judges: judgeCount || 0,
      total_courts: courtCount || 0,
      total_cases: caseCount || 0,
      total_analytics: analyticsCount || 0
    }
  }

  private generateRecommendations() {
    if (this.report.criticalIssues > 0) {
      this.report.recommendations.push('🚨 CRITICAL: Do not deploy to production until critical issues are resolved')
      this.report.recommendations.push('Run cleanup script: npm run cleanup-production-data')
    }

    if (this.report.highPriorityIssues > 0) {
      this.report.recommendations.push('⚠️  HIGH: Address high priority issues before deployment')
    }

    if (this.report.mediumPriorityIssues > 0) {
      this.report.recommendations.push('📝 MEDIUM: Review and address medium priority issues')
    }

    // Specific recommendations based on issues
    const hasOrphanedData = this.report.issues.some(i => i.category === 'REFERENTIAL_INTEGRITY')
    if (hasOrphanedData) {
      this.report.recommendations.push('Run: npm run cleanup-production-data to fix orphaned records')
    }

    const hasMissingAnalytics = this.report.issues.some(i => i.category === 'MISSING_ANALYTICS')
    if (hasMissingAnalytics) {
      this.report.recommendations.push('Run: npm run batch-generate-analytics to generate missing analytics')
    }
  }
}

async function main() {
  const validator = new ProductionDataValidator()
  const report = await validator.runValidation()

  // Save report
  const reportPath = path.join(__dirname, '..', 'validation-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

  // Display summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 PRODUCTION DATA VALIDATION SUMMARY')
  console.log('='.repeat(70))
  console.log(`Status: ${report.status.toUpperCase()}`)
  console.log(`Duration: ${report.duration_ms}ms`)
  console.log(`Total Issues: ${report.totalIssues}`)
  console.log(`  🚨 Critical: ${report.criticalIssues}`)
  console.log(`  ⚠️  High: ${report.highPriorityIssues}`)
  console.log(`  📝 Medium: ${report.mediumPriorityIssues}`)
  console.log(`  ℹ️  Low: ${report.lowPriorityIssues}`)
  console.log('\nStatistics:')
  console.log(`  Total Judges: ${report.statistics.total_judges}`)
  console.log(`  Total Courts: ${report.statistics.total_courts}`)
  console.log(`  Total Cases: ${report.statistics.total_cases}`)
  console.log(`  Judge Analytics: ${report.statistics.total_analytics}`)

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    report.recommendations.forEach(rec => console.log(`  ${rec}`))
  }

  if (report.criticalIssues > 0) {
    console.log('\n🚨 CRITICAL ISSUES:')
    report.issues
      .filter(i => i.severity === 'critical')
      .forEach(issue => {
        console.log(`  • ${issue.description}`)
        if (issue.fixCommand) {
          console.log(`    Fix: ${issue.fixCommand}`)
        }
      })
  }

  console.log('\n' + '='.repeat(70))
  console.log(`📁 Full report saved to: ${reportPath}`)
  console.log('='.repeat(70))

  // Exit with appropriate code
  if (report.status === 'failed') {
    console.log('\n❌ VALIDATION FAILED - Deployment blocked\n')
    process.exit(1)
  } else if (report.status === 'warnings') {
    console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS - Review recommended\n')
    process.exit(2)
  } else {
    console.log('\n✅ VALIDATION PASSED - Safe to deploy\n')
    process.exit(0)
  }
}

if (require.main === module) {
  main()
}

export { ProductionDataValidator }
export type { ValidationReport, ValidationIssue }
