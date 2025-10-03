-- ============================================================================
-- POSTGRESQL TYPE MISMATCH FIX: judges.profile_image_url
-- ============================================================================
-- Issue: Function declares VARCHAR(500) but column is TEXT type
-- This script provides diagnosis and two solution approaches
-- ============================================================================

-- ============================================================================
-- STEP 1: DIAGNOSIS - Check Current Data Type
-- ============================================================================
SELECT
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'judges'
    AND column_name = 'profile_image_url';

-- Expected Result: data_type = 'text', character_maximum_length = NULL
-- Function Expects: data_type = 'character varying', character_maximum_length = 500

-- ============================================================================
-- STEP 2: DATA SAFETY CHECK - Find URLs longer than 500 characters
-- ============================================================================
SELECT
    id,
    name,
    LENGTH(profile_image_url) as url_length,
    profile_image_url
FROM judges
WHERE LENGTH(profile_image_url) > 500
ORDER BY url_length DESC;

-- Expected Result: Should return 0 rows (URLs are typically under 500 chars)
-- If any rows returned, review before applying Solution A

-- ============================================================================
-- STEP 3: COUNT CHECK - Total judges affected
-- ============================================================================
SELECT
    COUNT(*) as total_judges,
    COUNT(profile_image_url) as judges_with_profile_image,
    COUNT(*) - COUNT(profile_image_url) as judges_without_profile_image,
    MAX(LENGTH(profile_image_url)) as max_url_length,
    AVG(LENGTH(profile_image_url))::INTEGER as avg_url_length
FROM judges;

-- ============================================================================
-- SOLUTION A: ALTER TABLE (RECOMMENDED)
-- ============================================================================
-- Pros:
--   ✓ Permanent fix at the database schema level
--   ✓ No casting overhead in queries (better performance)
--   ✓ Consistent with function signatures
--   ✓ Fixes the issue for all future queries
--   ✓ Cleaner, more maintainable solution
--
-- Cons:
--   ✗ Requires exclusive lock on table (brief, but impacts 1,903 rows)
--   ✗ Will truncate any URLs > 500 chars (checked in STEP 2)
--   ✗ More invasive change
--
-- Recommendation: Use this if STEP 2 returns 0 rows
-- ============================================================================

BEGIN;

-- Backup current data type info
DO $$
BEGIN
    RAISE NOTICE 'Starting ALTER TABLE for judges.profile_image_url';
    RAISE NOTICE 'Total judges in table: %', (SELECT COUNT(*) FROM judges);
END $$;

-- Change column type from TEXT to VARCHAR(500)
ALTER TABLE judges
    ALTER COLUMN profile_image_url TYPE VARCHAR(500);

-- Verify the change
SELECT
    'ALTER TABLE completed' as status,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'judges'
    AND column_name = 'profile_image_url';

COMMIT;

-- ============================================================================
-- SOLUTION B: CAST IN FUNCTION (ALTERNATIVE)
-- ============================================================================
-- Pros:
--   ✓ Less invasive (no table structure change)
--   ✓ No table lock required
--   ✓ Can handle URLs > 500 chars (truncates only in function)
--   ✓ Easier to rollback
--
-- Cons:
--   ✗ Must update every function that returns this column
--   ✗ Small performance overhead from casting
--   ✗ Doesn't fix underlying schema inconsistency
--   ✗ Future queries may encounter same issue
--
-- Recommendation: Use only if you cannot modify the table
-- ============================================================================

-- Uncomment the following block to use Solution B instead:

/*
-- Solution B is implemented by modifying the function queries below
-- No table changes needed, just update the function definitions
-- The CAST is added in the SELECT clause: CAST(j.profile_image_url AS VARCHAR(500))
*/

-- ============================================================================
-- STEP 4: RECREATE SEARCH FUNCTIONS WITH PROPER TYPE HANDLING
-- ============================================================================

-- Drop existing functions
DROP FUNCTION IF EXISTS search_judges_basic(TEXT, INT, INT);
DROP FUNCTION IF EXISTS search_judges_advanced(
    TEXT, TEXT, TEXT, TEXT[], TEXT[], INT, INT, INT, INT
);

-- ============================================================================
-- Recreate: search_judges_basic
-- ============================================================================
-- Note: If using Solution A, this function will work as-is
-- If using Solution B, uncomment the CAST version below
-- ============================================================================

CREATE OR REPLACE FUNCTION search_judges_basic(
    search_term TEXT DEFAULT NULL,
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    court_name VARCHAR(500),
    county VARCHAR(100),
    state VARCHAR(2),
    appointment_date DATE,
    profile_image_url VARCHAR(500),  -- Matches column type after Solution A
    slug TEXT,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH filtered_judges AS (
        SELECT
            j.id,
            j.name,
            j.court_name,
            j.county,
            j.state,
            j.appointment_date,
            j.profile_image_url,  -- Solution A: Direct column reference
            -- j.profile_image_url::VARCHAR(500),  -- Solution B: Uncomment for CAST approach
            j.slug,
            COUNT(*) OVER() AS total_count
        FROM judges j
        WHERE
            CASE
                WHEN search_term IS NOT NULL AND search_term != '' THEN
                    (
                        j.name ILIKE '%' || search_term || '%'
                        OR j.court_name ILIKE '%' || search_term || '%'
                        OR j.county ILIKE '%' || search_term || '%'
                    )
                ELSE TRUE
            END
        ORDER BY
            CASE
                WHEN search_term IS NOT NULL AND search_term != '' THEN
                    -- Prioritize exact matches in name
                    CASE
                        WHEN LOWER(j.name) = LOWER(search_term) THEN 1
                        WHEN j.name ILIKE search_term || '%' THEN 2
                        WHEN j.name ILIKE '%' || search_term || '%' THEN 3
                        ELSE 4
                    END
                ELSE 1
            END,
            j.name
        LIMIT limit_count
        OFFSET offset_count
    )
    SELECT * FROM filtered_judges;
END;
$$;

-- ============================================================================
-- Recreate: search_judges_advanced
-- ============================================================================

CREATE OR REPLACE FUNCTION search_judges_advanced(
    search_term TEXT DEFAULT NULL,
    county_filter TEXT DEFAULT NULL,
    court_type_filter TEXT DEFAULT NULL,
    case_types TEXT[] DEFAULT NULL,
    appointment_years TEXT[] DEFAULT NULL,
    min_experience_years INT DEFAULT NULL,
    max_experience_years INT DEFAULT NULL,
    limit_count INT DEFAULT 50,
    offset_count INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    court_name VARCHAR(500),
    county VARCHAR(100),
    state VARCHAR(2),
    appointment_date DATE,
    profile_image_url VARCHAR(500),  -- Matches column type after Solution A
    slug TEXT,
    years_experience INT,
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
    current_year INT := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
    RETURN QUERY
    WITH filtered_judges AS (
        SELECT
            j.id,
            j.name,
            j.court_name,
            j.county,
            j.state,
            j.appointment_date,
            j.profile_image_url,  -- Solution A: Direct column reference
            -- j.profile_image_url::VARCHAR(500),  -- Solution B: Uncomment for CAST approach
            j.slug,
            CASE
                WHEN j.appointment_date IS NOT NULL
                THEN current_year - EXTRACT(YEAR FROM j.appointment_date)::INT
                ELSE NULL
            END AS years_experience,
            COUNT(*) OVER() AS total_count
        FROM judges j
        WHERE
            -- Text search filter
            CASE
                WHEN search_term IS NOT NULL AND search_term != '' THEN
                    (
                        j.name ILIKE '%' || search_term || '%'
                        OR j.court_name ILIKE '%' || search_term || '%'
                        OR j.county ILIKE '%' || search_term || '%'
                    )
                ELSE TRUE
            END
            -- County filter
            AND (county_filter IS NULL OR j.county ILIKE county_filter)
            -- Court type filter
            AND (court_type_filter IS NULL OR j.court_name ILIKE '%' || court_type_filter || '%')
            -- Experience filters
            AND (
                min_experience_years IS NULL
                OR (
                    j.appointment_date IS NOT NULL
                    AND (current_year - EXTRACT(YEAR FROM j.appointment_date)::INT) >= min_experience_years
                )
            )
            AND (
                max_experience_years IS NULL
                OR (
                    j.appointment_date IS NOT NULL
                    AND (current_year - EXTRACT(YEAR FROM j.appointment_date)::INT) <= max_experience_years
                )
            )
            -- Appointment year filter
            AND (
                appointment_years IS NULL
                OR EXTRACT(YEAR FROM j.appointment_date)::TEXT = ANY(appointment_years)
            )
        ORDER BY
            CASE
                WHEN search_term IS NOT NULL AND search_term != '' THEN
                    CASE
                        WHEN LOWER(j.name) = LOWER(search_term) THEN 1
                        WHEN j.name ILIKE search_term || '%' THEN 2
                        WHEN j.name ILIKE '%' || search_term || '%' THEN 3
                        ELSE 4
                    END
                ELSE 1
            END,
            j.name
        LIMIT limit_count
        OFFSET offset_count
    )
    SELECT * FROM filtered_judges;
END;
$$;

-- ============================================================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION search_judges_basic(TEXT, INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_judges_advanced(TEXT, TEXT, TEXT, TEXT[], TEXT[], INT, INT, INT, INT) TO anon, authenticated;

-- ============================================================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================================================

-- Verify column type change (if using Solution A)
SELECT
    'Column Type Verification' as check_type,
    column_name,
    data_type,
    character_maximum_length,
    CASE
        WHEN data_type = 'character varying' AND character_maximum_length = 500
        THEN '✓ CORRECT'
        ELSE '✗ INCORRECT'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'judges'
    AND column_name = 'profile_image_url';

-- Verify functions exist
SELECT
    'Function Existence Check' as check_type,
    routine_name,
    routine_type,
    data_type as return_type,
    '✓ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('search_judges_basic', 'search_judges_advanced')
ORDER BY routine_name;

-- Test basic search function
SELECT
    'Basic Search Test' as test_type,
    COUNT(*) as result_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✓ WORKING'
        ELSE '✗ NO RESULTS'
    END as status
FROM search_judges_basic('smith', 5, 0);

-- Test advanced search function
SELECT
    'Advanced Search Test' as test_type,
    COUNT(*) as result_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✓ WORKING'
        ELSE '✗ NO RESULTS'
    END as status
FROM search_judges_advanced('smith', 'Los Angeles', NULL, NULL, NULL, NULL, NULL, 5, 0);

-- Final summary
SELECT
    '=== FIX SUMMARY ===' as summary,
    (SELECT COUNT(*) FROM judges) as total_judges,
    (SELECT COUNT(*) FROM judges WHERE profile_image_url IS NOT NULL) as judges_with_images,
    (SELECT data_type FROM information_schema.columns
     WHERE table_name = 'judges' AND column_name = 'profile_image_url') as column_type,
    (SELECT character_maximum_length FROM information_schema.columns
     WHERE table_name = 'judges' AND column_name = 'profile_image_url') as column_length,
    CASE
        WHEN (SELECT data_type FROM information_schema.columns
              WHERE table_name = 'judges' AND column_name = 'profile_image_url') = 'character varying'
        THEN '✓ TYPE MISMATCH FIXED'
        ELSE '✗ STILL TEXT TYPE'
    END as fix_status;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
/*
-- If Solution A causes issues, rollback with:
BEGIN;
ALTER TABLE judges ALTER COLUMN profile_image_url TYPE TEXT;
COMMIT;

-- Then recreate functions with Solution B approach (CAST in queries)
*/

-- ============================================================================
-- EXECUTION NOTES
-- ============================================================================
-- 1. This script uses Solution A (ALTER TABLE) by default - RECOMMENDED
-- 2. The ALTER TABLE operation is FAST even with 1,903 rows (< 1 second)
-- 3. Solution A provides a permanent, clean fix with better performance
-- 4. Run STEP 2 first to verify no data will be truncated
-- 5. If STEP 2 shows URLs > 500 chars, consider increasing VARCHAR size
--    or use Solution B instead
-- 6. The functions are recreated regardless of which solution you choose
-- ============================================================================

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TYPE MISMATCH FIX COMPLETED';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Solution Applied: ALTER TABLE (Solution A)';
    RAISE NOTICE 'Column Changed: judges.profile_image_url';
    RAISE NOTICE 'New Type: VARCHAR(500)';
    RAISE NOTICE 'Functions Recreated: 2';
    RAISE NOTICE 'Total Judges Affected: %', (SELECT COUNT(*) FROM judges);
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Run verification queries above to confirm fix';
    RAISE NOTICE '========================================';
END $$;
