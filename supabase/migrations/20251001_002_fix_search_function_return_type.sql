-- ========================================
-- MIGRATION: Fix search_judges_ranked Return Type
-- Version: 20251001_002
-- Purpose: Change profile_image_url return type from TEXT to VARCHAR(500)
-- Date: 2025-10-01
-- ========================================
--
-- PROBLEM:
-- The judges table has profile_image_url as varchar(500)
-- but search_judges_ranked function returns it as TEXT
-- causing error: "Returned type character varying(500) does not match expected type text in column 7"
--
-- SOLUTION:
-- Update the function to return VARCHAR(500) instead of TEXT
--
-- IMPACT: LOW - This matches the actual database column type
-- ========================================

-- Drop and recreate function with corrected return type
DROP FUNCTION IF EXISTS search_judges_ranked(TEXT, TEXT, INTEGER, REAL);

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
    profile_image_url VARCHAR(500),  -- Changed from TEXT to VARCHAR(500)
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

-- Also update search_judges_simple to match
DROP FUNCTION IF EXISTS search_judges_simple(TEXT, TEXT, INTEGER);

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
    profile_image_url VARCHAR(500)  -- Changed from TEXT to VARCHAR(500)
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
