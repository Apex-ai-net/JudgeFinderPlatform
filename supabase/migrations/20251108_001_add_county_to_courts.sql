-- Add county column to courts table for efficient filtering
-- This migration adds a county field to enable county-specific court searches

-- Add the county column
ALTER TABLE courts ADD COLUMN IF NOT EXISTS county VARCHAR(100);

-- Create an index for efficient county filtering
CREATE INDEX IF NOT EXISTS idx_courts_county ON courts(county) WHERE county IS NOT NULL;

-- Populate county data by extracting from address field
-- Match patterns like "Los Angeles County", "Los Angeles, CA", "County of Los Angeles"

-- Los Angeles County
UPDATE courts
SET county = 'Los Angeles'
WHERE county IS NULL
  AND (
    address ILIKE '%Los Angeles County%'
    OR address ILIKE '%Los Angeles, CA%'
    OR name ILIKE '%Los Angeles County%'
    OR name ILIKE '%County of Los Angeles%'
  );

-- Orange County
UPDATE courts
SET county = 'Orange'
WHERE county IS NULL
  AND (
    address ILIKE '%Orange County%'
    OR address ILIKE '%Orange, CA%'
    OR name ILIKE '%Orange County%'
    OR name ILIKE '%County of Orange%'
  );

-- San Diego County
UPDATE courts
SET county = 'San Diego'
WHERE county IS NULL
  AND (
    address ILIKE '%San Diego County%'
    OR address ILIKE '%San Diego, CA%'
    OR name ILIKE '%San Diego County%'
    OR name ILIKE '%County of San Diego%'
  );

-- San Francisco County
UPDATE courts
SET county = 'San Francisco'
WHERE county IS NULL
  AND (
    address ILIKE '%San Francisco County%'
    OR address ILIKE '%San Francisco, CA%'
    OR name ILIKE '%San Francisco County%'
    OR name ILIKE '%County of San Francisco%'
  );

-- Sacramento County
UPDATE courts
SET county = 'Sacramento'
WHERE county IS NULL
  AND (
    address ILIKE '%Sacramento County%'
    OR address ILIKE '%Sacramento, CA%'
    OR name ILIKE '%Sacramento County%'
    OR name ILIKE '%County of Sacramento%'
  );

-- Santa Clara County
UPDATE courts
SET county = 'Santa Clara'
WHERE county IS NULL
  AND (
    address ILIKE '%Santa Clara County%'
    OR address ILIKE '%Santa Clara, CA%'
    OR name ILIKE '%Santa Clara County%'
    OR name ILIKE '%County of Santa Clara%'
  );

-- Alameda County
UPDATE courts
SET county = 'Alameda'
WHERE county IS NULL
  AND (
    address ILIKE '%Alameda County%'
    OR address ILIKE '%Alameda, CA%'
    OR name ILIKE '%Alameda County%'
    OR name ILIKE '%County of Alameda%'
  );

-- Add comment to the column
COMMENT ON COLUMN courts.county IS 'County name for filtering courts by geographic location';
