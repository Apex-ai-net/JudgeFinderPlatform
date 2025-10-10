#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not set')
  console.error('Please set it in your .env.local file')
  process.exit(1)
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
  console.error('Please set it in your .env.local file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function testTableAccess(tableName) {
  console.log(`\n=== Testing ${tableName} ===`)

  // Try to get count
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.log('❌ Count Error:', countError)
  } else {
    console.log('✓ Count:', count)
  }

  // Try to select data
  const { data, error: selectError } = await supabase.from(tableName).select('*').limit(1)

  if (selectError) {
    console.log('❌ Select Error:', selectError)
  } else {
    console.log('✓ Select successful, rows:', data?.length || 0)
    if (data && data.length > 0) {
      console.log('Sample:', data[0])
    }
  }

  // Try to insert a test record
  console.log('\nAttempting insert test...')

  let testRecord = {}
  if (tableName === 'audit_logs') {
    testRecord = {
      user_id: 'test_user_123',
      action_type: 'security_event',
      resource_type: 'test',
      severity: 'info',
    }
  } else if (tableName === 'performance_metrics') {
    testRecord = {
      metric_type: 'database_query',
      operation: 'test_operation',
      duration_ms: 100,
      success: true,
    }
  } else if (tableName === 'onboarding_analytics') {
    testRecord = {
      user_id: 'user_2qZxOy8FO6oiRYOZnxBPJQtPWUj', // One of the existing users
    }
  }

  const { data: insertData, error: insertError } = await supabase
    .from(tableName)
    .insert(testRecord)
    .select()

  if (insertError) {
    console.log('❌ Insert Error:', insertError)
  } else {
    console.log('✓ Insert successful:', insertData)

    // Try to delete the test record
    if (insertData && insertData[0]?.id) {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', insertData[0].id)

      if (deleteError) {
        console.log('❌ Delete Error:', deleteError)
      } else {
        console.log('✓ Test record deleted successfully')
      }
    }
  }
}

async function main() {
  console.log('\n=== RLS POLICY TESTING ===\n')
  console.log('Using Service Role Key - should bypass RLS\n')

  await testTableAccess('audit_logs')
  await testTableAccess('performance_metrics')
  await testTableAccess('onboarding_analytics')

  console.log('\n=== DONE ===\n')
}

main().catch(console.error)
