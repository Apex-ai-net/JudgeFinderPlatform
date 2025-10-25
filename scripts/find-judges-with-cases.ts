#!/usr/bin/env tsx
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function findJudgesWithCases() {
  console.log('🔍 Finding ALL judges with linked case data...\n')

  // Get ALL judges (not just first 1000)
  const { data: allJudges } = await supabase
    .from('judges')
    .select('id, name, courtlistener_id')
    .eq('jurisdiction', 'CA')
    .order('name')
    .limit(2000) // Get more than the 1000 limit

  console.log(`Total CA judges queried: ${allJudges?.length || 0}`)

  // For each judge, check if they have cases
  const judgesWithCases = []
  const judgesWithoutCases = []

  console.log('\n⏳ Checking case links for each judge...')

  for (let i = 0; i < (allJudges?.length || 0); i++) {
    const judge = allJudges![i]

    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('judge_id', judge.id)

    if (count && count > 0) {
      judgesWithCases.push({ ...judge, caseCount: count })
    } else {
      judgesWithoutCases.push(judge)
    }

    if ((i + 1) % 100 === 0) {
      console.log(`   Processed ${i + 1}/${allJudges?.length} judges...`)
    }
  }

  console.log(`\n📊 RESULTS:`)
  console.log(`✅ Judges WITH cases: ${judgesWithCases.length}`)
  console.log(`❌ Judges WITHOUT cases: ${judgesWithoutCases.length}`)

  // Show top 20 judges by case count
  const topJudges = judgesWithCases
    .sort((a, b) => b.caseCount - a.caseCount)
    .slice(0, 20)

  console.log(`\n🏆 Top 20 judges by case count:`)
  topJudges.forEach((j, i) => {
    console.log(`${i + 1}. ${j.name}: ${j.caseCount} cases (CLID: ${j.courtlistener_id || 'none'})`)
  })

  // Total cases across all judges
  const totalCasesLinked = judgesWithCases.reduce((sum, j) => sum + j.caseCount, 0)
  console.log(`\n📈 Total cases linked to judges: ${totalCasesLinked}`)

  // Get total cases in database
  const { count: totalCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total cases in database: ${totalCases}`)
  console.log(`⚠️  Orphaned cases (not linked): ${totalCases! - totalCasesLinked}`)

  // Check what's happening with the orphaned cases
  if (totalCases! - totalCasesLinked > 0) {
    console.log(`\n🔍 Investigating orphaned cases...`)

    // Get a sample of orphaned case judge_ids
    const { data: sampleCases } = await supabase
      .from('cases')
      .select('judge_id')
      .limit(1000)

    const caseJudgeIds = new Set(sampleCases?.map(c => c.judge_id).filter(Boolean))
    const judgeTableIds = new Set(allJudges?.map(j => j.id))

    let orphanedCount = 0
    for (const caseJudgeId of caseJudgeIds) {
      if (!judgeTableIds.has(caseJudgeId)) {
        orphanedCount++
      }
    }

    console.log(`Sample analysis (1000 cases):`)
    console.log(`  - Unique judge_ids in cases: ${caseJudgeIds.size}`)
    console.log(`  - Judge_ids NOT in judges table: ${orphanedCount}`)

    if (orphanedCount > 0) {
      console.log(`\n❌ CRITICAL ISSUE: Cases have judge_ids that don't exist in the judges table!`)
      console.log(`This explains why ${totalCases! - totalCasesLinked} cases appear orphaned.`)
    }
  }
}

findJudgesWithCases()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
