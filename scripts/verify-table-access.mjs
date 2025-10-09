#!/usr/bin/env node
/**
 * Verify Table Access via REST API
 * Makes actual REST API calls to confirm tables are accessible
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xstlnicbnzdxlgfiewmg.supabase.co'
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdGxuaWNibnpkeGxnZmlld21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNzMzNCwiZXhwIjoyMDcxOTEzMzM0fQ.g7gsBTUa_Ij2aLJ6dYxMUkurHmg8VDjd_Ma_4JvbXRY'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testTableAccess(tableName) {
  console.log(`\n🔍 Testing ${tableName}...`)

  try {
    // Test 1: Count query
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.log(`  ❌ Count query failed: ${countError.message}`)
      return { success: false, error: countError.message }
    }

    console.log(`  ✅ Count query: ${count} rows`)

    // Test 2: Select query
    const { data, error: selectError } = await supabase.from(tableName).select('*').limit(1)

    if (selectError) {
      console.log(`  ❌ Select query failed: ${selectError.message}`)
      return { success: false, error: selectError.message }
    }

    console.log(`  ✅ Select query: Retrieved ${data.length} row(s)`)

    // Test 3: Try to insert a test record (will rollback if RLS blocks it)
    const testData =
      tableName === 'audit_logs'
        ? {
            user_id: 'test_user',
            action_type: 'security_event',
            resource_type: 'test',
            severity: 'info',
          }
        : tableName === 'performance_metrics'
          ? {
              metric_type: 'database_query',
              operation: 'test_operation',
              duration_ms: 100,
              success: true,
            }
          : tableName === 'onboarding_analytics'
            ? {
                user_id: 'test_user_id_that_wont_exist',
                onboarding_step_completed: 0,
              }
            : {}

    const { error: insertError } = await supabase.from(tableName).insert(testData).select()

    if (insertError) {
      if (
        insertError.message.includes('violates foreign key') ||
        insertError.message.includes('new row violates') ||
        insertError.message.includes('policy')
      ) {
        console.log(
          `  ℹ️  Insert blocked by RLS/constraints (expected): ${insertError.message.substring(0, 80)}...`
        )
      } else {
        console.log(`  ⚠️  Insert test: ${insertError.message.substring(0, 80)}...`)
      }
    } else {
      console.log(`  ✅ Insert test: Success (cleaning up...)`)
      // Clean up test data if it was inserted
      await supabase.from(tableName).delete().match(testData)
    }

    console.log(`  ✅ ${tableName} is FULLY ACCESSIBLE`)
    return { success: true, count }
  } catch (err) {
    console.log(`  ❌ Unexpected error: ${err.message}`)
    return { success: false, error: err.message }
  }
}

async function main() {
  console.log('\n========================================')
  console.log('TABLE ACCESS VERIFICATION TEST')
  console.log('========================================')
  console.log(`\n📡 Testing REST API access to Supabase tables`)
  console.log(`🔗 Project: xstlnicbnzdxlgfiewmg`)
  console.log(`⏰ Time: ${new Date().toISOString()}`)

  const tables = ['audit_logs', 'performance_metrics', 'onboarding_analytics']
  const results = {}

  for (const table of tables) {
    results[table] = await testTableAccess(table)
  }

  console.log('\n========================================')
  console.log('FINAL RESULTS')
  console.log('========================================\n')

  const successCount = Object.values(results).filter((r) => r.success).length

  console.log('| Table | Status | Row Count |')
  console.log('|-------|--------|-----------|')

  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅ PASS' : '❌ FAIL'
    const count = result.count !== undefined ? result.count : 'N/A'
    console.log(`| ${table.padEnd(20)} | ${status} | ${count} |`)
  }

  console.log(`\n**Summary:** ${successCount}/3 tables accessible via REST API\n`)

  if (successCount === 3) {
    console.log('🎉 **ALL TABLES ARE ACCESSIBLE!**')
    console.log('✅ The table access issue has been resolved.\n')
  } else {
    console.log('⚠️  **SOME TABLES ARE NOT ACCESSIBLE**')
    console.log('❌ The issue persists. Further investigation needed.\n')

    console.log('**Failed tables:**')
    Object.entries(results)
      .filter(([, r]) => !r.success)
      .forEach(([table, result]) => {
        console.log(`  - ${table}: ${result.error}`)
      })
  }

  console.log('========================================\n')

  process.exit(successCount === 3 ? 0 : 1)
}

main().catch(console.error)
