import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
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

interface MigrationResult {
  name: string
  success: boolean
  error?: string
  tablesCreated?: string[]
  verificationPassed?: boolean
}

async function applyMigration(filePath: string): Promise<MigrationResult> {
  const migrationName = path.basename(filePath)
  console.log(`\n📄 Processing migration: ${migrationName}`)

  try {
    // Read migration file
    const sql = fs.readFileSync(filePath, 'utf-8')
    console.log(`   Read ${sql.split('\n').length} lines from file`)

    // Use the database management API to execute the entire SQL file
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        Prefer: 'params=single-object',
      },
      body: JSON.stringify({ query: sql }),
    })

    // If exec_sql RPC doesn't exist, we'll use psql via connection string
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`   ⚠️ REST API method not available, falling back to direct execution`)
      console.log(`   Error: ${errorText}`)

      // Extract table names from migration
      const tableMatches = sql.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi)
      const tablesCreated = tableMatches
        ? tableMatches.map((m) => m.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)?.[1] || '')
        : []

      return {
        name: migrationName,
        success: false,
        error:
          'Cannot execute SQL directly via REST API. Please use Supabase Dashboard SQL Editor or CLI.',
        tablesCreated,
      }
    }

    const result = await response.json()
    console.log(`   ✅ Migration executed successfully`)

    // Extract table names from migration
    const tableMatches = sql.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/gi)
    const tablesCreated = tableMatches
      ? tableMatches.map((m) => m.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)?.[1] || '')
      : []

    if (tablesCreated.length > 0) {
      console.log(`   Tables: ${tablesCreated.join(', ')}`)
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

async function verifyTableAccess(tableName: string): Promise<boolean> {
  console.log(`   🔍 Verifying REST API access to table: ${tableName}`)

  const { data, error } = await supabase
    .from(tableName)
    .select('count', { count: 'exact', head: true })

  if (error) {
    console.error(`   ❌ Cannot access ${tableName}:`, error.message)
    return false
  }

  console.log(`   ✅ Table ${tableName} is accessible via REST API`)
  return true
}

async function main() {
  console.log('🚀 Starting migration process...')
  console.log(`   Database: ${supabaseUrl}`)

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

    const result = await applyMigration(filePath)

    // Verify table access if tables were created
    if (result.success && result.tablesCreated && result.tablesCreated.length > 0) {
      console.log(`\n   🔍 Verifying table access...`)
      let allVerified = true

      for (const table of result.tablesCreated) {
        const verified = await verifyTableAccess(table)
        if (!verified) allVerified = false
      }

      result.verificationPassed = allVerified
    }

    results.push(result)
  }

  // Print summary report
  console.log('\n\n📊 MIGRATION REPORT')
  console.log('='.repeat(60))

  for (const result of results) {
    const status = result.success ? '✅' : '❌'
    console.log(`\n${status} ${result.name}`)

    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }

    if (result.tablesCreated && result.tablesCreated.length > 0) {
      console.log(`   Tables: ${result.tablesCreated.join(', ')}`)
    }

    if (result.verificationPassed !== undefined) {
      const verifyStatus = result.verificationPassed ? '✅' : '❌'
      console.log(
        `   ${verifyStatus} REST API Access: ${result.verificationPassed ? 'PASSED' : 'FAILED'}`
      )
    }
  }

  console.log('\n' + '='.repeat(60))

  const successCount = results.filter((r) => r.success).length
  console.log(`\n${successCount}/${results.length} migrations completed successfully`)

  if (successCount < results.length) {
    process.exit(1)
  }
}

main().catch(console.error)
