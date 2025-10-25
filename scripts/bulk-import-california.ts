/**
 * Bulk Import Orchestration Script
 * Coordinates multi-phase California data import from CourtListener
 *
 * Usage:
 *   npm run sync:california-bulk
 *   or
 *   npx tsx scripts/bulk-import-california.ts
 *
 * Phases:
 * 1. Courts - Import all California courts
 * 2. Judges - Discover and import all California judges
 * 3. Details - Pull positions, education, political affiliations
 * 4. Opinions - Pull written opinions for each judge
 * 5. Dockets - Pull case assignments for each judge
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { CourtSyncManager } from '@/lib/sync/court-sync'
import { JudgeSyncManager } from '@/lib/sync/judge-sync'
import { JudgeDetailsSyncManager } from '@/lib/sync/judge-details-sync'
import { DecisionSyncManager } from '@/lib/sync/decision-sync'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

interface BulkImportStats {
  phase: string
  runNumber: number
  startTime: Date
  endTime?: Date
  duration?: number
  success: boolean
  result?: any
  error?: string
}

class CaliforniaBulkImportOrchestrator {
  private stats: BulkImportStats[] = []
  private supabase

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase credentials missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      )
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  }

  /**
   * Run complete bulk import
   */
  async runBulkImport() {
    console.log('='.repeat(80))
    console.log('California Bulk Import Orchestrator')
    console.log('='.repeat(80))
    console.log()

    try {
      // Phase 1: Courts
      await this.runPhase1_Courts()

      // Phase 2: Judges (may need multiple runs)
      await this.runPhase2_Judges()

      // Phase 3: Judge Details
      await this.runPhase3_JudgeDetails()

      // Phase 4: Decisions (Opinions + Dockets)
      await this.runPhase4_Decisions()

      // Print summary
      this.printSummary()

      console.log()
      console.log('✅ Bulk import completed successfully!')
      console.log()
    } catch (error) {
      console.error()
      console.error('❌ Bulk import failed:', error)
      console.error()
      this.printSummary()
      process.exit(1)
    }
  }

  /**
   * Phase 1: Import all California courts
   */
  private async runPhase1_Courts() {
    console.log('\n📍 PHASE 1: Importing California Courts')
    console.log('-'.repeat(80))

    const runStat: BulkImportStats = {
      phase: 'courts',
      runNumber: 1,
      startTime: new Date(),
      success: false,
    }

    try {
      const courtSync = new CourtSyncManager()
      const result = await courtSync.syncCourts({
        jurisdiction: 'CA',
        batchSize: 20,
        forceRefresh: false,
      })

      runStat.endTime = new Date()
      runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
      runStat.success = result.success
      runStat.result = result

      console.log(`  ✓ Courts processed: ${result.courtsProcessed}`)
      console.log(`  ✓ Courts created: ${result.courtsCreated}`)
      console.log(`  ✓ Courts updated: ${result.courtsUpdated}`)
      console.log(`  ✓ Errors: ${result.errors.length}`)
      console.log(`  ✓ Duration: ${(runStat.duration / 1000).toFixed(2)}s`)

      if (result.errors.length > 0) {
        console.log('  ⚠️  Errors encountered:')
        result.errors.forEach((err, i) => console.log(`    ${i + 1}. ${err}`))
      }

      this.stats.push(runStat)
    } catch (error) {
      runStat.endTime = new Date()
      runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
      runStat.success = false
      runStat.error = error instanceof Error ? error.message : String(error)
      this.stats.push(runStat)
      throw error
    }
  }

  /**
   * Phase 2: Discover and import all California judges
   */
  private async runPhase2_Judges() {
    console.log('\n👨‍⚖️ PHASE 2: Importing California Judges')
    console.log('-'.repeat(80))

    let runNumber = 0
    let totalJudgesProcessed = 0
    let totalJudgesCreated = 0
    const maxRuns = 20 // Safety limit

    while (runNumber < maxRuns) {
      runNumber++

      console.log(`\n  Run #${runNumber}:`)

      const runStat: BulkImportStats = {
        phase: 'judges',
        runNumber,
        startTime: new Date(),
        success: false,
      }

      try {
        const judgeSync = new JudgeSyncManager()
        const result = await judgeSync.syncJudges({
          jurisdiction: 'CA',
          batchSize: 10,
          forceRefresh: false,
        })

        runStat.endTime = new Date()
        runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
        runStat.success = result.success
        runStat.result = result

        totalJudgesProcessed += result.judgesProcessed
        totalJudgesCreated += result.judgesCreated

        console.log(`    ✓ Judges processed: ${result.judgesProcessed}`)
        console.log(`    ✓ Judges created: ${result.judgesCreated}`)
        console.log(`    ✓ Judges updated: ${result.judgesUpdated}`)
        console.log(`    ✓ Duration: ${(runStat.duration / 1000).toFixed(2)}s`)

        this.stats.push(runStat)

        // If no new judges created, we're done with this phase
        if (result.judgesCreated === 0 && result.judgesProcessed < 10) {
          console.log(`\n  ✅ Phase 2 completed after ${runNumber} runs`)
          console.log(`  Total judges processed: ${totalJudgesProcessed}`)
          console.log(`  Total judges created: ${totalJudgesCreated}`)
          break
        }

        // Small delay between runs to respect rate limits
        await this.delay(5000)
      } catch (error) {
        runStat.endTime = new Date()
        runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
        runStat.success = false
        runStat.error = error instanceof Error ? error.message : String(error)
        this.stats.push(runStat)
        throw error
      }
    }

    if (runNumber >= maxRuns) {
      console.log(`\n  ⚠️  Maximum runs (${maxRuns}) reached, may need additional runs later`)
    }
  }

  /**
   * Phase 3: Pull judge details (positions, education, affiliations)
   */
  private async runPhase3_JudgeDetails() {
    console.log('\n📋 PHASE 3: Importing Judge Details')
    console.log('-'.repeat(80))

    let runNumber = 0
    let totalJudgesProcessed = 0
    const maxRuns = 20 // Safety limit

    while (runNumber < maxRuns) {
      runNumber++

      console.log(`\n  Run #${runNumber}:`)

      const runStat: BulkImportStats = {
        phase: 'judge-details',
        runNumber,
        startTime: new Date(),
        success: false,
      }

      try {
        const detailsSync = new JudgeDetailsSyncManager()
        const result = await detailsSync.syncJudgeDetails({
          jurisdiction: 'CA',
          batchSize: 50,
          incompleteOnly: true,
        })

        runStat.endTime = new Date()
        runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
        runStat.success = result.success
        runStat.result = result

        totalJudgesProcessed += result.judgesProcessed

        console.log(`    ✓ Judges processed: ${result.judgesProcessed}`)
        console.log(`    ✓ Duration: ${(runStat.duration / 1000).toFixed(2)}s`)

        this.stats.push(runStat)

        // If no judges processed, we're done
        if (result.judgesProcessed === 0) {
          console.log(`\n  ✅ Phase 3 completed after ${runNumber} runs`)
          console.log(`  Total judges processed: ${totalJudgesProcessed}`)
          break
        }

        // Small delay between runs
        await this.delay(5000)
      } catch (error) {
        runStat.endTime = new Date()
        runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
        runStat.success = false
        runStat.error = error instanceof Error ? error.message : String(error)
        this.stats.push(runStat)
        throw error
      }
    }

    if (runNumber >= maxRuns) {
      console.log(`\n  ⚠️  Maximum runs (${maxRuns}) reached, may need additional runs later`)
    }
  }

  /**
   * Phase 4: Pull decisions (opinions + dockets)
   */
  private async runPhase4_Decisions() {
    console.log('\n⚖️  PHASE 4: Importing Decisions (Opinions + Dockets)')
    console.log('-'.repeat(80))

    let runNumber = 0
    let totalDecisionsProcessed = 0
    let totalFilingsProcessed = 0
    const maxRuns = 80 // This phase needs more runs due to volume

    while (runNumber < maxRuns) {
      runNumber++

      console.log(`\n  Run #${runNumber}:`)

      const runStat: BulkImportStats = {
        phase: 'decisions',
        runNumber,
        startTime: new Date(),
        success: false,
      }

      try {
        const decisionSync = new DecisionSyncManager()
        const result = await decisionSync.syncDecisions({
          jurisdiction: 'CA',
          batchSize: 5,
          maxDecisionsPerJudge: 100, // Pull up to 100 opinions per judge
          maxFilingsPerJudge: 100, // Pull up to 100 dockets per judge
          yearsBack: 10, // Historical data: 10 years
          includeDockets: true,
        })

        runStat.endTime = new Date()
        runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
        runStat.success = result.success
        runStat.result = result

        totalDecisionsProcessed += result.decisionsProcessed
        totalFilingsProcessed += result.filingsProcessed

        console.log(`    ✓ Judges processed: ${result.judgesProcessed}`)
        console.log(`    ✓ Decisions processed: ${result.decisionsProcessed}`)
        console.log(`    ✓ Filings processed: ${result.filingsProcessed}`)
        console.log(`    ✓ Duration: ${(runStat.duration / 1000).toFixed(2)}s`)

        this.stats.push(runStat)

        // Check if we should continue
        if (result.judgesProcessed === 0) {
          console.log(`\n  ✅ Phase 4 completed after ${runNumber} runs`)
          console.log(`  Total decisions processed: ${totalDecisionsProcessed}`)
          console.log(`  Total filings processed: ${totalFilingsProcessed}`)
          break
        }

        // Small delay between runs - this phase is heavy on API calls
        await this.delay(10000) // 10 second delay
      } catch (error) {
        runStat.endTime = new Date()
        runStat.duration = runStat.endTime.getTime() - runStat.startTime.getTime()
        runStat.success = false
        runStat.error = error instanceof Error ? error.message : String(error)
        this.stats.push(runStat)
        throw error
      }
    }

    if (runNumber >= maxRuns) {
      console.log(`\n  ⚠️  Maximum runs (${maxRuns}) reached, may need additional runs later`)
    }
  }

  /**
   * Print summary of all runs
   */
  private printSummary() {
    console.log('\n' + '='.repeat(80))
    console.log('BULK IMPORT SUMMARY')
    console.log('='.repeat(80))

    const groupedStats = this.stats.reduce(
      (acc, stat) => {
        if (!acc[stat.phase]) {
          acc[stat.phase] = []
        }
        acc[stat.phase].push(stat)
        return acc
      },
      {} as Record<string, BulkImportStats[]>
    )

    Object.entries(groupedStats).forEach(([phase, stats]) => {
      console.log(`\n${phase.toUpperCase()}:`)
      console.log(`  Total runs: ${stats.length}`)
      console.log(`  Successful runs: ${stats.filter((s) => s.success).length}`)
      console.log(`  Failed runs: ${stats.filter((s) => !s.success).length}`)

      const totalDuration = stats.reduce((sum, s) => sum + (s.duration || 0), 0)
      console.log(`  Total duration: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`)

      if (stats.some((s) => !s.success)) {
        console.log('  Errors:')
        stats
          .filter((s) => !s.success)
          .forEach((s) => {
            console.log(`    Run #${s.runNumber}: ${s.error}`)
          })
      }
    })

    const totalDuration = this.stats.reduce((sum, s) => sum + (s.duration || 0), 0)
    console.log(`\nOVERALL:`)
    console.log(`  Total runs across all phases: ${this.stats.length}`)
    console.log(`  Total time: ${(totalDuration / 1000 / 60).toFixed(2)} minutes`)
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Run the orchestrator
async function main() {
  const orchestrator = new CaliforniaBulkImportOrchestrator()
  await orchestrator.runBulkImport()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
