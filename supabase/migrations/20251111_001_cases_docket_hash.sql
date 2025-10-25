-- Add docket_hash column for deduplicating case records across syncs
ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS docket_hash TEXT;

-- Backfill docket_hash for existing rows using normalized case numbers + jurisdiction + judge
DO $$
BEGIN
  -- First, update all cases with their hash
  UPDATE cases
  SET docket_hash = md5(
    coalesce(regexp_replace(upper(case_number), '[^A-Z0-9]', '', 'g'), '') || '|' ||
    coalesce(upper(jurisdiction), '') || '|' ||
    coalesce(judge_id::text, '')
  )
  WHERE case_number IS NOT NULL
    AND docket_hash IS NULL;

  -- Then, for duplicates (same hash), keep only the most recent one and nullify the others
  UPDATE cases c1
  SET docket_hash = NULL
  WHERE docket_hash IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM cases c2
      WHERE c2.docket_hash = c1.docket_hash
        AND c2.id != c1.id
        AND (
          c2.updated_at > c1.updated_at
          OR (c2.updated_at = c1.updated_at AND c2.created_at > c1.created_at)
          OR (c2.updated_at = c1.updated_at AND c2.created_at = c1.created_at AND c2.id > c1.id)
        )
    );

  RAISE NOTICE 'Backfilled docket_hash column';
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_docket_hash_unique
  ON cases (docket_hash)
  WHERE docket_hash IS NOT NULL;

COMMENT ON COLUMN cases.docket_hash IS 'Stable hash of case number + jurisdiction + judge for deduplication.';
