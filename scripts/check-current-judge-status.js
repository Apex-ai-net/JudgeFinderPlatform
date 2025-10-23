#!/usr/bin/env node

/**
 * Check Current Judge Status in Database
 * Quick analysis of what judges we have
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('========================================');
  console.log('CURRENT JUDGE DATABASE STATUS');
  console.log('========================================\n');

  // Total judges
  const { count: totalJudges } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total Judges: ${totalJudges}`);

  // Judges with CourtListener IDs
  const { count: withCLID } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .not('courtlistener_id', 'is', null);

  console.log(`🔗 With CourtListener ID: ${withCLID}`);

  // Judges by jurisdiction
  const { data: byJurisdiction } = await supabase
    .from('judges')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null);

  const jurisdictionCounts = {};
  byJurisdiction?.forEach(j => {
    jurisdictionCounts[j.jurisdiction] = (jurisdictionCounts[j.jurisdiction] || 0) + 1;
  });

  console.log('\n📍 Judges by Jurisdiction:');
  Object.entries(jurisdictionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([jur, count]) => {
      console.log(`  ${jur}: ${count}`);
    });

  // California-specific analysis
  const { data: caJudges } = await supabase
    .from('judges')
    .select('id, name, court_id, courtlistener_id, jurisdiction')
    .eq('jurisdiction', 'CA');

  console.log(`\n🌴 California Judges: ${caJudges?.length || 0}`);

  if (caJudges) {
    const caWithCLID = caJudges.filter(j => j.courtlistener_id).length;
    const caWithoutCLID = caJudges.filter(j => !j.courtlistener_id).length;

    console.log(`  ✅ With CourtListener ID: ${caWithCLID}`);
    console.log(`  ⚠️  Without CourtListener ID: ${caWithoutCLID}`);

    if (caWithoutCLID > 0) {
      console.log('\n  Sample judges without CourtListener ID:');
      caJudges
        .filter(j => !j.courtlistener_id)
        .slice(0, 10)
        .forEach(j => {
          console.log(`    - ${j.name}`);
        });
    }
  }

  // Check courts
  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, state, courtlistener_id')
    .or('state.eq.CA,jurisdiction.eq.CA');

  console.log(`\n🏛️  California Courts: ${courts?.length || 0}`);

  if (courts && courts.length > 0) {
    const courtsWithCLID = courts.filter(c => c.courtlistener_id).length;
    console.log(`  ✅ With CourtListener ID: ${courtsWithCLID}`);
    console.log(`  ⚠️  Without CourtListener ID: ${courts.length - courtsWithCLID}`);
  }

  console.log('\n========================================');
  console.log('STATUS CHECK COMPLETE');
  console.log('========================================');
}

main().catch(console.error);
