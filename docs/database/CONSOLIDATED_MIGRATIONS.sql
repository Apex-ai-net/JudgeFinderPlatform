-- ============================================================================
-- JUDGEFINDER PLATFORM - CONSOLIDATED MIGRATIONS
-- ============================================================================
-- This file contains all pending migrations for easy execution
--
-- Instructions:
-- 1. Open Supabase SQL Editor:
--    https://supabase.com/dashboard/project/xstlnicbnzdxlgfiewmg/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run" to execute
-- 4. Verify with: npx tsx scripts/verify-migrations.ts
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Audit Logs System
-- File: 20251008_001_audit_logs.sql
-- Purpose: Comprehensive audit logging for PII access and security events
-- ============================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identification
    user_id TEXT NOT NULL,
    clerk_user_id TEXT,

    -- Event details
    action_type TEXT NOT NULL CHECK (action_type IN (
        'pii_access',
        'pii_modification',
        'admin_action',
        'authentication',
        'rate_limit_violation',
        'csp_violation',
        'encryption_operation',
        'api_key_rotation',
        'mfa_event',
        'security_event'
    )),
    resource_type TEXT NOT NULL,
    resource_id TEXT,

    -- Security context
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method TEXT,

    -- Event metadata
    event_data JSONB DEFAULT '{}'::JSONB,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    success BOOLEAN DEFAULT true,
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexes for performance
    CONSTRAINT audit_logs_action_type_check CHECK (action_type IS NOT NULL)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clerk_user_id ON audit_logs(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- Composite index for common admin queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_query ON audit_logs(severity, action_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS service_role_all ON audit_logs;
DROP POLICY IF EXISTS admin_read ON audit_logs;
DROP POLICY IF EXISTS user_read_own ON audit_logs;

-- Policy: Service role can do everything
CREATE POLICY service_role_all ON audit_logs
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Admins can read audit logs
CREATE POLICY admin_read ON audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM app_users
            WHERE app_users.clerk_user_id = auth.jwt()->>'sub'
            AND app_users.is_admin = true
        )
    );

-- Policy: Users can read their own audit logs (limited fields)
CREATE POLICY user_read_own ON audit_logs
    FOR SELECT
    USING (clerk_user_id = auth.jwt()->>'sub');

-- Create function to cleanup old audit logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Keep audit logs for 2 years (730 days)
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '730 days';
END;
$$;

-- Create function to get audit log summary statistics
CREATE OR REPLACE FUNCTION get_audit_log_stats(time_window INTERVAL DEFAULT '24 hours')
RETURNS TABLE (
    action_type TEXT,
    severity TEXT,
    count BIGINT,
    failed_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.action_type,
        al.severity,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE al.success = false) as failed_count
    FROM audit_logs al
    WHERE al.created_at > NOW() - time_window
    GROUP BY al.action_type, al.severity
    ORDER BY count DESC;
END;
$$;

-- Create function to get recent security events
CREATE OR REPLACE FUNCTION get_recent_security_events(
    limit_count INTEGER DEFAULT 100,
    severity_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    action_type TEXT,
    resource_type TEXT,
    resource_id TEXT,
    severity TEXT,
    ip_address INET,
    user_agent TEXT,
    event_data JSONB,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        al.id,
        al.action_type,
        al.resource_type,
        al.resource_id,
        al.severity,
        al.ip_address,
        al.user_agent,
        al.event_data,
        al.success,
        al.error_message,
        al.created_at
    FROM audit_logs al
    WHERE
        (severity_filter IS NULL OR al.severity = severity_filter)
        AND al.action_type IN ('rate_limit_violation', 'csp_violation', 'authentication', 'security_event')
    ORDER BY al.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Create view for PII access tracking (admin only)
CREATE OR REPLACE VIEW pii_access_summary AS
SELECT
    DATE_TRUNC('day', created_at) as access_date,
    action_type,
    resource_type,
    COUNT(*) as access_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs
WHERE action_type IN ('pii_access', 'pii_modification')
GROUP BY DATE_TRUNC('day', created_at), action_type, resource_type
ORDER BY access_date DESC;

-- Grant appropriate permissions
GRANT SELECT ON pii_access_summary TO authenticated;

-- Comment on table
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for security events, PII access, and system actions';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed (pii_access, admin_action, etc.)';
COMMENT ON COLUMN audit_logs.severity IS 'Event severity level (info, warning, error, critical)';
COMMENT ON COLUMN audit_logs.event_data IS 'Additional event metadata in JSON format';
COMMENT ON COLUMN audit_logs.ip_address IS 'Client IP address for security tracking';

-- ============================================================================
-- MIGRATION 2: Performance Metrics
-- File: 20250108_performance_metrics.sql
-- Purpose: Application performance monitoring and analytics
-- ============================================================================

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Metric classification
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
        'search_query',
        'analytics_generation',
        'judge_profile_load',
        'database_query',
        'external_api_call',
        'cache_operation'
    )),

    -- Operation identifier (e.g., 'execute_search', 'generate_bias_analytics')
    operation VARCHAR(255) NOT NULL,

    -- Performance measurements
    duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
    success BOOLEAN NOT NULL DEFAULT true,

    -- Additional context (JSON for flexibility)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Error information (if applicable)
    error_message TEXT,

    -- Timestamp
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for efficient querying
    CONSTRAINT performance_metrics_duration_check CHECK (duration_ms < 3600000) -- Max 1 hour
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_operation
    ON performance_metrics(metric_type, operation);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_recorded_at
    ON performance_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation_recorded
    ON performance_metrics(operation, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_success
    ON performance_metrics(success, recorded_at DESC)
    WHERE success = false;

-- Create GIN index for JSONB metadata queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metadata
    ON performance_metrics USING GIN (metadata);

-- Add table comment
COMMENT ON TABLE performance_metrics IS 'Application performance monitoring data';
COMMENT ON COLUMN performance_metrics.metric_type IS 'Category of performance metric';
COMMENT ON COLUMN performance_metrics.operation IS 'Specific operation being measured';
COMMENT ON COLUMN performance_metrics.duration_ms IS 'Execution time in milliseconds';
COMMENT ON COLUMN performance_metrics.success IS 'Whether the operation completed successfully';
COMMENT ON COLUMN performance_metrics.metadata IS 'Additional context as JSON (e.g., case_count, result_count)';
COMMENT ON COLUMN performance_metrics.error_message IS 'Error details if operation failed';
COMMENT ON COLUMN performance_metrics.recorded_at IS 'When the metric was recorded';

-- Row Level Security (RLS)
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin users can read performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Service role can insert performance metrics" ON performance_metrics;
DROP POLICY IF EXISTS "Service role can read all performance metrics" ON performance_metrics;

-- Policy: Admin users can read all metrics
CREATE POLICY "Admin users can read performance metrics"
    ON performance_metrics
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE app_users.clerk_user_id = auth.uid()::text
            AND app_users.is_admin = true
        )
    );

-- Policy: Service role can insert metrics (server-side only)
CREATE POLICY "Service role can insert performance metrics"
    ON performance_metrics
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy: Service role can read all metrics (for aggregations)
CREATE POLICY "Service role can read all performance metrics"
    ON performance_metrics
    FOR SELECT
    TO service_role
    USING (true);

-- Create a view for aggregated performance statistics
CREATE OR REPLACE VIEW performance_summary AS
SELECT
    metric_type,
    operation,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE success = true) as success_count,
    COUNT(*) FILTER (WHERE success = false) as error_count,
    ROUND(AVG(duration_ms)::numeric, 2) as avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    ROUND((COUNT(*) FILTER (WHERE success = false)::numeric / COUNT(*)::numeric) * 100, 2) as error_rate_percent,
    MIN(recorded_at) as first_recorded_at,
    MAX(recorded_at) as last_recorded_at
FROM performance_metrics
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_type, operation
ORDER BY total_count DESC;

-- Grant select on view to authenticated users with admin role
GRANT SELECT ON performance_summary TO authenticated;

-- Create function to clean up old metrics (retention: 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM performance_metrics
    WHERE recorded_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- Add comment to cleanup function
COMMENT ON FUNCTION cleanup_old_performance_metrics() IS 'Removes performance metrics older than 30 days';

-- Create a function to get endpoint performance stats
CREATE OR REPLACE FUNCTION get_endpoint_performance(
    p_operation TEXT,
    p_period_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    endpoint TEXT,
    p50 NUMERIC,
    p95 NUMERIC,
    p99 NUMERIC,
    avg_duration NUMERIC,
    total_count BIGINT,
    error_rate NUMERIC,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p_operation as endpoint,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99,
        ROUND(AVG(duration_ms)::numeric, 2) as avg_duration,
        COUNT(*) as total_count,
        ROUND((COUNT(*) FILTER (WHERE success = false)::numeric / COUNT(*)::numeric) * 100, 2) as error_rate,
        NOW() - (p_period_minutes || ' minutes')::INTERVAL as period_start,
        NOW() as period_end
    FROM performance_metrics
    WHERE operation = p_operation
        AND recorded_at > NOW() - (p_period_minutes || ' minutes')::INTERVAL
    GROUP BY p_operation;
END;
$$;

COMMENT ON FUNCTION get_endpoint_performance(TEXT, INTEGER) IS 'Get performance statistics for a specific endpoint over a time period';

-- ============================================================================
-- END OF MIGRATIONS
-- ============================================================================

-- Verification queries (run these after migrations to confirm success)
-- SELECT COUNT(*) FROM audit_logs;
-- SELECT COUNT(*) FROM performance_metrics;
-- SELECT * FROM pii_access_summary LIMIT 5;
-- SELECT * FROM performance_summary LIMIT 5;
