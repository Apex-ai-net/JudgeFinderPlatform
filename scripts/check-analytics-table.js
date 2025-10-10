#!/usr/bin/env node

/**
 * Check judge_analytics table status
 */

const { createClient } = require('@supabase/supabase-js')

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('🔍 Checking judge_analytics table...\n')

  // Check if table exists and get count
  const { count: totalCount, error: countError } = await supabase
    .from('judge_analytics')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error querying judge_analytics:', countError.message)
    process.exit(1)
  }

  console.log(`📊 Total records in judge_analytics: ${totalCount || 0}`)

  // Check records with bias_score
  const { count: withBias, error: biasError } = await supabase
    .from('judge_analytics')
    .select('*', { count: 'exact', head: true })
    .not('bias_score', 'is', null)

  if (biasError) {
    console.error('❌ Error querying bias scores:', biasError.message)
  } else {
    console.log(`📈 Records with bias_score: ${withBias || 0}`)
  }

  // Get sample record
  const { data: sample, error: sampleError } = await supabase
    .from('judge_analytics')
    .select('*')
    .limit(1)

  if (sampleError) {
    console.error('❌ Error getting sample:', sampleError.message)
  } else if (sample && sample.length > 0) {
    console.log('\n📋 Sample record:')
    console.log(JSON.stringify(sample[0], null, 2))
  } else {
    console.log('\n⚠️  Table is empty - analytics need to be generated')
  }

  // Check judges table
  const { count: judgesCount, error: judgesError } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .eq('jurisdiction', 'CA')

  if (judgesError) {
    console.error('❌ Error querying judges:', judgesError.message)
  } else {
    console.log(`\n👨‍⚖️ Total CA judges: ${judgesCount || 0}`)
  }
}

main().catch(console.error)
