# Sync Script Data Quality Fixes

## Overview

Fixed three critical data quality issues in JudgeFinder's sync scripts based on CourtListener integration analysis.

## Fix 1: Decision Sync - Update Logic (decision-sync.ts)

### Problem

When a case already exists, only opinion text was updated. Case metadata (status, disposition, precedential_status) never got refreshed from CourtListener.

### Solution

**File**: `/Users/tannerosterkamp/JudgeFinderPlatform-1/lib/sync/decision-sync.ts`

**Changes**:

1. Added new method `updateExistingCaseIfNewer()` that:
   - Fetches existing case data
   - Compares `date_created` timestamps to determine if remote data is newer
   - Updates ALL refreshable metadata fields if CourtListener has newer data
   - Logs update activity for monitoring

2. Modified `handleSingleDecision()` to:
   - Call `updateExistingCaseIfNewer()` before ensuring opinion text
   - Updates case metadata, then syncs opinion text
   - Properly counts updates in `decisionStats.updated`

**Result**: Existing cases now receive metadata refreshes when CourtListener has newer information, preventing stale data.

---

## Fix 2: Judge Sync - Retirement Detection (judge-sync.ts)

### Problem

No check for judge retirements or termination dates. Judges who had retired were still marked as active.

### Solution

**File**: `/Users/tannerosterkamp/JudgeFinderPlatform-1/lib/sync/judge-sync.ts`

**Changes**:

1. Added `judgesRetired` tracking to all result interfaces:
   - `JudgeSyncResult` interface
   - `BatchSyncStats` interface
   - Initialized in all relevant methods

2. Added new method `detectAndMarkRetirement()` that:
   - Checks if judge has any active positions (without `date_termination`)
   - If all positions are terminated and judge is currently 'active', marks as 'retired'
   - Logs retirement detection for audit trail
   - Updates judge status in database

3. Modified `syncSingleJudge()` to:
   - Call retirement detection for existing judges
   - Return `retired` flag in result
   - Track retired count in statistics

4. Updated `mergeStats()` to accumulate retired counts across batches

**Result**: Judges with all positions terminated are automatically marked as retired during sync operations.

---

## Fix 3: Assignment Updater - Create Assignments (automated-assignment-updater.js)

### Problem

When new positions were detected, script only logged suggestions but never actually created court assignments.

### Solution

**File**: `/Users/tannerosterkamp/JudgeFinderPlatform-1/scripts/automated-assignment-updater.js`

**Changes**:

1. Added `assignmentsCreated` counter to class constructor and reset logic

2. Added new method `createCourtAssignment()` that:
   - Validates required data (judge_id, court_name)
   - Looks up court in database by name
   - Checks for existing assignment to avoid duplicates
   - Creates new court_assignment record with proper metadata
   - Tracks creation count and errors
   - Handles gracefully when court doesn't exist

3. Modified `detectAssignmentChanges()` to include:
   - `judge_id` in change data
   - `court_name` in change data
   - Necessary context for assignment creation

4. Modified `processAssignmentUpdate()` to:
   - Filter changes for 'new_position' type
   - Actually call `createCourtAssignment()` for each new position
   - Log creation activity

5. Updated reporting:
   - Added `assignments_created` to report object
   - Display created count in console summary
   - Track metric in analytics events

**Result**: New court positions detected from CourtListener are automatically converted into court_assignment records instead of being ignored.

---

## Validation Commands

Run these commands to validate the fixes:

```bash
# Test decision sync for existing cases - verify metadata updates
npm run sync:decisions -- --judgeIds=<some-judge-id>

# Test judge sync for retired judge - verify status changes
npm run sync:judges -- --judgeIds=<retired-judge-cl-id>

# Test assignment updater - verify new assignments created
node scripts/automated-assignment-updater.js run
```

## Testing Checklist

- [ ] Decision sync updates existing case metadata when CourtListener has newer data
- [ ] Judge sync detects and marks retired judges correctly
- [ ] Assignment updater creates new court assignments for detected positions
- [ ] All new stats are properly tracked and reported
- [ ] Error handling works gracefully for edge cases
- [ ] Logging provides adequate visibility into operations

## Impact

### Before Fixes

- Stale case metadata (precedential status, case names never updated)
- Retired judges incorrectly shown as active
- Missing court assignments (orphaned records)

### After Fixes

- Fresh case metadata synchronized from CourtListener
- Accurate judge retirement status tracking
- Complete court assignment coverage
- Better data quality metrics and monitoring

## Files Modified

1. `/Users/tannerosterkamp/JudgeFinderPlatform-1/lib/sync/decision-sync.ts`
   - Added `updateExistingCaseIfNewer()` method
   - Modified `handleSingleDecision()` to update metadata

2. `/Users/tannerosterkamp/JudgeFinderPlatform-1/lib/sync/judge-sync.ts`
   - Added `judgesRetired` to result interfaces
   - Added `detectAndMarkRetirement()` method
   - Modified `syncSingleJudge()` to check retirement
   - Updated all stat tracking and merging

3. `/Users/tannerosterkamp/JudgeFinderPlatform-1/scripts/automated-assignment-updater.js`
   - Added `assignmentsCreated` counter
   - Added `createCourtAssignment()` method
   - Modified `processAssignmentUpdate()` to create assignments
   - Updated reporting and logging

## Technical Notes

### Decision Sync

- Uses `date_created` as proxy for data freshness (CourtListener doesn't always provide `date_modified`)
- Only updates if remote timestamp is newer to avoid unnecessary writes
- Maintains backward compatibility with existing sync flow

### Judge Sync

- Checks for empty `date_termination` to identify active positions
- Only marks as retired if ALL positions are terminated
- Preserves existing status values other than 'active'
- Safe to run multiple times (idempotent)

### Assignment Updater

- Uses fuzzy court name matching (`ILIKE %name%`)
- Checks for duplicates before creating
- Gracefully handles missing courts
- Includes full position metadata in assignment record
- Tracks source as 'automated_detection' for audit

## Next Steps

1. Monitor sync logs for retirement detections
2. Verify assignment creation rate matches expected new positions
3. Check case metadata freshness improves over time
4. Consider adding alerts for high volumes of changes
5. Review created assignments periodically for accuracy
