#!/usr/bin/env node

/**
 * Automated Court Assignment Updater
 * 
 * This script provides automated updating of court assignments by:
 * - Monitoring assignment data for changes
 * - Fetching fresh data from external sources
 * - Updating assignment information with proper date tracking
 * - Scheduling regular validation runs
 * - Maintaining assignment history
 */

const { createClient } = require('@supabase/supabase-js');
const cron = require('node-cron');
const fetchFn = typeof fetch === 'function' ? fetch.bind(global) : require('node-fetch');

function normalizeCourtListenerPosition(position) {
  if (!position || typeof position !== 'object') {
    return null;
  }

  const raw = position.raw && typeof position.raw === 'object' ? position.raw : position;

  const normalizeDate = (value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? trimmed : trimmed.slice(0, 10);
  };

  const resolvedCourtName = (() => {
    if (typeof position.court === 'string') return position.court;
    if (typeof raw.court === 'string') return raw.court;
    if (position.court_name) return position.court_name;
    if (raw.court_name) return raw.court_name;
    if (position.court_full_name) return position.court_full_name;
    if (raw.court_full_name) return raw.court_full_name;
    const courtObj = position.court && typeof position.court === 'object' ? position.court : raw.court;
    if (courtObj && typeof courtObj === 'object') {
      return courtObj.full_name || courtObj.name || courtObj.short_name || null;
    }
    return position.court_id || raw.court_id || null;
  })();

  const resolvedCourtId = (() => {
    if (position.court_id) return position.court_id;
    if (raw.court_id) return raw.court_id;
    const courtObj = position.court && typeof position.court === 'object' ? position.court : raw.court;
    if (courtObj && typeof courtObj === 'object' && courtObj.id) {
      return courtObj.id;
    }
    return null;
  })();

  const resolvedPositionType =
    position.position_type ||
    raw.position_type ||
    position.position ||
    raw.position ||
    position.position_name ||
    raw.position_name ||
    position.title ||
    raw.title ||
    'Judge';

  const startDate =
    normalizeDate(position.date_start) ||
    normalizeDate(raw.date_start) ||
    normalizeDate(position.start_date) ||
    normalizeDate(raw.start_date) ||
    normalizeDate(position.date_started) ||
    normalizeDate(raw.date_started) ||
    null;

  const endDate =
    normalizeDate(position.date_termination) ||
    normalizeDate(raw.date_termination) ||
    normalizeDate(position.end_date) ||
    normalizeDate(raw.end_date) ||
    normalizeDate(position.date_terminated) ||
    normalizeDate(raw.date_terminated) ||
    null;

  return {
    court: resolvedCourtName,
    court_id: resolvedCourtId,
    position_type: resolvedPositionType,
    date_start: startDate,
    date_termination: endDate,
    raw
  };
}
// Prefer .env.local to align with project conventions
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

class AutomatedAssignmentUpdater {
  constructor() {
    this.updateCount = 0;
    this.errorCount = 0;
    this.validationCount = 0;
    this.lastRunTime = null;
    this.isRunning = false;
  }

  async validateConnection() {
    try {
      const { data, error } = await supabase.from('court_assignments').select('id').limit(1);
      if (error && error.code === 'PGRST116') {
        throw new Error('court_assignments table does not exist');
      }
      return true;
    } catch (error) {
      console.error('❌ Database validation failed:', error.message);
      return false;
    }
  }

  async getAssignmentsNeedingUpdate() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: assignments, error } = await supabase
        .from('court_assignments')
        .select(`
          id,
          judge_id,
          court_id,
          assignment_status,
          last_verified_date,
          metadata,
          judges (id, name, courtlistener_id, courtlistener_data),
          courts (id, name)
        `)
        .eq('assignment_status', 'active')
        .or(`last_verified_date.is.null,last_verified_date.lt.${thirtyDaysAgo.toISOString().split('T')[0]}`);

      if (error) throw error;

      console.log(`📋 Found ${assignments.length} assignments needing verification update`);
      return assignments;
    } catch (error) {
      console.error('❌ Error fetching assignments needing update:', error.message);
      throw error;
    }
  }

  async fetchCourtListenerData(judgeRecord) {
    if (!judgeRecord) {
      return null;
    }

    const cachedPositions = Array.isArray(judgeRecord.courtlistener_data?.positions)
      ? judgeRecord.courtlistener_data.positions
      : [];

    const fallbackPositions = cachedPositions
      .map(normalizeCourtListenerPosition)
      .filter(Boolean);

    const fallback = fallbackPositions.length
      ? {
          positions: fallbackPositions,
          last_updated: judgeRecord.courtlistener_data?.last_updated || null,
          source: 'cached_courtlistener_data'
        }
      : null;

    const courtlistenerId = judgeRecord.courtlistener_id;
    const apiKey = process.env.COURTLISTENER_API_KEY || process.env.COURTLISTENER_API_TOKEN;

    if (!courtlistenerId) {
      console.warn('⚠️  Missing CourtListener ID for judge; using cached assignment data.');
      return fallback;
    }

    if (!apiKey) {
      console.warn('⚠️  COURTLISTENER_API_KEY not configured; skipping live fetch.');
      return fallback;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const url = new URL(`https://www.courtlistener.com/api/rest/v4/people/${courtlistenerId}/`);
      url.searchParams.set('format', 'json');

      const response = await fetchFn(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Token ${apiKey}`,
          'User-Agent': 'JudgeFinder Assignment Updater/1.0 (https://judgefinder.io)'
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const positions = Array.isArray(data.positions)
        ? data.positions.map(normalizeCourtListenerPosition).filter(Boolean)
        : [];

      if (!positions.length && fallbackPositions.length) {
        console.warn(`⚠️  CourtListener returned no positions for judge ${courtlistenerId}; using cached data.`);
        return fallback;
      }

      return {
        positions,
        last_updated: data.date_modified || new Date().toISOString(),
        source: 'courtlistener_api',
        raw: { id: data.id, name: data.name, positions: data.positions }
      };
    } catch (error) {
      clearTimeout(timeout);
      console.error(`❌ Error fetching CourtListener data for judge ${judgeRecord.id}:`, error.message);
      return fallback;
    }
  }

  async detectAssignmentChanges(assignment, freshData) {
    const changes = [];

    if (!freshData || !freshData.positions) {
      return changes;
    }

    // Analyze positions from CourtListener for changes
    const currentPositions = freshData.positions
      .map(normalizeCourtListenerPosition)
      .filter(Boolean)
      .filter(pos => !pos.date_termination);

    if (currentPositions.length === 0) {
      changes.push({
        type: 'position_ended',
        message: 'No current positions found in external data',
        severity: 'high',
        suggested_action: 'mark_inactive'
      });
      return changes;
    }

    // Check for new court assignments
    const assignmentMetadata = assignment.metadata || {};
    const lastKnownPositions = Array.isArray(assignmentMetadata.courtlistener_positions)
      ? assignmentMetadata.courtlistener_positions
          .map(normalizeCourtListenerPosition)
          .filter(Boolean)
      : [];

    for (const position of currentPositions) {
      const existingPosition = lastKnownPositions.find(p => 
        p.court === position.court && p.position_type === position.position_type
      );

      if (!existingPosition) {
        changes.push({
          type: 'new_position',
          message: `New position detected: ${position.position_type} at ${position.court}`,
          severity: 'medium',
          suggested_action: 'create_assignment',
          position_data: position
        });
      }
    }

    // Check for ended positions
    for (const oldPosition of lastKnownPositions) {
      const stillActive = currentPositions.find(p => 
        p.court === oldPosition.court && p.position_type === oldPosition.position_type
      );

      if (!stillActive) {
        changes.push({
          type: 'position_ended',
          message: `Position ended: ${oldPosition.position_type} at ${oldPosition.court}`,
          severity: 'medium',
          suggested_action: 'end_assignment',
          position_data: oldPosition
        });
      }
    }

    return changes;
  }

  async updateAssignmentVerification(assignmentId, changes = [], freshData = null) {
    try {
      const updateData = {
        last_verified_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      };

      // Update metadata with fresh data and detected changes
      if (freshData || changes.length > 0) {
        const { data: currentAssignment } = await supabase
          .from('court_assignments')
          .select('metadata')
          .eq('id', assignmentId)
          .single();

        const currentMetadata = currentAssignment?.metadata || {};
        
        updateData.metadata = {
          ...currentMetadata,
          last_auto_update: new Date().toISOString(),
          detected_changes: changes,
          ...(freshData && {
            courtlistener_positions: freshData.positions,
            last_courtlistener_update: freshData.last_updated
          })
        };
      }

      const { error } = await supabase
        .from('court_assignments')
        .update(updateData)
        .eq('id', assignmentId);

      if (error) throw error;

      this.updateCount++;
      return true;
    } catch (error) {
      console.error(`❌ Error updating assignment ${assignmentId}:`, error.message);
      this.errorCount++;
      return false;
    }
  }

  async processAssignmentUpdate(assignment) {
    try {
      console.log(`🔄 Processing ${assignment.judges?.name} at ${assignment.courts?.name}`);

      // Fetch fresh data from external sources
      const freshData = await this.fetchCourtListenerData(assignment.judges);

      // Detect changes
      const changes = await this.detectAssignmentChanges(assignment, freshData);

      // Update verification date and metadata
      await this.updateAssignmentVerification(assignment.id, changes, freshData);

      // Log significant changes
      if (changes.length > 0) {
        console.log(`  📝 Detected ${changes.length} changes:`);
        changes.forEach(change => {
          console.log(`    - ${change.type}: ${change.message}`);
        });

        // Handle high-severity changes
        const highSeverityChanges = changes.filter(c => c.severity === 'high');
        if (highSeverityChanges.length > 0) {
          await this.handleHighSeverityChanges(assignment, highSeverityChanges);
        }
      } else {
        console.log(`  ✅ No changes detected`);
      }

      this.validationCount++;
      return true;
    } catch (error) {
      console.error(`❌ Error processing assignment for ${assignment.judges?.name}:`, error.message);
      this.errorCount++;
      return false;
    }
  }

  async handleHighSeverityChanges(assignment, changes) {
    // For high-severity changes, we might want to:
    // 1. Send notifications to administrators
    // 2. Mark assignments for manual review
    // 3. Automatically end assignments if judges have retired

    for (const change of changes) {
      if (change.suggested_action === 'mark_inactive' && change.type === 'position_ended') {
        try {
          await supabase
            .from('court_assignments')
            .update({
              assignment_status: 'pending', // Mark for review rather than automatically ending
              assignment_end_date: new Date().toISOString().split('T')[0],
              notes: `Marked for review due to automated detection: ${change.message}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', assignment.id);

          console.log(`  ⚠️  Marked assignment for review due to: ${change.message}`);
        } catch (error) {
          console.error(`❌ Error handling high-severity change:`, error.message);
        }
      }
    }
  }

  async generateUpdateReport() {
    const report = {
      run_time: new Date().toISOString(),
      assignments_processed: this.validationCount,
      assignments_updated: this.updateCount,
      errors_encountered: this.errorCount,
      success_rate: this.validationCount > 0 ? ((this.validationCount - this.errorCount) / this.validationCount * 100).toFixed(2) + '%' : '0%'
    };

    // Store report in database for tracking
    try {
      await supabase
        .from('analytics_events')
        .insert({
          event_type: 'automated_assignment_update',
          event_data: report,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Error storing update report:', error.message);
    }

    return report;
  }

  async runUpdate(options = {}) {
    if (this.isRunning) {
      console.log('⚠️  Update already in progress, skipping...');
      return false;
    }

    this.isRunning = true;
    this.updateCount = 0;
    this.errorCount = 0;
    this.validationCount = 0;

    const { batchSize = 20 } = options;

    try {
      console.log('🚀 Starting automated assignment update...');

      if (!(await this.validateConnection())) {
        this.isRunning = false;
        return false;
      }

      const assignments = await this.getAssignmentsNeedingUpdate();

      if (assignments.length === 0) {
        console.log('✅ All assignments are up to date');
        this.isRunning = false;
        return true;
      }

      // Process in batches
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assignments.length / batchSize)}`);

        for (const assignment of batch) {
          await this.processAssignmentUpdate(assignment);
        }

        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Generate and log report
      const report = await this.generateUpdateReport();
      
      console.log('\n📊 Update Summary:');
      console.log(`Assignments processed: ${report.assignments_processed}`);
      console.log(`Assignments updated: ${report.assignments_updated}`);
      console.log(`Errors encountered: ${report.errors_encountered}`);
      console.log(`Success rate: ${report.success_rate}`);

      this.lastRunTime = new Date();
      this.isRunning = false;
      return this.errorCount === 0;

    } catch (error) {
      console.error('❌ Automated update failed:', error.message);
      this.isRunning = false;
      return false;
    }
  }

  startScheduledUpdates() {
    console.log('📅 Starting scheduled assignment updates...');
    console.log('Schedule: Daily at 2:00 AM and 2:00 PM');

    // Schedule updates twice daily
    cron.schedule('0 2,14 * * *', async () => {
      console.log('\n⏰ Running scheduled assignment update...');
      await this.runUpdate();
    });

    // Schedule weekly comprehensive validation
    cron.schedule('0 3 * * 1', async () => {
      console.log('\n📋 Running weekly comprehensive validation...');
      try {
        const { CourtJudgeValidator } = require('./validate-court-judge-relationships');
        const validatorInstance = new CourtJudgeValidator();
        await validatorInstance.runFullValidation();
      } catch (error) {
        console.error('❌ Weekly validation failed to run:', error.message);
      }
    });

    console.log('✅ Scheduled updates are now active');
  }

  stopScheduledUpdates() {
    cron.destroy();
    console.log('⏹️  Scheduled updates stopped');
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  const updater = new AutomatedAssignmentUpdater();

  switch (command) {
    case 'run':
      updater.runUpdate()
        .then(success => {
          if (success) {
            console.log('\n🎉 Assignment update completed successfully!');
            process.exit(0);
          } else {
            console.log('\n💥 Assignment update completed with errors');
            process.exit(1);
          }
        })
        .catch(error => {
          console.error('\n💥 Assignment update failed:', error);
          process.exit(1);
        });
      break;

    case 'schedule':
      console.log('Starting scheduled assignment updater...');
      updater.startScheduledUpdates();
      
      // Keep process alive
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down scheduled updater...');
        updater.stopScheduledUpdates();
        process.exit(0);
      });
      
      console.log('📅 Scheduled updater is running. Press Ctrl+C to stop.');
      break;

    case 'status':
      console.log('📊 Assignment Updater Status:');
      console.log(`Last run: ${updater.lastRunTime || 'Never'}`);
      console.log(`Currently running: ${updater.isRunning ? 'Yes' : 'No'}`);
      break;

    default:
      console.log('Usage: node automated-assignment-updater.js [run|schedule|status]');
      console.log('  run      - Run update once');
      console.log('  schedule - Start scheduled updates');
      console.log('  status   - Show updater status');
      process.exit(1);
  }
}

module.exports = AutomatedAssignmentUpdater;
