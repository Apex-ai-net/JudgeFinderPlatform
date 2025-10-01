-- Migration: Data Quality Validation Functions
-- Version: 20250930_004
-- Description: SQL helper functions for data quality validation system

-- Table for storing validation results
CREATE TABLE IF NOT EXISTS sync_validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validation_id TEXT NOT NULL UNIQUE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_ms INTEGER NOT NULL,
    total_issues INTEGER NOT NULL DEFAULT 0,
    critical_issues INTEGER NOT NULL DEFAULT 0,
    high_priority_issues INTEGER NOT NULL DEFAULT 0,
    medium_priority_issues INTEGER NOT NULL DEFAULT 0,
    low_priority_issues INTEGER NOT NULL DEFAULT 0,
    issues_by_type JSONB DEFAULT '{}'::jsonb,
    issues_by_entity JSONB DEFAULT '{}'::jsonb,
    summary TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    issues JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_validation_results_completed_at 
    ON sync_validation_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_validation_results_total_issues 
    ON sync_validation_results(total_issues);

-- ============================================================================
-- ORPHANED RECORDS DETECTION
-- ============================================================================

-- Find cases that reference non-existent judges
CREATE OR REPLACE FUNCTION find_orphaned_cases()
RETURNS TABLE(
    id UUID,
    judge_id UUID,
    case_name TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.judge_id,
        c.case_name
    FROM cases c
    LEFT JOIN judges j ON c.judge_id = j.id
    WHERE c.judge_id IS NOT NULL
      AND j.id IS NULL
    LIMIT 100;
END;
$$;

-- Find court assignments that reference non-existent judges or courts
CREATE OR REPLACE FUNCTION find_orphaned_assignments()
RETURNS TABLE(
    id UUID,
    invalid_ref_type TEXT,
    invalid_ref_id UUID
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check for invalid judge references
    RETURN QUERY
    SELECT 
        jca.id,
        'judge'::TEXT as invalid_ref_type,
        jca.judge_id as invalid_ref_id
    FROM judge_court_assignments jca
    LEFT JOIN judges j ON jca.judge_id = j.id
    WHERE j.id IS NULL
    LIMIT 50;
    
    -- Check for invalid court references
    RETURN QUERY
    SELECT 
        jca.id,
        'court'::TEXT as invalid_ref_type,
        jca.court_id as invalid_ref_id
    FROM judge_court_assignments jca
    LEFT JOIN courts c ON jca.court_id = c.id
    WHERE c.id IS NULL
    LIMIT 50;
END;
$$;

-- ============================================================================
-- DUPLICATE DETECTION
-- ============================================================================

-- Find duplicate CourtListener IDs
CREATE OR REPLACE FUNCTION find_duplicate_courtlistener_ids(
    entity_type TEXT
)
RETURNS TABLE(
    courtlistener_id TEXT,
    count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    IF entity_type = 'judge' THEN
        RETURN QUERY
        SELECT 
            j.courtlistener_id::TEXT,
            COUNT(*)::BIGINT as count
        FROM judges j
        WHERE j.courtlistener_id IS NOT NULL
        GROUP BY j.courtlistener_id
        HAVING COUNT(*) > 1
        LIMIT 50;
    ELSIF entity_type = 'court' THEN
        RETURN QUERY
        SELECT 
            c.courtlistener_id::TEXT,
            COUNT(*)::BIGINT as count
        FROM courts c
        WHERE c.courtlistener_id IS NOT NULL
        GROUP BY c.courtlistener_id
        HAVING COUNT(*) > 1
        LIMIT 50;
    END IF;
END;
$$;

-- ============================================================================
-- STALE DATA DETECTION
-- ============================================================================

-- Find judges that haven't been synced recently
CREATE OR REPLACE FUNCTION find_stale_judges(
    days_threshold INTEGER DEFAULT 180
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    courtlistener_id TEXT,
    days_since_sync INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.name,
        j.courtlistener_id::TEXT,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - j.updated_at))::INTEGER as days_since_sync
    FROM judges j
    WHERE j.courtlistener_id IS NOT NULL
      AND j.updated_at < (CURRENT_TIMESTAMP - (days_threshold || ' days')::INTERVAL)
    ORDER BY j.updated_at ASC
    LIMIT 100;
END;
$$;

-- Find judges that need case data backfill
CREATE OR REPLACE FUNCTION find_judges_needing_backfill()
RETURNS TABLE(
    id UUID,
    name TEXT,
    total_cases INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.name,
        COALESCE(j.total_cases, 0) as total_cases
    FROM judges j
    WHERE j.courtlistener_id IS NOT NULL
      AND (j.total_cases IS NULL OR j.total_cases = 0)
    ORDER BY j.updated_at ASC
    LIMIT 100;
END;
$$;

-- ============================================================================
-- RELATIONSHIP INTEGRITY
-- ============================================================================

-- Find inconsistent relationships between entities
CREATE OR REPLACE FUNCTION find_inconsistent_relationships()
RETURNS TABLE(
    entity TEXT,
    entity_id UUID,
    severity TEXT,
    message TEXT,
    suggested_action TEXT,
    auto_fixable BOOLEAN,
    metadata JSONB
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check for judges with court_id that doesn't match any assignment
    RETURN QUERY
    SELECT 
        'judge'::TEXT as entity,
        j.id as entity_id,
        'medium'::TEXT as severity,
        'Judge has court_id that does not match any court assignment'::TEXT as message,
        'Update judge.court_id or create matching assignment'::TEXT as suggested_action,
        false as auto_fixable,
        jsonb_build_object(
            'judge_name', j.name,
            'court_id', j.court_id
        ) as metadata
    FROM judges j
    WHERE j.court_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 
          FROM judge_court_assignments jca 
          WHERE jca.judge_id = j.id 
            AND jca.court_id = j.court_id
      )
    LIMIT 50;
END;
$$;

-- ============================================================================
-- DATA INTEGRITY VALIDATION
-- ============================================================================

-- Validate judge case counts match actual case counts
CREATE OR REPLACE FUNCTION validate_judge_case_counts()
RETURNS TABLE(
    judge_id UUID,
    judge_name TEXT,
    stored_count INTEGER,
    actual_count BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id as judge_id,
        j.name as judge_name,
        COALESCE(j.total_cases, 0) as stored_count,
        COUNT(c.id) as actual_count
    FROM judges j
    LEFT JOIN cases c ON c.judge_id = j.id
    GROUP BY j.id, j.name, j.total_cases
    HAVING COALESCE(j.total_cases, 0) != COUNT(c.id)
       AND ABS(COALESCE(j.total_cases, 0) - COUNT(c.id)) > 5
    LIMIT 100;
END;
$$;

-- Recalculate and update judge case count
CREATE OR REPLACE FUNCTION recalculate_judge_case_count(
    judge_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    new_count INTEGER;
BEGIN
    -- Count cases for this judge
    SELECT COUNT(*)::INTEGER INTO new_count
    FROM cases c
    WHERE c.judge_id = recalculate_judge_case_count.judge_id;
    
    -- Update the judge record
    UPDATE judges
    SET total_cases = new_count,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = recalculate_judge_case_count.judge_id;
    
    RETURN new_count;
END;
$$;

-- ============================================================================
-- BATCH OPERATIONS FOR VALIDATION
-- ============================================================================

-- Get validation statistics
CREATE OR REPLACE FUNCTION get_validation_stats()
RETURNS TABLE(
    entity_type TEXT,
    total_records BIGINT,
    records_with_courtlistener_id BIGINT,
    records_missing_name BIGINT,
    stale_records BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Judges stats
    RETURN QUERY
    SELECT 
        'judge'::TEXT as entity_type,
        COUNT(*)::BIGINT as total_records,
        COUNT(courtlistener_id)::BIGINT as records_with_courtlistener_id,
        COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END)::BIGINT as records_missing_name,
        COUNT(CASE WHEN updated_at < (CURRENT_TIMESTAMP - INTERVAL '180 days') THEN 1 END)::BIGINT as stale_records
    FROM judges;
    
    -- Courts stats
    RETURN QUERY
    SELECT 
        'court'::TEXT as entity_type,
        COUNT(*)::BIGINT as total_records,
        COUNT(courtlistener_id)::BIGINT as records_with_courtlistener_id,
        COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END)::BIGINT as records_missing_name,
        COUNT(CASE WHEN updated_at < (CURRENT_TIMESTAMP - INTERVAL '365 days') THEN 1 END)::BIGINT as stale_records
    FROM courts;
    
    -- Cases stats
    RETURN QUERY
    SELECT 
        'case'::TEXT as entity_type,
        COUNT(*)::BIGINT as total_records,
        0::BIGINT as records_with_courtlistener_id,
        COUNT(CASE WHEN case_name IS NULL OR case_name = '' THEN 1 END)::BIGINT as records_missing_name,
        COUNT(CASE WHEN updated_at < (CURRENT_TIMESTAMP - INTERVAL '730 days') THEN 1 END)::BIGINT as stale_records
    FROM cases;
END;
$$;

-- ============================================================================
-- CLEANUP OPERATIONS
-- ============================================================================

-- Clean up orphaned cases by setting judge_id to NULL
CREATE OR REPLACE FUNCTION cleanup_orphaned_cases()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE cases c
    SET judge_id = NULL
    WHERE judge_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM judges j WHERE j.id = c.judge_id
      );
      
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Clean up orphaned court assignments
CREATE OR REPLACE FUNCTION cleanup_orphaned_assignments()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM judge_court_assignments jca
    WHERE NOT EXISTS (
        SELECT 1 FROM judges j WHERE j.id = jca.judge_id
    )
    OR NOT EXISTS (
        SELECT 1 FROM courts c WHERE c.id = jca.court_id
    );
      
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE sync_validation_results IS 'Stores results of data quality validation runs';
COMMENT ON FUNCTION find_orphaned_cases() IS 'Finds cases that reference non-existent judges';
COMMENT ON FUNCTION find_orphaned_assignments() IS 'Finds court assignments with invalid references';
COMMENT ON FUNCTION find_duplicate_courtlistener_ids(TEXT) IS 'Finds duplicate CourtListener IDs for judges or courts';
COMMENT ON FUNCTION find_stale_judges(INTEGER) IS 'Finds judges that have not been synced recently';
COMMENT ON FUNCTION find_judges_needing_backfill() IS 'Finds judges that need case data backfilled';
COMMENT ON FUNCTION find_inconsistent_relationships() IS 'Finds relationship inconsistencies between entities';
COMMENT ON FUNCTION validate_judge_case_counts() IS 'Validates that judge total_cases matches actual case count';
COMMENT ON FUNCTION recalculate_judge_case_count(UUID) IS 'Recalculates and updates judge case count';
COMMENT ON FUNCTION get_validation_stats() IS 'Returns validation statistics for all entity types';
COMMENT ON FUNCTION cleanup_orphaned_cases() IS 'Cleans up cases with invalid judge references';
COMMENT ON FUNCTION cleanup_orphaned_assignments() IS 'Cleans up court assignments with invalid references';
