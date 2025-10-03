-- ============================================================================
-- FINAL FIX: judges.profile_image_url TYPE MISMATCH
-- ============================================================================
-- Issue: judges.profile_image_url is TEXT but function declares VARCHAR(500)
-- Solution: ALTER TABLE + Recreate search_judges_ranked and search_judges_simple
-- ============================================================================

-- Step 1: Check current state and data safety
SELECT
    'STEP 1: Current column type' as check_step,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'judges' AND column_name = 'profile_image_url';

-- Step 2: Check for URLs longer than 500 chars (should be 0)
SELECT
    'STEP 2: URLs over 500 chars' as check_step,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✓ SAFE TO PROCEED' ELSE '⚠ REVIEW BEFORE PROCEEDING' END as status
FROM judges
WHERE LENGTH(profile_image_url) > 500;

-- Step 3: ALTER TABLE (THE FIX)
BEGIN;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changing judges.profile_image_url from TEXT to VARCHAR(500)';
    RAISE NOTICE 'Total judges: %', (SELECT COUNT(*) FROM judges);
    RAISE NOTICE '========================================';
END $$;

-- Change column type
ALTER TABLE judges
    ALTER COLUMN profile_image_url TYPE VARCHAR(500);

-- Verify the change
SELECT
    'STEP 3: Column altered' as check_step,
    data_type,
    character_maximum_length,
    '✓ SUCCESS' as status
FROM information_schema.columns
WHERE table_name = 'judges' AND column_name = 'profile_image_url';

COMMIT;

-- Step 4: Drop existing search functions with CASCADE
DROP FUNCTION IF EXISTS search_judges_ranked(TEXT, TEXT, INTEGER, REAL) CASCADE;
DROP FUNCTION IF EXISTS search_judges_ranked(TEXT, TEXT, INTEGER, DOUBLE PRECISION) CASCADE;
DROP FUNCTION IF EXISTS search_judges_simple(TEXT, TEXT, INTEGER) CASCADE;

-- Step 5: Recreate search_judges_ranked with correct type
CREATE OR REPLACE FUNCTION search_judges_ranked(
    search_query TEXT,
    jurisdiction_filter TEXT DEFAULT NULL,
    result_limit INTEGER DEFAULT 20,
    similarity_threshold REAL DEFAULT 0.3
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    slug VARCHAR(300),
    court_name VARCHAR(255),
    jurisdiction VARCHAR(100),
    total_cases INTEGER,
    profile_image_url VARCHAR(500),  -- Now matches column type!
    rank DOUBLE PRECISION,  -- Changed from REAL to match calculation output
    search_method TEXT,
    headline TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    ts_query tsquery;
    clean_query TEXT;
BEGIN
    clean_query := trim(search_query);

    IF clean_query = '' THEN
        RETURN QUERY
        SELECT
            j.id, j.name, j.slug, j.court_name, j.jurisdiction, j.total_cases,
            j.profile_image_url,  -- Direct reference now works!
            0::DOUBLE PRECISION AS rank,
            'default_sort'::TEXT AS search_method,
            ''::TEXT AS headline
        FROM judges j
        WHERE (jurisdiction_filter IS NULL OR j.jurisdiction = jurisdiction_filter)
        ORDER BY j.total_cases DESC NULLS LAST
        LIMIT result_limit;
        RETURN;
    END IF;

    BEGIN
        ts_query := plainto_tsquery('english', unaccent(clean_query));
    EXCEPTION WHEN OTHERS THEN
        ts_query := to_tsquery('english', unaccent(clean_query) || ':*');
    END;

    RETURN QUERY
    WITH search_results AS (
        SELECT
            j.id, j.name, j.slug, j.court_name, j.jurisdiction, j.total_cases,
            j.profile_image_url,  -- Direct reference now works!
            (
                COALESCE(ts_rank(j.name_search_vector, ts_query), 0) * 10 +
                COALESCE(similarity(j.name, clean_query), 0) * 5 +
                COALESCE(similarity(j.slug, clean_query), 0) * 2 +
                (CASE WHEN j.total_cases > 0 THEN LOG(j.total_cases) * 0.1 ELSE 0 END)
            ) AS relevance_score,
            CASE
                WHEN j.name_search_vector @@ ts_query THEN 'full_text'
                WHEN similarity(j.name, clean_query) > similarity_threshold THEN 'fuzzy_name'
                WHEN similarity(j.slug, clean_query) > similarity_threshold THEN 'fuzzy_slug'
                ELSE 'fallback'
            END AS method,
            ts_headline('english', j.name, ts_query,
                'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15'
            ) AS highlighted_name
        FROM judges j
        WHERE
            (jurisdiction_filter IS NULL OR j.jurisdiction = jurisdiction_filter)
            AND (
                j.name_search_vector @@ ts_query
                OR similarity(j.name, clean_query) > similarity_threshold
                OR similarity(j.slug, clean_query) > similarity_threshold
            )
    )
    SELECT
        sr.id, sr.name, sr.slug, sr.court_name, sr.jurisdiction, sr.total_cases,
        sr.profile_image_url,
        sr.relevance_score AS rank,
        sr.method AS search_method,
        sr.highlighted_name AS headline
    FROM search_results sr
    ORDER BY sr.relevance_score DESC
    LIMIT result_limit;
END;
$$;

-- Step 6: Recreate search_judges_simple
CREATE OR REPLACE FUNCTION search_judges_simple(
    search_query TEXT,
    jurisdiction_filter TEXT DEFAULT NULL,
    result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    slug VARCHAR(300),
    court_name VARCHAR(255),
    jurisdiction VARCHAR(100),
    total_cases INTEGER,
    profile_image_url VARCHAR(500)  -- Now matches column type!
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ranked.id, ranked.name, ranked.slug, ranked.court_name,
        ranked.jurisdiction, ranked.total_cases, ranked.profile_image_url
    FROM search_judges_ranked(search_query, jurisdiction_filter, result_limit, 0.3) AS ranked;
END;
$$;

-- Step 7: Verification
SELECT '========================================' as separator;
SELECT 'VERIFICATION RESULTS' as title;
SELECT '========================================' as separator;

-- Verify column type
SELECT
    'Column Type' as check,
    data_type || '(' || character_maximum_length || ')' as value,
    '✓' as status
FROM information_schema.columns
WHERE table_name = 'judges' AND column_name = 'profile_image_url';

-- Verify functions exist
SELECT
    'Functions Created' as check,
    COUNT(*)::TEXT || ' functions' as value,
    CASE WHEN COUNT(*) = 2 THEN '✓' ELSE '✗' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('search_judges_ranked', 'search_judges_simple')
AND n.nspname = 'public';

-- Test search_judges_ranked
SELECT
    'search_judges_ranked test' as check,
    COUNT(*)::TEXT || ' results' as value,
    CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '✗' END as status
FROM search_judges_ranked('smith', NULL, 5, 0.3);

-- Test search_judges_simple
SELECT
    'search_judges_simple test' as check,
    COUNT(*)::TEXT || ' results' as value,
    CASE WHEN COUNT(*) > 0 THEN '✓' ELSE '✗' END as status
FROM search_judges_simple('john', NULL, 5);

SELECT '========================================' as separator;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FIX COMPLETED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Column: judges.profile_image_url';
    RAISE NOTICE 'Type: VARCHAR(500)';
    RAISE NOTICE 'Functions: search_judges_ranked, search_judges_simple';
    RAISE NOTICE 'Total judges: %', (SELECT COUNT(*) FROM judges);
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Search functionality should now work!';
    RAISE NOTICE '========================================';
END $$;
