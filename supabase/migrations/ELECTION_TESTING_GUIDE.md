# Election Schema Testing Guide

Quick reference for testing the judicial election and political affiliation database schema.

## Apply the Migration

```bash
# Using Supabase CLI (recommended)
supabase db push

# Or apply directly
psql -h your-db-host -U your-user -d your-database \
  -f supabase/migrations/20250122_001_add_election_tables.sql
```

## Verify Schema Creation

```sql
-- Check that ENUM types were created
SELECT typname FROM pg_type
WHERE typname IN ('election_type', 'selection_method', 'political_party');

-- Check that new columns were added to judges table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'judges'
AND column_name IN ('selection_method', 'current_term_end_date', 'next_election_date', 'is_elected', 'current_political_party');

-- Check that new tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('judge_elections', 'judge_election_opponents', 'judge_political_affiliations');

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('judge_elections', 'judge_election_opponents', 'judge_political_affiliations');
```

## Sample Test Data

### 1. California Supreme Court Retention Election

```sql
-- Step 1: Find or create a judge
INSERT INTO judges (name, court_name, jurisdiction)
VALUES ('Patricia Guerrero', 'California Supreme Court', 'California')
RETURNING id; -- Save this UUID

-- Step 2: Update judge with election data
UPDATE judges
SET
  selection_method = 'mixed',
  is_elected = true,
  current_term_end_date = '2035-01-02',
  next_election_date = '2034-11-05',
  current_political_party = 'nonpartisan'
WHERE name = 'Patricia Guerrero';

-- Step 3: Add retention election
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
  'paste-judge-uuid-here',
  'retention',
  '2022-11-08',
  '2022 General Election',
  'California',
  true,
  5234567,
  2876543,
  50.00,
  '2023-01-02',
  '2035-01-02',
  12,
  false,
  false,
  'California Secretary of State',
  'https://elections.cdn.sos.ca.gov/sov/2022-general/sov/complete-sov.pdf',
  true
);
```

### 2. Competitive Superior Court Election

```sql
-- Step 1: Create judge
INSERT INTO judges (name, court_name, jurisdiction)
VALUES ('Maria Rodriguez', 'Los Angeles Superior Court', 'Los Angeles County')
RETURNING id;

-- Step 2: Update judge fields
UPDATE judges
SET
  selection_method = 'elected',
  is_elected = true,
  current_term_end_date = '2027-01-04',
  current_political_party = 'democratic'
WHERE name = 'Maria Rodriguez';

-- Step 3: Add competitive election
WITH new_election AS (
  INSERT INTO judge_elections (
    judge_id,
    election_type,
    election_date,
    election_name,
    jurisdiction,
    district,
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
    'paste-judge-uuid-here',
    'competitive',
    '2021-06-08',
    '2021 Primary Election - Superior Court Office 42',
    'California',
    'Los Angeles County',
    true,
    85432,
    52.34,
    163234,
    '2021-07-01',
    '2027-07-01',
    6,
    false,
    true,
    2,
    'Los Angeles County Registrar-Recorder'
  ) RETURNING id
)
-- Step 4: Add opponents
INSERT INTO judge_election_opponents (election_id, opponent_name, opponent_party, vote_count, vote_percentage, occupation)
SELECT id, 'John Smith', 'republican', 62345, 38.19, 'Criminal Defense Attorney' FROM new_election
UNION ALL
SELECT id, 'Sarah Johnson', 'independent', 15457, 9.47, 'Public Defender' FROM new_election;
```

### 3. Political Affiliation History

```sql
-- Add historical and current political affiliations
-- First, find the judge
SELECT id FROM judges WHERE name = 'Maria Rodriguez';

-- Add historical affiliation (no longer current)
INSERT INTO judge_political_affiliations (
  judge_id,
  political_party,
  start_date,
  end_date,
  is_current,
  source_name,
  registration_type,
  verified
) VALUES (
  'paste-judge-uuid-here',
  'independent',
  '2005-01-15',
  '2015-06-30',
  false,
  'Voter Registration Records',
  'Registered Voter',
  true
);

-- Add current affiliation
INSERT INTO judge_political_affiliations (
  judge_id,
  political_party,
  start_date,
  end_date,
  is_current,
  source_name,
  registration_type,
  verified
) VALUES (
  'paste-judge-uuid-here',
  'democratic',
  '2015-07-01',
  NULL,
  true,
  'Voter Registration Records',
  'Registered Voter',
  true
);

-- Verify the trigger synced to judges table
SELECT name, current_political_party
FROM judges
WHERE name = 'Maria Rodriguez';
```

## Test Queries

### Query 1: All Elections for a Judge

```sql
SELECT
  je.election_date,
  je.election_type,
  je.election_name,
  je.won,
  je.vote_percentage,
  je.is_contested,
  COUNT(jeo.id) as opponent_count
FROM judge_elections je
LEFT JOIN judge_election_opponents jeo ON je.id = jeo.election_id
WHERE je.judge_id = 'paste-judge-uuid-here'
GROUP BY je.id, je.election_date, je.election_type, je.election_name, je.won, je.vote_percentage, je.is_contested
ORDER BY je.election_date DESC;
```

### Query 2: Retention Election Details

```sql
SELECT
  j.name,
  je.election_date,
  je.yes_votes,
  je.no_votes,
  (je.yes_votes + je.no_votes) as total_votes,
  ROUND((je.yes_votes::DECIMAL / (je.yes_votes + je.no_votes) * 100), 2) as yes_percentage,
  je.retention_threshold,
  je.won
FROM judge_elections je
JOIN judges j ON je.judge_id = j.id
WHERE je.election_type = 'retention'
ORDER BY je.election_date DESC
LIMIT 10;
```

### Query 3: Competitive Elections with Opponents

```sql
SELECT
  j.name as judge_name,
  je.election_date,
  je.election_name,
  je.vote_percentage as judge_percentage,
  jeo.opponent_name,
  jeo.opponent_party,
  jeo.vote_percentage as opponent_percentage
FROM judge_elections je
JOIN judges j ON je.judge_id = j.id
LEFT JOIN judge_election_opponents jeo ON je.id = jeo.election_id
WHERE je.is_contested = true
ORDER BY je.election_date DESC, jeo.vote_percentage DESC
LIMIT 20;
```

### Query 4: Judges with Upcoming Elections

```sql
SELECT
  j.id,
  j.name,
  j.court_name,
  j.next_election_date,
  j.current_term_end_date,
  j.selection_method,
  (j.next_election_date - CURRENT_DATE) as days_until_election
FROM judges j
WHERE j.next_election_date IS NOT NULL
  AND j.next_election_date > CURRENT_DATE
ORDER BY j.next_election_date ASC;
```

### Query 5: Political Party Distribution

```sql
SELECT
  j.current_political_party,
  COUNT(*) as judge_count,
  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM judges j
WHERE j.current_political_party IS NOT NULL
GROUP BY j.current_political_party
ORDER BY judge_count DESC;
```

### Query 6: Party Affiliation Changes

```sql
SELECT
  j.name,
  jpa.political_party,
  jpa.start_date,
  jpa.end_date,
  jpa.is_current,
  CASE
    WHEN jpa.end_date IS NOT NULL
    THEN EXTRACT(YEAR FROM AGE(jpa.end_date::date, jpa.start_date::date))
    ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, jpa.start_date::date))
  END as years_affiliated
FROM judge_political_affiliations jpa
JOIN judges j ON jpa.judge_id = j.id
ORDER BY j.name, jpa.start_date;
```

### Query 7: Election Win Rates

```sql
SELECT
  j.name,
  j.court_name,
  COUNT(je.id) as total_elections,
  SUM(CASE WHEN je.won = true THEN 1 ELSE 0 END) as wins,
  SUM(CASE WHEN je.won = false THEN 1 ELSE 0 END) as losses,
  ROUND(SUM(CASE WHEN je.won = true THEN 1 ELSE 0 END)::DECIMAL /
        NULLIF(COUNT(je.id), 0) * 100, 2) as win_percentage,
  ROUND(AVG(je.vote_percentage), 2) as avg_vote_percentage
FROM judges j
LEFT JOIN judge_elections je ON j.id = je.judge_id
WHERE je.won IS NOT NULL
GROUP BY j.id, j.name, j.court_name
HAVING COUNT(je.id) > 0
ORDER BY win_percentage DESC, total_elections DESC;
```

### Query 8: Test Helper Functions

```sql
-- Get latest election for a judge
SELECT * FROM get_latest_election('paste-judge-uuid-here');

-- Get current political affiliation
SELECT get_current_political_affiliation('paste-judge-uuid-here');

-- Calculate retention rate
SELECT calculate_retention_rate('paste-judge-uuid-here');
```

## Test RLS Policies

```sql
-- Test as anonymous user (should be able to read)
SET ROLE anon;
SELECT * FROM judge_elections LIMIT 1;
SELECT * FROM judge_election_opponents LIMIT 1;
SELECT * FROM judge_political_affiliations LIMIT 1;

-- Try to insert (should fail)
INSERT INTO judge_elections (judge_id, election_type, election_date)
VALUES ('00000000-0000-0000-0000-000000000000', 'retention', '2024-11-05');

-- Reset role
RESET ROLE;
```

## Performance Tests

### Test Index Usage

```sql
-- Should use idx_judge_elections_judge_id
EXPLAIN ANALYZE
SELECT * FROM judge_elections WHERE judge_id = 'paste-judge-uuid-here';

-- Should use idx_judge_elections_election_date
EXPLAIN ANALYZE
SELECT * FROM judge_elections ORDER BY election_date DESC LIMIT 10;

-- Should use idx_judge_elections_type_date
EXPLAIN ANALYZE
SELECT * FROM judge_elections
WHERE election_type = 'retention'
ORDER BY election_date DESC;

-- Should use idx_political_affiliations_judge_current
EXPLAIN ANALYZE
SELECT * FROM judge_political_affiliations
WHERE judge_id = 'paste-judge-uuid-here' AND is_current = true;
```

## Data Integrity Tests

### Test Constraints

```sql
-- Test unique constraint on election opponents
-- This should fail (duplicate opponent in same election)
INSERT INTO judge_election_opponents (election_id, opponent_name)
VALUES ('existing-election-id', 'Same Name');

INSERT INTO judge_election_opponents (election_id, opponent_name)
VALUES ('existing-election-id', 'Same Name');

-- Test check constraint on political affiliations
-- This should fail (is_current=true but end_date is set)
INSERT INTO judge_political_affiliations (
  judge_id, political_party, start_date, end_date, is_current
) VALUES (
  'paste-judge-uuid-here',
  'democratic',
  '2020-01-01',
  '2023-01-01',
  true
);
```

### Test Trigger Functionality

```sql
-- Test political party sync trigger
-- First, check current party
SELECT id, name, current_political_party FROM judges WHERE name = 'Maria Rodriguez';

-- Add a new current affiliation
INSERT INTO judge_political_affiliations (
  judge_id, political_party, start_date, is_current
) VALUES (
  'paste-judge-uuid-here',
  'republican',
  '2024-01-01',
  true
);

-- Verify judges table was updated and old affiliation was set to not current
SELECT name, current_political_party FROM judges WHERE name = 'Maria Rodriguez';

SELECT political_party, is_current FROM judge_political_affiliations
WHERE judge_id = 'paste-judge-uuid-here'
ORDER BY start_date DESC;
```

### Test updated_at Trigger

```sql
-- Check current updated_at
SELECT updated_at FROM judge_elections WHERE id = 'paste-election-id';

-- Wait a moment, then update
SELECT pg_sleep(2);
UPDATE judge_elections SET verified = true WHERE id = 'paste-election-id';

-- Verify updated_at changed
SELECT updated_at FROM judge_elections WHERE id = 'paste-election-id';
```

## Cleanup Test Data

```sql
-- Remove test data (cascade will remove related records)
DELETE FROM judges WHERE name IN ('Patricia Guerrero', 'Maria Rodriguez');

-- Or remove specific elections
DELETE FROM judge_elections WHERE election_name LIKE '%Test%';

-- Remove specific affiliations
DELETE FROM judge_political_affiliations WHERE notes LIKE '%test%';
```

## Common Issues & Solutions

### Issue: Migration fails with "type already exists"

**Solution**: The migration uses `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null` to handle existing types.

### Issue: Trigger not firing

**Solution**: Check that the trigger was created:
```sql
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgname LIKE '%political%' OR tgname LIKE '%updated_at%';
```

### Issue: RLS blocking writes

**Solution**: Ensure you're using a user with admin role:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Issue: Index not being used

**Solution**: Analyze tables and update statistics:
```sql
ANALYZE judge_elections;
ANALYZE judge_election_opponents;
ANALYZE judge_political_affiliations;
```

## Next Steps After Testing

1. Import real election data from state election boards
2. Set up automated data sync from CourtListener
3. Create API endpoints for election data
4. Build UI components for displaying election history
5. Add analytics dashboards for election statistics
6. Implement data validation and verification workflows

---

**For more information, see:**
- Migration file: `supabase/migrations/20250122_001_add_election_tables.sql`
- Schema guide: `supabase/migrations/ELECTION_SCHEMA_GUIDE.md`
- TypeScript types: `types/election-data.ts`
