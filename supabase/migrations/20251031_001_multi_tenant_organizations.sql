-- =====================================================
-- Multi-Tenant Organization/Workspace Management System
-- =====================================================
-- This migration creates a comprehensive organization system with:
-- - Organizations (workspaces/tenants)
-- - Organization members (users in organizations with roles)
-- - Organization invitations (invite flow)
-- - RLS policies for secure multi-tenant access
-- - Migration from existing advertiser_profiles to organizations
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE
-- =====================================================
-- Main tenant entity representing law firms, organizations, or workspaces
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Organization Identity
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id TEXT NOT NULL, -- Clerk user ID from app_users

    -- Organization Type & Settings
    organization_type VARCHAR(50) DEFAULT 'law_firm' CHECK (
        organization_type IN ('law_firm', 'legal_services', 'individual', 'other')
    ),
    subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (
        subscription_tier IN ('free', 'professional', 'enterprise')
    ),

    -- Seat Management
    max_members INTEGER DEFAULT 5, -- Seat limit based on plan

    -- Billing & Payment
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255),
    billing_email VARCHAR(255),

    -- Organization Details (from advertiser_profiles)
    firm_type VARCHAR(50) CHECK (
        firm_type IN ('solo', 'small', 'medium', 'large', 'enterprise')
    ),
    bar_number VARCHAR(50),
    bar_state VARCHAR(10) DEFAULT 'CA',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    billing_address TEXT,
    website VARCHAR(255),
    logo_url TEXT,
    description TEXT,
    specializations TEXT[],

    -- Status & Verification
    status VARCHAR(50) DEFAULT 'active' CHECK (
        status IN ('active', 'suspended', 'inactive', 'pending')
    ),
    verification_status VARCHAR(50) DEFAULT 'unverified' CHECK (
        verification_status IN ('unverified', 'pending', 'verified', 'rejected')
    ),

    -- Flexible Settings
    settings JSONB DEFAULT '{
        "features": {
            "advertising": true,
            "analytics": true,
            "api_access": false
        },
        "notifications": {
            "email": true,
            "slack": false
        },
        "branding": {
            "primary_color": "#3B82F6",
            "custom_domain": null
        }
    }'::jsonb,

    -- Custom Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete support

    -- Constraints
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT valid_max_members CHECK (max_members > 0 AND max_members <= 1000)
);

-- =====================================================
-- 2. ORGANIZATION MEMBERS TABLE
-- =====================================================
-- Junction table for users in organizations with roles and permissions
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Clerk user ID from app_users

    -- Role & Permissions
    role VARCHAR(50) DEFAULT 'member' CHECK (
        role IN ('owner', 'admin', 'member', 'viewer', 'billing')
    ),

    -- Granular Permissions (JSONB for flexibility)
    permissions JSONB DEFAULT '{
        "advertising": {
            "create_campaigns": true,
            "edit_campaigns": true,
            "delete_campaigns": false,
            "view_analytics": true,
            "manage_billing": false
        },
        "organization": {
            "invite_members": false,
            "remove_members": false,
            "edit_settings": false,
            "view_billing": false
        },
        "admin": {
            "manage_roles": false,
            "full_access": false
        }
    }'::jsonb,

    -- Invitation Tracking
    invited_by TEXT, -- Clerk user ID who invited this member
    invitation_accepted_at TIMESTAMPTZ,

    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(organization_id, user_id) -- One membership per org per user
);

-- =====================================================
-- 3. ORGANIZATION INVITATIONS TABLE
-- =====================================================
-- Manages pending invitations to join organizations
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by TEXT NOT NULL, -- Clerk user ID who sent invitation

    -- Invitee Information
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (
        role IN ('admin', 'member', 'viewer', 'billing')
    ),

    -- Invitation Token & Security
    token VARCHAR(255) NOT NULL UNIQUE,
    token_hash TEXT NOT NULL, -- Hashed token for security

    -- Invitation Lifecycle
    status VARCHAR(50) DEFAULT 'pending' CHECK (
        status IN ('pending', 'accepted', 'declined', 'expired', 'revoked')
    ),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by TEXT, -- Clerk user ID who accepted (may differ from email)

    -- Optional Message
    invitation_message TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- =====================================================
-- 4. ORGANIZATION ACTIVITY LOG TABLE (Audit Trail)
-- =====================================================
-- Track important organization events for compliance and debugging
CREATE TABLE IF NOT EXISTS organization_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Actor
    user_id TEXT, -- Clerk user ID (null for system events)

    -- Event Details
    event_type VARCHAR(100) NOT NULL, -- 'member.invited', 'member.joined', 'settings.updated', etc.
    event_category VARCHAR(50) NOT NULL CHECK (
        event_category IN ('auth', 'members', 'billing', 'settings', 'advertising', 'security')
    ),

    -- Event Data
    event_data JSONB DEFAULT '{}'::jsonb,

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4.5: ADD MISSING COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add missing columns to existing organizations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE organizations ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN owner_id TEXT;
  END IF;
END $$;

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================

-- Organizations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'deleted_at') THEN
    CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status) WHERE deleted_at IS NULL;
  ELSE
    CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
    CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
    CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_organizations_tier ON organizations(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- Organization Members
CREATE INDEX IF NOT EXISTS idx_org_members_organization ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON organization_members(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_org_members_last_active ON organization_members(last_active_at DESC);

-- Organization Invitations
CREATE INDEX IF NOT EXISTS idx_org_invitations_organization ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON organization_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON organization_invitations(token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_org_invitations_status ON organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_org_invitations_expires ON organization_invitations(expires_at) WHERE status = 'pending';

-- Organization Activity Log
CREATE INDEX IF NOT EXISTS idx_org_activity_organization ON organization_activity_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_activity_user ON organization_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_activity_event_type ON organization_activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_org_activity_category ON organization_activity_log(event_category, created_at DESC);

-- =====================================================
-- 6. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_invitations_updated_at
    BEFORE UPDATE ON organization_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is member of organization
CREATE OR REPLACE FUNCTION is_organization_member(
    org_id UUID,
    clerk_user_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = clerk_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION has_organization_role(
    org_id UUID,
    clerk_user_id TEXT,
    required_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = clerk_user_id
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's role in organization
CREATE OR REPLACE FUNCTION get_organization_role(
    org_id UUID,
    clerk_user_id TEXT
)
RETURNS TEXT AS $$
    SELECT role
    FROM organization_members
    WHERE organization_id = org_id
    AND user_id = clerk_user_id
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if user can manage organization
CREATE OR REPLACE FUNCTION can_manage_organization(
    org_id UUID,
    clerk_user_id TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM organization_members
        WHERE organization_id = org_id
        AND user_id = clerk_user_id
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to log organization activity
CREATE OR REPLACE FUNCTION log_organization_activity(
    org_id UUID,
    clerk_user_id TEXT,
    evt_type VARCHAR,
    evt_category VARCHAR,
    evt_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO organization_activity_log (
        organization_id,
        user_id,
        event_type,
        event_category,
        event_data
    )
    VALUES (
        org_id,
        clerk_user_id,
        evt_type,
        evt_category,
        evt_data
    )
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE organization_invitations
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'pending'
    AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get organization member count
CREATE OR REPLACE FUNCTION get_organization_member_count(org_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM organization_members
    WHERE organization_id = org_id;
$$ LANGUAGE sql STABLE;

-- Function to check if organization is at member limit
CREATE OR REPLACE FUNCTION is_at_member_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_count INTEGER;
    max_allowed INTEGER;
BEGIN
    SELECT max_members INTO max_allowed
    FROM organizations
    WHERE id = org_id;

    SELECT COUNT(*) INTO current_count
    FROM organization_members
    WHERE organization_id = org_id;

    RETURN current_count >= max_allowed;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_activity_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ORGANIZATIONS TABLE POLICIES
-- =====================================================

-- Users can view organizations they are members of
CREATE POLICY "Users can view their organizations"
    ON organizations
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            -- User is the owner
            owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
            OR
            -- User is a member
            EXISTS (
                SELECT 1 FROM organization_members
                WHERE organization_id = organizations.id
                AND user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            )
        )
    );

-- Only owners can update their organizations (except admins for specific fields)
CREATE POLICY "Owners and admins can update organization"
    ON organizations
    FOR UPDATE
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organizations.id
            AND user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND role IN ('owner', 'admin')
        )
    );

-- Authenticated users can create organizations
CREATE POLICY "Authenticated users can create organizations"
    ON organizations
    FOR INSERT
    WITH CHECK (
        owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- Only owners can delete (soft delete) organizations
CREATE POLICY "Owners can delete organizations"
    ON organizations
    FOR DELETE
    USING (
        owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    );

-- =====================================================
-- ORGANIZATION_MEMBERS TABLE POLICIES
-- =====================================================

-- Users can view members of their organizations
CREATE POLICY "Users can view organization members"
    ON organization_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members AS om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Owners and admins can add members (if not at limit)
CREATE POLICY "Admins can add organization members"
    ON organization_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members AS om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND om.role IN ('owner', 'admin')
        )
        AND NOT is_at_member_limit(organization_members.organization_id)
    );

-- Owners and admins can update member roles/permissions
CREATE POLICY "Admins can update member roles"
    ON organization_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members AS om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND om.role IN ('owner', 'admin')
        )
    );

-- Owners and admins can remove members (except owner)
CREATE POLICY "Admins can remove members"
    ON organization_members
    FOR DELETE
    USING (
        organization_members.role != 'owner'
        AND EXISTS (
            SELECT 1 FROM organization_members AS om
            WHERE om.organization_id = organization_members.organization_id
            AND om.user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND om.role IN ('owner', 'admin')
        )
    );

-- Members can remove themselves
CREATE POLICY "Members can remove themselves"
    ON organization_members
    FOR DELETE
    USING (
        user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        AND role != 'owner' -- Owners cannot remove themselves
    );

-- =====================================================
-- ORGANIZATION_INVITATIONS TABLE POLICIES
-- =====================================================

-- Members can view invitations for their organizations
CREATE POLICY "Members can view organization invitations"
    ON organization_invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organization_invitations.organization_id
            AND user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Admins can create invitations (if not at member limit)
CREATE POLICY "Admins can create invitations"
    ON organization_invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organization_invitations.organization_id
            AND user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND role IN ('owner', 'admin')
        )
        AND NOT is_at_member_limit(organization_invitations.organization_id)
    );

-- Admins can update invitations (e.g., revoke)
CREATE POLICY "Admins can update invitations"
    ON organization_invitations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organization_invitations.organization_id
            AND user_id = current_setting('request.jwt.claims', true)::json->>'sub'
            AND role IN ('owner', 'admin')
        )
    );

-- Anyone with valid token can accept (handled via function)
-- This will be managed through a service function with proper validation

-- =====================================================
-- ORGANIZATION_ACTIVITY_LOG TABLE POLICIES
-- =====================================================

-- Members can view activity logs for their organizations
CREATE POLICY "Members can view organization activity"
    ON organization_activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = organization_activity_log.organization_id
            AND user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- System/service role can insert activity logs
-- INSERT handled via service role in application code

-- =====================================================
-- 9. MIGRATION FROM ADVERTISER_PROFILES
-- =====================================================

-- Add organization_id to advertiser_profiles for backward compatibility
ALTER TABLE advertiser_profiles
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_organization
ON advertiser_profiles(organization_id);

-- Migration function to create organizations from existing advertiser profiles
CREATE OR REPLACE FUNCTION migrate_advertiser_profiles_to_organizations()
RETURNS TABLE (
    profiles_migrated INTEGER,
    organizations_created INTEGER,
    members_created INTEGER
) AS $$
DECLARE
    profile_record RECORD;
    new_org_id UUID;
    migration_count INTEGER := 0;
    org_count INTEGER := 0;
    member_count INTEGER := 0;
BEGIN
    -- For each advertiser profile without an organization
    FOR profile_record IN
        SELECT * FROM advertiser_profiles
        WHERE organization_id IS NULL
    LOOP
        -- Create organization from advertiser profile
        INSERT INTO organizations (
            name,
            slug,
            owner_id,
            organization_type,
            firm_type,
            bar_number,
            bar_state,
            contact_email,
            contact_phone,
            billing_email,
            billing_address,
            website,
            logo_url,
            description,
            specializations,
            stripe_customer_id,
            verification_status,
            status
        )
        VALUES (
            profile_record.firm_name,
            -- Generate slug from firm name
            LOWER(REGEXP_REPLACE(
                REGEXP_REPLACE(profile_record.firm_name, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            )) || '-' || SUBSTRING(profile_record.id::TEXT, 1, 8),
            (SELECT clerk_user_id FROM app_users WHERE email = profile_record.contact_email LIMIT 1),
            'law_firm',
            profile_record.firm_type,
            profile_record.bar_number,
            profile_record.bar_state,
            profile_record.contact_email,
            profile_record.contact_phone,
            profile_record.billing_email,
            profile_record.billing_address,
            profile_record.website,
            profile_record.logo_url,
            profile_record.description,
            profile_record.specializations,
            profile_record.stripe_customer_id,
            profile_record.verification_status,
            profile_record.account_status
        )
        RETURNING id INTO new_org_id;

        org_count := org_count + 1;

        -- Update advertiser profile with organization_id
        UPDATE advertiser_profiles
        SET organization_id = new_org_id
        WHERE id = profile_record.id;

        migration_count := migration_count + 1;

        -- Add owner as organization member
        IF profile_record.user_id IS NOT NULL THEN
            INSERT INTO organization_members (
                organization_id,
                user_id,
                role,
                permissions,
                joined_at
            )
            SELECT
                new_org_id,
                clerk_user_id,
                'owner',
                '{
                    "advertising": {
                        "create_campaigns": true,
                        "edit_campaigns": true,
                        "delete_campaigns": true,
                        "view_analytics": true,
                        "manage_billing": true
                    },
                    "organization": {
                        "invite_members": true,
                        "remove_members": true,
                        "edit_settings": true,
                        "view_billing": true
                    },
                    "admin": {
                        "manage_roles": true,
                        "full_access": true
                    }
                }'::jsonb,
                profile_record.created_at
            FROM app_users
            WHERE email = profile_record.contact_email
            LIMIT 1
            ON CONFLICT (organization_id, user_id) DO NOTHING;

            member_count := member_count + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT migration_count, org_count, member_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. GRANTS FOR AUTHENTICATED USERS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON organization_invitations TO authenticated;
GRANT SELECT ON organization_activity_log TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_organization_member TO authenticated;
GRANT EXECUTE ON FUNCTION has_organization_role TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_role TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_organization TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_member_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_at_member_limit TO authenticated;

-- =====================================================
-- 11. EXECUTE MIGRATION (COMMENTED OUT FOR SAFETY)
-- =====================================================
-- Uncomment to run migration:
-- SELECT * FROM migrate_advertiser_profiles_to_organizations();

-- =====================================================
-- 12. SAMPLE DATA INSERTION (FOR TESTING)
-- =====================================================
-- Example: Create a test organization
-- INSERT INTO organizations (name, slug, owner_id, contact_email)
-- VALUES ('Test Law Firm', 'test-law-firm', 'user_clerk_id_here', 'test@lawfirm.com');

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Migration completed successfully
-- Organizations, members, invitations, and activity log tables created
-- RLS policies configured for secure multi-tenant access
-- Helper functions created for permission checks
-- Backward compatibility with advertiser_profiles maintained
