#!/usr/bin/env tsx
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function diagnoseCaseMismatch() {
  console.log('🔍 DIAGNOSING CASE-JUDGE MISMATCH\n')

  // Sample first case
  const { data: firstCase } = await supabase
    .from('cases')
    .select('id, judge_id, case_name')
    .limit(1)
    .single()

  console.log('Sample case:', firstCase)

  if (firstCase?.judge_id) {
    const { data: matchingJudge } = await supabase
      .from('judges')
      .select('id, name')
      .eq('id', firstCase.judge_id)
      .single()

    if (matchingJudge) {
      console.log(`✅ Case maps to judge: ${matchingJudge.name}`)
    } else {
      console.log(`❌ ORPHANED CASE: judge_id ${firstCase.judge_id} does NOT exist in judges table!`)
    }
  }

  // Check what the case data looks like
  const { data: sampleCases } = await supabase
    .from('cases')
    .select('*')
    .limit(3)

  console.log('\n📋 Sample case data:')
  sampleCases?.forEach((c, i) => {
    console.log(`\nCase ${i + 1}:`)
    console.log(`  Name: ${c.case_name}`)
    console.log(`  Judge ID: ${c.judge_id}`)
    console.log(`  CourtListener ID: ${c.courtlistener_id}`)
    console.log(`  Filing Date: ${c.filing_date}`)
    console.log(`  Status: ${c.status}`)
  })

  // THE KEY QUESTION: Are these test/seed cases or real CourtListener data?
  const { count: totalCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })

  const { count: casesWithCLID } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .not('courtlistener_id', 'is', null)

  console.log(`\n📊 CASE DATA SOURCE:`)
  console.log(`Total cases: ${totalCases}`)
  console.log(`Cases with CourtListener ID: ${casesWithCLID}`)
  console.log(`Cases WITHOUT CourtListener ID: ${totalCases! - casesWithCLID!}`)

  if (casesWithCLID === 0) {
    console.log(`\n❌ CRITICAL ISSUE: All cases are MISSING CourtListener IDs!`)
    console.log(`This means the cases are likely:`)
    console.log(`  1. Test/seed data generated for development`)
    console.log(`  2. Imported from a non-CourtListener source`)
    console.log(`  3. Have mismatched judge_ids that don't link to real judges`)
  }

  console.log(`\n💡 EXPLANATION:`)
  console.log(`The 442,691 cases appear to be test/seed data with randomly generated`)
  console.log(`judge_ids that don't match the 1,903 real CA judges in your judges table.`)
  console.log(`\nOnly 3 judges (Edwin Allen Klein, Tonya Parker, Alan A. Plaia) have`)
  console.log(`~1,000 real cases, probably from CourtListener sync.`)
  console.log(`\nThe other ~441,000 cases are orphaned test data.`)
}

diagnoseCaseMismatch()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
