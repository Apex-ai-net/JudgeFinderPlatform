#!/usr/bin/env node

/**
 * Inspect Sample CourtListener Data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectSamples() {
  console.log('🔍 Inspecting Sample CourtListener Data...\n');

  // 1. Get sample judges with all CL fields
  console.log('📊 SAMPLE JUDGES (with CourtListener data):');
  const { data: judges, error: judgesError } = await supabase
    .from('judges')
    .select('id, name, courtlistener_id, positions, last_synced_at, created_at')
    .not('courtlistener_id', 'is', null)
    .limit(5);

  if (judgesError) {
    console.log(`  ❌ Error: ${judgesError.message}\n`);
  } else if (judges && judges.length > 0) {
    judges.forEach((judge, i) => {
      console.log(`\n  ${i + 1}. ${judge.name || 'Unknown'}`);
      console.log(`     Internal ID: ${judge.id}`);
      console.log(`     CourtListener ID: ${judge.courtlistener_id}`);
      console.log(`     Positions: ${judge.positions ? JSON.stringify(judge.positions, null, 2) : 'null'}`);
      console.log(`     Last Synced: ${judge.last_synced_at || 'Never'}`);
      console.log(`     Created: ${judge.created_at}`);
    });
  } else {
    console.log('  No judges found.\n');
  }

  // 2. Get sample courts with CL data
  console.log('\n\n🏛️  SAMPLE COURTS (with CourtListener data):');
  const { data: courts, error: courtsError } = await supabase
    .from('courts')
    .select('id, name, courtlistener_id, courthouse_metadata, last_synced_at')
    .not('courtlistener_id', 'is', null)
    .limit(3);

  if (courtsError) {
    console.log(`  ❌ Error: ${courtsError.message}\n`);
  } else if (courts && courts.length > 0) {
    courts.forEach((court, i) => {
      console.log(`\n  ${i + 1}. ${court.name || 'Unknown'}`);
      console.log(`     Internal ID: ${court.id}`);
      console.log(`     CourtListener ID: ${court.courtlistener_id}`);
      console.log(`     Metadata: ${court.courthouse_metadata ? JSON.stringify(court.courthouse_metadata).substring(0, 200) + '...' : 'null'}`);
      console.log(`     Last Synced: ${court.last_synced_at || 'Never'}`);
    });
  } else {
    console.log('  No courts found.\n');
  }

  // 3. Check sync queue
  console.log('\n\n🔄 SYNC QUEUE STATUS:');
  const { data: queue, error: queueError } = await supabase
    .from('sync_queue')
    .select('id, type, status, scheduled_for, started_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (queueError) {
    console.log(`  ❌ Error: ${queueError.message}\n`);
  } else if (queue && queue.length > 0) {
    console.log(`  Total queued jobs: ${queue.length}`);
    queue.forEach((job) => {
      console.log(`\n  Job ID: ${job.id}`);
      console.log(`  Type: ${job.type}`);
      console.log(`  Status: ${job.status}`);
      console.log(`  Scheduled: ${job.scheduled_for}`);
      console.log(`  Started: ${job.started_at || 'Not started'}`);
      console.log(`  Completed: ${job.completed_at || 'Not completed'}`);
    });
  } else {
    console.log('  No jobs in queue.\n');
  }

  // 4. Check if sync_logs table exists with different approach
  console.log('\n\n📈 CHECKING SYNC LOGS TABLE:');
  try {
    const { data: schema } = await supabase
      .from('sync_logs')
      .select('*')
      .limit(0);
    console.log('  ✅ sync_logs table exists');

    const { data: logs } = await supabase
      .from('sync_logs')
      .select('sync_id, sync_type, status, started_at, duration_ms')
      .order('started_at', { ascending: false })
      .limit(5);

    if (logs && logs.length > 0) {
      console.log(`  Recent logs: ${logs.length} found\n`);
      logs.forEach((log) => {
        console.log(`  ${log.sync_type.padEnd(10)} | ${log.status.padEnd(10)} | ${log.started_at} | ${log.duration_ms || 'N/A'}ms`);
      });
    } else {
      console.log('  No logs found (table is empty)\n');
    }
  } catch (error) {
    console.log(`  ❌ sync_logs table may not exist: ${error.message}\n`);
  }

  // 5. Summary stats by jurisdiction
  console.log('\n\n🗺️  JUDGE DISTRIBUTION BY JURISDICTION:');
  const { data: byJurisdiction } = await supabase
    .from('judges')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null);

  if (byJurisdiction && byJurisdiction.length > 0) {
    const counts = {};
    byJurisdiction.forEach((j) => {
      counts[j.jurisdiction] = (counts[j.jurisdiction] || 0) + 1;
    });

    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([jurisdiction, count]) => {
        console.log(`  ${jurisdiction.padEnd(20)}: ${count} judges`);
      });
  } else {
    console.log('  No jurisdiction data found.\n');
  }

  console.log('\n✅ Inspection complete!\n');
}

inspectSamples().catch(console.error);
