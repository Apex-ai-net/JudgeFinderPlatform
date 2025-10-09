#!/usr/bin/env tsx

/**
 * Verify Migrations Script
 *
 * This script:
 * 1. Checks if migration tables exist in the database
 * 2. Verifies REST API access to the tables
 * 3. Provides a report of migration status
 *
 * Usage: npx tsx scripts/verify-migrations.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

interface TableCheck {
  tableName: string
  migrationFile: string
  exists: boolean
  accessible: boolean
  rowCount?: number
  error?: string
}

async function checkTableExists(tableName: string): Promise<boolean> {
  // Query information_schema to check if table exists
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .single()

  return !error && !!data
}

async function checkTableAccessible(
  tableName: string
): Promise<{ accessible: boolean; rowCount?: number; error?: string }> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      return { accessible: false, error: error.message }
    }

    return { accessible: true, rowCount: count || 0 }
  } catch (error: any) {
    return { accessible: false, error: error.message }
  }
}

async function verifyMigrations() {
  console.log('🔍 Verifying Migrations\n')
  console.log('='.repeat(70))
  console.log(`Database: ${supabaseUrl}\n`)

  const migrations: Array<{ file: string; tables: string[] }> = [
    {
      file: '20251008_001_audit_logs.sql',
      tables: ['audit_logs', 'pii_access_summary'],
    },
    {
      file: '20250108_performance_metrics.sql',
      tables: ['performance_metrics', 'performance_summary'],
    },
  ]

  const results: TableCheck[] = []

  for (const migration of migrations) {
    console.log(`\n📄 Migration: ${migration.file}`)
    console.log('-'.repeat(70))

    for (const tableName of migration.tables) {
      console.log(`\n   Checking table: ${tableName}`)

      // Check if table exists
      const exists = await checkTableExists(tableName)
      console.log(`   Exists in schema: ${exists ? '✅ YES' : '❌ NO'}`)

      let accessible = false
      let rowCount: number | undefined
      let error: string | undefined

      if (exists) {
        // Check if table is accessible via REST API
        const accessCheck = await checkTableAccessible(tableName)
        accessible = accessCheck.accessible
        rowCount = accessCheck.rowCount
        error = accessCheck.error

        console.log(`   REST API access: ${accessible ? '✅ PASS' : '❌ FAIL'}`)
        if (accessible) {
          console.log(`   Row count: ${rowCount}`)
        } else {
          console.log(`   Error: ${error}`)
        }
      }

      results.push({
        tableName,
        migrationFile: migration.file,
        exists,
        accessible,
        rowCount,
        error,
      })
    }
  }

  // Print summary report
  console.log('\n\n📊 MIGRATION VERIFICATION REPORT')
  console.log('='.repeat(70))

  const migrationGroups = new Map<string, TableCheck[]>()
  for (const result of results) {
    if (!migrationGroups.has(result.migrationFile)) {
      migrationGroups.set(result.migrationFile, [])
    }
    migrationGroups.get(result.migrationFile)!.push(result)
  }

  for (const [migrationFile, tables] of migrationGroups.entries()) {
    const allExists = tables.every((t) => t.exists)
    const allAccessible = tables.every((t) => t.accessible)
    const status = allExists && allAccessible ? '✅' : '❌'

    console.log(`\n${status} ${migrationFile}`)

    for (const table of tables) {
      const tableStatus = table.exists && table.accessible ? '✅' : '❌'
      console.log(`   ${tableStatus} ${table.tableName}`)

      if (!table.exists) {
        console.log(`      ⚠️ Table does not exist in database`)
      } else if (!table.accessible) {
        console.log(`      ⚠️ Table exists but is not accessible via REST API`)
        if (table.error) {
          console.log(`      Error: ${table.error}`)
        }
      } else {
        console.log(`      ✓ Accessible with ${table.rowCount} rows`)
      }
    }
  }

  console.log('\n' + '='.repeat(70))

  const totalTables = results.length
  const existingTables = results.filter((r) => r.exists).length
  const accessibleTables = results.filter((r) => r.accessible).length

  console.log(`\nSummary:`)
  console.log(`  Tables existing: ${existingTables}/${totalTables}`)
  console.log(`  Tables accessible: ${accessibleTables}/${totalTables}`)

  if (existingTables < totalTables) {
    console.log(`\n⚠️ Some migrations need to be applied`)
    console.log(`\nTo apply missing migrations:`)
    console.log(
      `1. Go to: ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/')}/sql/new`
    )
    console.log(`2. Copy and paste the SQL from these files:`)
    for (const migration of migrations) {
      const tables = migrationGroups.get(migration.file) || []
      if (tables.some((t) => !t.exists)) {
        console.log(`   - supabase/migrations/${migration.file}`)
      }
    }
    console.log(`3. Execute the SQL in the Supabase SQL Editor`)
    console.log(`4. Run this script again to verify`)
    return false
  } else if (accessibleTables < totalTables) {
    console.log(`\n⚠️ All tables exist but some are not accessible via REST API`)
    console.log(`This might be due to Row Level Security policies.`)
    return false
  } else {
    console.log(`\n✅ All migrations have been successfully applied!`)
    return true
  }
}

// Run verification
verifyMigrations()
  .then((success) => {
    process.exit(success ? 0 : 1)
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  })
