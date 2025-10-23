#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspect() {
  console.log('🔍 FINAL CourtListener Data Audit\n');

  // Sample judges with CL data
  console.log('📊 SAMPLE JUDGES WITH COURTLISTENER DATA:');
  const { data: judges } = await supabase
    .from('judges')
    .select('id, name, courtlistener_id, courtlistener_data, education, jurisdiction')
    .not('courtlistener_id', 'is', null)
    .limit(3);

  if (judges) {
    judges.forEach((j, i) => {
      console.log(`\n${i + 1}. ${j.name}`);
      console.log(`   CL ID: ${j.courtlistener_id}`);
      console.log(`   Jurisdiction: ${j.jurisdiction}`);
      console.log(`   Education: ${j.education || 'None'}`);
      const dataPreview = j.courtlistener_data ? JSON.stringify(j.courtlistener_data).substring(0, 150) + '...' : 'null';
      console.log(`   CL Data: ${dataPreview}`);
    });
  }

  // Sample courts
  console.log('\n\n🏛️  SAMPLE COURTS WITH COURTLISTENER DATA:');
  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, courtlistener_id, courtlistener_data, jurisdiction')
    .not('courtlistener_id', 'is', null)
    .limit(3);

  if (courts) {
    courts.forEach((c, i) => {
      console.log(`\n${i + 1}. ${c.name}`);
      console.log(`   CL ID: ${c.courtlistener_id}`);
      console.log(`   Jurisdiction: ${c.jurisdiction}`);
      const dataPreview = c.courtlistener_data ? JSON.stringify(c.courtlistener_data).substring(0, 100) + '...' : 'null';
      console.log(`   CL Data: ${dataPreview}`);
    });
  }

  // CL data coverage
  console.log('\n\n📈 DATA COVERAGE:');
  const { count: totalJ } = await supabase.from('judges').select('*', { count: 'exact', head: true });
  const { count: withClId } = await supabase.from('judges').select('*', { count: 'exact', head: true }).not('courtlistener_id', 'is', null);
  const { count: withClData } = await supabase.from('judges').select('*', { count: 'exact', head: true }).not('courtlistener_data', 'is', null);
  const { count: withEdu } = await supabase.from('judges').select('*', { count: 'exact', head: true }).not('education', 'is', null);

  console.log(`  Judges Total: ${totalJ}`);
  console.log(`  With CL ID: ${withClId} (${(withClId/totalJ*100).toFixed(1)}%)`);
  console.log(`  With CL Data: ${withClData} (${(withClData/totalJ*100).toFixed(1)}%)`);
  console.log(`  With Education: ${withEdu} (${(withEdu/totalJ*100).toFixed(1)}%)`);

  const resultC = await supabase.from('courts').select('*', { count: 'exact', head: true });
  const totalC = resultC.count;
  const resultClId = await supabase.from('courts').select('*', { count: 'exact', head: true }).not('courtlistener_id', 'is', null);
  const courtsClId = resultClId.count;
  const resultClData = await supabase.from('courts').select('*', { count: 'exact', head: true }).not('courtlistener_data', 'is', null);
  const courtsClData = resultClData.count;

  console.log(`\n  Courts Total: ${totalC}`);
  console.log(`  With CL ID: ${courtsClId} (${(courtsClId/totalC*100).toFixed(1)}%)`);
  console.log(`  With CL Data: ${courtsClData} (${(courtsClData/totalC*100).toFixed(1)}%)`);

  console.log('\n✅ Audit complete!\n');
}

inspect().catch(console.error);
