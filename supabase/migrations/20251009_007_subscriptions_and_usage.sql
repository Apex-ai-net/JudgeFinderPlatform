-- ==============================================
-- Subscriptions and Usage Quotas
-- ==============================================
-- Creates user subscriptions (Pro/Team) and per-feature usage quotas
-- Enforces RLS: users can only view their own rows; service_role has full access

-- Subscriptions table: ties Clerk users (app_users) to Stripe subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.app_users(clerk_user_id) ON DELETE CASCADE,
    plan TEXT NOT NULL CHECK (plan IN ('free','pro','team')),
    status TEXT NOT NULL CHECK (status IN (
        'trialing','active','past_due','canceled','unpaid','incomplete','incomplete_expired','paused'
    )) DEFAULT 'active',
    seat_count INTEGER NOT NULL DEFAULT 1 CHECK (seat_count >= 1),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uniq_active_subscription UNIQUE (user_id)
);

-- Usage quotas: rolling usage windows (commonly daily or monthly)
CREATE TABLE IF NOT EXISTS public.usage_quota (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.app_users(clerk_user_id) ON DELETE CASCADE,
    feature TEXT NOT NULL CHECK (feature IN ('search','analytics','bias_analysis','export','api_requests')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    limit_count INTEGER NOT NULL CHECK (limit_count >= 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    last_reset TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT usage_quota_unique UNIQUE (user_id, feature, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);

CREATE INDEX IF NOT EXISTS idx_usage_quota_user ON public.usage_quota(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_quota_feature ON public.usage_quota(feature);
CREATE INDEX IF NOT EXISTS idx_usage_quota_period ON public.usage_quota(period_start, period_end);

-- updated_at triggers
CREATE TRIGGER trg_subscriptions_updated
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_usage_quota_updated
    BEFORE UPDATE ON public.usage_quota
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_quota ENABLE ROW LEVEL SECURITY;

-- Service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY service_role_all ON public.subscriptions FOR ALL USING (auth.jwt()->>''role'' = ''service_role'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_quota' AND policyname='service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY service_role_all ON public.usage_quota FOR ALL USING (auth.jwt()->>''role'' = ''service_role'')';
  END IF;
END $$;

-- Users can read their own records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='user_read_own'
  ) THEN
    EXECUTE 'CREATE POLICY user_read_own ON public.subscriptions FOR SELECT USING (user_id = auth.jwt()->>''sub'')';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_quota' AND policyname='user_read_own'
  ) THEN
    EXECUTE 'CREATE POLICY user_read_own ON public.usage_quota FOR SELECT USING (user_id = auth.jwt()->>''sub'')';
  END IF;
END $$;

-- Users cannot insert/update directly; updates are managed server-side via service_role
-- Optional: allow users to update their own usage counters in specific RPC patterns (not enabled here)

COMMENT ON TABLE public.subscriptions IS 'User subscription state synchronized with Stripe';
COMMENT ON COLUMN public.subscriptions.plan IS 'free|pro|team';
COMMENT ON TABLE public.usage_quota IS 'Feature usage counters per user and period';


