#!/usr/bin/env node
/**
 * Add positions JSONB column to judges table
 * Safe to run multiple times (uses IF NOT EXISTS)
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');
const { URL } = require('url');

async function addPositionsColumn() {
  console.log('🔧 Adding positions column to judges table...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  // Parse the project ref from URL
  const urlObj = new URL(supabaseUrl);
  const projectRef = urlObj.hostname.split('.')[0];

  const sql = `
-- Add positions column to judges table (safe - uses IF NOT EXISTS)
ALTER TABLE judges
ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN judges.positions IS 'JSON array of position history from CourtListener including court assignments, titles, and tenure dates';
  `.trim();

  console.log('📝 SQL to execute:');
  console.log('━'.repeat(60));
  console.log(sql);
  console.log('━'.repeat(60));
  console.log();

  // Use Supabase REST API to execute SQL
  const apiUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

  const payload = JSON.stringify({ query: sql });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'return=representation'
    }
  };

  console.log('🚀 Executing SQL via Supabase REST API...\n');

  // Try direct SQL execution approach
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceKey);

  // Execute each statement separately
  const statements = [
    "ALTER TABLE judges ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT '[]'::jsonb",
    "COMMENT ON COLUMN judges.positions IS 'JSON array of position history from CourtListener including court assignments, titles, and tenure dates'"
  ];

  for (const stmt of statements) {
    console.log(`   Executing: ${stmt.substring(0, 80)}...`);

    try {
      // Use raw SQL via PostgREST (if enabled)
      const { data, error } = await supabase
        .rpc('exec_sql', { sql_query: stmt })
        .select();

      if (error) {
        console.log(`      ⚠️  Note: ${error.message}`);
        // This might fail if exec_sql function doesn't exist - that's OK
      } else {
        console.log(`      ✅ Success`);
      }
    } catch (err) {
      console.log(`      ⚠️  Note: ${err.message}`);
    }
  }

  console.log('\n🔍 Verifying column was added...\n');

  // Verify by trying to select the column
  const { data, error } = await supabase
    .from('judges')
    .select('id, positions')
    .limit(1);

  if (error) {
    console.log('❌ Verification failed:', error.message);
    console.log('\n💡 Manual steps required:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Run the SQL shown above');
    console.log('   3. Or use: psql $DATABASE_URL -c "ALTER TABLE judges ADD COLUMN IF NOT EXISTS positions JSONB DEFAULT \'[]\'::jsonb"\n');
  } else {
    console.log('✅ SUCCESS! positions column exists and is queryable');
    console.log(`   Sample record ID: ${data[0]?.id}`);
    console.log(`   positions value: ${JSON.stringify(data[0]?.positions) || '[]'}\n`);
  }
}

addPositionsColumn().catch(console.error);
