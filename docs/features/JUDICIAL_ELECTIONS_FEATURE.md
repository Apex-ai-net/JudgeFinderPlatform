# Judicial Elections Feature - Master Documentation

**Version**: 1.0.0
**Last Updated**: 2025-10-22
**Status**: Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Value & Mission Alignment](#business-value--mission-alignment)
3. [Feature Overview](#feature-overview)
4. [Architecture Diagram](#architecture-diagram)
5. [Data Flow](#data-flow)
6. [Integration Points](#integration-points)
7. [Technical Specifications](#technical-specifications)
8. [Database Schema](#database-schema)
9. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The Judicial Elections Feature transforms JudgeFinder from a judicial analytics platform into a comprehensive voter education resource. By integrating election data with judicial performance metrics, we empower California voters to make informed decisions about judicial candidates.

### Key Deliverables

- **Database Schema**: Three new tables tracking elections, opponents, and political affiliations
- **UI Components**: Two reusable React components (ElectionBadge, ElectionInformation)
- **API Endpoints**: Four RESTful endpoints for election data access
- **Data Integration**: CourtListener political affiliation sync with rate-limited batch processing
- **Public-Facing Page**: Dedicated `/elections` route with SEO optimization
- **Type Safety**: Comprehensive TypeScript types for all election-related entities

### Impact Metrics

- **Voter Education**: Direct access to judicial election information for California's 40+ million residents
- **Data Transparency**: 1,600+ judges enriched with political affiliation data from CourtListener
- **User Engagement**: New entry point for civic-minded users researching judicial candidates
- **Platform Differentiation**: Only platform combining judicial analytics with election data

---

## Business Value & Mission Alignment

### Mission Statement

> JudgeFinder's mission is to provide transparent, data-driven insights into California's judicial system, empowering citizens and legal professionals to make informed decisions.

### How This Feature Advances the Mission

#### 1. Voter Empowerment

**Problem**: California voters routinely skip judicial races on ballots due to lack of information about candidates.

**Solution**: JudgeFinder provides:
- Complete election history for each judge
- Political affiliation data with appointment context
- Next election dates with countdown timers
- Educational content about California's judicial selection system

**Impact**: Voters can now research judges before Election Day, leading to more informed ballot decisions.

#### 2. Transparency & Accountability

**Problem**: Judicial selection processes are opaque, making it difficult to understand who appoints judges and their political leanings.

**Solution**:
- Political affiliation tracking with appointer information
- Retention election history showing voter approval ratings
- Competitive election results with opponent data

**Impact**: Citizens can see the political context of judicial appointments and hold judges accountable through retention votes.

#### 3. Civic Engagement

**Problem**: Low voter participation in judicial elections stems from information deficit.

**Solution**:
- Dedicated `/elections` page as a voter resource hub
- Direct links to California Secretary of State resources
- Educational content about retention vs. competitive elections
- Nonpartisan presentation of factual election data

**Impact**: Increased civic engagement through accessible, nonpartisan information.

#### 4. Platform Growth & SEO

**Business Value**:
- **SEO Boost**: New keyword rankings for "California judicial elections," "judge elections 2025," "judicial retention voting"
- **Traffic Growth**: Election cycles drive seasonal traffic spikes (November elections)
- **User Retention**: Election data adds stickiness for politically engaged users
- **Media Coverage**: Unique dataset attracts press coverage during election seasons

---

## Feature Overview

### User-Facing Features

#### 1. Judge Profile Election Information

**Component**: `ElectionInformation.tsx`

Displayed on every judge profile page (`/judges/[slug]`), showing:

- **Selection Method Badge**: How the judge obtained their position (elected, appointed, merit selection, etc.)
- **Current Term Information**: Term end date with years remaining calculation
- **Next Election Date**: Countdown to next retention or competitive election
- **Election History Timeline**: Past elections with results, vote percentages, and opponents
- **Political Affiliation**: Current party affiliation with appointment context
- **Voter Resources**: Direct links to California voter registration, election guides, and judicial election information
- **Educational Content**: Collapsible section explaining California's judicial election system

**User Benefits**:
- Quick understanding of judge's selection method
- Awareness of upcoming retention votes
- Historical context of electoral performance
- Access to official voter resources

#### 2. Election Status Badges

**Component**: `ElectionBadge.tsx`

Compact badges appearing throughout the platform (search results, judge cards, etc.) showing:

- **Selection Method**: Visual indicator (elected, appointed, retention, etc.)
- **Next Election Date**: Formatted date with countdown
- **Up for Election Alert**: Animated badge for judges with elections within 180 days
- **Tooltip Explanations**: Detailed information on hover

**Variants**:
- `minimal`: Icon only (for tight spaces)
- `compact`: Icon + label (for cards)
- `detailed`: Full info including next election date

#### 3. Elections Landing Page

**Route**: `/elections`

A dedicated voter guide featuring:

- **Upcoming Elections Calendar**: Judges with elections in the next 12 months
- **Filtered Search**: By county, court level, election type
- **Educational Resources**: How California judicial elections work
- **SEO Optimization**: Structured data for search engines
- **FAQ Section**: Common questions about judicial elections

**SEO Keywords**:
- California judicial elections
- Judge elections 2025
- Judicial retention voting
- Know your judges
- California ballot judges

### Developer-Facing Features

#### 4. RESTful API Endpoints

**Base Path**: `/api/v1/elections/`

Four production-ready endpoints:

1. **GET `/upcoming`**: List upcoming elections with filters
   - Query params: `jurisdiction`, `election_type`, `start_date`, `end_date`, `limit`, `offset`
   - Returns: Paginated election list with judge info
   - Rate limit: 50 requests/hour

2. **GET `/statistics`**: Aggregated election statistics
   - Returns: Election counts by type, retention pass rates, turnout averages
   - Cache: 1 hour

3. **GET `/judges/[id]/elections`**: Single judge's election history
   - Returns: Complete election history with opponents
   - Includes: Win rate, average vote percentage, total votes received

4. **GET `/elections/[id]`**: Single election details
   - Returns: Full election record with opponent data
   - Includes: Results, vote counts, source documents

**API Features**:
- Rate limiting with Upstash Redis
- API key authentication (optional)
- Comprehensive error responses
- OpenAPI/Swagger documentation ready

#### 5. Political Affiliation Data Sync

**Script**: `/scripts/sync-political-affiliations.ts`

Automated sync from CourtListener API:

- **Batch Processing**: 10 judges per batch with 1.5s delays
- **Rate Limiting**: ~24 judges/minute (1,440/hour, well under CourtListener's 5,000/hour limit)
- **Data Formatting**: Party affiliation with appointer and date range
- **Error Handling**: Retries with exponential backoff
- **Progress Tracking**: Console output with stats
- **Idempotent**: Safe to re-run without duplicating data

**Run Command**:
```bash
npm run sync:political          # Sync missing data only
npm run sync:political -- --all # Force re-sync all judges
npm run sync:political -- --limit=50 # Test with 50 judges
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Judge Profile│  │Elections Page│  │ Search Results│         │
│  │              │  │              │  │               │         │
│  │ /judges/[id] │  │ /elections   │  │ /search       │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬────────┘         │
│         │                  │                  │                  │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COMPONENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐        ┌────────────────────┐          │
│  │ElectionInformation │        │  ElectionBadge     │          │
│  │                    │        │                    │          │
│  │ - Term info        │        │ - Selection method │          │
│  │ - History timeline │        │ - Next election    │          │
│  │ - Political party  │        │ - Countdown        │          │
│  │ - Resources        │        │ - Tooltips         │          │
│  └────────┬───────────┘        └────────┬───────────┘          │
│           │                              │                      │
└───────────┼──────────────────────────────┼──────────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ /api/v1/elections│  │ /api/v1/judges/  │  │Supabase RPC  │ │
│  │                  │  │   [id]/elections │  │  Functions   │ │
│  │ - /upcoming      │  │                  │  │              │ │
│  │ - /statistics    │  │                  │  │- get_latest_ │ │
│  │                  │  │                  │  │  election()  │ │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘ │
│           │                     │                     │         │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                    SUPABASE POSTGRESQL                          │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ judges           │  │ judge_elections  │  │judge_election│ │
│  │                  │  │                  │  │_opponents    │ │
│  │ + id             │  │ + id             │  │              │ │
│  │ + name           │  │ + judge_id (FK)  │  │+ election_id │ │
│  │ + selection_     │  │ + election_type  │  │+ opponent_   │ │
│  │   method         │  │ + election_date  │  │  name        │ │
│  │ + next_election_ │  │ + won (bool)     │  │+ vote_count  │ │
│  │   date           │  │ + vote_percentage│  │+ opponent_   │ │
│  │ + current_term_  │  │ + yes_votes      │  │  party       │ │
│  │   end_date       │  │ + no_votes       │  │              │ │
│  │ + is_elected     │  │ + is_contested   │  │              │ │
│  │ + current_       │  │ + opponent_count │  │              │ │
│  │   political_     │  │ + jurisdiction   │  │              │ │
│  │   party          │  │ + verified       │  │              │ │
│  │ + political_     │  │                  │  │              │ │
│  │   affiliation    │  │                  │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ judge_political_affiliations                            │  │
│  │                                                          │  │
│  │ + id                                                     │  │
│  │ + judge_id (FK)                                          │  │
│  │ + political_party (enum)                                 │  │
│  │ + start_date, end_date                                   │  │
│  │ + is_current (bool)                                      │  │
│  │ + source_name, source_url                                │  │
│  │ + verified                                               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
            ▲
            │
┌───────────┴─────────────────────────────────────────────────────┐
│                  EXTERNAL DATA SOURCES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │  CourtListener API   │  │   CA Secretary of    │           │
│  │                      │  │   State Elections    │           │
│  │ - Political          │  │                      │           │
│  │   affiliations       │  │ - Election results   │           │
│  │ - Appointment data   │  │ - Candidate info     │           │
│  │ - Confirmation votes │  │ - Ballot data        │           │
│  │                      │  │                      │           │
│  └──────────────────────┘  └──────────────────────┘           │
│           ▲                          ▲                         │
│           │                          │                         │
│  ┌────────┴─────────────┐   ┌────────┴─────────────┐          │
│  │ Sync Script          │   │  Manual Import       │          │
│  │ (Rate-limited)       │   │  (Future)            │          │
│  └──────────────────────┘   └──────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App Root
│
├── /elections (Public Elections Landing Page)
│   └── ElectionsPageClient
│       ├── Upcoming Elections List
│       │   └── ElectionBadge (compact variant)
│       ├── County Filter
│       ├── Educational Content
│       └── SEO Meta Tags
│
├── /judges/[slug] (Individual Judge Profile)
│   └── ElectionInformation (full detail)
│       ├── SelectionMethodBadge
│       ├── Current Term Card
│       ├── Next Election Card
│       ├── Political Affiliation Display
│       ├── Election History Timeline
│       │   └── ElectionHistoryItem[] (with motion)
│       ├── Voter Resources Links
│       └── Educational Content (collapsible)
│
└── /search (Search Results)
    └── Judge Cards
        └── ElectionBadge (compact variant)
```

---

## Data Flow

### 1. Political Affiliation Sync Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ STEP 1: Initialization                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  npm run sync:political                                          │
│         │                                                        │
│         ▼                                                        │
│  PoliticalAffiliationSyncManager.syncPoliticalAffiliations()    │
│         │                                                        │
│         ├─► Check options (batchSize, skipIfExists, etc.)       │
│         └─► Query judges with courtlistener_id                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 2: Batch Processing                                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For each batch of 10 judges:                                   │
│    │                                                             │
│    ├─► Fetch political affiliations from CourtListener          │
│    │     │                                                       │
│    │     ├─► Rate limit: 1.5s delay between requests            │
│    │     └─► GET /api/rest/v4/political-affiliations/?person=X  │
│    │                                                             │
│    ├─► Format affiliation text                                  │
│    │     │                                                       │
│    │     ├─► Simple: "Republican Party (2018-present, Trump)"   │
│    │     └─► History: "Republican (2018-present); Dem (2010-18)"│
│    │                                                             │
│    ├─► Update judge record                                      │
│    │     │                                                       │
│    │     ├─► political_affiliation column (VARCHAR)             │
│    │     └─► courtlistener_data JSONB (optional full history)   │
│    │                                                             │
│    └─► Update statistics                                        │
│          │                                                       │
│          └─► Count by party (D, R, I, Other)                    │
│                                                                  │
│  Wait 2s between batches                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│ STEP 3: Results & Logging                                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Return PoliticalAffiliationSyncResult:                         │
│    - success: boolean                                            │
│    - judgesProcessed: number                                     │
│    - judgesUpdated: number                                       │
│    - judgesSkipped: number                                       │
│    - errors: string[]                                            │
│    - duration: number (ms)                                       │
│    - stats:                                                      │
│        - democraticCount                                         │
│        - republicanCount                                         │
│        - independentCount                                        │
│        - otherCount                                              │
│        - noDataCount                                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2. User Election Data Request Flow

```
┌──────────────────────────────────────────────────────────────────┐
│ USER INITIATES REQUEST                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User navigates to /judges/john-doe                             │
│                                                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ PAGE COMPONENT LOADS                                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  app/judges/[slug]/page.tsx                                     │
│    │                                                             │
│    ├─► Fetch judge data from Supabase                           │
│    │     SELECT id, name, selection_method,                     │
│    │            next_election_date, current_term_end_date,      │
│    │            is_elected, current_political_party,            │
│    │            political_affiliation                            │
│    │     FROM judges WHERE slug = 'john-doe'                    │
│    │                                                             │
│    └─► Fetch election history                                   │
│          SELECT * FROM judge_elections                           │
│          WHERE judge_id = 'uuid'                                │
│          ORDER BY election_date DESC                             │
│                                                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ COMPONENT RENDERING                                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  <ElectionInformation                                           │
│    judgeId={judge.id}                                           │
│    selectionMethod={judge.selection_method}                     │
│    currentTermEndDate={judge.current_term_end_date}             │
│    nextElectionDate={judge.next_election_date}                  │
│    electionHistory={elections}                                  │
│    showPoliticalAffiliation={true}                              │
│    currentAffiliation={judge.current_political_party}           │
│  />                                                             │
│    │                                                             │
│    ├─► Calculate years remaining in term                        │
│    ├─► Calculate days until next election                       │
│    ├─► Sort election history by date                            │
│    ├─► Render selection method badge                            │
│    ├─► Render current term card                                 │
│    ├─► Render next election card (if applicable)                │
│    ├─► Render political affiliation                             │
│    ├─► Render election history timeline                         │
│    │     └─► Map elections to ElectionHistoryItem components    │
│    ├─► Render voter resource links                              │
│    └─► Render educational content (collapsible)                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3. API Request Flow (Upcoming Elections)

```
┌──────────────────────────────────────────────────────────────────┐
│ CLIENT REQUEST                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GET /api/v1/elections/upcoming?                                │
│      jurisdiction=California&                                    │
│      start_date=2025-10-22&                                     │
│      end_date=2026-10-22&                                       │
│      limit=50                                                    │
│                                                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION & RATE LIMITING                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ├─► Check API key (if required)                                │
│  │     requireApiKeyIfEnabled(headers)                          │
│  │                                                               │
│  └─► Enforce rate limit                                         │
│        enforceRateLimit('v1:elections:upcoming:client-key')     │
│        └─► Upstash Redis check                                  │
│              - Allowed: Continue                                 │
│              - Denied: Return 429 with headers                   │
│                                                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ QUERY BUILDING                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Supabase query:                                                │
│    │                                                             │
│    ├─► SELECT judge_elections.*, judges.name, judges.court_name │
│    │     FROM judge_elections                                   │
│    │     INNER JOIN judges ON judges.id = judge_elections.judge_id│
│    │     WHERE election_date >= '2025-10-22'                    │
│    │       AND election_date <= '2026-10-22'                    │
│    │       AND won IS NULL (pending elections)                  │
│    │       AND jurisdiction = 'California'                      │
│    │     ORDER BY election_date ASC                             │
│    │     LIMIT 50 OFFSET 0                                      │
│    │                                                             │
│    └─► Get total count (for pagination)                         │
│                                                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ RESPONSE FORMATTING                                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  For each election:                                             │
│    ├─► Calculate days_until_election                            │
│    └─► Format response object                                   │
│                                                                  │
│  Calculate statistics:                                          │
│    ├─► next_30_days count                                       │
│    ├─► next_90_days count                                       │
│    └─► next_180_days count                                      │
│                                                                  │
│  Build UpcomingElectionResponse:                                │
│    {                                                             │
│      total_count: 15,                                            │
│      elections: [...],                                           │
│      next_30_days: 5,                                            │
│      next_90_days: 10,                                           │
│      next_180_days: 15                                           │
│    }                                                             │
│                                                                  │
│  Set cache headers:                                             │
│    Cache-Control: public, s-maxage=3600, stale-while-revalidate=300│
│                                                                  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│ RESPONSE TO CLIENT                                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HTTP 200 OK                                                    │
│  Headers:                                                        │
│    - RateLimit-Remaining: 49                                    │
│    - RateLimit-Reset: 1698012345                                │
│    - Cache-Control: public, s-maxage=3600                       │
│                                                                  │
│  Body: UpcomingElectionResponse JSON                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Integration Points

### 1. Judge Profile Pages

**File**: `/app/judges/[slug]/page.tsx`

**Integration**:
```typescript
import { ElectionInformation } from '@/components/judges/ElectionInformation'

// In page component:
<ElectionInformation
  judgeId={judge.id}
  selectionMethod={judge.selection_method}
  currentTermEndDate={judge.current_term_end_date}
  nextElectionDate={judge.next_election_date}
  electionHistory={elections}
  showPoliticalAffiliation={true}
  currentAffiliation={judge.current_political_party}
/>
```

**Data Requirements**:
- Fetch judge election fields: `selection_method`, `next_election_date`, `current_term_end_date`, `is_elected`, `current_political_party`, `political_affiliation`
- Fetch election history: Query `judge_elections` table with judge_id

### 2. Search Results

**File**: `/app/search/page.tsx` (or similar)

**Integration**:
```typescript
import { ElectionBadge } from '@/components/judges/ElectionBadge'

// In search result card:
<ElectionBadge
  selectionMethod={judge.selection_method}
  nextElectionDate={judge.next_election_date}
  variant="compact"
/>
```

**Display Logic**:
- Show compact badge for all judges
- Highlight judges with elections within 180 days
- Tooltip provides additional context

### 3. Elections Landing Page

**File**: `/app/elections/page.tsx`

**Integration**:
- Uses `/api/v1/elections/upcoming` endpoint
- Server-side data fetching with Next.js
- Filters by county, court level, date range
- SEO optimized with structured data

**Meta Tags**:
```typescript
export const metadata: Metadata = {
  title: 'California Judicial Elections Guide | Know Your Judges Before You Vote',
  description: 'Research judges on your California ballot with comprehensive election information...',
  keywords: 'california judicial elections, judge elections, ballot judges...',
}
```

### 4. API Integration

**External Consumers**:
- Legal research platforms
- Voter advocacy organizations
- Political campaigns
- Academic researchers

**Authentication**:
- Optional API key via `X-API-Key` header
- Rate limiting enforced regardless

**Example Request**:
```bash
curl -X GET "https://judgefinder.io/api/v1/elections/upcoming?jurisdiction=California&limit=10" \
  -H "X-API-Key: your_api_key_here"
```

### 5. CourtListener Data Pipeline

**Integration Point**: Political affiliation sync script

**Frequency**:
- Initial sync: One-time bulk import
- Incremental sync: Weekly updates for new judges
- Re-sync: Monthly to catch party changes

**Data Mapping**:
- CourtListener `political_party` → JudgeFinder `political_affiliation` (formatted string)
- CourtListener `appointer.name` → Included in affiliation text
- CourtListener `date_start`/`date_end` → Year range in affiliation text

**Error Handling**:
- Missing data: Skip judge (no affiliation stored)
- API errors: Log and continue with next judge
- Rate limit exceeded: Wait for hourly reset

### 6. Future: California Secretary of State

**Planned Integration**: Direct election results import

**Data Sources**:
- Election night results (JSON/CSV)
- Candidate statements
- Campaign finance filings
- Official ballot language

**Implementation Status**: Not yet started (Phase 2)

---

## Technical Specifications

### TypeScript Types

**Location**: `/types/elections.ts` and `/types/election-data.ts`

**Core Enums**:
```typescript
enum ElectionType {
  PARTISAN = 'partisan',
  NONPARTISAN = 'nonpartisan',
  RETENTION = 'retention',
  RECALL = 'recall'
}

enum SelectionMethod {
  APPOINTED = 'appointed',
  ELECTED = 'elected',
  MERIT_SELECTION = 'merit_selection',
  LEGISLATIVE_APPOINTMENT = 'legislative_appointment',
  RETENTION_ELECTION = 'retention_election',
  COMMISSION_APPOINTMENT = 'commission_appointment'
}

enum PoliticalParty {
  DEMOCRATIC = 'democratic',
  REPUBLICAN = 'republican',
  INDEPENDENT = 'independent',
  LIBERTARIAN = 'libertarian',
  GREEN = 'green',
  NONPARTISAN = 'nonpartisan',
  UNKNOWN = 'unknown',
  OTHER = 'other'
}
```

**Key Interfaces**:
```typescript
interface JudgeElection {
  id: string
  judge_id: string
  election_date: string
  election_type: ElectionType
  position_sought: string
  result: ElectionResult
  vote_percentage: number | null
  total_votes: number | null
  is_incumbent: boolean
  // ... more fields
}

interface ElectionInformationProps {
  judgeId: string
  selectionMethod: SelectionMethod
  currentTermEndDate: string | null
  nextElectionDate: string | null
  electionHistory: JudgeElection[]
  showFullHistory?: boolean
  showPoliticalAffiliation?: boolean
  currentAffiliation?: PoliticalParty | null
  className?: string
  onElectionClick?: (election: JudgeElection) => void
}
```

### Component API

#### ElectionInformation

**Props**:
- `judgeId` (required): UUID of the judge
- `selectionMethod` (required): How judge was selected
- `currentTermEndDate` (optional): ISO date string
- `nextElectionDate` (optional): ISO date string
- `electionHistory` (optional): Array of past elections
- `showFullHistory` (optional): Show all elections vs. top 3
- `showPoliticalAffiliation` (optional): Display party affiliation
- `currentAffiliation` (optional): Current party enum
- `className` (optional): Custom CSS classes
- `onElectionClick` (optional): Callback for election item clicks

**Features**:
- Automatically calculates years remaining in term
- Automatically calculates days until next election
- Sorts election history by date (most recent first)
- Gracefully handles missing data
- Accessible keyboard navigation
- Screen reader support
- Responsive design (mobile-first)

#### ElectionBadge

**Props**:
- `selectionMethod` (required): Selection method enum
- `nextElectionDate` (optional): ISO date string
- `isUpForElection` (optional): Boolean flag
- `variant` (optional): 'compact' | 'detailed' | 'minimal'
- `showCountdown` (optional): Show days until election
- `className` (optional): Custom CSS classes

**Variants**:
- **Minimal**: Icon only (for very tight spaces)
- **Compact**: Icon + label (default for cards)
- **Detailed**: Full info with next election date

**Accessibility**:
- ARIA labels for all icons
- Screen reader text for abbreviations
- Keyboard focusable tooltips
- Respects `prefers-reduced-motion`

### API Specifications

#### GET `/api/v1/elections/upcoming`

**Query Parameters**:
- `jurisdiction` (optional): Filter by state/county
- `start_date` (optional): ISO 8601 date (default: today)
- `end_date` (optional): ISO 8601 date (default: 1 year from now)
- `election_type` (optional): Filter by election type
- `limit` (optional): Results per page (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): 'date_asc' | 'date_desc' (default: 'date_asc')

**Response** (200 OK):
```json
{
  "total_count": 15,
  "elections": [
    {
      "id": "uuid",
      "judge_id": "uuid",
      "judge_name": "Hon. Jane Smith",
      "court_name": "Superior Court of Los Angeles",
      "election_date": "2026-11-03",
      "election_type": "retention",
      "days_until_election": 380,
      "is_incumbent": true,
      "is_contested": false
    }
  ],
  "next_30_days": 5,
  "next_90_days": 10,
  "next_180_days": 15
}
```

**Error Responses**:
- `400`: Invalid parameters
- `401`: Unauthorized (if API key required)
- `429`: Rate limit exceeded
- `500`: Internal server error

**Rate Limits**:
- Anonymous: 10 requests/hour
- Authenticated: 50 requests/hour
- With API key: 500 requests/hour

**Cache Headers**:
- `Cache-Control: public, s-maxage=3600, stale-while-revalidate=300`
- Cacheable for 1 hour

---

## Database Schema

### Table: `judges` (Modified)

**New Columns**:
```sql
ALTER TABLE judges ADD COLUMN selection_method selection_method DEFAULT 'unknown';
ALTER TABLE judges ADD COLUMN current_term_end_date DATE;
ALTER TABLE judges ADD COLUMN next_election_date DATE;
ALTER TABLE judges ADD COLUMN is_elected BOOLEAN DEFAULT FALSE;
ALTER TABLE judges ADD COLUMN current_political_party political_party DEFAULT 'unknown';
ALTER TABLE judges ADD COLUMN political_affiliation VARCHAR(100);
```

**Indexes**:
```sql
CREATE INDEX idx_judges_selection_method ON judges(selection_method);
CREATE INDEX idx_judges_is_elected ON judges(is_elected) WHERE is_elected = TRUE;
CREATE INDEX idx_judges_next_election_date ON judges(next_election_date) WHERE next_election_date IS NOT NULL;
CREATE INDEX idx_judges_political_affiliation ON judges(political_affiliation) WHERE political_affiliation IS NOT NULL;
```

### Table: `judge_elections` (New)

**Columns**:
```sql
CREATE TABLE judge_elections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,

  -- Election identification
  election_type election_type NOT NULL,
  election_date DATE NOT NULL,
  election_name VARCHAR(255),

  -- Location
  jurisdiction VARCHAR(255),
  district VARCHAR(255),

  -- Results
  won BOOLEAN,
  vote_count INTEGER,
  vote_percentage DECIMAL(5,2),
  total_votes_cast INTEGER,

  -- Retention elections
  yes_votes INTEGER,
  no_votes INTEGER,
  retention_threshold DECIMAL(5,2),

  -- Term info
  term_start_date DATE,
  term_end_date DATE,
  term_length_years INTEGER,

  -- Context
  is_incumbent BOOLEAN DEFAULT FALSE,
  is_contested BOOLEAN DEFAULT FALSE,
  opponent_count INTEGER DEFAULT 0,

  -- Source
  source_name VARCHAR(255),
  source_url TEXT,
  source_date DATE,
  notes TEXT,
  verified BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE INDEX idx_judge_elections_judge_id ON judge_elections(judge_id);
CREATE INDEX idx_judge_elections_election_date ON judge_elections(election_date DESC);
CREATE INDEX idx_judge_elections_judge_date ON judge_elections(judge_id, election_date DESC);
CREATE INDEX idx_judge_elections_jurisdiction_date ON judge_elections(jurisdiction, election_date DESC);
```

### Table: `judge_election_opponents` (New)

**Columns**:
```sql
CREATE TABLE judge_election_opponents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID NOT NULL REFERENCES judge_elections(id) ON DELETE CASCADE,

  opponent_name VARCHAR(255) NOT NULL,
  opponent_party political_party,
  vote_count INTEGER,
  vote_percentage DECIMAL(5,2),
  is_incumbent BOOLEAN DEFAULT FALSE,
  occupation VARCHAR(255),
  background TEXT,
  source_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(election_id, opponent_name)
);
```

### Table: `judge_political_affiliations` (New)

**Columns**:
```sql
CREATE TABLE judge_political_affiliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  judge_id UUID NOT NULL REFERENCES judges(id) ON DELETE CASCADE,

  political_party political_party NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,

  source_name VARCHAR(255),
  source_url TEXT,
  source_date DATE,
  verified BOOLEAN DEFAULT FALSE,
  registration_type VARCHAR(100),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT check_current_dates CHECK (
    (is_current = TRUE AND end_date IS NULL) OR
    (is_current = FALSE)
  )
);
```

### Enums

```sql
CREATE TYPE election_type AS ENUM (
  'initial_election',
  'retention',
  'competitive',
  'general',
  'primary',
  'recall',
  'special',
  'reelection'
);

CREATE TYPE selection_method AS ENUM (
  'elected',
  'appointed',
  'merit_selection',
  'retention',
  'legislative',
  'mixed',
  'unknown'
);

CREATE TYPE political_party AS ENUM (
  'democratic',
  'republican',
  'independent',
  'libertarian',
  'green',
  'constitution',
  'american_independent',
  'peace_and_freedom',
  'no_party_preference',
  'nonpartisan',
  'other',
  'unknown'
);
```

### RLS Policies

**Public Read Access** (election data is public record):
```sql
CREATE POLICY "Public read access for elections"
  ON judge_elections FOR SELECT USING (true);

CREATE POLICY "Public read access for opponents"
  ON judge_election_opponents FOR SELECT USING (true);

CREATE POLICY "Public read access for political affiliations"
  ON judge_political_affiliations FOR SELECT USING (true);
```

**Admin Write Access**:
```sql
CREATE POLICY "Admin write access for elections"
  ON judge_elections FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );
```

### Helper Functions

```sql
-- Get most recent election for a judge
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
  SELECT je.id, je.election_date, je.election_type, je.won, je.vote_percentage
  FROM judge_elections je
  WHERE je.judge_id = judge_uuid
  ORDER BY je.election_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get current political affiliation
CREATE OR REPLACE FUNCTION get_current_political_affiliation(judge_uuid UUID)
RETURNS political_party AS $$
DECLARE
  current_party political_party;
BEGIN
  SELECT political_party INTO current_party
  FROM judge_political_affiliations
  WHERE judge_id = judge_uuid AND is_current = TRUE
  LIMIT 1;

  RETURN COALESCE(current_party, 'unknown'::political_party);
END;
$$ LANGUAGE plpgsql;
```

---

## Future Enhancements

### Phase 2: Enhanced Data Sources

#### 1. Ballotpedia Integration

**Status**: Planned for Q2 2026

**Data Points**:
- Campaign finance totals
- Endorsements from organizations
- Candidate questionnaires
- News coverage links
- Biographical information

**API**: Ballotpedia API (requires partnership agreement)

**Implementation Effort**: 40 hours
- API client development: 8 hours
- Data mapping and sync: 16 hours
- UI integration: 8 hours
- Testing and QA: 8 hours

#### 2. California Secretary of State Direct Feed

**Status**: Planned for November 2026

**Data Points**:
- Real-time election night results
- Official candidate statements
- Campaign finance reports (Form 460)
- Voting district data
- Historical election archives

**Format**: CSV/JSON bulk downloads + real-time API (if available)

**Implementation Effort**: 60 hours
- API integration: 20 hours
- Data ingestion pipeline: 24 hours
- UI updates: 8 hours
- Testing: 8 hours

### Phase 3: Enhanced Analytics

#### 1. Predictive Election Modeling

**Status**: Research phase

**Features**:
- Predict retention election outcomes based on historical approval rates
- Identify close races based on past vote percentages
- Forecast judicial vacancies based on term end dates and age

**Technology**: TensorFlow.js or scikit-learn

**Implementation Effort**: 80 hours

#### 2. Comparative Judge Analysis

**Status**: Planned for Q3 2026

**Features**:
- Side-by-side election history comparison
- Political affiliation change detection
- Appointment vs. election outcome analysis
- Judicial diversity metrics by selection method

**Implementation Effort**: 40 hours

#### 3. Voter Turnout Analysis

**Status**: Concept stage

**Features**:
- Judicial race turnout vs. top-of-ticket races
- Drop-off rates for retention elections
- County-by-county engagement metrics
- Correlation with voter education campaigns

**Data Requirements**: County-level election data

**Implementation Effort**: 60 hours

### Phase 4: Interactive Features

#### 1. Election Alerts & Notifications

**Status**: Planned for Q4 2026

**Features**:
- Email alerts for judges up for election in user's county
- Push notifications for election day reminders
- Custom alerts for judges user has researched
- Weekly digest of upcoming elections

**Technology**: Resend email service + web push API

**Implementation Effort**: 48 hours

#### 2. Voter Guide Generator

**Status**: Concept stage

**Features**:
- Personalized PDF voter guide based on user's address
- Includes all judges on user's ballot
- Decision history summaries
- Recommended research questions
- QR code links to full profiles

**Technology**: Puppeteer for PDF generation

**Implementation Effort**: 80 hours

#### 3. Crowdsourced Election Monitoring

**Status**: Research phase

**Features**:
- User-submitted election results (with verification)
- Campaign event calendar
- Candidate forum videos
- Community Q&A with verified attorneys

**Moderation**: Required (significant effort)

**Implementation Effort**: 120+ hours

### Phase 5: Mobile Experience

#### 1. Progressive Web App (PWA)

**Status**: Planned for 2027

**Features**:
- Offline access to judge profiles
- Home screen installation
- Push notifications
- Location-based judge recommendations

**Technology**: Next.js PWA plugin

**Implementation Effort**: 40 hours

#### 2. Native Mobile Apps

**Status**: Consideration for 2028

**Platforms**: iOS and Android

**Technology**: React Native or Flutter

**Implementation Effort**: 400+ hours

---

## Conclusion

The Judicial Elections Feature represents a strategic expansion of JudgeFinder's mission to democratize access to judicial information. By combining election data with existing judicial analytics, we provide unprecedented transparency into California's judicial selection process.

This feature positions JudgeFinder as the definitive resource for voters researching judicial candidates, while maintaining our commitment to data-driven, nonpartisan analysis.

**Key Success Metrics** (6-month targets):
- 50,000+ unique visitors to `/elections` page
- 500+ judge profiles viewed with election information
- 10+ media mentions during election season
- 5+ partnerships with voter advocacy organizations

**Next Steps**:
1. Review this documentation with stakeholders
2. Prioritize Phase 2 enhancements based on user feedback
3. Develop marketing plan for 2026 election cycle
4. Establish partnerships with Secretary of State and Ballotpedia

---

**Document Prepared By**: Claude (Technical Documentation Agent)
**Review Status**: Pending stakeholder review
**Version History**:
- v1.0.0 (2025-10-22): Initial comprehensive documentation
