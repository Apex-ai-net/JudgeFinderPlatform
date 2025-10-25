-- ========================================
-- MIGRATION: Pending Checkouts Table
-- Version: 20251020_002
-- Purpose: Track checkout form data before Stripe redirect (prevent data loss)
-- Author: JudgeFinder Platform Team
-- Date: 2025-10-20
-- Business Rationale: If Stripe checkout fails/cancels, we can recover user's form data
-- ========================================

BEGIN;

-- Step 1: Create pending_checkouts table
CREATE TABLE IF NOT EXISTS pending_checkouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User identification (nullable for unauthenticated users)
  clerk_user_id TEXT,

  -- Form data (from PurchaseAdForm)
  organization_name TEXT NOT NULL,
  email TEXT NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'annual')),
  notes TEXT,
  promo_code TEXT,

  -- Judge-specific fields (for judge-profile ads)
  judge_id UUID REFERENCES judges(id) ON DELETE SET NULL,
  judge_name TEXT,
  court_name TEXT,
  court_level TEXT CHECK (court_level IN ('federal', 'state')),
  ad_position INTEGER CHECK (ad_position IN (1, 2)),
  ad_type TEXT CHECK (ad_type IN ('judge-profile', 'court-listing', 'featured-spot')),

  -- Stripe session tracking
  stripe_session_id TEXT UNIQUE, -- Will be populated after session created
  stripe_session_status TEXT, -- 'open', 'complete', 'expired'

  -- Checkout status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'checkout_created', 'payment_completed', 'payment_failed', 'expired', 'abandoned')
  ),

  -- Recovery metadata
  client_ip TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checkout_created_at TIMESTAMPTZ, -- When Stripe session was created
  completed_at TIMESTAMPTZ, -- When payment completed
  expired_at TIMESTAMPTZ, -- When abandoned/expired

  -- Audit trail
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_checkouts_clerk_user_id
  ON pending_checkouts(clerk_user_id)
  WHERE clerk_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_email
  ON pending_checkouts(email);

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_stripe_session_id
  ON pending_checkouts(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_status
  ON pending_checkouts(status);

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_created_at
  ON pending_checkouts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pending_checkouts_judge_id
  ON pending_checkouts(judge_id)
  WHERE judge_id IS NOT NULL;

-- Step 3: Add trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_pending_checkouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pending_checkouts_timestamp
  BEFORE UPDATE ON pending_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_checkouts_timestamp();

-- Step 4: Create function to clean up expired checkouts (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_expired_pending_checkouts()
RETURNS INTEGER AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE pending_checkouts
  SET
    status = 'expired',
    expired_at = CURRENT_TIMESTAMP
  WHERE
    status IN ('pending', 'checkout_created')
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
    AND expired_at IS NULL;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  RAISE NOTICE 'Marked % pending checkouts as expired', affected_count;
  RETURN affected_count;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to get user's abandoned checkouts (for recovery UI)
CREATE OR REPLACE FUNCTION get_user_abandoned_checkouts(p_clerk_user_id TEXT)
RETURNS TABLE (
  id UUID,
  organization_name TEXT,
  email TEXT,
  billing_cycle TEXT,
  notes TEXT,
  promo_code TEXT,
  judge_name TEXT,
  court_name TEXT,
  ad_type TEXT,
  created_at TIMESTAMPTZ,
  days_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.organization_name,
    pc.email,
    pc.billing_cycle,
    pc.notes,
    pc.promo_code,
    pc.judge_name,
    pc.court_name,
    pc.ad_type,
    pc.created_at,
    EXTRACT(DAY FROM CURRENT_TIMESTAMP - pc.created_at)::INTEGER AS days_ago
  FROM pending_checkouts pc
  WHERE
    pc.clerk_user_id = p_clerk_user_id
    AND pc.status IN ('pending', 'checkout_created')
    AND pc.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
  ORDER BY pc.created_at DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create RLS policies (Row Level Security)
ALTER TABLE pending_checkouts ENABLE ROW LEVEL SECURITY;

-- Users can view their own pending checkouts
CREATE POLICY pending_checkouts_select_own
  ON pending_checkouts
  FOR SELECT
  USING (
    clerk_user_id = auth.jwt() ->> 'sub'
    OR clerk_user_id IS NULL -- Allow viewing anonymous checkouts by email in API
  );

-- Only service role can insert/update (API endpoint control)
CREATE POLICY pending_checkouts_service_insert
  ON pending_checkouts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY pending_checkouts_service_update
  ON pending_checkouts
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 7: Add comments for documentation
COMMENT ON TABLE pending_checkouts IS
'Tracks checkout form data before Stripe redirect. Prevents data loss if checkout fails or is abandoned.
Retention: Auto-expire after 7 days. Recovery UI can show recent abandoned checkouts to user.';

COMMENT ON COLUMN pending_checkouts.status IS
'Checkout lifecycle: pending → checkout_created → payment_completed | payment_failed | expired | abandoned';

COMMENT ON COLUMN pending_checkouts.stripe_session_id IS
'Stripe Checkout Session ID. Populated after createCheckoutSession() succeeds.';

COMMENT ON FUNCTION cleanup_expired_pending_checkouts() IS
'Called by cron job daily. Marks checkouts older than 7 days as expired.';

COMMENT ON FUNCTION get_user_abandoned_checkouts(TEXT) IS
'Returns user''s recent abandoned checkouts (last 7 days) for recovery UI.';

-- Step 8: Verification
DO $$
BEGIN
  -- Check table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'pending_checkouts'
  ) THEN
    RAISE EXCEPTION 'pending_checkouts table not created';
  END IF;

  -- Check RLS enabled
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'pending_checkouts'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on pending_checkouts';
  END IF;

  RAISE NOTICE '✓ pending_checkouts table created successfully with RLS';
END $$;

COMMIT;

-- Expected result:
-- Table: pending_checkouts with 7 indexes
-- Triggers: updated_at auto-update
-- Functions: cleanup_expired_pending_checkouts(), get_user_abandoned_checkouts()
-- RLS: Enabled with 3 policies
-- Data retention: 7 days for pending/checkout_created status
