/**
 * ElectionInformation Component - Usage Examples
 *
 * This file demonstrates various ways to use the ElectionInformation component
 * in your application. The component displays comprehensive judicial election
 * and political affiliation data on judge profile pages.
 */

import { ElectionInformation } from './ElectionInformation'
import {
  SelectionMethod,
  ElectionType,
  ElectionResult,
  PoliticalParty,
  type JudgeElection,
} from '@/types/elections'

// ============================================================================
// EXAMPLE 1: Basic Usage - Elected Judge with Current Term
// ============================================================================

export function Example1_BasicElectedJudge() {
  return (
    <ElectionInformation
      judgeId="judge-123"
      selectionMethod={SelectionMethod.ELECTED}
      currentTermEndDate="2028-12-31"
      nextElectionDate="2028-11-05"
      electionHistory={[]}
    />
  )
}

// ============================================================================
// EXAMPLE 2: Complete Election History with Multiple Past Elections
// ============================================================================

export function Example2_CompleteElectionHistory() {
  const elections: JudgeElection[] = [
    {
      id: 'election-1',
      judge_id: 'judge-123',
      election_date: '2022-11-08',
      election_type: ElectionType.NONPARTISAN,
      position_sought: 'Superior Court Judge, Seat 4',
      result: ElectionResult.WON,
      vote_percentage: 64.2,
      total_votes: 125000,
      total_turnout: 195000,
      jurisdiction: 'Los Angeles County',
      court_id: 'court-la-superior',
      is_incumbent: true,
      endorsements: ['Bar Association', 'County Democrats'],
      campaign_finance_total: 250000,
      data_source: 'county_registrar',
      source_url: 'https://example.com/results',
      metadata: {},
      created_at: '2022-11-09T00:00:00Z',
      updated_at: '2022-11-09T00:00:00Z',
    },
    {
      id: 'election-2',
      judge_id: 'judge-123',
      election_date: '2016-11-08',
      election_type: ElectionType.NONPARTISAN,
      position_sought: 'Superior Court Judge, Seat 4',
      result: ElectionResult.WON,
      vote_percentage: 58.7,
      total_votes: 98000,
      total_turnout: 167000,
      jurisdiction: 'Los Angeles County',
      court_id: 'court-la-superior',
      is_incumbent: false,
      endorsements: ['Bar Association'],
      campaign_finance_total: 180000,
      data_source: 'county_registrar',
      source_url: 'https://example.com/results',
      metadata: {},
      created_at: '2016-11-09T00:00:00Z',
      updated_at: '2016-11-09T00:00:00Z',
    },
    {
      id: 'election-3',
      judge_id: 'judge-123',
      election_date: '2012-06-05',
      election_type: ElectionType.NONPARTISAN,
      position_sought: 'Municipal Court Judge',
      result: ElectionResult.LOST,
      vote_percentage: 47.3,
      total_votes: 42000,
      total_turnout: 89000,
      jurisdiction: 'Los Angeles County',
      court_id: 'court-la-municipal',
      is_incumbent: false,
      endorsements: null,
      campaign_finance_total: 85000,
      data_source: 'county_registrar',
      source_url: 'https://example.com/results',
      metadata: {},
      created_at: '2012-06-06T00:00:00Z',
      updated_at: '2012-06-06T00:00:00Z',
    },
  ]

  return (
    <ElectionInformation
      judgeId="judge-123"
      selectionMethod={SelectionMethod.ELECTED}
      currentTermEndDate="2028-12-31"
      nextElectionDate="2028-11-05"
      electionHistory={elections}
      showFullHistory={true}
    />
  )
}

// ============================================================================
// EXAMPLE 3: Appointed Judge with Retention Election
// ============================================================================

export function Example3_AppointedWithRetention() {
  const elections: JudgeElection[] = [
    {
      id: 'election-1',
      judge_id: 'judge-456',
      election_date: '2020-11-03',
      election_type: ElectionType.RETENTION,
      position_sought: 'Court of Appeal Justice, Division 2',
      result: ElectionResult.RETAINED,
      vote_percentage: 72.5,
      total_votes: 1850000,
      total_turnout: 2550000,
      jurisdiction: 'California',
      court_id: 'court-ca-appeal-2',
      is_incumbent: true,
      endorsements: null,
      campaign_finance_total: null,
      data_source: 'secretary_of_state',
      source_url: 'https://example.com/results',
      metadata: {},
      created_at: '2020-11-04T00:00:00Z',
      updated_at: '2020-11-04T00:00:00Z',
    },
  ]

  return (
    <ElectionInformation
      judgeId="judge-456"
      selectionMethod={SelectionMethod.RETENTION_ELECTION}
      currentTermEndDate="2032-12-31"
      nextElectionDate="2032-11-05"
      electionHistory={elections}
    />
  )
}

// ============================================================================
// EXAMPLE 4: With Political Affiliation
// ============================================================================

export function Example4_WithPoliticalAffiliation() {
  const elections: JudgeElection[] = [
    {
      id: 'election-1',
      judge_id: 'judge-789',
      election_date: '2018-11-06',
      election_type: ElectionType.NONPARTISAN,
      position_sought: 'Superior Court Judge, Seat 12',
      result: ElectionResult.WON,
      vote_percentage: 61.8,
      total_votes: 145000,
      total_turnout: 235000,
      jurisdiction: 'San Diego County',
      court_id: 'court-sd-superior',
      is_incumbent: false,
      endorsements: ['Bar Association', 'Local Democrats'],
      campaign_finance_total: 320000,
      data_source: 'county_registrar',
      source_url: 'https://example.com/results',
      metadata: {},
      created_at: '2018-11-07T00:00:00Z',
      updated_at: '2018-11-07T00:00:00Z',
    },
  ]

  return (
    <ElectionInformation
      judgeId="judge-789"
      selectionMethod={SelectionMethod.ELECTED}
      currentTermEndDate="2024-12-31"
      nextElectionDate="2024-11-05"
      electionHistory={elections}
      showPoliticalAffiliation={true}
      currentAffiliation={PoliticalParty.DEMOCRATIC}
    />
  )
}

// ============================================================================
// EXAMPLE 5: Upcoming Election (Days Until Election)
// ============================================================================

export function Example5_UpcomingElection() {
  // Calculate date 90 days from now
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + 90)
  const nextElectionDate = futureDate.toISOString().split('T')[0]

  return (
    <ElectionInformation
      judgeId="judge-999"
      selectionMethod={SelectionMethod.ELECTED}
      currentTermEndDate="2024-12-31"
      nextElectionDate={nextElectionDate}
      electionHistory={[]}
    />
  )
}

// ============================================================================
// EXAMPLE 6: Appointed Judge (No Elections)
// ============================================================================

export function Example6_PureAppointedJudge() {
  return (
    <ElectionInformation
      judgeId="judge-federal-1"
      selectionMethod={SelectionMethod.APPOINTED}
      currentTermEndDate={null}
      nextElectionDate={null}
      electionHistory={[]}
    />
  )
}

// ============================================================================
// EXAMPLE 7: With Custom Click Handler
// ============================================================================

export function Example7_WithClickHandler() {
  const handleElectionClick = (election: JudgeElection) => {
    console.log('Election clicked:', election)
    // Could open a modal, navigate to detail page, etc.
  }

  const elections: JudgeElection[] = [
    {
      id: 'election-1',
      judge_id: 'judge-123',
      election_date: '2022-11-08',
      election_type: ElectionType.NONPARTISAN,
      position_sought: 'Superior Court Judge',
      result: ElectionResult.WON,
      vote_percentage: 64.2,
      total_votes: 125000,
      total_turnout: 195000,
      jurisdiction: 'Los Angeles County',
      court_id: 'court-la-superior',
      is_incumbent: true,
      endorsements: null,
      campaign_finance_total: null,
      data_source: 'county_registrar',
      source_url: null,
      metadata: null,
      created_at: '2022-11-09T00:00:00Z',
      updated_at: '2022-11-09T00:00:00Z',
    },
  ]

  return (
    <ElectionInformation
      judgeId="judge-123"
      selectionMethod={SelectionMethod.ELECTED}
      currentTermEndDate="2028-12-31"
      nextElectionDate="2028-11-05"
      electionHistory={elections}
      onElectionClick={handleElectionClick}
    />
  )
}

// ============================================================================
// EXAMPLE 8: Limited Election History (Collapsed by Default)
// ============================================================================

export function Example8_CollapsedHistory() {
  // Create 5 elections, but only show first 3 initially
  const elections: JudgeElection[] = Array.from({ length: 5 }, (_, i) => ({
    id: `election-${i + 1}`,
    judge_id: 'judge-123',
    election_date: `${2022 - i * 4}-11-08`,
    election_type: ElectionType.NONPARTISAN,
    position_sought: 'Superior Court Judge, Seat 4',
    result: ElectionResult.WON,
    vote_percentage: 55 + Math.random() * 20,
    total_votes: 100000 + Math.floor(Math.random() * 50000),
    total_turnout: 180000,
    jurisdiction: 'Los Angeles County',
    court_id: 'court-la-superior',
    is_incumbent: i === 0,
    endorsements: null,
    campaign_finance_total: null,
    data_source: 'county_registrar',
    source_url: null,
    metadata: null,
    created_at: `${2022 - i * 4}-11-09T00:00:00Z`,
    updated_at: `${2022 - i * 4}-11-09T00:00:00Z`,
  }))

  return (
    <ElectionInformation
      judgeId="judge-123"
      selectionMethod={SelectionMethod.ELECTED}
      currentTermEndDate="2028-12-31"
      nextElectionDate="2028-11-05"
      electionHistory={elections}
      showFullHistory={false} // Start collapsed
    />
  )
}

// ============================================================================
// EXAMPLE 9: Integration with Judge Profile Page
// ============================================================================

export function Example9_JudgeProfileIntegration() {
  // Example of fetching data from API
  const judge = {
    id: 'judge-123',
    name: 'Hon. Jane Smith',
    court_name: 'Los Angeles Superior Court',
    // ... other judge fields
  }

  const electionData = {
    selectionMethod: SelectionMethod.ELECTED,
    currentTermEndDate: '2028-12-31',
    nextElectionDate: '2028-11-05',
    electionHistory: [], // Fetched from API
    currentAffiliation: PoliticalParty.DEMOCRATIC,
  }

  return (
    <div className="space-y-6">
      {/* Other profile sections */}

      <ElectionInformation
        judgeId={judge.id}
        selectionMethod={electionData.selectionMethod}
        currentTermEndDate={electionData.currentTermEndDate}
        nextElectionDate={electionData.nextElectionDate}
        electionHistory={electionData.electionHistory}
        showPoliticalAffiliation={true}
        currentAffiliation={electionData.currentAffiliation}
      />

      {/* Other profile sections */}
    </div>
  )
}

// ============================================================================
// EXAMPLE 10: Partial Data (Only Term End Date)
// ============================================================================

export function Example10_PartialData() {
  return (
    <ElectionInformation
      judgeId="judge-partial"
      selectionMethod={SelectionMethod.ELECTED}
      currentTermEndDate="2026-12-31"
      nextElectionDate={null}
      electionHistory={[]}
    />
  )
}
