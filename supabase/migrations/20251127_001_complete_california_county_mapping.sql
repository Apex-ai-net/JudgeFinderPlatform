-- ========================================
-- COMPLETE CALIFORNIA COUNTY MAPPING
-- ========================================
-- This migration ensures accurate county assignments for ALL California courts:
-- - 58 California county Superior Courts
-- - 6 California Courts of Appeal (mapped to their headquarters counties)
-- - California Supreme Court (San Francisco)
-- - Federal courts in California (mapped to counties they serve)

-- First, ensure the county column exists
ALTER TABLE courts ADD COLUMN IF NOT EXISTS county VARCHAR(100);

-- Create an index for efficient county filtering if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_courts_county ON courts(county) WHERE county IS NOT NULL;

-- ========================================
-- SECTION 1: 58 CALIFORNIA COUNTY SUPERIOR COURTS
-- ========================================
-- These are the trial courts of general jurisdiction in California
-- Pattern matching on court name and address

-- Reset county assignments to start fresh for California courts
UPDATE courts
SET county = NULL
WHERE (
  name ILIKE '%California%' OR
  name ILIKE '%Superior Court%' OR
  address ILIKE '%, CA%' OR
  jurisdiction = 'CA'
);

-- Alameda County
UPDATE courts
SET county = 'Alameda'
WHERE county IS NULL
  AND (
    name ILIKE '%Alameda%Superior%'
    OR name ILIKE '%Superior%Alameda%'
    OR name ILIKE '%County of Alameda%'
    OR address ILIKE '%Alameda County%'
    OR address ILIKE '%Oakland, CA%'
    OR address ILIKE '%Fremont, CA%'
    OR address ILIKE '%Berkeley, CA%'
    OR address ILIKE '%Hayward, CA%'
  );

-- Alpine County
UPDATE courts
SET county = 'Alpine'
WHERE county IS NULL
  AND (
    name ILIKE '%Alpine%Superior%'
    OR name ILIKE '%Superior%Alpine%'
    OR name ILIKE '%County of Alpine%'
    OR address ILIKE '%Alpine County%'
    OR address ILIKE '%Markleeville, CA%'
  );

-- Amador County
UPDATE courts
SET county = 'Amador'
WHERE county IS NULL
  AND (
    name ILIKE '%Amador%Superior%'
    OR name ILIKE '%Superior%Amador%'
    OR name ILIKE '%County of Amador%'
    OR address ILIKE '%Amador County%'
    OR address ILIKE '%Jackson, CA%'
  );

-- Butte County
UPDATE courts
SET county = 'Butte'
WHERE county IS NULL
  AND (
    name ILIKE '%Butte%Superior%'
    OR name ILIKE '%Superior%Butte%'
    OR name ILIKE '%County of Butte%'
    OR address ILIKE '%Butte County%'
    OR address ILIKE '%Oroville, CA%'
    OR address ILIKE '%Chico, CA%'
  );

-- Calaveras County
UPDATE courts
SET county = 'Calaveras'
WHERE county IS NULL
  AND (
    name ILIKE '%Calaveras%Superior%'
    OR name ILIKE '%Superior%Calaveras%'
    OR name ILIKE '%County of Calaveras%'
    OR address ILIKE '%Calaveras County%'
    OR address ILIKE '%San Andreas, CA%'
  );

-- Colusa County
UPDATE courts
SET county = 'Colusa'
WHERE county IS NULL
  AND (
    name ILIKE '%Colusa%Superior%'
    OR name ILIKE '%Superior%Colusa%'
    OR name ILIKE '%County of Colusa%'
    OR address ILIKE '%Colusa County%'
    OR address ILIKE '%Colusa, CA%'
  );

-- Contra Costa County
UPDATE courts
SET county = 'Contra Costa'
WHERE county IS NULL
  AND (
    name ILIKE '%Contra Costa%Superior%'
    OR name ILIKE '%Superior%Contra Costa%'
    OR name ILIKE '%County of Contra Costa%'
    OR address ILIKE '%Contra Costa County%'
    OR address ILIKE '%Martinez, CA%'
    OR address ILIKE '%Walnut Creek, CA%'
    OR address ILIKE '%Richmond, CA%'
  );

-- Del Norte County
UPDATE courts
SET county = 'Del Norte'
WHERE county IS NULL
  AND (
    name ILIKE '%Del Norte%Superior%'
    OR name ILIKE '%Superior%Del Norte%'
    OR name ILIKE '%County of Del Norte%'
    OR address ILIKE '%Del Norte County%'
    OR address ILIKE '%Crescent City, CA%'
  );

-- El Dorado County
UPDATE courts
SET county = 'El Dorado'
WHERE county IS NULL
  AND (
    name ILIKE '%El Dorado%Superior%'
    OR name ILIKE '%Superior%El Dorado%'
    OR name ILIKE '%County of El Dorado%'
    OR address ILIKE '%El Dorado County%'
    OR address ILIKE '%Placerville, CA%'
    OR address ILIKE '%South Lake Tahoe, CA%'
  );

-- Fresno County
UPDATE courts
SET county = 'Fresno'
WHERE county IS NULL
  AND (
    name ILIKE '%Fresno%Superior%'
    OR name ILIKE '%Superior%Fresno%'
    OR name ILIKE '%County of Fresno%'
    OR address ILIKE '%Fresno County%'
    OR address ILIKE '%Fresno, CA%'
  );

-- Glenn County
UPDATE courts
SET county = 'Glenn'
WHERE county IS NULL
  AND (
    name ILIKE '%Glenn%Superior%'
    OR name ILIKE '%Superior%Glenn%'
    OR name ILIKE '%County of Glenn%'
    OR address ILIKE '%Glenn County%'
    OR address ILIKE '%Willows, CA%'
  );

-- Humboldt County
UPDATE courts
SET county = 'Humboldt'
WHERE county IS NULL
  AND (
    name ILIKE '%Humboldt%Superior%'
    OR name ILIKE '%Superior%Humboldt%'
    OR name ILIKE '%County of Humboldt%'
    OR address ILIKE '%Humboldt County%'
    OR address ILIKE '%Eureka, CA%'
  );

-- Imperial County
UPDATE courts
SET county = 'Imperial'
WHERE county IS NULL
  AND (
    name ILIKE '%Imperial%Superior%'
    OR name ILIKE '%Superior%Imperial%'
    OR name ILIKE '%County of Imperial%'
    OR address ILIKE '%Imperial County%'
    OR address ILIKE '%El Centro, CA%'
  );

-- Inyo County
UPDATE courts
SET county = 'Inyo'
WHERE county IS NULL
  AND (
    name ILIKE '%Inyo%Superior%'
    OR name ILIKE '%Superior%Inyo%'
    OR name ILIKE '%County of Inyo%'
    OR address ILIKE '%Inyo County%'
    OR address ILIKE '%Independence, CA%'
  );

-- Kern County
UPDATE courts
SET county = 'Kern'
WHERE county IS NULL
  AND (
    name ILIKE '%Kern%Superior%'
    OR name ILIKE '%Superior%Kern%'
    OR name ILIKE '%County of Kern%'
    OR address ILIKE '%Kern County%'
    OR address ILIKE '%Bakersfield, CA%'
  );

-- Kings County
UPDATE courts
SET county = 'Kings'
WHERE county IS NULL
  AND (
    name ILIKE '%Kings%Superior%'
    OR name ILIKE '%Superior%Kings%'
    OR name ILIKE '%County of Kings%'
    OR address ILIKE '%Kings County%'
    OR address ILIKE '%Hanford, CA%'
  );

-- Lake County
UPDATE courts
SET county = 'Lake'
WHERE county IS NULL
  AND (
    name ILIKE '%Lake%Superior%'
    OR name ILIKE '%Superior%Lake%'
    OR name ILIKE '%County of Lake%'
    OR address ILIKE '%Lake County%'
    OR address ILIKE '%Lakeport, CA%'
  );

-- Lassen County
UPDATE courts
SET county = 'Lassen'
WHERE county IS NULL
  AND (
    name ILIKE '%Lassen%Superior%'
    OR name ILIKE '%Superior%Lassen%'
    OR name ILIKE '%County of Lassen%'
    OR address ILIKE '%Lassen County%'
    OR address ILIKE '%Susanville, CA%'
  );

-- Los Angeles County
UPDATE courts
SET county = 'Los Angeles'
WHERE county IS NULL
  AND (
    name ILIKE '%Los Angeles%Superior%'
    OR name ILIKE '%Superior%Los Angeles%'
    OR name ILIKE '%County of Los Angeles%'
    OR address ILIKE '%Los Angeles County%'
    OR address ILIKE '%Los Angeles, CA%'
    OR address ILIKE '%Pasadena, CA%'
    OR address ILIKE '%Long Beach, CA%'
    OR address ILIKE '%Torrance, CA%'
    OR address ILIKE '%Santa Monica, CA%'
    OR address ILIKE '%Van Nuys, CA%'
    OR address ILIKE '%Norwalk, CA%'
  );

-- Madera County
UPDATE courts
SET county = 'Madera'
WHERE county IS NULL
  AND (
    name ILIKE '%Madera%Superior%'
    OR name ILIKE '%Superior%Madera%'
    OR name ILIKE '%County of Madera%'
    OR address ILIKE '%Madera County%'
    OR address ILIKE '%Madera, CA%'
  );

-- Marin County
UPDATE courts
SET county = 'Marin'
WHERE county IS NULL
  AND (
    name ILIKE '%Marin%Superior%'
    OR name ILIKE '%Superior%Marin%'
    OR name ILIKE '%County of Marin%'
    OR address ILIKE '%Marin County%'
    OR address ILIKE '%San Rafael, CA%'
  );

-- Mariposa County
UPDATE courts
SET county = 'Mariposa'
WHERE county IS NULL
  AND (
    name ILIKE '%Mariposa%Superior%'
    OR name ILIKE '%Superior%Mariposa%'
    OR name ILIKE '%County of Mariposa%'
    OR address ILIKE '%Mariposa County%'
    OR address ILIKE '%Mariposa, CA%'
  );

-- Mendocino County
UPDATE courts
SET county = 'Mendocino'
WHERE county IS NULL
  AND (
    name ILIKE '%Mendocino%Superior%'
    OR name ILIKE '%Superior%Mendocino%'
    OR name ILIKE '%County of Mendocino%'
    OR address ILIKE '%Mendocino County%'
    OR address ILIKE '%Ukiah, CA%'
  );

-- Merced County
UPDATE courts
SET county = 'Merced'
WHERE county IS NULL
  AND (
    name ILIKE '%Merced%Superior%'
    OR name ILIKE '%Superior%Merced%'
    OR name ILIKE '%County of Merced%'
    OR address ILIKE '%Merced County%'
    OR address ILIKE '%Merced, CA%'
  );

-- Modoc County
UPDATE courts
SET county = 'Modoc'
WHERE county IS NULL
  AND (
    name ILIKE '%Modoc%Superior%'
    OR name ILIKE '%Superior%Modoc%'
    OR name ILIKE '%County of Modoc%'
    OR address ILIKE '%Modoc County%'
    OR address ILIKE '%Alturas, CA%'
  );

-- Mono County
UPDATE courts
SET county = 'Mono'
WHERE county IS NULL
  AND (
    name ILIKE '%Mono%Superior%'
    OR name ILIKE '%Superior%Mono%'
    OR name ILIKE '%County of Mono%'
    OR address ILIKE '%Mono County%'
    OR address ILIKE '%Bridgeport, CA%'
    OR address ILIKE '%Mammoth Lakes, CA%'
  );

-- Monterey County
UPDATE courts
SET county = 'Monterey'
WHERE county IS NULL
  AND (
    name ILIKE '%Monterey%Superior%'
    OR name ILIKE '%Superior%Monterey%'
    OR name ILIKE '%County of Monterey%'
    OR address ILIKE '%Monterey County%'
    OR address ILIKE '%Salinas, CA%'
    OR address ILIKE '%Monterey, CA%'
  );

-- Napa County
UPDATE courts
SET county = 'Napa'
WHERE county IS NULL
  AND (
    name ILIKE '%Napa%Superior%'
    OR name ILIKE '%Superior%Napa%'
    OR name ILIKE '%County of Napa%'
    OR address ILIKE '%Napa County%'
    OR address ILIKE '%Napa, CA%'
  );

-- Nevada County
UPDATE courts
SET county = 'Nevada'
WHERE county IS NULL
  AND (
    name ILIKE '%Nevada%Superior%'
    OR name ILIKE '%Superior%Nevada%'
    OR name ILIKE '%County of Nevada%'
    OR address ILIKE '%Nevada County%'
    OR address ILIKE '%Nevada City, CA%'
  );

-- Orange County
UPDATE courts
SET county = 'Orange'
WHERE county IS NULL
  AND (
    name ILIKE '%Orange%Superior%'
    OR name ILIKE '%Superior%Orange%'
    OR name ILIKE '%County of Orange%'
    OR address ILIKE '%Orange County%'
    OR address ILIKE '%Santa Ana, CA%'
    OR address ILIKE '%Anaheim, CA%'
    OR address ILIKE '%Irvine, CA%'
    OR address ILIKE '%Newport Beach, CA%'
  );

-- Placer County
UPDATE courts
SET county = 'Placer'
WHERE county IS NULL
  AND (
    name ILIKE '%Placer%Superior%'
    OR name ILIKE '%Superior%Placer%'
    OR name ILIKE '%County of Placer%'
    OR address ILIKE '%Placer County%'
    OR address ILIKE '%Auburn, CA%'
    OR address ILIKE '%Roseville, CA%'
  );

-- Plumas County
UPDATE courts
SET county = 'Plumas'
WHERE county IS NULL
  AND (
    name ILIKE '%Plumas%Superior%'
    OR name ILIKE '%Superior%Plumas%'
    OR name ILIKE '%County of Plumas%'
    OR address ILIKE '%Plumas County%'
    OR address ILIKE '%Quincy, CA%'
  );

-- Riverside County
UPDATE courts
SET county = 'Riverside'
WHERE county IS NULL
  AND (
    name ILIKE '%Riverside%Superior%'
    OR name ILIKE '%Superior%Riverside%'
    OR name ILIKE '%County of Riverside%'
    OR address ILIKE '%Riverside County%'
    OR address ILIKE '%Riverside, CA%'
    OR address ILIKE '%Indio, CA%'
    OR address ILIKE '%Palm Springs, CA%'
  );

-- Sacramento County
UPDATE courts
SET county = 'Sacramento'
WHERE county IS NULL
  AND (
    name ILIKE '%Sacramento%Superior%'
    OR name ILIKE '%Superior%Sacramento%'
    OR name ILIKE '%County of Sacramento%'
    OR address ILIKE '%Sacramento County%'
    OR address ILIKE '%Sacramento, CA%'
  );

-- San Benito County
UPDATE courts
SET county = 'San Benito'
WHERE county IS NULL
  AND (
    name ILIKE '%San Benito%Superior%'
    OR name ILIKE '%Superior%San Benito%'
    OR name ILIKE '%County of San Benito%'
    OR address ILIKE '%San Benito County%'
    OR address ILIKE '%Hollister, CA%'
  );

-- San Bernardino County
UPDATE courts
SET county = 'San Bernardino'
WHERE county IS NULL
  AND (
    name ILIKE '%San Bernardino%Superior%'
    OR name ILIKE '%Superior%San Bernardino%'
    OR name ILIKE '%County of San Bernardino%'
    OR address ILIKE '%San Bernardino County%'
    OR address ILIKE '%San Bernardino, CA%'
    OR address ILIKE '%Victorville, CA%'
  );

-- San Diego County
UPDATE courts
SET county = 'San Diego'
WHERE county IS NULL
  AND (
    name ILIKE '%San Diego%Superior%'
    OR name ILIKE '%Superior%San Diego%'
    OR name ILIKE '%County of San Diego%'
    OR address ILIKE '%San Diego County%'
    OR address ILIKE '%San Diego, CA%'
  );

-- San Francisco County
UPDATE courts
SET county = 'San Francisco'
WHERE county IS NULL
  AND (
    name ILIKE '%San Francisco%Superior%'
    OR name ILIKE '%Superior%San Francisco%'
    OR name ILIKE '%County of San Francisco%'
    OR address ILIKE '%San Francisco County%'
    OR address ILIKE '%San Francisco, CA%'
  );

-- San Joaquin County
UPDATE courts
SET county = 'San Joaquin'
WHERE county IS NULL
  AND (
    name ILIKE '%San Joaquin%Superior%'
    OR name ILIKE '%Superior%San Joaquin%'
    OR name ILIKE '%County of San Joaquin%'
    OR address ILIKE '%San Joaquin County%'
    OR address ILIKE '%Stockton, CA%'
  );

-- San Luis Obispo County
UPDATE courts
SET county = 'San Luis Obispo'
WHERE county IS NULL
  AND (
    name ILIKE '%San Luis Obispo%Superior%'
    OR name ILIKE '%Superior%San Luis Obispo%'
    OR name ILIKE '%County of San Luis Obispo%'
    OR address ILIKE '%San Luis Obispo County%'
    OR address ILIKE '%San Luis Obispo, CA%'
  );

-- San Mateo County
UPDATE courts
SET county = 'San Mateo'
WHERE county IS NULL
  AND (
    name ILIKE '%San Mateo%Superior%'
    OR name ILIKE '%Superior%San Mateo%'
    OR name ILIKE '%County of San Mateo%'
    OR address ILIKE '%San Mateo County%'
    OR address ILIKE '%Redwood City, CA%'
    OR address ILIKE '%San Mateo, CA%'
  );

-- Santa Barbara County
UPDATE courts
SET county = 'Santa Barbara'
WHERE county IS NULL
  AND (
    name ILIKE '%Santa Barbara%Superior%'
    OR name ILIKE '%Superior%Santa Barbara%'
    OR name ILIKE '%County of Santa Barbara%'
    OR address ILIKE '%Santa Barbara County%'
    OR address ILIKE '%Santa Barbara, CA%'
    OR address ILIKE '%Santa Maria, CA%'
  );

-- Santa Clara County
UPDATE courts
SET county = 'Santa Clara'
WHERE county IS NULL
  AND (
    name ILIKE '%Santa Clara%Superior%'
    OR name ILIKE '%Superior%Santa Clara%'
    OR name ILIKE '%County of Santa Clara%'
    OR address ILIKE '%Santa Clara County%'
    OR address ILIKE '%San Jose, CA%'
    OR address ILIKE '%Santa Clara, CA%'
  );

-- Santa Cruz County
UPDATE courts
SET county = 'Santa Cruz'
WHERE county IS NULL
  AND (
    name ILIKE '%Santa Cruz%Superior%'
    OR name ILIKE '%Superior%Santa Cruz%'
    OR name ILIKE '%County of Santa Cruz%'
    OR address ILIKE '%Santa Cruz County%'
    OR address ILIKE '%Santa Cruz, CA%'
  );

-- Shasta County
UPDATE courts
SET county = 'Shasta'
WHERE county IS NULL
  AND (
    name ILIKE '%Shasta%Superior%'
    OR name ILIKE '%Superior%Shasta%'
    OR name ILIKE '%County of Shasta%'
    OR address ILIKE '%Shasta County%'
    OR address ILIKE '%Redding, CA%'
  );

-- Sierra County
UPDATE courts
SET county = 'Sierra'
WHERE county IS NULL
  AND (
    name ILIKE '%Sierra%Superior%'
    OR name ILIKE '%Superior%Sierra%'
    OR name ILIKE '%County of Sierra%'
    OR address ILIKE '%Sierra County%'
    OR address ILIKE '%Downieville, CA%'
  );

-- Siskiyou County
UPDATE courts
SET county = 'Siskiyou'
WHERE county IS NULL
  AND (
    name ILIKE '%Siskiyou%Superior%'
    OR name ILIKE '%Superior%Siskiyou%'
    OR name ILIKE '%County of Siskiyou%'
    OR address ILIKE '%Siskiyou County%'
    OR address ILIKE '%Yreka, CA%'
  );

-- Solano County
UPDATE courts
SET county = 'Solano'
WHERE county IS NULL
  AND (
    name ILIKE '%Solano%Superior%'
    OR name ILIKE '%Superior%Solano%'
    OR name ILIKE '%County of Solano%'
    OR address ILIKE '%Solano County%'
    OR address ILIKE '%Fairfield, CA%'
    OR address ILIKE '%Vallejo, CA%'
  );

-- Sonoma County
UPDATE courts
SET county = 'Sonoma'
WHERE county IS NULL
  AND (
    name ILIKE '%Sonoma%Superior%'
    OR name ILIKE '%Superior%Sonoma%'
    OR name ILIKE '%County of Sonoma%'
    OR address ILIKE '%Sonoma County%'
    OR address ILIKE '%Santa Rosa, CA%'
  );

-- Stanislaus County
UPDATE courts
SET county = 'Stanislaus'
WHERE county IS NULL
  AND (
    name ILIKE '%Stanislaus%Superior%'
    OR name ILIKE '%Superior%Stanislaus%'
    OR name ILIKE '%County of Stanislaus%'
    OR address ILIKE '%Stanislaus County%'
    OR address ILIKE '%Modesto, CA%'
  );

-- Sutter County
UPDATE courts
SET county = 'Sutter'
WHERE county IS NULL
  AND (
    name ILIKE '%Sutter%Superior%'
    OR name ILIKE '%Superior%Sutter%'
    OR name ILIKE '%County of Sutter%'
    OR address ILIKE '%Sutter County%'
    OR address ILIKE '%Yuba City, CA%'
  );

-- Tehama County
UPDATE courts
SET county = 'Tehama'
WHERE county IS NULL
  AND (
    name ILIKE '%Tehama%Superior%'
    OR name ILIKE '%Superior%Tehama%'
    OR name ILIKE '%County of Tehama%'
    OR address ILIKE '%Tehama County%'
    OR address ILIKE '%Red Bluff, CA%'
  );

-- Trinity County
UPDATE courts
SET county = 'Trinity'
WHERE county IS NULL
  AND (
    name ILIKE '%Trinity%Superior%'
    OR name ILIKE '%Superior%Trinity%'
    OR name ILIKE '%County of Trinity%'
    OR address ILIKE '%Trinity County%'
    OR address ILIKE '%Weaverville, CA%'
  );

-- Tulare County
UPDATE courts
SET county = 'Tulare'
WHERE county IS NULL
  AND (
    name ILIKE '%Tulare%Superior%'
    OR name ILIKE '%Superior%Tulare%'
    OR name ILIKE '%County of Tulare%'
    OR address ILIKE '%Tulare County%'
    OR address ILIKE '%Visalia, CA%'
  );

-- Tuolumne County
UPDATE courts
SET county = 'Tuolumne'
WHERE county IS NULL
  AND (
    name ILIKE '%Tuolumne%Superior%'
    OR name ILIKE '%Superior%Tuolumne%'
    OR name ILIKE '%County of Tuolumne%'
    OR address ILIKE '%Tuolumne County%'
    OR address ILIKE '%Sonora, CA%'
  );

-- Ventura County
UPDATE courts
SET county = 'Ventura'
WHERE county IS NULL
  AND (
    name ILIKE '%Ventura%Superior%'
    OR name ILIKE '%Superior%Ventura%'
    OR name ILIKE '%County of Ventura%'
    OR address ILIKE '%Ventura County%'
    OR address ILIKE '%Ventura, CA%'
  );

-- Yolo County
UPDATE courts
SET county = 'Yolo'
WHERE county IS NULL
  AND (
    name ILIKE '%Yolo%Superior%'
    OR name ILIKE '%Superior%Yolo%'
    OR name ILIKE '%County of Yolo%'
    OR address ILIKE '%Yolo County%'
    OR address ILIKE '%Woodland, CA%'
  );

-- Yuba County
UPDATE courts
SET county = 'Yuba'
WHERE county IS NULL
  AND (
    name ILIKE '%Yuba%Superior%'
    OR name ILIKE '%Superior%Yuba%'
    OR name ILIKE '%County of Yuba%'
    OR address ILIKE '%Yuba County%'
    OR address ILIKE '%Marysville, CA%'
  );

-- ========================================
-- SECTION 2: CALIFORNIA COURTS OF APPEAL
-- ========================================
-- California has 6 appellate districts, mapped to their headquarters counties

-- First Appellate District (San Francisco)
UPDATE courts
SET county = 'San Francisco'
WHERE county IS NULL
  AND (
    name ILIKE '%First%Appellate%District%'
    OR name ILIKE '%1st%District%Court%Appeal%'
    OR name ILIKE '%Court of Appeal%First%District%'
    OR (
      name ILIKE '%Court of Appeal%'
      AND (address ILIKE '%San Francisco%' OR name ILIKE '%Division%One%' OR name ILIKE '%Division%Two%' OR name ILIKE '%Division%Three%')
    )
  );

-- Second Appellate District (Los Angeles)
UPDATE courts
SET county = 'Los Angeles'
WHERE county IS NULL
  AND (
    name ILIKE '%Second%Appellate%District%'
    OR name ILIKE '%2nd%District%Court%Appeal%'
    OR name ILIKE '%Court of Appeal%Second%District%'
    OR (
      name ILIKE '%Court of Appeal%'
      AND (address ILIKE '%Los Angeles%' OR name ILIKE '%Division%Four%' OR name ILIKE '%Division%Five%' OR name ILIKE '%Division%Six%' OR name ILIKE '%Division%Seven%' OR name ILIKE '%Division%Eight%')
    )
  );

-- Third Appellate District (Sacramento)
UPDATE courts
SET county = 'Sacramento'
WHERE county IS NULL
  AND (
    name ILIKE '%Third%Appellate%District%'
    OR name ILIKE '%3rd%District%Court%Appeal%'
    OR name ILIKE '%Court of Appeal%Third%District%'
    OR (name ILIKE '%Court of Appeal%' AND address ILIKE '%Sacramento%')
  );

-- Fourth Appellate District (San Diego, Riverside, Santa Ana)
-- Division 1: San Diego
UPDATE courts
SET county = 'San Diego'
WHERE county IS NULL
  AND (
    name ILIKE '%Fourth%Appellate%District%Division%One%'
    OR name ILIKE '%4th%District%Division%1%'
    OR (name ILIKE '%Court of Appeal%' AND address ILIKE '%San Diego%' AND name ILIKE '%Fourth%')
  );

-- Division 2: Riverside
UPDATE courts
SET county = 'Riverside'
WHERE county IS NULL
  AND (
    name ILIKE '%Fourth%Appellate%District%Division%Two%'
    OR name ILIKE '%4th%District%Division%2%'
    OR (name ILIKE '%Court of Appeal%' AND address ILIKE '%Riverside%' AND name ILIKE '%Fourth%')
  );

-- Division 3: Orange (Santa Ana)
UPDATE courts
SET county = 'Orange'
WHERE county IS NULL
  AND (
    name ILIKE '%Fourth%Appellate%District%Division%Three%'
    OR name ILIKE '%4th%District%Division%3%'
    OR (name ILIKE '%Court of Appeal%' AND (address ILIKE '%Santa Ana%' OR address ILIKE '%Orange%') AND name ILIKE '%Fourth%')
  );

-- Fifth Appellate District (Fresno)
UPDATE courts
SET county = 'Fresno'
WHERE county IS NULL
  AND (
    name ILIKE '%Fifth%Appellate%District%'
    OR name ILIKE '%5th%District%Court%Appeal%'
    OR name ILIKE '%Court of Appeal%Fifth%District%'
    OR (name ILIKE '%Court of Appeal%' AND address ILIKE '%Fresno%')
  );

-- Sixth Appellate District (San Jose / Santa Clara)
UPDATE courts
SET county = 'Santa Clara'
WHERE county IS NULL
  AND (
    name ILIKE '%Sixth%Appellate%District%'
    OR name ILIKE '%6th%District%Court%Appeal%'
    OR name ILIKE '%Court of Appeal%Sixth%District%'
    OR (name ILIKE '%Court of Appeal%' AND (address ILIKE '%San Jose%' OR address ILIKE '%Santa Clara%'))
  );

-- ========================================
-- SECTION 3: CALIFORNIA SUPREME COURT
-- ========================================
-- The California Supreme Court is headquartered in San Francisco

UPDATE courts
SET county = 'San Francisco'
WHERE county IS NULL
  AND (
    name ILIKE '%California%Supreme%Court%'
    OR name ILIKE '%Supreme Court of California%'
    OR (name = 'Supreme Court' AND jurisdiction = 'CA')
  );

-- ========================================
-- SECTION 4: FEDERAL COURTS IN CALIFORNIA
-- ========================================
-- Map federal courts to the counties they primarily serve

-- U.S. District Court - Northern District of California (San Francisco/Oakland)
-- Covers: Alameda, Contra Costa, Del Norte, Humboldt, Lake, Marin, Mendocino,
-- Monterey, Napa, San Benito, San Francisco, San Mateo, Santa Clara, Santa Cruz, Sonoma
UPDATE courts
SET county = 'San Francisco'
WHERE county IS NULL
  AND (
    name ILIKE '%Northern District of California%'
    OR name ILIKE '%N.D. Cal%'
    OR name ILIKE '%NDCAL%'
    OR name ILIKE '%N.D. California%'
  );

-- U.S. District Court - Eastern District of California (Sacramento)
-- Covers: Alpine, Amador, Butte, Calaveras, Colusa, El Dorado, Fresno, Glenn,
-- Inyo, Kern (eastern), Kings, Lassen, Madera, Mariposa, Merced, Modoc, Mono,
-- Nevada, Placer, Plumas, Sacramento, San Joaquin, Shasta, Sierra, Siskiyou,
-- Stanislaus, Sutter, Tehama, Trinity, Tulare, Tuolumne, Yolo, Yuba
UPDATE courts
SET county = 'Sacramento'
WHERE county IS NULL
  AND (
    name ILIKE '%Eastern District of California%'
    OR name ILIKE '%E.D. Cal%'
    OR name ILIKE '%EDCAL%'
    OR name ILIKE '%E.D. California%'
  );

-- U.S. District Court - Central District of California (Los Angeles)
-- Covers: Los Angeles, Orange, Riverside, San Bernardino, San Luis Obispo,
-- Santa Barbara, Ventura
UPDATE courts
SET county = 'Los Angeles'
WHERE county IS NULL
  AND (
    name ILIKE '%Central District of California%'
    OR name ILIKE '%C.D. Cal%'
    OR name ILIKE '%CDCAL%'
    OR name ILIKE '%C.D. California%'
  );

-- U.S. District Court - Southern District of California (San Diego)
-- Covers: Imperial, San Diego
UPDATE courts
SET county = 'San Diego'
WHERE county IS NULL
  AND (
    name ILIKE '%Southern District of California%'
    OR name ILIKE '%S.D. Cal%'
    OR name ILIKE '%SDCAL%'
    OR name ILIKE '%S.D. California%'
  );

-- U.S. Court of Appeals - Ninth Circuit (San Francisco)
-- Covers all of California plus other western states
UPDATE courts
SET county = 'San Francisco'
WHERE county IS NULL
  AND (
    name ILIKE '%Ninth Circuit%'
    OR name ILIKE '%9th Circuit%'
    OR name ILIKE '%Court of Appeals for the Ninth Circuit%'
  );

-- U.S. Bankruptcy Courts in California
-- Northern District - San Francisco
UPDATE courts
SET county = 'San Francisco'
WHERE county IS NULL
  AND name ILIKE '%Bankruptcy%'
  AND (
    name ILIKE '%Northern District of California%'
    OR name ILIKE '%N.D. Cal%'
  );

-- Eastern District - Sacramento
UPDATE courts
SET county = 'Sacramento'
WHERE county IS NULL
  AND name ILIKE '%Bankruptcy%'
  AND (
    name ILIKE '%Eastern District of California%'
    OR name ILIKE '%E.D. Cal%'
  );

-- Central District - Los Angeles
UPDATE courts
SET county = 'Los Angeles'
WHERE county IS NULL
  AND name ILIKE '%Bankruptcy%'
  AND (
    name ILIKE '%Central District of California%'
    OR name ILIKE '%C.D. Cal%'
  );

-- Southern District - San Diego
UPDATE courts
SET county = 'San Diego'
WHERE county IS NULL
  AND name ILIKE '%Bankruptcy%'
  AND (
    name ILIKE '%Southern District of California%'
    OR name ILIKE '%S.D. Cal%'
  );

-- ========================================
-- VERIFICATION AND REPORTING
-- ========================================

-- Add comment to document the mapping
COMMENT ON COLUMN courts.county IS 'County name for California courts - includes all 58 counties, appellate districts, supreme court, and federal courts';

-- Create a verification view to check county coverage
CREATE OR REPLACE VIEW california_courts_county_coverage AS
SELECT
  county,
  COUNT(*) as court_count,
  STRING_AGG(DISTINCT name, '; ' ORDER BY name) as courts
FROM courts
WHERE county IS NOT NULL
  AND (jurisdiction = 'CA' OR name ILIKE '%California%' OR address ILIKE '%, CA%')
GROUP BY county
ORDER BY county;

COMMENT ON VIEW california_courts_county_coverage IS 'Summary of California courts by county for verification purposes';
