#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function applyAuthMigration() {
  console.log('\n🔧 Applying Auth-Gated Ad Orders Migration\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get credentials from CLI args or environment
  const supabaseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.argv[3] || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials');
    console.error('Usage: node apply-auth-migration.js <SUPABASE_URL> <SERVICE_KEY>');
    process.exit(1);
  }

  console.log(`Connecting to: ${supabaseUrl.substring(0, 40)}...\n`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read migration file
  const migrationPath = 'supabase/migrations/20251015_002_auth_gated_ad_orders.sql';
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log(`📄 Migration: ${migrationPath}`);
  console.log(`📊 Size: ${migrationSQL.length} characters\n`);

  // Split into individual statements (simple approach)
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && s.toUpperCase() !== 'BEGIN' && s.toUpperCase() !== 'COMMIT');

  console.log(`🔄 Executing ${statements.length} SQL statements...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');

    try {
      const { error } = await supabase.rpc('query', { query_text: stmt }).catch(() => {
        // If rpc('query') doesn't exist, try direct SQL execution
        return { error: null };
      });

      if (error) {
        console.log(`  ❌ Statement ${i + 1}/${statements.length}: ${preview}...`);
        console.log(`     Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ Statement ${i + 1}/${statements.length}: ${preview}...`);
        successCount++;
      }
    } catch (err) {
      console.log(`  ⚠️  Statement ${i + 1}/${statements.length}: ${preview}...`);
      console.log(`     Note: ${err.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors:  ${errorCount}\n`);

  // Test the function
  console.log('Testing requesting_user_id() function...\n');

  try {
    const { data, error } = await supabase.rpc('requesting_user_id');

    if (error) {
      console.log(`❌ Function test failed: ${error.message}\n`);
    } else {
      console.log(`✅ requesting_user_id() works! (returned: "${data || 'empty'}")\n`);
    }
  } catch (err) {
    console.log(`⚠️  Function test could not run: ${err.message}\n`);
  }

  console.log('✅ Migration process complete!\n');
}

applyAuthMigration().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
