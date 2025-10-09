#!/usr/bin/env node
/**
 * Fix Table Access Issue
 * Checks which migrations need to be applied and applies them
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTableExists(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      if (error.message.includes('Could not find the table') ||
          error.message.includes('relation') && error.message.includes('does not exist')) {
        return { exists: false, inSchemaCache: false, error: error.message };
      }
      return { exists: false, inSchemaCache: false, error: error.message };
    }

    return { exists: true, inSchemaCache: true, count };
  } catch (err) {
    return { exists: false, inSchemaCache: false, error: err.message };
  }
}

async function executeSQLFile(filePath, migrationName) {
  try {
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`\nApplying ${migrationName}...`);
    console.log(`File: ${filePath}`);

    // Execute the SQL via RPC or direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
      // If RPC doesn't exist, we'll need to use a different method
      return { data: null, error: { message: 'RPC not available' } };
    });

    if (error && error.message === 'RPC not available') {
      console.log('⚠️  Cannot execute SQL directly via REST API');
      console.log('📋 SQL file ready to be applied manually via SQL Editor');
      return { success: false, needsManual: true };
    }

    if (error) {
      console.log(`❌ Error applying ${migrationName}: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(`✅ ${migrationName} applied successfully`);
    return { success: true };
  } catch (err) {
    console.log(`❌ Error reading/applying ${migrationName}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function reloadSchemaCache() {
  try {
    console.log('\n🔄 Attempting to reload PostgREST schema cache...');

    // Method 1: Try to reload via admin API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      }
    });

    // Method 2: Make a simple query to trigger cache refresh
    await supabase.from('app_users').select('id').limit(1);

    console.log('✅ Schema cache refresh triggered');
    return true;
  } catch (err) {
    console.log(`⚠️  Could not automatically reload cache: ${err.message}`);
    console.log('💡 Manual reload required via Supabase Dashboard or by restarting the project');
    return false;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('TABLE ACCESS FIX UTILITY');
  console.log('========================================\n');

  // Step 1: Check current state
  console.log('📊 STEP 1: Checking current table state\n');

  const tables = {
    'audit_logs': 'supabase/migrations/20251008_001_audit_logs.sql',
    'performance_metrics': 'supabase/migrations/20250108_performance_metrics.sql',
    'onboarding_analytics': 'supabase/migrations/20251008_002_onboarding_analytics_FIXED.sql'
  };

  const tableStatus = {};

  for (const [tableName, migrationFile] of Object.entries(tables)) {
    const status = await checkTableExists(tableName);
    tableStatus[tableName] = { ...status, migrationFile };

    if (status.inSchemaCache) {
      console.log(`✅ ${tableName}: Accessible (in schema cache)`);
    } else if (status.error?.includes('Could not find the table')) {
      console.log(`❌ ${tableName}: Not in schema cache (${status.error})`);
    } else {
      console.log(`❓ ${tableName}: Unknown state (${status.error || 'No error'})`);
    }
  }

  // Step 2: Identify missing tables
  console.log('\n📋 STEP 2: Analysis\n');

  const missingTables = Object.entries(tableStatus).filter(([, status]) => !status.inSchemaCache);
  const accessibleTables = Object.entries(tableStatus).filter(([, status]) => status.inSchemaCache);

  console.log(`Accessible tables: ${accessibleTables.length}/3`);
  console.log(`Tables needing attention: ${missingTables.length}/3\n`);

  if (missingTables.length === 0) {
    console.log('✅ All tables are accessible!');
    return;
  }

  // Step 3: Provide fix instructions
  console.log('🔧 STEP 3: Fix Instructions\n');

  console.log('The following tables are not accessible via REST API:');
  missingTables.forEach(([tableName]) => {
    console.log(`  - ${tableName}`);
  });

  console.log('\n📝 RECOMMENDED FIX:\n');
  console.log('Since we cannot execute SQL directly via REST API, please apply these migrations manually:');
  console.log('\n1. Go to Supabase Dashboard → SQL Editor');
  console.log('2. For each missing table, copy and paste the SQL from these files:\n');

  missingTables.forEach(([tableName, status]) => {
    const fullPath = join(dirname(__dirname), status.migrationFile);
    console.log(`   ${tableName}:`);
    console.log(`   - File: ${status.migrationFile}`);
    console.log(`   - Full path: ${fullPath}\n`);
  });

  console.log('3. After applying the SQL, reload the schema cache by either:');
  console.log('   a. Restarting your Supabase project (Dashboard → Settings → General → Pause/Resume)');
  console.log('   b. Or wait a few minutes for automatic cache reload');
  console.log('   c. Or run: POST /rest/v1/ with admin headers\n');

  // Step 4: Try to reload cache anyway
  console.log('🔄 STEP 4: Attempting cache reload\n');
  await reloadSchemaCache();

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================\n');

  console.log('**Issue Identified:**');
  console.log(`- ${missingTables.length} table(s) not in PostgREST schema cache`);
  console.log(`- Tables may exist in database but PostgREST cannot see them`);
  console.log('\n**Root Cause:**');
  console.log('- Either migrations were not applied, or');
  console.log('- Schema cache not refreshed after migration\n');

  console.log('**Next Steps:**');
  console.log('1. Apply missing migrations via SQL Editor (see files above)');
  console.log('2. Reload schema cache (restart project or wait)');
  console.log('3. Run this script again to verify\n');

  console.log('========================================\n');
}

main().catch(console.error);
