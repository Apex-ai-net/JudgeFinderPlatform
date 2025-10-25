# California Court System Hierarchy

## Overview

This document visualizes the complete California court system hierarchy and county relationships implemented in the JudgeFinder platform.

---

## State Court System

### California Supreme Court (Statewide)
```
┌─────────────────────────────────────────────┐
│   Supreme Court of California               │
│   County Assignment: San Francisco          │
│   Jurisdiction: Statewide                   │
└─────────────────────────────────────────────┘
                    │
                    │ (Appeals from)
                    ▼
```

### California Courts of Appeal (6 Districts)

```
┌────────────────────────────────────────────────────────────────────────┐
│                    COURTS OF APPEAL (6 DISTRICTS)                      │
└────────────────────────────────────────────────────────────────────────┘

1st District (San Francisco)               2nd District (Los Angeles)
├── Division 1                              ├── Division 1
├── Division 2                              ├── Division 2
├── Division 3                              ├── Division 3
├── Division 4                              ├── Division 4
└── Division 5                              ├── Division 5
                                            ├── Division 6
3rd District (Sacramento)                   ├── Division 7
└── (No divisions)                          └── Division 8

4th District
├── Division 1 (San Diego)
├── Division 2 (Riverside)
└── Division 3 (Orange - Santa Ana)

5th District (Fresno)                      6th District (Santa Clara - San Jose)
└── (No divisions)                         └── (No divisions)
```

### Superior Courts (58 Counties)

```
┌────────────────────────────────────────────────────────────────────────┐
│              SUPERIOR COURTS (Trial Courts - 58 Counties)              │
└────────────────────────────────────────────────────────────────────────┘

NORTHERN CALIFORNIA (26 counties)
═══════════════════════════════════════════════════════════════════════

Bay Area Region:
├── Alameda County (Oakland)
├── Contra Costa County (Martinez)
├── Marin County (San Rafael)
├── Napa County (Napa)
├── San Francisco County (San Francisco)
├── San Mateo County (Redwood City)
├── Santa Clara County (San Jose)
├── Santa Cruz County (Santa Cruz)
└── Sonoma County (Santa Rosa)

Sacramento Valley:
├── Butte County (Oroville)
├── Colusa County (Colusa)
├── Glenn County (Willows)
├── Sacramento County (Sacramento)
├── Sutter County (Yuba City)
├── Tehama County (Red Bluff)
├── Yolo County (Woodland)
└── Yuba County (Marysville)

North Coast:
├── Del Norte County (Crescent City)
├── Humboldt County (Eureka)
├── Lake County (Lakeport)
└── Mendocino County (Ukiah)

Mountain Counties:
├── Alpine County (Markleeville)
├── Amador County (Jackson)
├── Calaveras County (San Andreas)
├── El Dorado County (Placerville)
├── Lassen County (Susanville)
├── Modoc County (Alturas)
├── Nevada County (Nevada City)
├── Placer County (Auburn)
├── Plumas County (Quincy)
├── Shasta County (Redding)
├── Sierra County (Downieville)
├── Siskiyou County (Yreka)
├── Trinity County (Weaverville)
└── Tuolumne County (Sonora)

CENTRAL CALIFORNIA (11 counties)
═══════════════════════════════════════════════════════════════════════

San Joaquin Valley:
├── Fresno County (Fresno)
├── Kern County (Bakersfield)
├── Kings County (Hanford)
├── Madera County (Madera)
├── Merced County (Merced)
├── San Joaquin County (Stockton)
├── Stanislaus County (Modesto)
└── Tulare County (Visalia)

Central Coast:
├── Monterey County (Salinas)
├── San Benito County (Hollister)
├── San Luis Obispo County (San Luis Obispo)
└── Santa Barbara County (Santa Barbara)

Mountain Counties:
├── Inyo County (Independence)
├── Mariposa County (Mariposa)
└── Mono County (Bridgeport)

SOUTHERN CALIFORNIA (21 counties)
═══════════════════════════════════════════════════════════════════════

Metropolitan Areas:
├── Los Angeles County (Los Angeles)
├── Orange County (Santa Ana)
├── Riverside County (Riverside)
├── San Bernardino County (San Bernardino)
├── San Diego County (San Diego)
└── Ventura County (Ventura)

Desert Counties:
└── Imperial County (El Centro)
```

---

## Federal Court System in California

### U.S. Supreme Court
```
┌─────────────────────────────────────────────┐
│   United States Supreme Court               │
│   (Washington, D.C.)                        │
└─────────────────────────────────────────────┘
                    │
                    │ (Appeals from)
                    ▼
```

### U.S. Court of Appeals - Ninth Circuit
```
┌─────────────────────────────────────────────┐
│   U.S. Court of Appeals, Ninth Circuit      │
│   County Assignment: San Francisco          │
│   Covers: CA, AK, AZ, HI, ID, MT, NV,      │
│           OR, WA, Guam, N. Mariana Islands  │
└─────────────────────────────────────────────┘
                    │
                    │ (Appeals from)
                    ▼
```

### U.S. District Courts (4 Districts)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   U.S. DISTRICT COURTS IN CALIFORNIA                   │
└────────────────────────────────────────────────────────────────────────┘

NORTHERN DISTRICT (NDCAL)
County Assignment: San Francisco
Main Courthouses: San Francisco, Oakland, San Jose, Eureka
├── Counties Served (15):
│   Alameda, Contra Costa, Del Norte, Humboldt, Lake, Marin,
│   Mendocino, Monterey, Napa, San Benito, San Francisco,
│   San Mateo, Santa Clara, Santa Cruz, Sonoma
└── Bankruptcy Court: San Francisco County

EASTERN DISTRICT (EDCAL)
County Assignment: Sacramento
Main Courthouses: Sacramento, Fresno, Bakersfield, Redding
├── Counties Served (34):
│   Alpine, Amador, Butte, Calaveras, Colusa, El Dorado, Fresno,
│   Glenn, Inyo, Kern (eastern), Kings, Lassen, Madera, Mariposa,
│   Merced, Modoc, Mono, Nevada, Placer, Plumas, Sacramento,
│   San Joaquin, Shasta, Sierra, Siskiyou, Stanislaus, Sutter,
│   Tehama, Trinity, Tulare, Tuolumne, Yolo, Yuba
└── Bankruptcy Court: Sacramento County

CENTRAL DISTRICT (CDCAL)
County Assignment: Los Angeles
Main Courthouses: Los Angeles, Riverside, Santa Ana, Santa Barbara
├── Counties Served (7):
│   Los Angeles, Orange, Riverside, San Bernardino,
│   San Luis Obispo, Santa Barbara, Ventura
└── Bankruptcy Court: Los Angeles County

SOUTHERN DISTRICT (SDCAL)
County Assignment: San Diego
Main Courthouses: San Diego, El Centro
├── Counties Served (2):
│   Imperial, San Diego
└── Bankruptcy Court: San Diego County
```

---

## County Assignment Logic

### State Courts

#### Superior Courts (1:1 mapping)
```
County Name → Superior Court of California, County of [Name]
Example: Alameda → Superior Court of California, County of Alameda
```

#### Courts of Appeal (District HQ)
```
1st District → San Francisco (Bay Area appellate court)
2nd District → Los Angeles (Southern California appellate court)
3rd District → Sacramento (Northern California inland)
4th District Div 1 → San Diego (San Diego region)
4th District Div 2 → Riverside (Inland Empire)
4th District Div 3 → Orange (Orange County)
5th District → Fresno (Central Valley)
6th District → Santa Clara (South Bay / Santa Cruz region)
```

#### Supreme Court
```
California Supreme Court → San Francisco (state headquarters)
```

### Federal Courts

#### District Courts (Main Courthouse)
```
Northern District → San Francisco (main courthouse location)
Eastern District → Sacramento (main courthouse location)
Central District → Los Angeles (main courthouse location)
Southern District → San Diego (main courthouse location)
```

#### Circuit Court
```
Ninth Circuit → San Francisco (circuit headquarters)
```

---

## Geographic Distribution

### Counties by Population Tier

#### Tier 1: Major Metropolitan (5 counties)
- Los Angeles (10M+ population)
- San Diego (3M+)
- Orange (3M+)
- Riverside (2.4M+)
- San Bernardino (2.2M+)

#### Tier 2: Large Urban (8 counties)
- Santa Clara, Alameda, Sacramento, Contra Costa, Fresno, Kern, San Francisco, Ventura

#### Tier 3: Mid-Sized (15 counties)
- San Joaquin, Stanislaus, Sonoma, Tulare, San Mateo, Santa Barbara, Monterey, Placer, San Luis Obispo, Merced, Santa Cruz, Marin, Solano, Butte, Napa

#### Tier 4: Small (30 counties)
- All remaining counties (Alpine is smallest with ~1,200 population)

---

## Appellate Jurisdiction Map

### Which Superior Courts Appeal Where

```
1st District Coverage (Bay Area + North Coast):
├── Alameda, Contra Costa, Del Norte, Humboldt, Lake, Marin,
├── Mendocino, Napa, San Francisco, San Mateo, Solano, Sonoma

2nd District Coverage (Southern California):
├── Los Angeles, San Luis Obispo, Santa Barbara, Ventura

3rd District Coverage (Northern California Interior):
├── Alpine, Amador, Butte, Calaveras, Colusa, El Dorado, Glenn,
├── Lassen, Modoc, Mono, Nevada, Placer, Plumas, Sacramento,
├── San Joaquin, Shasta, Sierra, Siskiyou, Sutter, Tehama,
├── Trinity, Yolo, Yuba

4th District Division 1 Coverage:
├── Imperial, San Diego

4th District Division 2 Coverage:
├── Inyo, Riverside, San Bernardino

4th District Division 3 Coverage:
├── Orange

5th District Coverage (Central Valley):
├── Fresno, Kern, Kings, Madera, Mariposa, Merced, Stanislaus,
├── Tulare, Tuolumne

6th District Coverage (South Bay / Coastal):
├── Monterey, San Benito, Santa Clara, Santa Cruz
```

---

## Database Schema Representation

### Court Table County Assignment
```sql
-- State Superior Courts
county = '[County Name]'
jurisdiction = 'CA'
type = 'state'

-- Courts of Appeal
county = '[District Headquarters County]'
jurisdiction = 'CA'
type = 'state'

-- California Supreme Court
county = 'San Francisco'
jurisdiction = 'CA'
type = 'state'

-- Federal District Courts
county = '[Main Courthouse County]'
jurisdiction = 'US'
type = 'federal'

-- Ninth Circuit
county = 'San Francisco'
jurisdiction = 'US'
type = 'federal'
```

---

## Validation Queries

### Check State Court Hierarchy
```sql
-- Count courts by level
SELECT
  CASE
    WHEN name ILIKE '%Supreme Court%' THEN 'Supreme Court'
    WHEN name ILIKE '%Court of Appeal%' THEN 'Courts of Appeal'
    WHEN name ILIKE '%Superior%' THEN 'Superior Courts'
  END as court_level,
  COUNT(*) as count
FROM courts
WHERE jurisdiction = 'CA'
GROUP BY court_level;

-- Expected: Supreme Court (1), Courts of Appeal (~6-8), Superior Courts (58)
```

### Check Federal Court Structure
```sql
-- Count federal courts by type
SELECT
  CASE
    WHEN name ILIKE '%Ninth Circuit%' THEN 'Circuit Court'
    WHEN name ILIKE '%Bankruptcy%' THEN 'Bankruptcy Court'
    WHEN name ILIKE '%District%' THEN 'District Court'
  END as court_type,
  COUNT(*) as count
FROM courts
WHERE type = 'federal'
  AND (name ILIKE '%California%' OR county IN (
    'San Francisco', 'Sacramento', 'Los Angeles', 'San Diego'
  ))
GROUP BY court_type;

-- Expected: Circuit (1), District (4), Bankruptcy (4)
```

### Verify All Counties Covered
```sql
-- Check for all 58 counties
SELECT COUNT(DISTINCT county) as county_count
FROM courts
WHERE county IS NOT NULL
  AND jurisdiction = 'CA';

-- Expected: 58 (at minimum)
```

---

## Special Considerations

### City and County of San Francisco
- **Unique:** Only consolidated city-county in California
- **Implication:** "San Francisco" refers to both city and county
- **Courts:** San Francisco Superior Court serves both city and county functions

### Multi-County Federal Districts
- Federal district courts serve multiple counties
- County assignment reflects **main courthouse location**, not all served counties
- Full coverage lists in reference documentation

### Appellate District Divisions
- Some districts have divisions (1st, 2nd, 4th)
- Divisions are geographic subdivisions within a district
- All divisions within a district mapped to same county (district HQ)

---

## Usage in JudgeFinder Platform

### Geographic Filtering
```sql
-- Find all courts in Los Angeles County
SELECT * FROM courts WHERE county = 'Los Angeles';

-- Find judges serving in Orange County
SELECT j.* FROM judges j
JOIN courts c ON j.court_id = c.id
WHERE c.county = 'Orange';
```

### Regional Analytics
```sql
-- Count judges by county
SELECT c.county, COUNT(DISTINCT j.id) as judge_count
FROM courts c
LEFT JOIN judges j ON c.id = j.court_id
GROUP BY c.county
ORDER BY judge_count DESC;
```

### Advertising Targeting
```sql
-- Find available ad spots in San Diego County courts
SELECT c.name, a.position
FROM courts c
LEFT JOIN ad_spots a ON c.id = a.court_id
WHERE c.county = 'San Diego'
  AND (a.status = 'available' OR a.id IS NULL);
```

---

**Reference:** This hierarchy is implemented in migration `20251127_001_complete_california_county_mapping.sql`

**Validation:** Use `scripts/validate-county-mappings.ts` to verify structure

**Documentation:** See `CALIFORNIA_COUNTY_COURT_REFERENCE.md` for complete court listings
