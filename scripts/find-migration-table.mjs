#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:')
  if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these in your .env.local file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function tryTable(tableName) {
  const { data, error } = await supabase.from(tableName).select('*').limit(5)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true, data }
}

async function main() {
  const possibleTables = [
    'supabase_migrations',
    '_supabase_migrations',
    'schema_migrations',
    '_schema_migrations',
    'migrations',
    '_migrations',
    'prisma_migrations',
    '_prisma_migrations',
  ]

  console.log('\nSearching for migration tracking table...\n')

  for (const table of possibleTables) {
    const result = await tryTable(table)
    if (result.success) {
      console.log(`✓ Found: ${table}`)
      console.log('Sample data:')
      console.log(JSON.stringify(result.data, null, 2))
      return
    } else {
      console.log(`✗ ${table}: ${result.error}`)
    }
  }

  console.log('\n❌ No migration tracking table found via REST API')
}

main().catch(console.error)
