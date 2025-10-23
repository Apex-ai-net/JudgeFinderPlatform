#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMigration() {
  console.log('🔍 Checking if positions column exists...\n');

  // Try to select positions column
  const { data, error } = await supabase
    .from('judges')
    .select('positions')
    .limit(1);

  if (error) {
    if (error.message.includes('column') && error.message.includes('positions')) {
      console.log('❌ positions column does NOT exist');
      console.log('   Migration 20250817_001 needs to be applied\n');
      return false;
    }
    console.log(`❌ Error: ${error.message}\n`);
    return false;
  }

  console.log('✅ positions column EXISTS');
  console.log('   Migration already applied\n');
  return true;
}

checkMigration().catch(console.error);
