#!/usr/bin/env ts-node
/**
 * Sync Political Affiliation Data from CourtListener
 *
 * Fills in missing political party affiliation data for judges
 * Rate-limited to respect CourtListener's 5,000 req/hr limit
 *
 * Usage:
 *   npm run sync:political           # Sync all judges missing affiliation
 *   npm run sync:political -- --all  # Force sync all judges (even with data)
 *   npm run sync:political -- --limit 50  # Sync only 50 judges
 *   npm run sync:political -- --history  # Include historical affiliations
 *
 * Safety:
 *   - Default: 10 judges/batch, 1.5s delay between requests
 *   - Rate: ~24 judges/min = 1,440/hr (well under 5,000/hr limit)
 *   - Can sync ~1,600 judges in ~70 minutes safely
 */

import { createClient } from '@supabase/supabase-js'
import { PoliticalAffiliationSyncManager } from '../lib/courtlistener/political-affiliation-sync'
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
const syncManager = new PoliticalAffiliationSyncManager(supabase, clClient)

async function main() {
  const args = process.argv.slice(2)
  const skipIfExists = !args.includes('--all')
  const includeHistorical = args.includes('--history')
  const limitArg = args.find(arg => arg.startsWith('--limit'))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  console.log('🎉 CourtListener Political Affiliation Sync')
  console.log('━'.repeat(60))
  console.log(`Mode: ${skipIfExists ? 'Only missing data' : 'Force all'}`)
  console.log(`History: ${includeHistorical ? 'Include historical' : 'Current only'}`)
  console.log(`Limit: ${limit || 'No limit'}`)
  console.log(`Rate: ~24 judges/min (1,440/hr - safe under 5k/hr quota)`)
  console.log('━'.repeat(60))
  console.log()

  // First check if political_affiliation column exists
  const { data: columns, error: columnError } = await supabase
    .rpc('get_table_columns', { table_name: 'judges' })
    .select('*')

  if (columnError) {
    // Fallback: try to query the column directly
    const { error: testError } = await supabase
      .from('judges')
      .select('political_affiliation')
      .limit(1)

    if (testError && testError.message.includes('column')) {
      console.log('⚠️  Column "political_affiliation" does not exist!')
      console.log('   Run this migration first:')
      console.log()
      console.log('   ALTER TABLE judges ADD COLUMN political_affiliation VARCHAR(100);')
      console.log()
      console.log('   Or run: npm run migrate:political-affiliation')
      process.exit(1)
    }
  }

  // Count judges needing sync
  let query = supabase
    .from('judges')
    .select('id', { count: 'exact', head: true })
    .not('courtlistener_id', 'is', null)

  if (skipIfExists) {
    query = query.or('political_affiliation.is.null,political_affiliation.eq.""')
  }

  if (limit) {
    query = query.limit(limit)
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

  const result = await syncManager.syncPoliticalAffiliations({
    skipIfExists,
    includeHistorical,
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

  if (result.stats) {
    console.log('\n📊 Party Affiliation Breakdown:')
    console.log(`   Democratic: ${result.stats.democraticCount}`)
    console.log(`   Republican: ${result.stats.republicanCount}`)
    console.log(`   Independent: ${result.stats.independentCount}`)
    console.log(`   Other: ${result.stats.otherCount}`)
    console.log(`   No Data: ${result.stats.noDataCount}`)
  }

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
  console.log('   • Review party affiliation distribution')
  console.log('   • Consider updating UI to display affiliations\n')

  process.exit(result.success ? 0 : 1)
}

main().catch(error => {
  console.error('❌ Sync failed:', error)
  process.exit(1)
})