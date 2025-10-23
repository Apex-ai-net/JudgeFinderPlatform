/**
 * TypeScript Type Definitions for Judicial Election Feature
 *
 * This file contains comprehensive type definitions for tracking judicial
 * elections, political affiliations, and selection methods across federal
 * and state court systems.
 *
 * @module types/elections
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Types of judicial elections
 *
 * - `partisan`: Elections where candidates are affiliated with political parties
 * - `nonpartisan`: Elections without party affiliation shown on ballot
 * - `retention`: Yes/no vote on whether to retain a sitting judge
 * - `recall`: Special election to remove a judge from office
 */
export enum ElectionType {
  PARTISAN = 'partisan',
  NONPARTISAN = 'nonpartisan',
  RETENTION = 'retention',
  RECALL = 'recall',
}

/**
 * Methods by which judges are selected for their positions
 *
 * - `appointed`: Appointed by executive (governor, president)
 * - `elected`: Won a competitive election
 * - `merit_selection`: Missouri Plan - appointed from nominating commission
 * - `legislative_appointment`: Appointed by legislature
 * - `retention_election`: Retained through yes/no vote
 * - `commission_appointment`: Appointed by judicial commission
 */
export enum SelectionMethod {
  APPOINTED = 'appointed',
  ELECTED = 'elected',
  MERIT_SELECTION = 'merit_selection',
  LEGISLATIVE_APPOINTMENT = 'legislative_appointment',
  RETENTION_ELECTION = 'retention_election',
  COMMISSION_APPOINTMENT = 'commission_appointment',
}

/**
 * Outcome of a judicial election
 *
 * - `won`: Candidate won the election
 * - `lost`: Candidate lost the election
 * - `unopposed`: Candidate ran unopposed and won
 * - `withdrawn`: Candidate withdrew before election
 * - `pending`: Election has not yet occurred
 * - `retained`: Judge was retained (for retention elections)
 * - `not_retained`: Judge was not retained
 */
export enum ElectionResult {
  WON = 'won',
  LOST = 'lost',
  UNOPPOSED = 'unopposed',
  WITHDRAWN = 'withdrawn',
  PENDING = 'pending',
  RETAINED = 'retained',
  NOT_RETAINED = 'not_retained',
}

/**
 * Political party affiliations
 *
 * Comprehensive list including major parties, independent, and state-specific parties
 */
export enum PoliticalParty {
  DEMOCRATIC = 'democratic',
  REPUBLICAN = 'republican',
  LIBERTARIAN = 'libertarian',
  GREEN = 'green',
  INDEPENDENT = 'independent',
  NONPARTISAN = 'nonpartisan',
  UNKNOWN = 'unknown',
  OTHER = 'other',
}

// ============================================================================
// DATABASE ENTITIES
// ============================================================================

/**
 * Judge Election Record
 *
 * Represents a single judicial election or retention vote.
 * Maps to `judge_elections` table in database.
 *
 * @example
 * ```typescript
 * const election: JudgeElection = {
 *   id: 'uuid-123',
 *   judge_id: 'judge-456',
 *   election_date: '2024-11-05',
 *   election_type: ElectionType.NONPARTISAN,
 *   position_sought: 'Superior Court Judge',
 *   result: ElectionResult.WON,
 *   vote_percentage: 62.5,
 *   total_votes: 150000,
 *   created_at: '2024-01-01T00:00:00Z',
 *   updated_at: '2024-01-01T00:00:00Z'
 * }
 * ```
 */
export interface JudgeElection {
  /** Unique identifier (UUID) */
  id: string

  /** Foreign key to judges table */
  judge_id: string

  /** Date of the election */
  election_date: string

  /** Type of election (partisan, nonpartisan, retention, recall) */
  election_type: ElectionType

  /** Position or seat being contested */
  position_sought: string

  /** Outcome of the election */
  result: ElectionResult

  /** Percentage of votes received (0-100) */
  vote_percentage: number | null

  /** Total number of votes received */
  total_votes: number | null

  /** Total voter turnout for this race */
  total_turnout: number | null

  /** Jurisdiction (state, county, district) */
  jurisdiction: string | null

  /** Court or judicial district */
  court_id: string | null

  /** Whether this was an incumbent running for re-election */
  is_incumbent: boolean

  /** Whether candidate was endorsed by major organizations */
  endorsements: string[] | null

  /** Campaign finance data (total raised) */
  campaign_finance_total: number | null

  /** Source of election data (e.g., 'state_election_board', 'ballotpedia') */
  data_source: string | null

  /** URL to official election results */
  source_url: string | null

  /** Additional metadata as JSON */
  metadata: Record<string, unknown> | null

  /** Record creation timestamp */
  created_at: string

  /** Last update timestamp */
  updated_at: string
}

/**
 * Election Opponent Record
 *
 * Represents opponents who ran against a judge in an election.
 * Maps to `judge_election_opponents` table.
 *
 * @example
 * ```typescript
 * const opponent: ElectionOpponent = {
 *   id: 'uuid-789',
 *   election_id: 'uuid-123',
 *   opponent_name: 'Jane Smith',
 *   political_party: PoliticalParty.REPUBLICAN,
 *   vote_percentage: 37.5,
 *   total_votes: 90000,
 *   is_incumbent: false,
 *   created_at: '2024-01-01T00:00:00Z'
 * }
 * ```
 */
export interface ElectionOpponent {
  /** Unique identifier (UUID) */
  id: string

  /** Foreign key to judge_elections table */
  election_id: string

  /** Name of the opponent */
  opponent_name: string

  /** Political party affiliation */
  political_party: PoliticalParty | null

  /** Percentage of votes received */
  vote_percentage: number | null

  /** Total number of votes received */
  total_votes: number | null

  /** Whether opponent was the incumbent */
  is_incumbent: boolean

  /** Opponent's campaign website */
  website_url: string | null

  /** Brief bio or background */
  bio: string | null

  /** Additional metadata */
  metadata: Record<string, unknown> | null

  /** Record creation timestamp */
  created_at: string
}

/**
 * Political Affiliation Record
 *
 * Tracks a judge's political party affiliation over time.
 * Maps to `judge_political_affiliations` table.
 *
 * @example
 * ```typescript
 * const affiliation: PoliticalAffiliation = {
 *   id: 'uuid-321',
 *   judge_id: 'judge-456',
 *   political_party: PoliticalParty.DEMOCRATIC,
 *   start_date: '2010-01-01',
 *   end_date: null,
 *   is_current: true,
 *   confidence_level: 'high',
 *   data_source: 'voter_registration',
 *   created_at: '2024-01-01T00:00:00Z',
 *   updated_at: '2024-01-01T00:00:00Z'
 * }
 * ```
 */
export interface PoliticalAffiliation {
  /** Unique identifier (UUID) */
  id: string

  /** Foreign key to judges table */
  judge_id: string

  /** Political party affiliation */
  political_party: PoliticalParty

  /** Date affiliation began */
  start_date: string | null

  /** Date affiliation ended (null if current) */
  end_date: string | null

  /** Whether this is the current affiliation */
  is_current: boolean

  /** Confidence in this data (high, medium, low) */
  confidence_level: 'high' | 'medium' | 'low' | null

  /** How this affiliation was determined */
  verification_method: 'voter_registration' | 'public_statement' | 'party_endorsement' | 'campaign_finance' | 'other' | null

  /** Source of the data */
  data_source: string | null

  /** URL to source document */
  source_url: string | null

  /** Notes about the affiliation */
  notes: string | null

  /** Additional metadata */
  metadata: Record<string, unknown> | null

  /** Record creation timestamp */
  created_at: string

  /** Last update timestamp */
  updated_at: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Election History API Response
 *
 * Returns a judge's complete election history with opponents and results.
 *
 * @example
 * ```typescript
 * const response: ElectionHistoryResponse = {
 *   judge_id: 'judge-456',
 *   judge_name: 'John Doe',
 *   total_elections: 3,
 *   elections: [...],
 *   win_rate: 1.0,
 *   average_vote_percentage: 65.3
 * }
 * ```
 */
export interface ElectionHistoryResponse {
  /** Judge's unique identifier */
  judge_id: string

  /** Judge's full name */
  judge_name: string

  /** Total number of elections participated in */
  total_elections: number

  /** Array of election records with opponents */
  elections: Array<JudgeElection & {
    opponents: ElectionOpponent[]
    court_name?: string | null
  }>

  /** Win rate (0.0 to 1.0) */
  win_rate: number

  /** Average vote percentage across all elections */
  average_vote_percentage: number | null

  /** Total votes received across all elections */
  total_votes_received: number | null
}

/**
 * Upcoming Election API Response
 *
 * Returns information about judges with upcoming elections.
 *
 * @example
 * ```typescript
 * const response: UpcomingElectionResponse = {
 *   total_count: 15,
 *   elections: [...],
 *   next_30_days: 5,
 *   next_90_days: 10
 * }
 * ```
 */
export interface UpcomingElectionResponse {
  /** Total number of upcoming elections */
  total_count: number

  /** Array of upcoming election records */
  elections: Array<JudgeElection & {
    judge_name: string
    court_name: string | null
    days_until_election: number
  }>

  /** Count of elections in next 30 days */
  next_30_days: number

  /** Count of elections in next 90 days */
  next_90_days: number

  /** Count of elections in next 180 days */
  next_180_days: number
}

/**
 * Political Affiliation History API Response
 *
 * Returns a judge's political affiliation history over time.
 *
 * @example
 * ```typescript
 * const response: PoliticalAffiliationHistoryResponse = {
 *   judge_id: 'judge-456',
 *   judge_name: 'John Doe',
 *   current_affiliation: PoliticalParty.DEMOCRATIC,
 *   affiliations: [...],
 *   has_changed_parties: false
 * }
 * ```
 */
export interface PoliticalAffiliationHistoryResponse {
  /** Judge's unique identifier */
  judge_id: string

  /** Judge's full name */
  judge_name: string

  /** Current political party affiliation */
  current_affiliation: PoliticalParty | null

  /** Array of historical affiliations */
  affiliations: PoliticalAffiliation[]

  /** Whether judge has changed parties */
  has_changed_parties: boolean

  /** Number of party changes */
  party_change_count: number
}

/**
 * Election Statistics Response
 *
 * Aggregated statistics about judicial elections in a jurisdiction.
 */
export interface ElectionStatisticsResponse {
  /** Jurisdiction (state, county, etc.) */
  jurisdiction: string

  /** Time period for statistics */
  time_period: {
    start_date: string
    end_date: string
  }

  /** Total number of elections */
  total_elections: number

  /** Breakdown by election type */
  by_election_type: Record<ElectionType, number>

  /** Average voter turnout */
  average_turnout: number | null

  /** Incumbent win rate */
  incumbent_win_rate: number | null

  /** Average vote percentage for winners */
  average_winner_percentage: number | null

  /** Number of unopposed elections */
  unopposed_count: number

  /** Retention election pass rate */
  retention_pass_rate: number | null
}

// ============================================================================
// UI COMPONENT PROP TYPES
// ============================================================================

/**
 * Election Information Component Props
 *
 * Props for displaying a judge's election information on their profile.
 *
 * @example
 * ```tsx
 * <ElectionInformation
 *   judgeId="judge-456"
 *   selectionMethod={SelectionMethod.ELECTED}
 *   currentTermEndDate="2028-12-31"
 *   nextElectionDate="2028-11-05"
 *   electionHistory={[...]}
 *   showFullHistory={true}
 * />
 * ```
 */
export interface ElectionInformationProps {
  /** Judge's unique identifier */
  judgeId: string

  /** How the judge was selected */
  selectionMethod: SelectionMethod

  /** When current term ends */
  currentTermEndDate: string | null

  /** Date of next election (if applicable) */
  nextElectionDate: string | null

  /** Array of past elections */
  electionHistory: JudgeElection[]

  /** Whether to show complete election history */
  showFullHistory?: boolean

  /** Whether to show political affiliation */
  showPoliticalAffiliation?: boolean

  /** Current political affiliation */
  currentAffiliation?: PoliticalParty | null

  /** Optional CSS class name */
  className?: string

  /** Optional callback when election is clicked */
  onElectionClick?: (election: JudgeElection) => void
}

/**
 * Election Badge Component Props
 *
 * Props for a compact badge showing election status.
 *
 * @example
 * ```tsx
 * <ElectionBadge
 *   selectionMethod={SelectionMethod.ELECTED}
 *   nextElectionDate="2028-11-05"
 *   variant="compact"
 * />
 * ```
 */
export interface ElectionBadgeProps {
  /** How the judge was selected */
  selectionMethod: SelectionMethod

  /** Date of next election */
  nextElectionDate?: string | null

  /** Whether judge is currently up for election */
  isUpForElection?: boolean

  /** Badge display variant */
  variant?: 'compact' | 'detailed' | 'minimal'

  /** Whether to show days until election */
  showCountdown?: boolean

  /** Optional CSS class name */
  className?: string
}

/**
 * Election Timeline Component Props
 *
 * Props for displaying a visual timeline of a judge's elections.
 *
 * @example
 * ```tsx
 * <ElectionTimeline
 *   elections={[...]}
 *   highlightUpcoming={true}
 *   showOpponents={true}
 * />
 * ```
 */
export interface ElectionTimelineProps {
  /** Array of elections to display */
  elections: Array<JudgeElection & {
    opponents?: ElectionOpponent[]
    court_name?: string | null
  }>

  /** Whether to highlight upcoming elections */
  highlightUpcoming?: boolean

  /** Whether to show opponent information */
  showOpponents?: boolean

  /** Whether to show vote percentages */
  showVotePercentages?: boolean

  /** Whether timeline is interactive */
  interactive?: boolean

  /** Optional CSS class name */
  className?: string

  /** Optional callback when timeline item is clicked */
  onItemClick?: (election: JudgeElection) => void
}

/**
 * Political Affiliation Display Props
 *
 * Props for displaying political affiliation information.
 *
 * @example
 * ```tsx
 * <PoliticalAffiliationDisplay
 *   affiliation={PoliticalParty.DEMOCRATIC}
 *   confidenceLevel="high"
 *   showHistory={true}
 * />
 * ```
 */
export interface PoliticalAffiliationDisplayProps {
  /** Current political affiliation */
  affiliation: PoliticalParty | null

  /** Confidence in the affiliation data */
  confidenceLevel?: 'high' | 'medium' | 'low' | null

  /** Historical affiliations */
  affiliationHistory?: PoliticalAffiliation[]

  /** Whether to show affiliation history */
  showHistory?: boolean

  /** Whether to show confidence indicator */
  showConfidence?: boolean

  /** Display variant */
  variant?: 'full' | 'compact' | 'icon-only'

  /** Optional CSS class name */
  className?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Election Filter Options
 *
 * Used for filtering election records in queries.
 */
export interface ElectionFilters {
  /** Filter by election type */
  electionType?: ElectionType | ElectionType[]

  /** Filter by result */
  result?: ElectionResult | ElectionResult[]

  /** Filter by date range */
  dateRange?: {
    start: string
    end: string
  }

  /** Filter by jurisdiction */
  jurisdiction?: string | string[]

  /** Filter by court */
  courtId?: string | string[]

  /** Only include incumbents */
  incumbentsOnly?: boolean

  /** Only include competitive races (not unopposed) */
  competitiveOnly?: boolean
}

/**
 * Election Summary
 *
 * Aggregated summary of a judge's electoral performance.
 */
export interface ElectionSummary {
  /** Total elections participated in */
  total_elections: number

  /** Number of wins */
  wins: number

  /** Number of losses */
  losses: number

  /** Number of unopposed races */
  unopposed: number

  /** Win rate (0.0 to 1.0) */
  win_rate: number

  /** Average vote percentage */
  average_vote_percentage: number | null

  /** Most recent election */
  most_recent_election: JudgeElection | null

  /** Next scheduled election */
  next_election: JudgeElection | null
}

/**
 * Judge with Election Data
 *
 * Extended judge type that includes election information.
 * This type is used when fetching judges with their election data.
 */
export interface JudgeWithElections {
  /** Judge's unique identifier */
  id: string

  /** Judge's full name */
  name: string

  /** Selection method */
  selection_method: SelectionMethod | null

  /** Current term end date */
  current_term_end_date: string | null

  /** Next election date */
  next_election_date: string | null

  /** Whether judge was elected to position */
  is_elected: boolean

  /** Election history */
  elections?: JudgeElection[]

  /** Political affiliations */
  political_affiliations?: PoliticalAffiliation[]

  /** Current political affiliation */
  current_political_affiliation?: PoliticalParty | null

  /** Election summary statistics */
  election_summary?: ElectionSummary
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a valid ElectionType
 */
export function isElectionType(value: unknown): value is ElectionType {
  return typeof value === 'string' && Object.values(ElectionType).includes(value as ElectionType)
}

/**
 * Type guard to check if a value is a valid SelectionMethod
 */
export function isSelectionMethod(value: unknown): value is SelectionMethod {
  return typeof value === 'string' && Object.values(SelectionMethod).includes(value as SelectionMethod)
}

/**
 * Type guard to check if a value is a valid ElectionResult
 */
export function isElectionResult(value: unknown): value is ElectionResult {
  return typeof value === 'string' && Object.values(ElectionResult).includes(value as ElectionResult)
}

/**
 * Type guard to check if a value is a valid PoliticalParty
 */
export function isPoliticalParty(value: unknown): value is PoliticalParty {
  return typeof value === 'string' && Object.values(PoliticalParty).includes(value as PoliticalParty)
}
