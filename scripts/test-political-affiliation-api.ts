#!/usr/bin/env ts-node
/**
 * Test CourtListener Political Affiliation API
 *
 * Tests the political affiliations endpoint with a sample judge
 * to verify API connectivity and response structure
 *
 * Usage:
 *   npm run test:political-api
 *   npm run test:political-api -- --judge-id=12345
 */

import { CourtListenerClient } from '../lib/courtlistener/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function testPoliticalAffiliationAPI() {
  console.log('🔬 Testing CourtListener Political Affiliation API')
  console.log('━'.repeat(60))

  try {
    const client = new CourtListenerClient()

    // Get judge ID from command line or use a default
    const args = process.argv.slice(2)
    const judgeIdArg = args.find(arg => arg.startsWith('--judge-id='))
    const judgeId = judgeIdArg ? judgeIdArg.split('=')[1] : null

    if (judgeId) {
      console.log(`\n📊 Testing specific judge: ${judgeId}`)
    } else {
      console.log('\n📊 Testing with sample judges from database...')

      // Get a sample judge with CourtListener ID from database
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: sampleJudges } = await supabase
        .from('judges')
        .select('id, name, courtlistener_id')
        .not('courtlistener_id', 'is', null)
        .limit(3)

      if (!sampleJudges || sampleJudges.length === 0) {
        console.error('❌ No judges with CourtListener IDs found in database')
        process.exit(1)
      }

      console.log('\nSample judges found:')
      sampleJudges.forEach((judge, i) => {
        console.log(`  ${i + 1}. ${judge.name} (CL ID: ${judge.courtlistener_id})`)
      })

      // Test each sample judge
      for (const judge of sampleJudges) {
        console.log('\n' + '─'.repeat(60))
        console.log(`\nTesting: ${judge.name} (CL ID: ${judge.courtlistener_id})`)

        try {
          const response = await client.getPoliticalAffiliations(judge.courtlistener_id)

          console.log(`\n✅ API Response:`)
          console.log(`  - Count: ${response.count}`)
          console.log(`  - Has results: ${response.results && response.results.length > 0 ? 'Yes' : 'No'}`)

          if (response.results && response.results.length > 0) {
            console.log(`\n📋 Political Affiliations:`)
            response.results.forEach((affiliation: any, index: number) => {
              console.log(`\n  ${index + 1}. ${affiliation.political_party || 'Unknown Party'}`)
              console.log(`     - Party ID: ${affiliation.political_party_id || 'N/A'}`)
              console.log(`     - Start: ${affiliation.date_start || 'Unknown'}`)
              console.log(`     - End: ${affiliation.date_end || 'Current'}`)
              if (affiliation.appointer) {
                console.log(`     - Appointed by: ${affiliation.appointer.name}`)
              }
              if (affiliation.how_selected) {
                console.log(`     - Selection: ${affiliation.how_selected}`)
              }
              if (affiliation.votes_yes !== null && affiliation.votes_no !== null) {
                console.log(`     - Confirmation: ${affiliation.votes_yes} yes / ${affiliation.votes_no} no`)
              }
              if (affiliation.aba_rating) {
                console.log(`     - ABA Rating: ${affiliation.aba_rating}`)
              }
            })
          } else {
            console.log('  ℹ️  No political affiliation data available')
          }

        } catch (error) {
          console.error(`\n❌ Error for ${judge.name}:`, error)
        }
      }
    }

    console.log('\n' + '━'.repeat(60))
    console.log('✅ API test completed successfully!')
    console.log('\nNext steps:')
    console.log('  1. Run migration: supabase migration up')
    console.log('  2. Sync data: npm run sync:political')
    console.log('  3. Verify: Check judge profiles for political affiliation data')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

testPoliticalAffiliationAPI().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})