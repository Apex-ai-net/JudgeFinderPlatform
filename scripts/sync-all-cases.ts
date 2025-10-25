#!/usr/bin/env tsx
/**
 * Aggressive Case Sync for All Judges
 * Syncs cases and decisions from CourtListener for maximum data coverage
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { CourtListenerClient } from '../lib/courtlistener/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const courtListener = new CourtListenerClient()

async function syncAllCases() {
  console.log('🔥 AGGRESSIVE CASE SYNC - Maximum Data Pull')
  console.log('⚡ Rate limiting: MINIMAL')
  console.log('📊 Target: All CA judges with CourtListener IDs\n')

  // Get all CA judges with CourtListener IDs
  const { data: judges, error } = await supabase
    .from('judges')
    .select('id, name, courtlistener_id')
    .eq('jurisdiction', 'CA')
    .not('courtlistener_id', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch judges: ${error.message}`)
  }

  console.log(`📋 Found ${judges.length} judges to sync cases for\n`)

  let totalOpinions = 0
  let totalDockets = 0
  let judgesProcessed = 0
  let errors = 0

  for (const judge of judges) {
    try {
      console.log(`\n[${judgesProcessed + 1}/${judges.length}] Syncing cases for ${judge.name}...`)

      // Fetch opinions (written decisions)
      const opinions = await courtListener.getOpinionsByJudge(judge.courtlistener_id, {
        limit: 500 // Get up to 500 opinions per judge
      })

      // Fetch dockets (case filings)
      const dockets = await courtListener.getDocketsByJudge(judge.courtlistener_id, {
        limit: 500 // Get up to 500 dockets per judge
      })

      console.log(`  📝 Opinions: ${opinions.results.length}`)
      console.log(`  📂 Dockets: ${dockets.results.length}`)

      // Insert opinions as cases
      if (opinions.results.length > 0) {
        const opinionCases = opinions.results.map(opinion => ({
          judge_id: judge.id,
          case_name: opinion.case_name || 'Untitled Case',
          case_number: `CL-O${opinion.id}`,
          case_type: 'Opinion',
          jurisdiction: 'CA',
          decision_date: opinion.date_filed,
          outcome: opinion.type || 'Unknown',
          source: 'courtlistener',
          source_url: `https://www.courtlistener.com/opinion/${opinion.id}/`,
          metadata: opinion
        }))

        const { error: opinionsError } = await supabase
          .from('cases')
          .upsert(opinionCases, { onConflict: 'case_number' })

        if (!opinionsError) {
          totalOpinions += opinions.results.length
        }
      }

      // Insert dockets as cases
      if (dockets.results.length > 0) {
        const docketCases = dockets.results.map(docket => ({
          judge_id: judge.id,
          case_name: docket.case_name || 'Untitled Case',
          case_number: `CL-D${docket.id}`,
          case_type: 'Docket',
          jurisdiction: 'CA',
          filing_date: docket.date_filed,
          outcome: docket.nature_of_suit || 'Unknown',
          source: 'courtlistener',
          source_url: `https://www.courtlistener.com/docket/${docket.id}/`,
          metadata: docket
        }))

        const { error: docketsError } = await supabase
          .from('cases')
          .upsert(docketCases, { onConflict: 'case_number' })

        if (!docketsError) {
          totalDockets += dockets.results.length
        }
      }

      // Update judge's total_cases count
      await supabase
        .from('judges')
        .update({
          total_cases: opinions.results.length + dockets.results.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', judge.id)

      judgesProcessed++

      // Minimal delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 50))

    } catch (error) {
      console.error(`  ❌ Error syncing ${judge.name}:`, error)
      errors++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 CASE SYNC COMPLETE!')
  console.log('='.repeat(60))
  console.log(`📊 Judges Processed: ${judgesProcessed}/${judges.length}`)
  console.log(`📝 Total Opinions: ${totalOpinions}`)
  console.log(`📂 Total Dockets: ${totalDockets}`)
  console.log(`💾 Total Cases: ${totalOpinions + totalDockets}`)
  console.log(`❌ Errors: ${errors}`)
  console.log('='.repeat(60))
}

syncAllCases()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
