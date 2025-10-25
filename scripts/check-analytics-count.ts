#!/usr/bin/env tsx
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAnalytics() {
  const { count, error } = await supabase
    .from('judge_analytics_cache')
    .select('*', { count: 'exact', head: true })

  console.log('Total analytics count:', count)
  if (error) console.log('Error:', error)

  const { data, error: dataError } = await supabase
    .from('judge_analytics_cache')
    .select('judge_id, created_at, analytics')
    .limit(3)

  console.log('\nSample records:', data?.length || 0)
  if (dataError) console.log('Data error:', dataError)
  if (data && data.length > 0) {
    console.log('First record:', JSON.stringify(data[0], null, 2))
  }
}

checkAnalytics()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err)
    process.exit(1)
  })
