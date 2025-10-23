#!/usr/bin/env node

/**
 * Get actual column names from Supabase tables
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getSchema() {
  console.log('🔍 Fetching Actual Database Schema...\n');

  // Get one record from each table to see columns
  console.log('📊 JUDGES TABLE COLUMNS:');
  const { data: judgesSample, error: judgesError } = await supabase
    .from('judges')
    .select('*')
    .limit(1)
    .single();

  if (judgesError) {
    console.log(`  ❌ Error: ${judgesError.message}`);
  } else if (judgesSample) {
    const columns = Object.keys(judgesSample);
    console.log(`  Total columns: ${columns.length}`);
    console.log(`  Columns: ${columns.join(', ')}\n`);

    // Highlight CL-related columns
    const clColumns = columns.filter(col =>
      col.includes('courtlistener') ||
      col.includes('cl_') ||
      col.includes('position') ||
      col.includes('sync') ||
      col.includes('education') ||
      col.includes('affiliation')
    );
    if (clColumns.length > 0) {
      console.log(`  CourtListener-related columns: ${clColumns.join(', ')}\n`);
    }

    // Show sample data
    console.log('  Sample judge:');
    console.log(`    ID: ${judgesSample.id}`);
    console.log(`    Name: ${judgesSample.name || 'N/A'}`);
    if (judgesSample.courtlistener_id) {
      console.log(`    CourtListener ID: ${judgesSample.courtlistener_id}`);
    }
  }

  console.log('\n🏛️  COURTS TABLE COLUMNS:');
  const { data: courtsSample, error: courtsError } = await supabase
    .from('courts')
    .select('*')
    .limit(1)
    .single();

  if (courtsError) {
    console.log(`  ❌ Error: ${courtsError.message}`);
  } else if (courtsSample) {
    const columns = Object.keys(courtsSample);
    console.log(`  Total columns: ${columns.length}`);
    console.log(`  Columns: ${columns.join(', ')}\n`);

    // Highlight CL-related columns
    const clColumns = columns.filter(col =>
      col.includes('courtlistener') ||
      col.includes('cl_') ||
      col.includes('sync') ||
      col.includes('metadata')
    );
    if (clColumns.length > 0) {
      console.log(`  CourtListener-related columns: ${clColumns.join(', ')}\n`);
    }

    // Show sample data
    console.log('  Sample court:');
    console.log(`    ID: ${courtsSample.id}`);
    console.log(`    Name: ${courtsSample.name || 'N/A'}`);
    if (courtsSample.courtlistener_id) {
      console.log(`    CourtListener ID: ${courtsSample.courtlistener_id}`);
    }
  }

  console.log('\n🔄 SYNC_QUEUE TABLE COLUMNS:');
  const { data: queueSample } = await supabase
    .from('sync_queue')
    .select('*')
    .limit(1)
    .single();

  if (queueSample) {
    const columns = Object.keys(queueSample);
    console.log(`  Total columns: ${columns.length}`);
    console.log(`  Columns: ${columns.join(', ')}\n`);
  }

  console.log('\n✅ Schema inspection complete!\n');
}

getSchema().catch(console.error);
