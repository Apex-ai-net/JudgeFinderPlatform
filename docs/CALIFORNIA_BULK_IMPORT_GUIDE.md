# California Bulk Import Guide

Complete guide for importing ALL California judges and courts from CourtListener into JudgeFinder.io database.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Execution Steps](#execution-steps)
5. [Monitoring & Validation](#monitoring--validation)
6. [Troubleshooting](#troubleshooting)
7. [Rate Limit Management](#rate-limit-management)

## Overview

This system performs a comprehensive multi-phase import of California judicial data from CourtListener, pulling:

- **Courts**: All 150-200 California courts (state + federal)
- **Judges**: All 2,000-5,000 active and retired California judges
- **Positions**: Court appointments and position history
- **Education**: Educational background
- **Political Affiliations**: Party affiliations and appointment details
- **Opinions**: Written judicial opinions (decisions)
- **Dockets**: Case assignments and outcomes

**Goal**: Ensure 80%+ of judges have 500+ cases for bias analytics.

## Architecture

### Components Created

#### 1. Database Layer

**File**: `supabase/migrations/20251024_002_sync_progress_tracking.sql`

Creates `sync_progress` table to track data completeness:

- Tracks which judges have complete data
- Auto-calculates `is_analytics_ready` (500+ cases)
- Provides phase tracking (discovery → positions → details → opinions → dockets → complete)
- Includes materialized view `sync_progress_summary` for aggregated stats

#### 2. Sync Managers

**Enhanced Court Sync** (`lib/sync/court-sync.ts`)

- Comprehensive California filtering (58 counties + federal courts)
- Matches all variations: "California Superior Court", "C.D. Cal", "9th Circuit", etc.
- Ensures no California courts are missed

**Enhanced Judge Sync** (`lib/sync/judge-sync.ts`)

- Integrated sync_progress tracking
- Initializes progress records for new judges
- Records errors in progress table

**Judge Details Sync** (`lib/sync/judge-details-sync.ts` - NEW)

- Pulls positions, education, political affiliations
- Batch processing with rate limit awareness
- Updates sync_progress automatically

**Enhanced Decision Sync** (`lib/sync/decision-sync.ts`)

- Already handles opinions + dockets
- Now updates sync_progress with case counts
- Tracks total_cases_count for analytics readiness

#### 3. Orchestration

**Bulk Import Script** (`scripts/bulk-import-california.ts` - NEW)

- Multi-phase orchestrator
- Runs all sync phases in sequence
- Handles multiple runs per phase
- Safety limits enforced (250 judges/run, 150 new judges/run)
- Comprehensive stats tracking

#### 4. Monitoring

**Sync Progress Endpoint** (`app/api/admin/sync-progress/route.ts` - NEW)

- GET: View completion statistics
- POST: Update progress manually
- Filter by phase, incomplete only, analytics ready
- Pagination support

**Rate Limit Status Endpoint** (`app/api/admin/rate-limit-status/route.ts` - NEW)

- Real-time rate limit monitoring
- Status levels: healthy, warning, critical, blocked
- Automated recommendations
- Time-to-reset calculations

**Validation Report** (`scripts/validate-data-completeness.ts` - NEW)

- Comprehensive data quality report
- Top judges by case count
- Incomplete judges list
- Analytics readiness metrics

## Prerequisites

### Environment Variables

Required in `.env.local` and Netlify:

```bash
# CourtListener API
COURTLISTENER_API_KEY=your_api_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Admin API Key
SYNC_API_KEY=your_sync_api_key
```

### Database Migration

Apply the sync_progress migration:

```bash
# Option 1: Via Supabase dashboard
# Copy contents of supabase/migrations/20251024_002_sync_progress_tracking.sql
# Paste into SQL Editor and run

# Option 2: Via Supabase CLI
npx supabase db push
```

Verify migration:

```sql
SELECT COUNT(*) FROM sync_progress;
SELECT * FROM sync_progress_summary;
```

## Execution Steps

### Step 1: Run Bulk Import

The bulk import orchestrator handles all phases automatically:

```bash
# Make the script executable
chmod +x scripts/bulk-import-california.ts

# Run the full bulk import
npx tsx scripts/bulk-import-california.ts
```

**Expected Duration**: 7-14 days (10-15 runs per day)

**What Happens**:

1. **Phase 1**: Courts (1-2 runs, ~200-300 requests)
2. **Phase 2**: Judges (10-20 runs, discovers 2,000-5,000 judges)
3. **Phase 3**: Judge Details (10-20 runs, pulls positions/education/affiliations)
4. **Phase 4**: Decisions (40-80 runs, pulls opinions + dockets)

**Safety Features**:

- Automatic rate limit monitoring
- 250 judges/run limit
- 150 new judges/run limit
- 5-10 second delays between runs
- Progress tracking allows resume

### Step 2: Monitor Progress

**Check Sync Progress**:

```bash
curl -H "x-api-key: $SYNC_API_KEY" \
  https://judgefinder.io/api/admin/sync-progress?summary=true
```

**Check Rate Limits**:

```bash
curl -H "x-api-key: $SYNC_API_KEY" \
  https://judgefinder.io/api/admin/rate-limit-status
```

**View Detailed Progress**:

```bash
# Get incomplete judges
curl -H "x-api-key: $SYNC_API_KEY" \
  https://judgefinder.io/api/admin/sync-progress?incomplete=true&limit=50

# Get analytics-ready judges
curl -H "x-api-key: $SYNC_API_KEY" \
  https://judgefinder.io/api/admin/sync-progress?analytics_ready=true

# Get judges in specific phase
curl -H "x-api-key: $SYNC_API_KEY" \
  https://judgefinder.io/api/admin/sync-progress?phase=opinions
```

### Step 3: Run Validation Report

After bulk import completes:

```bash
npx tsx scripts/validate-data-completeness.ts

# Or export to JSON
npx tsx scripts/validate-data-completeness.ts --export
```

**Sample Output**:

```
================================================================================
DATA VALIDATION & ANALYTICS READINESS REPORT
================================================================================

📊 SUMMARY
--------------------------------------------------------------------------------
Total Judges:                3,482
Analytics-Ready Judges:      2,789 (500+ cases)
Incomplete Judges:           693
Completion Percentage:       80.12%

📋 DATA BREAKDOWN
--------------------------------------------------------------------------------
Judges with Positions:       3,450
Judges with Education:       2,890
Judges with Affiliations:    2,650
Judges with Opinions:        3,200
Judges with Dockets:         3,100

📈 ANALYTICS METRICS
--------------------------------------------------------------------------------
Judges Meeting Min Threshold: 2,789 (500+ cases)
Average Cases Per Judge:      847
Median Cases Per Judge:       612
Max Cases (Single Judge):     5,234
Min Cases (Single Judge):     0

...
```

## Monitoring & Validation

### Real-Time Monitoring

**Rate Limit Dashboard**:

- Status: healthy | warning | critical | blocked
- Current requests: X / 4,500
- Utilization: XX%
- Time to reset: XX minutes
- Recommendations based on current state

**Sync Progress Dashboard**:

- Total judges: X
- Complete judges: X (XX%)
- Analytics-ready judges: X (XX%)
- Phase breakdown (discovery, positions, details, opinions, dockets, complete)
- Judges with errors

### Success Criteria

✅ **Minimum Acceptable**:

- 100% courts imported (150-200 California courts)
- 90%+ judges discovered (1,800+ of ~2,000)
- 80%+ judges have complete positions data
- 60%+ judges are analytics-ready (500+ cases)

✅ **Target Goals**:

- 100% courts imported
- 95%+ judges discovered
- 90%+ judges have complete data
- 80%+ judges are analytics-ready

✅ **Excellent**:

- 100% courts imported
- 100% judges discovered
- 95%+ judges have complete data
- 85%+ judges are analytics-ready

## Troubleshooting

### Issue: Rate Limit Exceeded

**Symptoms**:

- Sync fails with "Rate limit exceeded" error
- Rate limit status shows "blocked"

**Solution**:

```bash
# 1. Check current status
curl -H "x-api-key: $SYNC_API_KEY" \
  https://judgefinder.io/api/admin/rate-limit-status

# 2. Wait for window to reset (shown in response)

# 3. Resume bulk import (it will pick up where it left off)
npx tsx scripts/bulk-import-california.ts
```

### Issue: Sync Stalls or Errors

**Symptoms**:

- Bulk import stops making progress
- Error count increases in sync_progress

**Solution**:

```bash
# 1. Check sync progress for errors
curl -H "x-api-key: $SYNC_API_KEY" \
  https://judgefinder.io/api/admin/sync-progress | jq '.summary'

# 2. Check judges with errors
psql -h $SUPABASE_HOST -U postgres -d postgres -c \
  "SELECT judge_id, error_count, last_error FROM sync_progress WHERE error_count > 0 LIMIT 20;"

# 3. Re-run specific phase
# Edit scripts/bulk-import-california.ts to comment out completed phases
```

### Issue: Missing Data for Judges

**Symptoms**:

- Validation report shows low completion percentages
- Many judges missing positions, education, or cases

**Solution**:

```bash
# 1. Run judge details sync for incomplete judges
npx tsx -e "
  import { JudgeDetailsSyncManager } from './lib/sync/judge-details-sync';
  const mgr = new JudgeDetailsSyncManager();
  mgr.syncJudgeDetails({ jurisdiction: 'CA', incompleteOnly: true });
"

# 2. Run decision sync with higher limits
npx tsx -e "
  import { DecisionSyncManager } from './lib/sync/decision-sync';
  const mgr = new DecisionSyncManager();
  mgr.syncDecisions({
    jurisdiction: 'CA',
    maxDecisionsPerJudge: 200,
    maxFilingsPerJudge: 200,
    yearsBack: 15
  });
"
```

## Rate Limit Management

### CourtListener Rate Limits

- **Hard Limit**: 5,000 requests/hour
- **Buffer Limit**: 4,500 requests/hour (safe limit)
- **Warning Threshold**: 4,000 requests/hour (80%)

### Rate Limit Strategy

**Phase 1: Courts** (~200-300 requests)

- Safe: 1 run uses ~5% of hourly limit

**Phase 2: Judges** (~2,000-5,000 requests total)

- 1 run = ~1,000-2,000 requests (20-40% of limit)
- Run 1-2 runs/hour, space over 10-20 hours

**Phase 3: Judge Details** (~6,000-15,000 requests total)

- 1 run = ~750-1,500 requests (15-30% of limit)
- Run 2-3 runs/hour, space over 10-20 hours

**Phase 4: Decisions** (~~150,000-500,000 requests total)

- 1 run = ~2,500-5,000 requests (50-100% of limit)
- Run 1 run/hour MAX, space over 40-80 hours (2-3 days)

**Overall Timeline**: 7-14 days for complete import

### Best Practices

1. **Monitor Continuously**: Check rate limit status every hour
2. **Slow Down at 75%**: If utilization > 75%, pause for 30 minutes
3. **Pause at 90%**: If utilization > 90%, pause until next hour
4. **Spread Over Days**: Don't try to complete in 24 hours
5. **Peak Hours**: Avoid bulk imports during business hours (9am-5pm PT)

## Next Steps

After bulk import completes:

1. **Set up incremental sync**:
   - Daily cron: `/api/cron/daily-sync` (decisions only)
   - Weekly cron: `/api/cron/weekly-sync` (courts + new judges)

2. **Run analytics generation**:

   ```bash
   npm run analytics:generate
   ```

3. **Verify data quality**:

   ```bash
   npm run integrity:full
   ```

4. **Monitor ongoing sync health**:
   - Check sync_progress regularly
   - Monitor rate limit utilization trends
   - Review error logs weekly

## Reference

### Key Files

- **Migration**: `supabase/migrations/20251024_002_sync_progress_tracking.sql`
- **Orchestrator**: `scripts/bulk-import-california.ts`
- **Validation**: `scripts/validate-data-completeness.ts`
- **Court Sync**: `lib/sync/court-sync.ts`
- **Judge Sync**: `lib/sync/judge-sync.ts`
- **Details Sync**: `lib/sync/judge-details-sync.ts`
- **Decision Sync**: `lib/sync/decision-sync.ts`
- **Progress API**: `app/api/admin/sync-progress/route.ts`
- **Rate Limit API**: `app/api/admin/rate-limit-status/route.ts`

### Database Tables

- `sync_progress` - Per-judge completion tracking
- `sync_progress_summary` - Aggregated statistics view
- `judges` - Judge profiles
- `courts` - Court directory
- `cases` - Case decisions and outcomes
- `judge_court_positions` - Historical position tracking

### Admin Endpoints

- `GET /api/admin/sync-progress` - View sync progress
- `POST /api/admin/sync-progress` - Update progress manually
- `GET /api/admin/rate-limit-status` - Check rate limits

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review sync logs: `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 20;`
3. Check error logs: `SELECT * FROM sync_progress WHERE error_count > 0;`
4. Monitor rate limits: `/api/admin/rate-limit-status`
