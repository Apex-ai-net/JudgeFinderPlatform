# Judicial Election and Political Affiliation Schema Guide

## Overview

This guide documents the database schema for tracking judicial elections and political affiliations in the JudgeFinder platform. The schema supports various election types, competitive races, retention elections, and historical political party data.

## Schema Architecture

### Entity Relationship Diagram

```
judges
  ├── selection_method (ENUM)
  ├── current_term_end_date (DATE)
  ├── next_election_date (DATE)
  ├── is_elected (BOOLEAN)
  └── current_political_party (ENUM)
      |
      ├─── judge_elections (1:N)
      |      ├── election_type (ENUM)
      |      ├── election_date (DATE)
      |      ├── vote results
      |      ├── term information
      |      └── judge_election_opponents (1:N)
      |             ├── opponent_name
      |             ├── opponent_party
      |             └── vote results
      |
      └─── judge_political_affiliations (1:N)
             ├── political_party (ENUM)
             ├── start_date (DATE)
             ├── end_date (DATE)
             └── is_current (BOOLEAN)
```

## Tables

### 1. Modified `judges` Table

New columns added to the existing judges table:

| Column | Type | Description |
|--------|------|-------------|
| `selection_method` | `selection_method` ENUM | How the judge was initially selected |
| `current_term_end_date` | DATE | When the current term expires |
| `next_election_date` | DATE | Next scheduled election date |
| `is_elected` | BOOLEAN | Quick filter for elected vs appointed judges |
| `current_political_party` | `political_party` ENUM | Current party affiliation (denormalized) |

**Indexes:**
- `idx_judges_selection_method` - Filter by selection method
- `idx_judges_is_elected` - Partial index on elected judges
- `idx_judges_next_election_date` - Partial index on upcoming elections
- `idx_judges_current_term_end` - Partial index on expiring terms
- `idx_judges_political_party` - Filter by party affiliation

### 2. `judge_elections` Table

Core table for tracking all judicial elections.

**Key Features:**
- Supports retention elections (yes/no votes)
- Tracks competitive races with multiple candidates
- Stores term information
- Maintains source attribution

**Important Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `judge_id` | UUID | Foreign key to judges table |
| `election_type` | `election_type` ENUM | Type of election |
| `election_date` | DATE | Date of election |
| `won` | BOOLEAN | NULL if pending, TRUE if won, FALSE if lost |
| `vote_count` | INTEGER | Votes received by judge |
| `vote_percentage` | DECIMAL(5,2) | Percentage of votes (0.00-100.00) |
| `yes_votes` | INTEGER | For retention: votes to retain |
| `no_votes` | INTEGER | For retention: votes to remove |
| `retention_threshold` | DECIMAL(5,2) | Minimum % to retain (often 50%) |
| `term_start_date` | DATE | Term start date |
| `term_end_date` | DATE | Term end date |
| `term_length_years` | INTEGER | Term length in years |
| `is_contested` | BOOLEAN | Whether there was opposition |
| `opponent_count` | INTEGER | Number of opponents |
| `source_name` | VARCHAR(255) | Data source |
| `source_url` | TEXT | URL to official results |

**Indexes:**
- `idx_judge_elections_judge_id` - Lookup by judge
- `idx_judge_elections_election_date` - Sort by date (DESC)
- `idx_judge_elections_election_type` - Filter by type
- `idx_judge_elections_jurisdiction` - Filter by location
- `idx_judge_elections_judge_date` - Composite for common queries
- `idx_judge_elections_type_date` - Composite for type + date queries

### 3. `judge_election_opponents` Table

Tracks opponents in contested judicial elections.

| Column | Type | Description |
|--------|------|-------------|
| `election_id` | UUID | Foreign key to judge_elections |
| `opponent_name` | VARCHAR(255) | Name of opponent |
| `opponent_party` | `political_party` ENUM | Opponent's party |
| `vote_count` | INTEGER | Votes received |
| `vote_percentage` | DECIMAL(5,2) | Percentage of votes |
| `is_incumbent` | BOOLEAN | Was opponent the incumbent? |
| `occupation` | VARCHAR(255) | Opponent's occupation |
| `background` | TEXT | Brief background |

**Unique Constraint:** `(election_id, opponent_name)` - Prevents duplicate opponents

**Indexes:**
- `idx_election_opponents_election_id` - Lookup opponents by election
- `idx_election_opponents_name` - Search by opponent name
- `idx_election_opponents_party` - Filter by party

### 4. `judge_political_affiliations` Table

Tracks historical and current political party affiliations.

**Key Features:**
- Maintains full affiliation history
- Supports date ranges for each affiliation
- Enforces only one current affiliation per judge
- Auto-syncs current party to judges table

| Column | Type | Description |
|--------|------|-------------|
| `judge_id` | UUID | Foreign key to judges |
| `political_party` | `political_party` ENUM | Party affiliation |
| `start_date` | DATE | When affiliation began |
| `end_date` | DATE | When it ended (NULL if current) |
| `is_current` | BOOLEAN | TRUE if current affiliation |
| `source_name` | VARCHAR(255) | Data source |
| `registration_type` | VARCHAR(100) | How determined (e.g., voter registration) |

**Constraints:**
- Check constraint ensures `is_current = TRUE` only when `end_date IS NULL`

**Indexes:**
- `idx_political_affiliations_judge_id` - Lookup by judge
- `idx_political_affiliations_party` - Filter by party
- `idx_political_affiliations_current` - Partial index on current affiliations
- `idx_political_affiliations_judge_current` - Composite for finding current party

## ENUM Types

### `election_type`

```sql
CREATE TYPE election_type AS ENUM (
    'initial_election',      -- First election to the position
    'retention',             -- Retention election (yes/no vote)
    'competitive',           -- Contested election with candidates
    'general',               -- General election
    'primary',               -- Primary election
    'recall',                -- Recall election
    'special',               -- Special election to fill vacancy
    'reelection'             -- Standard reelection campaign
);
```

### `selection_method`

```sql
CREATE TYPE selection_method AS ENUM (
    'elected',               -- Directly elected by voters
    'appointed',             -- Appointed by executive
    'merit_selection',       -- Missouri Plan / merit-based
    'retention',             -- Subject to retention elections
    'legislative',           -- Appointed by legislature
    'mixed',                 -- Combination of methods
    'unknown'                -- Method not yet determined
);
```

### `political_party`

```sql
CREATE TYPE political_party AS ENUM (
    'democratic',
    'republican',
    'independent',
    'libertarian',
    'green',
    'constitution',
    'american_independent',  -- Common in California
    'peace_and_freedom',     -- California
    'no_party_preference',   -- Nonpartisan
    'nonpartisan',
    'other',
    'unknown'
);
```

## Helper Functions

### `get_latest_election(judge_uuid UUID)`

Returns the most recent election for a judge.

```sql
SELECT * FROM get_latest_election('uuid-here');
```

Returns: `election_id`, `election_date`, `election_type`, `won`, `vote_percentage`

### `get_current_political_affiliation(judge_uuid UUID)`

Returns the current political party for a judge.

```sql
SELECT get_current_political_affiliation('uuid-here');
```

Returns: `political_party` ENUM value

### `calculate_retention_rate(judge_uuid UUID)`

Calculates the average retention election approval rate.

```sql
SELECT calculate_retention_rate('uuid-here');
```

Returns: DECIMAL percentage (e.g., 67.45)

## Common Query Patterns

### 1. Get All Elections for a Judge

```sql
SELECT
    je.election_date,
    je.election_type,
    je.election_name,
    je.won,
    je.vote_percentage,
    je.term_start_date,
    je.term_end_date
FROM judge_elections je
WHERE je.judge_id = 'uuid-here'
ORDER BY je.election_date DESC;
```

### 2. Get Retention Election Details

```sql
SELECT
    je.election_date,
    je.yes_votes,
    je.no_votes,
    (je.yes_votes::DECIMAL / (je.yes_votes + je.no_votes) * 100) as yes_percentage,
    je.retention_threshold,
    je.won
FROM judge_elections je
WHERE je.judge_id = 'uuid-here'
  AND je.election_type = 'retention'
ORDER BY je.election_date DESC;
```

### 3. Get Competitive Election with Opponents

```sql
SELECT
    je.election_date,
    je.election_name,
    je.vote_count as judge_votes,
    je.vote_percentage as judge_percentage,
    je.won,
    jeo.opponent_name,
    jeo.opponent_party,
    jeo.vote_count as opponent_votes,
    jeo.vote_percentage as opponent_percentage
FROM judge_elections je
LEFT JOIN judge_election_opponents jeo ON je.id = jeo.election_id
WHERE je.judge_id = 'uuid-here'
  AND je.is_contested = true
ORDER BY je.election_date DESC, jeo.vote_percentage DESC;
```

### 4. Get Political Party History

```sql
SELECT
    jpa.political_party,
    jpa.start_date,
    jpa.end_date,
    jpa.is_current,
    jpa.source_name
FROM judge_political_affiliations jpa
WHERE jpa.judge_id = 'uuid-here'
ORDER BY jpa.start_date DESC;
```

### 5. Find Judges with Upcoming Elections

```sql
SELECT
    j.id,
    j.name,
    j.next_election_date,
    j.current_term_end_date,
    j.selection_method
FROM judges j
WHERE j.next_election_date IS NOT NULL
  AND j.next_election_date > CURRENT_DATE
ORDER BY j.next_election_date ASC;
```

### 6. Find Judges by Political Party

```sql
SELECT
    j.id,
    j.name,
    j.current_political_party,
    j.court_name
FROM judges j
WHERE j.current_political_party = 'democratic'
ORDER BY j.name;
```

### 7. Election Win Rate by Judge

```sql
SELECT
    j.id,
    j.name,
    COUNT(je.id) as total_elections,
    SUM(CASE WHEN je.won = true THEN 1 ELSE 0 END) as wins,
    (SUM(CASE WHEN je.won = true THEN 1 ELSE 0 END)::DECIMAL /
     NULLIF(COUNT(je.id), 0) * 100) as win_percentage
FROM judges j
LEFT JOIN judge_elections je ON j.id = je.judge_id
WHERE je.won IS NOT NULL
GROUP BY j.id, j.name
HAVING COUNT(je.id) > 0
ORDER BY win_percentage DESC;
```

## Data Entry Examples

### Example 1: California Retention Election

```sql
-- Insert retention election for California Supreme Court Justice
INSERT INTO judge_elections (
    judge_id,
    election_type,
    election_date,
    election_name,
    jurisdiction,
    won,
    yes_votes,
    no_votes,
    retention_threshold,
    term_start_date,
    term_end_date,
    term_length_years,
    is_incumbent,
    is_contested,
    source_name,
    source_url,
    verified
) VALUES (
    'uuid-of-judge',
    'retention',
    '2022-11-08',
    '2022 General Election',
    'California',
    true,
    4567890,
    2345678,
    50.00,
    '2023-01-02',
    '2035-01-02',
    12,
    true,
    false,
    'California Secretary of State',
    'https://elections.cdn.sos.ca.gov/sov/2022-general/sov/65-ballot-measures-formatted.pdf',
    true
);
```

### Example 2: Competitive Election with Opponents

```sql
-- First, insert the election
WITH new_election AS (
    INSERT INTO judge_elections (
        judge_id,
        election_type,
        election_date,
        election_name,
        jurisdiction,
        won,
        vote_count,
        vote_percentage,
        total_votes_cast,
        term_start_date,
        term_end_date,
        term_length_years,
        is_incumbent,
        is_contested,
        opponent_count,
        source_name
    ) VALUES (
        'uuid-of-judge',
        'competitive',
        '2020-11-03',
        '2020 General Election - Superior Court Judge Office 42',
        'Los Angeles County',
        true,
        125000,
        55.23,
        226400,
        '2021-01-04',
        '2027-01-04',
        6,
        false,
        true,
        2,
        'Los Angeles County Registrar-Recorder'
    ) RETURNING id
)
-- Then insert the opponents
INSERT INTO judge_election_opponents (election_id, opponent_name, opponent_party, vote_count, vote_percentage, occupation)
SELECT id, 'Jane Smith', 'democratic', 85000, 37.54, 'Deputy Public Defender' FROM new_election
UNION ALL
SELECT id, 'Bob Johnson', 'republican', 16400, 7.23, 'Private Attorney' FROM new_election;
```

### Example 3: Political Party Affiliation History

```sql
-- Add historical party affiliations
INSERT INTO judge_political_affiliations (
    judge_id,
    political_party,
    start_date,
    end_date,
    is_current,
    source_name,
    registration_type,
    verified
) VALUES
    -- Historical affiliation
    (
        'uuid-of-judge',
        'republican',
        '2000-01-15',
        '2010-06-30',
        false,
        'Voter Registration Records',
        'Registered Voter',
        true
    ),
    -- Current affiliation
    (
        'uuid-of-judge',
        'democratic',
        '2010-07-01',
        NULL,
        true,
        'Voter Registration Records',
        'Registered Voter',
        true
    );
```

### Example 4: Update Judge Selection Method

```sql
-- Update a judge to reflect they are elected with retention
UPDATE judges
SET
    selection_method = 'mixed',
    is_elected = true,
    current_term_end_date = '2035-01-02',
    next_election_date = '2034-11-05',
    current_political_party = 'nonpartisan'
WHERE id = 'uuid-of-judge';
```

## Row Level Security (RLS)

All election and political affiliation data is considered public record:

- **Read Access**: All users can read election and affiliation data
- **Write Access**: Only users with `role = 'admin'` can insert, update, or delete records

### Policies Applied

1. `Public read access for elections` - SELECT allowed for everyone
2. `Public read access for opponents` - SELECT allowed for everyone
3. `Public read access for political affiliations` - SELECT allowed for everyone
4. `Admin write access` - INSERT/UPDATE/DELETE only for admins

## Data Integrity

### Triggers

1. **Auto-update timestamps**: All tables automatically update `updated_at` on modification
2. **Sync political party**: When a new current affiliation is set, it automatically:
   - Updates `judges.current_political_party`
   - Sets all other affiliations for that judge to `is_current = false`

### Constraints

1. **judge_elections**:
   - Foreign key to judges with CASCADE delete
   - Vote percentages range 0.00 to 100.00

2. **judge_election_opponents**:
   - Foreign key to judge_elections with CASCADE delete
   - Unique constraint on (election_id, opponent_name)

3. **judge_political_affiliations**:
   - Foreign key to judges with CASCADE delete
   - Check constraint ensures `is_current` matches `end_date` NULL status

## Performance Considerations

### Indexed Queries

The following query patterns are optimized with indexes:

1. Finding elections by judge (`judge_id`)
2. Sorting elections by date (`election_date DESC`)
3. Filtering by election type (`election_type`)
4. Filtering by jurisdiction (`jurisdiction`)
5. Finding contested elections (`is_contested = TRUE`)
6. Finding upcoming elections (`next_election_date`)
7. Finding elected judges (`is_elected = TRUE`)
8. Finding current political affiliations (`is_current = TRUE`)

### Denormalization

The `judges.current_political_party` field is denormalized for performance. It is automatically kept in sync via trigger when political affiliations are updated.

## Migration Execution

To apply this migration:

```bash
# Using Supabase CLI
supabase db push

# Or apply directly to database
psql -h your-db-host -U your-user -d your-database -f 20250122_001_add_election_tables.sql
```

### Rollback Considerations

To rollback this migration:

```sql
-- Drop tables (cascades to foreign keys)
DROP TABLE IF EXISTS judge_election_opponents CASCADE;
DROP TABLE IF EXISTS judge_elections CASCADE;
DROP TABLE IF EXISTS judge_political_affiliations CASCADE;

-- Remove columns from judges
ALTER TABLE judges DROP COLUMN IF EXISTS selection_method;
ALTER TABLE judges DROP COLUMN IF EXISTS current_term_end_date;
ALTER TABLE judges DROP COLUMN IF EXISTS next_election_date;
ALTER TABLE judges DROP COLUMN IF EXISTS is_elected;
ALTER TABLE judges DROP COLUMN IF EXISTS current_political_party;

-- Drop ENUM types
DROP TYPE IF EXISTS election_type;
DROP TYPE IF EXISTS selection_method;
DROP TYPE IF EXISTS political_party;

-- Drop functions
DROP FUNCTION IF EXISTS get_latest_election(UUID);
DROP FUNCTION IF EXISTS get_current_political_affiliation(UUID);
DROP FUNCTION IF EXISTS calculate_retention_rate(UUID);
DROP FUNCTION IF EXISTS sync_judge_political_party();
```

## Future Enhancements

Potential improvements to consider:

1. **Campaign Finance**: Link to campaign contribution data
2. **Endorsements**: Track organizational and individual endorsements
3. **Judicial Performance Reviews**: Link to bar association evaluations
4. **Election Predictions**: ML models for election outcomes
5. **Geographic Analysis**: GIS data for district boundaries
6. **Vote-by-District**: Granular voting data by precinct/district
7. **Appointment Details**: For appointed judges, track appointing authority
8. **Confirmation Votes**: For appointed judges requiring confirmation

## Support & Questions

For questions or issues with this schema:

1. Review the example queries in this guide
2. Check the inline SQL comments in the migration file
3. Consult the PostgreSQL documentation for advanced features
4. Contact the database team for schema modifications

---

**Migration Version**: 20250122_001_add_election_tables.sql
**Created**: 2025-01-22
**Status**: Production Ready
