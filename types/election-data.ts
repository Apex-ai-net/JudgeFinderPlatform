/**
 * TypeScript types for Judicial Election and Political Affiliation data
 *
 * These types correspond to the database schema defined in:
 * supabase/migrations/20250122_001_add_election_tables.sql
 *
 * @see /Users/tanner-osterkamp/JudgeFinderPlatform/supabase/migrations/ELECTION_SCHEMA_GUIDE.md
 */

// ========================================
// ENUMS (matching PostgreSQL ENUMs)
// ========================================

/**
 * Types of judicial elections
 */
export enum ElectionType {
  INITIAL_ELECTION = 'initial_election',
  RETENTION = 'retention',
  COMPETITIVE = 'competitive',
  GENERAL = 'general',
  PRIMARY = 'primary',
  RECALL = 'recall',
  SPECIAL = 'special',
  REELECTION = 'reelection',
}

/**
 * Method by which a judge was selected to their position
 */
export enum SelectionMethod {
  ELECTED = 'elected',
  APPOINTED = 'appointed',
  MERIT_SELECTION = 'merit_selection',
  RETENTION = 'retention',
  LEGISLATIVE = 'legislative',
  MIXED = 'mixed',
  UNKNOWN = 'unknown',
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
  CONSTITUTION = 'constitution',
  AMERICAN_INDEPENDENT = 'american_independent',
  PEACE_AND_FREEDOM = 'peace_and_freedom',
  NO_PARTY_PREFERENCE = 'no_party_preference',
  NONPARTISAN = 'nonpartisan',
  OTHER = 'other',
  UNKNOWN = 'unknown',
}

// ========================================
// DATABASE TYPES
// ========================================

/**
 * Judge elections table - tracks all judicial elections
 */
export interface JudgeElection {
  id: string
  judge_id: string

  // Election identification
  election_type: ElectionType
  election_date: string // ISO date string
  election_name: string | null

  // Location/jurisdiction
  jurisdiction: string | null
  district: string | null

  // Election results
  won: boolean | null
  vote_count: number | null
  vote_percentage: number | null // 0.00 to 100.00
  total_votes_cast: number | null

  // For retention elections
  yes_votes: number | null
  no_votes: number | null
  retention_threshold: number | null

  // Term information
  term_start_date: string | null // ISO date string
  term_end_date: string | null // ISO date string
  term_length_years: number | null

  // Electoral context
  is_incumbent: boolean
  is_contested: boolean
  opponent_count: number

  // Source and provenance
  source_name: string | null
  source_url: string | null
  source_date: string | null // ISO date string

  // Metadata
  notes: string | null
  verified: boolean

  // Timestamps
  created_at: string // ISO datetime string
  updated_at: string // ISO datetime string
}

/**
 * Judge election opponents - tracks opponents in contested elections
 */
export interface JudgeElectionOpponent {
  id: string
  election_id: string

  // Opponent information
  opponent_name: string
  opponent_party: PoliticalParty | null

  // Results
  vote_count: number | null
  vote_percentage: number | null

  // Additional context
  is_incumbent: boolean
  occupation: string | null
  background: string | null

  // Source
  source_url: string | null

  // Timestamps
  created_at: string // ISO datetime string
  updated_at: string // ISO datetime string
}

/**
 * Judge political affiliations - tracks historical and current party affiliations
 */
export interface JudgePoliticalAffiliation {
  id: string
  judge_id: string

  // Party affiliation
  political_party: PoliticalParty

  // Time period
  start_date: string // ISO date string
  end_date: string | null // ISO date string, null if current
  is_current: boolean

  // Source and verification
  source_name: string | null
  source_url: string | null
  source_date: string | null // ISO date string
  verified: boolean

  // Additional context
  registration_type: string | null
  notes: string | null

  // Timestamps
  created_at: string // ISO datetime string
  updated_at: string // ISO datetime string
}

/**
 * Extended Judge type with election-related fields
 */
export interface JudgeWithElectionData {
  id: string
  name: string
  court_id: string | null
  court_name: string | null
  jurisdiction: string | null
  appointed_date: string | null

  // Election-related fields (added by migration)
  selection_method: SelectionMethod
  current_term_end_date: string | null
  next_election_date: string | null
  is_elected: boolean
  current_political_party: PoliticalParty

  // Other existing fields
  education: string | null
  profile_image_url: string | null
  bio: string | null
  total_cases: number
  reversal_rate: number
  average_decision_time: number | null
  courtlistener_id: string | null
  courtlistener_data: any | null
  created_at: string
  updated_at: string
}

// ========================================
// API RESPONSE TYPES
// ========================================

/**
 * Election with opponent details
 */
export interface ElectionWithOpponents extends JudgeElection {
  opponents: JudgeElectionOpponent[]
}

/**
 * Complete judge election history
 */
export interface JudgeElectionHistory {
  judge_id: string
  judge_name: string
  elections: ElectionWithOpponents[]
  total_elections: number
  wins: number
  losses: number
  win_percentage: number
  average_vote_percentage: number | null
}

/**
 * Retention election statistics
 */
export interface RetentionElectionStats {
  election_id: string
  election_date: string
  yes_votes: number
  no_votes: number
  total_votes: number
  yes_percentage: number
  no_percentage: number
  retention_threshold: number
  passed: boolean
}

/**
 * Political affiliation history for a judge
 */
export interface PoliticalAffiliationHistory {
  judge_id: string
  judge_name: string
  current_affiliation: JudgePoliticalAffiliation | null
  historical_affiliations: JudgePoliticalAffiliation[]
  total_affiliations: number
}

/**
 * Election summary statistics
 */
export interface ElectionSummary {
  total_elections: number
  by_type: Record<ElectionType, number>
  by_year: Record<number, number>
  total_judges_elected: number
  average_vote_percentage: number
  retention_pass_rate: number
}

// ========================================
// FORM INPUT TYPES
// ========================================

/**
 * Input for creating a new election record
 */
export interface CreateElectionInput {
  judge_id: string
  election_type: ElectionType
  election_date: string
  election_name?: string
  jurisdiction?: string
  district?: string
  won?: boolean
  vote_count?: number
  vote_percentage?: number
  total_votes_cast?: number
  yes_votes?: number
  no_votes?: number
  retention_threshold?: number
  term_start_date?: string
  term_end_date?: string
  term_length_years?: number
  is_incumbent?: boolean
  is_contested?: boolean
  opponent_count?: number
  source_name?: string
  source_url?: string
  source_date?: string
  notes?: string
  verified?: boolean
}

/**
 * Input for creating an election opponent
 */
export interface CreateOpponentInput {
  election_id: string
  opponent_name: string
  opponent_party?: PoliticalParty
  vote_count?: number
  vote_percentage?: number
  is_incumbent?: boolean
  occupation?: string
  background?: string
  source_url?: string
}

/**
 * Input for creating a political affiliation
 */
export interface CreatePoliticalAffiliationInput {
  judge_id: string
  political_party: PoliticalParty
  start_date: string
  end_date?: string
  is_current: boolean
  source_name?: string
  source_url?: string
  source_date?: string
  registration_type?: string
  notes?: string
  verified?: boolean
}

/**
 * Input for updating judge election fields
 */
export interface UpdateJudgeElectionFieldsInput {
  selection_method?: SelectionMethod
  current_term_end_date?: string | null
  next_election_date?: string | null
  is_elected?: boolean
  current_political_party?: PoliticalParty
}

// ========================================
// QUERY FILTER TYPES
// ========================================

/**
 * Filters for querying elections
 */
export interface ElectionQueryFilters {
  judge_id?: string
  election_type?: ElectionType | ElectionType[]
  jurisdiction?: string
  date_from?: string
  date_to?: string
  won?: boolean
  is_contested?: boolean
  verified?: boolean
}

/**
 * Filters for querying political affiliations
 */
export interface PoliticalAffiliationQueryFilters {
  judge_id?: string
  political_party?: PoliticalParty | PoliticalParty[]
  is_current?: boolean
  verified?: boolean
}

/**
 * Filters for querying judges by election data
 */
export interface JudgeElectionFilters {
  selection_method?: SelectionMethod | SelectionMethod[]
  is_elected?: boolean
  has_upcoming_election?: boolean
  political_party?: PoliticalParty | PoliticalParty[]
  jurisdiction?: string
}

// ========================================
// DISPLAY HELPER TYPES
// ========================================

/**
 * Display labels for election types
 */
export const ELECTION_TYPE_LABELS: Record<ElectionType, string> = {
  [ElectionType.INITIAL_ELECTION]: 'Initial Election',
  [ElectionType.RETENTION]: 'Retention Election',
  [ElectionType.COMPETITIVE]: 'Competitive Election',
  [ElectionType.GENERAL]: 'General Election',
  [ElectionType.PRIMARY]: 'Primary Election',
  [ElectionType.RECALL]: 'Recall Election',
  [ElectionType.SPECIAL]: 'Special Election',
  [ElectionType.REELECTION]: 'Reelection',
}

/**
 * Display labels for selection methods
 */
export const SELECTION_METHOD_LABELS: Record<SelectionMethod, string> = {
  [SelectionMethod.ELECTED]: 'Elected',
  [SelectionMethod.APPOINTED]: 'Appointed',
  [SelectionMethod.MERIT_SELECTION]: 'Merit Selection',
  [SelectionMethod.RETENTION]: 'Retention',
  [SelectionMethod.LEGISLATIVE]: 'Legislative Appointment',
  [SelectionMethod.MIXED]: 'Mixed',
  [SelectionMethod.UNKNOWN]: 'Unknown',
}

/**
 * Display labels for political parties
 */
export const POLITICAL_PARTY_LABELS: Record<PoliticalParty, string> = {
  [PoliticalParty.DEMOCRATIC]: 'Democratic',
  [PoliticalParty.REPUBLICAN]: 'Republican',
  [PoliticalParty.INDEPENDENT]: 'Independent',
  [PoliticalParty.LIBERTARIAN]: 'Libertarian',
  [PoliticalParty.GREEN]: 'Green',
  [PoliticalParty.CONSTITUTION]: 'Constitution',
  [PoliticalParty.AMERICAN_INDEPENDENT]: 'American Independent',
  [PoliticalParty.PEACE_AND_FREEDOM]: 'Peace and Freedom',
  [PoliticalParty.NO_PARTY_PREFERENCE]: 'No Party Preference',
  [PoliticalParty.NONPARTISAN]: 'Nonpartisan',
  [PoliticalParty.OTHER]: 'Other',
  [PoliticalParty.UNKNOWN]: 'Unknown',
}

/**
 * Color schemes for political parties (for UI)
 */
export const POLITICAL_PARTY_COLORS: Record<PoliticalParty, { primary: string; light: string; dark: string }> = {
  [PoliticalParty.DEMOCRATIC]: { primary: '#0015BC', light: '#4A7CFF', dark: '#00106B' },
  [PoliticalParty.REPUBLICAN]: { primary: '#E81B23', light: '#FF6B6F', dark: '#A01016' },
  [PoliticalParty.INDEPENDENT]: { primary: '#6B7280', light: '#9CA3AF', dark: '#4B5563' },
  [PoliticalParty.LIBERTARIAN]: { primary: '#FED105', light: '#FFE566', dark: '#B89C00' },
  [PoliticalParty.GREEN]: { primary: '#17882C', light: '#48BB5E', dark: '#0F5D1F' },
  [PoliticalParty.CONSTITUTION]: { primary: '#A45A29', light: '#D18A5A', dark: '#73411D' },
  [PoliticalParty.AMERICAN_INDEPENDENT]: { primary: '#662E91', light: '#9466BD', dark: '#471F65' },
  [PoliticalParty.PEACE_AND_FREEDOM]: { primary: '#E91E63', light: '#F06292', dark: '#AD1457' },
  [PoliticalParty.NO_PARTY_PREFERENCE]: { primary: '#9E9E9E', light: '#BDBDBD', dark: '#757575' },
  [PoliticalParty.NONPARTISAN]: { primary: '#78909C', light: '#B0BEC5', dark: '#546E7A' },
  [PoliticalParty.OTHER]: { primary: '#795548', light: '#A1887F', dark: '#5D4037' },
  [PoliticalParty.UNKNOWN]: { primary: '#607D8B', light: '#90A4AE', dark: '#455A64' },
}

// ========================================
// UTILITY TYPES
// ========================================

/**
 * Upcoming election information
 */
export interface UpcomingElection {
  judge_id: string
  judge_name: string
  election_date: string
  election_type: ElectionType
  days_until_election: number
  current_term_end_date: string | null
  is_incumbent: boolean
}

/**
 * Election comparison data for analytics
 */
export interface ElectionComparison {
  election_id: string
  election_date: string
  election_type: ElectionType
  judge_vote_percentage: number
  average_vote_percentage: number
  above_average: boolean
  margin_of_victory: number | null
}

/**
 * Party affiliation change event
 */
export interface PartyAffiliationChange {
  judge_id: string
  judge_name: string
  from_party: PoliticalParty
  to_party: PoliticalParty
  change_date: string
  duration_years: number
}

// ========================================
// TYPE GUARDS
// ========================================

/**
 * Type guard to check if an election is a retention election
 */
export function isRetentionElection(election: JudgeElection): boolean {
  return election.election_type === ElectionType.RETENTION
}

/**
 * Type guard to check if an election is contested
 */
export function isContestedElection(election: JudgeElection): boolean {
  return election.is_contested
}

/**
 * Type guard to check if a political affiliation is current
 */
export function isCurrentAffiliation(affiliation: JudgePoliticalAffiliation): boolean {
  return affiliation.is_current && affiliation.end_date === null
}

/**
 * Type guard to check if a judge is elected
 */
export function isElectedJudge(judge: JudgeWithElectionData): boolean {
  return judge.is_elected
}

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * Validates that retention election data is complete
 */
export function validateRetentionElection(election: CreateElectionInput): boolean {
  if (election.election_type !== ElectionType.RETENTION) {
    return true
  }
  return (
    election.yes_votes !== undefined &&
    election.no_votes !== undefined &&
    election.retention_threshold !== undefined
  )
}

/**
 * Validates that a contested election has opponent data
 */
export function validateContestedElection(
  election: CreateElectionInput,
  opponents: CreateOpponentInput[]
): boolean {
  if (!election.is_contested) {
    return true
  }
  return opponents.length > 0
}

/**
 * Validates that only one affiliation can be current per judge
 */
export function validateCurrentAffiliation(
  judgeId: string,
  affiliations: JudgePoliticalAffiliation[],
  newAffiliation: CreatePoliticalAffiliationInput
): boolean {
  if (!newAffiliation.is_current) {
    return true
  }
  const currentCount = affiliations.filter(a => a.judge_id === judgeId && a.is_current).length
  return currentCount === 0
}
