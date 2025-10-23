# Judicial Election & Political Affiliation Database Schema

## Overview

This document provides a complete overview of the judicial election and political affiliation tracking system for the JudgeFinder platform. The schema is designed to comprehensively track judicial elections, competitive races, retention votes, and political party affiliations across federal and state court systems.

## Schema Components

### Migration File
**File**: `20250122_001_add_election_tables.sql`
**Lines**: 561
**Status**: Production-ready

This migration creates:
- 3 ENUM types (election_type, selection_method, political_party)
- 3 new tables (judge_elections, judge_election_opponents, judge_political_affiliations)
- 5 new columns on the judges table
- 17+ indexes for query optimization
- 4 helper functions
- 3 triggers for data integrity
- Row Level Security (RLS) policies

### Documentation Files

1. **ELECTION_SCHEMA_GUIDE.md** - Comprehensive schema documentation
   - Entity-Relationship diagrams
   - Detailed table descriptions
   - Common query patterns
   - Data entry examples
   - Performance considerations

2. **ELECTION_TESTING_GUIDE.md** - Testing procedures
   - Sample test data
   - Verification queries
   - Performance tests
   - Troubleshooting guide

3. **types/election-data.ts** - TypeScript type definitions
   - Database entity types
   - API response types
   - Form input types
   - Display helper constants
   - Validation functions

## Key Features

### 1. Comprehensive Election Tracking

The schema supports all major types of judicial elections:

- **Initial Elections**: First-time elections to judicial positions
- **Retention Elections**: Yes/no votes (common in California)
- **Competitive Elections**: Multi-candidate races
- **Recall Elections**: Special removal votes
- **Primary/General Elections**: Standard election types

### 2. Opponent Tracking

For competitive races, the schema tracks:
- Opponent names and political parties
- Vote counts and percentages
- Biographical information
- Incumbent status

### 3. Political Affiliation History

The schema maintains:
- Current political party affiliation
- Historical party changes with date ranges
- Source attribution and verification status
- Automatic synchronization with judge records

### 4. California Retention System Support

Specifically designed for California's judicial retention system:
- Yes/no vote tracking
- Retention thresholds (typically 50%)
- 12-year term tracking for Supreme Court
- 6-year term tracking for Appellate Courts

### 5. Data Provenance

Every record includes:
- Source name (e.g., "California Secretary of State")
- Source URL to official documents
- Source date for tracking data freshness
- Verification status flag

## Database Schema

### ENUM Types

```sql
-- Election types
election_type: initial_election | retention | competitive | general |
               primary | recall | special | reelection

-- Selection methods
selection_method: elected | appointed | merit_selection | retention |
                  legislative | mixed | unknown

-- Political parties
political_party: democratic | republican | independent | libertarian |
                 green | constitution | american_independent |
                 peace_and_freedom | no_party_preference |
                 nonpartisan | other | unknown
```

### Tables

#### judge_elections (Core table)

Tracks all judicial elections with:
- Election identification (type, date, name)
- Location (jurisdiction, district)
- Results (won, vote counts, percentages)
- Retention data (yes/no votes, threshold)
- Term information (start, end, length)
- Context (incumbent status, contested)
- Source attribution

**Primary Key**: id (UUID)
**Foreign Keys**: judge_id → judges(id)
**Indexes**: 6 single-column + 3 composite indexes

#### judge_election_opponents

Tracks opponents in contested races with:
- Opponent details (name, party, occupation)
- Vote results (count, percentage)
- Biographical information

**Primary Key**: id (UUID)
**Foreign Keys**: election_id → judge_elections(id)
**Unique Constraint**: (election_id, opponent_name)
**Indexes**: 3 indexes

#### judge_political_affiliations

Tracks political party history with:
- Party affiliation details
- Date ranges (start_date, end_date)
- Current affiliation flag
- Verification data

**Primary Key**: id (UUID)
**Foreign Keys**: judge_id → judges(id)
**Check Constraint**: is_current must match end_date status
**Indexes**: 4 indexes including partial index on is_current

#### judges (Modified table)

Added 5 new columns:
- selection_method (ENUM)
- current_term_end_date (DATE)
- next_election_date (DATE)
- is_elected (BOOLEAN)
- current_political_party (ENUM)

**Indexes**: 5 new indexes on election-related fields

## Helper Functions

### 1. get_latest_election(judge_uuid UUID)

Returns the most recent election record for a judge.

```sql
SELECT * FROM get_latest_election('uuid-here');
```

**Returns**: election_id, election_date, election_type, won, vote_percentage

### 2. get_current_political_affiliation(judge_uuid UUID)

Returns the current political party for a judge.

```sql
SELECT get_current_political_affiliation('uuid-here');
```

**Returns**: political_party ENUM

### 3. calculate_retention_rate(judge_uuid UUID)

Calculates average retention election approval rate.

```sql
SELECT calculate_retention_rate('uuid-here');
```

**Returns**: DECIMAL percentage

### 4. sync_judge_political_party() (Trigger Function)

Automatically synchronizes current political party affiliation to judges table when affiliations are updated.

## Triggers

1. **update_judge_elections_updated_at**: Auto-updates timestamps
2. **update_election_opponents_updated_at**: Auto-updates timestamps
3. **update_political_affiliations_updated_at**: Auto-updates timestamps
4. **sync_political_party_to_judge**: Syncs current affiliation to judges table

## Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Public Read**: All users can read election and affiliation data (public records)
- **Admin Write**: Only users with role='admin' can insert/update/delete

This follows the principle that judicial election data is public record while maintaining data integrity through controlled writes.

## Performance Optimizations

### Indexing Strategy

The schema includes 17+ indexes optimized for:

1. **Judge lookups**: Direct access by judge_id
2. **Date sorting**: DESC indexes on election_date
3. **Type filtering**: Indexes on election_type, selection_method
4. **Geographic queries**: Indexes on jurisdiction
5. **Status filtering**: Partial indexes on is_elected, is_current, is_contested
6. **Composite queries**: Multi-column indexes for common join patterns

### Denormalization

The `judges.current_political_party` field is denormalized for performance. It's automatically kept in sync via trigger when political affiliations are updated.

### Query Optimization

Common query patterns are optimized with composite indexes:
- `(judge_id, election_date DESC)` for election history
- `(election_type, election_date DESC)` for type-specific queries
- `(judge_id, is_current)` for current affiliations

## Data Integrity

### Constraints

1. **Foreign Keys**: CASCADE delete on judge relationships
2. **Unique Constraints**: Prevent duplicate opponents per election
3. **Check Constraints**: Ensure is_current matches end_date status
4. **NOT NULL**: Required fields enforced at database level

### Validation

1. **Election Types**: ENUM validation prevents invalid values
2. **Date Logic**: Triggers ensure is_current flag matches end_date
3. **Vote Percentages**: Should be 0.00-100.00 (enforced by application)

## Use Cases

### 1. Judge Profile Display

Show election history, upcoming elections, and political affiliation on judge profile pages.

```typescript
import { JudgeWithElectionData, ElectionType } from '@/types/election-data'

// Fetch judge with election data
const judge: JudgeWithElectionData = await fetchJudge(judgeId)
```

### 2. Election Calendar

Display upcoming judicial elections across jurisdictions.

```sql
SELECT j.name, j.next_election_date, j.court_name
FROM judges j
WHERE j.next_election_date > CURRENT_DATE
ORDER BY j.next_election_date ASC;
```

### 3. Political Analysis

Analyze political party distribution across courts.

```sql
SELECT
  j.court_name,
  j.current_political_party,
  COUNT(*) as judge_count
FROM judges j
WHERE j.current_political_party != 'unknown'
GROUP BY j.court_name, j.current_political_party
ORDER BY j.court_name, judge_count DESC;
```

### 4. Retention Tracking

Monitor California Supreme Court retention elections.

```sql
SELECT
  j.name,
  je.election_date,
  je.yes_votes,
  je.no_votes,
  ROUND((je.yes_votes::DECIMAL / (je.yes_votes + je.no_votes) * 100), 2) as yes_percentage
FROM judge_elections je
JOIN judges j ON je.judge_id = j.id
WHERE je.election_type = 'retention'
  AND j.court_name = 'California Supreme Court'
ORDER BY je.election_date DESC;
```

### 5. Competitive Race Analysis

Analyze vote margins in contested judicial elections.

```sql
SELECT
  j.name,
  je.election_date,
  je.vote_percentage as judge_pct,
  MAX(jeo.vote_percentage) as top_opponent_pct,
  (je.vote_percentage - MAX(jeo.vote_percentage)) as margin_of_victory
FROM judge_elections je
JOIN judges j ON je.judge_id = j.id
LEFT JOIN judge_election_opponents jeo ON je.id = jeo.election_id
WHERE je.is_contested = true AND je.won = true
GROUP BY j.name, je.election_date, je.vote_percentage
ORDER BY margin_of_victory DESC;
```

## Data Sources

Recommended sources for populating this schema:

1. **State Election Boards**: Official election results
   - California Secretary of State
   - County Registrar-Recorder offices

2. **Ballotpedia**: Judicial election information
   - Election dates and results
   - Candidate information

3. **CourtListener**: Judicial biographical data
   - Appointment information
   - Political affiliations

4. **Voter Registration Records**: Party affiliation verification
   - Public records requests
   - State voter files

5. **Court Websites**: Official court information
   - Term dates
   - Current assignments

## Migration Workflow

### 1. Apply Migration

```bash
# Using Supabase CLI
cd /Users/tanner-osterkamp/JudgeFinderPlatform
supabase db push
```

### 2. Verify Schema

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('judge_elections', 'judge_election_opponents', 'judge_political_affiliations');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('judge_elections', 'judge_election_opponents', 'judge_political_affiliations');
```

### 3. Populate Initial Data

Use the sample data in ELECTION_TESTING_GUIDE.md to create test records.

### 4. Integrate with Application

Import types from `types/election-data.ts` and create API endpoints.

## API Integration

Example API endpoint structure:

```typescript
// GET /api/judges/:id/elections
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('judge_elections')
    .select(`
      *,
      opponents:judge_election_opponents(*)
    `)
    .eq('judge_id', params.id)
    .order('election_date', { ascending: false })

  return Response.json(data)
}

// GET /api/judges/:id/political-affiliations
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('judge_political_affiliations')
    .select('*')
    .eq('judge_id', params.id)
    .order('start_date', { ascending: false })

  return Response.json(data)
}
```

## Future Enhancements

Potential additions to consider:

1. **Campaign Finance Integration**
   - Link to campaign contribution data
   - Track fundraising totals
   - Identify major donors

2. **Endorsements Tracking**
   - Bar association endorsements
   - Political party endorsements
   - Interest group support

3. **Judicial Performance Reviews**
   - Link to bar association evaluations
   - Voter guide information
   - Performance metrics

4. **District Boundaries**
   - GIS data for judicial districts
   - Geographic analysis
   - Voter demographic data

5. **Election Predictions**
   - ML models for election outcomes
   - Historical trend analysis
   - Risk scoring

## Support & Maintenance

### Regular Maintenance Tasks

1. **Data Updates**: Sync with state election boards after each election
2. **Verification**: Review and verify flagged records
3. **Index Optimization**: Monitor and optimize indexes based on query patterns
4. **Data Quality**: Run validation queries to identify inconsistencies

### Monitoring Queries

```sql
-- Find unverified records
SELECT COUNT(*) FROM judge_elections WHERE verified = false;
SELECT COUNT(*) FROM judge_political_affiliations WHERE verified = false;

-- Find records missing source attribution
SELECT COUNT(*) FROM judge_elections WHERE source_name IS NULL;

-- Find judges with upcoming elections in next 90 days
SELECT COUNT(*) FROM judges
WHERE next_election_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days';

-- Find orphaned records (should return 0)
SELECT COUNT(*) FROM judge_elections
WHERE NOT EXISTS (SELECT 1 FROM judges WHERE judges.id = judge_elections.judge_id);
```

## Related Files

- **Migration**: `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/20250122_001_add_election_tables.sql`
- **Schema Guide**: `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/ELECTION_SCHEMA_GUIDE.md`
- **Testing Guide**: `/Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/ELECTION_TESTING_GUIDE.md`
- **TypeScript Types**: `/Users/tanner-osterkamp/JudgeFinderPlatform/types/election-data.ts`

## Version History

- **v1.0** (2025-01-22): Initial schema release
  - 3 tables, 3 ENUMs, 5 judge columns
  - 17+ indexes for optimization
  - 4 helper functions
  - RLS policies
  - Complete documentation

---

**Last Updated**: 2025-01-22
**Status**: Production Ready
**Maintainer**: JudgeFinder Platform Team
