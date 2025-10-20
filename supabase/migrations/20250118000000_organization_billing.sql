-- Organization-Level Billing Migration
-- Adds support for team/workspace billing with Stripe integration
--
-- This migration creates:
-- 1. Organizations table with Stripe billing fields
-- 2. Organization members (users belong to organizations)
-- 3. Invoices table for billing history
-- 4. Usage tracking for API calls and searches
-- 5. Webhook logs for audit trail
--
-- Migration Strategy:
-- - Existing users migrate to personal organizations
-- - Preserve existing Stripe subscriptions
-- - Enable team collaboration features

-- ====================
-- 1. Organizations Table
-- ====================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization details
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,

  -- Stripe billing
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Subscription details
  subscription_tier TEXT NOT NULL DEFAULT 'FREE' CHECK (subscription_tier IN ('FREE', 'PRO', 'ENTERPRISE')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'paused')),
  billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annual')),

  -- Seats and usage
  seats INTEGER NOT NULL DEFAULT 3,
  used_seats INTEGER NOT NULL DEFAULT 0,
  api_calls_used INTEGER NOT NULL DEFAULT 0,
  api_calls_limit INTEGER NOT NULL DEFAULT 100,

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,

  -- Cancellation tracking
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Payment method
  payment_method_id TEXT,
  payment_method_brand TEXT,
  payment_method_last4 TEXT,

  -- Billing contact
  billing_email TEXT NOT NULL,
  billing_name TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_seats CHECK (seats > 0),
  CONSTRAINT used_seats_valid CHECK (used_seats >= 0 AND used_seats <= seats),
  CONSTRAINT api_calls_valid CHECK (api_calls_used >= 0)
);

-- Indexes for organizations
CREATE INDEX idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);
CREATE INDEX idx_organizations_stripe_subscription ON public.organizations(stripe_subscription_id);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_tier ON public.organizations(subscription_tier);
CREATE INDEX idx_organizations_status ON public.organizations(subscription_status);

-- ====================
-- 2. Organization Members Table
-- ====================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID

  -- Role and permissions
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'billing')),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),

  -- Invitation tracking
  invited_by TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, user_id)
);

-- Indexes for organization members
CREATE INDEX idx_organization_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX idx_organization_members_role ON public.organization_members(organization_id, role);

-- ====================
-- 3. Invoices Table
-- ====================
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,

  -- Invoice details
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void', 'failed')),

  -- URLs
  invoice_pdf TEXT,
  hosted_invoice_url TEXT,

  -- Payment tracking
  paid_at TIMESTAMPTZ,
  attempt_count INTEGER DEFAULT 0,
  next_payment_attempt TIMESTAMPTZ,

  -- Billing period
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX idx_invoices_organization ON public.invoices(organization_id);
CREATE INDEX idx_invoices_stripe_id ON public.invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_paid_at ON public.invoices(paid_at);

-- ====================
-- 4. Usage Tracking Table
-- ====================
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id TEXT, -- Optional: track which user made the request

  -- Usage details
  usage_type TEXT NOT NULL CHECK (usage_type IN ('api_call', 'search', 'export', 'analytics')),
  quantity INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  endpoint TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Indexes for usage tracking
CREATE INDEX idx_usage_tracking_org ON public.usage_tracking(organization_id);
CREATE INDEX idx_usage_tracking_org_type ON public.usage_tracking(organization_id, usage_type);
CREATE INDEX idx_usage_tracking_created ON public.usage_tracking(created_at);

-- Partitioning for usage tracking (optional - for high volume)
-- ALTER TABLE public.usage_tracking PARTITION BY RANGE (created_at);

-- ====================
-- 5. Webhook Logs Table
-- ====================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event details
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),

  -- Error tracking
  error_message TEXT,

  -- Payload
  payload JSONB NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for webhook logs
CREATE INDEX idx_webhook_logs_event_id ON public.webhook_logs(event_id);
CREATE INDEX idx_webhook_logs_event_type ON public.webhook_logs(event_type);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON public.webhook_logs(created_at);

-- ====================
-- 6. Functions and Triggers
-- ====================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update used_seats count when members are added/removed
CREATE OR REPLACE FUNCTION update_organization_used_seats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.organizations
    SET used_seats = (
      SELECT COUNT(*)
      FROM public.organization_members
      WHERE organization_id = NEW.organization_id
        AND status = 'active'
    )
    WHERE id = NEW.organization_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.organizations
    SET used_seats = (
      SELECT COUNT(*)
      FROM public.organization_members
      WHERE organization_id = OLD.organization_id
        AND status = 'active'
    )
    WHERE id = OLD.organization_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update used_seats
CREATE TRIGGER update_org_used_seats
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_used_seats();

-- Function to validate seat limits
CREATE OR REPLACE FUNCTION validate_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
  org_seats INTEGER;
  current_used_seats INTEGER;
BEGIN
  -- Get organization seat limit
  SELECT seats INTO org_seats
  FROM public.organizations
  WHERE id = NEW.organization_id;

  -- Count current active members
  SELECT COUNT(*) INTO current_used_seats
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id
    AND status = 'active';

  -- Check if adding this member would exceed seat limit
  IF NEW.status = 'active' AND current_used_seats >= org_seats THEN
    RAISE EXCEPTION 'Seat limit exceeded. Organization has % seats, currently using %', org_seats, current_used_seats;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate seat limits
CREATE TRIGGER validate_org_seat_limit
  BEFORE INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION validate_seat_limit();

-- Function to reset monthly usage (call via cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.organizations
  SET api_calls_used = 0
  WHERE billing_interval = 'monthly'
    AND current_period_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 7. Row Level Security (RLS)
-- ====================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Organizations: Members can view their own organizations
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()::text
        AND status = 'active'
    )
  );

-- Organizations: Owners and admins can update their organizations
CREATE POLICY "Admins can update their organizations"
  ON public.organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()::text
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Organization Members: Members can view other members in their organization
CREATE POLICY "Members can view organization members"
  ON public.organization_members FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()::text
        AND status = 'active'
    )
  );

-- Organization Members: Admins can manage members
CREATE POLICY "Admins can manage organization members"
  ON public.organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()::text
        AND role IN ('owner', 'admin')
        AND status = 'active'
    )
  );

-- Invoices: Members can view invoices for their organization
CREATE POLICY "Members can view organization invoices"
  ON public.invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()::text
        AND status = 'active'
    )
  );

-- Usage Tracking: Members can view usage for their organization
CREATE POLICY "Members can view organization usage"
  ON public.usage_tracking FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()::text
        AND status = 'active'
    )
  );

-- Webhook Logs: Service role only (no public access)
CREATE POLICY "Service role only for webhook logs"
  ON public.webhook_logs FOR ALL
  USING (auth.role() = 'service_role');

-- ====================
-- 8. Comments for Documentation
-- ====================

COMMENT ON TABLE public.organizations IS 'Organizations for team/workspace billing';
COMMENT ON TABLE public.organization_members IS 'Users belonging to organizations with roles';
COMMENT ON TABLE public.invoices IS 'Stripe invoice history for organizations';
COMMENT ON TABLE public.usage_tracking IS 'API call and feature usage tracking for billing';
COMMENT ON TABLE public.webhook_logs IS 'Audit log for Stripe webhook events';

COMMENT ON COLUMN public.organizations.subscription_tier IS 'FREE (3 seats), PRO (10 seats), ENTERPRISE (unlimited)';
COMMENT ON COLUMN public.organizations.subscription_status IS 'Stripe subscription status';
COMMENT ON COLUMN public.organizations.seats IS 'Maximum seats allowed for this tier';
COMMENT ON COLUMN public.organizations.used_seats IS 'Current active members (auto-calculated)';
COMMENT ON COLUMN public.organizations.api_calls_used IS 'API calls used in current billing period';
COMMENT ON COLUMN public.organizations.api_calls_limit IS 'API call limit based on tier';

COMMENT ON COLUMN public.organization_members.role IS 'owner: full control, admin: manage members, member: basic access, billing: view billing only';
COMMENT ON COLUMN public.organization_members.status IS 'active: full access, invited: pending acceptance, suspended: access revoked';
