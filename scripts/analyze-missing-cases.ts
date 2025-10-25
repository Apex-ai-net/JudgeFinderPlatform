#!/usr/bin/env tsx
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function analyzeMissingCases() {
  console.log('🔍 Analyzing why judges lack case data...\n')

  // Get total judges
  const { count: totalJudges } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .eq('jurisdiction', 'CA')

  console.log(`📊 Total CA Judges: ${totalJudges}`)

  // Get judges WITH cases
  const { data: judgesWithCases } = await supabase
    .from('judges')
    .select('id, name, courtlistener_id')
    .eq('jurisdiction', 'CA')
    .limit(2000)

  const judgesWithCaseData = []
  const judgesWithoutCaseData = []

  for (const judge of judgesWithCases || []) {
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('judge_id', judge.id)

    if (count && count > 0) {
      judgesWithCaseData.push({ ...judge, caseCount: count })
    } else {
      judgesWithoutCaseData.push(judge)
    }
  }

  console.log(`✅ Judges WITH cases: ${judgesWithCaseData.length}`)
  console.log(`❌ Judges WITHOUT cases: ${judgesWithoutCaseData.length}`)

  // Check CourtListener ID coverage
  const judgesWithoutCLID = judgesWithoutCaseData.filter(j => !j.courtlistener_id)
  const judgesWithCLIDButNoCases = judgesWithoutCaseData.filter(j => j.courtlistener_id)

  console.log(`\n🔍 Breakdown of judges WITHOUT cases:`)
  console.log(`   - Missing CourtListener ID: ${judgesWithoutCLID.length}`)
  console.log(`   - Have CourtListener ID but no cases: ${judgesWithCLIDButNoCases.length}`)

  // Sample judges with CourtListener ID but no cases
  if (judgesWithCLIDButNoCases.length > 0) {
    console.log(`\n📋 Sample judges with CLID but no cases (first 10):`)
    judgesWithCLIDButNoCases.slice(0, 10).forEach(j => {
      console.log(`   - ${j.name} (CLID: ${j.courtlistener_id})`)
    })
  }

  // Sample judges without CourtListener ID
  if (judgesWithoutCLID.length > 0) {
    console.log(`\n📋 Sample judges WITHOUT CourtListener ID (first 10):`)
    judgesWithoutCLID.slice(0, 10).forEach(j => {
      console.log(`   - ${j.name}`)
    })
  }

  // Check case sync status
  const { data: syncedJudges } = await supabase
    .from('judges')
    .select('id, name, courtlistener_data')
    .eq('jurisdiction', 'CA')
    .not('courtlistener_data', 'is', null)
    .limit(5)

  console.log(`\n🔄 Judges with CourtListener sync data: ${syncedJudges?.length || 0}`)

  // Summary
  console.log(`\n📊 SUMMARY:`)
  console.log(`==========================================`)
  console.log(`Total CA Judges: ${totalJudges}`)
  console.log(`Judges with case data: ${judgesWithCaseData.length} (${Math.round(judgesWithCaseData.length / totalJudges! * 100)}%)`)
  console.log(`Judges without case data: ${judgesWithoutCaseData.length} (${Math.round(judgesWithoutCaseData.length / totalJudges! * 100)}%)`)
  console.log(`==========================================`)
  console.log(`\n💡 Reasons judges might lack cases:`)
  console.log(`1. Missing CourtListener ID (${judgesWithoutCLID.length} judges)`)
  console.log(`2. CourtListener has no cases for them (${judgesWithCLIDButNoCases.length} judges)`)
  console.log(`3. Cases haven't been synced yet (check background sync jobs)`)
}

analyzeMissingCases()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
