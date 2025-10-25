-- Migration: Add practice_areas column to app_users table
-- Created: 2025-10-17
-- Purpose: Support Practice Areas dashboard feature
-- Related: /dashboard/practice-areas

-- ============================================================================
-- ADD PRACTICE_AREAS COLUMN
-- ============================================================================

-- Add the practice_areas column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'app_users'
    AND column_name = 'practice_areas'
  ) THEN
    ALTER TABLE public.app_users
    ADD COLUMN practice_areas JSONB DEFAULT '[]'::JSONB NOT NULL;

    RAISE NOTICE 'Added practice_areas column to app_users table';
  ELSE
    RAISE NOTICE 'practice_areas column already exists, skipping';
  END IF;
END $$;

-- ============================================================================
-- ADD COLUMN COMMENT
-- ============================================================================

COMMENT ON COLUMN public.app_users.practice_areas IS
  'User-selected practice areas for customized judicial research experience.
   Array of practice area IDs (e.g., ["criminal", "civil", "family"]).
   Supports filtering judges and courts by user practice area specialization.';

-- ============================================================================
-- CREATE INDEX FOR EFFICIENT JSONB QUERIES
-- ============================================================================

-- GIN index for efficient practice_areas JSONB queries
CREATE INDEX IF NOT EXISTS idx_app_users_practice_areas
ON public.app_users USING GIN (practice_areas);

COMMENT ON INDEX idx_app_users_practice_areas IS
  'GIN index for efficient practice_areas JSONB queries and containment operations';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the column was added successfully
DO $$
DECLARE
  column_exists BOOLEAN;
  index_exists BOOLEAN;
BEGIN
  -- Check column
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'app_users'
    AND column_name = 'practice_areas'
  ) INTO column_exists;

  -- Check index
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'app_users'
    AND indexname = 'idx_app_users_practice_areas'
  ) INTO index_exists;

  IF column_exists AND index_exists THEN
    RAISE NOTICE '✓ SUCCESS: practice_areas column and index created successfully';
  ELSIF column_exists AND NOT index_exists THEN
    RAISE WARNING '⚠ PARTIAL: practice_areas column exists but index missing';
  ELSE
    RAISE EXCEPTION '✗ FAILED: practice_areas column was not added';
  END IF;
END $$;

-- ============================================================================
-- SAMPLE QUERIES (for testing)
-- ============================================================================

-- View current practice_areas data
-- SELECT id, email, practice_areas, created_at
-- FROM public.app_users
-- WHERE practice_areas IS NOT NULL
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Find users by practice area (example)
-- SELECT id, email, practice_areas
-- FROM public.app_users
-- WHERE practice_areas @> '["criminal"]'::jsonb;

-- Count users by practice area selection
-- SELECT
--   CASE
--     WHEN jsonb_array_length(practice_areas) = 0 THEN 'none'
--     WHEN jsonb_array_length(practice_areas) BETWEEN 1 AND 3 THEN '1-3'
--     WHEN jsonb_array_length(practice_areas) BETWEEN 4 AND 6 THEN '4-6'
--     ELSE '7+'
--   END AS practice_area_count_range,
--   COUNT(*) as user_count
-- FROM public.app_users
-- GROUP BY practice_area_count_range
-- ORDER BY practice_area_count_range;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback this migration, uncomment and run:
-- DROP INDEX IF EXISTS public.idx_app_users_practice_areas;
-- ALTER TABLE public.app_users DROP COLUMN IF EXISTS practice_areas;
