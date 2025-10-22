#!/usr/bin/env tsx
/**
 * Safe Data Sync Script with Rate Limit Monitoring
 *
 * Syncs courts and judges from CourtListener with:
 * - Real-time rate limit monitoring
 * - Automatic throttling to stay under 4,500 requests/hour
 * - Progress reporting
 * - Safe error handling
 *
 * Usage:
 *   npx tsx scripts/safe-sync-data.ts [courts|judges|both] [--limit N]
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { getGlobalRateLimiter } from '../lib/courtlistener/global-rate-limiter'
import { CourtSyncManager } from '../lib/sync/court-sync'
import { JudgeSyncManager } from '../lib/sync/judge-sync'
import { logger } from '../lib/utils/logger'

const args = process.argv.slice(2)
const syncType = args[0] || 'both'
const limitFlag = args.indexOf('--limit')
const limit = limitFlag >= 0 ? parseInt(args[limitFlag + 1]) : undefined

interface SyncOptions {
  type: 'courts' | 'judges' | 'both'
  limit?: number
}

async function checkRateLimitStatus() {
  const limiter = getGlobalRateLimiter()
  const stats = await limiter.getUsageStats()

  console.log('\n' + '='.repeat(60))
  console.log('📊 CourtListener Rate Limit Status')
  console.log('='.repeat(60))
  console.log(`Current Requests:  ${stats.totalRequests}/${stats.limit}`)
  console.log(`Remaining:         ${stats.remaining}`)
  console.log(`Utilization:       ${stats.utilizationPercent.toFixed(2)}%`)
  console.log(`Window Resets:     ${stats.windowEnd.toLocaleTimeString()}`)
  console.log(`Projected Hourly:  ${stats.projectedHourly || 'N/A'}`)
  console.log('='.repeat(60) + '\n')

  // Warn if rate limit is high
  if (stats.utilizationPercent > 80) {
    console.warn('⚠️  WARNING: Rate limit over 80% utilized')
    console.warn(`   Consider waiting until ${stats.windowEnd.toLocaleTimeString()}`)
    console.warn(`   Or reduce batch size with --limit flag\n`)
  }

  return stats
}

async function syncCourts(options: { limit?: number }) {
  console.log('\n🏛️  Starting Court Sync...\n')

  const courtSync = new CourtSyncManager()
  const syncOptions = {
    batchSize: 10, // Small batches to stay safe
    forceRefresh: false,
    jurisdiction: 'california' // Start with California only
  }

  try {
    const result = await courtSync.syncCourts(syncOptions)

    console.log('\n✅ Court Sync Complete!')
    console.log(`   Processed: ${result.courtsProcessed}`)
    console.log(`   Created:   ${result.courtsCreated}`)
    console.log(`   Updated:   ${result.courtsUpdated}`)
    console.log(`   Duration:  ${(result.duration / 1000).toFixed(1)}s`)

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.errors.length}`)
      result.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`))
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more`)
      }
    }

    return result
  } catch (error) {
    console.error('\n❌ Court sync failed:', error)
    throw error
  }
}

async function syncJudges(options: { limit?: number }) {
  console.log('\n⚖️  Starting Judge Sync...\n')

  const judgeSync = new JudgeSyncManager()
  const syncOptions = {
    batchSize: 5, // Even smaller batches for judges (more API calls per judge)
    maxJudges: options.limit || 50, // Default to 50 judges to be safe
    forceRefresh: false,
    skipCaseSync: true // Skip case data for initial sync (saves tons of API calls)
  }

  console.log(`   Limit: ${syncOptions.maxJudges} judges`)
  console.log(`   Batch size: ${syncOptions.batchSize}`)
  console.log(`   Skip cases: ${syncOptions.skipCaseSync}\n`)

  try {
    const result = await judgeSync.syncJudges(syncOptions)

    console.log('\n✅ Judge Sync Complete!')
    console.log(`   Processed: ${result.judgesProcessed}`)
    console.log(`   Created:   ${result.judgesCreated}`)
    console.log(`   Updated:   ${result.judgesUpdated}`)
    console.log(`   Duration:  ${(result.duration / 1000).toFixed(1)}s`)

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${result.errors.length}`)
      result.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`))
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more`)
      }
    }

    return result
  } catch (error) {
    console.error('\n❌ Judge sync failed:', error)
    throw error
  }
}

async function main() {
  console.log('\n🚀 JudgeFinder Safe Data Sync')
  console.log('━'.repeat(60))

  try {
    // Check rate limit status before starting
    const initialStats = await checkRateLimitStatus()

    // Abort if too close to limit
    if (initialStats.utilizationPercent > 90) {
      console.error('❌ Rate limit too high (>90%). Aborting sync.')
      console.error(`   Wait until ${initialStats.windowEnd.toLocaleTimeString()} and try again.`)
      process.exit(1)
    }

    // Parse sync type
    const options: SyncOptions = {
      type: syncType as 'courts' | 'judges' | 'both',
      limit
    }

    console.log(`\n📋 Sync Configuration:`)
    console.log(`   Type:  ${options.type}`)
    console.log(`   Limit: ${options.limit || 'default'}`)
    console.log()

    // Perform sync based on type
    if (options.type === 'courts' || options.type === 'both') {
      await syncCourts(options)

      // Check rate limit after courts
      await checkRateLimitStatus()
    }

    if (options.type === 'judges' || options.type === 'both') {
      // Wait a bit between court and judge sync
      if (options.type === 'both') {
        console.log('\n⏳ Waiting 5 seconds before judge sync...\n')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }

      await syncJudges(options)

      // Final rate limit check
      await checkRateLimitStatus()
    }

    console.log('\n' + '━'.repeat(60))
    console.log('✅ All syncs completed successfully!')
    console.log('━'.repeat(60) + '\n')

    process.exit(0)

  } catch (error) {
    console.error('\n❌ Sync failed:', error)

    // Show final rate limit status even on error
    try {
      await checkRateLimitStatus()
    } catch {
      // Ignore errors in final status check
    }

    process.exit(1)
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n\n⚠️  Sync interrupted by user')
  try {
    await checkRateLimitStatus()
  } catch {
    // Ignore
  }
  process.exit(130)
})

// Run
main()
