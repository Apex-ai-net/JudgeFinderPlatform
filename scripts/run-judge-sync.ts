#!/usr/bin/env tsx
/**
 * Direct Judge Sync Runner
 * Bypasses the module-alias complexity by directly importing TypeScript
 */

import 'dotenv/config'
import { JudgeSyncManager } from '../lib/sync/judge-sync'

async function main() {
  const batchSize = Number(process.env.BATCH_SIZE) || 10
  const discoverLimit = Number(process.env.DISCOVER_LIMIT) || 500
  const forceRefresh = process.env.FORCE_REFRESH === 'true'

  console.log('🔄 Starting California judges sync...')
  console.log('📊 Configuration:', { batchSize, discoverLimit, forceRefresh })
  console.log('')

  const manager = new JudgeSyncManager()

  try {
    const result = await manager.syncJudges({
      jurisdiction: 'CA',
      batchSize,
      discoverLimit,
      forceRefresh,
    })

    console.log('')
    console.log('✅ Sync completed successfully!')
    console.log('📊 Results:')
    console.log(`  - Judges processed: ${result.judgesProcessed}`)
    console.log(`  - Judges created: ${result.judgesCreated}`)
    console.log(`  - Judges updated: ${result.judgesUpdated}`)
    console.log(`  - Judges retired: ${result.judgesRetired}`)
    console.log(`  - Profiles enhanced: ${result.profilesEnhanced}`)
    console.log(`  - Duration: ${Math.round(result.duration / 1000)}s`)
    console.log(`  - Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log('')
      console.log('⚠️  Errors encountered:')
      result.errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`)
      })
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more`)
      }
    }

    process.exit(result.success ? 0 : 1)
  } catch (error) {
    console.error('❌ Fatal error during sync:', error)
    process.exit(1)
  }
}

main()
