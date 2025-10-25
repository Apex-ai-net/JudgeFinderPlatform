#!/usr/bin/env tsx
/**
 * Comprehensive Judge Data Completeness Analysis
 * Analyzes California judge coverage and data quality
 * Checks: CourtListener IDs, court assignments, cases, education, positions
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(__dirname, '../.env.local') })

import { createClient } from '@supabase/supabase-js'

interface JudgeStats {
  total: number
  withCourtListenerIds: number
  withCourtAssignments: number
  withEducation: number
  withPoliticalAffiliation: number
  withPositions: number
  withCases: number
  analyticsReady: number // 500+ cases
}

interface SyncProgressStats {
  total: number
  complete: number
  analyticsReady: number
  inDiscovery: number
  inPositions: number
  inDetails: number
  inOpinions: number
  inDockets: number
  withErrors: number
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  console.log('\n' + '='.repeat(80))
  console.log('📊 CALIFORNIA JUDGE DATA COMPLETENESS ANALYSIS')
  console.log('='.repeat(80) + '\n')

  // ==================== BASIC JUDGE COUNTS ====================
  console.log('1️⃣  JUDGE COVERAGE\n')

  // Total judges
  const { count: totalJudges } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })

  console.log(`   Total Judges in Database: ${totalJudges || 0}`)

  // California judges (check jurisdiction field)
  const { count: caJudgesCount } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .or('jurisdiction.eq.california,jurisdiction.eq.CA,jurisdiction.ilike.%california%')

  console.log(`   California Judges: ${caJudgesCount || 0}`)

  // ==================== COURTLISTENER INTEGRATION ====================
  console.log('\n2️⃣  COURTLISTENER INTEGRATION STATUS\n')

  // Judges with CourtListener IDs
  const { count: withCLIds } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('courtlistener_id', 'is', null)

  const clIdPercent = totalJudges ? ((withCLIds || 0) / totalJudges * 100).toFixed(1) : '0'
  console.log(`   Judges with CourtListener IDs: ${withCLIds || 0} (${clIdPercent}%)`)

  // ==================== DATA COMPLETENESS ====================
  console.log('\n3️⃣  DATA COMPLETENESS BY FIELD\n')

  // Court assignments
  const { count: withCourts } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('court_id', 'is', null)

  const courtPercent = totalJudges ? ((withCourts || 0) / totalJudges * 100).toFixed(1) : '0'
  console.log(`   ✓ Court Assignments: ${withCourts || 0} (${courtPercent}%)`)

  // Education data
  const { count: withEducation } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('education', 'is', null)
    .neq('education', '')

  const eduPercent = totalJudges ? ((withEducation || 0) / totalJudges * 100).toFixed(1) : '0'
  console.log(`   ✓ Education Data: ${withEducation || 0} (${eduPercent}%)`)

  // Political affiliation
  const { count: withAffiliation } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('political_affiliation', 'is', null)
    .neq('political_affiliation', '')

  const affPercent = totalJudges ? ((withAffiliation || 0) / totalJudges * 100).toFixed(1) : '0'
  console.log(`   ✓ Political Affiliation: ${withAffiliation || 0} (${affPercent}%)`)

  // Positions (JSONB field)
  const { count: withPositions } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('positions', 'is', null)
    .neq('positions', '[]')

  const posPercent = totalJudges ? ((withPositions || 0) / totalJudges * 100).toFixed(1) : '0'
  console.log(`   ✓ Position History: ${withPositions || 0} (${posPercent}%)`)

  // Case counts
  const { count: withCases } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .gt('total_cases', 0)

  const casePercent = totalJudges ? ((withCases || 0) / totalJudges * 100).toFixed(1) : '0'
  console.log(`   ✓ Case Counts: ${withCases || 0} (${casePercent}%)`)

  // Analytics ready (500+ cases)
  const { count: analyticsReady } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .gte('total_cases', 500)

  const analyticsPercent = totalJudges ? ((analyticsReady || 0) / totalJudges * 100).toFixed(1) : '0'
  console.log(`   ✓ Analytics-Ready (500+ cases): ${analyticsReady || 0} (${analyticsPercent}%)`)

  // ==================== SYNC PROGRESS TABLE ====================
  console.log('\n4️⃣  SYNC PROGRESS TRACKING\n')

  // Check if sync_progress table exists
  const { count: syncProgressCount } = await supabase
    .from('sync_progress')
    .select('*', { count: 'exact', head: true })
    .throwOnError()
    .then(result => result)
    .catch(() => ({ count: null }))

  if (syncProgressCount !== null) {
    console.log(`   Sync Progress Records: ${syncProgressCount}`)

    // Get sync progress summary
    const { data: syncSummary } = await supabase
      .from('sync_progress_summary')
      .select('*')
      .single()

    if (syncSummary) {
      console.log(`   Complete Judges: ${syncSummary.complete_judges || 0}`)
      console.log(`   Analytics Ready: ${syncSummary.analytics_ready_judges || 0}`)
      console.log(`   With Positions: ${syncSummary.judges_with_positions || 0}`)
      console.log(`   With Education: ${syncSummary.judges_with_education || 0}`)
      console.log(`   With Affiliations: ${syncSummary.judges_with_affiliations || 0}`)
      console.log(`   With Opinions: ${syncSummary.judges_with_opinions || 0}`)
      console.log(`   With Dockets: ${syncSummary.judges_with_dockets || 0}`)
      console.log(`   With Errors: ${syncSummary.judges_with_errors || 0}`)

      console.log('\n   Sync Phases:')
      console.log(`     Discovery: ${syncSummary.in_discovery_phase || 0}`)
      console.log(`     Positions: ${syncSummary.in_positions_phase || 0}`)
      console.log(`     Details: ${syncSummary.in_details_phase || 0}`)
      console.log(`     Opinions: ${syncSummary.in_opinions_phase || 0}`)
      console.log(`     Dockets: ${syncSummary.in_dockets_phase || 0}`)
      console.log(`     Complete: ${syncSummary.in_complete_phase || 0}`)

      if (syncSummary.avg_total_cases_per_judge) {
        console.log(`\n   Average Cases per Judge: ${Math.round(syncSummary.avg_total_cases_per_judge)}`)
      }
    }
  } else {
    console.log('   ⚠️  sync_progress table not found - migration may not be applied')
  }

  // ==================== MISSING DATA GAPS ====================
  console.log('\n5️⃣  DATA GAPS TO FILL\n')

  const missingEducation = (totalJudges || 0) - (withEducation || 0)
  const missingAffiliation = (totalJudges || 0) - (withAffiliation || 0)
  const missingPositions = (totalJudges || 0) - (withPositions || 0)
  const missingCases = (totalJudges || 0) - (withCases || 0)

  console.log(`   Judges Missing Education: ${missingEducation} (${((missingEducation / (totalJudges || 1)) * 100).toFixed(1)}%)`)
  console.log(`   Judges Missing Affiliation: ${missingAffiliation} (${((missingAffiliation / (totalJudges || 1)) * 100).toFixed(1)}%)`)
  console.log(`   Judges Missing Positions: ${missingPositions} (${((missingPositions / (totalJudges || 1)) * 100).toFixed(1)}%)`)
  console.log(`   Judges Missing Cases: ${missingCases} (${((missingCases / (totalJudges || 1)) * 100).toFixed(1)}%)`)

  // ==================== COURTLISTENER TOTAL ESTIMATE ====================
  console.log('\n6️⃣  EXPECTED VS ACTUAL COVERAGE\n')

  console.log('   CourtListener California Judges (Estimate):')
  console.log('     - Superior Court Judges: ~1,600')
  console.log('     - Federal Judges (CA Districts): ~150')
  console.log('     - Appellate & Supreme Court: ~100')
  console.log('     - TOTAL EXPECTED: ~1,850')
  console.log('')
  console.log(`   Our Database: ${totalJudges || 0} judges`)

  const coverage = totalJudges ? ((totalJudges / 1850) * 100).toFixed(1) : '0'
  console.log(`   Coverage: ${coverage}%`)

  if (totalJudges && totalJudges >= 1850) {
    console.log('   ✅ Excellent coverage - meets or exceeds expectations')
  } else if (totalJudges && totalJudges >= 1500) {
    console.log('   ✅ Good coverage - most judges present')
  } else if (totalJudges && totalJudges >= 1000) {
    console.log('   ⚠️  Moderate coverage - significant judges may be missing')
  } else {
    console.log('   ❌ Low coverage - many judges missing')
  }

  // ==================== RECOMMENDATIONS ====================
  console.log('\n7️⃣  RECOMMENDATIONS\n')

  const recommendations: string[] = []

  if (missingEducation > 100) {
    recommendations.push(`Run education sync for ${missingEducation} judges`)
  }

  if (missingAffiliation > 100) {
    recommendations.push(`Run political affiliation sync for ${missingAffiliation} judges`)
  }

  if (missingPositions > 100) {
    recommendations.push(`Run position history sync for ${missingPositions} judges`)
  }

  if (missingCases > 500) {
    recommendations.push(`Sync case data for ${missingCases} judges`)
  }

  if (totalJudges && totalJudges < 1800) {
    const missing = 1850 - totalJudges
    recommendations.push(`Import ~${missing} missing judges from CourtListener`)
  }

  if (recommendations.length === 0) {
    console.log('   ✅ No urgent actions needed - database is well-populated')
  } else {
    console.log('   Priority Actions:')
    recommendations.forEach((rec, i) => {
      console.log(`     ${i + 1}. ${rec}`)
    })
  }

  // ==================== SUMMARY ====================
  console.log('\n' + '='.repeat(80))
  console.log('📋 SUMMARY')
  console.log('='.repeat(80) + '\n')

  console.log(`Total Judges: ${totalJudges || 0}`)
  console.log(`Coverage: ${coverage}% of expected CA judges`)
  console.log('')
  console.log('Data Completeness:')
  console.log(`  - CourtListener IDs: ${clIdPercent}%`)
  console.log(`  - Court Assignments: ${courtPercent}%`)
  console.log(`  - Education: ${eduPercent}%`)
  console.log(`  - Political Affiliation: ${affPercent}%`)
  console.log(`  - Position History: ${posPercent}%`)
  console.log(`  - Case Counts: ${casePercent}%`)
  console.log(`  - Analytics Ready: ${analyticsPercent}%`)
  console.log('')

  // Overall health score
  const avgCompleteness = [
    parseFloat(clIdPercent),
    parseFloat(courtPercent),
    parseFloat(eduPercent),
    parseFloat(affPercent),
    parseFloat(posPercent),
    parseFloat(casePercent)
  ].reduce((a, b) => a + b, 0) / 6

  console.log(`Overall Data Health: ${avgCompleteness.toFixed(1)}%`)

  if (avgCompleteness >= 80) {
    console.log('Status: ✅ EXCELLENT - Database is production-ready')
  } else if (avgCompleteness >= 60) {
    console.log('Status: ✅ GOOD - Minor gaps to fill')
  } else if (avgCompleteness >= 40) {
    console.log('Status: ⚠️  MODERATE - Significant sync needed')
  } else {
    console.log('Status: ❌ LOW - Major data sync required')
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

main().catch(error => {
  console.error('Error running analysis:', error)
  process.exit(1)
})
