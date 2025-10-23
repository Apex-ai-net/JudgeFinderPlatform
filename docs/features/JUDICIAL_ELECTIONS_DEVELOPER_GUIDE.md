# Judicial Elections - Developer Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-22
**Audience**: Software Engineers, API Consumers, Contributors

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoint Documentation](#api-endpoint-documentation)
3. [TypeScript Types & Interfaces](#typescript-types--interfaces)
4. [Component Usage Examples](#component-usage-examples)
5. [Common Development Patterns](#common-development-patterns)
6. [Extension Points for Future Features](#extension-points-for-future-features)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Contributing](#contributing)

---

## Overview

This guide provides technical documentation for developers working with or extending the Judicial Elections feature. It covers API usage, component integration, type definitions, and common development patterns.

### Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.x
- **Database**: Supabase PostgreSQL
- **UI Components**: React 18 with shadcn/ui
- **Animations**: Framer Motion
- **API**: RESTful endpoints with rate limiting
- **Data Sync**: CourtListener API integration

### Key Files

```
/types/elections.ts                           # Core type definitions
/types/election-data.ts                       # Database entity types
/components/judges/ElectionInformation.tsx    # Main component
/components/judges/ElectionBadge.tsx          # Badge component
/app/api/v1/elections/upcoming/route.ts       # API endpoint
/lib/courtlistener/political-affiliation-sync.ts  # Sync logic
/supabase/migrations/20250122_001_add_election_tables.sql  # Schema
```

---

## API Endpoint Documentation

### Base URL

```
Production: https://judgefinder.io/api/v1
Development: http://localhost:3000/api/v1
```

### Authentication

API endpoints support optional API key authentication:

```bash
# Without API key (rate-limited)
curl https://judgefinder.io/api/v1/elections/upcoming

# With API key (higher limits)
curl -H "X-API-Key: your_api_key" \
  https://judgefinder.io/api/v1/elections/upcoming
```

### Rate Limits

| User Type | Limit | Window |
|-----------|-------|--------|
| Anonymous | 10 requests | 1 hour |
| Authenticated | 50 requests | 1 hour |
| API Key | 500 requests | 1 hour |

**Rate Limit Headers**:
```
RateLimit-Remaining: 49
RateLimit-Reset: 1698012345
```

---

### Endpoint: GET /api/v1/elections/upcoming

Retrieve judges with upcoming elections within a specified date range.

#### Request

```http
GET /api/v1/elections/upcoming?jurisdiction=California&limit=10&offset=0
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `jurisdiction` | string | No | All | Filter by state/county |
| `start_date` | ISO date | No | Today | Start of date range |
| `end_date` | ISO date | No | +1 year | End of date range |
| `election_type` | string | No | All | Filter by type (retention, competitive, etc.) |
| `limit` | number | No | 50 | Results per page (max: 200) |
| `offset` | number | No | 0 | Pagination offset |
| `sort` | string | No | date_asc | Sort order (date_asc, date_desc) |

**Example Request**:
```typescript
const response = await fetch(
  'https://judgefinder.io/api/v1/elections/upcoming?' +
  new URLSearchParams({
    jurisdiction: 'California',
    start_date: '2025-10-22',
    end_date: '2026-10-22',
    limit: '50'
  })
)
const data = await response.json()
```

#### Response

**Success (200 OK)**:
```json
{
  "total_count": 15,
  "elections": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "judge_id": "660e8400-e29b-41d4-a716-446655440001",
      "judge_name": "Hon. Jane Smith",
      "court_name": "Superior Court of Los Angeles County",
      "election_date": "2026-11-03",
      "election_type": "retention",
      "election_name": "2026 General Election",
      "jurisdiction": "California",
      "district": "Los Angeles County",
      "is_incumbent": true,
      "is_contested": false,
      "opponent_count": 0,
      "term_start_date": "2027-01-01",
      "term_end_date": "2033-01-01",
      "term_length_years": 6,
      "source_name": "CA Secretary of State",
      "source_url": "https://elections.cdn.sos.ca.gov/...",
      "verified": true,
      "days_until_election": 380
    }
  ],
  "next_30_days": 5,
  "next_90_days": 10,
  "next_180_days": 15
}
```

**Error (400 Bad Request)**:
```json
{
  "error": "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"
}
```

**Error (429 Too Many Requests)**:
```json
{
  "error": "Rate limit exceeded"
}
```

#### TypeScript Types

```typescript
interface UpcomingElectionResponse {
  total_count: number
  elections: Array<{
    id: string
    judge_id: string
    judge_name: string
    court_name: string | null
    election_date: string
    election_type: string
    days_until_election: number
    // ... other fields
  }>
  next_30_days: number
  next_90_days: number
  next_180_days: number
}
```

---

### Endpoint: GET /api/v1/elections/statistics

Get aggregated election statistics for a jurisdiction.

#### Request

```http
GET /api/v1/elections/statistics?jurisdiction=California
```

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `jurisdiction` | string | No | All | Filter by state/county |
| `start_date` | ISO date | No | All time | Start of date range |
| `end_date` | ISO date | No | Today | End of date range |

#### Response

**Success (200 OK)**:
```json
{
  "jurisdiction": "California",
  "time_period": {
    "start_date": "1950-01-01",
    "end_date": "2025-10-22"
  },
  "total_elections": 1250,
  "by_election_type": {
    "retention": 450,
    "competitive": 600,
    "initial_election": 200
  },
  "average_turnout": 68.5,
  "incumbent_win_rate": 0.87,
  "average_winner_percentage": 62.3,
  "unopposed_count": 125,
  "retention_pass_rate": 0.94
}
```

---

### Endpoint: GET /api/v1/judges/[id]/elections

Get complete election history for a specific judge.

#### Request

```http
GET /api/v1/judges/660e8400-e29b-41d4-a716-446655440001/elections
```

**Path Parameters**:
- `id`: Judge UUID

**Query Parameters**:
- `include_opponents`: Include opponent details (default: true)

#### Response

**Success (200 OK)**:
```json
{
  "judge_id": "660e8400-e29b-41d4-a716-446655440001",
  "judge_name": "Hon. Jane Smith",
  "total_elections": 3,
  "elections": [
    {
      "id": "election-uuid",
      "election_date": "2020-11-03",
      "election_type": "retention",
      "won": true,
      "vote_percentage": 67.5,
      "yes_votes": 450000,
      "no_votes": 217500,
      "opponents": []
    },
    {
      "id": "election-uuid-2",
      "election_date": "2014-11-04",
      "election_type": "competitive",
      "won": true,
      "vote_percentage": 62.3,
      "total_votes": 312000,
      "opponents": [
        {
          "opponent_name": "John Doe",
          "vote_percentage": 37.7,
          "vote_count": 189000
        }
      ]
    }
  ],
  "win_rate": 1.0,
  "average_vote_percentage": 64.9,
  "total_votes_received": 762000
}
```

---

## TypeScript Types & Interfaces

### Core Enums

```typescript
/**
 * Types of judicial elections
 */
export enum ElectionType {
  PARTISAN = 'partisan',
  NONPARTISAN = 'nonpartisan',
  RETENTION = 'retention',
  RECALL = 'recall'
}

/**
 * Methods of judicial selection
 */
export enum SelectionMethod {
  APPOINTED = 'appointed',
  ELECTED = 'elected',
  MERIT_SELECTION = 'merit_selection',
  LEGISLATIVE_APPOINTMENT = 'legislative_appointment',
  RETENTION_ELECTION = 'retention_election',
  COMMISSION_APPOINTMENT = 'commission_appointment'
}

/**
 * Political party affiliations
 */
export enum PoliticalParty {
  DEMOCRATIC = 'democratic',
  REPUBLICAN = 'republican',
  INDEPENDENT = 'independent',
  LIBERTARIAN = 'libertarian',
  GREEN = 'green',
  NONPARTISAN = 'nonpartisan',
  UNKNOWN = 'unknown',
  OTHER = 'other'
}

/**
 * Election outcomes
 */
export enum ElectionResult {
  WON = 'won',
  LOST = 'lost',
  UNOPPOSED = 'unopposed',
  WITHDRAWN = 'withdrawn',
  PENDING = 'pending',
  RETAINED = 'retained',
  NOT_RETAINED = 'not_retained'
}
```

### Database Entity Types

```typescript
/**
 * Judge election record from database
 */
export interface JudgeElection {
  id: string
  judge_id: string
  election_date: string
  election_type: ElectionType
  position_sought: string
  result: ElectionResult
  vote_percentage: number | null
  total_votes: number | null
  total_turnout: number | null
  jurisdiction: string | null
  is_incumbent: boolean
  endorsements: string[] | null
  source_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * Election opponent record
 */
export interface ElectionOpponent {
  id: string
  election_id: string
  opponent_name: string
  political_party: PoliticalParty | null
  vote_percentage: number | null
  total_votes: number | null
  is_incumbent: boolean
  bio: string | null
  created_at: string
}

/**
 * Political affiliation record
 */
export interface PoliticalAffiliation {
  id: string
  judge_id: string
  political_party: PoliticalParty
  start_date: string | null
  end_date: string | null
  is_current: boolean
  source_name: string | null
  source_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
```

### Component Prop Types

```typescript
/**
 * Props for ElectionInformation component
 */
export interface ElectionInformationProps {
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

/**
 * Props for ElectionBadge component
 */
export interface ElectionBadgeProps {
  selectionMethod: SelectionMethod
  nextElectionDate?: string | null
  isUpForElection?: boolean
  variant?: 'compact' | 'detailed' | 'minimal'
  showCountdown?: boolean
  className?: string
}
```

### Type Guards

```typescript
/**
 * Type guard to check if value is valid ElectionType
 */
export function isElectionType(value: unknown): value is ElectionType {
  return typeof value === 'string' &&
    Object.values(ElectionType).includes(value as ElectionType)
}

/**
 * Type guard to check if value is valid SelectionMethod
 */
export function isSelectionMethod(value: unknown): value is SelectionMethod {
  return typeof value === 'string' &&
    Object.values(SelectionMethod).includes(value as SelectionMethod)
}
```

---

## Component Usage Examples

### ElectionInformation Component

#### Basic Usage

```typescript
import { ElectionInformation } from '@/components/judges/ElectionInformation'
import { SelectionMethod, PoliticalParty } from '@/types/elections'

function JudgeProfile({ judge, elections }) {
  return (
    <div>
      {/* Other profile sections */}

      <ElectionInformation
        judgeId={judge.id}
        selectionMethod={judge.selection_method as SelectionMethod}
        currentTermEndDate={judge.current_term_end_date}
        nextElectionDate={judge.next_election_date}
        electionHistory={elections}
        showPoliticalAffiliation={true}
        currentAffiliation={judge.current_political_party as PoliticalParty}
      />
    </div>
  )
}
```

#### Advanced Usage with Event Handling

```typescript
function JudgeProfile({ judge, elections }) {
  const [selectedElection, setSelectedElection] = useState<JudgeElection | null>(null)

  const handleElectionClick = (election: JudgeElection) => {
    setSelectedElection(election)
    // Open modal, navigate to detail page, etc.
  }

  return (
    <>
      <ElectionInformation
        judgeId={judge.id}
        selectionMethod={judge.selection_method as SelectionMethod}
        currentTermEndDate={judge.current_term_end_date}
        nextElectionDate={judge.next_election_date}
        electionHistory={elections}
        showFullHistory={true}
        showPoliticalAffiliation={true}
        currentAffiliation={judge.current_political_party as PoliticalParty}
        onElectionClick={handleElectionClick}
        className="mb-8"
      />

      {selectedElection && (
        <ElectionDetailModal
          election={selectedElection}
          onClose={() => setSelectedElection(null)}
        />
      )}
    </>
  )
}
```

#### Conditional Rendering

```typescript
function JudgeProfile({ judge, elections }) {
  // Only show if judge has election data
  const hasElectionData =
    judge.next_election_date ||
    judge.current_term_end_date ||
    elections.length > 0

  if (!hasElectionData) {
    return null // or show placeholder
  }

  return (
    <ElectionInformation
      judgeId={judge.id}
      selectionMethod={judge.selection_method as SelectionMethod}
      currentTermEndDate={judge.current_term_end_date}
      nextElectionDate={judge.next_election_date}
      electionHistory={elections}
    />
  )
}
```

### ElectionBadge Component

#### Compact Variant (Search Results)

```typescript
import { ElectionBadge } from '@/components/judges/ElectionBadge'

function JudgeCard({ judge }) {
  return (
    <div className="p-4 border rounded">
      <h3>{judge.name}</h3>
      <p className="text-sm text-muted-foreground">{judge.court_name}</p>

      <ElectionBadge
        selectionMethod={judge.selection_method}
        nextElectionDate={judge.next_election_date}
        variant="compact"
        className="mt-2"
      />
    </div>
  )
}
```

#### Detailed Variant (Judge Profile Header)

```typescript
function JudgeProfileHeader({ judge }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1>{judge.name}</h1>
        <p>{judge.court_name}</p>
      </div>

      <ElectionBadge
        selectionMethod={judge.selection_method}
        nextElectionDate={judge.next_election_date}
        isUpForElection={judge.is_up_for_election}
        variant="detailed"
        showCountdown={true}
      />
    </div>
  )
}
```

#### Minimal Variant (Table Cell)

```typescript
function JudgesTable({ judges }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Court</th>
          <th>Selection</th>
        </tr>
      </thead>
      <tbody>
        {judges.map(judge => (
          <tr key={judge.id}>
            <td>{judge.name}</td>
            <td>{judge.court_name}</td>
            <td>
              <ElectionBadge
                selectionMethod={judge.selection_method}
                variant="minimal"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

---

## Common Development Patterns

### Fetching Election Data

#### Server Component (Recommended)

```typescript
// app/judges/[slug]/page.tsx
import { createServerClient } from '@/lib/supabase/server'
import { ElectionInformation } from '@/components/judges/ElectionInformation'

export default async function JudgePage({ params }: { params: { slug: string } }) {
  const supabase = await createServerClient()

  // Fetch judge with election fields
  const { data: judge } = await supabase
    .from('judges')
    .select(`
      *,
      selection_method,
      current_term_end_date,
      next_election_date,
      is_elected,
      current_political_party,
      political_affiliation
    `)
    .eq('slug', params.slug)
    .single()

  // Fetch election history
  const { data: elections } = await supabase
    .from('judge_elections')
    .select('*')
    .eq('judge_id', judge.id)
    .order('election_date', { ascending: false })

  return (
    <div>
      <ElectionInformation
        judgeId={judge.id}
        selectionMethod={judge.selection_method}
        currentTermEndDate={judge.current_term_end_date}
        nextElectionDate={judge.next_election_date}
        electionHistory={elections || []}
        showPoliticalAffiliation={true}
        currentAffiliation={judge.current_political_party}
      />
    </div>
  )
}
```

#### Client Component with API

```typescript
'use client'

import { useEffect, useState } from 'react'
import type { JudgeElection } from '@/types/elections'

export function ElectionList({ judgeId }: { judgeId: string }) {
  const [elections, setElections] = useState<JudgeElection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchElections() {
      const response = await fetch(`/api/v1/judges/${judgeId}/elections`)
      const data = await response.json()
      setElections(data.elections)
      setLoading(false)
    }

    fetchElections()
  }, [judgeId])

  if (loading) return <div>Loading...</div>

  return (
    <ul>
      {elections.map(election => (
        <li key={election.id}>{election.election_name}</li>
      ))}
    </ul>
  )
}
```

### Formatting Election Data

#### Date Formatting

```typescript
/**
 * Format election date for display
 */
export function formatElectionDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Usage
formatElectionDate('2026-11-03') // "November 3, 2026"
```

#### Days Until Calculation

```typescript
/**
 * Calculate days until election
 */
export function getDaysUntil(dateStr: string): number {
  const electionDate = new Date(dateStr)
  const today = new Date()
  const diffTime = electionDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

// Usage
getDaysUntil('2026-11-03') // 380 (or whatever current difference is)
```

#### Political Party Formatting

```typescript
/**
 * Format political party for display
 */
export function formatPoliticalParty(party: PoliticalParty): string {
  const labels: Record<PoliticalParty, string> = {
    [PoliticalParty.DEMOCRATIC]: 'Democratic',
    [PoliticalParty.REPUBLICAN]: 'Republican',
    [PoliticalParty.INDEPENDENT]: 'Independent',
    [PoliticalParty.LIBERTARIAN]: 'Libertarian',
    [PoliticalParty.GREEN]: 'Green',
    [PoliticalParty.NONPARTISAN]: 'Nonpartisan',
    [PoliticalParty.UNKNOWN]: 'Unknown',
    [PoliticalParty.OTHER]: 'Other'
  }

  return labels[party] || 'Unknown'
}
```

### Error Handling

#### API Error Handling

```typescript
async function fetchElections(judgeId: string) {
  try {
    const response = await fetch(`/api/v1/judges/${judgeId}/elections`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Judge not found')
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.')
      } else {
        throw new Error('Failed to fetch elections')
      }
    }

    return await response.json()
  } catch (error) {
    console.error('[ElectionAPI] Error:', error)
    throw error
  }
}
```

#### Component Error Boundaries

```typescript
import { ErrorBoundary } from 'react-error-boundary'

function ElectionErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="rounded-lg border border-red-500 bg-red-50 p-4">
      <h3 className="font-semibold text-red-800">
        Failed to load election information
      </h3>
      <p className="text-sm text-red-600">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 text-sm text-red-700 underline"
      >
        Try again
      </button>
    </div>
  )
}

function JudgeProfile({ judge }) {
  return (
    <ErrorBoundary FallbackComponent={ElectionErrorFallback}>
      <ElectionInformation {...props} />
    </ErrorBoundary>
  )
}
```

---

## Extension Points for Future Features

### 1. Campaign Finance Integration

**Location**: `/lib/features/campaign-finance/`

**Extension Hook**:
```typescript
// Add to ElectionInformation component
interface ElectionInformationProps {
  // ... existing props
  showCampaignFinance?: boolean
  campaignFinanceData?: CampaignFinanceData
}

interface CampaignFinanceData {
  total_contributions: number
  total_expenditures: number
  major_donors: Donor[]
  independent_expenditures: number
}
```

**Integration Point**:
```typescript
// In ElectionInformation.tsx, add section:
{showCampaignFinance && campaignFinanceData && (
  <CampaignFinanceSection data={campaignFinanceData} />
)}
```

### 2. Endorsement Tracking

**Database Schema Extension**:
```sql
CREATE TABLE judge_election_endorsements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_id UUID REFERENCES judge_elections(id) ON DELETE CASCADE,
  organization_name VARCHAR(255) NOT NULL,
  organization_type VARCHAR(100), -- 'legal', 'political', 'newspaper', etc.
  endorsement_date DATE,
  endorsement_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Type Definition**:
```typescript
export interface ElectionEndorsement {
  id: string
  election_id: string
  organization_name: string
  organization_type: string | null
  endorsement_date: string | null
  endorsement_url: string | null
  created_at: string
}
```

### 3. Real-time Election Results

**WebSocket Integration**:
```typescript
// lib/features/election-results/live-results.ts
export class LiveElectionResults {
  private socket: WebSocket

  constructor(electionId: string) {
    this.socket = new WebSocket(`wss://api.judgefinder.io/elections/${electionId}`)

    this.socket.onmessage = (event) => {
      const update = JSON.parse(event.data)
      this.handleUpdate(update)
    }
  }

  private handleUpdate(update: ElectionResultUpdate) {
    // Update UI in real-time
  }
}
```

**Component Integration**:
```typescript
'use client'

export function LiveElectionTracker({ electionId }: { electionId: string }) {
  const [results, setResults] = useState<ElectionResults | null>(null)

  useEffect(() => {
    const tracker = new LiveElectionResults(electionId)
    tracker.onUpdate((update) => setResults(update))

    return () => tracker.disconnect()
  }, [electionId])

  return <ElectionResultsDisplay results={results} />
}
```

### 4. Predictive Modeling

**ML Integration Point**:
```typescript
// lib/ml/election-predictions.ts
export async function predictRetentionOutcome(
  judge: JudgeWithElections
): Promise<RetentionPrediction> {
  const features = extractFeatures(judge)
  const prediction = await model.predict(features)

  return {
    outcome: prediction > 0.5 ? 'retained' : 'not_retained',
    confidence: Math.abs(prediction - 0.5) * 2,
    factors: explainPrediction(features, prediction)
  }
}

interface RetentionPrediction {
  outcome: 'retained' | 'not_retained'
  confidence: number
  factors: PredictionFactor[]
}
```

### 5. Comparative Analytics

**Component Extension**:
```typescript
export interface CompareElectionsProps {
  judges: JudgeWithElections[]
  metric: 'win_rate' | 'avg_vote_percentage' | 'retention_rate'
}

export function CompareElections({ judges, metric }: CompareElectionsProps) {
  const comparison = useMemo(() =>
    judges.map(judge => ({
      judge,
      value: calculateMetric(judge.elections, metric)
    }))
  , [judges, metric])

  return (
    <div>
      {comparison.map(({ judge, value }) => (
        <ComparisonRow key={judge.id} judge={judge} value={value} />
      ))}
    </div>
  )
}
```

---

## Troubleshooting Guide

### Common Issues

#### Type Errors with Enums

**Problem**: TypeScript error when assigning string to enum type

```typescript
// ❌ Error: Type 'string' is not assignable to type 'SelectionMethod'
const method: SelectionMethod = judge.selection_method
```

**Solution**: Cast string to enum with type guard

```typescript
// ✅ Correct
import { isSelectionMethod } from '@/types/elections'

const method = isSelectionMethod(judge.selection_method)
  ? judge.selection_method
  : SelectionMethod.UNKNOWN
```

#### Missing Election Data

**Problem**: Component renders empty state despite data existing

**Debug Steps**:
```typescript
// 1. Log props
console.log('ElectionInformation props:', {
  judgeId,
  selectionMethod,
  electionHistory
})

// 2. Check database query
const { data, error } = await supabase
  .from('judge_elections')
  .select('*')
  .eq('judge_id', judgeId)

console.log('Elections query:', { data, error })

// 3. Verify field names match
// Ensure database columns match TypeScript interface
```

#### API Rate Limiting

**Problem**: 429 errors in production

**Solutions**:

1. **Implement client-side caching**:
```typescript
const cache = new Map<string, { data: any, timestamp: number }>()

async function fetchWithCache(url: string, ttl = 60000) {
  const cached = cache.get(url)

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }

  const response = await fetch(url)
  const data = await response.json()

  cache.set(url, { data, timestamp: Date.now() })

  return data
}
```

2. **Use API key for higher limits**:
```typescript
const headers = process.env.API_KEY
  ? { 'X-API-Key': process.env.API_KEY }
  : {}

const response = await fetch(url, { headers })
```

### Performance Optimization

#### Lazy Loading Elections

```typescript
'use client'

import dynamic from 'next/dynamic'

const ElectionInformation = dynamic(
  () => import('@/components/judges/ElectionInformation'),
  {
    loading: () => <ElectionInformationSkeleton />,
    ssr: false // Client-side only if needed
  }
)
```

#### Memoization

```typescript
import { useMemo } from 'react'

export function ElectionInformation(props: ElectionInformationProps) {
  const sortedElections = useMemo(() => {
    return [...props.electionHistory].sort((a, b) =>
      new Date(b.election_date).getTime() - new Date(a.election_date).getTime()
    )
  }, [props.electionHistory])

  // Use sortedElections in render
}
```

---

## Contributing

### Development Workflow

1. **Fork repository**
2. **Create feature branch**: `git checkout -b feature/election-enhancement`
3. **Make changes** following patterns in this guide
4. **Write tests**: See `/tests/unit/types/elections.test.ts` for examples
5. **Run type check**: `npm run type-check`
6. **Submit PR** with clear description

### Code Style

Follow existing patterns:
- Use TypeScript strict mode
- Export types from `/types/elections.ts`
- Add JSDoc comments for public APIs
- Follow component structure in existing files

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- elections.test.ts

# Type checking
npm run type-check
```

### Documentation

When adding features:
- Update this developer guide
- Add JSDoc comments to new functions
- Update type definitions
- Add examples to this guide

---

## Additional Resources

- **Main Feature Doc**: `/docs/features/JUDICIAL_ELECTIONS_FEATURE.md`
- **Implementation Guide**: `/docs/features/JUDICIAL_ELECTIONS_IMPLEMENTATION_GUIDE.md`
- **Data Sources**: `/docs/features/JUDICIAL_ELECTIONS_DATA_SOURCES.md`
- **User Guide**: `/docs/features/JUDICIAL_ELECTIONS_USER_GUIDE.md`
- **Type Definitions**: `/types/elections.ts`, `/types/election-data.ts`
- **Component Examples**: `/components/judges/ElectionBadge.examples.tsx`

---

**Document Prepared By**: Claude (Technical Documentation Agent)
**Version**: 1.0.0
**Last Updated**: 2025-10-22
