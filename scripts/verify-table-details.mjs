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

async function getTableRowCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`)
      return null
    }

    return count
  } catch (err) {
    console.log(`❌ ${tableName}: ${err.message}`)
    return null
  }
}

async function getSampleData(tableName, limit = 1) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(limit)

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

async function main() {
  console.log('\n=== DETAILED TABLE VERIFICATION ===\n')

  const tables = ['audit_logs', 'performance_metrics', 'onboarding_analytics']

  for (const table of tables) {
    console.log(`\n📋 ${table.toUpperCase()}`)
    console.log('─'.repeat(50))

    const count = await getTableRowCount(table)
    console.log(`Row Count: ${count !== null ? count : 'N/A (Error)'}`)

    if (count !== null && count > 0) {
      const { data, error } = await getSampleData(table, 1)
      if (data && data.length > 0) {
        console.log(`\nSample Record (first row):`)
        console.log(JSON.stringify(data[0], null, 2))
      } else if (error) {
        console.log(`Error fetching sample: ${error}`)
      }
    } else if (count === 0) {
      console.log('✓ Table is empty (newly created)')
    }
  }

  // Try to access schema information
  console.log('\n\n=== ATTEMPTING TO ACCESS SCHEMA METADATA ===\n')

  // Check information_schema if accessible
  const { data: schemaData, error: schemaError } = await supabase
    .from('information_schema.columns')
    .select('*')
    .eq('table_name', 'onboarding_analytics')
    .limit(5)

  if (schemaError) {
    console.log(`❌ Cannot access information_schema: ${schemaError.message}`)
    console.log('Note: This is expected - information_schema is not exposed via REST API')
  } else {
    console.log('✓ Schema data:', schemaData)
  }

  console.log('\n=================================\n')
}

main().catch(console.error)
