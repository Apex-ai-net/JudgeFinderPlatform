-- Migration Script: User-Level to Organization-Level Billing
--
-- This migration safely transitions existing user subscriptions to organization-level billing:
-- 1. Create personal organizations for all existing users
-- 2. Migrate Stripe subscription data to organizations
-- 3. Link users to their personal organizations as owners
-- 4. Preserve existing subscription status and billing data
--
-- SAFETY FEATURES:
-- - Non-destructive (doesn't delete user data)
-- - Idempotent (can be run multiple times safely)
-- - Rollback-friendly (preserves original user table)

-- ====================
-- 1. Add Organization Reference to Users Table (Optional)
-- ====================
-- If you have an existing users table, add organization_id reference
-- This is optional - you can manage membership purely through organization_members table

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Add organization_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.users ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
      CREATE INDEX idx_users_organization ON public.users(organization_id);
    END IF;

    -- Add migration tracking columns
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'migrated_to_org_billing'
    ) THEN
      ALTER TABLE public.users ADD COLUMN migrated_to_org_billing BOOLEAN DEFAULT FALSE;
      ALTER TABLE public.users ADD COLUMN org_migration_date TIMESTAMPTZ;
    END IF;
  END IF;
END $$;

-- ====================
-- 2. Function to Create Personal Organization for User
-- ====================
CREATE OR REPLACE FUNCTION create_personal_organization(
  p_user_id TEXT,
  p_user_email TEXT,
  p_user_name TEXT DEFAULT NULL,
  p_stripe_customer_id TEXT DEFAULT NULL,
  p_stripe_subscription_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
  v_org_slug TEXT;
  v_org_name TEXT;
BEGIN
  -- Generate organization slug from email or user ID
  v_org_slug := LOWER(REGEXP_REPLACE(COALESCE(p_user_email, p_user_id), '[^a-zA-Z0-9-]', '-', 'g'));
  v_org_slug := REGEXP_REPLACE(v_org_slug, '-+', '-', 'g');
  v_org_slug := TRIM(BOTH '-' FROM v_org_slug);

  -- Ensure slug is unique
  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_org_slug) THEN
    v_org_slug := v_org_slug || '-' || substring(p_user_id from 1 for 8);
  END IF;

  -- Generate organization name
  v_org_name := COALESCE(p_user_name, p_user_email, p_user_id) || '''s Organization';

  -- Create organization
  INSERT INTO public.organizations (
    name,
    slug,
    description,
    stripe_customer_id,
    stripe_subscription_id,
    subscription_tier,
    subscription_status,
    billing_email,
    billing_name,
    seats,
    used_seats,
    created_at,
    updated_at
  ) VALUES (
    v_org_name,
    v_org_slug,
    'Personal workspace',
    p_stripe_customer_id,
    p_stripe_subscription_id,
    CASE
      WHEN p_stripe_subscription_id IS NOT NULL THEN 'PRO' -- Existing paying customer
      ELSE 'FREE'
    END,
    CASE
      WHEN p_stripe_subscription_id IS NOT NULL THEN 'active'
      ELSE 'active'
    END,
    p_user_email,
    p_user_name,
    CASE
      WHEN p_stripe_subscription_id IS NOT NULL THEN 1 -- Existing subscription: 1 seat (will scale with team)
      ELSE 3 -- Free tier: 3 seats
    END,
    1, -- User is first member
    NOW(),
    NOW()
  )
  RETURNING id INTO v_org_id;

  -- Add user as owner
  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    joined_at,
    created_at,
    updated_at
  ) VALUES (
    v_org_id,
    p_user_id,
    'owner',
    'active',
    NOW(),
    NOW(),
    NOW()
  );

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 3. Function to Migrate User Subscription Data
-- ====================
CREATE OR REPLACE FUNCTION migrate_user_subscription_to_org(
  p_user_id TEXT,
  p_org_id UUID,
  p_subscription_data JSONB
)
RETURNS void AS $$
BEGIN
  -- Update organization with subscription details
  UPDATE public.organizations
  SET
    stripe_customer_id = COALESCE(
      stripe_customer_id,
      (p_subscription_data->>'stripe_customer_id')::TEXT
    ),
    stripe_subscription_id = COALESCE(
      stripe_subscription_id,
      (p_subscription_data->>'stripe_subscription_id')::TEXT
    ),
    subscription_tier = COALESCE(
      (p_subscription_data->>'subscription_tier')::TEXT,
      'FREE'
    ),
    subscription_status = COALESCE(
      (p_subscription_data->>'subscription_status')::TEXT,
      'active'
    ),
    billing_interval = (p_subscription_data->>'billing_interval')::TEXT,
    current_period_start = (p_subscription_data->>'current_period_start')::TIMESTAMPTZ,
    current_period_end = (p_subscription_data->>'current_period_end')::TIMESTAMPTZ,
    trial_ends_at = (p_subscription_data->>'trial_ends_at')::TIMESTAMPTZ,
    payment_method_id = (p_subscription_data->>'payment_method_id')::TEXT,
    payment_method_brand = (p_subscription_data->>'payment_method_brand')::TEXT,
    payment_method_last4 = (p_subscription_data->>'payment_method_last4')::TEXT,
    updated_at = NOW()
  WHERE id = p_org_id;

  -- Mark user as migrated (if users table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    UPDATE public.users
    SET
      migrated_to_org_billing = TRUE,
      org_migration_date = NOW(),
      organization_id = p_org_id
    WHERE id = p_user_id OR clerk_user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 4. Batch Migration Script (Run Manually)
-- ====================
-- This is a template - customize based on your user table structure

DO $$
DECLARE
  v_user RECORD;
  v_org_id UUID;
  v_subscription_data JSONB;
BEGIN
  -- Only run if users table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE NOTICE 'Users table not found - skipping migration';
    RETURN;
  END IF;

  -- Iterate through all users who haven't been migrated
  FOR v_user IN
    SELECT
      id,
      clerk_user_id,
      email,
      full_name,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status,
      subscription_tier,
      billing_interval,
      current_period_start,
      current_period_end,
      trial_ends_at,
      payment_method_id,
      payment_method_brand,
      payment_method_last4
    FROM public.users
    WHERE COALESCE(migrated_to_org_billing, FALSE) = FALSE
      AND email IS NOT NULL
  LOOP
    -- Create personal organization
    BEGIN
      v_org_id := create_personal_organization(
        p_user_id := COALESCE(v_user.clerk_user_id, v_user.id::TEXT),
        p_user_email := v_user.email,
        p_user_name := v_user.full_name,
        p_stripe_customer_id := v_user.stripe_customer_id,
        p_stripe_subscription_id := v_user.stripe_subscription_id
      );

      -- Build subscription data JSON
      v_subscription_data := jsonb_build_object(
        'stripe_customer_id', v_user.stripe_customer_id,
        'stripe_subscription_id', v_user.stripe_subscription_id,
        'subscription_status', v_user.subscription_status,
        'subscription_tier', v_user.subscription_tier,
        'billing_interval', v_user.billing_interval,
        'current_period_start', v_user.current_period_start,
        'current_period_end', v_user.current_period_end,
        'trial_ends_at', v_user.trial_ends_at,
        'payment_method_id', v_user.payment_method_id,
        'payment_method_brand', v_user.payment_method_brand,
        'payment_method_last4', v_user.payment_method_last4
      );

      -- Migrate subscription data
      PERFORM migrate_user_subscription_to_org(
        p_user_id := COALESCE(v_user.clerk_user_id, v_user.id::TEXT),
        p_org_id := v_org_id,
        p_subscription_data := v_subscription_data
      );

      RAISE NOTICE 'Migrated user % to organization %', v_user.email, v_org_id;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to migrate user %: %', v_user.email, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Migration completed';
END $$;

-- ====================
-- 5. Verification Queries
-- ====================

-- Count migrated vs unmigrated users
DO $$
DECLARE
  v_total_users INTEGER;
  v_migrated_users INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    SELECT COUNT(*) INTO v_total_users FROM public.users;
    SELECT COUNT(*) INTO v_migrated_users FROM public.users WHERE migrated_to_org_billing = TRUE;

    RAISE NOTICE 'Total users: %', v_total_users;
    RAISE NOTICE 'Migrated users: %', v_migrated_users;
    RAISE NOTICE 'Remaining users: %', v_total_users - v_migrated_users;
  END IF;
END $$;

-- ====================
-- 6. Rollback Function (Emergency Use Only)
-- ====================
CREATE OR REPLACE FUNCTION rollback_org_migration()
RETURNS void AS $$
BEGIN
  -- WARNING: This will delete all organization data
  -- Only use if migration fails and you need to start over

  RAISE NOTICE 'Rolling back organization migration...';

  -- Delete all organization members
  DELETE FROM public.organization_members;

  -- Delete all organizations
  DELETE FROM public.organizations;

  -- Reset migration flags
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    UPDATE public.users
    SET
      migrated_to_org_billing = FALSE,
      org_migration_date = NULL,
      organization_id = NULL;
  END IF;

  RAISE NOTICE 'Rollback completed';
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 7. Post-Migration Cleanup (Optional - Run After Verification)
-- ====================
-- After verifying migration success, you can optionally drop old columns from users table
-- DO NOT RUN THIS IMMEDIATELY - Wait for production verification

/*
ALTER TABLE public.users
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS subscription_tier,
  DROP COLUMN IF EXISTS billing_interval,
  DROP COLUMN IF EXISTS current_period_start,
  DROP COLUMN IF EXISTS current_period_end,
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS payment_method_id,
  DROP COLUMN IF EXISTS payment_method_brand,
  DROP COLUMN IF EXISTS payment_method_last4;
*/
