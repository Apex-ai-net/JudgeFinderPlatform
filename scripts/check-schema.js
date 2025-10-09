const { Client } = require('pg')

// Requires DATABASE_URL environment variable
// Format: postgresql://postgres.PROJECT_ID:SERVICE_ROLE_KEY@HOST:PORT/postgres
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function checkSchema() {
  try {
    await client.connect()

    console.log('=== CHECKING TABLE EXISTENCE ===\n')

    // Check which tables exist
    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('audit_logs', 'performance_metrics', 'onboarding_analytics')
      ORDER BY table_name;
    `

    const tables = await client.query(tablesQuery)
    console.log('Tables found:', tables.rows.map((r) => r.table_name).join(', '))
    console.log(
      'Tables missing:',
      ['audit_logs', 'performance_metrics', 'onboarding_analytics']
        .filter((t) => !tables.rows.find((r) => r.table_name === t))
        .join(', ')
    )

    console.log('\n=== DETAILED SCHEMA FOR EXISTING TABLES ===\n')

    for (const table of tables.rows) {
      console.log(`\n--- TABLE: ${table.table_name} ---\n`)

      // Get column information
      const columnsQuery = `
        SELECT
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
        ORDER BY ordinal_position;
      `

      const columns = await client.query(columnsQuery, [table.table_name])
      console.log('COLUMNS:')
      columns.rows.forEach((col) => {
        console.log(
          `  ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`
        )
      })

      // Get constraints
      const constraintsQuery = `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.delete_rule
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        LEFT JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
          AND tc.table_schema = rc.constraint_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = $1
        ORDER BY tc.constraint_type, tc.constraint_name;
      `

      const constraints = await client.query(constraintsQuery, [table.table_name])
      console.log('\nCONSTRAINTS:')
      constraints.rows.forEach((con) => {
        let desc = `  ${con.constraint_name} (${con.constraint_type})`
        if (con.column_name) desc += ` on ${con.column_name}`
        if (con.foreign_table_name)
          desc += ` -> ${con.foreign_table_name}(${con.foreign_column_name})`
        if (con.delete_rule) desc += ` ON DELETE ${con.delete_rule}`
        console.log(desc)
      })

      // Get indexes
      const indexesQuery = `
        SELECT
          i.relname as index_name,
          a.attname as column_name,
          ix.indisunique as is_unique,
          ix.indisprimary as is_primary,
          am.amname as index_type,
          pg_get_indexdef(ix.indexrelid) as index_definition
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_am am ON i.relam = am.oid
        LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r'
          AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          AND t.relname = $1
        ORDER BY i.relname, a.attnum;
      `

      const indexes = await client.query(indexesQuery, [table.table_name])
      console.log('\nINDEXES:')
      const uniqueIndexes = new Map()
      indexes.rows.forEach((idx) => {
        if (!uniqueIndexes.has(idx.index_name)) {
          uniqueIndexes.set(idx.index_name, {
            name: idx.index_name,
            unique: idx.is_unique,
            primary: idx.is_primary,
            type: idx.index_type,
            definition: idx.index_definition,
          })
        }
      })
      uniqueIndexes.forEach((idx) => {
        console.log(
          `  ${idx.name} (${idx.type}${idx.unique ? ', UNIQUE' : ''}${idx.primary ? ', PRIMARY' : ''})`
        )
        console.log(`    ${idx.definition}`)
      })

      // Get RLS policies
      const policiesQuery = `
        SELECT
          polname as policy_name,
          polcmd as command,
          CASE polcmd
            WHEN 'r' THEN 'SELECT'
            WHEN 'a' THEN 'INSERT'
            WHEN 'w' THEN 'UPDATE'
            WHEN 'd' THEN 'DELETE'
            WHEN '*' THEN 'ALL'
            ELSE polcmd::text
          END as command_type,
          polpermissive as is_permissive,
          pg_get_expr(polqual, polrelid) as using_expression,
          pg_get_expr(polwithcheck, polrelid) as check_expression
        FROM pg_policy
        WHERE polrelid = $1::regclass
        ORDER BY polname;
      `

      const policies = await client.query(policiesQuery, ['public.' + table.table_name])
      console.log('\nRLS POLICIES:')
      if (policies.rows.length === 0) {
        console.log('  (none)')
      } else {
        policies.rows.forEach((pol) => {
          console.log(`  ${pol.policy_name} (${pol.command_type})`)
          if (pol.using_expression) console.log(`    USING: ${pol.using_expression}`)
          if (pol.check_expression) console.log(`    CHECK: ${pol.check_expression}`)
        })
      }
    }

    // Check for functions
    console.log('\n\n=== CHECKING FUNCTIONS ===\n')

    const functionsQuery = `
      SELECT
        routine_name,
        data_type as return_type,
        routine_definition
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'cleanup_old_audit_logs',
          'get_audit_log_stats',
          'get_recent_security_events',
          'cleanup_old_performance_metrics',
          'get_endpoint_performance',
          'update_onboarding_analytics',
          'track_feature_usage',
          'get_onboarding_completion_rate',
          'get_feature_adoption_metrics'
        )
      ORDER BY routine_name;
    `

    const functions = await client.query(functionsQuery)
    console.log('Functions found:')
    functions.rows.forEach((fn) => {
      console.log(`  ${fn.routine_name} -> ${fn.return_type}`)
    })

    const expectedFunctions = [
      'cleanup_old_audit_logs',
      'get_audit_log_stats',
      'get_recent_security_events',
      'cleanup_old_performance_metrics',
      'get_endpoint_performance',
      'update_onboarding_analytics',
      'track_feature_usage',
      'get_onboarding_completion_rate',
      'get_feature_adoption_metrics',
    ]

    const missingFunctions = expectedFunctions.filter(
      (fn) => !functions.rows.find((r) => r.routine_name === fn)
    )

    if (missingFunctions.length > 0) {
      console.log('\nFunctions missing:')
      missingFunctions.forEach((fn) => console.log(`  ${fn}`))
    }

    // Check for views
    console.log('\n\n=== CHECKING VIEWS ===\n')

    const viewsQuery = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND table_name IN (
          'pii_access_summary',
          'performance_summary',
          'onboarding_metrics_summary'
        )
      ORDER BY table_name;
    `

    const views = await client.query(viewsQuery)
    console.log('Views found:')
    views.rows.forEach((v) => console.log(`  ${v.table_name}`))

    const expectedViews = [
      'pii_access_summary',
      'performance_summary',
      'onboarding_metrics_summary',
    ]
    const missingViews = expectedViews.filter((v) => !views.rows.find((r) => r.table_name === v))

    if (missingViews.length > 0) {
      console.log('\nViews missing:')
      missingViews.forEach((v) => console.log(`  ${v}`))
    }
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await client.end()
  }
}

checkSchema()
