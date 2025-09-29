-- Create user_push_tokens table for iOS push notification tokens
-- Stores APNs device tokens for sending push notifications

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_info JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one token per user per device
  UNIQUE(user_id, token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_active ON user_push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_platform ON user_push_tokens(platform);

-- Enable Row Level Security
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own tokens
CREATE POLICY "Users can view own push tokens"
  ON user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON user_push_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON user_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (for admin operations)
CREATE POLICY "Service role full access"
  ON user_push_tokens
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Add helpful comment
COMMENT ON TABLE user_push_tokens IS 'Stores push notification device tokens for iOS, Android, and Web Push';
COMMENT ON COLUMN user_push_tokens.token IS 'APNs/FCM/Web Push device token';
COMMENT ON COLUMN user_push_tokens.device_info IS 'Device metadata: version, build, model, etc.';
COMMENT ON COLUMN user_push_tokens.is_active IS 'Whether this token is currently active for notifications';
