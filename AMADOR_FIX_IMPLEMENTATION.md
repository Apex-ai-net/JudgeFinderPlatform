# Amador County Data Quality Fix - Implementation Guide

## Executive Summary

Created a production-ready script to fix the critical Amador County misassignment issue affecting 483 judges (25.4% of the database).

**Problem**: 483 California judges are incorrectly assigned to Amador County, a small rural county that should have only 1-3 judges.

**Solution**: Automated script that uses CourtListener API position history to determine and correct proper court/county assignments.

## Files Created

### 1. Main Fix Script
**Location**: `/scripts/fix-amador-county-assignment.ts`

**Purpose**: Production-ready script to identify and correct misassignments

**Features**:
- Dry-run mode by default (safe)
- Multiple correction strategies with confidence scoring
- Rate-limited CourtListener API calls (1.5s delay)
- Detailed audit trail and reporting
- Graceful error handling
- Batch processing support

### 2. Verification Script
**Location**: `/scripts/check-amador-issue.ts`

**Purpose**: Quick check to verify the issue exists and show current state

**Output Example**:
```
Total judges in database: 1903
Amador County courts found: 3
Judges assigned to Amador County courts: 483
Percentage: 25.4%

⚠️  WARNING: This appears to be the data quality issue!
```

### 3. Test Script
**Location**: `/scripts/test-fix-single-judge.ts`

**Purpose**: Test fix logic on a single judge to verify CourtListener integration

### 4. Documentation
**Location**: `/docs/AMADOR_COUNTY_FIX.md`

**Purpose**: Comprehensive documentation of the issue, solution, and procedures

## Correction Strategies

The fix script uses four strategies in priority order:

### Strategy 1: CourtListener Position Data (HIGH Confidence)
1. Fetch position history from CourtListener API
2. Identify most recent active position (no termination date)
3. Match court by CourtListener court_id
4. Update judge with matched court

**Confidence**: High (most reliable)

### Strategy 2: Court Name Matching (HIGH-MEDIUM Confidence)
1. Use court name from position data
2. Exact match against courts table
3. Fuzzy matching if exact match fails
4. Extract county from court name patterns

**Confidence**: High (exact) or Medium (fuzzy)

### Strategy 3: Existing Positions JSONB (MEDIUM Confidence)
1. Use stored positions data from database
2. Find most recent position without termination
3. Extract county from position metadata

**Confidence**: Medium

### Strategy 4: Court Name Extraction (LOW Confidence)
1. Parse current court_name field
2. Extract county using pattern matching
3. Fallback when API data unavailable

**Confidence**: Low

## Usage Instructions

### Step 1: Verify the Issue Exists

```bash
npx tsx scripts/check-amador-issue.ts
```

**Expected Output**: Should show ~483 judges assigned to Amador County

### Step 2: Test on Single Judge

```bash
npx tsx scripts/test-fix-single-judge.ts
```

**Purpose**: Verify CourtListener API integration works correctly

### Step 3: Dry Run Test

Test the fix without making changes:

```bash
# Test with 10 judges first
npx tsx scripts/fix-amador-county-assignment.ts --limit=10

# Review the output carefully
# Check confidence levels
# Verify the corrections look reasonable
```

**Expected Output**:
- Summary statistics
- Confidence breakdown
- Sample corrections
- County distribution

### Step 4: Execute Fix in Batches

Start with a small batch to verify:

```bash
# Fix 50 judges as initial test
npx tsx scripts/fix-amador-county-assignment.ts --limit=50 --execute

# Verify results in database
# Check a few judges manually in the UI
```

### Step 5: Full Execution

Once confident the fix works:

```bash
# Fix all 483 judges
npx tsx scripts/fix-amador-county-assignment.ts --execute
```

**Estimated Time**:
- API calls: 483 judges × 1.5s = ~12 minutes
- Database updates: ~3 minutes
- **Total**: ~15-20 minutes

### Step 6: Verification

After execution:

```bash
# Verify the fix
npx tsx scripts/check-amador-issue.ts

# Should now show only 1-3 judges in Amador County

# Run completeness analysis
npx tsx scripts/analyze-judge-completeness.ts
```

## Expected Results

### Before Fix:
- Total judges: 1,903
- Amador County judges: 483 (25.4%)
- Data quality: Poor geographic distribution

### After Fix:
- Total judges: 1,903
- Amador County judges: 1-3 (0.1-0.2%)
- Data quality: Realistic geographic distribution
- High confidence corrections: ~300-350 judges
- Medium confidence: ~120-150 judges
- Low confidence or skipped: ~30-50 judges

### Confidence Distribution (Projected):
- **High confidence** (65-70%): Direct CourtListener match
- **Medium confidence** (25-30%): Name matching or existing data
- **Low confidence** (5-10%): Pattern extraction or manual review needed

## Database Changes

The script modifies the `judges` table:

**Fields Updated**:
- `court_id`: UUID reference to correct court
- `court_name`: Name of correct court
- `positions`: JSONB array (updated with position data if needed)

**No data is deleted**, only reassigned to correct courts.

## Safety Measures

1. **Dry-run by default**: Must explicitly use `--execute` flag
2. **Confidence scoring**: Easy to identify risky corrections
3. **Rate limiting**: Won't exceed CourtListener API limits
4. **Error handling**: Partial failures don't break the process
5. **Detailed logging**: Full audit trail of all changes
6. **Batch support**: Can test on small subset first
7. **Reversible**: All changes logged, can be manually reviewed

## Monitoring & Verification

### SQL Queries to Verify:

```sql
-- Check Amador County assignment
SELECT COUNT(*) as amador_judges
FROM judges j
JOIN courts c ON j.court_id = c.id
WHERE c.county ILIKE '%amador%';
-- Expected: 1-3

-- County distribution
SELECT c.county, COUNT(*) as judge_count
FROM judges j
JOIN courts c ON j.court_id = c.id
WHERE c.county IS NOT NULL
GROUP BY c.county
ORDER BY judge_count DESC
LIMIT 20;
-- Expected: LA, San Diego, Orange at top

-- Verify specific judges
SELECT j.name, c.name as court, c.county
FROM judges j
JOIN courts c ON j.court_id = c.id
WHERE j.courtlistener_id IN ('15858', '16214', '16133')
-- Should no longer be in Amador
```

### UI Verification:

1. Browse judges by county
2. Search for "Amador County"
3. Verify major counties have appropriate judge counts
4. Check sample judge profiles for accuracy

## Troubleshooting

### Issue: Script hangs or times out
**Solution**:
- Check internet connection
- Verify CourtListener API key is valid
- Run with `--limit=10` to isolate issue

### Issue: Many low confidence corrections
**Solution**:
- Review position data quality
- Check CourtListener API responses
- Consider manual review of low confidence cases

### Issue: Errors during execution
**Solution**:
- Check error messages in output
- Verify database connection
- Ensure Supabase credentials are valid
- Review errorMessages array in output

### Issue: Unexpected county assignments
**Solution**:
- Review sample corrections in output
- Check confidence levels
- Verify position data is accurate
- Consider running manual spot checks

## Rollback Plan

If issues are discovered:

1. **Review the output log**: All changes are documented
2. **Identify problematic corrections**: Check low confidence cases
3. **Manual correction**: Update specific judges via SQL or UI
4. **Database backup**: Use Supabase point-in-time recovery if needed

## Next Steps After Fix

1. **Update county field in courts table**: Ensure all courts have accurate county data
2. **Prevent future misassignments**: Add validation to bulk import process
3. **Monitor data quality**: Regular checks for county distribution
4. **Document patterns**: Note common issues for future imports

## Performance Considerations

- **API Rate Limit**: 5,000 calls/hour (CourtListener)
- **Script Rate**: ~2,400 calls/hour (well under limit)
- **Total Time**: 15-20 minutes for 483 judges
- **Database Load**: Minimal (single UPDATE per judge)
- **Memory Usage**: Low (processes one judge at a time)

## Technical Details

### Dependencies:
- `@supabase/supabase-js`: Database client
- CourtListenerClient: API integration
- TypeScript/tsx: Runtime
- Node.js: Environment

### Environment Variables Required:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
COURTLISTENER_API_KEY=your_api_key
```

### Database Schema:
- `judges` table: Main target
- `courts` table: Reference data
- `positions` JSONB: Position history storage

## Success Criteria

The fix is successful when:

1. ✅ Amador County has 1-3 judges (not 483)
2. ✅ Geographic distribution matches California demographics
3. ✅ >70% of corrections are high confidence
4. ✅ No errors during execution
5. ✅ Sample manual checks confirm accuracy
6. ✅ UI searches by county return correct results

## Contact & Support

For issues or questions:
- Review `/docs/AMADOR_COUNTY_FIX.md` for detailed documentation
- Check script output for specific error messages
- Verify environment variables and API keys
- Test with `--limit=1` to isolate issues

## Status

- **Issue Confirmed**: ✅ 483 judges misassigned to Amador County
- **Script Created**: ✅ Production-ready fix script
- **Tested**: 🔄 Ready for testing (dry-run mode)
- **Executed**: ⏳ Pending user decision
- **Priority**: 🔴 Critical - blocks bulk import and UI testing
