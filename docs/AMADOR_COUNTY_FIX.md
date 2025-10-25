# Amador County Misassignment Fix

## Critical Data Quality Issue

**Problem**: 483 judges (48.3% of all California judges) are incorrectly assigned to Amador County in the database. Amador is a small rural county that should have only 1-3 judges.

**Impact**:
- Incorrect county-based searches
- Misleading geographic data
- Poor user experience for county-specific filtering
- Data quality concerns for bulk import and UI testing

## Root Cause

The issue likely occurred during bulk import when judges without clear county assignments were defaulted to Amador County, or when court-to-county mapping failed.

## Solution

Created a production-ready script: `/scripts/fix-amador-county-assignment.ts`

### What the Script Does

1. **Identifies misassigned judges**: Queries all judges assigned to Amador County
2. **Fetches accurate data**: Uses CourtListener API to get position history
3. **Determines correct assignment** using multiple strategies:
   - Most recent active position from CourtListener
   - Position history court metadata
   - Court name pattern matching
   - County extraction from court names
4. **Updates database**: Corrects court_id and county assignments
5. **Provides audit trail**: Detailed logging and before/after statistics

### Script Features

- **Safe by default**: Dry-run mode (no changes unless --execute flag)
- **Confidence scoring**: High/Medium/Low confidence levels for each correction
- **Multiple strategies**: Fallback logic if primary methods fail
- **Rate limited**: Respects CourtListener API limits (1.5s between calls)
- **Error handling**: Graceful handling of API errors and edge cases
- **Detailed reporting**: Statistics, sample corrections, error logs

## Usage

### Dry Run (Safe - No Changes)

Test the script without making any changes:

```bash
# Test with 10 judges
npx tsx scripts/fix-amador-county-assignment.ts --limit=10

# Test all judges
npx tsx scripts/fix-amador-county-assignment.ts
```

### Execute Fixes

Apply the corrections:

```bash
# Fix 50 judges as a test
npx tsx scripts/fix-amador-county-assignment.ts --limit=50 --execute

# Fix all judges
npx tsx scripts/fix-amador-county-assignment.ts --execute
```

## Correction Strategies

The script uses multiple strategies in order of confidence:

### Strategy 1: CourtListener Position Data (High Confidence)
- Fetches position history from CourtListener API
- Identifies most recent active position
- Matches court by CourtListener court_id
- Confidence: **High**

### Strategy 2: Court Name Matching (High-Medium Confidence)
- Matches court by name from position data
- Uses fuzzy matching for similar names
- Extracts county from court name patterns
- Confidence: **High** (exact match) or **Medium** (fuzzy match)

### Strategy 3: Existing Positions JSONB (Medium Confidence)
- Uses stored positions data from database
- Finds most recent position without termination date
- Extracts county from position metadata
- Confidence: **Medium**

### Strategy 4: Court Name Extraction (Low Confidence)
- Extracts county from current court_name field
- Uses pattern matching for California county names
- Fallback method when API data unavailable
- Confidence: **Low**

## County Extraction Patterns

The script recognizes these court name patterns:

- `{County} County Superior Court`
- `Superior Court of {County}`
- `Superior Court of the County of {County}`
- `{County} Superior Court`
- `Court of Appeal ... {County} County`

Major California counties (Los Angeles, San Diego, Orange, etc.) are also detected by name matching.

## Output Example

```
================================================================================
🔍 AMADOR COUNTY MISASSIGNMENT FIX
================================================================================
Mode: 🔬 DRY RUN (no changes)
Limit: No limit
================================================================================

📍 Step 1: Finding Amador County court...
   Found 1 Amador County court(s)
   - Superior Court of Amador County (Amador)

👨‍⚖️  Step 2: Finding judges assigned to Amador County...
   Found 483 judges assigned to Amador County

🔧 Step 3: Processing judges and determining correct assignments...

[1/483] Processing: Hon. Jane Smith
  Fetching positions from CourtListener...
  ✓ Correction identified (high confidence):
    Reason: Matched by CourtListener court ID from most recent position
    New Court: Superior Court of Los Angeles County
    New County: Los Angeles
  🔬 DRY RUN - No changes made

[2/483] Processing: Hon. John Doe
  Fetching positions from CourtListener...
  ✓ Correction identified (medium confidence):
    Reason: Extracted county from CourtListener position court name
    New County: San Diego (court to be resolved)
  🔬 DRY RUN - No changes made

...

================================================================================
📊 FIX SUMMARY
================================================================================

Mode: DRY RUN 🔬
Total Judges Found: 483
Judges Processed: 483
Judges To Fix: 475
Judges Skipped: 8
Errors: 0

Confidence Breakdown:
  High Confidence: 312
  Medium Confidence: 143
  Low Confidence: 20

New County Distribution:
  Los Angeles: 156
  San Diego: 78
  Orange: 54
  San Francisco: 43
  Sacramento: 35
  ...

Sample Corrections (first 5):
  1. Hon. Jane Smith
     Old: Superior Court of Amador County (Amador County)
     New: Superior Court of Los Angeles County
     Confidence: high
     Reason: Matched by CourtListener court ID from most recent position
  ...
================================================================================

💡 To apply these fixes, run:
   npx tsx scripts/fix-amador-county-assignment.ts --execute
```

## Verification Steps

After running the fix:

1. **Check total counts**:
   ```sql
   SELECT county, COUNT(*)
   FROM courts c
   JOIN judges j ON j.court_id = c.id
   WHERE county = 'Amador'
   GROUP BY county;
   ```

   Should show 1-3 judges (realistic for Amador County)

2. **Verify distribution**:
   ```sql
   SELECT c.county, COUNT(*) as judge_count
   FROM judges j
   JOIN courts c ON j.court_id = c.id
   GROUP BY c.county
   ORDER BY judge_count DESC;
   ```

   Should show realistic distribution across California counties

3. **Run completeness analysis**:
   ```bash
   npx tsx scripts/analyze-judge-completeness.ts
   ```

4. **Test in UI**: Search for judges by county and verify results

## Next Steps

1. **Run dry-run first**: Always test with `--limit=10` before executing
2. **Review corrections**: Check the confidence levels and reasons
3. **Execute in batches**: Start with `--limit=100 --execute` to test
4. **Verify results**: Use SQL queries and UI to confirm corrections
5. **Document findings**: Note any patterns or issues for future imports

## Technical Details

- **Database**: Supabase PostgreSQL
- **API**: CourtListener REST API v4
- **Rate Limiting**: 1.5s delay between API calls
- **Tables Modified**: `judges` table (court_id, court_name, positions fields)
- **Dependencies**:
  - `@supabase/supabase-js`
  - CourtListener API client
  - TypeScript/Node.js

## Safety Considerations

- Dry-run mode is default (requires explicit --execute flag)
- All changes are logged with before/after state
- Confidence scoring helps identify risky corrections
- Rate limiting prevents API quota exhaustion
- Error handling ensures partial failures don't break entire process
- Can be run in limited batches for testing

## Monitoring

After execution, monitor:

1. **Error rate**: Check error messages in output
2. **Confidence distribution**: Aim for >70% high confidence
3. **County distribution**: Should match California demographics
4. **User feedback**: Watch for incorrect court assignments in UI

## Rollback

If issues are found:

1. The script logs all changes - review the output
2. Low confidence corrections can be manually reviewed
3. Database backups should be available for full rollback
4. Consider re-running with stricter confidence filters

## Related Files

- Script: `/scripts/fix-amador-county-assignment.ts`
- Analysis: `/scripts/analyze-judge-completeness.ts`
- Court mapping: `/supabase/migrations/20251108_001_add_county_to_courts.sql`
- CourtListener client: `/lib/courtlistener/client.ts`
- Position sync: `/lib/courtlistener/position-sync.ts`

## Status

- **Created**: 2025-10-24
- **Status**: Ready for testing
- **Priority**: Critical - blocks bulk import and UI testing
- **Estimated Fix Time**:
  - Dry run: 15-20 minutes (483 judges × 1.5s)
  - Execute: 20-25 minutes (with updates)
