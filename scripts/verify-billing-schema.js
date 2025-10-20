#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'ad_orders',
  'judge_ad_products',
  'ad_spot_bookings',
  'checkout_sessions',
  'organizations',
  'invoices',
  'webhook_logs',
  'advertiser_profiles',
];

async function checkTables() {
  console.log('\n📊 Database Schema Verification\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = [];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`  ❌ ${table.padEnd(25)} - NOT FOUND or NO ACCESS`);
        console.log(`     Error: ${error.message}`);
        results.push({ table, exists: false, error: error.message });
      } else {
        console.log(`  ✅ ${table.padEnd(25)} - EXISTS (rows: ${count || 0})`);
        results.push({ table, exists: true, rowCount: count || 0 });
      }
    } catch (err) {
      console.log(`  ❌ ${table.padEnd(25)} - ERROR: ${err.message}`);
      results.push({ table, exists: false, error: err.message });
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const existingTables = results.filter((r) => r.exists);
  const missingTables = results.filter((r) => !r.exists);

  console.log(`✅ Existing tables: ${existingTables.length}/${tables.length}`);
  console.log(`❌ Missing tables: ${missingTables.length}/${tables.length}\n`);

  if (missingTables.length > 0) {
    console.log('Missing tables:');
    missingTables.forEach((t) => {
      console.log(`  • ${t.table}`);
    });
    console.log('');
  }

  return results;
}

checkTables()
  .then((results) => {
    const allExist = results.every((r) => r.exists);
    process.exit(allExist ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
