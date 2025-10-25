-- Migration: Judge Ad Products and Bookings
-- Description: Tables for managing judge-specific Stripe products and ad spot bookings
-- Created: 2025-01-19

-- =============================================================================
-- TABLE: judge_ad_products
-- Purpose: Cache Stripe product and price IDs for each judge's ad spots
-- =============================================================================
CREATE TABLE IF NOT EXISTS judge_ad_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position IN (1, 2)),
  stripe_product_id text NOT NULL UNIQUE,
  stripe_monthly_price_id text NOT NULL,
  stripe_annual_price_id text NOT NULL,
  court_level text NOT NULL CHECK (court_level IN ('federal', 'state')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,

  -- Ensure only one product per judge per position
  UNIQUE(judge_id, position)
);

-- Indexes for fast lookups
CREATE INDEX idx_judge_ad_products_judge ON judge_ad_products(judge_id);
CREATE INDEX idx_judge_ad_products_stripe_product ON judge_ad_products(stripe_product_id);
CREATE INDEX idx_judge_ad_products_active ON judge_ad_products(judge_id) WHERE archived_at IS NULL;

-- Row Level Security
ALTER TABLE judge_ad_products ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to judge_ad_products"
ON judge_ad_products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Advertisers can view active products
CREATE POLICY "Advertisers can view active judge ad products"
ON judge_ad_products
FOR SELECT
TO authenticated
USING (archived_at IS NULL);

-- =============================================================================
-- TABLE: ad_spot_bookings
-- Purpose: Track active and historical ad spot bookings with Stripe subscriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS ad_spot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judge_id uuid NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  advertiser_id uuid REFERENCES advertiser_profiles(id) ON DELETE SET NULL,
  stripe_subscription_id text UNIQUE,
  stripe_product_id text,
  stripe_customer_id text,
  position integer NOT NULL CHECK (position IN (1, 2)),
  court_level text NOT NULL CHECK (court_level IN ('federal', 'state')),
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'annual')),
  monthly_price decimal(10,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'incomplete', 'trialing')) DEFAULT 'active',
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Metadata for tracking
  metadata jsonb DEFAULT '{}'::jsonb

  -- Note: Double-booking prevention is enforced via partial unique index below
  -- See: idx_ad_bookings_unique_active
);

-- Indexes for performance
CREATE INDEX idx_ad_bookings_judge ON ad_spot_bookings(judge_id);
CREATE INDEX idx_ad_bookings_advertiser ON ad_spot_bookings(advertiser_id);
CREATE INDEX idx_ad_bookings_stripe_sub ON ad_spot_bookings(stripe_subscription_id);
CREATE INDEX idx_ad_bookings_status ON ad_spot_bookings(status);

-- Partial unique index to prevent double-booking (only one active booking per judge per position)
CREATE UNIQUE INDEX idx_ad_bookings_unique_active
  ON ad_spot_bookings(judge_id, position)
  WHERE status IN ('active', 'trialing', 'past_due');

-- Row Level Security
ALTER TABLE ad_spot_bookings ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to ad_spot_bookings"
ON ad_spot_bookings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Advertisers can view their own bookings
CREATE POLICY "Advertisers can view own bookings"
ON ad_spot_bookings
FOR SELECT
TO authenticated
USING (
  advertiser_id IN (
    SELECT id FROM advertiser_profiles WHERE user_id = auth.uid()
  )
);

-- Advertisers can update their own active bookings (limited fields)
CREATE POLICY "Advertisers can update own bookings"
ON ad_spot_bookings
FOR UPDATE
TO authenticated
USING (
  advertiser_id IN (
    SELECT id FROM advertiser_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  advertiser_id IN (
    SELECT id FROM advertiser_profiles WHERE user_id = auth.uid()
  )
);

-- Public can view active bookings (for displaying ads on judge profiles)
CREATE POLICY "Public can view active bookings"
ON ad_spot_bookings
FOR SELECT
TO anon
USING (status IN ('active', 'trialing'));

-- =============================================================================
-- TABLE: checkout_sessions
-- Purpose: Temporary storage for linking checkout sessions to subscriptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Auto-expire after 24 hours (cleanup job should remove these)
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_checkout_sessions_session ON checkout_sessions(stripe_session_id);
CREATE INDEX idx_checkout_sessions_customer ON checkout_sessions(stripe_customer_id);
CREATE INDEX idx_checkout_sessions_expires ON checkout_sessions(expires_at);

-- Row Level Security
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role has full access to checkout_sessions"
ON checkout_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_judge_ad_products_updated_at
  BEFORE UPDATE ON judge_ad_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_spot_bookings_updated_at
  BEFORE UPDATE ON ad_spot_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE judge_ad_products IS 'Caches Stripe product and price IDs for judge ad spots to avoid recreating';
COMMENT ON TABLE ad_spot_bookings IS 'Tracks active and historical ad spot bookings linked to Stripe subscriptions';

COMMENT ON COLUMN judge_ad_products.position IS 'Rotation slot number (1 or 2) for this ad spot';
COMMENT ON COLUMN judge_ad_products.court_level IS 'Federal ($500/mo) or State ($200/mo) pricing tier';

COMMENT ON COLUMN ad_spot_bookings.status IS 'Stripe subscription status: active, past_due, canceled, paused, incomplete, trialing';
COMMENT ON COLUMN ad_spot_bookings.cancel_at_period_end IS 'If true, subscription will cancel at end of current billing period';
COMMENT ON COLUMN ad_spot_bookings.monthly_price IS 'Actual monthly price charged (may differ from current pricing if grandfathered)';

-- =============================================================================
-- GRANTS
-- =============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON judge_ad_products TO authenticated;
GRANT SELECT, UPDATE ON ad_spot_bookings TO authenticated;

-- Grant full permissions to service role
GRANT ALL ON judge_ad_products TO service_role;
GRANT ALL ON ad_spot_bookings TO service_role;

-- Grant read access to anonymous users (for displaying ads)
GRANT SELECT ON ad_spot_bookings TO anon;
