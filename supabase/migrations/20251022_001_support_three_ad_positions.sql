-- ========================================
-- MIGRATION: Support 3 Ad Positions Per Judge
-- Version: 20251022_001
-- Purpose: Update database constraints to support positions 1, 2, AND 3 for judge ads
-- Author: JudgeFinder Platform Team
-- Date: 2025-10-22
-- Business Rationale: Expand from 2 to 3 ad slots per judge profile to increase inventory
-- ========================================

BEGIN;

-- =============================================================================
-- STEP 1: Update ad_spot_bookings table constraint (if exists)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_spot_bookings') THEN
    ALTER TABLE ad_spot_bookings DROP CONSTRAINT IF EXISTS ad_spot_bookings_position_check;
    ALTER TABLE ad_spot_bookings ADD CONSTRAINT ad_spot_bookings_position_check CHECK (position IN (1, 2, 3));
    EXECUTE 'COMMENT ON CONSTRAINT ad_spot_bookings_position_check ON ad_spot_bookings IS ''Allows positions 1, 2, and 3 for ad slot bookings''';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Update judge_ad_products table constraint (if exists)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'judge_ad_products') THEN
    ALTER TABLE judge_ad_products DROP CONSTRAINT IF EXISTS judge_ad_products_position_check;
    ALTER TABLE judge_ad_products ADD CONSTRAINT judge_ad_products_position_check CHECK (position IN (1, 2, 3));
    EXECUTE 'COMMENT ON CONSTRAINT judge_ad_products_position_check ON judge_ad_products IS ''Allows positions 1, 2, and 3 for judge ad products''';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Update pending_checkouts table constraint (CONDITIONAL)
-- =============================================================================
-- Note: This table may not exist in all environments
-- Using conditional logic to avoid migration failure

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'pending_checkouts'
  ) THEN
    ALTER TABLE pending_checkouts DROP CONSTRAINT IF EXISTS pending_checkouts_ad_position_check;
    ALTER TABLE pending_checkouts ADD CONSTRAINT pending_checkouts_ad_position_check
      CHECK (ad_position IN (1, 2, 3));
    COMMENT ON CONSTRAINT pending_checkouts_ad_position_check ON pending_checkouts IS
      'Allows ad positions 1, 2, and 3 for pending checkouts';
    RAISE NOTICE 'Updated pending_checkouts constraint to support position 3';
  ELSE
    RAISE NOTICE 'SKIPPED: pending_checkouts table does not exist in this database';
  END IF;
END $$;

-- =============================================================================
-- STEP 4: Update ad_spots table constraint
-- =============================================================================
-- Current constraint forces judges to have position <= 2
-- New constraint allows judges to have positions 1, 2, and 3

ALTER TABLE ad_spots
  DROP CONSTRAINT IF EXISTS ad_spots_position_check;

ALTER TABLE ad_spots
  ADD CONSTRAINT ad_spots_position_check
    CHECK (
      position BETWEEN 1 AND 3
      -- Removed the restriction: AND (entity_type <> 'judge' OR position <= 2)
    );

COMMENT ON CONSTRAINT ad_spots_position_check ON ad_spots IS
  'Allows positions 1-3 for all entity types (judges and courts)';

-- =============================================================================
-- STEP 5: Re-enable position 3 ad spots for judges (reverse maintenance status)
-- =============================================================================
-- Migration 20251018_001 set judge position 3 slots to 'maintenance'
-- Now we need to set them back to 'available' to allow bookings

UPDATE ad_spots
SET status = 'available'
WHERE entity_type = 'judge'
  AND position = 3
  AND status = 'maintenance'
  AND current_advertiser_id IS NULL;

-- =============================================================================
-- STEP 6: Verify position 3 slots exist for all judges
-- =============================================================================
-- Ensure every judge has position 1, 2, AND 3 ad spots created

INSERT INTO ad_spots (entity_type, entity_id, position, base_price_monthly, status, court_level)
SELECT
  'judge' AS entity_type,
  j.id AS entity_id,
  3 AS position,
  500.00 AS base_price_monthly, -- Universal $500/month pricing
  'available' AS status,
  j.court_level
FROM judges j
WHERE NOT EXISTS (
  SELECT 1
  FROM ad_spots ads
  WHERE ads.entity_type = 'judge'
    AND ads.entity_id = j.id
    AND ads.position = 3
)
ON CONFLICT (entity_type, entity_id, position) DO NOTHING;

-- =============================================================================
-- STEP 7: Update documentation comments (only if tables exist)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_spot_bookings') THEN
    EXECUTE 'COMMENT ON COLUMN ad_spot_bookings.position IS ''Ad rotation slot number (1, 2, or 3). Judges now support 3 positions.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'judge_ad_products') THEN
    EXECUTE 'COMMENT ON COLUMN judge_ad_products.position IS ''Rotation slot number (1, 2, or 3) for this ad spot''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_spots') THEN
    EXECUTE 'COMMENT ON COLUMN ad_spots.position IS ''Position number (1-3) for the ad slot. All entity types support 3 positions.''';
  END IF;
END $$;

-- =============================================================================
-- STEP 8: Verification Checks
-- =============================================================================

DO $$
DECLARE
  judges_without_position_3 INTEGER;
  total_judges INTEGER;
  position_3_available INTEGER;
BEGIN
  -- Count judges without position 3 ad spots
  SELECT COUNT(DISTINCT j.id) INTO judges_without_position_3
  FROM judges j
  WHERE NOT EXISTS (
    SELECT 1 FROM ad_spots ads
    WHERE ads.entity_type = 'judge'
      AND ads.entity_id = j.id
      AND ads.position = 3
  );

  -- Count total judges
  SELECT COUNT(*) INTO total_judges FROM judges;

  -- Count position 3 spots that are available
  SELECT COUNT(*) INTO position_3_available
  FROM ad_spots
  WHERE entity_type = 'judge'
    AND position = 3
    AND status = 'available';

  -- Log verification results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Verification Results:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total judges: %', total_judges;
  RAISE NOTICE 'Judges missing position 3 ad spots: %', judges_without_position_3;
  RAISE NOTICE 'Position 3 ad spots with status=available: %', position_3_available;
  RAISE NOTICE '========================================';

  -- Fail if any judges are missing position 3
  IF judges_without_position_3 > 0 THEN
    RAISE WARNING 'WARNING: % judges are still missing position 3 ad spots', judges_without_position_3;
  ELSE
    RAISE NOTICE 'SUCCESS: All judges have position 1, 2, and 3 ad spots';
  END IF;

  -- Verify constraints were updated (only if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_spot_bookings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'ad_spot_bookings_position_check'
        AND pg_get_constraintdef(oid) LIKE '%1, 2, 3%'
    ) THEN
      RAISE NOTICE 'WARNING: Constraint ad_spot_bookings_position_check may not be updated correctly';
    END IF;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 20251022_001 completed successfully';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =============================================================================
-- POST-MIGRATION NOTES
-- =============================================================================
--
-- What Changed:
-- 1. ad_spot_bookings: position constraint updated from (1,2) to (1,2,3)
-- 2. judge_ad_products: position constraint updated from (1,2) to (1,2,3)
-- 3. pending_checkouts: ad_position constraint updated from (1,2) to (1,2,3)
-- 4. ad_spots: Removed judge-specific position restriction
-- 5. ad_spots: Re-enabled position 3 slots (changed from 'maintenance' to 'available')
-- 6. ad_spots: Created missing position 3 slots for all judges
--
-- Verification Steps (run in Supabase SQL Editor):
--
-- 1. Check all judges have 3 ad spots:
--    SELECT entity_id, COUNT(*) as slot_count
--    FROM ad_spots
--    WHERE entity_type = 'judge'
--    GROUP BY entity_id
--    HAVING COUNT(*) != 3;
--    -- Should return 0 rows
--
-- 2. Check position 3 availability:
--    SELECT COUNT(*) FROM ad_spots
--    WHERE entity_type = 'judge' AND position = 3 AND status = 'available';
--    -- Should match total judge count
--
-- 3. Verify constraints allow position 3:
--    SELECT conname, pg_get_constraintdef(oid) as definition
--    FROM pg_constraint
--    WHERE conname LIKE '%position%'
--      AND conrelid IN (
--        'ad_spot_bookings'::regclass,
--        'judge_ad_products'::regclass,
--        'ad_spots'::regclass
--      );
--    -- All should allow values 1, 2, 3
--
-- =============================================================================
