-- Add political_affiliation column to judges table
-- This stores the political party affiliation data from CourtListener

BEGIN;

-- Add the political_affiliation column
ALTER TABLE judges
ADD COLUMN IF NOT EXISTS political_affiliation VARCHAR(100);

-- Add an index for filtering by political affiliation
CREATE INDEX IF NOT EXISTS idx_judges_political_affiliation
ON judges(political_affiliation)
WHERE political_affiliation IS NOT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN judges.political_affiliation IS 'Political party affiliation from CourtListener (e.g., "Republican Party (2018-present, appointed by Trump)")';

-- Update the search vector to include political affiliation
-- This allows searching for judges by party
DROP TRIGGER IF EXISTS judges_search_vector_update ON judges;

ALTER TABLE judges DROP COLUMN IF EXISTS search_vector CASCADE;
ALTER TABLE judges ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(court_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(education, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(political_affiliation, '')), 'D')
  ) STORED;

-- Recreate the search index
CREATE INDEX IF NOT EXISTS idx_judges_search_vector
ON judges USING GIN (search_vector);

-- Create a view for political affiliation statistics
CREATE OR REPLACE VIEW political_affiliation_stats AS
SELECT
  CASE
    WHEN political_affiliation ILIKE '%democrat%' THEN 'Democratic'
    WHEN political_affiliation ILIKE '%republican%' THEN 'Republican'
    WHEN political_affiliation ILIKE '%independent%' THEN 'Independent'
    WHEN political_affiliation ILIKE '%green%' THEN 'Green'
    WHEN political_affiliation ILIKE '%libertarian%' THEN 'Libertarian'
    WHEN political_affiliation IS NULL OR political_affiliation = '' THEN 'Unknown'
    ELSE 'Other'
  END as party,
  COUNT(*) as judge_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM judges
GROUP BY 1
ORDER BY judge_count DESC;

-- Grant appropriate permissions
GRANT SELECT ON political_affiliation_stats TO authenticated;
GRANT SELECT ON political_affiliation_stats TO anon;
GRANT SELECT ON political_affiliation_stats TO service_role;

COMMIT;

-- Verification query
SELECT
  'Migration completed successfully' as status,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'judges'
  AND column_name = 'political_affiliation';