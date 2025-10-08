-- Onboarding Analytics System
-- Tracks user onboarding progress, feature adoption, and engagement metrics

-- Create onboarding_analytics table
CREATE TABLE IF NOT EXISTS public.onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,

    -- Onboarding completion tracking
    onboarding_started_at TIMESTAMPTZ,
    onboarding_completed_at TIMESTAMPTZ,
    onboarding_step_completed INTEGER DEFAULT 0,
    onboarding_abandoned BOOLEAN DEFAULT FALSE,

    -- Feature adoption metrics
    first_search_at TIMESTAMPTZ,
    first_profile_view_at TIMESTAMPTZ,
    first_bookmark_at TIMESTAMPTZ,
    first_comparison_at TIMESTAMPTZ,
    first_export_at TIMESTAMPTZ,
    first_advanced_filter_at TIMESTAMPTZ,

    -- Usage counts
    total_searches INTEGER DEFAULT 0,
    total_profile_views INTEGER DEFAULT 0,
    total_bookmarks INTEGER DEFAULT 0,
    total_comparisons INTEGER DEFAULT 0,
    total_exports INTEGER DEFAULT 0,
    total_advanced_filters INTEGER DEFAULT 0,

    -- Tour completion tracking
    dashboard_tour_completed BOOLEAN DEFAULT FALSE,
    profile_tour_completed BOOLEAN DEFAULT FALSE,
    search_tour_completed BOOLEAN DEFAULT FALSE,
    comparison_tour_completed BOOLEAN DEFAULT FALSE,

    -- Engagement metrics
    days_since_signup INTEGER DEFAULT 0,
    days_active INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    session_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id
    ON public.onboarding_analytics(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_completed_at
    ON public.onboarding_analytics(onboarding_completed_at);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_abandoned
    ON public.onboarding_analytics(onboarding_abandoned)
    WHERE onboarding_abandoned = TRUE;

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created_at
    ON public.onboarding_analytics(created_at DESC);

-- Create function to update onboarding analytics
CREATE OR REPLACE FUNCTION public.update_onboarding_analytics()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Calculate days since signup
    IF NEW.created_at IS NOT NULL THEN
        NEW.days_since_signup = EXTRACT(DAY FROM (NOW() - NEW.created_at))::INTEGER;
    END IF;

    -- Check if onboarding is completed (basic criteria)
    IF NEW.first_search_at IS NOT NULL
       AND NEW.first_profile_view_at IS NOT NULL
       AND NEW.onboarding_completed_at IS NULL THEN
        NEW.onboarding_completed_at = NOW();
    END IF;

    -- Check if onboarding was abandoned (no activity after 7 days)
    IF NEW.onboarding_completed_at IS NULL
       AND NEW.last_active_at IS NOT NULL
       AND EXTRACT(DAY FROM (NOW() - NEW.last_active_at)) > 7 THEN
        NEW.onboarding_abandoned = TRUE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updates
DROP TRIGGER IF EXISTS trigger_update_onboarding_analytics ON public.onboarding_analytics;
CREATE TRIGGER trigger_update_onboarding_analytics
    BEFORE UPDATE ON public.onboarding_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_onboarding_analytics();

-- Create function to track feature usage
CREATE OR REPLACE FUNCTION public.track_feature_usage(
    p_user_id UUID,
    p_feature TEXT
)
RETURNS void AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Get or create analytics record
    INSERT INTO public.onboarding_analytics (user_id, last_active_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        last_active_at = NOW(),
        session_count = public.onboarding_analytics.session_count + 1
    RETURNING * INTO v_record;

    -- Update feature-specific metrics
    CASE p_feature
        WHEN 'search' THEN
            UPDATE public.onboarding_analytics
            SET total_searches = total_searches + 1,
                first_search_at = COALESCE(first_search_at, NOW())
            WHERE user_id = p_user_id;

        WHEN 'profile_view' THEN
            UPDATE public.onboarding_analytics
            SET total_profile_views = total_profile_views + 1,
                first_profile_view_at = COALESCE(first_profile_view_at, NOW())
            WHERE user_id = p_user_id;

        WHEN 'bookmark' THEN
            UPDATE public.onboarding_analytics
            SET total_bookmarks = total_bookmarks + 1,
                first_bookmark_at = COALESCE(first_bookmark_at, NOW())
            WHERE user_id = p_user_id;

        WHEN 'comparison' THEN
            UPDATE public.onboarding_analytics
            SET total_comparisons = total_comparisons + 1,
                first_comparison_at = COALESCE(first_comparison_at, NOW())
            WHERE user_id = p_user_id;

        WHEN 'export' THEN
            UPDATE public.onboarding_analytics
            SET total_exports = total_exports + 1,
                first_export_at = COALESCE(first_export_at, NOW())
            WHERE user_id = p_user_id;

        WHEN 'advanced_filter' THEN
            UPDATE public.onboarding_analytics
            SET total_advanced_filters = total_advanced_filters + 1,
                first_advanced_filter_at = COALESCE(first_advanced_filter_at, NOW())
            WHERE user_id = p_user_id;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get onboarding completion rate
CREATE OR REPLACE FUNCTION public.get_onboarding_completion_rate()
RETURNS TABLE (
    total_users BIGINT,
    completed_onboarding BIGINT,
    completion_rate NUMERIC,
    avg_time_to_complete INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_users,
        COUNT(onboarding_completed_at)::BIGINT AS completed_onboarding,
        ROUND((COUNT(onboarding_completed_at)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) AS completion_rate,
        AVG(onboarding_completed_at - created_at) AS avg_time_to_complete
    FROM public.onboarding_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create function to get feature adoption metrics
CREATE OR REPLACE FUNCTION public.get_feature_adoption_metrics()
RETURNS TABLE (
    feature TEXT,
    users_adopted BIGINT,
    adoption_rate NUMERIC,
    avg_time_to_adoption INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    WITH total_users AS (
        SELECT COUNT(*) AS count FROM public.onboarding_analytics
    )
    SELECT 'Search' AS feature,
           COUNT(first_search_at)::BIGINT AS users_adopted,
           ROUND((COUNT(first_search_at)::NUMERIC / NULLIF((SELECT count FROM total_users), 0)) * 100, 2) AS adoption_rate,
           AVG(first_search_at - created_at) AS avg_time_to_adoption
    FROM public.onboarding_analytics
    UNION ALL
    SELECT 'Profile View',
           COUNT(first_profile_view_at)::BIGINT,
           ROUND((COUNT(first_profile_view_at)::NUMERIC / NULLIF((SELECT count FROM total_users), 0)) * 100, 2),
           AVG(first_profile_view_at - created_at)
    FROM public.onboarding_analytics
    UNION ALL
    SELECT 'Bookmark',
           COUNT(first_bookmark_at)::BIGINT,
           ROUND((COUNT(first_bookmark_at)::NUMERIC / NULLIF((SELECT count FROM total_users), 0)) * 100, 2),
           AVG(first_bookmark_at - created_at)
    FROM public.onboarding_analytics
    UNION ALL
    SELECT 'Comparison',
           COUNT(first_comparison_at)::BIGINT,
           ROUND((COUNT(first_comparison_at)::NUMERIC / NULLIF((SELECT count FROM total_users), 0)) * 100, 2),
           AVG(first_comparison_at - created_at)
    FROM public.onboarding_analytics;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.onboarding_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own analytics
CREATE POLICY "Users can view own onboarding analytics"
    ON public.onboarding_analytics
    FOR SELECT
    USING (auth.uid()::text = user_id::text);

-- Service role can do everything
CREATE POLICY "Service role has full access to onboarding analytics"
    ON public.onboarding_analytics
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create view for product team dashboard
CREATE OR REPLACE VIEW public.onboarding_metrics_summary AS
SELECT
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS new_users,
    COUNT(onboarding_completed_at) AS completed_onboarding,
    COUNT(CASE WHEN onboarding_abandoned THEN 1 END) AS abandoned_onboarding,
    AVG(total_searches) AS avg_searches,
    AVG(total_profile_views) AS avg_profile_views,
    AVG(total_bookmarks) AS avg_bookmarks,
    AVG(EXTRACT(EPOCH FROM (first_search_at - created_at)) / 60) AS avg_minutes_to_first_search,
    AVG(EXTRACT(EPOCH FROM (onboarding_completed_at - created_at)) / 60) AS avg_minutes_to_completion
FROM public.onboarding_analytics
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.onboarding_analytics TO authenticated;
GRANT ALL ON public.onboarding_analytics TO service_role;
GRANT SELECT ON public.onboarding_metrics_summary TO authenticated;

-- Add comment
COMMENT ON TABLE public.onboarding_analytics IS 'Tracks user onboarding progress and feature adoption metrics for product analytics';
