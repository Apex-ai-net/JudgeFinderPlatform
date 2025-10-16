-- Add id field to app_users table
-- The dashboard code expects an 'id' UUID field, but the table only has clerk_user_id as primary key
-- This migration adds the id field and updates existing records

-- Add the id column with a default UUID value
ALTER TABLE app_users
ADD COLUMN id UUID DEFAULT gen_random_uuid() NOT NULL;

-- Create a unique index on the id column
CREATE UNIQUE INDEX app_users_id_key ON app_users(id);

-- Update user_bookmarks to use the new id field
-- First, check if the column exists and if it needs to be changed
DO $$
BEGIN
  -- Check if user_bookmarks.user_id is text type (should be UUID)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_bookmarks'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    -- Drop RLS policies that depend on the user_id column
    DROP POLICY IF EXISTS "Users can manage their own bookmarks" ON user_bookmarks;
    DROP POLICY IF EXISTS "Users can view their own bookmarks" ON user_bookmarks;

    -- Add new column for UUID user_id
    ALTER TABLE user_bookmarks ADD COLUMN user_id_uuid UUID;

    -- Populate it by joining with app_users
    UPDATE user_bookmarks ub
    SET user_id_uuid = au.id
    FROM app_users au
    WHERE ub.user_id = au.clerk_user_id;

    -- Drop the old text column
    ALTER TABLE user_bookmarks DROP COLUMN user_id CASCADE;

    -- Rename the new column to user_id
    ALTER TABLE user_bookmarks RENAME COLUMN user_id_uuid TO user_id;

    -- Set it as NOT NULL
    ALTER TABLE user_bookmarks ALTER COLUMN user_id SET NOT NULL;

    -- Recreate RLS policies
    CREATE POLICY "Users can manage their own bookmarks" ON user_bookmarks
      FOR ALL
      USING (user_id IN (SELECT id FROM app_users WHERE clerk_user_id = auth.jwt() ->> 'sub'));
  END IF;
END $$;

-- Update user_activity to use the new id field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_activity'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    -- Drop RLS policies
    DROP POLICY IF EXISTS "Users can view their own activity" ON user_activity;
    DROP POLICY IF EXISTS "Users can manage their own activity" ON user_activity;

    ALTER TABLE user_activity ADD COLUMN user_id_uuid UUID;

    UPDATE user_activity ua
    SET user_id_uuid = au.id
    FROM app_users au
    WHERE ua.user_id = au.clerk_user_id;

    ALTER TABLE user_activity DROP COLUMN user_id CASCADE;
    ALTER TABLE user_activity RENAME COLUMN user_id_uuid TO user_id;
    ALTER TABLE user_activity ALTER COLUMN user_id SET NOT NULL;

    -- Recreate RLS policies
    CREATE POLICY "Users can view their own activity" ON user_activity
      FOR SELECT
      USING (user_id IN (SELECT id FROM app_users WHERE clerk_user_id = auth.jwt() ->> 'sub'));
  END IF;
END $$;

-- Update user_saved_searches to use the new id field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_saved_searches'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    -- Drop RLS policies
    DROP POLICY IF EXISTS "Users can view their own saved searches" ON user_saved_searches;
    DROP POLICY IF EXISTS "Users can manage their own saved searches" ON user_saved_searches;

    ALTER TABLE user_saved_searches ADD COLUMN user_id_uuid UUID;

    UPDATE user_saved_searches uss
    SET user_id_uuid = au.id
    FROM app_users au
    WHERE uss.user_id = au.clerk_user_id;

    ALTER TABLE user_saved_searches DROP COLUMN user_id CASCADE;
    ALTER TABLE user_saved_searches RENAME COLUMN user_id_uuid TO user_id;
    ALTER TABLE user_saved_searches ALTER COLUMN user_id SET NOT NULL;

    -- Recreate RLS policies
    CREATE POLICY "Users can manage their own saved searches" ON user_saved_searches
      FOR ALL
      USING (user_id IN (SELECT id FROM app_users WHERE clerk_user_id = auth.jwt() ->> 'sub'));
  END IF;
END $$;

-- Update user_preferences to use the new id field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    -- Drop RLS policies
    DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

    ALTER TABLE user_preferences ADD COLUMN user_id_uuid UUID;

    UPDATE user_preferences up
    SET user_id_uuid = au.id
    FROM app_users au
    WHERE up.user_id = au.clerk_user_id;

    ALTER TABLE user_preferences DROP COLUMN user_id CASCADE;
    ALTER TABLE user_preferences RENAME COLUMN user_id_uuid TO user_id;
    ALTER TABLE user_preferences ALTER COLUMN user_id SET NOT NULL;

    -- Recreate the unique constraint
    ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);

    -- Recreate RLS policies
    CREATE POLICY "Users can manage their own preferences" ON user_preferences
      FOR ALL
      USING (user_id IN (SELECT id FROM app_users WHERE clerk_user_id = auth.jwt() ->> 'sub'));
  END IF;
END $$;

-- Update user_notifications to use the new id field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_notifications'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    -- Drop RLS policies
    DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
    DROP POLICY IF EXISTS "Users can manage their own notifications" ON user_notifications;

    ALTER TABLE user_notifications ADD COLUMN user_id_uuid UUID;

    UPDATE user_notifications un
    SET user_id_uuid = au.id
    FROM app_users au
    WHERE un.user_id = au.clerk_user_id;

    ALTER TABLE user_notifications DROP COLUMN user_id CASCADE;
    ALTER TABLE user_notifications RENAME COLUMN user_id_uuid TO user_id;
    ALTER TABLE user_notifications ALTER COLUMN user_id SET NOT NULL;

    -- Recreate RLS policies
    CREATE POLICY "Users can manage their own notifications" ON user_notifications
      FOR ALL
      USING (user_id IN (SELECT id FROM app_users WHERE clerk_user_id = auth.jwt() ->> 'sub'));
  END IF;
END $$;

-- Add foreign key constraints
ALTER TABLE user_bookmarks
ADD CONSTRAINT user_bookmarks_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

ALTER TABLE user_activity
ADD CONSTRAINT user_activity_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

ALTER TABLE user_saved_searches
ADD CONSTRAINT user_saved_searches_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

ALTER TABLE user_preferences
ADD CONSTRAINT user_preferences_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

ALTER TABLE user_notifications
ADD CONSTRAINT user_notifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS user_bookmarks_user_id_idx ON user_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS user_saved_searches_user_id_idx ON user_saved_searches(user_id);
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS user_notifications_user_id_idx ON user_notifications(user_id);

-- Add comment to explain the change
COMMENT ON COLUMN app_users.id IS 'UUID primary key for internal references. Use clerk_user_id for Clerk authentication mapping.';
