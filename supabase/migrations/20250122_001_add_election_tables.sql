-- ========================================
-- JUDICIAL ELECTION AND POLITICAL AFFILIATION TRACKING
-- Migration: 20250122_001_add_election_tables.sql
-- ========================================
-- This migration adds comprehensive election tracking and political affiliation
-- data for judges, supporting various election types, competitive races, and
-- historical political party affiliations.
--
-- Key Features:
-- 1. Track all types of judicial elections (initial, retention, competitive)
-- 2. Store opponent data for contested races
-- 3. Maintain political party affiliation history
-- 4. Support California's retention election system
-- 5. Enable efficient querying with proper indexes
-- ========================================

-- ========================================
-- SECTION 1: CREATE ENUM TYPES
-- ========================================

-- Election type enumeration
-- Covers all major judicial selection/election methods in the US
DO $$ BEGIN
    CREATE TYPE election_type AS ENUM (
        'initial_election',      -- First election to the position
        'retention',             -- Retention election (yes/no vote, common in CA)
        'competitive',           -- Contested election with multiple candidates
        'general',               -- General election
        'primary',               -- Primary election
        'recall',                -- Recall election
        'special',               -- Special election to fill vacancy
        'reelection'             -- Standard reelection campaign
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE election_type IS 'Types of judicial elections including initial elections, retention votes, and competitive races';

-- Selection method enumeration for judges
-- Describes how a judge initially obtained their position
DO $$ BEGIN
    CREATE TYPE selection_method AS ENUM (
        'elected',               -- Directly elected by voters
        'appointed',             -- Appointed by executive (governor, president)
        'merit_selection',       -- Missouri Plan / merit-based appointment
        'retention',             -- Subject to retention elections
        'legislative',           -- Appointed by legislature
        'mixed',                 -- Combination of methods (e.g., appointed then retention)
        'unknown'                -- Method not yet determined
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE selection_method IS 'Method by which a judge was selected to their position';

-- Political party enumeration
-- Standard US political parties plus common state-level parties
DO $$ BEGIN
    CREATE TYPE political_party AS ENUM (
        'democratic',
        'republican',
        'independent',
        'libertarian',
        'green',
        'constitution',
        'american_independent',  -- Common in California
        'peace_and_freedom',     -- California
        'no_party_preference',   -- Nonpartisan
        'nonpartisan',           -- No party affiliation
        'other',                 -- Other registered parties
        'unknown'                -- Party not disclosed/known
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE political_party IS 'Political party affiliations for judges';

-- ========================================
-- SECTION 2: MODIFY JUDGES TABLE
-- ========================================

-- Add election-related fields to existing judges table
DO $$ BEGIN
    -- Selection method for the judge
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'judges' AND column_name = 'selection_method'
    ) THEN
        ALTER TABLE judges ADD COLUMN selection_method selection_method DEFAULT 'unknown';
    END IF;

    -- Current term end date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'judges' AND column_name = 'current_term_end_date'
    ) THEN
        ALTER TABLE judges ADD COLUMN current_term_end_date DATE;
    END IF;

    -- Next scheduled election date
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'judges' AND column_name = 'next_election_date'
    ) THEN
        ALTER TABLE judges ADD COLUMN next_election_date DATE;
    END IF;

    -- Boolean flag for quick filtering of elected judges
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'judges' AND column_name = 'is_elected'
    ) THEN
        ALTER TABLE judges ADD COLUMN is_elected BOOLEAN DEFAULT FALSE;
    END IF;

    -- Current political party affiliation (denormalized for performance)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'judges' AND column_name = 'current_political_party'
    ) THEN
        ALTER TABLE judges ADD COLUMN current_political_party political_party DEFAULT 'unknown';
    END IF;
END $$;

-- Add indexes for the new judge fields
CREATE INDEX IF NOT EXISTS idx_judges_selection_method ON judges(selection_method);
CREATE INDEX IF NOT EXISTS idx_judges_is_elected ON judges(is_elected) WHERE is_elected = TRUE;
CREATE INDEX IF NOT EXISTS idx_judges_next_election_date ON judges(next_election_date) WHERE next_election_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_judges_current_term_end ON judges(current_term_end_date) WHERE current_term_end_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_judges_political_party ON judges(current_political_party);

-- Add comments for new columns
COMMENT ON COLUMN judges.selection_method IS 'Method by which the judge was initially selected to their position';
COMMENT ON COLUMN judges.current_term_end_date IS 'Date when the judge''s current term expires';
COMMENT ON COLUMN judges.next_election_date IS 'Date of the next scheduled election (retention or competitive)';
COMMENT ON COLUMN judges.is_elected IS 'Quick filter flag: TRUE if judge is elected (vs appointed)';
COMMENT ON COLUMN judges.current_political_party IS 'Current political party affiliation (denormalized for performance)';

-- ========================================
-- SECTION 3: CREATE JUDGE_ELECTIONS TABLE
-- ========================================

-- Core table for tracking all judicial elections
CREATE TABLE IF NOT EXISTS judge_elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to judge
    judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,

    -- Election identification
    election_type election_type NOT NULL,
    election_date DATE NOT NULL,
    election_name VARCHAR(255),  -- e.g., "2020 General Election", "June 2022 Primary"

    -- Location/jurisdiction
    jurisdiction VARCHAR(255),    -- e.g., "California", "Los Angeles County"
    district VARCHAR(255),        -- e.g., "District 2", "Central District"

    -- Election results
    won BOOLEAN,                  -- TRUE if judge won/retained, FALSE if lost, NULL if pending
    vote_count INTEGER,           -- Total votes received by judge
    vote_percentage DECIMAL(5,2), -- Percentage of votes (0.00 to 100.00)
    total_votes_cast INTEGER,     -- Total votes in the race

    -- For retention elections (yes/no votes)
    yes_votes INTEGER,            -- Votes to retain
    no_votes INTEGER,             -- Votes to remove
    retention_threshold DECIMAL(5,2), -- Minimum % needed to retain (often 50%)

    -- Term information
    term_start_date DATE,         -- When this term began/will begin
    term_end_date DATE,           -- When this term ends/will end
    term_length_years INTEGER,    -- Length of term in years (e.g., 6, 8, 10)

    -- Electoral context
    is_incumbent BOOLEAN DEFAULT FALSE,  -- Was the judge the incumbent?
    is_contested BOOLEAN DEFAULT FALSE,  -- Was there opposition?
    opponent_count INTEGER DEFAULT 0,    -- Number of opponents

    -- Source and provenance
    source_name VARCHAR(255),     -- e.g., "Secretary of State", "County Clerk"
    source_url TEXT,              -- URL to official election results
    source_date DATE,             -- When this data was obtained

    -- Metadata
    notes TEXT,                   -- Additional context or notes
    verified BOOLEAN DEFAULT FALSE, -- Data verified by admin

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for judge_elections
CREATE INDEX IF NOT EXISTS idx_judge_elections_judge_id ON judge_elections(judge_id);
CREATE INDEX IF NOT EXISTS idx_judge_elections_election_date ON judge_elections(election_date DESC);
CREATE INDEX IF NOT EXISTS idx_judge_elections_election_type ON judge_elections(election_type);
CREATE INDEX IF NOT EXISTS idx_judge_elections_jurisdiction ON judge_elections(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_judge_elections_won ON judge_elections(won) WHERE won IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_judge_elections_contested ON judge_elections(is_contested) WHERE is_contested = TRUE;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_judge_elections_judge_date ON judge_elections(judge_id, election_date DESC);
CREATE INDEX IF NOT EXISTS idx_judge_elections_type_date ON judge_elections(election_type, election_date DESC);
CREATE INDEX IF NOT EXISTS idx_judge_elections_jurisdiction_date ON judge_elections(jurisdiction, election_date DESC);

-- Comments
COMMENT ON TABLE judge_elections IS 'Tracks all judicial elections including initial elections, retention votes, and competitive races';
COMMENT ON COLUMN judge_elections.election_type IS 'Type of election (initial, retention, competitive, etc.)';
COMMENT ON COLUMN judge_elections.won IS 'TRUE if won/retained, FALSE if lost, NULL if pending';
COMMENT ON COLUMN judge_elections.vote_percentage IS 'Percentage of votes received (0.00 to 100.00)';
COMMENT ON COLUMN judge_elections.yes_votes IS 'For retention elections: votes to retain the judge';
COMMENT ON COLUMN judge_elections.no_votes IS 'For retention elections: votes to remove the judge';
COMMENT ON COLUMN judge_elections.retention_threshold IS 'Minimum percentage needed to be retained (typically 50%)';
COMMENT ON COLUMN judge_elections.is_contested IS 'TRUE if there were opponents in the race';
COMMENT ON COLUMN judge_elections.source_name IS 'Source of election data (e.g., Secretary of State)';

-- ========================================
-- SECTION 4: CREATE JUDGE_ELECTION_OPPONENTS TABLE
-- ========================================

-- Track opponents in contested judicial elections
CREATE TABLE IF NOT EXISTS judge_election_opponents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to election
    election_id UUID NOT NULL REFERENCES judge_elections(id) ON DELETE CASCADE,

    -- Opponent information
    opponent_name VARCHAR(255) NOT NULL,
    opponent_party political_party,

    -- Results for this opponent
    vote_count INTEGER,
    vote_percentage DECIMAL(5,2),

    -- Additional context
    is_incumbent BOOLEAN DEFAULT FALSE,
    occupation VARCHAR(255),      -- e.g., "Attorney", "Public Defender"
    background TEXT,              -- Brief background on opponent

    -- Source
    source_url TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate opponents in same election
    UNIQUE(election_id, opponent_name)
);

-- Indexes for judge_election_opponents
CREATE INDEX IF NOT EXISTS idx_election_opponents_election_id ON judge_election_opponents(election_id);
CREATE INDEX IF NOT EXISTS idx_election_opponents_name ON judge_election_opponents(opponent_name);
CREATE INDEX IF NOT EXISTS idx_election_opponents_party ON judge_election_opponents(opponent_party);

-- Comments
COMMENT ON TABLE judge_election_opponents IS 'Tracks opponents in contested judicial elections';
COMMENT ON COLUMN judge_election_opponents.opponent_name IS 'Name of the opponent candidate';
COMMENT ON COLUMN judge_election_opponents.opponent_party IS 'Political party of the opponent';
COMMENT ON COLUMN judge_election_opponents.vote_percentage IS 'Percentage of votes received by opponent';

-- ========================================
-- SECTION 5: CREATE JUDGE_POLITICAL_AFFILIATIONS TABLE
-- ========================================

-- Track historical and current political party affiliations
CREATE TABLE IF NOT EXISTS judge_political_affiliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to judge
    judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,

    -- Party affiliation
    political_party political_party NOT NULL,

    -- Time period of affiliation
    start_date DATE NOT NULL,     -- When affiliation began
    end_date DATE,                -- When affiliation ended (NULL if current)
    is_current BOOLEAN DEFAULT FALSE, -- TRUE if this is the current affiliation

    -- Source and verification
    source_name VARCHAR(255),     -- e.g., "Voter Registration Records"
    source_url TEXT,
    source_date DATE,             -- When this information was obtained
    verified BOOLEAN DEFAULT FALSE,

    -- Additional context
    registration_type VARCHAR(100), -- e.g., "Registered Voter", "Public Statement"
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Only one current affiliation per judge
    CONSTRAINT check_current_dates CHECK (
        (is_current = TRUE AND end_date IS NULL) OR
        (is_current = FALSE AND end_date IS NOT NULL) OR
        (is_current = FALSE AND end_date IS NULL)
    )
);

-- Indexes for judge_political_affiliations
CREATE INDEX IF NOT EXISTS idx_political_affiliations_judge_id ON judge_political_affiliations(judge_id);
CREATE INDEX IF NOT EXISTS idx_political_affiliations_party ON judge_political_affiliations(political_party);
CREATE INDEX IF NOT EXISTS idx_political_affiliations_current ON judge_political_affiliations(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_political_affiliations_dates ON judge_political_affiliations(start_date, end_date);

-- Composite index for finding current affiliation
CREATE INDEX IF NOT EXISTS idx_political_affiliations_judge_current ON judge_political_affiliations(judge_id, is_current) WHERE is_current = TRUE;

-- Comments
COMMENT ON TABLE judge_political_affiliations IS 'Tracks historical and current political party affiliations for judges';
COMMENT ON COLUMN judge_political_affiliations.is_current IS 'TRUE if this is the judge''s current party affiliation';
COMMENT ON COLUMN judge_political_affiliations.end_date IS 'NULL if affiliation is current, otherwise date when it ended';
COMMENT ON COLUMN judge_political_affiliations.registration_type IS 'How this affiliation was determined (voter registration, public statement, etc.)';

-- ========================================
-- SECTION 6: CREATE TRIGGERS
-- ========================================

-- Trigger function to update judges.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers to all new tables
DROP TRIGGER IF EXISTS update_judge_elections_updated_at ON judge_elections;
CREATE TRIGGER update_judge_elections_updated_at
    BEFORE UPDATE ON judge_elections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_election_opponents_updated_at ON judge_election_opponents;
CREATE TRIGGER update_election_opponents_updated_at
    BEFORE UPDATE ON judge_election_opponents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_political_affiliations_updated_at ON judge_political_affiliations;
CREATE TRIGGER update_political_affiliations_updated_at
    BEFORE UPDATE ON judge_political_affiliations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- SECTION 7: HELPER FUNCTIONS
-- ========================================

-- Function to get the most recent election for a judge
CREATE OR REPLACE FUNCTION get_latest_election(judge_uuid UUID)
RETURNS TABLE (
    election_id UUID,
    election_date DATE,
    election_type election_type,
    won BOOLEAN,
    vote_percentage DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        je.id,
        je.election_date,
        je.election_type,
        je.won,
        je.vote_percentage
    FROM judge_elections je
    WHERE je.judge_id = judge_uuid
    ORDER BY je.election_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_latest_election IS 'Returns the most recent election record for a given judge';

-- Function to get current political affiliation
CREATE OR REPLACE FUNCTION get_current_political_affiliation(judge_uuid UUID)
RETURNS political_party AS $$
DECLARE
    current_party political_party;
BEGIN
    SELECT political_party INTO current_party
    FROM judge_political_affiliations
    WHERE judge_id = judge_uuid
      AND is_current = TRUE
    LIMIT 1;

    RETURN COALESCE(current_party, 'unknown'::political_party);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_current_political_affiliation IS 'Returns the current political party affiliation for a judge';

-- Function to calculate retention election pass rate
CREATE OR REPLACE FUNCTION calculate_retention_rate(judge_uuid UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    retention_rate DECIMAL(5,2);
BEGIN
    SELECT AVG(
        CASE
            WHEN yes_votes IS NOT NULL AND (yes_votes + no_votes) > 0
            THEN (yes_votes::DECIMAL / (yes_votes + no_votes)) * 100
            ELSE NULL
        END
    ) INTO retention_rate
    FROM judge_elections
    WHERE judge_id = judge_uuid
      AND election_type = 'retention'
      AND yes_votes IS NOT NULL;

    RETURN COALESCE(retention_rate, 0.0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_retention_rate IS 'Calculates average retention election approval rate for a judge';

-- Function to sync current political party to judges table
-- This keeps the denormalized field in sync
CREATE OR REPLACE FUNCTION sync_judge_political_party()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is now the current affiliation, update judges table
    IF NEW.is_current = TRUE THEN
        UPDATE judges
        SET current_political_party = NEW.political_party
        WHERE id = NEW.judge_id;

        -- Set all other affiliations for this judge to not current
        UPDATE judge_political_affiliations
        SET is_current = FALSE
        WHERE judge_id = NEW.judge_id
          AND id != NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to sync political party
DROP TRIGGER IF EXISTS sync_political_party_to_judge ON judge_political_affiliations;
CREATE TRIGGER sync_political_party_to_judge
    AFTER INSERT OR UPDATE ON judge_political_affiliations
    FOR EACH ROW
    WHEN (NEW.is_current = TRUE)
    EXECUTE FUNCTION sync_judge_political_party();

-- ========================================
-- SECTION 8: ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all new tables
ALTER TABLE judge_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_election_opponents ENABLE ROW LEVEL SECURITY;
ALTER TABLE judge_political_affiliations ENABLE ROW LEVEL SECURITY;

-- Public read access for all users (election data is public record)
CREATE POLICY "Public read access for elections" ON judge_elections
    FOR SELECT USING (true);

CREATE POLICY "Public read access for opponents" ON judge_election_opponents
    FOR SELECT USING (true);

CREATE POLICY "Public read access for political affiliations" ON judge_political_affiliations
    FOR SELECT USING (true);

-- Only admins can insert/update/delete
-- Note: You'll need to adjust this based on your actual admin role detection
CREATE POLICY "Admin write access for elections" ON judge_elections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin write access for opponents" ON judge_election_opponents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

CREATE POLICY "Admin write access for political affiliations" ON judge_political_affiliations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- ========================================
-- SECTION 9: SAMPLE DATA COMMENTS
-- ========================================

-- Example usage for inserting election data:
--
-- INSERT INTO judge_elections (
--     judge_id, election_type, election_date, election_name,
--     jurisdiction, won, yes_votes, no_votes, retention_threshold,
--     term_start_date, term_end_date, term_length_years,
--     is_incumbent, is_contested, source_name, source_url
-- ) VALUES (
--     'uuid-of-judge',
--     'retention',
--     '2022-11-08',
--     '2022 General Election',
--     'California',
--     true,
--     4567890,
--     2345678,
--     50.00,
--     '2023-01-01',
--     '2035-01-01',
--     12,
--     true,
--     false,
--     'California Secretary of State',
--     'https://elections.cdn.sos.ca.gov/...'
-- );
--
-- Example for competitive election with opponents:
--
-- WITH new_election AS (
--     INSERT INTO judge_elections (
--         judge_id, election_type, election_date, won,
--         vote_count, vote_percentage, total_votes_cast,
--         is_contested, opponent_count
--     ) VALUES (
--         'uuid-of-judge',
--         'competitive',
--         '2020-11-03',
--         true,
--         125000,
--         55.23,
--         226400,
--         true,
--         2
--     ) RETURNING id
-- )
-- INSERT INTO judge_election_opponents (election_id, opponent_name, vote_count, vote_percentage)
-- SELECT id, 'Jane Smith', 85000, 37.54 FROM new_election
-- UNION ALL
-- SELECT id, 'Bob Johnson', 16400, 7.23 FROM new_election;

-- ========================================
-- END OF MIGRATION
-- ========================================
