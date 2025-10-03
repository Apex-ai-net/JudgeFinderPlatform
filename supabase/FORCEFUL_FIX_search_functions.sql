-- ========================================
-- FORCEFUL FIX: Search Functions Type Mismatch
-- Purpose: Drop and recreate search_judges_ranked and search_judges_simple
--          with correct VARCHAR(500) return type for profile_image_url
-- Date: 2025-10-01
-- ========================================
--
-- PROBLEM:
-- Function returns TEXT for profile_image_url but table column is VARCHAR(500)
-- Error: "Returned type text does not match expected type character varying in column 7"
--
-- SOLUTION:
-- Forcefully drop ALL versions of the functions (with CASCADE) and recreate
-- with exact type matching: profile_image_url VARCHAR(500)
-- ========================================

-- Step 1: Drop all existing versions of the functions with CASCADE
-- This ensures any dependent objects are also dropped/recreated
DO $$
BEGIN
    -- Drop search_judges_ranked with all possible signatures
    DROP FUNCTION IF EXISTS search_judges_ranked(TEXT, TEXT, INTEGER, REAL) CASCADE;
    DROP FUNCTION IF EXISTS search_judges_ranked(TEXT, TEXT, INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS search_judges_ranked(TEXT, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS search_judges_ranked(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS search_judges_ranked() CASCADE;

    -- Drop search_judges_simple with all possible signatures
    DROP FUNCTION IF EXISTS search_judges_simple(TEXT, TEXT, INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS search_judges_simple(TEXT, TEXT) CASCADE;
    DROP FUNCTION IF EXISTS search_judges_simple(TEXT) CASCADE;
    DROP FUNCTION IF EXISTS search_judges_simple() CASCADE;

    RAISE NOTICE 'Successfully dropped all existing search function versions';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error during drop: %', SQLERRM;
END $$;

-- Step 2: Recreate search_judges_ranked with correct type
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
    profile_image_url VARCHAR(500),  -- EXACT match with judges table column
    -- Search metadata
    rank REAL,
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
    -- Sanitize and prepare query
    clean_query := trim(search_query);

    -- If query is empty, return top judges by case count
    IF clean_query = '' THEN
        RETURN QUERY
        SELECT
            j.id,
            j.name,
            j.slug,
            j.court_name,
            j.jurisdiction,
            j.total_cases,
            j.profile_image_url,
            0::REAL AS rank,
            'default_sort'::TEXT AS search_method,
            ''::TEXT AS headline
        FROM judges j
        WHERE (jurisdiction_filter IS NULL OR j.jurisdiction = jurisdiction_filter)
        ORDER BY j.total_cases DESC NULLS LAST
        LIMIT result_limit;
        RETURN;
    END IF;

    -- Convert search query to tsquery (handle multi-word queries)
    BEGIN
        ts_query := plainto_tsquery('english', unaccent(clean_query));
    EXCEPTION WHEN OTHERS THEN
        -- Fallback for invalid queries
        ts_query := to_tsquery('english', unaccent(clean_query) || ':*');
    END;

    -- Execute ranked search combining full-text and fuzzy matching
    RETURN QUERY
    WITH search_results AS (
        SELECT
            j.id,
            j.name,
            j.slug,
            j.court_name,
            j.jurisdiction,
            j.total_cases,
            j.profile_image_url,
            -- Ranking algorithm: combines full-text rank + similarity + case count
            (
                COALESCE(ts_rank(j.name_search_vector, ts_query), 0) * 10 +
                COALESCE(similarity(j.name, clean_query), 0) * 5 +
                COALESCE(similarity(j.slug, clean_query), 0) * 2 +
                (CASE WHEN j.total_cases > 0 THEN LOG(j.total_cases) * 0.1 ELSE 0 END)
            ) AS relevance_score,
            -- Determine which method found the match
            CASE
                WHEN j.name_search_vector @@ ts_query THEN 'full_text'
                WHEN similarity(j.name, clean_query) > similarity_threshold THEN 'fuzzy_name'
                WHEN similarity(j.slug, clean_query) > similarity_threshold THEN 'fuzzy_slug'
                ELSE 'fallback'
            END AS method,
            -- Highlight matching terms in name
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
        sr.id,
        sr.name,
        sr.slug,
        sr.court_name,
        sr.jurisdiction,
        sr.total_cases,
        sr.profile_image_url,
        sr.relevance_score AS rank,
        sr.method AS search_method,
        sr.highlighted_name AS headline
    FROM search_results sr
    ORDER BY sr.relevance_score DESC
    LIMIT result_limit;
END;
$$;

COMMENT ON FUNCTION search_judges_ranked(TEXT, TEXT, INTEGER, REAL) IS
'Advanced judge search with relevance ranking. Returns profile_image_url as VARCHAR(500) to match judges table column type.';

-- Step 3: Recreate search_judges_simple with correct type
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
    profile_image_url VARCHAR(500)  -- EXACT match with judges table column
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ranked.id,
        ranked.name,
        ranked.slug,
        ranked.court_name,
        ranked.jurisdiction,
        ranked.total_cases,
        ranked.profile_image_url
    FROM search_judges_ranked(
        search_query,
        jurisdiction_filter,
        result_limit,
        0.3
    ) AS ranked;
END;
$$;

COMMENT ON FUNCTION search_judges_simple(TEXT, TEXT, INTEGER) IS
'Simplified search interface with VARCHAR(500) profile_image_url to match database column type.';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify the functions exist and have correct signatures
DO $$
DECLARE
    ranked_exists BOOLEAN;
    simple_exists BOOLEAN;
    ranked_return_type TEXT;
    simple_return_type TEXT;
BEGIN
    -- Check if search_judges_ranked exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'search_judges_ranked'
        AND n.nspname = 'public'
    ) INTO ranked_exists;

    -- Check if search_judges_simple exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'search_judges_simple'
        AND n.nspname = 'public'
    ) INTO simple_exists;

    IF ranked_exists AND simple_exists THEN
        RAISE NOTICE '✓ Both functions recreated successfully';
    ELSE
        RAISE EXCEPTION 'Functions not created properly: ranked=%, simple=%', ranked_exists, simple_exists;
    END IF;
END $$;

-- Display detailed function signatures for verification
SELECT
    p.proname AS function_name,
    pg_get_function_result(p.oid) AS return_type,
    pg_get_function_arguments(p.oid) AS parameters
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('search_judges_ranked', 'search_judges_simple')
AND n.nspname = 'public'
ORDER BY p.proname;

-- Test the functions to ensure they work
SELECT
    'search_judges_ranked test' AS test_name,
    COUNT(*) AS result_count
FROM search_judges_ranked('john', NULL, 5, 0.3);

SELECT
    'search_judges_simple test' AS test_name,
    COUNT(*) AS result_count
FROM search_judges_simple('smith', NULL, 5);

-- Verify column 7 (profile_image_url) type specifically
SELECT
    p.proname AS function_name,
    a.attname AS column_name,
    a.attnum AS column_position,
    format_type(a.atttypid, a.atttypmod) AS data_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
JOIN pg_attribute a ON a.attrelid = p.prorettype
WHERE p.proname IN ('search_judges_ranked', 'search_judges_simple')
AND n.nspname = 'public'
AND a.attnum = 7  -- Column 7 is profile_image_url
ORDER BY p.proname;

-- Final confirmation message
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Both functions have been forcefully recreated with VARCHAR(500) for profile_image_url';
    RAISE NOTICE 'Check the query results above to verify column types match exactly';
    RAISE NOTICE '========================================';
END $$;
