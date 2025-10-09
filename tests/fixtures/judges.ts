/**
 * Test fixtures for judge data
 */

export const mockJudges = {
  activeJudge: {
    id: 'judge-001',
    name: 'John Smith',
    slug: 'john-smith',
    court_name: 'Los Angeles Superior Court',
    jurisdiction: 'CA',
    total_cases: 1250,
    profile_image_url: null,
    bio: 'Experienced judge with focus on civil litigation',
    education: ['Harvard Law School', 'Yale University'],
    bar_admissions: ['California State Bar'],
    prior_experience: ['Private practice', 'Deputy District Attorney'],
    current_position: 'Superior Court Judge',
    appointment_date: '2015-06-15',
    retirement_date: null,
    is_active: true,
    court_id: 'court-la-001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },

  retiredJudge: {
    id: 'judge-002',
    name: 'Jane Doe',
    slug: 'jane-doe',
    court_name: 'Orange County Superior Court',
    jurisdiction: 'CA',
    total_cases: 2500,
    profile_image_url: null,
    bio: 'Retired judge specializing in family law',
    education: ['Stanford Law School'],
    bar_admissions: ['California State Bar'],
    prior_experience: ['Family law attorney'],
    current_position: 'Retired',
    appointment_date: '2005-03-20',
    retirement_date: '2023-12-31',
    is_active: false,
    court_id: 'court-oc-001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },

  federalJudge: {
    id: 'judge-003',
    name: 'Robert Johnson',
    slug: 'robert-johnson',
    court_name: 'U.S. District Court Central District of California',
    jurisdiction: 'F',
    total_cases: 850,
    profile_image_url: null,
    bio: 'Federal judge appointed in 2018',
    education: ['UC Berkeley School of Law'],
    bar_admissions: ['California State Bar', 'Federal Bar'],
    prior_experience: ['U.S. Attorney', 'Law professor'],
    current_position: 'Federal District Judge',
    appointment_date: '2018-09-10',
    retirement_date: null,
    is_active: true,
    court_id: 'court-federal-001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },

  minimalDataJudge: {
    id: 'judge-004',
    name: 'Maria Garcia',
    slug: 'maria-garcia',
    court_name: 'San Diego Superior Court',
    jurisdiction: 'CA',
    total_cases: 50,
    profile_image_url: null,
    bio: null,
    education: [],
    bar_admissions: [],
    prior_experience: [],
    current_position: 'Superior Court Judge',
    appointment_date: '2023-01-15',
    retirement_date: null,
    is_active: true,
    court_id: 'court-sd-001',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
}

export const mockJudgesList = [
  mockJudges.activeJudge,
  mockJudges.retiredJudge,
  mockJudges.federalJudge,
  mockJudges.minimalDataJudge,
]

export const mockJudgeAnalytics = {
  judge_id: 'judge-001',
  total_cases: 1250,
  avg_case_duration: 180,
  settlement_rate: 0.65,
  dismissal_rate: 0.15,
  judgment_rate: 0.2,
  case_types: [
    { type: 'Civil', count: 750, settlement_rate: 0.7 },
    { type: 'Criminal', count: 350, settlement_rate: 0.45 },
    { type: 'Family', count: 150, settlement_rate: 0.8 },
  ],
  temporal_patterns: [
    { year: 2023, month: 1, case_count: 45, settlement_rate: 0.67 },
    { year: 2023, month: 2, case_count: 52, settlement_rate: 0.63 },
    { year: 2023, month: 3, case_count: 48, settlement_rate: 0.69 },
  ],
  bias_indicators: {
    consistency_score: 78.5,
    speed_score: 72.3,
    settlement_preference: 15.0,
    risk_tolerance: 45.2,
    predictability_score: 82.1,
  },
  confidence_civil: 0.92,
  confidence_criminal: 0.88,
  confidence_family: 0.75,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

export function createMockJudge(overrides: Partial<typeof mockJudges.activeJudge> = {}) {
  return {
    ...mockJudges.activeJudge,
    ...overrides,
  }
}

/**
 * Additional judges for name matching tests
 */
export const mockJudgesForNameMatching = {
  judgeWithSuffix: createMockJudge({
    id: 'judge-005',
    name: 'William James Thompson Jr.',
    slug: 'william-james-thompson-jr',
  }),

  judgeWithInitial: createMockJudge({
    id: 'judge-006',
    name: 'Mary K. Johnson',
    slug: 'mary-k-johnson',
  }),

  judgeWithHyphen: createMockJudge({
    id: 'judge-007',
    name: 'Jennifer Anne Parker-Williams',
    slug: 'jennifer-anne-parker-williams',
  }),

  judgeWithRomanNumeral: createMockJudge({
    id: 'judge-008',
    name: 'Charles Edward Reynolds III',
    slug: 'charles-edward-reynolds-iii',
  }),

  judgeWithMiddleName: createMockJudge({
    id: 'judge-009',
    name: 'Robert Allen Davis',
    slug: 'robert-allen-davis',
  }),

  judgeWithInitialFirst: createMockJudge({
    id: 'judge-010',
    name: 'J. Michael Anderson',
    slug: 'j-michael-anderson',
  }),

  judgeWithMultipleInitials: createMockJudge({
    id: 'judge-011',
    name: 'A. B. C. Washington',
    slug: 'a-b-c-washington',
  }),

  judgeWithDoubleSpace: createMockJudge({
    id: 'judge-012',
    name: 'Allen  L. Norris', // Double space intentional for testing
    slug: 'allen-l-norris',
  }),
}

/**
 * Judge with low case count for threshold testing
 */
export const mockLowCaseCountJudge = createMockJudge({
  id: 'judge-low-cases',
  name: 'Sarah Martinez',
  slug: 'sarah-martinez',
  total_cases: 320, // Below 500 threshold
})

/**
 * Get all mock judges including name matching variants
 */
export const allMockJudges = [
  ...mockJudgesList,
  ...Object.values(mockJudgesForNameMatching),
  mockLowCaseCountJudge,
]
