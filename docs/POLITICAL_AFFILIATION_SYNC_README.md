# Political Affiliation Sync Guide

## Overview

This guide explains how to sync political party affiliation data from CourtListener to enrich judge profiles in the JudgeFinder platform.

## Prerequisites

1. **Environment Variables**: Ensure these are set in `.env.local`:
   ```bash
   COURTLISTENER_API_KEY=your_api_key_here
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Database Migration**: Run the migration to add the political_affiliation column:
   ```bash
   # Apply the migration
   supabase migration up

   # Or run directly in SQL:
   ALTER TABLE judges ADD COLUMN political_affiliation VARCHAR(100);
   ```

## Quick Start

### 1. Test the API Connection
First, verify the CourtListener API is working:
```bash
npm run test:political-api
```

This will:
- Test API connectivity
- Fetch sample political affiliation data
- Display the response structure

### 2. Run the Sync

#### Sync Missing Data Only (Default)
```bash
npm run sync:political
```

#### Force Re-sync All Judges
```bash
npm run sync:political -- --all
```

#### Sync Limited Batch
```bash
npm run sync:political -- --limit=50
```

#### Include Historical Affiliations
```bash
npm run sync:political -- --history
```

## How It Works

### Data Flow
1. **Query Database**: Finds judges with CourtListener IDs
2. **Fetch from API**: Calls `/political-affiliations/?person={id}` endpoint
3. **Process Data**: Formats party affiliation into readable text
4. **Update Database**: Stores in `political_affiliation` column
5. **Track Progress**: Logs statistics and errors

### Rate Limiting
- **API Quota**: 5,000 requests/hour
- **Safe Rate**: ~24 judges/minute (1,440/hr)
- **Batch Size**: 10 judges per batch
- **Delays**: 1.5s between judges, 2s between batches

### Data Format

#### Simple Format (Default)
```
"Republican Party (2018-present, appointed by Trump)"
```

#### With History (--history flag)
```
"Republican Party (2018-present); Republican Party (2003-2018, appointed by Bush)"
```

## API Response Structure

### Sample Response
```json
{
  "count": 2,
  "results": [
    {
      "political_party": "Republican Party",
      "political_party_id": "r",
      "date_start": "2018-10-06",
      "date_end": null,
      "appointer": {
        "name": "Donald J. Trump"
      },
      "votes_yes": 50,
      "votes_no": 48,
      "aba_rating": "wq"
    }
  ]
}
```

### Party IDs
- `d` - Democratic Party
- `r` - Republican Party
- `i` - Independent
- `n` - Non-partisan
- Others: Green, Libertarian, etc.

## Monitoring Progress

### During Sync
```
🎉 Political Affiliation Sync
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: Only missing data
Judges to process: 1,645
Estimated time: 68 minutes

Processing batch 1/165...
  ✓ Judge Smith: Republican Party (2020-present)
  ✓ Judge Jones: Democratic Party (2018-present)
  ⏭ Judge Brown: No affiliation data
```

### Completion Stats
```
📊 SYNC COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Success: true
📝 Processed: 1,645 judges
✏️  Updated: 1,420 judges
⏭️  Skipped: 225 judges (no data)
❌ Errors: 0
⏱️  Duration: 68 minutes

📊 Party Affiliation Breakdown:
   Democratic: 680
   Republican: 720
   Independent: 20
   Other: 0
   No Data: 225
```

## Troubleshooting

### Common Issues

#### 1. Column Does Not Exist
```
⚠️  Column "political_affiliation" does not exist!
```
**Solution**: Run the migration first:
```sql
ALTER TABLE judges ADD COLUMN political_affiliation VARCHAR(100);
```

#### 2. API Rate Limit Exceeded
```
CourtListener hourly quota exceeded: 5000/5000
```
**Solution**: Wait for the hourly reset or reduce batch size

#### 3. No Political Affiliation Data
Some judges may not have political affiliation data in CourtListener.
This is normal and these judges will be skipped.

#### 4. Authentication Failed
```
Invalid token
```
**Solution**: Verify your `COURTLISTENER_API_KEY` is correct

## Data Verification

### Check Individual Judge
```sql
SELECT id, name, political_affiliation
FROM judges
WHERE political_affiliation IS NOT NULL
LIMIT 10;
```

### View Party Distribution
```sql
SELECT * FROM political_affiliation_stats;
```

### Find Judges by Party
```sql
-- Democrats
SELECT name, court_name, political_affiliation
FROM judges
WHERE political_affiliation ILIKE '%democrat%';

-- Republicans
SELECT name, court_name, political_affiliation
FROM judges
WHERE political_affiliation ILIKE '%republican%';
```

## Best Practices

### Initial Sync
1. Start with a small test batch: `--limit=10`
2. Verify data quality
3. Run full sync during off-peak hours
4. Monitor for errors

### Ongoing Maintenance
1. Run weekly syncs for new judges
2. Use `--all` flag monthly to catch updates
3. Monitor party affiliation changes
4. Keep logs for audit trail

### Performance Tips
- Run during low-traffic periods
- Use smaller batches if experiencing timeouts
- Increase delays if hitting rate limits
- Consider running in background with `nohup`

## Integration with UI

### Display in Judge Profile
```typescript
// Example component
function JudgeProfile({ judge }) {
  return (
    <div>
      <h2>{judge.name}</h2>
      {judge.political_affiliation && (
        <p className="text-sm text-gray-600">
          Party: {judge.political_affiliation}
        </p>
      )}
    </div>
  )
}
```

### Search Filter
```typescript
// Add to search filters
const partyFilter = {
  label: 'Political Party',
  options: [
    { value: 'democratic', label: 'Democratic' },
    { value: 'republican', label: 'Republican' },
    { value: 'independent', label: 'Independent' }
  ]
}
```

## Files and Modules

### Core Files
- `/scripts/sync-political-affiliations.ts` - Main sync script
- `/lib/courtlistener/political-affiliation-sync.ts` - Sync manager
- `/lib/courtlistener/types/political-affiliation.ts` - TypeScript types
- `/supabase/migrations/20251122_001_add_political_affiliation.sql` - Database migration

### Documentation
- `/docs/COURTLISTENER_POLITICAL_AFFILIATIONS_API.md` - API documentation
- `/docs/POLITICAL_AFFILIATION_SYNC_README.md` - This guide

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API documentation
3. Check CourtListener API status
4. Review sync logs for specific errors

## Next Steps

After successful sync:
1. ✅ Verify data in database
2. ✅ Update UI components to display affiliation
3. ✅ Add search/filter capabilities
4. ✅ Set up regular sync schedule
5. ✅ Monitor data quality
6. ✅ Consider syncing positions data next