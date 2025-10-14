-- ========================================
-- MIGRATION: Universal Pricing Model
-- Version: 20251015_001
-- Purpose: Add universal $500/mo, $5,000/yr pricing for all courts and judges
-- Author: JudgeFinder Platform Team
-- Date: 2025-10-15
-- ========================================

BEGIN;

-- Step 1: Add columns to store Stripe price IDs (if missing)
ALTER TABLE pricing_tiers
  ADD COLUMN IF NOT EXISTS stripe_monthly_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tier_group VARCHAR(32),
  ADD COLUMN IF NOT EXISTS purchase_type VARCHAR(32) DEFAULT 'subscription';

-- Step 2: Add indexes for Stripe price ID lookups
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_stripe_monthly
  ON pricing_tiers(stripe_monthly_price_id);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_stripe_annual
  ON pricing_tiers(stripe_annual_price_id);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_tier_group
  ON pricing_tiers(tier_group);

-- Step 3: Upsert universal_access pricing tier
-- NOTE: stripe_*_price_id columns will be populated by automation script
INSERT INTO pricing_tiers (
  tier_name,
  entity_type,
  court_level,
  monthly_price,
  annual_price,
  annual_discount_months,
  features,
  tier_group,
  purchase_type,
  is_active,
  metadata,
  created_at,
  updated_at
) VALUES (
  'universal_access',
  'all', -- applies to both judges and courts
  'all', -- applies to all court levels
  500.00,
  5000.00,
  10, -- annual = 10 months pricing (save $1,000)
  '{"placement": "universal", "analytics": "full", "support": "priority", "visibility": "all_courts_all_judges"}'::jsonb,
  'universal',
  'subscription',
  true,
  '{"domain": "judgefinder", "scope": "universal_access", "applies_to": "all_courts_all_judges"}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (tier_name) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  annual_discount_months = EXCLUDED.annual_discount_months,
  tier_group = EXCLUDED.tier_group,
  purchase_type = EXCLUDED.purchase_type,
  features = EXCLUDED.features,
  metadata = EXCLUDED.metadata,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- Step 4: Add comments
COMMENT ON COLUMN pricing_tiers.stripe_monthly_price_id IS 'Stripe Price ID for monthly recurring subscription';
COMMENT ON COLUMN pricing_tiers.stripe_annual_price_id IS 'Stripe Price ID for annual recurring subscription';
COMMENT ON COLUMN pricing_tiers.metadata IS 'Additional metadata for filtering and categorization';
COMMENT ON COLUMN pricing_tiers.tier_group IS 'Grouping identifier (e.g., universal, verified_listing)';
COMMENT ON COLUMN pricing_tiers.purchase_type IS 'Type of purchase (subscription, one_time, usage_based)';

-- Step 5: Verification query (commented out, for manual verification)
-- SELECT tier_name, monthly_price, annual_price,
--        stripe_monthly_price_id, stripe_annual_price_id,
--        is_active, tier_group
-- FROM pricing_tiers
-- WHERE tier_name = 'universal_access';

COMMIT;

-- Expected result: 1 row with universal_access tier at $500/mo, $5,000/yr
-- Stripe price IDs will be NULL initially (populated by automation script)
