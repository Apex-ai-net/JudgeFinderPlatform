#!/usr/bin/env tsx
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function quickAnalysis() {
  // Total judges
  const { count: totalJudges } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .eq('jurisdiction', 'CA')

  // Total cases
  const { count: totalCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })

  // Unique judges with cases
  const { data: caseCounts } = await supabase
    .from('cases')
    .select('judge_id')
    .not('judge_id', 'is', null)

  const uniqueJudgesWithCases = new Set(caseCounts?.map(c => c.judge_id)).size

  // Judges without CourtListener ID
  const { count: judgesWithoutCLID } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .eq('jurisdiction', 'CA')
    .is('courtlistener_id', null)

  console.log('📊 QUICK CASE DATA ANALYSIS')
  console.log('=' .repeat(50))
  console.log(`Total CA Judges: ${totalJudges}`)
  console.log(`Total Cases: ${totalCases}`)
  console.log(`Judges with cases: ${uniqueJudgesWithCases} (${Math.round(uniqueJudgesWithCases / totalJudges! * 100)}%)`)
  console.log(`Judges without cases: ${totalJudges! - uniqueJudgesWithCases} (${Math.round((totalJudges! - uniqueJudgesWithCases) / totalJudges! * 100)}%)`)
  console.log(`Judges missing CourtListener ID: ${judgesWithoutCLID}`)
  console.log('=' .repeat(50))

  console.log(`\n💡 WHY JUDGES LACK CASE DATA:`)
  console.log(`\n1. Missing CourtListener ID (${judgesWithoutCLID} judges)`)
  console.log(`   - These judges haven't been matched to CourtListener profiles`)
  console.log(`   - CourtListener sync can't pull cases without an ID`)

  console.log(`\n2. CourtListener has no recent cases (~${totalJudges! - uniqueJudgesWithCases - judgesWithoutCLID!} judges)`)
  console.log(`   - Judge is retired/inactive`)
  console.log(`   - Judge handles non-published cases (e.g., family court)`)
  console.log(`   - CourtListener coverage gaps for that jurisdiction`)

  console.log(`\n3. Cases haven't been synced yet (background jobs running)`)
  console.log(`   - Rate limits slow down case ingestion (5,000 req/hr)`)
  console.log(`   - Sync jobs are still processing`)

  console.log(`\n✅ WHAT'S WORKING:`)
  console.log(`   - ${uniqueJudgesWithCases} judges have case data (${Math.round(uniqueJudgesWithCases / totalJudges! * 100)}% coverage)`)
  console.log(`   - ${totalCases} total cases ingested`)
  console.log(`   - Analytics being generated from existing cases`)
}

quickAnalysis()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
