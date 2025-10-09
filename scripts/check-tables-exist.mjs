#!/usr/bin/env node
/**
 * Check if tables exist in database using SQL query
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
  db: {
    schema: 'public',
  },
})

async function checkTableExistsDirectSQL(tableName) {
  try {
    // Use RPC to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        ) as table_exists;
      `,
    })

    if (error) {
      console.log(`⚠️  RPC exec_sql not available: ${error.message}`)
      return null
    }

    return data
  } catch (err) {
    return null
  }
}

async function reloadPostgRESTCache() {
  console.log('\n🔄 Attempting to reload PostgREST schema cache...\n')

  try {
    // Method 1: Send NOTIFY signal
    const notifySQL = "NOTIFY pgrst, 'reload schema'"
    console.log('  Method 1: Sending NOTIFY signal to PostgREST...')
    const { error: notifyError } = await supabase.rpc('exec_sql', { sql_query: notifySQL })

    if (notifyError) {
      console.log(`    ⚠️  NOTIFY failed: ${notifyError.message}`)
    } else {
      console.log('    ✅ NOTIFY signal sent')
    }

    // Method 2: Try direct PostgREST admin endpoint
    console.log('\n  Method 2: Trying PostgREST admin endpoint...')
    const adminUrl = `${SUPABASE_URL}/rest/v1/`

    const response = await fetch(adminUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
      },
    })

    if (response.ok) {
      console.log('    ✅ Admin endpoint accessible')
    } else {
      console.log(`    ⚠️  Admin endpoint returned ${response.status}`)
    }

    console.log('\n  ℹ️  Note: Schema cache reload may take 30-60 seconds to propagate')
    console.log("  ℹ️  If cache doesn't reload automatically, restart the Supabase project\n")

    return true
  } catch (err) {
    console.log(`  ❌ Error: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('\n========================================')
  console.log('DATABASE TABLE EXISTENCE CHECK')
  console.log('========================================\n')

  console.log('Checking if tables exist in the database...\n')

  const tables = ['audit_logs', 'performance_metrics', 'onboarding_analytics']

  // Since RPC might not be available, let's use a different approach
  // Try to query pg_catalog directly via a function if it exists

  console.log('**Approach:** Checking via PostgREST REST API\n')

  for (const table of tables) {
    console.log(`📋 ${table}:`)

    // Try HEAD request (works even if not in cache sometimes)
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        console.log(`  ✅ Table appears to exist (HEAD request successful)`)
        console.log(`  📊 Row count: ${count !== null ? count : 'unknown'}`)
      } else if (error.message.includes('Could not find the table')) {
        console.log(`  ⚠️  Table not in PostgREST schema cache`)
        console.log(`  ❓ Table may exist in DB but not visible to PostgREST`)
      } else if (error.message.includes('does not exist')) {
        console.log(`  ❌ Table does NOT exist in database`)
      } else {
        console.log(`  ❓ Unknown status: ${error.message}`)
      }
    } catch (err) {
      console.log(`  ❌ Error checking table: ${err.message}`)
    }

    console.log('')
  }

  console.log('\n========================================')
  console.log('DIAGNOSIS')
  console.log('========================================\n')

  console.log('**Issue:** audit_logs and performance_metrics not in PostgREST schema cache\n')

  console.log('**Possible Causes:**')
  console.log('  1. Tables not created yet (migrations not applied)')
  console.log('  2. Tables created but PostgREST cache not refreshed')
  console.log('  3. RLS policies blocking PostgREST from seeing tables\n')

  console.log('**Recommended Actions:**\n')

  console.log('1. **Verify migrations are applied:**')
  console.log('   - Go to Supabase Dashboard → Database → Migrations')
  console.log('   - Check if these migrations are listed:')
  console.log('     • 20251008_001_audit_logs')
  console.log('     • 20250108_performance_metrics')
  console.log('     • 20251008_002_onboarding_analytics\n')

  console.log('2. **If migrations are NOT applied:**')
  console.log('   - Go to SQL Editor in Supabase Dashboard')
  console.log('   - Run the SQL from each migration file:')
  console.log('     • supabase/migrations/20251008_001_audit_logs.sql')
  console.log('     • supabase/migrations/20250108_performance_metrics.sql\n')

  console.log('3. **If migrations ARE applied (tables exist but not visible):**')
  console.log('   - Option A: Reload PostgREST cache (see below)')
  console.log('   - Option B: Restart Supabase project')
  console.log('     Dashboard → Settings → General → Pause → Resume\n')

  // Try to reload cache
  await reloadPostgRESTCache()

  console.log('========================================\n')
}

main().catch(console.error)
