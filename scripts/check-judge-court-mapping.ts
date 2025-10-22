#!/usr/bin/env tsx
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('\n🔍 Checking Judge-Court Mapping...\n')
  console.log('='.repeat(60))

  // Check if judges have court_id set
  const { count: withCourtId } = await supabase
    .from('judges')
    .select('id', { count: 'exact', head: true })
    .not('court_id', 'is', null)

  // Check if judges have court_name set
  const { count: withCourtName } = await supabase
    .from('judges')
    .select('id', { count: 'exact', head: true })
    .not('court_name', 'is', null)

  // Get total judges
  const { count: totalJudges } = await supabase
    .from('judges')
    .select('id', { count: 'exact', head: true })

  // Get sample judge to see what data it has
  const { data: sampleJudges } = await supabase
    .from('judges')
    .select('id, name, court_id, court_name, jurisdiction')
    .limit(5)

  console.log('\n📊 Judge-Court Mapping Status:')
  console.log(`Total judges: ${totalJudges || 0}`)
  console.log(`Judges with court_id (FK): ${withCourtId || 0}`)
  console.log(`Judges with court_name (string): ${withCourtName || 0}`)

  console.log('\n📋 Sample Judges:')
  sampleJudges?.forEach((j: any) => {
    console.log(`  ${j.name}`)
    console.log(`    court_id: ${j.court_id || 'NULL'}`)
    console.log(`    court_name: ${j.court_name || 'NULL'}`)
    console.log(`    jurisdiction: ${j.jurisdiction || 'NULL'}`)
    console.log()
  })

  console.log('='.repeat(60))
  console.log('\n🔍 DIAGNOSIS:')

  if (withCourtId === 0 && withCourtName && withCourtName > 0) {
    console.log('❌ PROBLEM FOUND:')
    console.log('   - court_id (FK) is NULL for all judges')
    console.log('   - court_name (string) is set')
    console.log('   - This means judges are not linked to courts table!')
    console.log('\n💡 SOLUTION:')
    console.log('   Need to:')
    console.log('   1. Match court_name strings to actual courts in courts table')
    console.log('   2. Set court_id FK on judges table')
    console.log('   3. Create entries in judge_court_positions table')
  } else if (withCourtId && withCourtId > 0) {
    console.log('✅ Judges have court_id foreign keys set')
    console.log('   Now checking judge_court_positions...')
  }

  console.log()
}

main().catch(console.error)
