# CourtListener Bulk Data Import Guide

**Date:** October 24, 2025
**Author:** JudgeFinder Engineering
**Status:** Production Ready

---

## Overview

The bulk import script downloads and imports complete judicial data from CourtListener's public S3 bucket. This is significantly faster than API-based imports for initial data seeding.

### Why Use Bulk Import?

**Advantages over API Import:**
- **Speed**: 15-20 minutes vs 48+ hours for full California dataset
- **No Rate Limits**: Direct S3 downloads, no API quota consumption
- **Complete Data**: 100% historical records available
- **Resumable**: Can pause and resume large imports
- **Memory Efficient**: Streams large files without loading into memory

**When to Use:**
- Initial platform setup (first-time data population)
- Complete data refresh/reset
- Adding new jurisdictions
- Bulk backfill of missing records

**When to Use API Import Instead:**
- Daily/weekly incremental updates
- Real-time judge profile updates
- Targeted single-judge synchronization
- Filtered queries (e.g., judges with specific characteristics)

---

## Prerequisites

### Required Environment Variables

```bash
# .env.local or production environment
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Required Dependencies

The script will auto-install `unbzip2-stream` if not present. Otherwise, install manually:

```bash
npm install unbzip2-stream
```

### Disk Space Requirements

**Download Cache Directory**: `.cache/bulk-data/`

| Dataset | Compressed | Uncompressed | Records (CA only) |
|---------|------------|--------------|-------------------|
| Courts  | ~1 MB      | ~5 MB        | ~200 courts       |
| Judges  | ~50 MB     | ~200 MB      | ~2,000 judges     |
| **Total** | **~51 MB** | **~205 MB**  | **~2,200 records** |

**Note**: Full national dataset is ~500MB compressed, but we filter for California only during processing.

---

## Quick Start

### 1. Basic Import (All Data)

Import both courts and judges:

```bash
npm run bulk:import
```

**Expected Output:**
```
🚀 CourtListener Bulk Data Import
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: All Data
Resume: No
Download Dir: /path/to/.cache/bulk-data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📥 Downloading: https://com-courtlistener-storage.s3.amazonaws.com/bulk-data/courts.jsonl.bz2
  ⏳ Progress: 100% (1.2MB / 1.2MB)
  ✅ Downloaded: 1.2MB

📊 Processing Courts...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⏳ Processed 150 courts | Created: 150 | Updated: 0 | Skipped: 2850

📊 Courts Import Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Total Processed: 200
➕ Created: 200
✏️  Updated: 0
⏭️  Skipped (non-CA): 2800
❌ Errors: 0
⏱️  Duration: 45.2s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Similar output for judges...]

🎉 BULK IMPORT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Courts: 200 created, 0 updated, 0 errors
👨‍⚖️ Judges: 1850 created, 0 updated, 0 errors
⏱️  Total Duration: 18.3 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Import Courts Only

Useful when you only need to refresh court data:

```bash
npm run bulk:import:courts
```

### 3. Import Judges Only

Useful when courts are already populated:

```bash
npm run bulk:import:judges
```

### 4. Resume Interrupted Import

If import was interrupted (network issue, system restart, etc.):

```bash
npm run bulk:resume
```

The script saves checkpoints every 5 seconds and will resume from the last saved position.

---

## Advanced Usage

### Command Line Options

```bash
# Full command syntax
npx tsx scripts/bulk-import-courtlistener-data.ts [OPTIONS]

# Available options:
--courts-only       # Import only courts
--judges-only       # Import only judges
--resume            # Resume from last checkpoint
--skip-download     # Use cached files if available
--verbose, -v       # Show detailed debug logging
```

### Examples

**Resume with verbose logging:**
```bash
npx tsx scripts/bulk-import-courtlistener-data.ts --resume --verbose
```

**Use cached files (skip re-download):**
```bash
npx tsx scripts/bulk-import-courtlistener-data.ts --skip-download
```

**Courts only with verbose output:**
```bash
npx tsx scripts/bulk-import-courtlistener-data.ts --courts-only --verbose
```

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ 1. DOWNLOAD PHASE                                       │
│    - Fetch JSONL.BZ2 from CourtListener S3              │
│    - Save to .cache/bulk-data/                          │
│    - Progress tracking with MB counters                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. STREAMING DECOMPRESSION                              │
│    - Pipe through unbzip2-stream                        │
│    - Process line-by-line (JSONL format)                │
│    - No full file load into memory                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CALIFORNIA FILTERING                                 │
│    Courts: ID prefix, name patterns, jurisdiction       │
│    Judges: Position history with CA court IDs           │
│    ~95% of records filtered out (national → CA)         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. DATABASE IMPORT                                      │
│    - Check existing records by courtlistener_id         │
│    - INSERT new records                                 │
│    - UPDATE existing records                            │
│    - Track stats (created/updated/skipped/errors)       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. CHECKPOINT SAVING                                    │
│    - Save progress every 5 seconds                      │
│    - Enables resume on interruption                     │
│    - Stored in .cache/bulk-data/import-checkpoint.json  │
└─────────────────────────────────────────────────────────┘
```

### California Filtering Logic

#### Courts

A court is considered California-related if ANY of these match:

1. **Court ID Prefix**:
   - Starts with `cal` (e.g., `cal`, `calctapp1`, `calsuper_alameda`)
   - Listed in `CA_FEDERAL_COURTS` (e.g., `ca9`, `cacd`, `cand`, `casd`, `caed`)

2. **Jurisdiction Field**:
   - `jurisdiction === 'CA'`
   - Contains "CALIFORNIA"

3. **Court Name**:
   - Contains "CALIFORNIA"
   - Contains "CA COURT" or "CA SUPERIOR"
   - Contains "DISTRICT OF CALIFORNIA"
   - Contains "NINTH CIRCUIT"

4. **Location**:
   - Contains "CALIFORNIA" or ", CA"

#### Judges

A judge is considered California-related if they have ANY position in a California court:

```typescript
judge.positions.some(position => {
  const courtId = position.court_id.toLowerCase()

  // Check against CA court IDs
  return courtId.startsWith('cal') ||
         CA_FEDERAL_COURTS.includes(courtId) ||
         position.court_full_name.includes('CALIFORNIA')
})
```

**Note**: This includes judges who:
- Currently serve in California
- Previously served in California (historical positions)
- Have any California appointment in their career

---

## Data Mapping

### Courts Table

| CourtListener Field | Our Database Field | Notes |
|---------------------|-------------------|-------|
| `id` | `courtlistener_id` | Primary identifier |
| `name` or `full_name` | `name` | Display name |
| Auto-detected | `type` | 'federal', 'state', or 'local' |
| `jurisdiction` | `jurisdiction` | e.g., 'CA', 'US' |
| `url` | `website` | Court website |
| `location` | `address` | Physical location |
| Full object | `courthouse_metadata` | JSONB with all metadata |

**Metadata Fields** (stored in `courthouse_metadata`):
- `short_name`
- `citation_string`
- `in_use`
- `has_opinion_scraper`
- `has_oral_argument_scraper`
- `position_count`
- `start_date`, `end_date`
- `raw` - Complete original record

### Judges Table

| CourtListener Field | Our Database Field | Notes |
|---------------------|-------------------|-------|
| `id` | `courtlistener_id` | Primary identifier |
| `name_full` or `name` | `name` | Display name |
| Current position court | `court_name` | Extracted from positions[0] |
| Extracted from position | `jurisdiction` | e.g., 'CA', 'US' |
| `positions[0].date_start` | `appointed_date` | First appointment date |
| Full object | `courtlistener_data` | JSONB with complete data |

**Current Position Logic:**
1. Find first position without `date_termination` (active position)
2. If none, use first position in array
3. Extract court name and jurisdiction from that position

---

## Performance Optimization

### Memory Usage

The script uses **streaming** to handle large files efficiently:

```typescript
// ❌ BAD - Loads entire file into memory
const data = JSON.parse(fs.readFileSync('people.jsonl.bz2'))

// ✅ GOOD - Streams line by line
const stream = createReadStream('people.jsonl.bz2')
  .pipe(createBunzip2())
  .pipe(readline.createInterface())

for await (const line of stream) {
  processLine(line) // Only current line in memory
}
```

**Estimated Memory Usage:**
- Peak: ~150 MB (node runtime + processing buffer)
- Average: ~80 MB
- Downloads handled via streams, not buffered

### Processing Speed

| Phase | Duration | Records/sec |
|-------|----------|-------------|
| Download Courts | 5-10s | N/A |
| Process Courts | 30-60s | ~3-4/sec |
| Download Judges | 20-40s | N/A |
| Process Judges | 10-15 min | ~2-3/sec |

**Bottlenecks:**
1. **Network Speed**: Download time depends on connection
2. **Database Write Speed**: Supabase insert/update latency
3. **Filtering Logic**: JSON parsing and field checking

**Optimization Opportunities:**
- Batch inserts (currently one-by-one)
- Parallel processing (currently sequential)
- Local caching of court ID lookups

---

## Checkpoint & Resume

### How Checkpoints Work

Every 5 seconds during processing, the script saves:

```json
{
  "courts": 150,        // Last processed line number
  "judges": 1234,       // Last processed line number
  "timestamp": "2025-10-24T10:30:45.123Z"
}
```

**Checkpoint File**: `.cache/bulk-data/import-checkpoint.json`

### Resume Behavior

When you run with `--resume`:

1. Load checkpoint file
2. Skip already-processed lines
3. Continue from last checkpoint
4. Save new checkpoints as processing continues

**Example:**

```bash
# Initial run processes 1000 judges, then crashes
npm run bulk:import
# ... processes 1000 lines, then fails

# Resume continues from line 1000
npm run bulk:resume
# ... starts at line 1001, continues to end
```

### When to Clear Checkpoints

```bash
# Manually delete checkpoint to start fresh
rm .cache/bulk-data/import-checkpoint.json

# Or run without --resume flag
npm run bulk:import  # Starts from line 0
```

---

## Troubleshooting

### Download Fails

**Error**: `Download failed with status 403` or `ECONNRESET`

**Solutions:**
1. Check network connection
2. Verify firewall isn't blocking AWS S3
3. Try different network (VPN, mobile hotspot)
4. Use resume mode: `npm run bulk:resume`

```bash
# Test S3 access directly
curl -I https://com-courtlistener-storage.s3.amazonaws.com/bulk-data/courts.jsonl.bz2
```

### Decompression Errors

**Error**: `invalid compressed data` or `unexpected end of data`

**Solutions:**
1. Re-download file: delete `.cache/bulk-data/*.jsonl.bz2`
2. Verify file integrity:
   ```bash
   bzip2 -t .cache/bulk-data/people.jsonl.bz2
   ```
3. Check disk space: `df -h .cache/`

### JSON Parsing Errors

**Error**: `Unexpected token in JSON at position X`

**Solutions:**
1. Run with `--verbose` to see problematic line
2. CourtListener data may have edge cases
3. Script will log error and continue with next line
4. Check `errors` count in final summary

### Database Errors

**Error**: `Failed to insert/update` or `Connection timeout`

**Solutions:**

1. **Check Supabase credentials:**
   ```bash
   echo $SUPABASE_SERVICE_ROLE_KEY  # Should not be empty
   ```

2. **Verify database connection:**
   ```bash
   # Test with simple query
   curl "https://your-project.supabase.co/rest/v1/judges?limit=1" \
     -H "apikey: your-service-role-key"
   ```

3. **Check RLS policies:**
   - Service role key should bypass RLS
   - Verify policies in Supabase dashboard

4. **Database capacity:**
   - Free tier has connection limits
   - Check Supabase dashboard for active connections

### Low Performance

**Symptom**: Import taking much longer than expected (>30 minutes for CA data)

**Diagnosis:**

1. **Check network speed:**
   ```bash
   # Test download speed
   time curl -o /dev/null https://com-courtlistener-storage.s3.amazonaws.com/bulk-data/courts.jsonl.bz2
   ```

2. **Check database latency:**
   - Supabase dashboard → Database → Performance
   - Look for slow queries

3. **System resources:**
   ```bash
   # Check CPU/memory
   top -o cpu
   ```

**Solutions:**
- Use wired connection instead of WiFi
- Close other applications
- Run during off-peak hours (less DB contention)
- Consider upgrading Supabase plan for better performance

### Duplicate Records

**Symptom**: "Duplicate key violation" errors

**Cause**: Existing records in database

**Behavior**: Script automatically updates existing records instead of creating duplicates

**To Force Fresh Import:**
```sql
-- ⚠️ WARNING: Deletes all courts and judges
DELETE FROM cases;  -- Delete first (foreign key constraint)
DELETE FROM judges;
DELETE FROM courts;
```

---

## Integration with Existing Sync

### Hybrid Approach (Recommended)

Use bulk import for **initial seed**, then API for **updates**:

```bash
# Step 1: Initial bulk import (one-time)
npm run bulk:import

# Step 2: Set up recurring API sync (cron job)
# Daily incremental updates via API
npm run sync:judges
npm run sync:courts

# Step 3: Weekly full sync
# Picks up new judges added to CourtListener
npm run cron:weekly
```

### When to Re-run Bulk Import

- **Major data refresh**: Annually or after schema changes
- **New jurisdiction**: Adding states beyond California
- **Data quality issues**: Full reset to known-good state
- **Performance**: Faster than API for large backlogs

### Data Freshness

| Source | Update Frequency | Best For |
|--------|------------------|----------|
| Bulk Files | Weekly | Initial seed, complete refresh |
| REST API | Real-time | Daily updates, specific judges |

**Bulk Data Lag**: CourtListener updates bulk files weekly. For latest data, use API after bulk import.

---

## Validation After Import

### 1. Check Import Statistics

Review final summary for errors:

```
📊 Courts: 200 created, 0 updated, 5 errors
👨‍⚖️ Judges: 1850 created, 150 updated, 12 errors
```

**If errors > 0**: Check console output for specific error messages

### 2. Database Record Counts

```sql
-- Count imported courts
SELECT COUNT(*) FROM courts WHERE courtlistener_id IS NOT NULL;
-- Expected: ~200 for California

-- Count imported judges
SELECT COUNT(*) FROM judges WHERE courtlistener_id IS NOT NULL;
-- Expected: ~1,800-2,000 for California

-- Check jurisdiction distribution
SELECT jurisdiction, COUNT(*)
FROM judges
GROUP BY jurisdiction
ORDER BY COUNT(*) DESC;
```

### 3. Data Quality Checks

```bash
# Run full integrity check
npm run integrity:full

# Validate relationships
npm run validate:relationships

# Check data freshness
npm run data:status
```

### 4. Sample Judge Verification

```sql
-- Check that judges have court assignments
SELECT
  name,
  court_name,
  jurisdiction,
  appointed_date
FROM judges
WHERE courtlistener_id IS NOT NULL
LIMIT 10;

-- Check courtlistener_data JSONB structure
SELECT
  name,
  courtlistener_data->>'name_full' as cl_name,
  jsonb_array_length(courtlistener_data->'positions') as position_count
FROM judges
WHERE courtlistener_id IS NOT NULL
LIMIT 5;
```

---

## Comparison: Bulk vs API Import

### Performance Comparison

| Metric | Bulk Import | API Import |
|--------|-------------|------------|
| **Courts (200 records)** |
| Download | 5-10 seconds | N/A |
| Processing | 30-60 seconds | 5-10 minutes |
| Total | ~1 minute | 5-10 minutes |
| **Judges (2,000 records)** |
| Download | 20-40 seconds | N/A |
| Processing | 10-15 minutes | 40-48 hours |
| Total | ~15 minutes | **2 days** |
| **Rate Limit Impact** |
| API Calls | 0 | ~20,000+ |
| Quota Used | 0% | 400% (4 days of quota) |

### Feature Comparison

| Feature | Bulk Import | API Import |
|---------|-------------|------------|
| Speed | ⚡ Very Fast | 🐌 Slow |
| Rate Limits | ✅ None | ⚠️ 5,000/hour |
| Data Completeness | ✅ 100% historical | ✅ 100% current |
| Resume Capability | ✅ Yes | ⚠️ Limited |
| Filtering | ⚠️ Client-side | ✅ Server-side |
| Real-time Updates | ❌ Weekly lag | ✅ Live data |
| Network Bandwidth | 📊 ~50 MB | 📊 ~500 MB |
| Memory Usage | ✅ Low (streaming) | ⚠️ Higher (batches) |

### When to Use Each

**Use Bulk Import When:**
- ✅ Setting up platform for first time
- ✅ Need complete historical data
- ✅ Have large backlog (>500 judges)
- ✅ Want to avoid API rate limits
- ✅ Weekly data freshness is acceptable

**Use API Import When:**
- ✅ Need real-time updates
- ✅ Syncing specific judges
- ✅ Incremental daily updates
- ✅ Filtered queries (e.g., by date range)
- ✅ Building on existing dataset

**Hybrid Approach (Best Practice):**
1. Bulk import for initial seed
2. API sync for daily updates
3. Periodic bulk refresh (quarterly/annually)

---

## Next Steps After Import

### 1. Verify Data Quality

```bash
npm run integrity:full
npm run validate:relationships
```

### 2. Generate Analytics

```bash
# Generate AI-powered bias analytics for all judges
npm run analytics:generate

# This will take several hours for 2,000 judges
# ~2-3 seconds per judge × 2,000 = ~1.5-2 hours
```

### 3. Set Up Incremental Sync

Configure daily API-based sync for updates:

```bash
# Add to crontab or use Netlify scheduled functions
0 2 * * * cd /path/to/project && npm run sync:judges
0 3 * * * cd /path/to/project && npm run sync:courts
```

### 4. Enable Real-time Features

Now that bulk data is loaded:
- Judge search will return California judges
- Court pages will have complete metadata
- Analytics can be generated for judges with cases
- Advertising can be configured for judge pages

### 5. Monitor Data Freshness

```bash
# Check when data was last updated
npm run data:status

# Should show:
# Courts: 200 records, last updated: 2025-10-24
# Judges: 1850 records, last updated: 2025-10-24
```

---

## API Reference

### BulkDataImporter Class

```typescript
class BulkDataImporter {
  constructor(verbose?: boolean)

  async import(options: {
    courtsOnly?: boolean
    judgesOnly?: boolean
    resume?: boolean
    skipDownload?: boolean
  }): Promise<void>
}
```

### Example: Programmatic Usage

```typescript
import { BulkDataImporter } from './scripts/bulk-import-courtlistener-data'

async function customImport() {
  const importer = new BulkDataImporter(true) // verbose mode

  await importer.import({
    judgesOnly: true,
    resume: true,
    skipDownload: true
  })
}
```

---

## FAQ

### Q: How often should I run bulk import?

**A**: Once for initial setup, then quarterly/annually for full refresh. Use API sync for daily updates.

### Q: Can I import other states?

**A**: Yes, modify the filtering logic in `isCaliforniaCourt()` and `hasCaliforniaPosition()` to check for other state court IDs.

### Q: What if import is interrupted?

**A**: Run `npm run bulk:resume` to continue from last checkpoint.

### Q: How do I know if it worked?

**A**: Check final summary statistics and run `npm run integrity:full` to validate data quality.

### Q: Can I run this in production?

**A**: Yes, but prefer off-peak hours. Consider running in separate worker/cron job to avoid blocking main app.

### Q: What about judge photos, bios, etc.?

**A**: Bulk data includes metadata but not photos. Use API endpoints or manual curation for rich media.

### Q: Is this safe for my database?

**A**: Yes, script uses upsert logic (update if exists, insert if new). Won't create duplicates.

---

## Support

For issues or questions:

1. Check this guide's troubleshooting section
2. Review console error messages (run with `--verbose`)
3. Check CourtListener status: https://www.courtlistener.com/
4. Review existing sync scripts for patterns
5. Contact engineering team with detailed error logs

---

**Document Version**: 1.0
**Last Updated**: October 24, 2025
**Maintained By**: JudgeFinder Engineering
