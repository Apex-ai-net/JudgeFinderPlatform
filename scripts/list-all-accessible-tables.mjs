#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xstlnicbnzdxlgfiewmg.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// List of known tables from the migration files
const knownTables = [
  // Core tables
  'judges',
  'courts',
  'cases',
  'app_users',
  // New migration tables
  'audit_logs',
  'performance_metrics',
  'onboarding_analytics',
  // Other known tables
  'judge_court_positions',
  'profile_issues',
  'sync_queue',
  'ad_spots',
  'ad_impressions',
  'ad_performance_metrics',
  'ad_waitlist',
  'advertisers',
  'push_tokens',
]

async function testTableAccess(tableName) {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true })

  if (error) {
    return { accessible: false, count: null, error: error.code }
  }
  return { accessible: true, count, error: null }
}

async function main() {
  console.log('\n=== ACCESSIBLE TABLES VIA REST API ===\n')

  const results = []

  for (const table of knownTables) {
    const result = await testTableAccess(table)
    results.push({ table, ...result })

    if (result.accessible) {
      console.log(`✓ ${table.padEnd(30)} | ${result.count !== null ? result.count : 'N/A'} rows`)
    } else {
      console.log(
        `✗ ${table.padEnd(30)} | ${result.error === 'PGRST205' ? 'NOT IN SCHEMA CACHE' : result.error}`
      )
    }
  }

  console.log('\n=== SUMMARY ===\n')
  const accessible = results.filter((r) => r.accessible)
  const notAccessible = results.filter((r) => !r.accessible)

  console.log(`Accessible: ${accessible.length}/${results.length}`)
  console.log(`Not in schema cache: ${notAccessible.filter((r) => r.error === 'PGRST205').length}`)

  if (notAccessible.length > 0) {
    console.log('\n⚠️  Tables not accessible via REST API:')
    notAccessible.forEach((r) => {
      if (r.error === 'PGRST205') {
        console.log(`  - ${r.table} (exists in DB but not in PostgREST schema cache)`)
      }
    })
    console.log('\n💡 Solution: Restart Supabase PostgREST service or reload schema cache')
  }
}

main().catch(console.error)
