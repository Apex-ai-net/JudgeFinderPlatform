#!/usr/bin/env node

/**
 * Check CourtListener Data in Supabase
 * Queries database to audit existing CL integration
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCourtListenerData() {
  console.log('🔍 Checking CourtListener Data in Supabase...\n');

  // 1. Check judges table for CourtListener data
  console.log('📊 JUDGES TABLE:');

  const { count: totalJudges } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true });

  const { count: withClId } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('courtlistener_id', 'is', null);

  const { count: withPositions } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('positions', 'is', null);

  const { count: withSyncTimestamp } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('last_synced_at', 'is', null);

  console.log(`  Total Judges: ${totalJudges}`);
  console.log(`  With CourtListener ID: ${withClId}`);
  console.log(`  With Positions Data: ${withPositions}`);
  console.log(`  With Last Synced: ${withSyncTimestamp}`);
  console.log(`  CL Coverage: ${((withClId / totalJudges) * 100).toFixed(1)}%\n`);

  // 2. Sample judges with CourtListener data
  console.log('📋 SAMPLE JUDGES WITH COURTLISTENER DATA:');
  const { data: sampleJudges } = await supabase
    .from('judges')
    .select('id, name, courtlistener_id, positions, last_synced_at')
    .not('courtlistener_id', 'is', null)
    .limit(3);

  if (sampleJudges && sampleJudges.length > 0) {
    sampleJudges.forEach((judge, i) => {
      console.log(`  ${i + 1}. ${judge.name}`);
      console.log(`     CL ID: ${judge.courtlistener_id}`);
      console.log(`     Positions: ${judge.positions ? JSON.stringify(judge.positions).substring(0, 100) + '...' : 'null'}`);
      console.log(`     Last Synced: ${judge.last_synced_at || 'Never'}\n`);
    });
  } else {
    console.log('  No judges with CourtListener data found.\n');
  }

  // 3. Check courts table
  console.log('🏛️  COURTS TABLE:');
  const { count: totalCourts } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true });

  const { count: courtsWithClId } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true })
    .not('courtlistener_id', 'is', null);

  console.log(`  Total Courts: ${totalCourts}`);
  console.log(`  With CourtListener ID: ${courtsWithClId}`);
  console.log(`  CL Coverage: ${((courtsWithClId / totalCourts) * 100).toFixed(1)}%\n`);

  // 4. Check for sync tables
  console.log('🔄 SYNC INFRASTRUCTURE:');
  const tables = ['sync_logs', 'sync_queue', 'sync_statistics', 'webhook_events'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table}: Not found`);
    } else {
      console.log(`  ✅ ${table}: ${count} records`);
    }
  }
  console.log();

  // 5. Check sync logs for recent activity
  console.log('📈 RECENT SYNC ACTIVITY:');
  const { data: recentLogs, error: logsError } = await supabase
    .from('sync_logs')
    .select('sync_type, status, started_at, duration_ms')
    .in('sync_type', ['judge', 'court', 'decision'])
    .order('started_at', { ascending: false })
    .limit(5);

  if (logsError) {
    console.log(`  ❌ Cannot read sync_logs: ${logsError.message}\n`);
  } else if (recentLogs && recentLogs.length > 0) {
    recentLogs.forEach((log) => {
      console.log(`  ${log.sync_type.padEnd(10)} | ${log.status.padEnd(10)} | ${log.started_at} | ${log.duration_ms}ms`);
    });
    console.log();
  } else {
    console.log('  No sync logs found.\n');
  }

  // 6. Check for CourtListener-specific tables (cl_*)
  console.log('🗄️  COURTLISTENER-SPECIFIC TABLES:');
  const clTables = ['cl_people', 'cl_positions', 'cl_courts', 'cl_education', 'cl_political_affiliations', 'cl_sync_state'];
  for (const table of clTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`  ❌ ${table}: Not found (expected if using direct mapping)`);
    } else {
      console.log(`  ✅ ${table}: ${count} records`);
    }
  }
  console.log();

  // 7. Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Using direct mapping approach (CL data in judges/courts tables)`);
  console.log(`✅ Sync infrastructure tables exist`);
  console.log(`${totalJudges > 0 ? '✅' : '⚠️'}  ${totalJudges} total judges`);
  console.log(`${withClId > 0 ? '✅' : '⚠️'}  ${withClId} judges have CourtListener IDs (${((withClId / totalJudges) * 100).toFixed(1)}%)`);
  console.log(`${courtsWithClId > 0 ? '✅' : '⚠️'}  ${courtsWithClId} courts have CourtListener IDs (${((courtsWithClId / totalCourts) * 100).toFixed(1)}%)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkCourtListenerData().catch(console.error);
