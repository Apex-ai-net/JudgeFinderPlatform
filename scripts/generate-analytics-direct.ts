#!/usr/bin/env tsx
/**
 * Direct Analytics Generation - NO API CALLS NEEDED
 * Processes existing case data to generate judge analytics
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function generateAnalyticsDirect() {
  console.log('🎯 DIRECT ANALYTICS GENERATION')
  console.log('📊 Processing existing case data (NO API calls)')
  console.log('⚡ Target: ALL 1,903 judges\n')

  // Get ALL judges (not just first 1000) by fetching in batches
  console.log('📥 Fetching ALL CA judges (may be more than 1000)...')
  const allJudges = []
  let offset = 0
  const batchSize = 1000

  while (true) {
    const { data: batch } = await supabase
      .from('judges')
      .select('id, name')
      .eq('jurisdiction', 'CA')
      .order('name')
      .range(offset, offset + batchSize - 1)

    if (!batch || batch.length === 0) break

    allJudges.push(...batch)
    offset += batchSize

    if (batch.length < batchSize) break // Last batch
  }

  const judges = allJudges
  console.log(`Found ${judges?.length || 0} judges\n`)

  let processed = 0
  let generated = 0

  for (const judge of judges || []) {
    try {
      // Get cases for this judge
      const { data: cases } = await supabase
        .from('cases')
        .select('*')
        .eq('judge_id', judge.id)

      if (!cases || cases.length === 0) {
        console.log(`⏭️  ${judge.name} - No cases`)
        processed++
        continue
      }

      // Generate analytics from cases
      const analytics = generateAnalyticsFromCases(cases)

      // Save to judge_analytics_cache table (the actual analytics table)
      const { data: upsertData, error: upsertError } = await supabase
        .from('judge_analytics_cache')
        .upsert({
          judge_id: judge.id,
          analytics: analytics,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'judge_id' })
        .select()

      if (upsertError) {
        console.error(`❌ Upsert error for ${judge.name}:`, upsertError)
        throw new Error(`Failed to save analytics: ${upsertError.message}`)
      }

      if (!upsertData || upsertData.length === 0) {
        console.warn(`⚠️  No data returned from upsert for ${judge.name}`)
      }

      console.log(`✅ ${judge.name} - ${cases.length} cases → analytics generated`)
      processed++
      generated++

    } catch (error) {
      console.error(`❌ ${judge.name} - Error:`, error)
      processed++
    }

    if (processed % 50 === 0) {
      console.log(`\n📊 Progress: ${processed}/${judges?.length || 0} judges\n`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 ANALYTICS GENERATION COMPLETE!')
  console.log(`📊 Processed: ${processed} judges`)
  console.log(`✅ Generated: ${generated} analytics`)
  console.log('='.repeat(60))
}

function generateAnalyticsFromCases(cases: any[]) {
  const totalCases = cases.length

  // Case outcomes
  const outcomes = cases.reduce((acc, c) => {
    const outcome = c.outcome || 'unknown'
    acc[outcome] = (acc[outcome] || 0) + 1
    return acc
  }, {})

  // Case types
  const caseTypes = cases.reduce((acc, c) => {
    const type = c.case_type || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // Settlement rate
  const settlements = cases.filter(c =>
    c.outcome?.toLowerCase().includes('settle') ||
    c.outcome?.toLowerCase().includes('settlement')
  ).length
  const settlementRate = totalCases > 0 ? (settlements / totalCases) * 100 : 0

  // Dismissal rate
  const dismissals = cases.filter(c =>
    c.outcome?.toLowerCase().includes('dismiss') ||
    c.outcome?.toLowerCase().includes('dismissal')
  ).length
  const dismissalRate = totalCases > 0 ? (dismissals / totalCases) * 100 : 0

  // Average case duration (if we have dates)
  const casesWithDates = cases.filter(c => c.filing_date && c.decision_date)
  const avgDuration = casesWithDates.length > 0
    ? casesWithDates.reduce((sum, c) => {
        const duration = new Date(c.decision_date).getTime() - new Date(c.filing_date).getTime()
        return sum + duration
      }, 0) / casesWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
    : null

  return {
    total_cases_analyzed: totalCases,
    settlement_rate: Math.round(settlementRate),
    dismissal_rate: Math.round(dismissalRate),
    avg_case_duration_days: avgDuration ? Math.round(avgDuration) : null,
    case_outcomes: outcomes,
    case_types: caseTypes,
    overall_confidence: Math.min(100, Math.round((totalCases / 10) * 100)), // More cases = higher confidence
    analysis_quality: totalCases >= 100 ? 'high' : totalCases >= 50 ? 'medium' : 'low'
  }
}

generateAnalyticsDirect()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
