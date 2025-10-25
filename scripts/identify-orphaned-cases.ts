#!/usr/bin/env tsx
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function identifyOrphanedCases() {
  console.log('🔍 IDENTIFYING ORPHANED CASES\n')

  // Get all valid judge IDs from judges table
  const { data: allJudges } = await supabase
    .from('judges')
    .select('id, name, courtlistener_id')
    .eq('jurisdiction', 'CA')
    .limit(2000)

  const validJudgeIds = new Set(allJudges?.map(j => j.id))
  console.log(`✅ Valid judge IDs in judges table: ${validJudgeIds.size}`)

  // Sample a large number of cases to find orphaned judge_ids
  console.log(`\n📊 Sampling cases to identify orphaned judge_ids...`)
  const { data: sampleCases } = await supabase
    .from('cases')
    .select('judge_id')
    .limit(50000) // Large sample

  const caseJudgeIds = new Map<string, number>()
  sampleCases?.forEach(c => {
    if (c.judge_id) {
      caseJudgeIds.set(c.judge_id, (caseJudgeIds.get(c.judge_id) || 0) + 1)
    }
  })

  console.log(`📋 Unique judge_ids in sample: ${caseJudgeIds.size}`)

  // Separate valid and orphaned
  const orphanedJudgeIds: { id: string; count: number }[] = []
  const validJudgeIdCounts: { id: string; count: number; name?: string }[] = []

  for (const [judgeId, count] of caseJudgeIds.entries()) {
    if (!validJudgeIds.has(judgeId)) {
      orphanedJudgeIds.push({ id: judgeId, count })
    } else {
      const judge = allJudges?.find(j => j.id === judgeId)
      validJudgeIdCounts.push({ id: judgeId, count, name: judge?.name })
    }
  }

  console.log(`\n📊 ANALYSIS RESULTS:`)
  console.log(`✅ Valid judge_ids: ${validJudgeIdCounts.length}`)
  console.log(`❌ Orphaned judge_ids: ${orphanedJudgeIds.length}`)

  if (orphanedJudgeIds.length > 0) {
    console.log(`\n❌ ORPHANED JUDGE_IDS (from 50k sample):`)
    orphanedJudgeIds.forEach(({ id, count }) => {
      console.log(`   ${id}: ${count} cases`)
    })

    // Get actual count for each orphaned judge_id
    console.log(`\n🔍 Getting full counts for orphaned judge_ids...`)
    for (const orphan of orphanedJudgeIds) {
      const { count } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('judge_id', orphan.id)

      console.log(`   ${orphan.id}: ${count} total cases (ORPHANED)`)

      // Get sample case data to understand what these are
      const { data: sampleOrphanedCases } = await supabase
        .from('cases')
        .select('id, case_name, courtlistener_id, filing_date')
        .eq('judge_id', orphan.id)
        .limit(5)

      console.log(`   Sample cases for ${orphan.id}:`)
      sampleOrphanedCases?.forEach(c => {
        console.log(`     - ${c.case_name} (CL ID: ${c.courtlistener_id || 'none'}) - Filed: ${c.filing_date}`)
      })
    }
  }

  // Show valid judge_ids with most cases
  console.log(`\n✅ TOP 10 VALID JUDGES BY CASE COUNT (in sample):`)
  validJudgeIdCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .forEach(({ name, count }, i) => {
      console.log(`${i + 1}. ${name}: ${count} cases`)
    })

  console.log(`\n💡 RECOMMENDATIONS:`)
  if (orphanedJudgeIds.length === 0) {
    console.log(`✅ No orphaned judge_ids found! All cases properly linked.`)
  } else {
    console.log(`\n1. IDENTIFY SOURCE: Check if orphaned judge_ids are from:`)
    console.log(`   - Old database migration`)
    console.log(`   - Deleted judges`)
    console.log(`   - Test/seed data`)
    console.log(`\n2. OPTIONS:`)
    console.log(`   A) DELETE: Remove orphaned cases if they're test data`)
    console.log(`   B) REMAP: If you can identify correct judges, remap judge_ids`)
    console.log(`   C) KEEP: Leave as-is if they're valid but judges not yet imported`)
  }
}

identifyOrphanedCases()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
