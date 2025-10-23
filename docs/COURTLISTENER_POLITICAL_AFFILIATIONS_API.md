# CourtListener Political Affiliations API Documentation

## Overview

This document provides comprehensive information for syncing political affiliation data from CourtListener to our JudgeFinder platform. The political affiliations endpoint provides party affiliation history for judges, including appointment details and nominating authorities.

## API Endpoint Details

### Base URL
```
https://www.courtlistener.com/api/rest/v4
```

### Political Affiliations Endpoint
```
GET /api/rest/v4/political-affiliations/?person={person_id}
```

### Authentication
- **Method**: Token-based authentication
- **Header**: `Authorization: Token {API_TOKEN}`
- **Token Location**: Environment variable `COURTLISTENER_API_KEY`
- **Current Token**: Stored in `.env.local`

### Rate Limiting
- **Quota**: 5,000 requests per hour with valid API key
- **Recommended Rate**: ~24 requests/minute (1,440/hr) to stay well under limit
- **Delay Between Requests**: 1.5-2 seconds minimum
- **Batch Size**: 10 judges per batch recommended

## Request Format

### Example Request
```typescript
GET https://www.courtlistener.com/api/rest/v4/political-affiliations/?person=123456&format=json

Headers:
  Authorization: Token 11b745157612fd1895856aedf5421a3bc8ecea34
  Accept: application/json
  User-Agent: JudgeFinder/1.0 (https://judgefinder.io; contact@judgefinder.io)
```

### Query Parameters
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `person` | string | CourtListener person/judge ID | Yes |
| `format` | string | Response format (always "json") | Yes |

## Response Format

### Successful Response Structure
```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 12345,
      "person": 123456,
      "political_party": "Republican Party",
      "date_start": "2018-10-06",
      "date_end": null,
      "source": "https://en.wikipedia.org/wiki/Brett_Kavanaugh",
      "political_party_id": "r",
      "nomination_process": "U.S. Senate",
      "appointer": {
        "id": 45,
        "name": "Donald J. Trump",
        "person_id": null
      },
      "retention_type": "life_tenure",
      "vote_type": "s",
      "how_selected": "a_pres",
      "date_nominated": "2018-07-09",
      "date_elected": null,
      "date_confirmation": "2018-10-06",
      "date_seated": "2018-10-06",
      "judicial_committee_action": "no_rep",
      "nomination_process_num": null,
      "voice_vote": false,
      "votes_yes": 50,
      "votes_no": 48,
      "votes_no_percent": 48.98,
      "votes_yes_percent": 51.02,
      "aba_rating": "wq",
      "date_hearing": "2018-09-04",
      "date_recess_appointment": null,
      "date_referred_to_judicial_committee": "2018-07-10",
      "date_judicial_committee_action": "2018-09-28"
    },
    {
      "id": 12346,
      "person": 123456,
      "political_party": "Republican Party",
      "date_start": "2003-05-26",
      "date_end": "2018-10-05",
      "source": "https://www.fjc.gov/node/12345",
      "political_party_id": "r",
      "nomination_process": "U.S. Senate",
      "appointer": {
        "id": 43,
        "name": "George W. Bush",
        "person_id": null
      },
      "retention_type": "life_tenure",
      "vote_type": "v",
      "how_selected": "a_pres",
      "date_nominated": "2003-05-01",
      "date_elected": null,
      "date_confirmation": "2003-05-26",
      "date_seated": "2003-06-02",
      "judicial_committee_action": "reported",
      "nomination_process_num": null,
      "voice_vote": true,
      "votes_yes": null,
      "votes_no": null,
      "votes_no_percent": null,
      "votes_yes_percent": null,
      "aba_rating": "wq",
      "date_hearing": "2003-05-15",
      "date_recess_appointment": null,
      "date_referred_to_judicial_committee": "2003-05-02",
      "date_judicial_committee_action": "2003-05-22"
    }
  ]
}
```

### Key Response Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `political_party` | string | Full party name | "Republican Party", "Democratic Party" |
| `political_party_id` | string | Party abbreviation | "r" (Republican), "d" (Democratic), "i" (Independent) |
| `date_start` | string | When affiliation began | "2018-10-06" |
| `date_end` | string\|null | When affiliation ended | null (current) |
| `appointer` | object | Who appointed/nominated | `{id, name, person_id}` |
| `how_selected` | string | Selection method | "a_pres" (appointed by president) |
| `date_nominated` | string | Nomination date | "2018-07-09" |
| `date_confirmation` | string | Confirmation date | "2018-10-06" |
| `votes_yes` | int\|null | Senate confirmation yes votes | 50 |
| `votes_no` | int\|null | Senate confirmation no votes | 48 |
| `aba_rating` | string | ABA rating | "wq" (well qualified) |

### Political Party IDs
- `d` - Democratic Party
- `r` - Republican Party
- `i` - Independent
- `g` - Green Party
- `l` - Libertarian Party
- `f` - Federalist
- `w` - Whig
- `dr` - Democratic-Republican
- `n` - None/Non-partisan

### ABA Ratings
- `ewq` - Exceptionally Well Qualified
- `wq` - Well Qualified
- `q` - Qualified
- `nq` - Not Qualified
- `nqa` - Not Qualified by Reason of Age

## Error Handling

### Common Error Responses

#### 404 - Judge Not Found
```json
{
  "detail": "Not found."
}
```

#### 429 - Rate Limit Exceeded
```json
{
  "detail": "Request was throttled. Expected available in 3600 seconds."
}
```
Headers:
- `X-RateLimit-Limit`: 5000
- `X-RateLimit-Remaining`: 0
- `X-RateLimit-Reset`: Unix timestamp

#### 401 - Authentication Failed
```json
{
  "detail": "Invalid token."
}
```

## Database Schema Updates Required

### Option 1: Add political_affiliation Column
```sql
ALTER TABLE judges ADD COLUMN IF NOT EXISTS political_affiliation VARCHAR(100);
ALTER TABLE judges ADD COLUMN IF NOT EXISTS political_affiliation_details JSONB;
```

### Option 2: Use Existing JSONB Column
Store in the existing `courtlistener_data` JSONB column:
```sql
UPDATE judges
SET courtlistener_data = jsonb_set(
  COALESCE(courtlistener_data, '{}'::jsonb),
  '{political_affiliations}',
  '[political_affiliation_data_here]'::jsonb
)
WHERE id = ?;
```

### Recommended Approach
For consistency with education data, add a simple text field:
```sql
ALTER TABLE judges ADD COLUMN IF NOT EXISTS political_affiliation VARCHAR(100);
```

## Data Mapping Strategy

### Simple Text Format (Recommended)
Similar to education field, store as human-readable text:
```
"Republican Party (2018-present); Republican Party (2003-2018)"
```

### Detailed Format (If storing in JSONB)
```json
{
  "current_party": "Republican Party",
  "current_since": "2018-10-06",
  "history": [
    {
      "party": "Republican Party",
      "start": "2018-10-06",
      "end": null,
      "appointed_by": "Donald J. Trump",
      "position": "U.S. Supreme Court"
    },
    {
      "party": "Republican Party",
      "start": "2003-05-26",
      "end": "2018-10-05",
      "appointed_by": "George W. Bush",
      "position": "U.S. Court of Appeals"
    }
  ]
}
```

## Implementation Pattern

Following the existing `education-sync.ts` pattern:

### 1. Create Political Affiliation Sync Manager
```typescript
export class PoliticalAffiliationSyncManager {
  async syncPoliticalAffiliations(options: SyncOptions): Promise<SyncResult> {
    // Get judges needing sync
    // Fetch political affiliations from CourtListener
    // Format data
    // Update database
    // Handle rate limiting
  }

  private async fetchPoliticalAffiliations(courtlistenerId: string): Promise<PoliticalAffiliation[]> {
    const response = await this.clClient.getPoliticalAffiliations(courtlistenerId)
    return response.results || []
  }

  private formatPoliticalAffiliations(records: PoliticalAffiliation[]): string {
    // Format as human-readable text
    // Example: "Republican Party (2018-present, appointed by Trump)"
  }
}
```

### 2. Script Structure
```typescript
// scripts/sync-political-affiliations.ts
import { PoliticalAffiliationSyncManager } from '../lib/courtlistener/political-affiliation-sync'

async function main() {
  const syncManager = new PoliticalAffiliationSyncManager(supabase, clClient)

  const result = await syncManager.syncPoliticalAffiliations({
    skipIfExists: !args.includes('--all'),
    batchSize: 10,
    delayMs: 2000,
  })

  // Report results
}
```

## Rate Limiting Considerations

### Safe Operating Parameters
- **Batch Size**: 10 judges per batch
- **Delay Between Judges**: 1.5-2 seconds
- **Delay Between Batches**: 2-3 seconds
- **Effective Rate**: ~24 judges/minute = 1,440/hour
- **Safety Margin**: 3,560 requests under 5,000/hr limit

### Circuit Breaker Settings
From existing configuration:
- `COURTLISTENER_REQUEST_DELAY_MS`: 1000 (minimum)
- `COURTLISTENER_MAX_RETRIES`: 5
- `COURTLISTENER_REQUEST_TIMEOUT_MS`: 30000
- `COURTLISTENER_CIRCUIT_THRESHOLD`: 5
- `COURTLISTENER_CIRCUIT_COOLDOWN_MS`: 60000

## Differences from Education Sync

### API Response Differences
1. **Multiple Records**: Political affiliations often return multiple records (appointment history)
2. **Richer Data**: Includes appointment details, voting records, ABA ratings
3. **Date Ranges**: Has start and end dates for each affiliation
4. **Appointer Info**: Includes who appointed the judge

### Data Processing Differences
1. **Current vs Historical**: Need to identify current affiliation
2. **Multiple Positions**: Judge may have affiliations for different positions
3. **Null Handling**: Many fields can be null (votes, ratings, etc.)

### Storage Considerations
1. **Text Summary**: Simple current party affiliation
2. **Historical Data**: Consider storing full history in JSONB
3. **Display Format**: User-friendly format for UI display

## Testing Approach

### 1. Test with Known Judge
```bash
# Test with a specific judge ID
curl -H "Authorization: Token YOUR_TOKEN" \
  "https://www.courtlistener.com/api/rest/v4/political-affiliations/?person=123456&format=json"
```

### 2. Verify Data Structure
- Check for multiple affiliations
- Validate date formats
- Ensure appointer data exists

### 3. Test Error Handling
- Invalid judge ID (404)
- Rate limiting response (429)
- Network timeout scenarios

## Next Steps

1. **Database Migration**: Add `political_affiliation` column to judges table
2. **Create Sync Module**: Build `political-affiliation-sync.ts` following education sync pattern
3. **Update Client Types**: Add TypeScript interfaces for political affiliation data
4. **Create Script**: Build `sync-political-affiliations.ts` script
5. **Test with Sample**: Run on small batch of judges first
6. **Full Sync**: Process all judges with CourtListener IDs
7. **UI Updates**: Display political affiliation in judge profiles

## Monitoring & Logging

### Key Metrics to Track
- Judges processed vs updated
- Judges with no affiliation data
- API errors and retries
- Rate limit warnings
- Sync duration

### Log Format
```
🎉 Political Affiliation Sync
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mode: Only missing data
Judges to process: 1,645
Estimated time: 68 minutes

Processing batch 1/165...
  ✓ Judge Smith: Republican Party (2020-present)
  ✓ Judge Jones: Democratic Party (2018-present)
  ⏭ Judge Brown: No affiliation data

Sync Complete:
✅ Success: 1,420 judges
⏭️ Skipped: 225 judges (no data)
❌ Errors: 0
⏱️ Duration: 68 minutes
```

## Security & Compliance

- API token stored securely in environment variables
- No PII exposed in logs
- Rate limiting prevents API abuse
- Error messages sanitized
- Audit trail via sync_logs table