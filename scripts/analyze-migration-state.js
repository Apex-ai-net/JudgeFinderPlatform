#!/usr/bin/env node

/**
 * Migration State Analysis Script
 *
 * Analyzes the current state of Supabase migrations and provides
 * detailed recommendations for fixing migration tracking.
 */

import { createClient } from '@supabase/supabase-js'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Supabase Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  if (!SUPABASE_URL) console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  if (!SERVICE_ROLE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nPlease set these in your .env.local file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
})

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function section(title) {
  console.log('\n' + '='.repeat(80))
  log(title, 'bright')
  console.log('='.repeat(80))
}

async function getLocalMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const files = await fs.readdir(migrationsDir)

  const sqlFiles = files
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((filename) => ({
      filename,
      timestamp: filename.split('_')[0],
      name: filename.replace('.sql', ''),
    }))

  return sqlFiles
}

async function getAppliedMigrations() {
  try {
    // Try querying the schema_migrations table
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: true })

    if (error) {
      log(`Error querying schema_migrations: ${error.message}`, 'red')
      return null
    }

    return data
  } catch (err) {
    log(`Exception querying migrations: ${err.message}`, 'red')
    return null
  }
}

async function checkTableExists(tableName) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        );
      `,
    })

    if (error) {
      // Try direct query as fallback
      const { data: tableData, error: tableError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0)

      return !tableError
    }

    return data
  } catch (err) {
    return false
  }
}

async function getAllTables() {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name')

    if (error) {
      log(`Error querying tables: ${error.message}`, 'yellow')
      return []
    }

    return data?.map((t) => t.table_name) || []
  } catch (err) {
    log(`Exception querying tables: ${err.message}`, 'yellow')
    return []
  }
}

async function getMigrationContent(filename) {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')
  const filePath = path.join(migrationsDir, filename)
  const content = await fs.readFile(filePath, 'utf-8')
  return content
}

function extractTablesFromSQL(sqlContent) {
  const tables = []

  // Match CREATE TABLE statements
  const createTableRegex =
    /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi
  let match

  while ((match = createTableRegex.exec(sqlContent)) !== null) {
    tables.push(match[1])
  }

  return [...new Set(tables)] // Remove duplicates
}

async function analyzeMigrationState() {
  section('MIGRATION STATE ANALYSIS - JudgeFinder Database')

  // Step 1: Get local migrations
  log('\n[1/5] Reading local migration files...', 'cyan')
  const localMigrations = await getLocalMigrations()
  log(`Found ${localMigrations.length} local migration files`, 'green')

  // Step 2: Get applied migrations from database
  log('\n[2/5] Querying applied migrations from database...', 'cyan')
  const appliedMigrations = await getAppliedMigrations()

  if (!appliedMigrations) {
    log('Unable to query schema_migrations table. It may not exist.', 'yellow')
    log('This means migration tracking needs to be set up.', 'yellow')
  } else {
    log(`Found ${appliedMigrations.length} applied migrations in database`, 'green')
  }

  // Step 3: Get all tables in database
  log('\n[3/5] Querying existing database tables...', 'cyan')
  const existingTables = await getAllTables()
  log(`Found ${existingTables.length} tables in database`, 'green')

  // Step 4: Analyze each migration
  log('\n[4/5] Analyzing migration status...', 'cyan')

  const migrationAnalysis = []

  for (const migration of localMigrations) {
    const isApplied = appliedMigrations?.some(
      (am) => am.version === migration.timestamp || am.version === migration.name
    )

    // Read migration content to check what it creates
    const content = await getMigrationContent(migration.filename)
    const tablesCreated = extractTablesFromSQL(content)
    const tablesExist = tablesCreated.map((table) => ({
      name: table,
      exists: existingTables.includes(table),
    }))

    migrationAnalysis.push({
      ...migration,
      isApplied,
      tablesCreated,
      tablesExist,
      allTablesExist: tablesExist.every((t) => t.exists),
      someTablesExist: tablesExist.some((t) => t.exists),
    })
  }

  // Step 5: Generate report
  log('\n[5/5] Generating detailed report...', 'cyan')

  section('MIGRATION STATUS REPORT')

  console.log('\nSummary:')
  log(`  Total local migrations: ${localMigrations.length}`, 'bright')
  log(`  Applied in database: ${appliedMigrations?.length || 0}`, 'bright')
  log(
    `  Pending migrations: ${localMigrations.length - (appliedMigrations?.length || 0)}`,
    'bright'
  )
  log(`  Database tables: ${existingTables.length}`, 'bright')

  // Group migrations by status
  const appliedAndTracked = migrationAnalysis.filter((m) => m.isApplied)
  const appliedButNotTracked = migrationAnalysis.filter((m) => !m.isApplied && m.allTablesExist)
  const partiallyApplied = migrationAnalysis.filter(
    (m) => !m.isApplied && m.someTablesExist && !m.allTablesExist
  )
  const notApplied = migrationAnalysis.filter((m) => !m.isApplied && !m.someTablesExist)

  console.log('\n' + '-'.repeat(80))
  log('APPLIED AND TRACKED MIGRATIONS', 'green')
  console.log('-'.repeat(80))
  appliedAndTracked.forEach((m) => {
    console.log(`✓ ${m.filename}`)
    if (m.tablesCreated.length > 0) {
      console.log(`  Tables: ${m.tablesCreated.join(', ')}`)
    }
  })

  console.log('\n' + '-'.repeat(80))
  log('APPLIED BUT NOT TRACKED (Need to mark as applied)', 'yellow')
  console.log('-'.repeat(80))
  appliedButNotTracked.forEach((m) => {
    console.log(`⚠ ${m.filename}`)
    console.log(`  All tables exist: ${m.tablesCreated.join(', ')}`)
    console.log(`  Action: INSERT into schema_migrations`)
  })

  if (partiallyApplied.length > 0) {
    console.log('\n' + '-'.repeat(80))
    log('PARTIALLY APPLIED (Manual review needed)', 'magenta')
    console.log('-'.repeat(80))
    partiallyApplied.forEach((m) => {
      console.log(`⚠ ${m.filename}`)
      m.tablesExist.forEach((t) => {
        const status = t.exists ? '✓' : '✗'
        console.log(`  ${status} ${t.name}`)
      })
      console.log(`  Action: Review manually`)
    })
  }

  if (notApplied.length > 0) {
    console.log('\n' + '-'.repeat(80))
    log('NOT APPLIED (Need to run migrations)', 'blue')
    console.log('-'.repeat(80))
    notApplied.forEach((m) => {
      console.log(`✗ ${m.filename}`)
      if (m.tablesCreated.length > 0) {
        console.log(`  Will create: ${m.tablesCreated.join(', ')}`)
      }
      console.log(`  Action: Run migration SQL`)
    })
  }

  section('FIX STRATEGY')

  console.log('\nRecommended Actions:\n')

  if (appliedButNotTracked.length > 0) {
    log('1. Mark already-applied migrations as tracked:', 'yellow')
    console.log('\n-- Run this SQL to mark migrations as applied:')
    console.log('BEGIN;')
    appliedButNotTracked.forEach((m) => {
      console.log(
        `INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('${m.timestamp}');`
      )
    })
    console.log('COMMIT;')
  }

  if (notApplied.length > 0) {
    log('\n2. Apply pending migrations:', 'blue')
    console.log('\nRun these migrations in order:')
    notApplied.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.filename}`)
    })
  }

  if (partiallyApplied.length > 0) {
    log('\n3. Review partially applied migrations:', 'magenta')
    console.log('\nThese need manual review:')
    partiallyApplied.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.filename}`)
    })
  }

  section('DETAILED TABLE INVENTORY')

  console.log('\nExisting tables in database:')
  existingTables.sort().forEach((table) => {
    console.log(`  - ${table}`)
  })

  // Generate SQL fix script
  const fixScriptPath = path.join(__dirname, '..', 'supabase', 'fix-migration-tracking.sql')
  let fixScript = `-- Migration Tracking Fix Script
-- Generated: ${new Date().toISOString()}
--
-- This script marks migrations as applied that have already been executed
-- but are not tracked in the schema_migrations table.

BEGIN;

`

  appliedButNotTracked.forEach((m) => {
    fixScript += `-- Mark ${m.filename} as applied\n`
    fixScript += `INSERT INTO supabase_migrations.schema_migrations (version)\n`
    fixScript += `VALUES ('${m.timestamp}')\n`
    fixScript += `ON CONFLICT (version) DO NOTHING;\n\n`
  })

  fixScript += `COMMIT;

-- After running this script, verify with:
-- SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
`

  await fs.writeFile(fixScriptPath, fixScript)
  log(`\n✓ Generated fix script: ${fixScriptPath}`, 'green')

  section('NEXT STEPS')

  console.log(`
1. Review the analysis above
2. Run the generated SQL fix script to mark applied migrations
3. Apply any truly pending migrations using Supabase CLI or SQL editor
4. Verify all migrations are tracked with:
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
  `)
}

// Run the analysis
analyzeMigrationState().catch((err) => {
  log(`\nFatal error: ${err.message}`, 'red')
  console.error(err)
  process.exit(1)
})
