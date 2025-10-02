#!/usr/bin/env node
/**
 * Apply search function fix migration to production database
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = 'https://xstlnicbnzdxlgfiewmg.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdGxuaWNibnpkeGxnZmlld21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNzMzNCwiZXhwIjoyMDcxOTEzMzM0fQ.g7gsBTUa_Ij2aLJ6dYxMUkurHmg8VDjd_Ma_4JvbXRY'

async function applyMigration() {
  console.log('🔧 Applying search function fix migration...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  // Read migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251001_002_fix_search_function_return_type.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

  console.log('📄 Migration file loaded')
  console.log(`   Size: ${migrationSQL.length} characters`)

  // Execute migration
  console.log('⚡ Executing migration...')

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  }).single()

  if (error) {
    // Try direct query instead
    console.log('⚠️  exec_sql RPC not available, trying direct query...')

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.includes('COMMENT ON')) continue // Skip comments

      console.log(`   Executing: ${statement.substring(0, 60)}...`)

      const { error: stmtError } = await supabase.rpc('exec', {
        query: statement
      })

      if (stmtError) {
        console.error('❌ Error executing statement:', stmtError)
        console.error('   Statement:', statement.substring(0, 200))
        process.exit(1)
      }
    }
  }

  console.log('✅ Migration applied successfully!')
  console.log('🧪 Testing search function...')

  // Test the search function
  const { data: testResults, error: testError } = await supabase
    .rpc('search_judges_ranked', {
      search_query: 'smith',
      jurisdiction_filter: null,
      result_limit: 5,
      similarity_threshold: 0.3
    })

  if (testError) {
    console.error('❌ Search test failed:', testError)
    process.exit(1)
  }

  console.log('✅ Search function working!')
  console.log(`   Found ${testResults?.length || 0} results`)

  if (testResults && testResults.length > 0) {
    console.log('   Sample result:', {
      name: testResults[0].name,
      court: testResults[0].court_name,
      method: testResults[0].search_method
    })
  }
}

applyMigration().catch(err => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
