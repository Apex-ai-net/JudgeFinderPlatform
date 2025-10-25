# Judge Data Sync - Complete Implementation Guide

**Status:** ✅ Scripts Ready | ⚠️ Migration Required | 🎯 Ready to Execute

---

## Current Status (October 24, 2025)

### Data Completeness
- **Education:** 13.3% (254/1,903) - ⚠️ Needs Sync
- **Political Affiliation:** 0% - ⚠️ Needs Migration + Sync
- **Position History:** 0% - ✅ Ready to Sync

### What's Been Created
✅ All three sync manager classes (`lib/courtlistener/`)
✅ All three standalone sync scripts (`scripts/`)
✅ Master sync script that runs all three sequentially
✅ npm run commands configured
✅ Rate limiting and error handling

---

## Step 1: Database Migration (Required)

**The `political_affiliation` column must be added before syncing political data.**

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this SQL:

```sql
-- Add political_affiliation column
ALTER TABLE judges
ADD COLUMN IF NOT EXISTS political_affiliation VARCHAR(100);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_judges_political_affiliation
  ON judges(political_affiliation)
  WHERE political_affiliation IS NOT NULL;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'judges'
  AND column_name = 'political_affiliation';
```

### Option B: Via Migration File

The full migration with additional features is in:
```
supabase/migrations/20251122_001_add_political_affiliation.sql
```

This includes:
- Political affiliation column
- Search vector updates
- Statistics view
- Proper indexing

---

## Step 2: Run Data Syncs

### Quick Test (Recommended First)
Test with 10 judges across all three syncs:

```bash
npm run sync:all -- --limit=10
```

This will:
- Sync 10 judges' education data
- Wait 5 minutes
- Sync 10 judges' political affiliation
- Wait 5 minutes
- Sync 10 judges' position history

**Expected Duration:** ~20 minutes (including wait times)

### Full Production Sync

Once test is successful, run full sync:

```bash
npm run sync:all
```

**Expected Duration:** ~12 hours (conservative rate limiting to avoid API limits)
- ~1,649 judges for education
- ~1,903 judges for political affiliation
- ~1,903 judges for position history
- Total: ~5,500 API calls over 12 hours = ~450/hour (well under 5,000/hour limit)

### Individual Syncs

You can also run syncs individually:

```bash
# Education only
npm run sync:education

# Political affiliation only (requires migration first!)
npm run sync:political

# Position history only
npm run sync:positions
```

### Sync Options

All sync scripts support these flags:

```bash
# Force resync all judges (even those with data)
npm run sync:education -- --all

# Limit to N judges
npm run sync:education -- --limit=100

# Both flags together
npm run sync:education -- --all --limit=50
```

---

## Step 3: Monitor Progress

### Check Sync Status

```bash
# Analyze completeness
npx tsx scripts/analyze-judge-completeness.ts
```

### Query Database Directly

```sql
-- Education completeness
SELECT
  COUNT(*) FILTER (WHERE education IS NOT NULL) * 100.0 / COUNT(*) as pct_complete,
  COUNT(*) FILTER (WHERE education IS NOT NULL) as populated,
  COUNT(*) as total
FROM judges
WHERE courtlistener_id IS NOT NULL;

-- Political affiliation completeness
SELECT
  COUNT(*) FILTER (WHERE political_affiliation IS NOT NULL) * 100.0 / COUNT(*) as pct_complete,
  COUNT(*) FILTER (WHERE political_affiliation IS NOT NULL) as populated,
  COUNT(*) as total
FROM judges
WHERE courtlistener_id IS NOT NULL;

-- Position history completeness
SELECT
  COUNT(*) FILTER (WHERE positions IS NOT NULL AND jsonb_array_length(positions) > 0) * 100.0 / COUNT(*) as pct_complete,
  COUNT(*) FILTER (WHERE positions IS NOT NULL AND jsonb_array_length(positions) > 0) as populated,
  COUNT(*) as total
FROM judges
WHERE courtlistener_id IS NOT NULL;
```

---

## Step 4: Verify UI Display

### Files to Check

The following UI components should already display this data:

#### Judge Profile Page
**File:** `app/judges/[slug]/page.tsx`

Should display:
- ✅ Education (already implemented)
- ⚠️ Political affiliation (needs verification)
- ⚠️ Position history (needs verification)

#### Professional Background Component
**File:** `components/judges/ProfessionalBackground.tsx`

Should display:
- ✅ Education timeline
- ⚠️ Position history timeline (needs verification)

### Verification Steps

1. Pick a test judge URL (e.g., `/judges/john-doe-superior-court`)
2. Check that all three data types appear:
   - Education section with schools, degrees, years
   - Political affiliation badge or section
   - Position history timeline with courts and dates

---

## Architecture Reference

### Sync Managers

| Class | File | Purpose |
|-------|------|---------|
| `EducationSyncManager` | `lib/courtlistener/education-sync.ts` | Syncs education data |
| `PoliticalAffiliationSyncManager` | `lib/courtlistener/political-affiliation-sync.ts` | Syncs political party data |
| `PositionSyncManager` | `lib/courtlistener/position-sync.ts` | Syncs position history |

### Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `sync-education-data.ts` | `npm run sync:education` | Education sync only |
| `sync-political-affiliations.ts` | `npm run sync:political` | Political sync only |
| `sync-position-history.ts` | `npm run sync:positions` | Position sync only |
| `sync-all-judge-data.ts` | `npm run sync:all` | All three sequentially |

### Rate Limiting Strategy

**Individual syncs:**
- 10 judges per batch
- 2 second delay between judges
- Rate: ~24 judges/min = 1,440/hour

**Master sync (`npm run sync:all`):**
- 5 judges per batch (more conservative)
- 3 second delay between judges
- 5 minute wait between sync types
- Rate: ~10 judges/min = 600/hour

Both strategies are well under CourtListener's 5,000 requests/hour limit.

---

## Error Handling

All sync scripts include:
- ✅ Exponential backoff on rate limit (429) errors
- ✅ Circuit breaker pattern
- ✅ Detailed error logging
- ✅ Graceful degradation
- ✅ Progress tracking
- ✅ Resumable (skips already-synced judges by default)

---

## Success Targets (30 Days)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Education | 13.3% | 80%+ | 🎯 Ready |
| Political Affiliation | 0% | 70%+ | ⚠️ Migration Required |
| Position History | 0% | 70%+ | 🎯 Ready |

---

## Troubleshooting

### Rate Limit Errors (429)

The sync will automatically back off and retry. If you see many 429 errors:
- Increase `delayMs` in sync config
- Reduce `batchSize`
- Run syncs at off-peak hours

### Political Affiliation Sync Fails

Check that migration ran successfully:
```bash
npx tsx scripts/add-political-affiliation-column.ts
```

### No Data Being Updated

Check that judges have `courtlistener_id` populated:
```sql
SELECT COUNT(*) FROM judges WHERE courtlistener_id IS NOT NULL;
```

Should be ~1,903 judges.

---

## Next Steps

1. ✅ **Read this guide**
2. ⚠️ **Run Step 1:** Add political_affiliation column (Supabase dashboard)
3. 🎯 **Run Step 2:** Test sync with `npm run sync:all -- --limit=10`
4. 📊 **Monitor:** Check progress after test sync
5. 🚀 **Execute:** Run full sync if test successful
6. ✅ **Verify:** Check UI displays all data correctly
7. 📈 **Analyze:** Run completeness analysis

---

## Files Created

This implementation added:

```
lib/courtlistener/position-sync.ts          (new)
scripts/sync-position-history.ts            (new)
scripts/sync-all-judge-data.ts              (new)
scripts/add-political-affiliation-column.ts (new)
docs/JUDGE_DATA_SYNC_GUIDE.md              (this file)
```

And modified:
```
package.json                                (added npm scripts)
```

---

## Questions?

- **Education sync script:** `scripts/sync-education-data.ts` (already existed)
- **Political sync script:** `scripts/sync-political-affiliations.ts` (already existed)
- **Position sync script:** `scripts/sync-position-history.ts` (NEW)
- **Master sync script:** `scripts/sync-all-judge-data.ts` (NEW)
- **Migration SQL:** `supabase/migrations/20251122_001_add_political_affiliation.sql`

Everything is ready to go! Just need to:
1. Run the migration
2. Execute the syncs
3. Verify the UI
