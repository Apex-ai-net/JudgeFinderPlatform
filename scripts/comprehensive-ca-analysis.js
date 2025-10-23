#!/usr/bin/env node

/**
 * Comprehensive California Judges & Courts Analysis
 * Identifies what we have vs what's available on CourtListener
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
  console.log('COMPREHENSIVE CA DATABASE ANALYSIS');
  console.log('========================================\n');

  // 1. Total judges
  const { count: totalJudges } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true });
  console.log(`📊 Total Judges in Database: ${totalJudges}`);

  // 2. California judges (by jurisdiction field)
  const { count: caJudgesCount } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })
    .eq('jurisdiction', 'CA');
  console.log(`🌴 CA Judges (jurisdiction='CA'): ${caJudgesCount}`);

  // 3. Courts analysis
  const { count: totalCourts } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true });
  console.log(`\n🏛️  Total Courts in Database: ${totalCourts}`);

  // 4. California courts
  const { data: caCourts } = await supabase
    .from('courts')
    .select('id, name, jurisdiction, courtlistener_id')
    .or('jurisdiction.eq.CA,name.ilike.%California%');

  console.log(`🌴 CA Courts: ${caCourts?.length || 0}`);

  if (caCourts && caCourts.length > 0) {
    const courtsWithCLID = caCourts.filter(c => c.courtlistener_id).length;
    console.log(`  ✅ With CourtListener ID: ${courtsWithCLID}`);
    console.log(`  ⚠️  Without CourtListener ID: ${caCourts.length - courtsWithCLID}`);

    console.log('\n  Sample CA Courts:');
    caCourts.slice(0, 10).forEach(c => {
      console.log(`    - ${c.name} (CLID: ${c.courtlistener_id || 'None'})`);
    });
  }

  // 5. Judges without court assignments
  const { data: judgesNoCourt } = await supabase
    .from('judges')
    .select('id, name, court_name, jurisdiction')
    .eq('jurisdiction', 'CA')
    .is('court_id', null);

  console.log(`\n⚠️  CA Judges without court_id: ${judgesNoCourt?.length || 0}`);
  if (judgesNoCourt && judgesNoCourt.length > 0) {
    console.log('  Sample:');
    judgesNoCourt.slice(0, 5).forEach(j => {
      console.log(`    - ${j.name} (court_name: ${j.court_name || 'None'})`);
    });
  }

  // 6. Judge types breakdown
  const { data: judgeTypes } = await supabase
    .from('judges')
    .select('classification, judge_type')
    .eq('jurisdiction', 'CA');

  const classificationCounts = {};
  const typeCounts = {};

  judgeTypes?.forEach(j => {
    if (j.classification) {
      classificationCounts[j.classification] = (classificationCounts[j.classification] || 0) + 1;
    }
    if (j.judge_type) {
      typeCounts[j.judge_type] = (typeCounts[j.judge_type] || 0) + 1;
    }
  });

  console.log('\n📊 Judge Classifications:');
  Object.entries(classificationCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  console.log('\n📊 Judge Types:');
  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  // 7. CourtListener coverage
  const { data: withCLData } = await supabase
    .from('judges')
    .select('courtlistener_data')
    .eq('jurisdiction', 'CA')
    .not('courtlistener_data', 'is', null)
    .limit(5);

  console.log(`\n🔗 Sample CourtListener Data Quality:`);
  if (withCLData && withCLData.length > 0) {
    const sample = withCLData[0].courtlistener_data;
    console.log(`  Fields available:`, Object.keys(sample).join(', '));
  }

  // 8. Estimate missing judges
  console.log('\n📈 ESTIMATES:');
  console.log(`  Current CA judges: ${caJudgesCount}`);
  console.log(`  Known CA superior court judges: ~1,600`);
  console.log(`  Federal judges in CA: ~150`);
  console.log(`  Appellate & Supreme Court: ~100`);
  console.log(`  Total expected: ~1,850+`);
  console.log(`  Potential missing: ${Math.max(0, 1850 - caJudgesCount)}`);

  console.log('\n========================================');
  console.log('ANALYSIS COMPLETE');
  console.log('========================================');
  console.log('\nRECOMMENDATIONS:');
  console.log('1. We have a good base of 1,000 CA judges');
  console.log('2. CourtListener API rate limits are strict');
  console.log('3. To avoid rate limits:');
  console.log('   - Use the existing sync scripts with proper delays');
  console.log('   - Import in small batches (50-100 at a time)');
  console.log('   - Space out imports over multiple days if needed');
  console.log('4. Focus on high-value judges (active, recent cases)');
}

main().catch(console.error);
