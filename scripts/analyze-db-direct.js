#!/usr/bin/env node

/**
 * Direct Database State Analysis
 * Uses Supabase REST API to query database state
 */

import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://xstlnicbnzdxlgfiewmg.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdGxuaWNibnpkeGxnZmlld21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNzMzNCwiZXhwIjoyMDcxOTEzMzM0fQ.g7gsBTUa_Ij2aLJ6dYxMUkurHmg8VDjd_Ma_4JvbXRY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

async function executeSQL(sql) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SQL execution failed: ${error}`);
    }

    return await response.json();
  } catch (err) {
    console.error('SQL Error:', err.message);
    return null;
  }
}

async function analyzeDatabase() {
  console.log('='.repeat(80));
  console.log('SUPABASE DATABASE STATE ANALYSIS');
  console.log('='.repeat(80));
  console.log('\nDatabase:', SUPABASE_URL);
  console.log('Project:', 'xstlnicbnzdxlgfiewmg');
  console.log('\n');

  // 1. Check migration tracking table
  console.log('1. Checking Migration Tracking...\n');

  const { data: migrations, error: migError } = await supabase
    .schema('supabase_migrations')
    .from('schema_migrations')
    .select('*')
    .order('version');

  if (migError) {
    console.log('❌ Cannot access supabase_migrations.schema_migrations');
    console.log('   Error:', migError.message);
    console.log('   This table may not exist or needs permissions setup.\n');
  } else {
    console.log(`✓ Found ${migrations.length} tracked migrations:\n`);
    migrations.forEach(m => {
      console.log(`   - ${m.version} (${m.name || 'unnamed'})`);
    });
    console.log();
  }

  // 2. List all tables
  console.log('2. Listing Database Tables...\n');

  const { data: tables, error: tablesError } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public')
    .order('tablename');

  if (!tablesError && tables) {
    console.log(`✓ Found ${tables.length} tables in public schema:\n`);
    tables.forEach(t => console.log(`   - ${t.tablename}`));
    console.log();
  } else {
    console.log('❌ Could not list tables');
    console.log('   Error:', tablesError?.message);
    console.log();
  }

  // 3. Check key tables existence
  console.log('3. Checking Key Tables...\n');

  const keyTables = ['judges', 'courts', 'cases', 'decisions', 'judge_court_positions',
    'judicial_analytics', 'sync_queue', 'pricing_tiers', 'ad_spots'];

  for (const table of keyTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ ${table} - Does not exist or not accessible`);
    } else {
      console.log(`   ✓ ${table} - ${count} rows`);
    }
  }
  console.log();

  // 4. Check for specific columns indicating migrations
  console.log('4. Checking Migration-Specific Columns...\n');

  const columnChecks = [
    { table: 'judges', column: 'slug', migration: '20250820_001' },
    { table: 'judges', column: 'courtlistener_id', migration: '20250817_001' },
    { table: 'judges', column: 'jurisdiction', migration: '20250822_003' },
    { table: 'courts', column: 'slug', migration: '20250821_001' },
    { table: 'cases', column: 'source_url', migration: '20250824_001' },
    { table: 'cases', column: 'docket_hash', migration: '20251017_002' },
    { table: 'sync_queue', column: 'max_retries', migration: '20251019_001' }
  ];

  for (const check of columnChecks) {
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', check.table)
      .eq('column_name', check.column)
      .single();

    if (columns) {
      console.log(`   ✓ ${check.table}.${check.column} exists (${check.migration})`);
    } else {
      console.log(`   ❌ ${check.table}.${check.column} missing (${check.migration})`);
    }
  }
  console.log();

  // 5. Check for indexes
  console.log('5. Checking Performance Indexes...\n');

  const { data: indexes } = await supabase
    .from('pg_indexes')
    .select('tablename, indexname')
    .eq('schemaname', 'public')
    .in('tablename', ['judges', 'courts', 'cases', 'decisions'])
    .order('tablename');

  if (indexes) {
    const grouped = indexes.reduce((acc, idx) => {
      if (!acc[idx.tablename]) acc[idx.tablename] = [];
      acc[idx.tablename].push(idx.indexname);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([table, idxs]) => {
      console.log(`   ${table}:`);
      idxs.forEach(idx => console.log(`      - ${idx}`));
    });
    console.log();
  }

  // 6. Check for materialized views
  console.log('6. Checking Materialized Views...\n');

  const { data: matviews } = await supabase
    .from('pg_matviews')
    .select('matviewname')
    .eq('schemaname', 'public');

  if (matviews && matviews.length > 0) {
    console.log(`✓ Found ${matviews.length} materialized views:\n`);
    matviews.forEach(mv => console.log(`   - ${mv.matviewname}`));
  } else {
    console.log('   No materialized views found (20250930_002 not applied)');
  }
  console.log();

  // 7. Check for functions
  console.log('7. Checking Database Functions...\n');

  const { data: functions } = await supabase
    .from('pg_proc')
    .select('proname')
    .eq('pronamespace', 'public')
    .limit(20);

  if (functions) {
    console.log(`✓ Found ${functions.length} functions\n`);
  }

  // 8. Read local migrations
  console.log('8. Reading Local Migration Files...\n');

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = await fs.readdir(migrationsDir);
  const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

  console.log(`✓ Found ${sqlFiles.length} local migration files\n`);

  // 9. Generate comparison
  console.log('='.repeat(80));
  console.log('MIGRATION STATUS COMPARISON');
  console.log('='.repeat(80));
  console.log();

  const trackedVersions = new Set(migrations?.map(m => m.version) || []);

  console.log('Local migrations vs Database tracking:\n');

  sqlFiles.forEach(file => {
    const timestamp = file.split('_')[0];
    const isTracked = trackedVersions.has(timestamp);
    const status = isTracked ? '✓ Tracked' : '❌ Not tracked';
    console.log(`${status} - ${file}`);
  });

  console.log();
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Local migration files: ${sqlFiles.length}`);
  console.log(`Tracked in database: ${migrations?.length || 0}`);
  console.log(`Missing tracking: ${sqlFiles.length - (migrations?.length || 0)}`);
  console.log();

  // 10. Generate fix script
  const missingMigrations = sqlFiles.filter(file => {
    const timestamp = file.split('_')[0];
    return !trackedVersions.has(timestamp);
  });

  if (missingMigrations.length > 0) {
    console.log('='.repeat(80));
    console.log('GENERATED FIX SCRIPT');
    console.log('='.repeat(80));
    console.log();
    console.log('-- Run this SQL in Supabase SQL Editor to fix migration tracking');
    console.log('BEGIN;');
    console.log();

    missingMigrations.forEach(file => {
      const timestamp = file.split('_')[0];
      const name = file.replace('.sql', '');
      console.log(`-- ${file}`);
      console.log(`INSERT INTO supabase_migrations.schema_migrations (version, name)`);
      console.log(`VALUES ('${timestamp}', '${name}')`);
      console.log(`ON CONFLICT (version) DO NOTHING;`);
      console.log();
    });

    console.log('COMMIT;');
    console.log();
    console.log('-- Verify with:');
    console.log('-- SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;');
    console.log();

    // Save to file
    let fixScript = `-- Migration Tracking Fix Script
-- Generated: ${new Date().toISOString()}
-- Database: ${SUPABASE_URL}
-- Project: xstlnicbnzdxlgfiewmg
--
-- This script marks migrations as applied in the tracking table.
-- Review each migration to ensure it has actually been applied to your database.

BEGIN;

`;

    missingMigrations.forEach(file => {
      const timestamp = file.split('_')[0];
      const name = file.replace('.sql', '');
      fixScript += `-- ${file}\n`;
      fixScript += `INSERT INTO supabase_migrations.schema_migrations (version, name)\n`;
      fixScript += `VALUES ('${timestamp}', '${name}')\n`;
      fixScript += `ON CONFLICT (version) DO NOTHING;\n\n`;
    });

    fixScript += `COMMIT;

-- Verify with:
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;
`;

    const fixPath = path.join(__dirname, '..', 'supabase', 'fix-migration-tracking.sql');
    await fs.writeFile(fixPath, fixScript);
    console.log(`✓ Saved fix script to: ${fixPath}`);
    console.log();
  }

  console.log('='.repeat(80));
  console.log('NEXT STEPS');
  console.log('='.repeat(80));
  console.log();
  console.log('1. Review the migration status above');
  console.log('2. Verify which migrations have actually been applied to your database');
  console.log('3. Run the fix script in Supabase SQL Editor to update tracking');
  console.log('4. Use: supabase db push to apply any truly pending migrations');
  console.log();
}

analyzeDatabase().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  console.error(err);
  process.exit(1);
});
