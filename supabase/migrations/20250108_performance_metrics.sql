-- Performance Metrics Table
-- Stores application performance data for monitoring and analytics

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

-- Create a partial index for recent metrics (last 7 days)
CREATE INDEX IF NOT EXISTS idx_performance_metrics_recent
    ON performance_metrics(metric_type, operation, recorded_at DESC)
    WHERE recorded_at > NOW() - INTERVAL '7 days';

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
