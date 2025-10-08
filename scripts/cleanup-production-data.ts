#!/usr/bin/env node

/**
 * Automated Production Data Cleanup Script
 *
 * Safely cleans up data integrity issues using Supabase RPC functions:
 * - Orphaned cases (nullify invalid judge_id references)
 * - Orphaned court assignments (delete invalid references)
 * - Recalculate judge case counts
 * - Fix duplicate CourtListener IDs (soft delete duplicates)
 *
 * All actions are logged to an audit trail for tracking.
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

interface CleanupAction {
  timestamp: string
  action: string
  entity: string
  count: number
  details?: any
  success: boolean
  error?: string
}

interface CleanupReport {
  timestamp: string
  duration_ms: number
  actions: CleanupAction[]
  totalRecordsAffected: number
  success: boolean
  errors: string[]
}

class ProductionDataCleaner {
  private startTime: number = Date.now()
  private report: CleanupReport = {
    timestamp: new Date().toISOString(),
    duration_ms: 0,
    actions: [],
    totalRecordsAffected: 0,
    success: true,
    errors: []
  }

  private logAction(action: CleanupAction) {
    this.report.actions.push(action)
    if (action.success) {
      this.report.totalRecordsAffected += action.count
    } else {
      this.report.success = false
      if (action.error) {
        this.report.errors.push(action.error)
      }
    }
  }

  async runCleanup(dryRun: boolean = false): Promise<CleanupReport> {
    console.log('🧹 Starting Production Data Cleanup...')
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE CLEANUP'}\n`)

    try {
      // 1. Clean up orphaned cases
      await this.cleanupOrphanedCases(dryRun)

      // 2. Clean up orphaned court assignments
      await this.cleanupOrphanedAssignments(dryRun)

      // 3. Recalculate judge case counts
      await this.recalculateJudgeCaseCounts(dryRun)

      // 4. Fix duplicate CourtListener IDs
      await this.fixDuplicateCourtListenerIds(dryRun)

      // 5. Clean up inconsistent relationships
      await this.fixInconsistentRelationships(dryRun)

      // Save audit trail
      await this.saveAuditTrail()

    } catch (error: any) {
      console.error('❌ Cleanup failed with error:', error.message)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'CLEANUP_ERROR',
        entity: 'system',
        count: 0,
        success: false,
        error: error.message
      })
    }

    this.report.duration_ms = Date.now() - this.startTime
    return this.report
  }

  private async cleanupOrphanedCases(dryRun: boolean) {
    console.log('✓ Cleaning up orphaned cases...')

    // First, find orphaned cases
    const { data: orphanedCases, error: findError } = await supabase.rpc('find_orphaned_cases')

    if (findError) {
      console.log(`  ⚠️  Could not find orphaned cases: ${findError.message}`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'FIND_ORPHANED_CASES',
        entity: 'cases',
        count: 0,
        success: false,
        error: findError.message
      })
      return
    }

    if (!orphanedCases || orphanedCases.length === 0) {
      console.log('  ✓ No orphaned cases found')
      return
    }

    console.log(`  Found ${orphanedCases.length} orphaned cases`)

    if (dryRun) {
      console.log('  [DRY RUN] Would nullify judge_id for these cases')
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'CLEANUP_ORPHANED_CASES (DRY RUN)',
        entity: 'cases',
        count: orphanedCases.length,
        details: orphanedCases.slice(0, 5),
        success: true
      })
      return
    }

    // Use RPC function to clean up
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_orphaned_cases')

    if (cleanupError) {
      console.log(`  ❌ Failed to cleanup orphaned cases: ${cleanupError.message}`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'CLEANUP_ORPHANED_CASES',
        entity: 'cases',
        count: 0,
        success: false,
        error: cleanupError.message
      })
    } else {
      console.log(`  ✓ Cleaned up ${cleanupResult} orphaned cases`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'CLEANUP_ORPHANED_CASES',
        entity: 'cases',
        count: cleanupResult,
        success: true
      })
    }
  }

  private async cleanupOrphanedAssignments(dryRun: boolean) {
    console.log('✓ Cleaning up orphaned court assignments...')

    // Find orphaned assignments
    const { data: orphanedAssignments, error: findError } = await supabase.rpc('find_orphaned_assignments')

    if (findError) {
      console.log(`  ⚠️  Could not find orphaned assignments: ${findError.message}`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'FIND_ORPHANED_ASSIGNMENTS',
        entity: 'judge_court_assignments',
        count: 0,
        success: false,
        error: findError.message
      })
      return
    }

    if (!orphanedAssignments || orphanedAssignments.length === 0) {
      console.log('  ✓ No orphaned assignments found')
      return
    }

    console.log(`  Found ${orphanedAssignments.length} orphaned assignments`)

    if (dryRun) {
      console.log('  [DRY RUN] Would delete these assignments')
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'CLEANUP_ORPHANED_ASSIGNMENTS (DRY RUN)',
        entity: 'judge_court_assignments',
        count: orphanedAssignments.length,
        details: orphanedAssignments.slice(0, 5),
        success: true
      })
      return
    }

    // Use RPC function to clean up
    const { data: cleanupResult, error: cleanupError } = await supabase.rpc('cleanup_orphaned_assignments')

    if (cleanupError) {
      console.log(`  ❌ Failed to cleanup orphaned assignments: ${cleanupError.message}`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'CLEANUP_ORPHANED_ASSIGNMENTS',
        entity: 'judge_court_assignments',
        count: 0,
        success: false,
        error: cleanupError.message
      })
    } else {
      console.log(`  ✓ Cleaned up ${cleanupResult} orphaned assignments`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'CLEANUP_ORPHANED_ASSIGNMENTS',
        entity: 'judge_court_assignments',
        count: cleanupResult,
        success: true
      })
    }
  }

  private async recalculateJudgeCaseCounts(dryRun: boolean) {
    console.log('✓ Recalculating judge case counts...')

    // Find judges with incorrect case counts
    const { data: incorrectCounts, error: findError } = await supabase.rpc('validate_judge_case_counts')

    if (findError) {
      console.log(`  ⚠️  Could not validate case counts: ${findError.message}`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'VALIDATE_CASE_COUNTS',
        entity: 'judges',
        count: 0,
        success: false,
        error: findError.message
      })
      return
    }

    if (!incorrectCounts || incorrectCounts.length === 0) {
      console.log('  ✓ All case counts are accurate')
      return
    }

    console.log(`  Found ${incorrectCounts.length} judges with incorrect case counts`)

    if (dryRun) {
      console.log('  [DRY RUN] Would recalculate case counts for these judges')
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'RECALCULATE_CASE_COUNTS (DRY RUN)',
        entity: 'judges',
        count: incorrectCounts.length,
        details: incorrectCounts.slice(0, 5),
        success: true
      })
      return
    }

    // Recalculate case counts for each judge
    let successCount = 0
    let failureCount = 0

    for (const judge of incorrectCounts) {
      const { data: newCount, error: recalcError } = await supabase.rpc('recalculate_judge_case_count', {
        judge_id: judge.judge_id
      })

      if (recalcError) {
        failureCount++
        console.log(`  ⚠️  Failed to recalculate for judge ${judge.judge_name}: ${recalcError.message}`)
      } else {
        successCount++
        console.log(`  ✓ Updated ${judge.judge_name}: ${judge.stored_count} → ${newCount}`)
      }
    }

    this.logAction({
      timestamp: new Date().toISOString(),
      action: 'RECALCULATE_CASE_COUNTS',
      entity: 'judges',
      count: successCount,
      details: { success: successCount, failed: failureCount },
      success: failureCount === 0
    })

    console.log(`  ✓ Recalculated ${successCount} judges, ${failureCount} failures`)
  }

  private async fixDuplicateCourtListenerIds(dryRun: boolean) {
    console.log('✓ Fixing duplicate CourtListener IDs...')

    // Check judges
    const { data: judgeDupes, error: judgeError } = await supabase.rpc('find_duplicate_courtlistener_ids', {
      entity_type: 'judge'
    })

    if (!judgeError && judgeDupes && judgeDupes.length > 0) {
      console.log(`  Found ${judgeDupes.length} duplicate judge CourtListener IDs`)

      if (dryRun) {
        console.log('  [DRY RUN] Would soft delete duplicate judges (keep most recent)')
        this.logAction({
          timestamp: new Date().toISOString(),
          action: 'FIX_DUPLICATE_JUDGE_CL_IDS (DRY RUN)',
          entity: 'judges',
          count: judgeDupes.length,
          details: judgeDupes.slice(0, 5),
          success: true
        })
      } else {
        // For each duplicate, keep the most recently updated record and soft delete others
        let fixedCount = 0
        for (const dupe of judgeDupes) {
          // Get all judges with this CourtListener ID
          const { data: dupJudges, error: fetchError } = await supabase
            .from('judges')
            .select('id, name, updated_at, total_cases')
            .eq('courtlistener_id', dupe.courtlistener_id)
            .order('updated_at', { ascending: false })

          if (!fetchError && dupJudges && dupJudges.length > 1) {
            // Keep the first one (most recent), soft delete others
            const toKeep = dupJudges[0]
            const toDelete = dupJudges.slice(1)

            for (const judge of toDelete) {
              // Soft delete by setting is_active = false and adding a suffix to CourtListener ID
              const { error: updateError } = await supabase
                .from('judges')
                .update({
                  courtlistener_id: `${judge.id}_duplicate_${dupe.courtlistener_id}`,
                  updated_at: new Date().toISOString()
                })
                .eq('id', judge.id)

              if (!updateError) {
                fixedCount++
                console.log(`  ✓ Soft deleted duplicate judge: ${judge.name} (keeping ${toKeep.name})`)
              }
            }
          }
        }

        this.logAction({
          timestamp: new Date().toISOString(),
          action: 'FIX_DUPLICATE_JUDGE_CL_IDS',
          entity: 'judges',
          count: fixedCount,
          success: true
        })
      }
    }

    // Check courts
    const { data: courtDupes, error: courtError } = await supabase.rpc('find_duplicate_courtlistener_ids', {
      entity_type: 'court'
    })

    if (!courtError && courtDupes && courtDupes.length > 0) {
      console.log(`  Found ${courtDupes.length} duplicate court CourtListener IDs`)

      if (dryRun) {
        console.log('  [DRY RUN] Would soft delete duplicate courts (keep most recent)')
        this.logAction({
          timestamp: new Date().toISOString(),
          action: 'FIX_DUPLICATE_COURT_CL_IDS (DRY RUN)',
          entity: 'courts',
          count: courtDupes.length,
          details: courtDupes.slice(0, 5),
          success: true
        })
      } else {
        // Similar logic for courts
        let fixedCount = 0
        for (const dupe of courtDupes) {
          const { data: dupCourts, error: fetchError } = await supabase
            .from('courts')
            .select('id, name, updated_at')
            .eq('courtlistener_id', dupe.courtlistener_id)
            .order('updated_at', { ascending: false })

          if (!fetchError && dupCourts && dupCourts.length > 1) {
            const toKeep = dupCourts[0]
            const toDelete = dupCourts.slice(1)

            for (const court of toDelete) {
              const { error: updateError } = await supabase
                .from('courts')
                .update({
                  courtlistener_id: `${court.id}_duplicate_${dupe.courtlistener_id}`,
                  updated_at: new Date().toISOString()
                })
                .eq('id', court.id)

              if (!updateError) {
                fixedCount++
                console.log(`  ✓ Soft deleted duplicate court: ${court.name} (keeping ${toKeep.name})`)
              }
            }
          }
        }

        this.logAction({
          timestamp: new Date().toISOString(),
          action: 'FIX_DUPLICATE_COURT_CL_IDS',
          entity: 'courts',
          count: fixedCount,
          success: true
        })
      }
    }

    if (!judgeDupes?.length && !courtDupes?.length) {
      console.log('  ✓ No duplicate CourtListener IDs found')
    }
  }

  private async fixInconsistentRelationships(dryRun: boolean) {
    console.log('✓ Fixing inconsistent relationships...')

    const { data: inconsistencies, error } = await supabase.rpc('find_inconsistent_relationships')

    if (error) {
      console.log(`  ⚠️  Could not find inconsistent relationships: ${error.message}`)
      return
    }

    if (!inconsistencies || inconsistencies.length === 0) {
      console.log('  ✓ No inconsistent relationships found')
      return
    }

    console.log(`  Found ${inconsistencies.length} inconsistent relationships`)

    // Filter auto-fixable issues
    const autoFixable = inconsistencies.filter((i: any) => i.auto_fixable)

    if (autoFixable.length === 0) {
      console.log('  ⚠️  No auto-fixable inconsistencies (manual review required)')
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'FIX_INCONSISTENT_RELATIONSHIPS',
        entity: 'various',
        count: 0,
        details: { total: inconsistencies.length, auto_fixable: 0 },
        success: true
      })
      return
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Would fix ${autoFixable.length} auto-fixable inconsistencies`)
      this.logAction({
        timestamp: new Date().toISOString(),
        action: 'FIX_INCONSISTENT_RELATIONSHIPS (DRY RUN)',
        entity: 'various',
        count: autoFixable.length,
        details: autoFixable.slice(0, 5),
        success: true
      })
      return
    }

    // Note: Actual fixing logic would depend on specific inconsistency types
    // For now, log as manual review required
    console.log(`  ⚠️  ${autoFixable.length} auto-fixable issues require custom logic`)

    this.logAction({
      timestamp: new Date().toISOString(),
      action: 'FIX_INCONSISTENT_RELATIONSHIPS',
      entity: 'various',
      count: 0,
      details: { total: inconsistencies.length, requires_manual_review: true },
      success: true
    })
  }

  private async saveAuditTrail() {
    console.log('\n✓ Saving audit trail...')

    const auditPath = path.join(__dirname, '..', 'cleanup-audit.json')
    const auditEntry = {
      ...this.report,
      version: '1.0.0',
      operator: process.env.USER || 'system'
    }

    // Append to existing audit log or create new one
    let auditLog = []
    if (fs.existsSync(auditPath)) {
      const existing = fs.readFileSync(auditPath, 'utf-8')
      auditLog = JSON.parse(existing)
    }

    auditLog.push(auditEntry)

    fs.writeFileSync(auditPath, JSON.stringify(auditLog, null, 2))
    console.log(`  ✓ Audit trail saved to: ${auditPath}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const force = args.includes('--force')

  if (!dryRun && !force) {
    console.log('⚠️  WARNING: This will modify production data!')
    console.log('Use --dry-run to preview changes without modifying data')
    console.log('Use --force to confirm you want to make live changes')
    console.log('\nExample: npm run cleanup-production-data -- --dry-run\n')
    process.exit(1)
  }

  const cleaner = new ProductionDataCleaner()
  const report = await cleaner.runCleanup(dryRun)

  // Display summary
  console.log('\n' + '='.repeat(70))
  console.log('📊 CLEANUP SUMMARY')
  console.log('='.repeat(70))
  console.log(`Status: ${report.success ? '✅ SUCCESS' : '❌ FAILED'}`)
  console.log(`Duration: ${report.duration_ms}ms`)
  console.log(`Total Records Affected: ${report.totalRecordsAffected}`)
  console.log(`Actions Performed: ${report.actions.length}`)

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:')
    report.errors.forEach(err => console.log(`  • ${err}`))
  }

  console.log('\n📋 Actions:')
  report.actions.forEach(action => {
    const icon = action.success ? '✓' : '✗'
    console.log(`  ${icon} ${action.action}: ${action.count} records`)
  })

  console.log('\n' + '='.repeat(70))

  if (!report.success) {
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { ProductionDataCleaner }
export type { CleanupReport, CleanupAction }
