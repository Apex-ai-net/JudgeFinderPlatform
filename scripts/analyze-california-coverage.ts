import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// All 58 California counties
const ALL_CA_COUNTIES = [
  'Alameda', 'Alpine', 'Amador', 'Butte', 'Calaveras', 'Colusa', 'Contra Costa',
  'Del Norte', 'El Dorado', 'Fresno', 'Glenn', 'Humboldt', 'Imperial', 'Inyo',
  'Kern', 'Kings', 'Lake', 'Lassen', 'Los Angeles', 'Madera', 'Marin', 'Mariposa',
  'Mendocino', 'Merced', 'Modoc', 'Mono', 'Monterey', 'Napa', 'Nevada', 'Orange',
  'Placer', 'Plumas', 'Riverside', 'Sacramento', 'San Benito', 'San Bernardino',
  'San Diego', 'San Francisco', 'San Joaquin', 'San Luis Obispo', 'San Mateo',
  'Santa Barbara', 'Santa Clara', 'Santa Cruz', 'Shasta', 'Sierra', 'Siskiyou',
  'Solano', 'Sonoma', 'Stanislaus', 'Sutter', 'Tehama', 'Trinity', 'Tulare',
  'Tuolumne', 'Ventura', 'Yolo', 'Yuba'
];

interface AnalysisReport {
  summary: {
    totalJudges: number;
    totalCourts: number;
    judgesWithCourtListener: number;
    courtListenerPercentage: number;
    countiesRepresented: number;
    countiesMissing: number;
    coveragePercentage: number;
  };
  counties: {
    represented: Array<{ county: string; judgeCount: number; courtCount: number }>;
    missing: string[];
  };
  judgeDistribution: {
    byCounty: Array<{ county: string; count: number }>;
    topCounties: Array<{ county: string; count: number }>;
  };
}

// Helper to extract county from jurisdiction string
function extractCounty(jurisdiction: string | null): string | null {
  if (!jurisdiction) return null;

  // Try various patterns:
  // "Superior Court of California, County of Los Angeles"
  // "Los Angeles County Superior Court"
  // "California Superior Court - San Diego County"

  const patterns = [
    /County of ([A-Za-z\s]+)/i,
    /([A-Za-z\s]+) County/i,
    /([A-Za-z\s]+) Superior Court/i
  ];

  for (const pattern of patterns) {
    const match = jurisdiction.match(pattern);
    if (match && match[1]) {
      const county = match[1].trim();
      // Verify it's a valid California county
      if (ALL_CA_COUNTIES.includes(county)) {
        return county;
      }
    }
  }

  return null;
}

async function analyzeCaliforniaCoverage(): Promise<AnalysisReport> {
  console.log('Starting California coverage analysis...\n');

  // 1. Count California judges - filter by jurisdiction = "CA" or containing "California"
  const { data: allJudges, error: judgesFetchError } = await supabase
    .from('judges')
    .select('id, name, jurisdiction, court_name, courtlistener_id');

  if (judgesFetchError) {
    console.error('Error fetching judges:', judgesFetchError);
    throw judgesFetchError;
  }

  // Filter for California judges
  const caJudges = allJudges?.filter(j =>
    j.jurisdiction === 'CA' ||
    (j.jurisdiction && j.jurisdiction.toLowerCase().includes('california')) ||
    (j.court_name && j.court_name.toLowerCase().includes('california'))
  ) || [];

  const totalJudges = caJudges.length;
  console.log(`✓ Total California judges: ${totalJudges}`);

  // 2. Count California courts
  const { data: allCourts, error: courtsFetchError } = await supabase
    .from('courts')
    .select('id, name, jurisdiction, county, courtlistener_id');

  if (courtsFetchError) {
    console.error('Error fetching courts:', courtsFetchError);
    throw courtsFetchError;
  }

  // Filter for California courts
  const caCourts = allCourts?.filter(c =>
    (c.jurisdiction && (
      c.jurisdiction.toLowerCase().includes('california') ||
      c.jurisdiction.toLowerCase().includes(' ca ') ||
      c.jurisdiction.toLowerCase().includes('ca,')
    )) ||
    (c.county && ALL_CA_COUNTIES.includes(c.county))
  ) || [];

  const totalCourts = caCourts.length;
  console.log(`✓ Total California courts: ${totalCourts}`);

  // 3. Count judges with CourtListener ID
  const judgesWithCL = caJudges.filter(j => j.courtlistener_id).length;
  const clPercentage = totalJudges ? ((judgesWithCL / totalJudges) * 100).toFixed(2) : '0.00';
  console.log(`✓ Judges with CourtListener ID: ${judgesWithCL} (${clPercentage}%)`);

  // 4. Extract counties from courts
  const courtCounties = new Set<string>();
  const countyCourts: Record<string, number> = {};

  caCourts.forEach(court => {
    // Use county field if available, otherwise try to extract from jurisdiction
    let county = court.county;
    if (!county && court.jurisdiction) {
      county = extractCounty(court.jurisdiction);
    }

    if (county && ALL_CA_COUNTIES.includes(county)) {
      courtCounties.add(county);
      countyCourts[county] = (countyCourts[county] || 0) + 1;
    }
  });

  const representedCounties = Array.from(courtCounties).sort();
  console.log(`✓ Counties represented in courts: ${representedCounties.length}`);

  // 5. Identify missing counties
  const missingCounties = ALL_CA_COUNTIES.filter(
    county => !courtCounties.has(county)
  ).sort();

  console.log(`✓ Counties missing: ${missingCounties.length}`);

  // 6. Get judge distribution by county
  const countyJudgeCounts: Record<string, number> = {};

  caJudges.forEach(judge => {
    // Try to extract county from court_name first, then jurisdiction
    let county = null;

    if (judge.court_name) {
      county = extractCounty(judge.court_name);
    }

    if (!county && judge.jurisdiction) {
      county = extractCounty(judge.jurisdiction);
    }

    if (county && ALL_CA_COUNTIES.includes(county)) {
      countyJudgeCounts[county] = (countyJudgeCounts[county] || 0) + 1;
    }
  });

  // Build represented counties list with counts
  const representedWithCounts = representedCounties.map(county => ({
    county,
    judgeCount: countyJudgeCounts[county] || 0,
    courtCount: countyCourts[county] || 0
  })).sort((a, b) => b.judgeCount - a.judgeCount);

  // Build judge distribution
  const judgeDistribution = Object.entries(countyJudgeCounts)
    .map(([county, count]) => ({ county, count }))
    .sort((a, b) => b.count - a.count);

  const topCounties = judgeDistribution.slice(0, 10);

  const coveragePercentage = ((representedCounties.length / ALL_CA_COUNTIES.length) * 100).toFixed(2);

  return {
    summary: {
      totalJudges,
      totalCourts,
      judgesWithCourtListener: judgesWithCL,
      courtListenerPercentage: parseFloat(clPercentage),
      countiesRepresented: representedCounties.length,
      countiesMissing: missingCounties.length,
      coveragePercentage: parseFloat(coveragePercentage)
    },
    counties: {
      represented: representedWithCounts,
      missing: missingCounties
    },
    judgeDistribution: {
      byCounty: judgeDistribution,
      topCounties
    }
  };
}

async function generateReport() {
  try {
    const report = await analyzeCaliforniaCoverage();

    console.log('\n' + '='.repeat(80));
    console.log('CALIFORNIA COVERAGE ANALYSIS REPORT');
    console.log('='.repeat(80));

    console.log('\n📊 SUMMARY STATISTICS');
    console.log('-'.repeat(80));
    console.log(`Total California Judges:       ${report.summary.totalJudges}`);
    console.log(`Total California Courts:       ${report.summary.totalCourts}`);
    console.log(`Judges with CourtListener:     ${report.summary.judgesWithCourtListener} (${report.summary.courtListenerPercentage}%)`);
    console.log(`Counties Represented:          ${report.summary.countiesRepresented} / 58 (${report.summary.coveragePercentage}%)`);
    console.log(`Counties Missing:              ${report.summary.countiesMissing} / 58`);

    console.log('\n🏛️ TOP 10 COUNTIES BY JUDGE COUNT');
    console.log('-'.repeat(80));
    report.judgeDistribution.topCounties.forEach((item, idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${item.county.padEnd(20)} - ${item.count} judges`);
    });

    console.log('\n✅ COUNTIES WITH COVERAGE (All 58 or represented)');
    console.log('-'.repeat(80));
    if (report.counties.represented.length > 0) {
      console.log('County                 | Judges | Courts');
      console.log('-'.repeat(80));
      report.counties.represented.forEach(item => {
        console.log(`${item.county.padEnd(22)} | ${item.judgeCount.toString().padStart(6)} | ${item.courtCount.toString().padStart(6)}`);
      });
    } else {
      console.log('No counties represented yet.');
    }

    console.log('\n❌ COUNTIES MISSING COVERAGE');
    console.log('-'.repeat(80));
    if (report.counties.missing.length > 0) {
      // Print in columns
      const cols = 3;
      for (let i = 0; i < report.counties.missing.length; i += cols) {
        const row = report.counties.missing.slice(i, i + cols);
        console.log(row.map(c => c.padEnd(25)).join(''));
      }
    } else {
      console.log('🎉 Complete coverage! All 58 California counties are represented.');
    }

    console.log('\n📈 COVERAGE ANALYSIS');
    console.log('-'.repeat(80));
    const needsWork = report.counties.represented.filter(c => c.judgeCount === 0);
    if (needsWork.length > 0) {
      console.log(`⚠️  ${needsWork.length} counties have courts but no judges:`);
      needsWork.forEach(c => console.log(`   - ${c.county}`));
    }

    console.log('\n💡 COURTLISTENER INTEGRATION STATUS');
    console.log('-'.repeat(80));
    console.log(`Judges with CourtListener ID:  ${report.summary.judgesWithCourtListener} / ${report.summary.totalJudges} (${report.summary.courtListenerPercentage}%)`);
    const clMissing = report.summary.totalJudges - report.summary.judgesWithCourtListener;
    console.log(`Judges missing CourtListener:  ${clMissing}`);

    if (report.summary.courtListenerPercentage < 100) {
      console.log('\n⚡ RECOMMENDATION: Run CourtListener sync to improve integration coverage.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('END OF REPORT');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error generating report:', error);
    process.exit(1);
  }
}

generateReport();
