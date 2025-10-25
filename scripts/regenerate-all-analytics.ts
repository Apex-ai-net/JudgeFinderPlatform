#!/usr/bin/env npx tsx
/**
 * Regenerate All Judge Analytics
 *
 * Regenerates analytics for all judges with the correct data structure.
 * Processes judges in batches to avoid overwhelming the system.
 *
 * Usage:
 *   npx tsx scripts/regenerate-all-analytics.ts [--limit=N] [--batch-size=N]
 *
 * Options:
 *   --limit=N        Only process N judges (for testing)
 *   --batch-size=N   Process N judges per batch (default: 10)
 *   --dry-run        Show what would be done without doing it
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SYNC_API_KEY = process.env.SYNC_API_KEY || process.env.CRON_SECRET

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!SYNC_API_KEY) {
  console.error('❌ Missing SYNC_API_KEY or CRON_SECRET for API authentication')
  process.exit(1)
}

// Parse command line args
const args = process.argv.slice(2)
const limitArg = args.find((arg) => arg.startsWith('--limit='))
const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='))
const dryRun = args.includes('--dry-run')

const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined
const BATCH_SIZE = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10
const DELAY_BETWEEN_REQUESTS = 500 // ms between individual judge analytics generations
const DELAY_BETWEEN_BATCHES = 2000 // ms between batches

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function regenerateAnalytics() {
  console.log('🔄 Starting analytics regeneration...\n')

  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  try {
    // Get all judges with cases
    let query = supabase
      .from('judges')
      .select('id, name, total_cases')
      .order('total_cases', { ascending: false })
      .gt('total_cases', 0)

    if (LIMIT) {
      query = query.limit(LIMIT)
      console.log(`📊 Limiting to ${LIMIT} judges (top by case count)\n`)
    }

    const { data: judges, error: judgesError } = await query

    if (judgesError) {
      throw new Error(`Failed to fetch judges: ${judgesError.message}`)
    }

    if (!judges || judges.length === 0) {
      console.log('ℹ️  No judges found with cases')
      return
    }

    console.log(`📊 Found ${judges.length} judges to process`)
    console.log(`⚙️  Batch size: ${BATCH_SIZE}`)
    console.log(`⏱️  Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`)
    console.log(`⏱️  Delay between batches: ${DELAY_BETWEEN_BATCHES}ms\n`)

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ judge: string; error: string }> = []

    // Process in batches
    for (let i = 0; i < judges.length; i += BATCH_SIZE) {
      const batch = judges.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(judges.length / BATCH_SIZE)

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} judges)`)
      console.log('─'.repeat(60))

      for (const judge of batch) {
        try {
          if (dryRun) {
            console.log(`  🧪 Would regenerate: ${judge.name} (${judge.total_cases} cases)`)
            successCount++
            await sleep(100) // Small delay for readability
          } else {
            // Call the analytics API with force=true to regenerate
            const url = `http://localhost:3000/api/judges/${judge.id}/analytics?force=true`
            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': SYNC_API_KEY,
              },
            })

            if (!response.ok) {
              const errorText = await response.text()
              throw new Error(`HTTP ${response.status}: ${errorText}`)
            }

            const result = await response.json()

            console.log(
              `  ✅ ${judge.name} (${judge.total_cases} cases) - Confidence: ${result.analytics?.overall_confidence || 'N/A'}%`
            )
            successCount++

            // Rate limiting delay
            await sleep(DELAY_BETWEEN_REQUESTS)
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.log(`  ❌ ${judge.name}: ${errorMsg}`)
          errorCount++
          errors.push({ judge: judge.name, error: errorMsg })
        }
      }

      // Delay between batches (except for last batch)
      if (i + BATCH_SIZE < judges.length) {
        console.log(`\n⏸️  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`)
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(60))
    console.log('📊 REGENERATION SUMMARY')
    console.log('═'.repeat(60))
    console.log(`✅ Successful: ${successCount}`)
    console.log(`❌ Failed: ${errorCount}`)
    console.log(`📈 Success Rate: ${((successCount / judges.length) * 100).toFixed(1)}%`)

    if (errors.length > 0 && errors.length <= 10) {
      console.log('\n❌ Errors:')
      errors.forEach(({ judge, error }) => {
        console.log(`  • ${judge}: ${error}`)
      })
    } else if (errors.length > 10) {
      console.log(`\n❌ ${errors.length} errors occurred (showing first 10):`)
      errors.slice(0, 10).forEach(({ judge, error }) => {
        console.log(`  • ${judge}: ${error}`)
      })
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

regenerateAnalytics()
  .then(() => {
    console.log('\n✅ Regeneration complete!')
    if (!dryRun) {
      console.log('\n💡 Tip: Analytics are now cached and will be served from cache')
      console.log('   on subsequent requests until manually refreshed.')
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
