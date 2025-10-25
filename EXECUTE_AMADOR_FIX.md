# Quick Guide: Execute Amador County Fix

## TL;DR - Quick Execution

```bash
# 1. Verify the issue exists (30 seconds)
npx tsx scripts/check-amador-issue.ts

# 2. Test fix on 10 judges - DRY RUN (2 minutes)
npx tsx scripts/fix-amador-county-assignment.ts --limit=10

# 3. Execute fix on 50 judges - TEST BATCH (2-3 minutes)
npx tsx scripts/fix-amador-county-assignment.ts --limit=50 --execute

# 4. Verify test batch results, then fix ALL (15-20 minutes)
npx tsx scripts/fix-amador-county-assignment.ts --execute

# 5. Verify completion
npx tsx scripts/check-amador-issue.ts
npx tsx scripts/analyze-judge-completeness.ts
```

## Current Status

**Issue Confirmed**: 483 judges (25.4% of database) incorrectly assigned to Amador County

**Expected**: 1-3 judges (Amador is small rural county)

**Impact**: Critical data quality issue blocking bulk import and UI testing

## What the Script Does

1. ✅ Finds all judges assigned to Amador County
2. ✅ Fetches accurate position history from CourtListener API
3. ✅ Determines correct court/county using 4 strategies with confidence scoring
4. ✅ Updates judges with correct assignments
5. ✅ Provides detailed audit trail and statistics

## Safety Features

- 🔬 **Dry-run by default** - no changes unless you add `--execute`
- 📊 **Confidence scoring** - High/Medium/Low for each correction
- 🐌 **Rate limited** - 1.5s between API calls (respects CourtListener limits)
- 🛡️ **Error handling** - graceful failures, doesn't break on errors
- 📝 **Full audit trail** - logs all changes with before/after state

## Recommended Execution Path

### Option A: Cautious (Recommended for first time)

```bash
# Step 1: Verify issue (30 sec)
npx tsx scripts/check-amador-issue.ts

# Step 2: Test on 1 judge (30 sec)
npx tsx scripts/test-fix-single-judge.ts

# Step 3: Dry run on 10 (2 min)
npx tsx scripts/fix-amador-county-assignment.ts --limit=10

# Step 4: Execute on 50 (3 min)
npx tsx scripts/fix-amador-county-assignment.ts --limit=50 --execute

# Step 5: Check results, then all (15-20 min)
npx tsx scripts/fix-amador-county-assignment.ts --execute
```

### Option B: Confident (If you trust the verification)

```bash
# Quick verify
npx tsx scripts/check-amador-issue.ts

# Dry run sample
npx tsx scripts/fix-amador-county-assignment.ts --limit=20

# Execute all
npx tsx scripts/fix-amador-county-assignment.ts --execute
```

## Expected Output

### Dry Run Sample:
```
================================================================================
🔍 AMADOR COUNTY MISASSIGNMENT FIX
Mode: 🔬 DRY RUN (no changes)
================================================================================

📍 Step 1: Finding Amador County court...
   Found 3 Amador County court(s)

👨‍⚖️  Step 2: Finding judges assigned to Amador County...
   Found 483 judges

🔧 Step 3: Processing judges...

[1/483] Processing: Scott McKee
  Fetching positions from CourtListener...
  ✓ Correction identified (high confidence):
    Reason: Matched by CourtListener court ID
    New Court: Superior Court of Los Angeles County
    New County: Los Angeles

...

📊 FIX SUMMARY
Mode: DRY RUN
Judges To Fix: 475
High Confidence: 312
Medium Confidence: 143
Low Confidence: 20

💡 To apply these fixes, run:
   npx tsx scripts/fix-amador-county-assignment.ts --execute
```

## Time Estimates

- **Check issue**: 30 seconds
- **Test single judge**: 30 seconds
- **Dry run 10 judges**: 30-60 seconds
- **Execute 50 judges**: 2-3 minutes
- **Execute all 483 judges**: 15-20 minutes

## Verification After Fix

```bash
# Quick check (should show 1-3 judges in Amador)
npx tsx scripts/check-amador-issue.ts

# Full analysis
npx tsx scripts/analyze-judge-completeness.ts

# SQL verification
```

SQL to run in Supabase:
```sql
-- Should return 1-3
SELECT COUNT(*) FROM judges j
JOIN courts c ON j.court_id = c.id
WHERE c.county ILIKE '%amador%';

-- Should show realistic distribution
SELECT c.county, COUNT(*) as judges
FROM judges j
JOIN courts c ON j.court_id = c.id
GROUP BY c.county
ORDER BY judges DESC
LIMIT 10;
```

## What to Look For

### ✅ Good Signs:
- High confidence corrections: >65%
- County distribution looks realistic (LA, San Diego, Orange at top)
- Few errors in output
- Amador County back to 1-3 judges after execution

### ⚠️ Warning Signs:
- Many low confidence corrections (>20%)
- Unexpected county assignments
- High error count (>5%)
- Still 100+ judges in Amador after fix

## If Something Goes Wrong

1. **Review the output log** - all changes are documented
2. **Check confidence levels** - low confidence may need manual review
3. **Spot check in UI** - verify a few judges manually
4. **SQL verification** - run queries above
5. **Contact for help** - with the full output log

## Files Reference

- **Main script**: `/scripts/fix-amador-county-assignment.ts`
- **Check script**: `/scripts/check-amador-issue.ts`
- **Test script**: `/scripts/test-fix-single-judge.ts`
- **Full docs**: `/docs/AMADOR_COUNTY_FIX.md`
- **Implementation guide**: `/AMADOR_FIX_IMPLEMENTATION.md`

## Prerequisites

Ensure environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COURTLISTENER_API_KEY`

## Ready to Execute?

**If confident after dry-run testing:**

```bash
npx tsx scripts/fix-amador-county-assignment.ts --execute
```

**Watch the output** - it will show:
- Progress for each judge
- Corrections being applied
- Final statistics
- Any errors encountered

**Takes ~15-20 minutes** for all 483 judges.

---

## Quick Decision Tree

```
Are you ready to fix this now?
├─ Yes, but cautious
│  └─ Follow "Option A: Cautious" above
├─ Yes, and confident
│  └─ Follow "Option B: Confident" above
└─ No, want to review more
   └─ Read /docs/AMADOR_COUNTY_FIX.md first
```

## Support

For detailed documentation: `/docs/AMADOR_COUNTY_FIX.md`
For implementation details: `/AMADOR_FIX_IMPLEMENTATION.md`
