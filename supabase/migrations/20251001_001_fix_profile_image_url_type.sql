-- ========================================
-- MIGRATION: Fix profile_image_url Type Mismatch
-- Version: 20251001_001
-- Purpose: Change profile_image_url from varchar(500) to TEXT
-- Date: 2025-10-01
-- ========================================
--
-- PROBLEM:
-- The search_judges_ranked function returns profile_image_url as TEXT
-- but the judges table column is varchar(500), causing type mismatch error:
-- "Returned type character varying(500) does not match expected type text in column 7"
--
-- SOLUTION:
-- ALTER the judges table column from varchar(500) to TEXT type
--
-- IMPACT: LOW - TEXT is more flexible than varchar(500), no data loss
-- ========================================

-- Change profile_image_url from varchar(500) to TEXT
ALTER TABLE judges
ALTER COLUMN profile_image_url TYPE TEXT;

COMMENT ON COLUMN judges.profile_image_url IS
'Profile image URL (TEXT type). Changed from varchar(500) to match function return types.';

-- Update statistics for query planner
ANALYZE judges;
