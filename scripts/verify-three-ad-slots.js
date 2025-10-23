#!/usr/bin/env node

/**
 * Verification script for 3 ad slots per judge migration
 * Migration: 20251022_001_support_three_ad_positions.sql
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Missing Supabase credentials');
  console.error('Please ensure .env.local contains:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('\n========================================');
  console.log('3 Ad Slots Per Judge - Migration Verification');
  console.log('Migration: 20251022_001_support_three_ad_positions');
  console.log('========================================\n');

  try {
    // ===================================================================
    // Query 1: Count total judges in the database
    // ===================================================================
    console.log('1. Counting total judges...');
    const { data: judges, error: judgesError, count: totalJudges } = await supabase
      .from('judges')
      .select('id', { count: 'exact', head: true });

    if (judgesError) {
      throw new Error(`Failed to count judges: ${judgesError.message}`);
    }

    console.log(`   Total judges: ${totalJudges}`);

    // ===================================================================
    // Query 2: Count position 3 ad_spots with status='available' for judges
    // ===================================================================
    console.log('\n2. Counting position 3 ad spots (status=available)...');
    const { data: position3Available, error: p3AvailableError, count: position3Count } = await supabase
      .from('ad_spots')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', 'judge')
      .eq('position', 3)
      .eq('status', 'available');

    if (p3AvailableError) {
      throw new Error(`Failed to count position 3 slots: ${p3AvailableError.message}`);
    }

    console.log(`   Position 3 slots (available): ${position3Count}`);

    // ===================================================================
    // Query 3: Find any judges missing position 3 slots
    // ===================================================================
    console.log('\n3. Finding judges missing position 3 slots...');

    // Get all judge IDs
    const { data: allJudgeIds, error: allJudgesError } = await supabase
      .from('judges')
      .select('id');

    if (allJudgesError) {
      throw new Error(`Failed to get judge IDs: ${allJudgesError.message}`);
    }

    // Get judges with position 3 slots
    const { data: judgesWithPos3, error: pos3Error } = await supabase
      .from('ad_spots')
      .select('entity_id')
      .eq('entity_type', 'judge')
      .eq('position', 3);

    if (pos3Error) {
      throw new Error(`Failed to get judges with position 3: ${pos3Error.message}`);
    }

    const judgesWithPos3Ids = new Set(judgesWithPos3.map(j => j.entity_id));
    const judgesMissingPos3 = allJudgeIds.filter(j => !judgesWithPos3Ids.has(j.id));

    console.log(`   Judges missing position 3: ${judgesMissingPos3.length}`);
    if (judgesMissingPos3.length > 0) {
      console.log(`   WARNING: ${judgesMissingPos3.length} judges are missing position 3 slots!`);
      console.log(`   First 5 judge IDs missing position 3:`, judgesMissingPos3.slice(0, 5).map(j => j.id));
    }

    // ===================================================================
    // Query 4: Verify constraints on ad_spot_bookings and judge_ad_products
    // ===================================================================
    console.log('\n4. Verifying position constraints allow positions 1, 2, 3...');

    const { data: constraints, error: constraintsError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT
          conname as constraint_name,
          conrelid::regclass as table_name,
          pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conname IN (
          'ad_spot_bookings_position_check',
          'judge_ad_products_position_check',
          'ad_spots_position_check',
          'pending_checkouts_ad_position_check'
        )
        ORDER BY table_name, constraint_name;
      `
    });

    // If RPC doesn't exist, try direct query
    if (constraintsError) {
      console.log('   Note: Cannot verify constraints via RPC (requires database function)');
      console.log('   Manual verification required via Supabase SQL Editor');
    } else {
      console.log('   Constraints found:');
      constraints.forEach(c => {
        console.log(`     - ${c.constraint_name} on ${c.table_name}`);
        console.log(`       Definition: ${c.definition}`);
      });
    }

    // ===================================================================
    // Query 5: Check if any position 3 slots are still in 'maintenance' status
    // ===================================================================
    console.log('\n5. Checking for position 3 slots in maintenance status...');
    const { data: maintenanceSlots, error: maintenanceError, count: maintenanceCount } = await supabase
      .from('ad_spots')
      .select('id, entity_id, status', { count: 'exact' })
      .eq('entity_type', 'judge')
      .eq('position', 3)
      .eq('status', 'maintenance');

    if (maintenanceError) {
      throw new Error(`Failed to check maintenance slots: ${maintenanceError.message}`);
    }

    console.log(`   Position 3 slots in maintenance: ${maintenanceCount}`);
    if (maintenanceCount > 0) {
      console.log(`   WARNING: ${maintenanceCount} position 3 slots still have status='maintenance'`);
      console.log(`   First 5 maintenance slots:`, maintenanceSlots.slice(0, 5));
    }

    // ===================================================================
    // Additional Check: Verify all judges have exactly 3 ad slots
    // ===================================================================
    console.log('\n6. Verifying all judges have exactly 3 ad slots (positions 1, 2, 3)...');

    const { data: adSlotCounts, error: adSlotsError } = await supabase
      .from('ad_spots')
      .select('entity_id')
      .eq('entity_type', 'judge');

    if (adSlotsError) {
      throw new Error(`Failed to get ad slot counts: ${adSlotsError.message}`);
    }

    // Count slots per judge
    const slotCountByJudge = {};
    adSlotCounts.forEach(slot => {
      slotCountByJudge[slot.entity_id] = (slotCountByJudge[slot.entity_id] || 0) + 1;
    });

    const judgesWithIncorrectSlots = Object.entries(slotCountByJudge)
      .filter(([_, count]) => count !== 3);

    console.log(`   Judges with exactly 3 slots: ${Object.values(slotCountByJudge).filter(c => c === 3).length}`);
    console.log(`   Judges with incorrect slot count: ${judgesWithIncorrectSlots.length}`);

    if (judgesWithIncorrectSlots.length > 0) {
      console.log(`   WARNING: ${judgesWithIncorrectSlots.length} judges do not have exactly 3 slots!`);
      console.log('   First 5 judges with incorrect counts:');
      judgesWithIncorrectSlots.slice(0, 5).forEach(([judgeId, count]) => {
        console.log(`     - Judge ID ${judgeId}: ${count} slots`);
      });
    }

    // ===================================================================
    // Summary Report
    // ===================================================================
    console.log('\n========================================');
    console.log('VERIFICATION SUMMARY');
    console.log('========================================');
    console.log(`Total judge count:                    ${totalJudges}`);
    console.log(`Total position 3 slots (available):   ${position3Count}`);
    console.log(`Position 3 slots (maintenance):       ${maintenanceCount}`);
    console.log(`Judges missing position 3:            ${judgesMissingPos3.length}`);
    console.log(`Judges with incorrect slot count:     ${judgesWithIncorrectSlots.length}`);
    console.log('========================================');

    // ===================================================================
    // Pass/Fail Assessment
    // ===================================================================
    const issues = [];

    if (position3Count !== totalJudges) {
      issues.push(`Position 3 available count (${position3Count}) does not match total judges (${totalJudges})`);
    }

    if (maintenanceCount > 0) {
      issues.push(`${maintenanceCount} position 3 slots are still in maintenance status`);
    }

    if (judgesMissingPos3.length > 0) {
      issues.push(`${judgesMissingPos3.length} judges are missing position 3 slots`);
    }

    if (judgesWithIncorrectSlots.length > 0) {
      issues.push(`${judgesWithIncorrectSlots.length} judges do not have exactly 3 ad slots`);
    }

    if (issues.length === 0) {
      console.log('\nSTATUS: SUCCESS ✓');
      console.log('All judges have exactly 3 ad slots (positions 1, 2, 3)');
      console.log('All position 3 slots are available for booking');
      console.log('Migration completed successfully!');
    } else {
      console.log('\nSTATUS: ISSUES FOUND ✗');
      console.log('\nIssues detected:');
      issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
      });
      console.log('\nPlease review the migration and fix any discrepancies.');
    }

    console.log('\n========================================\n');

  } catch (error) {
    console.error('\nERROR during verification:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run verification
verifyMigration();
