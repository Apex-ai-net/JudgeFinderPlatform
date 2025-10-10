#!/usr/bin/env node
/**
 * Database Verification Script
 * Verifies the current state of the Supabase production database
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL environment variable not set')
  console.error('Please set it in your .env.local file')
  process.exit(1)
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set')
  console.error('Please set it in your .env.local file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function checkTableExists(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      // Check if it's a "relation does not exist" error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        return { exists: false, count: null, error: null }
      }
      return { exists: false, count: null, error: error.message }
    }

    return { exists: true, count, error: null }
  } catch (err) {
    return { exists: false, count: null, error: err.message }
  }
}

async function getMigrationHistory() {
  try {
    // Check if supabase_migrations table exists
    const { data: migrations, error } = await supabase
      .from('supabase_migrations')
      .select('*')
      .order('version', { ascending: false })
      .limit(15)

    if (error) {
      return { migrations: null, error: error.message }
    }

    return { migrations, error: null }
  } catch (err) {
    return { migrations: null, error: err.message }
  }
}

async function main() {
  console.log('\n========================================')
  console.log('SUPABASE PRODUCTION DATABASE VERIFICATION')
  console.log('========================================\n')

  console.log('### Connection Status')
  console.log(`- Method: Supabase JavaScript Client (REST API)`)
  console.log(`- URL: ${SUPABASE_URL}`)
  console.log(`- Status: CONNECTED\n`)

  // Check core tables
  console.log('### Core Tables Status (Pre-existing)\n')
  const coreTables = ['judges', 'courts', 'cases', 'app_users']

  console.log('| Table | Exists | Row Count | Status |')
  console.log('|-------|--------|-----------|--------|')

  for (const table of coreTables) {
    const result = await checkTableExists(table)
    if (result.exists) {
      console.log(
        `| ${table} | ✓ | ${result.count !== null ? result.count.toLocaleString() : 'N/A'} | OK |`
      )
    } else {
      console.log(
        `| ${table} | ✗ | N/A | ${result.error ? 'ERROR - ' + result.error : 'MISSING'} |`
      )
    }
  }

  // Check new migration tables
  console.log('\n### New Migration Tables Status\n')
  const newTables = ['audit_logs', 'performance_metrics', 'onboarding_analytics']

  console.log('| Table | Exists | Row Count | Status |')
  console.log('|-------|--------|-----------|--------|')

  let appliedCount = 0
  const tableResults = {}

  for (const table of newTables) {
    const result = await checkTableExists(table)
    tableResults[table] = result
    if (result.exists) {
      appliedCount++
      console.log(`| ${table} | ✓ | ${result.count !== null ? result.count : 'N/A'} | READY |`)
    } else {
      console.log(`| ${table} | ✗ | N/A | NEEDS CREATION |`)
    }
  }

  // Check migration history
  console.log('\n### Migration History\n')
  const { migrations, error: migError } = await getMigrationHistory()

  if (migError) {
    console.log(`Error fetching migrations: ${migError}`)
    console.log(
      '\nNote: supabase_migrations table may not exist or may not be accessible via REST API.'
    )
  } else if (migrations && migrations.length > 0) {
    console.log('Last 10 migrations applied:')
    migrations.slice(0, 10).forEach((m, i) => {
      console.log(`${i + 1}. ${m.version} - ${m.name || 'N/A'}`)
    })

    console.log('\n**Our 3 new migrations:**')
    const ourMigrations = [
      { name: '20251008_001_audit_logs', key: '20251008' },
      { name: '20250108_performance_metrics', key: '20250108' },
      { name: '20251008_002_onboarding_analytics', key: '20251008_002' },
    ]

    for (const mig of ourMigrations) {
      const found = migrations.find(
        (m) =>
          m.version === mig.key ||
          m.version.includes(mig.key) ||
          (m.name && m.name.includes(mig.name.split('_').slice(1).join('_')))
      )
      if (found) {
        console.log(`- [x] ${mig.name} - APPLIED`)
      } else {
        console.log(`- [ ] ${mig.name} - PENDING`)
      }
    }
  } else {
    console.log('No migrations found. Migration tracking table may not exist.\n')
    console.log('**Based on table existence:**')
    console.log(
      `- [ ] 20251008_001_audit_logs - ${tableResults['audit_logs']?.exists ? 'APPLIED' : 'PENDING'}`
    )
    console.log(
      `- [ ] 20250108_performance_metrics - ${tableResults['performance_metrics']?.exists ? 'APPLIED' : 'PENDING'}`
    )
    console.log(
      `- [ ] 20251008_002_onboarding_analytics - ${tableResults['onboarding_analytics']?.exists ? 'APPLIED' : 'PENDING'}`
    )
  }

  // Schema validation for new tables
  console.log('\n### Schema Validation (Limited - REST API Only)\n')

  for (const table of newTables) {
    const { exists } = tableResults[table]
    if (exists) {
      console.log(`\n**${table}:**`)
      console.log('- Table exists and is accessible via REST API')
      console.log(
        '- Row count: ' + (tableResults[table].count !== null ? tableResults[table].count : 'N/A')
      )

      if (table === 'onboarding_analytics') {
        console.log('- Note: user_id type should be TEXT (cannot verify via REST API)')
        console.log('- Note: unique constraint should exist (cannot verify via REST API)')
      }
    } else {
      console.log(`\n**${table}:**`)
      console.log('- Table does not exist - needs migration')
    }
  }

  // RLS Policies note
  console.log('\n### RLS Policies\n')
  console.log(
    'Note: RLS policy details cannot be queried via REST API without custom SQL functions.'
  )
  console.log('Tables should have RLS enabled based on migration files.\n')

  for (const table of newTables) {
    const { exists } = tableResults[table]
    if (exists) {
      console.log(`- ${table}: Should have RLS enabled (cannot verify via REST API)`)
    } else {
      console.log(`- ${table}: N/A (table does not exist)`)
    }
  }

  // Final status
  console.log('\n### FINAL STATUS\n')

  console.log(`- **Migrations Applied:** ${appliedCount}/3`)

  if (appliedCount === 0) {
    console.log('- **Action Required:** APPLY ALL 3 MIGRATIONS')
  } else if (appliedCount < 3) {
    console.log(`- **Action Required:** APPLY REMAINING ${3 - appliedCount} MIGRATION(S)`)
  } else {
    console.log('- **Action Required:** ALL COMPLETE ✓')
  }

  console.log('\n========================================\n')
}

main().catch(console.error)
