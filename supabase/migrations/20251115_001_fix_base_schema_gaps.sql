-- =====================================================
-- Migration: Fix Base Schema Gaps (Idempotent Patch)
-- =====================================================
-- Priority: P0 - CRITICAL FIX
-- Issue: Base schema migration fails when tables exist with different schemas
-- Purpose: Add missing columns and create missing tables
-- Safe to run: Uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS patterns
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Fix subscriptions table - Add missing columns
-- =====================================================

-- Add stripe_customer_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_customer_id VARCHAR(255);
    RAISE NOTICE 'Added stripe_customer_id column to subscriptions table';
  ELSE
    RAISE NOTICE 'stripe_customer_id column already exists in subscriptions table';
  END IF;
END $$;

-- Add stripe_subscription_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN stripe_subscription_id VARCHAR(255);
    RAISE NOTICE 'Added stripe_subscription_id column to subscriptions table';
  ELSE
    RAISE NOTICE 'stripe_subscription_id column already exists in subscriptions table';
  END IF;
END $$;

-- Add current_period_start column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'current_period_start'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_start TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added current_period_start column to subscriptions table';
  ELSE
    RAISE NOTICE 'current_period_start column already exists in subscriptions table';
  END IF;
END $$;

-- Add current_period_end column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN current_period_end TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added current_period_end column to subscriptions table';
  ELSE
    RAISE NOTICE 'current_period_end column already exists in subscriptions table';
  END IF;
END $$;

-- Add cancel_at_period_end column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'cancel_at_period_end'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Added cancel_at_period_end column to subscriptions table';
  ELSE
    RAISE NOTICE 'cancel_at_period_end column already exists in subscriptions table';
  END IF;
END $$;

-- =====================================================
-- STEP 2: Create missing base tables (if not exist)
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bookmarks table if it doesn't exist
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, judge_id)
);

-- Create search_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table if it doesn't exist (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'attorney', 'admin')),
    phone VARCHAR(20),
    company VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create attorneys table if it doesn't exist
CREATE TABLE IF NOT EXISTS attorneys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bar_number VARCHAR(50),
    firm_name VARCHAR(255),
    specialty VARCHAR(100),
    years_experience INTEGER,
    cases_won INTEGER DEFAULT 0,
    cases_total INTEGER DEFAULT 0,
    rating DECIMAL(2,1) DEFAULT 0.0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create attorney_slots table if it doesn't exist
CREATE TABLE IF NOT EXISTS attorney_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judge_id UUID REFERENCES judges(id) ON DELETE CASCADE,
    attorney_id UUID REFERENCES attorneys(id) ON DELETE SET NULL,
    position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STEP 3: Create missing indexes (if not exist)
-- =====================================================

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);

-- Bookmarks indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_judge_id ON bookmarks(judge_id);

-- Search history indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);

-- Attorney slots indexes
CREATE INDEX IF NOT EXISTS idx_attorney_slots_judge_id ON attorney_slots(judge_id);
CREATE INDEX IF NOT EXISTS idx_attorney_slots_attorney_id ON attorney_slots(attorney_id);
CREATE INDEX IF NOT EXISTS idx_attorney_slots_active ON attorney_slots(is_active) WHERE is_active = TRUE;

-- =====================================================
-- STEP 4: Create helper functions if not exist
-- =====================================================

-- Create is_admin() helper function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin() IS
  'Helper function for RLS policies - checks if current user is an admin';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_subscriptions_has_stripe_customer BOOLEAN;
  v_tables_exist RECORD;
  v_missing_tables TEXT[] := ARRAY[]::TEXT[];
  v_required_tables TEXT[] := ARRAY['users', 'attorneys', 'attorney_slots', 'bookmarks', 'search_history', 'subscriptions'];
  v_table_name TEXT;
BEGIN
  -- Check if stripe_customer_id column now exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'stripe_customer_id'
  ) INTO v_subscriptions_has_stripe_customer;

  -- Check which required tables exist
  FOREACH v_table_name IN ARRAY v_required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = v_table_name
    ) THEN
      v_missing_tables := array_append(v_missing_tables, v_table_name);
    END IF;
  END LOOP;

  RAISE NOTICE '
  ============================================================================
  Base Schema Gaps Fix - Migration Complete
  ============================================================================

  Subscriptions Table:
  - stripe_customer_id column exists: %

  Required Tables Status:
  - users: %
  - attorneys: %
  - attorney_slots: %
  - bookmarks: %
  - search_history: %
  - subscriptions: %

  Missing tables: %

  Indexes Created:
  - All required indexes created or verified

  Helper Functions:
  - is_admin() created for RLS policies

  Next Step:
  - Apply RLS policies migration (20251024_complete_base_schema_rls_policies.sql)

  ============================================================================
  ',
  v_subscriptions_has_stripe_customer,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN '✓' ELSE '✗' END,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attorneys') THEN '✓' ELSE '✗' END,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attorney_slots') THEN '✓' ELSE '✗' END,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookmarks') THEN '✓' ELSE '✗' END,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'search_history') THEN '✓' ELSE '✗' END,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN '✓' ELSE '✗' END,
  CASE WHEN array_length(v_missing_tables, 1) IS NULL THEN 'None - All tables exist!' ELSE array_to_string(v_missing_tables, ', ') END;

  -- Fail if critical tables still missing
  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'Critical tables still missing after migration: %', array_to_string(v_missing_tables, ', ');
  END IF;

  -- Fail if stripe_customer_id still doesn't exist
  IF NOT v_subscriptions_has_stripe_customer THEN
    RAISE EXCEPTION 'stripe_customer_id column still missing from subscriptions table';
  END IF;

  RAISE NOTICE '✓ All base schema gaps fixed successfully!';
END $$;

COMMIT;
