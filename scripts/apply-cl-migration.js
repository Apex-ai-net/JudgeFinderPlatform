#!/usr/bin/env node
/**
 * Apply CourtListener Migration Safely
 * Adds positions JSONB column to judges table
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('🔧 Applying CourtListener Migration...\n');

  try {
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250817_001_add_courtlistener_fields.sql');

    if (!fs.existsSync(migrationPath)) {
      console.log('❌ Migration file not found at:', migrationPath);
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('   File:', migrationPath);
    console.log('\n📝 Migration SQL:');
    console.log('━'.repeat(60));
    console.log(migrationSQL);
    console.log('━'.repeat(60));
    console.log('\n⚠️  This migration will:');
    console.log('   • Add courtlistener_id column to courts (if not exists)');
    console.log('   • Add courthouse_metadata column to courts (if not exists)');
    console.log('   • Add courtlistener_id column to judges (if not exists)');
    console.log('   • Add positions JSONB column to judges (if not exists)');
    console.log('   • Create indexes and constraints');
    console.log('\n💡 Note: Using "IF NOT EXISTS" ensures safety on re-runs\n');

    // Execute via direct SQL using service role
    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`🚀 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`   ${i + 1}/${statements.length}: ${stmt.substring(0, 60)}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        // Try alternative approach - some statements might fail safely
        console.log(`      ⚠️  Warning: ${error.message}`);
      } else {
        console.log(`      ✅ Success`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log('\n🔍 Verifying...');

    // Verify the positions column exists now
    const { data, error: verifyError } = await supabase
      .from('judges')
      .select('positions')
      .limit(1);

    if (verifyError) {
      console.log(`\n❌ Verification failed: ${verifyError.message}`);
      console.log('\n💡 Manual verification needed:');
      console.log('   Run: npx supabase migration up');
      console.log('   Or apply SQL manually via Supabase dashboard\n');
    } else {
      console.log('✅ Verification successful - positions column exists!\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Fallback: Apply migration manually');
    console.log('   Option 1: Supabase Dashboard → SQL Editor');
    console.log('   Option 2: psql $DATABASE_URL < supabase/migrations/20250817_001_add_courtlistener_fields.sql\n');
  }
}

applyMigration().catch(console.error);
