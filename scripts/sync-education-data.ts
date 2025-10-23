#!/usr/bin/env ts-node
/**
 * Sync Education Data from CourtListener
 *
 * Fills in missing education data for judges (currently 86.7% are missing it)
 * Rate-limited to respect CourtListener's 5,000 req/hr limit
 *
 * Usage:
 *   npm run sync:education           # Sync all judges missing education
 *   npm run sync:education -- --all  # Force sync all judges (even with data)
 *   npm run sync:education -- --limit 50  # Sync only 50 judges
 *
 * Safety:
 *   - Default: 10 judges/batch, 1.5s delay between requests
 *   - Rate: ~24 judges/min = 1,440/hr (well under 5,000/hr limit)
 *   - Can sync ~1,600 judges in ~70 minutes safely
 */

import { createClient } from '@supabase/supabase-js'
import { EducationSyncManager } from '../lib/courtlistener/education-sync'
import { CourtListenerClient } from '../lib/courtlistener/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL in environment')
  process.exit(1)
}

if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const clClient = new CourtListenerClient()
const syncManager = new EducationSyncManager(supabase, clClient)

async function main() {
  const args = process.argv.slice(2)
  const skipIfExists = !args.includes('--all')
  const limitArg = args.find(arg => arg.startsWith('--limit'))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  console.log('🎓 CourtListener Education Sync')
  console.log('━'.repeat(60))
  console.log(`Mode: ${skipIfExists ? 'Only missing data' : 'Force all'}`)
  console.log(`Limit: ${limit || 'No limit'}`)
  console.log(`Rate: ~24 judges/min (1,440/hr - safe under 5k/hr quota)`)
  console.log('━'.repeat(60))
  console.log()

  // Count judges needing sync
  let query = supabase
    .from('judges')
    .select('id', { count: 'exact', head: true })
    .not('courtlistener_id', 'is', null)

  if (skipIfExists) {
    query = query.or('education.is.null,education.eq.""')
  }

  const { count } = await query

  console.log(`📊 Judges to process: ${count}`)
  console.log(`⏱️  Estimated time: ${Math.round((count || 0) / 24)} minutes\n`)

  if ((count || 0) > 500) {
    console.log('⚠️  Large batch detected!')
    console.log('   Consider running in smaller batches with --limit=100')
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  const startTime = Date.now()

  const result = await syncManager.syncEducation({
    skipIfExists,
    batchSize: 10,
    delayMs: 2000,
  })

  const durationMin = Math.round((Date.now() - startTime) / 60000)

  console.log('\n━'.repeat(60))
  console.log('📊 SYNC COMPLETE')
  console.log('━'.repeat(60))
  console.log(`✅ Success: ${result.success}`)
  console.log(`📝 Processed: ${result.judgesProcessed} judges`)
  console.log(`✏️  Updated: ${result.judgesUpdated} judges`)
  console.log(`⏭️  Skipped: ${result.judgesSkipped} judges (no data)`)
  console.log(`❌ Errors: ${result.errors.length}`)
  console.log(`⏱️  Duration: ${durationMin} minutes`)
  console.log('━'.repeat(60))

  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    result.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more`)
    }
  }

  console.log('\n💡 Next steps:')
  console.log('   • Run scripts/final-cl-audit.js to verify data')
  console.log('   • Check updated judge profiles in dashboard')
  console.log('   • Consider syncing political affiliations next\n')

  process.exit(result.success ? 0 : 1)
}

main().catch(error => {
  console.error('❌ Sync failed:', error)
  process.exit(1)
})
