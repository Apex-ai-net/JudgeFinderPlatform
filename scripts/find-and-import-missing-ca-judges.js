#!/usr/bin/env node

/**
 * Find and Import Missing California Judges from CourtListener
 *
 * This script:
 * 1. Fetches all CA judges from CourtListener API
 * 2. Compares with existing judges in database
 * 3. Safely imports missing judges with proper rate limiting
 * 4. Avoids triggering CourtListener's rate limits
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const COURTLISTENER_API_KEY = process.env.COURTLISTENER_API_KEY;
const COURTLISTENER_BASE_URL = 'https://www.courtlistener.com/api/rest/v4';

// Safe rate limiting: 1 request per second (well under their limits)
const RATE_LIMIT_MS = 1500; // 1.5 seconds between requests
const BATCH_SIZE = 50; // Process in small batches

class RateLimiter {
  constructor(delayMs) {
    this.delayMs = delayMs;
    this.lastRequest = 0;
  }

  async wait() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.delayMs) {
      const waitTime = this.delayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequest = Date.now();
  }
}

const rateLimiter = new RateLimiter(RATE_LIMIT_MS);

async function fetchFromAPI(url) {
  await rateLimiter.wait();

  const response = await fetch(url, {
    headers: {
      'Authorization': `Token ${COURTLISTENER_API_KEY}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.warn('⚠️  Rate limit hit. Waiting 60 seconds...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      return fetchFromAPI(url); // Retry after waiting
    }
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

async function fetchAllCAJudgesFromCourtListener() {
  console.log('\n📊 Fetching California judges from CourtListener...');
  const allJudges = [];
  let offset = 0;
  let hasMore = true;
  const pageSize = 100;

  while (hasMore) {
    try {
      // CourtListener uses offset-based pagination, not page numbers
      const url = `${COURTLISTENER_BASE_URL}/people/?format=json&page_size=${pageSize}&offset=${offset}`;
      const data = await fetchFromAPI(url);

      if (data.results && data.results.length > 0) {
        // Filter for California judges
        const caJudges = data.results.filter(judge => {
          // Check if judge has any position in California
          return judge.positions?.some(pos => {
            const court = pos.court || '';
            const courtName = pos.court_name || '';
            return court.toLowerCase().includes('ca') ||
                   courtName.toLowerCase().includes('california');
          });
        });

        allJudges.push(...caJudges);
        console.log(`  Offset ${offset}: Found ${caJudges.length}/${data.results.length} CA judges (Total: ${allJudges.length})`);
      }

      hasMore = data.next !== null && data.results.length > 0;
      offset += pageSize;

      // Safety limit to prevent infinite loops
      if (offset >= 5000) {
        console.log('⚠️  Reached safety limit (checked 5,000 records)');
        break;
      }
    } catch (error) {
      console.error(`Error at offset ${offset}:`, error.message);
      // If we get an error, try to continue with what we have
      if (allJudges.length > 0) {
        console.log(`⚠️  Continuing with ${allJudges.length} judges found so far...`);
        break;
      }
      throw error;
    }
  }

  return allJudges;
}

async function getExistingJudgesFromDB() {
  console.log('\n📊 Fetching existing judges from database...');

  const { data, error } = await supabase
    .from('judges')
    .select('courtlistener_id, name')
    .not('courtlistener_id', 'is', null);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  const existingIds = new Set(data.map(j => j.courtlistener_id.toString()));
  console.log(`  Found ${existingIds.size} judges with CourtListener IDs`);

  return existingIds;
}

function classifyJudge(positions) {
  const currentPosition = positions?.find(p => !p.date_termination) || positions?.[0];
  if (!currentPosition) return 'superior_court_judge';

  const positionType = currentPosition.position_type?.toLowerCase() || '';
  const courtId = currentPosition.court?.toLowerCase() || '';

  // Federal classifications
  if (courtId.includes('ca9')) return 'article_iii_judge';
  if (positionType.includes('magistrate')) return 'magistrate_judge';
  if (positionType.includes('bankruptcy')) return 'bankruptcy_judge';
  if (positionType.includes('senior')) return 'senior_judge';

  // State classifications
  if (courtId === 'cal') return 'state_supreme_justice';
  if (courtId.includes('calctapp')) return 'state_appellate_justice';
  if (positionType.includes('commissioner')) return 'court_commissioner';
  if (positionType.includes('pro tem')) return 'judge_pro_tem';
  if (positionType.includes('referee')) return 'referee';
  if (positionType.includes('administrative law')) return 'administrative_law_judge';
  if (positionType.includes('workers comp')) return 'wcab_judge';

  return 'superior_court_judge';
}

async function fetchJudgeDetails(judgeId) {
  try {
    const url = `${COURTLISTENER_BASE_URL}/people/${judgeId}/?format=json`;
    return await fetchFromAPI(url);
  } catch (error) {
    console.error(`  ❌ Error fetching judge ${judgeId}:`, error.message);
    return null;
  }
}

async function importJudge(judgeData) {
  try {
    const positions = judgeData.positions || [];
    const currentPosition = positions.find(p => !p.date_termination) || positions[0];

    // Get court information
    let courtId = null;
    let courtName = currentPosition?.court_name || null;

    if (currentPosition?.court) {
      const { data: court } = await supabase
        .from('courts')
        .select('id, name')
        .eq('courtlistener_id', currentPosition.court)
        .maybeSingle();

      if (court) {
        courtId = court.id;
        courtName = court.name;
      }
    }

    const judgeRecord = {
      name: judgeData.name_full || `${judgeData.name_first || ''} ${judgeData.name_last || ''}`.trim(),
      court_id: courtId,
      court_name: courtName,
      jurisdiction: 'CA',
      judge_type: currentPosition?.position_type || 'Judge',
      position_type: currentPosition?.position_type,
      classification: classifyJudge(positions),
      federal_judge: currentPosition?.court?.startsWith('ca') && !currentPosition.court.startsWith('cal'),
      state_judge: currentPosition?.court?.startsWith('cal'),
      is_active: !judgeData.date_dod && !currentPosition?.date_termination,
      appointed_date: currentPosition?.date_start,
      bio: judgeData.biography || null,
      courtlistener_id: judgeData.id.toString(),
      courtlistener_data: judgeData
    };

    const { data, error } = await supabase
      .from('judges')
      .insert([judgeRecord])
      .select('id')
      .single();

    if (error) {
      // Check if it's a duplicate key error (already exists)
      if (error.code === '23505') {
        console.log(`  ⚠️  Judge already exists: ${judgeRecord.name}`);
        return null;
      }
      throw error;
    }

    console.log(`  ✅ Imported: ${judgeRecord.name} (${judgeRecord.classification})`);
    return data.id;
  } catch (error) {
    console.error(`  ❌ Error importing judge:`, error.message);
    return null;
  }
}

async function main() {
  console.log('========================================');
  console.log('FIND & IMPORT MISSING CA JUDGES');
  console.log('========================================');
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests`);
  console.log(`Batch size: ${BATCH_SIZE} judges per batch`);

  try {
    // Step 1: Get all CA judges from CourtListener
    const courtListenerJudges = await fetchAllCAJudgesFromCourtListener();
    console.log(`\n✅ Total CA judges in CourtListener: ${courtListenerJudges.length}`);

    // Step 2: Get existing judges from database
    const existingIds = await getExistingJudgesFromDB();

    // Step 3: Find missing judges
    const missingJudges = courtListenerJudges.filter(
      judge => !existingIds.has(judge.id.toString())
    );

    console.log(`\n📊 Analysis:`);
    console.log(`  CourtListener judges: ${courtListenerJudges.length}`);
    console.log(`  Database judges: ${existingIds.size}`);
    console.log(`  Missing judges: ${missingJudges.length}`);

    if (missingJudges.length === 0) {
      console.log('\n✅ No missing judges found! Database is up to date.');
      return;
    }

    console.log(`\n🚀 Starting import of ${missingJudges.length} missing judges...`);
    console.log(`   This will take approximately ${Math.ceil(missingJudges.length * RATE_LIMIT_MS / 1000 / 60)} minutes\n`);

    let imported = 0;
    let failed = 0;
    let skipped = 0;

    // Step 4: Import missing judges in batches
    for (let i = 0; i < missingJudges.length; i += BATCH_SIZE) {
      const batch = missingJudges.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missingJudges.length / BATCH_SIZE)}`);

      for (const judge of batch) {
        // Fetch detailed information
        const judgeDetails = await fetchJudgeDetails(judge.id);

        if (!judgeDetails) {
          failed++;
          continue;
        }

        // Import judge
        const judgeId = await importJudge(judgeDetails);

        if (judgeId) {
          imported++;
        } else if (judgeId === null) {
          skipped++;
        } else {
          failed++;
        }

        // Progress update every 10 judges
        if ((imported + failed + skipped) % 10 === 0) {
          console.log(`  Progress: ${imported} imported, ${skipped} skipped, ${failed} failed`);
        }
      }
    }

    // Final statistics
    console.log('\n========================================');
    console.log('IMPORT COMPLETE');
    console.log('========================================');
    console.log(`✅ Successfully imported: ${imported}`);
    console.log(`⚠️  Skipped (already exists): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total processed: ${imported + skipped + failed}`);

    // Verify final count
    const { data: finalCount } = await supabase
      .from('judges')
      .select('count')
      .single();

    console.log(`\n📊 Final database count: ${finalCount?.count || 'unknown'} judges`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (!COURTLISTENER_API_KEY) {
  console.error('❌ COURTLISTENER_API_KEY environment variable is required');
  process.exit(1);
}

main().catch(console.error);
