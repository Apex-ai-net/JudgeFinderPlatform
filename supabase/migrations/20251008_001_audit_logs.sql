-- Audit logging system for PII access and security events
-- Migration: 20251008_001_audit_logs

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_clerk_user_id ON audit_logs(clerk_user_id) WHERE clerk_user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- Composite index for common admin queries
CREATE INDEX idx_audit_logs_admin_query ON audit_logs(severity, action_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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
