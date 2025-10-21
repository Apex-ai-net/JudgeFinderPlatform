-- ========================================
-- MIGRATION: Consolidate to Universal $500 Pricing
-- Version: 20251020_001
-- Purpose: Deprecate tiered pricing (A-D), keep only universal $500/mo standard
-- Author: JudgeFinder Platform Team
-- Date: 2025-10-20
-- Business Rationale: Simplify pricing model - all judges get same $500/mo rate
-- ========================================

BEGIN;

-- Step 1: Deactivate legacy tiered pricing (verified_listing_tier_a through tier_d)
UPDATE pricing_tiers
SET is_active = false,
    updated_at = CURRENT_TIMESTAMP,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{deprecated_reason}',
      '"Replaced by universal $500 standard pricing (2025-10-20)"'::jsonb
    )
WHERE tier_name IN (
  'verified_listing_tier_a',
  'verified_listing_tier_b',
  'verified_listing_tier_c',
  'verified_listing_tier_d',
  'federal_judge_premium',
  'state_judge_standard',
  'court_standard'
)
AND is_active = true;

-- Step 2: Ensure universal_access tier is active and correctly priced
UPDATE pricing_tiers
SET is_active = true,
    monthly_price = 500.00,
    annual_price = 5000.00,
    annual_discount_months = 10, -- 2 months free
    entity_type = 'all',
    court_level = 'all',
    features = '{
      "placement": "universal",
      "analytics": "full",
      "support": "priority",
      "visibility": "all_courts_all_judges",
      "description": "Standard pricing for all judge advertising"
    }'::jsonb,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{pricing_model}',
      '"simplified_universal_2025"'::jsonb
    ),
    updated_at = CURRENT_TIMESTAMP
WHERE tier_name = 'universal_access';

-- Step 3: Add new tier for exclusive placements (1.5x premium)
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
  'exclusive_placement',
  'all',
  'all',
  750.00, -- 1.5x standard ($500 * 1.5)
  7500.00, -- 1.5x standard annual
  10, -- 2 months free
  '{
    "placement": "exclusive",
    "analytics": "full",
    "support": "priority",
    "visibility": "all_courts_all_judges",
    "exclusivity": "no_competing_ads",
    "description": "Premium exclusive advertising (no competitors on judge page)"
  }'::jsonb,
  'universal',
  'subscription',
  true,
  '{"pricing_model": "simplified_universal_2025", "multiplier": 1.5}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (tier_name) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  features = EXCLUDED.features,
  is_active = true,
  updated_at = CURRENT_TIMESTAMP;

-- Step 4: Add comment explaining new pricing model
COMMENT ON TABLE pricing_tiers IS
'Advertising pricing tiers. As of 2025-10-20: Simplified to universal $500/mo standard pricing.
- universal_access: $500/mo for all judges (federal and state)
- exclusive_placement: $750/mo for exclusive positioning (1.5x premium)
- All legacy tiered pricing (A-D) deprecated';

-- Step 5: Create view for active pricing (for convenience)
CREATE OR REPLACE VIEW active_pricing_tiers AS
SELECT
  tier_name,
  entity_type,
  court_level,
  monthly_price,
  annual_price,
  annual_discount_months,
  features,
  tier_group,
  stripe_monthly_price_id,
  stripe_annual_price_id,
  metadata
FROM pricing_tiers
WHERE is_active = true
ORDER BY monthly_price ASC;

COMMENT ON VIEW active_pricing_tiers IS
'Active pricing tiers only. Shows current pricing model (universal $500 + exclusive $750).';

-- Step 6: Verification query
DO $$
DECLARE
  active_count INTEGER;
  universal_price NUMERIC;
  exclusive_price NUMERIC;
BEGIN
  -- Count active tiers
  SELECT COUNT(*) INTO active_count
  FROM pricing_tiers
  WHERE is_active = true;

  -- Get universal pricing
  SELECT monthly_price INTO universal_price
  FROM pricing_tiers
  WHERE tier_name = 'universal_access';

  -- Get exclusive pricing
  SELECT monthly_price INTO exclusive_price
  FROM pricing_tiers
  WHERE tier_name = 'exclusive_placement';

  -- Verify results
  RAISE NOTICE 'Active pricing tiers: %', active_count;
  RAISE NOTICE 'Universal price: $%/mo', universal_price;
  RAISE NOTICE 'Exclusive price: $%/mo', exclusive_price;

  -- Basic validation
  IF universal_price != 500.00 THEN
    RAISE EXCEPTION 'Universal pricing incorrect: expected $500, got $%', universal_price;
  END IF;

  IF exclusive_price != 750.00 THEN
    RAISE EXCEPTION 'Exclusive pricing incorrect: expected $750, got $%', exclusive_price;
  END IF;

  RAISE NOTICE '✓ Pricing consolidation successful';
END $$;

COMMIT;

-- Expected result:
-- Active tiers: 2 (universal_access, exclusive_placement)
-- Universal: $500/mo, $5,000/yr
-- Exclusive: $750/mo, $7,500/yr
-- All legacy tiers deactivated (not deleted, for historical records)
