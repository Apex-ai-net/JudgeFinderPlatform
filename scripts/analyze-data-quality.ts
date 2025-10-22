#!/usr/bin/env tsx
/**
 * Analyze Database Data Quality
 * Check if judges and courts have real data vs placeholders
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

  console.log('\n🔍 Analyzing Database Data Quality...\n')
  console.log('='.repeat(60))

  // Check California courts specifically
  const { data: caCourts, count: caCourtCount } = await supabase
    .from('courts')
    .select('*', { count: 'exact' })
    .or('jurisdiction.eq.california,jurisdiction.eq.CA,jurisdiction.ilike.%california%')

  console.log('\n📍 California Courts:')
  console.log(`Total: ${caCourtCount || 0}`)

  if (caCourts && caCourts.length > 0) {
    console.log('\nSample CA Courts:')
    caCourts.slice(0, 3).forEach((c: any) => {
      console.log(`  ${c.name}`)
      console.log(`    ID: ${c.id}`)
      console.log(`    Jurisdiction: ${c.jurisdiction}`)
      console.log(`    In Use: ${c.in_use}`)
      console.log()
    })
  }

  // Check judges with actual data (not placeholders)
  const { data: judgesWithData, count: judgesWithDataCount } = await supabase
    .from('judges')
    .select('id, name, biography, education, total_cases, created_at', { count: 'exact' })
    .not('name', 'is', null)
    .limit(5)

  console.log('\n⚖️  Judges Analysis:')
  console.log(`Total judges in DB: ${judgesWithDataCount}`)

  // Check how many have biography data
  const { count: judgesWithBio } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('biography', 'is', null)
    .neq('biography', '')

  console.log(`Judges with biography: ${judgesWithBio || 0}`)

  // Check how many have case data
  const { count: judgesWithCases } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .gt('total_cases', 0)

  console.log(`Judges with cases: ${judgesWithCases || 0}`)

  // Sample judges
  if (judgesWithData && judgesWithData.length > 0) {
    console.log('\nSample Judges:')
    judgesWithData.forEach((j: any) => {
      console.log(`  ${j.name}`)
      console.log(`    Cases: ${j.total_cases || 0}`)
      console.log(`    Bio: ${j.biography ? 'Yes' : 'No'}`)
      console.log(`    Created: ${new Date(j.created_at).toLocaleDateString()}`)
      console.log()
    })
  }

  // Check case data
  const { count: totalCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })

  console.log('\n📋 Cases:')
  console.log(`Total cases: ${totalCases || 0}`)

  // Check judge_court_positions (critical for showing judges)
  const { count: positions } = await supabase
    .from('judge_court_positions')
    .select('*', { count: 'exact', head: true })

  console.log('\n🏛️  Judge-Court Positions:')
  console.log(`Total positions: ${positions || 0}`)

  // Check for California judges specifically
  const { data: caJudgePositions, count: caJudgeCount } = await supabase
    .from('judge_court_positions')
    .select(`
      judge_id,
      court_id,
      courts!inner (
        id,
        name,
        jurisdiction
      )
    `, { count: 'exact' })
    .or('courts.jurisdiction.eq.california,courts.jurisdiction.eq.CA', { foreignTable: 'courts' })
    .limit(5)

  console.log(`California judge positions: ${caJudgeCount || 0}`)

  if (caJudgePositions && caJudgePositions.length > 0) {
    console.log('\nSample CA Judge Assignments:')
    caJudgePositions.forEach((p: any) => {
      console.log(`  Judge: ${p.judge_id}`)
      console.log(`  Court: ${p.courts?.name || 'Unknown'}`)
      console.log()
    })
  }

  console.log('='.repeat(60))

  // Summary
  console.log('\n📊 SUMMARY:')
  console.log(`✓ ${caCourtCount || 0} California courts`)
  console.log(`✓ ${caJudgeCount || 0} California judge positions`)
  console.log(`✓ ${judgesWithCases || 0} judges with case data`)
  console.log(`✓ ${totalCases || 0} total cases`)

  const dataQuality = ((judgesWithCases || 0) / (judgesWithDataCount || 1)) * 100
  console.log(`\n🎯 Data Quality Score: ${dataQuality.toFixed(1)}%`)

  if (dataQuality < 10) {
    console.log('\n⚠️  WARNING: Very low data quality!')
    console.log('   Most judges have no case data.')
    console.log('   Recommendation: Run data sync')
  } else if (dataQuality < 50) {
    console.log('\n⚠️  CAUTION: Moderate data quality')
    console.log('   Some judges missing case data.')
  } else {
    console.log('\n✅ Good data quality')
  }

  console.log()
}

main().catch(console.error)
