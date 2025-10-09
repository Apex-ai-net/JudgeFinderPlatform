#!/usr/bin/env tsx

/**
 * Apply Migrations Script (Direct PostgreSQL Connection)
 *
 * This script applies pending migrations directly to the Supabase database
 * using a PostgreSQL connection string.
 *
 * Usage: npx tsx scripts/apply-migrations-direct.ts
 */

import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

// Get Supabase connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  process.exit(1)
}

// Extract project ID from URL
const projectId = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectId) {
  console.error('❌ Could not extract project ID from Supabase URL')
  process.exit(1)
}

// Construct PostgreSQL connection string
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
console.log('\n⚠️  DATABASE CONNECTION REQUIRED\n')
console.log('This script needs a PostgreSQL connection string to apply migrations.')
console.log('\nYou can find your database password in:')
console.log('  Supabase Dashboard → Project Settings → Database → Connection string\n')
console.log(`Your project ID: ${projectId}`)
console.log('Connection string format:')
console.log(`  postgresql://postgres:[YOUR-PASSWORD]@db.${projectId}.supabase.co:5432/postgres\n`)

// Check if connection string is provided via environment variable
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

if (!connectionString) {
  console.error('❌ No database connection string provided')
  console.error('\nPlease set one of these environment variables:')
  console.error(
    '  DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres'
  )
  console.error(
    '  SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres'
  )
  console.error('\nOr run with:')
  console.error(
    '  DATABASE_URL="your-connection-string" npx tsx scripts/apply-migrations-direct.ts'
  )
  process.exit(1)
}

interface MigrationResult {
  name: string
  success: boolean
  error?: string
  tablesCreated?: string[]
}

async function applyMigration(client: Client, filePath: string): Promise<MigrationResult> {
  const migrationName = path.basename(filePath)
  console.log(`\n📄 Processing migration: ${migrationName}`)

  try {
    // Read migration file
    const sql = fs.readFileSync(filePath, 'utf-8')
    const lineCount = sql.split('\n').length
    console.log(`   Read ${lineCount} lines from file`)

    // Execute the entire SQL file in a transaction
    await client.query('BEGIN')

    try {
      await client.query(sql)
      await client.query('COMMIT')
      console.log(`   ✅ Migration executed successfully`)
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    }

    // Extract table names from migration
    const tableMatches = sql.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi)
    const tablesCreated = tableMatches
      ? tableMatches
          .map((m) => m.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)?.[1] || '')
          .filter(Boolean)
      : []

    if (tablesCreated.length > 0) {
      console.log(`   Tables created/verified: ${tablesCreated.join(', ')}`)
    }

    return {
      name: migrationName,
      success: true,
      tablesCreated,
    }
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message)
    return {
      name: migrationName,
      success: false,
      error: error.message,
    }
  }
}

async function verifyTable(client: Client, tableName: string): Promise<boolean> {
  try {
    const result = await client.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      );
    `,
      [tableName]
    )

    const exists = result.rows[0]?.exists || false

    if (exists) {
      // Get row count
      const countResult = await client.query(`SELECT COUNT(*) FROM ${tableName}`)
      const count = countResult.rows[0]?.count || 0
      console.log(`   ✅ Table '${tableName}' exists with ${count} rows`)
      return true
    } else {
      console.log(`   ❌ Table '${tableName}' does not exist`)
      return false
    }
  } catch (error: any) {
    console.error(`   ❌ Error verifying table '${tableName}':`, error.message)
    return false
  }
}

async function main() {
  // TypeScript null check - this should never happen due to guard clause above
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  console.log('\n🚀 Starting migration process...')
  console.log(`   Database: ${connectionString.split('@')[1]?.split('/')[0]}\n`)

  // Create PostgreSQL client
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    // Connect to database
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected successfully\n')

    const migrations = [
      'supabase/migrations/20251008_001_audit_logs.sql',
      'supabase/migrations/20250108_performance_metrics.sql',
    ]

    const results: MigrationResult[] = []

    for (const migration of migrations) {
      const filePath = path.join(process.cwd(), migration)

      if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file not found: ${filePath}`)
        results.push({
          name: path.basename(migration),
          success: false,
          error: 'File not found',
        })
        continue
      }

      const result = await applyMigration(client, filePath)
      results.push(result)

      // Verify tables if migration was successful
      if (result.success && result.tablesCreated && result.tablesCreated.length > 0) {
        console.log(`\n   🔍 Verifying created tables...`)
        for (const table of result.tablesCreated) {
          await verifyTable(client, table)
        }
      }
    }

    // Print summary report
    console.log('\n\n📊 MIGRATION REPORT')
    console.log('='.repeat(70))

    for (const result of results) {
      const status = result.success ? '✅' : '❌'
      console.log(`\n${status} ${result.name}`)

      if (result.error) {
        console.log(`   Error: ${result.error}`)
      }

      if (result.tablesCreated && result.tablesCreated.length > 0) {
        console.log(`   Tables: ${result.tablesCreated.join(', ')}`)
      }
    }

    console.log('\n' + '='.repeat(70))

    const successCount = results.filter((r) => r.success).length
    console.log(`\n${successCount}/${results.length} migrations completed successfully`)

    if (successCount === results.length) {
      console.log('\n✅ All migrations applied successfully!')
      console.log('\nNext steps:')
      console.log('  1. Verify REST API access: npx tsx scripts/verify-migrations.ts')
      console.log('  2. Test the new tables in your application')
    } else {
      console.log('\n⚠️ Some migrations failed. Please review the errors above.')
      process.exit(1)
    }
  } catch (error: any) {
    console.error('\n❌ Connection error:', error.message)
    process.exit(1)
  } finally {
    await client.end()
    console.log('\n🔌 Database connection closed')
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
