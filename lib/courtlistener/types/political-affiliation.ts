/**
 * CourtListener Political Affiliation Types
 * Interfaces for political party affiliation data from CourtListener API
 */

export interface CourtListenerAppointer {
  id: number
  name: string
  person_id: number | null
}

export interface CourtListenerPoliticalAffiliation {
  id: number
  person: number
  political_party: string | null
  political_party_id: string | null
  date_start: string | null
  date_end: string | null
  source: string | null

  // Appointment details
  appointer: CourtListenerAppointer | null
  how_selected: string | null
  nomination_process: string | null
  nomination_process_num: number | null

  // Important dates
  date_nominated: string | null
  date_elected: string | null
  date_confirmation: string | null
  date_seated: string | null
  date_hearing: string | null
  date_recess_appointment: string | null
  date_referred_to_judicial_committee: string | null
  date_judicial_committee_action: string | null

  // Voting details
  vote_type: string | null
  voice_vote: boolean | null
  votes_yes: number | null
  votes_no: number | null
  votes_yes_percent: number | null
  votes_no_percent: number | null

  // Other metadata
  retention_type: string | null
  judicial_committee_action: string | null
  aba_rating: string | null

  // Allow for additional fields
  [key: string]: unknown
}

export interface PoliticalAffiliationResponse {
  count: number
  next: string | null
  previous: string | null
  results: CourtListenerPoliticalAffiliation[]
}

// Enums for common values
export enum PoliticalPartyId {
  Democratic = 'd',
  Republican = 'r',
  Independent = 'i',
  Green = 'g',
  Libertarian = 'l',
  Federalist = 'f',
  Whig = 'w',
  DemocraticRepublican = 'dr',
  None = 'n',
}

export enum HowSelected {
  AppointedByPresident = 'a_pres',
  AppointedByGovernor = 'a_gov',
  AppointedByLegislature = 'a_legis',
  ElectedPartisan = 'e_partisan',
  ElectedNonPartisan = 'e_non_partisan',
  MeritSelection = 'm_selection',
  Other = 'o',
}

export enum AbaRating {
  ExceptionallyWellQualified = 'ewq',
  WellQualified = 'wq',
  Qualified = 'q',
  NotQualified = 'nq',
  NotQualifiedByAge = 'nqa',
}

export enum JudicialCommitteeAction {
  Reported = 'reported',
  ReportedFavorably = 'reported_favorably',
  ReportedUnfavorably = 'reported_unfavorably',
  NoReport = 'no_rep',
  Discharged = 'discharged',
  Withdrawn = 'withdrawn',
}

export enum VoteType {
  Senate = 's',
  Voice = 'v',
  Unanimous = 'u',
  Other = 'o',
}

// Helper type for formatted affiliation
export interface FormattedPoliticalAffiliation {
  party: string
  partyId: string
  startDate: Date | null
  endDate: Date | null
  isCurrent: boolean
  appointedBy: string | null
  position: string | null
  confirmationVotes: {
    yes: number | null
    no: number | null
    yesPercent: number | null
    noPercent: number | null
  } | null
  abaRating: string | null
}

// Sync options and results
export interface PoliticalAffiliationSyncOptions {
  judgeIds?: string[] // Specific judge CL IDs to sync
  batchSize?: number // Process N judges at a time
  delayMs?: number // Delay between batches
  skipIfExists?: boolean // Skip judges that already have political affiliation data
  includeHistorical?: boolean // Include historical affiliations, not just current
}

export interface PoliticalAffiliationSyncResult {
  success: boolean
  judgesProcessed: number
  judgesUpdated: number
  judgesSkipped: number
  errors: string[]
  duration: number
  stats?: {
    democraticCount: number
    republicanCount: number
    independentCount: number
    otherCount: number
    noDataCount: number
  }
}