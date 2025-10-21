-- Migration: Add User Roles and Professional Verification
-- Created: 2025-10-20
-- Description: Adds user_role field and bar verification for law professional advertisers

-- Add user_role column to app_users table (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'user_role'
  ) THEN
    ALTER TABLE app_users ADD COLUMN user_role TEXT NOT NULL DEFAULT 'user';
  END IF;
END $$;

-- Add bar verification columns for legal professionals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'bar_number'
  ) THEN
    ALTER TABLE app_users ADD COLUMN bar_number TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'bar_state'
  ) THEN
    ALTER TABLE app_users ADD COLUMN bar_state TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'bar_verified_at'
  ) THEN
    ALTER TABLE app_users ADD COLUMN bar_verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE app_users ADD COLUMN verification_status TEXT DEFAULT 'none';
  END IF;
END $$;

-- Create check constraint for user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'app_users_user_role_check'
  ) THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_user_role_check
      CHECK (user_role IN ('user', 'advertiser', 'admin'));
  END IF;
END $$;

-- Create check constraint for verification_status enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'app_users_verification_status_check'
  ) THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_verification_status_check
      CHECK (verification_status IN ('none', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

-- Create index for user_role for faster queries
CREATE INDEX IF NOT EXISTS idx_app_users_user_role ON app_users(user_role);

-- Create index for verification lookups
CREATE INDEX IF NOT EXISTS idx_app_users_bar_number ON app_users(bar_number) WHERE bar_number IS NOT NULL;

-- Add comment to explain the user_role field
COMMENT ON COLUMN app_users.user_role IS 'User role: user (default), advertiser (verified legal professional), admin';
COMMENT ON COLUMN app_users.bar_number IS 'State Bar number for legal professional verification';
COMMENT ON COLUMN app_users.bar_state IS 'State where the bar number is registered (e.g., CA, NY)';
COMMENT ON COLUMN app_users.bar_verified_at IS 'Timestamp when bar number was successfully verified';
COMMENT ON COLUMN app_users.verification_status IS 'Bar verification status: none, pending, verified, rejected';

-- Create function to automatically set advertiser role when bar is verified
CREATE OR REPLACE FUNCTION set_advertiser_role_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verification_status = 'verified' AND NEW.bar_verified_at IS NOT NULL THEN
    NEW.user_role := 'advertiser';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic role assignment
DROP TRIGGER IF EXISTS trigger_set_advertiser_role ON app_users;
CREATE TRIGGER trigger_set_advertiser_role
  BEFORE UPDATE ON app_users
  FOR EACH ROW
  WHEN (OLD.verification_status IS DISTINCT FROM NEW.verification_status)
  EXECUTE FUNCTION set_advertiser_role_on_verification();
