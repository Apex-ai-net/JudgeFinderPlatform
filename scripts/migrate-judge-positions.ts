#!/usr/bin/env tsx
/**
 * Migrate Judge Positions
 *
 * Populates judge_court_positions junction table from existing judges.court_id data.
 * This is a one-time migration to fix the empty junction table issue.
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('\n🔄 Migrating Judge-Court Positions...\n')
  console.log('='.repeat(60))

  // Get all judges with court_id set (with pagination to handle >1000 records)
  let allJudges: any[] = []
  let from = 0
  const pageSize = 1000

  while (true) {
    const { data: judges, error: judgesError } = await supabase
      .from('judges')
      .select('id, name, court_id, appointed_date')
      .not('court_id', 'is', null)
      .range(from, from + pageSize - 1)

    if (judgesError) {
      console.error('❌ Failed to fetch judges:', judgesError.message)
      process.exit(1)
    }

    if (!judges || judges.length === 0) break

    allJudges = allJudges.concat(judges)
    console.log(`📄 Fetched ${allJudges.length} judges so far...`)

    if (judges.length < pageSize) break
    from += pageSize
  }

  const judges = allJudges

  console.log(`\n📊 Found ${judges?.length || 0} judges with court assignments\n`)

  if (!judges || judges.length === 0) {
    console.log('⚠️  No judges to migrate')
    process.exit(0)
  }

  // Check existing positions to avoid duplicates
  const { data: existingPositions } = await supabase
    .from('judge_court_positions')
    .select('judge_id, court_id')

  const existingSet = new Set(
    existingPositions?.map(p => `${p.judge_id}:${p.court_id}`) || []
  )

  console.log(`📌 Existing positions: ${existingSet.size}`)

  // Prepare positions to insert
  const positionsToInsert = judges
    .filter(j => !existingSet.has(`${j.id}:${j.court_id}`))
    .map(judge => ({
      judge_id: judge.id,
      court_id: judge.court_id,
      position_type: inferPositionType(judge.name),
      status: inferStatus(judge.name),
      start_date: judge.appointed_date || null,
      end_date: null, // Active positions have no end date
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

  console.log(`\n➕ New positions to create: ${positionsToInsert.length}\n`)

  if (positionsToInsert.length === 0) {
    console.log('✅ All positions already exist - nothing to migrate')
    console.log('='.repeat(60))
    process.exit(0)
  }

  // Insert in batches to avoid overwhelming the database
  const batchSize = 100
  let inserted = 0
  let failed = 0

  for (let i = 0; i < positionsToInsert.length; i += batchSize) {
    const batch = positionsToInsert.slice(i, i + batchSize)

    console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(positionsToInsert.length / batchSize)}...`)

    const { error } = await supabase
      .from('judge_court_positions')
      .insert(batch)

    if (error) {
      console.error(`   ❌ Batch failed:`, error.message)
      failed += batch.length
    } else {
      console.log(`   ✅ Inserted ${batch.length} positions`)
      inserted += batch.length
    }

    // Small delay between batches
    if (i + batchSize < positionsToInsert.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 MIGRATION COMPLETE:')
  console.log(`   ✅ Inserted: ${inserted}`)
  if (failed > 0) {
    console.log(`   ❌ Failed: ${failed}`)
  }
  console.log(`   📌 Skipped (existing): ${existingSet.size}`)
  console.log(`   📈 Total positions: ${inserted + existingSet.size}`)
  console.log('='.repeat(60) + '\n')

  // Verify the migration
  const { count: finalCount } = await supabase
    .from('judge_court_positions')
    .select('*', { count: 'exact', head: true })

  console.log('🔍 Verification:')
  console.log(`   Final judge_court_positions count: ${finalCount || 0}`)
  console.log()

  if (failed > 0) {
    console.error('⚠️  Some positions failed to insert. Check errors above.')
    process.exit(1)
  }

  console.log('✅ Migration successful!\n')
}

/**
 * Infer position type from judge name
 */
function inferPositionType(judgeName: string): string {
  const name = judgeName.toLowerCase()

  if (name.includes('chief')) {
    return 'Chief Judge'
  } else if (name.includes('presiding')) {
    return 'Presiding Judge'
  } else if (name.includes('commissioner')) {
    return 'Commissioner'
  } else if (name.includes('magistrate')) {
    return 'Magistrate Judge'
  } else if (name.includes('senior')) {
    return 'Senior Judge'
  } else if (name.includes('acting')) {
    return 'Acting Judge'
  } else {
    return 'Judge'
  }
}

/**
 * Infer status from judge name/data
 */
function inferStatus(judgeName: string): string {
  const name = judgeName.toLowerCase()

  if (name.includes('retired') || name.includes('emeritus')) {
    return 'retired'
  } else if (name.includes('inactive')) {
    return 'inactive'
  } else {
    return 'active'
  }
}

main().catch(console.error)
