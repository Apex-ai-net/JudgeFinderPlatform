#!/usr/bin/env tsx

/**
 * Apply Migrations via Supabase Management API
 *
 * This script attempts to apply migrations using various Supabase API methods.
 */

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

async function executeSQLDirect(sql: string) {
  console.log('\n🔧 Attempting direct SQL execution...\n')

  // Method 1: Try using fetch to execute SQL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]

  try {
    // Supabase has a SQL execution endpoint for the service role
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        query: sql,
      }),
    })

    const result = await response.text()
    console.log('Response:', result)

    return response.ok
  } catch (error: any) {
    console.error('Method failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Attempting to apply migrations via API...\n')

  const migrations = [
    'supabase/migrations/20251008_001_audit_logs.sql',
    'supabase/migrations/20250108_performance_metrics.sql',
  ]

  for (const migrationPath of migrations) {
    const fullPath = path.join(process.cwd(), migrationPath)
    const migrationName = path.basename(migrationPath)

    console.log(`📄 ${migrationName}`)

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`)
      continue
    }

    const sql = fs.readFileSync(fullPath, 'utf-8')

    const success = await executeSQLDirect(sql)

    if (!success) {
      console.log('\n⚠️  API method not available\n')
      console.log('Please use one of these methods instead:\n')
      console.log('1. Supabase Dashboard SQL Editor (Recommended):')
      console.log(
        `   https://supabase.com/dashboard/project/${supabaseUrl.match(/https:\/\/([^.]+)/)?.[1]}/sql/new`
      )
      console.log('\n2. Command line with database password:')
      console.log(`   DATABASE_URL="..." npx tsx scripts/apply-migrations-direct.ts`)
      console.log('\nSee MIGRATION_INSTRUCTIONS.md for detailed steps.')
      process.exit(1)
    }
  }
}

main()
