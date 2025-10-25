-- ========================================
-- MIGRATION: Create Missing Ad Positions 1 and 2 for Judges
-- Version: 20251022_002
-- Purpose: Add missing position 1 and 2 ad_spots for all judges
-- Author: JudgeFinder Platform Team
-- Date: 2025-10-22
-- Context: Previous migration only created position 3; positions 1 and 2 are missing
-- ========================================

BEGIN;

-- =============================================================================
-- STEP 1: Create position 1 ad_spots for all judges
-- =============================================================================

INSERT INTO ad_spots (entity_type, entity_id, position, base_price_monthly, status, court_level)
SELECT
  'judge' AS entity_type,
  j.id AS entity_id,
  1 AS position,
  500.00 AS base_price_monthly, -- Universal $500/month pricing
  'available' AS status,
  j.court_level
FROM judges j
WHERE NOT EXISTS (
  SELECT 1
  FROM ad_spots ads
  WHERE ads.entity_type = 'judge'
    AND ads.entity_id = j.id
    AND ads.position = 1
)
ON CONFLICT (entity_type, entity_id, position) DO NOTHING;

-- =============================================================================
-- STEP 2: Create position 2 ad_spots for all judges
-- =============================================================================

INSERT INTO ad_spots (entity_type, entity_id, position, base_price_monthly, status, court_level)
SELECT
  'judge' AS entity_type,
  j.id AS entity_id,
  2 AS position,
  500.00 AS base_price_monthly, -- Universal $500/month pricing
  'available' AS status,
  j.court_level
FROM judges j
WHERE NOT EXISTS (
  SELECT 1
  FROM ad_spots ads
  WHERE ads.entity_type = 'judge'
    AND ads.entity_id = j.id
    AND ads.position = 2
)
ON CONFLICT (entity_type, entity_id, position) DO NOTHING;

-- =============================================================================
-- STEP 3: Verification Checks
-- =============================================================================

DO $$
DECLARE
  total_judges INTEGER;
  position_1_count INTEGER;
  position_2_count INTEGER;
  position_3_count INTEGER;
  total_ad_spots INTEGER;
  expected_total INTEGER;
BEGIN
  -- Count total judges
  SELECT COUNT(*) INTO total_judges FROM judges;

  -- Count ad_spots by position
  SELECT COUNT(*) INTO position_1_count
  FROM ad_spots
  WHERE entity_type = 'judge' AND position = 1;

  SELECT COUNT(*) INTO position_2_count
  FROM ad_spots
  WHERE entity_type = 'judge' AND position = 2;

  SELECT COUNT(*) INTO position_3_count
  FROM ad_spots
  WHERE entity_type = 'judge' AND position = 3;

  -- Count total ad_spots
  SELECT COUNT(*) INTO total_ad_spots
  FROM ad_spots
  WHERE entity_type = 'judge';

  -- Expected total
  expected_total := total_judges * 3;

  -- Log results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 20251022_002 Verification';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total judges: %', total_judges;
  RAISE NOTICE 'Position 1 ad_spots: %', position_1_count;
  RAISE NOTICE 'Position 2 ad_spots: %', position_2_count;
  RAISE NOTICE 'Position 3 ad_spots: %', position_3_count;
  RAISE NOTICE 'Total ad_spots: %', total_ad_spots;
  RAISE NOTICE 'Expected total: %', expected_total;
  RAISE NOTICE '========================================';

  -- Verify counts match
  IF position_1_count != total_judges THEN
    RAISE WARNING 'Position 1 count (%) does not match judge count (%)', position_1_count, total_judges;
  END IF;

  IF position_2_count != total_judges THEN
    RAISE WARNING 'Position 2 count (%) does not match judge count (%)', position_2_count, total_judges;
  END IF;

  IF position_3_count != total_judges THEN
    RAISE WARNING 'Position 3 count (%) does not match judge count (%)', position_3_count, total_judges;
  END IF;

  IF total_ad_spots = expected_total THEN
    RAISE NOTICE 'SUCCESS: All judges have exactly 3 ad_spots (positions 1, 2, 3)';
  ELSE
    RAISE WARNING 'MISMATCH: Expected % ad_spots but found %', expected_total, total_ad_spots;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 20251022_002 completed';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION NOTES
-- =============================================================================
--
-- What This Migration Does:
-- 1. Creates position 1 ad_spots for all judges (1903 expected)
-- 2. Creates position 2 ad_spots for all judges (1903 expected)
-- 3. Verifies all judges now have exactly 3 ad_spots (1, 2, and 3)
--
-- Expected Result:
-- - Before: 1903 ad_spots (only position 3)
-- - After: 5709 ad_spots (1903 judges × 3 positions)
--
-- Verification Query:
--   SELECT position, COUNT(*) as count
--   FROM ad_spots
--   WHERE entity_type = 'judge'
--   GROUP BY position
--   ORDER BY position;
--   -- Should return:
--   -- position | count
--   -- ---------+-------
--   --     1    | 1903
--   --     2    | 1903
--   --     3    | 1903
--
-- =============================================================================
