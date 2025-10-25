-- Migration: Bar Verifications Tracking Table
-- Created: 2025-10-24
-- Description: Tracks all bar number verification requests and admin approvals

-- Create bar_verifications table for audit trail and admin workflow
CREATE TABLE IF NOT EXISTS bar_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES app_users(clerk_user_id) ON DELETE CASCADE,
    bar_number TEXT NOT NULL,
    bar_state TEXT NOT NULL DEFAULT 'CA',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),

    -- Verification timestamps
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,

    -- Admin approval
    verified_by TEXT REFERENCES app_users(clerk_user_id) ON DELETE SET NULL,
    admin_notes TEXT,

    -- API response data (if automated verification was used)
    api_response JSONB,
    api_checked_at TIMESTAMPTZ,

    -- Audit trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bar_verifications_user_id
    ON bar_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_bar_verifications_status
    ON bar_verifications(status)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bar_verifications_bar_number
    ON bar_verifications(bar_number, bar_state);

CREATE INDEX IF NOT EXISTS idx_bar_verifications_verified_by
    ON bar_verifications(verified_by)
    WHERE verified_by IS NOT NULL;

-- Add unique constraint to prevent duplicate submissions
CREATE UNIQUE INDEX IF NOT EXISTS idx_bar_verifications_unique_pending
    ON bar_verifications(user_id, bar_number, bar_state)
    WHERE status = 'pending';

-- Auto-update updated_at timestamp
CREATE TRIGGER update_bar_verifications_updated_at
    BEFORE UPDATE ON bar_verifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE bar_verifications IS 'Tracks attorney bar number verification requests and admin approvals';
COMMENT ON COLUMN bar_verifications.status IS 'Verification status: pending (awaiting admin review), verified (approved), rejected (denied)';
COMMENT ON COLUMN bar_verifications.verified_by IS 'Admin user who approved/rejected the verification';
COMMENT ON COLUMN bar_verifications.admin_notes IS 'Admin notes about verification decision';
COMMENT ON COLUMN bar_verifications.api_response IS 'Raw response from State Bar API if automated verification was attempted';

-- Enable Row Level Security
ALTER TABLE bar_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own verification requests
CREATE POLICY bar_verifications_user_select
    ON bar_verifications
    FOR SELECT
    USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can insert their own verification requests
CREATE POLICY bar_verifications_user_insert
    ON bar_verifications
    FOR INSERT
    WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Only admins can update verification status
CREATE POLICY bar_verifications_admin_update
    ON bar_verifications
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM app_users
            WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND is_admin = true
        )
    );

-- Admins can view all verification requests
CREATE POLICY bar_verifications_admin_select
    ON bar_verifications
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM app_users
            WHERE clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND is_admin = true
        )
    );

-- Service role has full access
CREATE POLICY bar_verifications_service_role
    ON bar_verifications
    FOR ALL
    USING (current_user = 'service_role');
