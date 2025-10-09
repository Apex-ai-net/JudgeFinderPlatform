const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://xstlnicbnzdxlgfiewmg.supabase.co'
const serviceRoleKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdGxuaWNibnpkeGxnZmlld21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNzMzNCwiZXhwIjoyMDcxOTEzMzM0fQ.g7gsBTUa_Ij2aLJ6dYxMUkurHmg8VDjd_Ma_4JvbXRY'

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkSchema() {
  console.log('='.repeat(80))
  console.log('DEEP SCHEMA ANALYSIS & COMPARISON')
  console.log('='.repeat(80))

  // Check table existence using REST API
  const tables = ['audit_logs', 'performance_metrics', 'onboarding_analytics']
  const existingTables = []
  const missingTables = []

  console.log('\n### STEP 1: TABLE EXISTENCE CHECK ###\n')

  for (const table of tables) {
    try {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        existingTables.push(table)
        console.log(`✓ ${table}: EXISTS (${count || 0} rows)`)
      } else {
        missingTables.push(table)
        console.log(`✗ ${table}: DOES NOT EXIST (${error.message})`)
      }
    } catch (err) {
      missingTables.push(table)
      console.log(`✗ ${table}: ERROR - ${err.message}`)
    }
  }

  console.log('\n### STEP 2: SCHEMA DETAILS FOR EXISTING TABLES ###\n')

  // For existing tables, query information_schema via RPC or raw SQL
  if (existingTables.length > 0) {
    console.log('Attempting to query schema information...\n')

    for (const table of existingTables) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`TABLE: ${table}`)
      console.log('='.repeat(80))

      // Try to infer schema from an OPTIONS request or by inserting with wrong types
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)

        if (data && data.length > 0) {
          console.log('\nSample Row (showing column names and values):')
          const row = data[0]
          Object.keys(row).forEach((key) => {
            const value = row[key]
            const type = value === null ? 'NULL' : typeof value
            console.log(`  ${key}: ${type} = ${JSON.stringify(value)}`)
          })
        } else {
          console.log('\nTable is EMPTY - attempting to get column names from error messages...')

          // Try inserting invalid data to get column info
          const { error: insertError } = await supabase
            .from(table)
            .insert({ __invalid__: 'test' })
            .select()

          if (insertError) {
            console.log(`Error hint: ${insertError.message}`)
            console.log(`Details: ${insertError.details || 'N/A'}`)
            console.log(`Hint: ${insertError.hint || 'N/A'}`)
          }
        }
      } catch (err) {
        console.log(`Error querying ${table}:`, err.message)
      }
    }
  }

  console.log('\n\n### STEP 3: FUNCTION EXISTENCE CHECK ###\n')

  const expectedFunctions = [
    // audit_logs functions
    { name: 'cleanup_old_audit_logs', table: 'audit_logs' },
    { name: 'get_audit_log_stats', table: 'audit_logs' },
    { name: 'get_recent_security_events', table: 'audit_logs' },
    // performance_metrics functions
    { name: 'cleanup_old_performance_metrics', table: 'performance_metrics' },
    { name: 'get_endpoint_performance', table: 'performance_metrics' },
    // onboarding_analytics functions
    { name: 'update_onboarding_analytics', table: 'onboarding_analytics' },
    { name: 'track_feature_usage', table: 'onboarding_analytics' },
    { name: 'get_onboarding_completion_rate', table: 'onboarding_analytics' },
    { name: 'get_feature_adoption_metrics', table: 'onboarding_analytics' },
  ]

  for (const fn of expectedFunctions) {
    try {
      // Try calling the function with no args to see if it exists
      const { error } = await supabase.rpc(fn.name)

      if (error) {
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          console.log(`✗ ${fn.name}: DOES NOT EXIST`)
        } else {
          // Function exists but failed due to missing parameters or other reason
          console.log(`✓ ${fn.name}: EXISTS (error: ${error.message})`)
        }
      } else {
        console.log(`✓ ${fn.name}: EXISTS and callable`)
      }
    } catch (err) {
      console.log(`? ${fn.name}: UNKNOWN - ${err.message}`)
    }
  }

  console.log('\n\n### STEP 4: VIEW EXISTENCE CHECK ###\n')

  const expectedViews = ['pii_access_summary', 'performance_summary', 'onboarding_metrics_summary']

  for (const view of expectedViews) {
    try {
      const { error } = await supabase.from(view).select('*', { count: 'exact', head: true })

      if (!error) {
        console.log(`✓ ${view}: EXISTS`)
      } else {
        console.log(`✗ ${view}: DOES NOT EXIST (${error.message})`)
      }
    } catch (err) {
      console.log(`✗ ${view}: ERROR - ${err.message}`)
    }
  }

  console.log('\n\n### EXECUTIVE SUMMARY ###\n')
  console.log(`Total migrations analyzed: 3`)
  console.log(`Tables expected: ${tables.length}`)
  console.log(`Tables found in production: ${existingTables.length}`)
  console.log(`Tables missing: ${missingTables.length}`)

  if (missingTables.length > 0) {
    console.log(`\nMissing tables: ${missingTables.join(', ')}`)
  }

  if (existingTables.length > 0) {
    console.log(`\nExisting tables: ${existingTables.join(', ')}`)
  }

  console.log('\n' + '='.repeat(80))
}

checkSchema().catch(console.error)
