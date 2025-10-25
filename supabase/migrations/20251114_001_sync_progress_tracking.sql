-- Migration: Sync Progress Tracking Table
-- Purpose: Track completeness of judge data sync from CourtListener
-- Date: 2025-10-24

-- Create sync_progress table to track which judges have complete data
CREATE TABLE IF NOT EXISTS sync_progress (
  id BIGSERIAL PRIMARY KEY,
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,

  -- Data completeness flags
  has_positions BOOLEAN DEFAULT FALSE,
  has_education BOOLEAN DEFAULT FALSE,
  has_political_affiliations BOOLEAN DEFAULT FALSE,

  -- Case data counts
  opinions_count INTEGER DEFAULT 0,
  dockets_count INTEGER DEFAULT 0,
  total_cases_count INTEGER DEFAULT 0,

  -- Sync status
  is_complete BOOLEAN DEFAULT FALSE,
  is_analytics_ready BOOLEAN DEFAULT FALSE, -- TRUE if total_cases_count >= 500

  -- Timestamps
  positions_synced_at TIMESTAMP WITH TIME ZONE,
  education_synced_at TIMESTAMP WITH TIME ZONE,
  political_affiliations_synced_at TIMESTAMP WITH TIME ZONE,
  opinions_synced_at TIMESTAMP WITH TIME ZONE,
  dockets_synced_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Metadata
  sync_phase VARCHAR(50), -- 'discovery', 'details', 'opinions', 'dockets', 'complete'
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one progress record per judge
  CONSTRAINT sync_progress_judge_unique UNIQUE (judge_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_sync_progress_judge_id ON sync_progress(judge_id);
CREATE INDEX idx_sync_progress_is_complete ON sync_progress(is_complete);
CREATE INDEX idx_sync_progress_is_analytics_ready ON sync_progress(is_analytics_ready);
CREATE INDEX idx_sync_progress_sync_phase ON sync_progress(sync_phase);
CREATE INDEX idx_sync_progress_last_synced ON sync_progress(last_synced_at);

-- Create composite index for finding incomplete judges
CREATE INDEX idx_sync_progress_incomplete ON sync_progress(is_complete, sync_phase)
  WHERE is_complete = FALSE;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();

  -- Auto-calculate is_complete
  NEW.is_complete = (
    NEW.has_positions = TRUE AND
    NEW.has_education = TRUE AND
    NEW.has_political_affiliations = TRUE AND
    NEW.opinions_count > 0 AND
    NEW.dockets_count > 0
  );

  -- Auto-calculate is_analytics_ready (500+ cases required)
  NEW.is_analytics_ready = (NEW.total_cases_count >= 500);

  -- Update sync_phase based on completeness
  IF NEW.is_complete THEN
    NEW.sync_phase = 'complete';
  ELSIF NEW.dockets_count > 0 THEN
    NEW.sync_phase = 'dockets';
  ELSIF NEW.opinions_count > 0 THEN
    NEW.sync_phase = 'opinions';
  ELSIF NEW.has_education OR NEW.has_political_affiliations THEN
    NEW.sync_phase = 'details';
  ELSIF NEW.has_positions THEN
    NEW.sync_phase = 'positions';
  ELSE
    NEW.sync_phase = 'discovery';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sync_progress_updated_at
  BEFORE UPDATE ON sync_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_progress_updated_at();

-- Create trigger for insert as well
CREATE TRIGGER trigger_insert_sync_progress_updated_at
  BEFORE INSERT ON sync_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_progress_updated_at();

-- Create view for easy progress monitoring
CREATE OR REPLACE VIEW sync_progress_summary AS
SELECT
  COUNT(*) as total_judges,
  COUNT(*) FILTER (WHERE is_complete = TRUE) as complete_judges,
  COUNT(*) FILTER (WHERE is_analytics_ready = TRUE) as analytics_ready_judges,
  COUNT(*) FILTER (WHERE has_positions = TRUE) as judges_with_positions,
  COUNT(*) FILTER (WHERE has_education = TRUE) as judges_with_education,
  COUNT(*) FILTER (WHERE has_political_affiliations = TRUE) as judges_with_affiliations,
  COUNT(*) FILTER (WHERE opinions_count > 0) as judges_with_opinions,
  COUNT(*) FILTER (WHERE dockets_count > 0) as judges_with_dockets,
  AVG(opinions_count) as avg_opinions_per_judge,
  AVG(dockets_count) as avg_dockets_per_judge,
  AVG(total_cases_count) as avg_total_cases_per_judge,
  COUNT(*) FILTER (WHERE sync_phase = 'discovery') as in_discovery_phase,
  COUNT(*) FILTER (WHERE sync_phase = 'positions') as in_positions_phase,
  COUNT(*) FILTER (WHERE sync_phase = 'details') as in_details_phase,
  COUNT(*) FILTER (WHERE sync_phase = 'opinions') as in_opinions_phase,
  COUNT(*) FILTER (WHERE sync_phase = 'dockets') as in_dockets_phase,
  COUNT(*) FILTER (WHERE sync_phase = 'complete') as in_complete_phase,
  COUNT(*) FILTER (WHERE error_count > 0) as judges_with_errors,
  MAX(last_synced_at) as most_recent_sync,
  MIN(last_synced_at) as oldest_sync
FROM sync_progress;

-- Create RLS policies (allow admin access only)
ALTER TABLE sync_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY sync_progress_service_role_all ON sync_progress
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Policy: Allow authenticated admins to read
CREATE POLICY sync_progress_admin_read ON sync_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.clerk_user_id = auth.jwt() ->> 'sub'
      AND app_users.is_admin = TRUE
    )
  );

-- Add helpful comments
COMMENT ON TABLE sync_progress IS 'Tracks data completeness for each judge synced from CourtListener';
COMMENT ON COLUMN sync_progress.is_analytics_ready IS 'TRUE when judge has 500+ cases required for bias analytics';
COMMENT ON COLUMN sync_progress.sync_phase IS 'Current phase: discovery, positions, details, opinions, dockets, complete';
COMMENT ON VIEW sync_progress_summary IS 'Aggregated statistics for sync progress monitoring';

-- Grant permissions
GRANT SELECT ON sync_progress TO authenticated;
GRANT SELECT ON sync_progress_summary TO authenticated;
GRANT ALL ON sync_progress TO service_role;
GRANT ALL ON sync_progress_summary TO service_role;
