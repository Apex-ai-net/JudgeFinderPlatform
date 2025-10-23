/**
 * Unit tests for election type definitions
 *
 * Validates type guards, enum values, and interface structures
 */

import { describe, it, expect } from 'vitest'
import {
  ElectionType,
  SelectionMethod,
  ElectionResult,
  PoliticalParty,
  isElectionType,
  isSelectionMethod,
  isElectionResult,
  isPoliticalParty,
  type JudgeElection,
  type ElectionOpponent,
  type PoliticalAffiliation,
} from '@/types/elections'

describe('Election Type Guards', () => {
  describe('isElectionType', () => {
    it('should return true for valid ElectionType values', () => {
      expect(isElectionType('partisan')).toBe(true)
      expect(isElectionType('nonpartisan')).toBe(true)
      expect(isElectionType('retention')).toBe(true)
      expect(isElectionType('recall')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isElectionType('invalid')).toBe(false)
      expect(isElectionType('')).toBe(false)
      expect(isElectionType(null)).toBe(false)
      expect(isElectionType(undefined)).toBe(false)
      expect(isElectionType(123)).toBe(false)
    })
  })

  describe('isSelectionMethod', () => {
    it('should return true for valid SelectionMethod values', () => {
      expect(isSelectionMethod('appointed')).toBe(true)
      expect(isSelectionMethod('elected')).toBe(true)
      expect(isSelectionMethod('merit_selection')).toBe(true)
      expect(isSelectionMethod('legislative_appointment')).toBe(true)
      expect(isSelectionMethod('retention_election')).toBe(true)
      expect(isSelectionMethod('commission_appointment')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isSelectionMethod('invalid')).toBe(false)
      expect(isSelectionMethod('hired')).toBe(false)
      expect(isSelectionMethod(null)).toBe(false)
    })
  })

  describe('isElectionResult', () => {
    it('should return true for valid ElectionResult values', () => {
      expect(isElectionResult('won')).toBe(true)
      expect(isElectionResult('lost')).toBe(true)
      expect(isElectionResult('unopposed')).toBe(true)
      expect(isElectionResult('withdrawn')).toBe(true)
      expect(isElectionResult('pending')).toBe(true)
      expect(isElectionResult('retained')).toBe(true)
      expect(isElectionResult('not_retained')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isElectionResult('invalid')).toBe(false)
      expect(isElectionResult('win')).toBe(false) // should be 'won'
      expect(isElectionResult(null)).toBe(false)
    })
  })

  describe('isPoliticalParty', () => {
    it('should return true for valid PoliticalParty values', () => {
      expect(isPoliticalParty('democratic')).toBe(true)
      expect(isPoliticalParty('republican')).toBe(true)
      expect(isPoliticalParty('libertarian')).toBe(true)
      expect(isPoliticalParty('green')).toBe(true)
      expect(isPoliticalParty('independent')).toBe(true)
      expect(isPoliticalParty('nonpartisan')).toBe(true)
      expect(isPoliticalParty('unknown')).toBe(true)
      expect(isPoliticalParty('other')).toBe(true)
    })

    it('should return false for invalid values', () => {
      expect(isPoliticalParty('invalid')).toBe(false)
      expect(isPoliticalParty('Democrat')).toBe(false) // case-sensitive
      expect(isPoliticalParty(null)).toBe(false)
    })
  })
})

describe('Election Enum Values', () => {
  it('should have correct ElectionType enum values', () => {
    expect(ElectionType.PARTISAN).toBe('partisan')
    expect(ElectionType.NONPARTISAN).toBe('nonpartisan')
    expect(ElectionType.RETENTION).toBe('retention')
    expect(ElectionType.RECALL).toBe('recall')
  })

  it('should have correct SelectionMethod enum values', () => {
    expect(SelectionMethod.APPOINTED).toBe('appointed')
    expect(SelectionMethod.ELECTED).toBe('elected')
    expect(SelectionMethod.MERIT_SELECTION).toBe('merit_selection')
    expect(SelectionMethod.LEGISLATIVE_APPOINTMENT).toBe('legislative_appointment')
    expect(SelectionMethod.RETENTION_ELECTION).toBe('retention_election')
    expect(SelectionMethod.COMMISSION_APPOINTMENT).toBe('commission_appointment')
  })

  it('should have correct ElectionResult enum values', () => {
    expect(ElectionResult.WON).toBe('won')
    expect(ElectionResult.LOST).toBe('lost')
    expect(ElectionResult.UNOPPOSED).toBe('unopposed')
    expect(ElectionResult.WITHDRAWN).toBe('withdrawn')
    expect(ElectionResult.PENDING).toBe('pending')
    expect(ElectionResult.RETAINED).toBe('retained')
    expect(ElectionResult.NOT_RETAINED).toBe('not_retained')
  })

  it('should have correct PoliticalParty enum values', () => {
    expect(PoliticalParty.DEMOCRATIC).toBe('democratic')
    expect(PoliticalParty.REPUBLICAN).toBe('republican')
    expect(PoliticalParty.LIBERTARIAN).toBe('libertarian')
    expect(PoliticalParty.GREEN).toBe('green')
    expect(PoliticalParty.INDEPENDENT).toBe('independent')
    expect(PoliticalParty.NONPARTISAN).toBe('nonpartisan')
    expect(PoliticalParty.UNKNOWN).toBe('unknown')
    expect(PoliticalParty.OTHER).toBe('other')
  })
})

describe('Election Interface Structures', () => {
  it('should accept valid JudgeElection object', () => {
    const election: JudgeElection = {
      id: 'uuid-123',
      judge_id: 'judge-456',
      election_date: '2024-11-05',
      election_type: ElectionType.NONPARTISAN,
      position_sought: 'Superior Court Judge',
      result: ElectionResult.WON,
      vote_percentage: 62.5,
      total_votes: 150000,
      total_turnout: 240000,
      jurisdiction: 'California',
      court_id: 'court-789',
      is_incumbent: true,
      endorsements: ['Bar Association', 'League of Women Voters'],
      campaign_finance_total: 250000,
      data_source: 'state_election_board',
      source_url: 'https://example.com/election-results',
      metadata: { confidence: 'high' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    expect(election).toBeDefined()
    expect(election.election_type).toBe(ElectionType.NONPARTISAN)
    expect(election.result).toBe(ElectionResult.WON)
  })

  it('should accept valid ElectionOpponent object', () => {
    const opponent: ElectionOpponent = {
      id: 'uuid-789',
      election_id: 'uuid-123',
      opponent_name: 'Jane Smith',
      political_party: PoliticalParty.REPUBLICAN,
      vote_percentage: 37.5,
      total_votes: 90000,
      is_incumbent: false,
      website_url: 'https://example.com',
      bio: 'Experienced attorney',
      metadata: { years_experience: 15 },
      created_at: '2024-01-01T00:00:00Z',
    }

    expect(opponent).toBeDefined()
    expect(opponent.political_party).toBe(PoliticalParty.REPUBLICAN)
    expect(opponent.is_incumbent).toBe(false)
  })

  it('should accept valid PoliticalAffiliation object', () => {
    const affiliation: PoliticalAffiliation = {
      id: 'uuid-321',
      judge_id: 'judge-456',
      political_party: PoliticalParty.DEMOCRATIC,
      start_date: '2010-01-01',
      end_date: null,
      is_current: true,
      confidence_level: 'high',
      verification_method: 'voter_registration',
      data_source: 'county_registrar',
      source_url: 'https://example.com/voter-records',
      notes: 'Verified through public records',
      metadata: { county: 'Los Angeles' },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    expect(affiliation).toBeDefined()
    expect(affiliation.political_party).toBe(PoliticalParty.DEMOCRATIC)
    expect(affiliation.is_current).toBe(true)
    expect(affiliation.confidence_level).toBe('high')
  })
})

describe('Type Narrowing with Type Guards', () => {
  it('should narrow type correctly with isElectionType', () => {
    const value: unknown = 'partisan'

    if (isElectionType(value)) {
      // TypeScript should know value is ElectionType here
      const electionType: ElectionType = value
      expect(electionType).toBe(ElectionType.PARTISAN)
    }
  })

  it('should narrow type correctly with isPoliticalParty', () => {
    const value: unknown = 'democratic'

    if (isPoliticalParty(value)) {
      // TypeScript should know value is PoliticalParty here
      const party: PoliticalParty = value
      expect(party).toBe(PoliticalParty.DEMOCRATIC)
    }
  })
})

describe('Nullable and Optional Fields', () => {
  it('should allow null values for optional fields', () => {
    const election: JudgeElection = {
      id: 'uuid-123',
      judge_id: 'judge-456',
      election_date: '2024-11-05',
      election_type: ElectionType.NONPARTISAN,
      position_sought: 'Superior Court Judge',
      result: ElectionResult.PENDING,
      vote_percentage: null, // Null is allowed
      total_votes: null,
      total_turnout: null,
      jurisdiction: null,
      court_id: null,
      is_incumbent: false,
      endorsements: null,
      campaign_finance_total: null,
      data_source: null,
      source_url: null,
      metadata: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    expect(election.vote_percentage).toBeNull()
    expect(election.total_votes).toBeNull()
  })

  it('should allow null for end_date in current affiliation', () => {
    const affiliation: PoliticalAffiliation = {
      id: 'uuid-321',
      judge_id: 'judge-456',
      political_party: PoliticalParty.INDEPENDENT,
      start_date: '2020-01-01',
      end_date: null, // Current affiliation
      is_current: true,
      confidence_level: 'medium',
      verification_method: 'public_statement',
      data_source: 'interview',
      source_url: null,
      notes: null,
      metadata: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    expect(affiliation.end_date).toBeNull()
    expect(affiliation.is_current).toBe(true)
  })
})
