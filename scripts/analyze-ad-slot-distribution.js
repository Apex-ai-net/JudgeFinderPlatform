#!/usr/bin/env node

/**
 * Detailed analysis of ad slot distribution across judges
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeAdSlotDistribution() {
  console.log('\n========================================');
  console.log('Ad Slot Distribution Analysis');
  console.log('========================================\n');

  try {
    // Get all ad spots for judges with their positions
    const { data: adSpots, error: adSpotsError } = await supabase
      .from('ad_spots')
      .select('entity_id, position, status')
      .eq('entity_type', 'judge')
      .order('entity_id')
      .order('position');

    if (adSpotsError) {
      throw new Error(`Failed to get ad spots: ${adSpotsError.message}`);
    }

    // Group by judge ID and collect their positions
    const judgeSlots = {};
    adSpots.forEach(slot => {
      if (!judgeSlots[slot.entity_id]) {
        judgeSlots[slot.entity_id] = [];
      }
      judgeSlots[slot.entity_id].push({
        position: slot.position,
        status: slot.status
      });
    });

    // Analyze distribution
    const distribution = {
      '0_slots': [],
      '1_slot': [],
      '2_slots': [],
      '3_slots': [],
      'more_than_3': []
    };

    const missingPositions = {
      'missing_pos_1': [],
      'missing_pos_2': [],
      'missing_pos_3': []
    };

    Object.entries(judgeSlots).forEach(([judgeId, slots]) => {
      const count = slots.length;
      const positions = slots.map(s => s.position).sort();

      // Categorize by count
      if (count === 0) distribution['0_slots'].push(judgeId);
      else if (count === 1) distribution['1_slot'].push(judgeId);
      else if (count === 2) distribution['2_slots'].push(judgeId);
      else if (count === 3) distribution['3_slots'].push(judgeId);
      else distribution['more_than_3'].push(judgeId);

      // Check which positions are missing
      if (!positions.includes(1)) missingPositions['missing_pos_1'].push(judgeId);
      if (!positions.includes(2)) missingPositions['missing_pos_2'].push(judgeId);
      if (!positions.includes(3)) missingPositions['missing_pos_3'].push(judgeId);
    });

    // Get total judges to find judges with NO ad spots
    const { count: totalJudges } = await supabase
      .from('judges')
      .select('id', { count: 'exact', head: true });

    const judgesWithNoSlots = totalJudges - Object.keys(judgeSlots).length;

    console.log('SLOT COUNT DISTRIBUTION:');
    console.log('========================');
    console.log(`Judges with 0 slots:  ${judgesWithNoSlots}`);
    console.log(`Judges with 1 slot:   ${distribution['1_slot'].length}`);
    console.log(`Judges with 2 slots:  ${distribution['2_slots'].length}`);
    console.log(`Judges with 3 slots:  ${distribution['3_slots'].length}`);
    console.log(`Judges with >3 slots: ${distribution['more_than_3'].length}`);
    console.log(`Total judges:         ${totalJudges}`);

    console.log('\n\nMISSING POSITIONS:');
    console.log('==================');
    console.log(`Judges missing position 1: ${missingPositions['missing_pos_1'].length}`);
    console.log(`Judges missing position 2: ${missingPositions['missing_pos_2'].length}`);
    console.log(`Judges missing position 3: ${missingPositions['missing_pos_3'].length}`);

    // Sample judges with only 1 slot to see which position they have
    console.log('\n\nSAMPLE: Judges with only 1 slot (first 10):');
    console.log('============================================');
    const sample1Slot = distribution['1_slot'].slice(0, 10);
    for (const judgeId of sample1Slot) {
      const slots = judgeSlots[judgeId];
      console.log(`Judge ${judgeId}: Position ${slots[0].position} (${slots[0].status})`);
    }

    // Sample judges with 2 slots
    console.log('\n\nSAMPLE: Judges with 2 slots (first 10):');
    console.log('========================================');
    const sample2Slots = distribution['2_slots'].slice(0, 10);
    for (const judgeId of sample2Slots) {
      const slots = judgeSlots[judgeId];
      const positions = slots.map(s => `${s.position}(${s.status})`).join(', ');
      console.log(`Judge ${judgeId}: Positions ${positions}`);
    }

    // Check if any judges have more than 3 slots
    if (distribution['more_than_3'].length > 0) {
      console.log('\n\nWARNING: Judges with MORE than 3 slots:');
      console.log('========================================');
      const sampleExcess = distribution['more_than_3'].slice(0, 10);
      for (const judgeId of sampleExcess) {
        const slots = judgeSlots[judgeId];
        const positions = slots.map(s => `${s.position}(${s.status})`).join(', ');
        console.log(`Judge ${judgeId}: ${slots.length} slots - Positions ${positions}`);
      }
    }

    console.log('\n========================================');
    console.log('ANALYSIS COMPLETE');
    console.log('========================================\n');

  } catch (error) {
    console.error('\nERROR during analysis:', error.message);
    console.error(error);
    process.exit(1);
  }
}

analyzeAdSlotDistribution();
