# TypeScript Type Definitions

This directory contains comprehensive TypeScript type definitions for the JudgeFinder platform.

## File Structure

### `index.ts`
Main type definitions including:
- **Judge**: Core judge profile with biographical and performance data
- **Court**: Court information and hierarchy
- **Case**: Judicial case records and decisions
- **CourtAssignment**: Judge-court position tracking over time
- **Attorney**: Legal professional profiles
- **Subscription**: User subscription data
- **Analytics**: Events and metrics

All election types are also re-exported from this file for convenience.

### `elections.ts`
Comprehensive type definitions for the judicial election feature including:
- **Election tracking**: Election records, results, and opponents
- **Political affiliations**: Party affiliation history
- **Selection methods**: How judges are selected (appointed, elected, etc.)
- **API responses**: Structured responses for election data
- **UI components**: Props for election-related React components

## Usage

### Basic Import (Recommended)

```typescript
import { Judge, Court, Case } from '@/types'
```

### Election Types

```typescript
import {
  ElectionType,
  SelectionMethod,
  ElectionResult,
  PoliticalParty,
  JudgeElection,
  ElectionOpponent,
  PoliticalAffiliation
} from '@/types'
```

Or import directly from the elections module:

```typescript
import { ElectionType, JudgeElection } from '@/types/elections'
```

## Election Feature Quick Start

### Enums

**ElectionType**
- `PARTISAN`: Elections with party affiliation on ballot
- `NONPARTISAN`: Elections without party labels
- `RETENTION`: Yes/no vote to retain sitting judge
- `RECALL`: Special election to remove judge

**SelectionMethod**
- `APPOINTED`: Executive appointment
- `ELECTED`: Won competitive election
- `MERIT_SELECTION`: Missouri Plan (nominating commission)
- `LEGISLATIVE_APPOINTMENT`: Legislature appoints
- `RETENTION_ELECTION`: Retained through yes/no vote
- `COMMISSION_APPOINTMENT`: Judicial commission appoints

**ElectionResult**
- `WON`: Candidate won
- `LOST`: Candidate lost
- `UNOPPOSED`: Ran unopposed and won
- `WITHDRAWN`: Withdrew before election
- `PENDING`: Election not yet held
- `RETAINED`: Judge retained (retention elections)
- `NOT_RETAINED`: Judge not retained

**PoliticalParty**
- `DEMOCRATIC`, `REPUBLICAN`, `LIBERTARIAN`, `GREEN`
- `INDEPENDENT`, `NONPARTISAN`, `UNKNOWN`, `OTHER`

### Core Interfaces

#### JudgeElection
Represents a single judicial election or retention vote.

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
  // ... additional fields
}
```

#### ElectionOpponent
Opponents who ran against a judge.

```typescript
interface ElectionOpponent {
  id: string
  election_id: string
  opponent_name: string
  political_party: PoliticalParty | null
  vote_percentage: number | null
  total_votes: number | null
  is_incumbent: boolean
}
```

#### PoliticalAffiliation
Tracks political party affiliation over time.

```typescript
interface PoliticalAffiliation {
  id: string
  judge_id: string
  political_party: PoliticalParty
  start_date: string | null
  end_date: string | null
  is_current: boolean
  confidence_level: 'high' | 'medium' | 'low' | null
  verification_method: 'voter_registration' | 'public_statement' | ...
}
```

### Extended Judge Type

The base `Judge` interface has been extended with election fields:

```typescript
interface Judge {
  // ... existing fields

  // Election fields
  selection_method?: SelectionMethod | null
  current_term_end_date?: string | null
  next_election_date?: string | null
  is_elected?: boolean

  // Optional relations (when explicitly requested)
  elections?: JudgeElection[]
  political_affiliations?: PoliticalAffiliation[]
}
```

### API Response Types

#### ElectionHistoryResponse
Complete election history for a judge.

```typescript
interface ElectionHistoryResponse {
  judge_id: string
  judge_name: string
  total_elections: number
  elections: Array<JudgeElection & { opponents: ElectionOpponent[] }>
  win_rate: number
  average_vote_percentage: number | null
}
```

#### UpcomingElectionResponse
Judges with upcoming elections.

```typescript
interface UpcomingElectionResponse {
  total_count: number
  elections: Array<JudgeElection & {
    judge_name: string
    days_until_election: number
  }>
  next_30_days: number
  next_90_days: number
}
```

### UI Component Props

#### ElectionInformationProps
Display election information on judge profile.

```typescript
interface ElectionInformationProps {
  judgeId: string
  selectionMethod: SelectionMethod
  currentTermEndDate: string | null
  nextElectionDate: string | null
  electionHistory: JudgeElection[]
  showFullHistory?: boolean
  showPoliticalAffiliation?: boolean
}
```

#### ElectionBadgeProps
Compact badge showing election status.

```typescript
interface ElectionBadgeProps {
  selectionMethod: SelectionMethod
  nextElectionDate?: string | null
  isUpForElection?: boolean
  variant?: 'compact' | 'detailed' | 'minimal'
  showCountdown?: boolean
}
```

#### ElectionTimelineProps
Visual timeline of judge's elections.

```typescript
interface ElectionTimelineProps {
  elections: Array<JudgeElection & { opponents?: ElectionOpponent[] }>
  highlightUpcoming?: boolean
  showOpponents?: boolean
  showVotePercentages?: boolean
  interactive?: boolean
}
```

### Type Guards

Validate enum values at runtime:

```typescript
import { isElectionType, isPoliticalParty } from '@/types'

const value = 'partisan'
if (isElectionType(value)) {
  // TypeScript now knows value is ElectionType
  console.log(value) // Type: ElectionType
}

const party = 'democratic'
if (isPoliticalParty(party)) {
  // party is now typed as PoliticalParty
}
```

## Examples

### Fetching Judge with Elections

```typescript
import { Judge, JudgeElection } from '@/types'

const judge: Judge = await fetchJudge('judge-id')

if (judge.selection_method === 'elected' && judge.next_election_date) {
  const daysUntil = calculateDaysUntil(judge.next_election_date)
  console.log(`Judge is up for election in ${daysUntil} days`)
}
```

### Building Election Timeline

```tsx
import { ElectionTimelineProps } from '@/types'

function JudgeProfile({ judge }: { judge: Judge }) {
  const timelineProps: ElectionTimelineProps = {
    elections: judge.elections || [],
    highlightUpcoming: true,
    showOpponents: true,
    showVotePercentages: true
  }

  return <ElectionTimeline {...timelineProps} />
}
```

### Filtering Elections

```typescript
import { ElectionFilters, ElectionType, ElectionResult } from '@/types'

const filters: ElectionFilters = {
  electionType: [ElectionType.PARTISAN, ElectionType.NONPARTISAN],
  result: ElectionResult.WON,
  dateRange: {
    start: '2020-01-01',
    end: '2024-12-31'
  },
  competitiveOnly: true // Exclude unopposed races
}

const elections = await fetchElections(filters)
```

### Political Affiliation Display

```tsx
import { PoliticalParty, PoliticalAffiliation } from '@/types'

function PoliticalAffiliationBadge({
  affiliation
}: {
  affiliation: PoliticalAffiliation
}) {
  const partyColors = {
    [PoliticalParty.DEMOCRATIC]: 'blue',
    [PoliticalParty.REPUBLICAN]: 'red',
    [PoliticalParty.INDEPENDENT]: 'purple',
    // ... other mappings
  }

  return (
    <Badge color={partyColors[affiliation.political_party]}>
      {affiliation.political_party.toUpperCase()}
    </Badge>
  )
}
```

## Database Schema Alignment

These types align with the following database tables:

- `judges` - Extended with election fields
- `judge_elections` - Election records
- `judge_election_opponents` - Election opponents
- `judge_political_affiliations` - Party affiliation history

## Type Safety Best Practices

1. **Always use type guards for runtime validation**
   ```typescript
   if (isElectionType(value)) {
     // Safe to use as ElectionType
   }
   ```

2. **Use strict null checks**
   ```typescript
   if (judge.next_election_date) {
     // TypeScript knows it's not null here
     const date = new Date(judge.next_election_date)
   }
   ```

3. **Leverage discriminated unions**
   ```typescript
   type ElectionStatus =
     | { status: 'upcoming'; date: string }
     | { status: 'past'; result: ElectionResult }
     | { status: 'none' }
   ```

4. **Use const assertions for literal types**
   ```typescript
   const methods = ['appointed', 'elected'] as const
   type Method = typeof methods[number] // 'appointed' | 'elected'
   ```

## Contributing

When adding new election-related types:

1. Add interfaces to `types/elections.ts`
2. Export from `types/elections.ts`
3. Re-export from `types/index.ts` if needed for convenience
4. Update this README with examples
5. Add JSDoc comments with examples
6. Run `npm run type-check` to verify

## Related Documentation

- Database Schema: `/docs/database/`
- API Reference: `/docs/api/API_REFERENCE.md`
- CourtListener Integration: `/docs/integrations/courtlistener/`
