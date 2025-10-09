/**
 * Test fixtures for case data
 */

export const mockCases = {
  civilCase: {
    id: 'case-001',
    judge_id: 'judge-001',
    case_number: 'CV-2023-12345',
    case_name: 'Smith v. Jones',
    case_type: 'Civil',
    filing_date: '2023-01-15',
    decision_date: '2023-06-20',
    status: 'Closed',
    outcome: 'Settled',
    case_value: 150000,
    court_id: 'court-la-001',
    jurisdiction: 'CA',
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-06-20T00:00:00Z',
  },

  criminalCase: {
    id: 'case-002',
    judge_id: 'judge-001',
    case_number: 'CR-2023-54321',
    case_name: 'People v. Defendant',
    case_type: 'Criminal',
    filing_date: '2023-02-10',
    decision_date: '2023-08-15',
    status: 'Closed',
    outcome: 'Judgment',
    case_value: null,
    court_id: 'court-la-001',
    jurisdiction: 'CA',
    created_at: '2023-02-10T00:00:00Z',
    updated_at: '2023-08-15T00:00:00Z',
  },

  familyCase: {
    id: 'case-003',
    judge_id: 'judge-002',
    case_number: 'FL-2023-99999',
    case_name: 'In Re: Marriage of Smith',
    case_type: 'Family',
    filing_date: '2023-03-01',
    decision_date: '2023-09-30',
    status: 'Closed',
    outcome: 'Settled',
    case_value: 50000,
    court_id: 'court-oc-001',
    jurisdiction: 'CA',
    created_at: '2023-03-01T00:00:00Z',
    updated_at: '2023-09-30T00:00:00Z',
  },

  pendingCase: {
    id: 'case-004',
    judge_id: 'judge-001',
    case_number: 'CV-2024-11111',
    case_name: 'Acme Corp v. Widgets Inc',
    case_type: 'Civil',
    filing_date: '2024-01-05',
    decision_date: null,
    status: 'Pending',
    outcome: null,
    case_value: 500000,
    court_id: 'court-la-001',
    jurisdiction: 'CA',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },

  dismissedCase: {
    id: 'case-005',
    judge_id: 'judge-001',
    case_number: 'CV-2023-22222',
    case_name: 'Plaintiff v. Defendant Corp',
    case_type: 'Civil',
    filing_date: '2023-04-12',
    decision_date: '2023-05-20',
    status: 'Closed',
    outcome: 'Dismissed',
    case_value: 75000,
    court_id: 'court-la-001',
    jurisdiction: 'CA',
    created_at: '2023-04-12T00:00:00Z',
    updated_at: '2023-05-20T00:00:00Z',
  },
}

export const mockCasesList = [
  mockCases.civilCase,
  mockCases.criminalCase,
  mockCases.familyCase,
  mockCases.pendingCase,
  mockCases.dismissedCase,
]

export function generateMockCases(count: number, judgeId: string = 'judge-001') {
  const cases = []
  const types = ['Civil', 'Criminal', 'Family']
  const outcomes = ['Settled', 'Judgment', 'Dismissed']

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const outcome = outcomes[i % outcomes.length]
    const filingDate = new Date(2023, i % 12, (i % 28) + 1)
    const decisionDate = new Date(filingDate)
    decisionDate.setMonth(decisionDate.getMonth() + Math.floor(Math.random() * 6) + 1)

    cases.push({
      id: `case-${String(i + 1).padStart(3, '0')}`,
      judge_id: judgeId,
      case_number: `${type.substring(0, 2).toUpperCase()}-2023-${String(10000 + i).padStart(5, '0')}`,
      case_name: `Case ${i + 1} v. Defendant`,
      case_type: type,
      filing_date: filingDate.toISOString().split('T')[0],
      decision_date: decisionDate.toISOString().split('T')[0],
      status: 'Closed',
      outcome,
      case_value: type === 'Civil' ? Math.floor(Math.random() * 1000000) : null,
      court_id: 'court-la-001',
      jurisdiction: 'CA',
      created_at: filingDate.toISOString(),
      updated_at: decisionDate.toISOString(),
    })
  }

  return cases
}

export function createMockCase(overrides: Partial<typeof mockCases.civilCase> = {}) {
  return {
    ...mockCases.civilCase,
    ...overrides,
  }
}

/**
 * Generate cases with specific settlement rate
 */
export function generateCasesWithSettlementRate(
  total: number,
  settlementRate: number,
  judgeId: string = 'judge-001'
) {
  const settledCount = Math.floor(total * settlementRate)
  const cases = []

  for (let i = 0; i < total; i++) {
    const isSettled = i < settledCount
    cases.push(
      createMockCase({
        id: `case-settlement-${i}`,
        judge_id: judgeId,
        outcome: isSettled ? 'Settled' : 'Judgment',
      })
    )
  }

  return cases
}

/**
 * Generate cases with specific case type distribution
 */
export function generateCasesByType(counts: Record<string, number>, judgeId: string = 'judge-001') {
  const cases = []
  let caseId = 0

  for (const [caseType, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      cases.push(
        createMockCase({
          id: `case-type-${caseId++}`,
          judge_id: judgeId,
          case_type: caseType,
        })
      )
    }
  }

  return cases
}

/**
 * Generate cases with missing data for edge case testing
 */
export function generateCasesWithMissingData(count: number) {
  const cases = []
  for (let i = 0; i < count; i++) {
    const missingField = i % 4
    const baseCase = createMockCase({ id: `case-missing-${i}` })

    if (missingField === 0) {
      baseCase.outcome = null
    } else if (missingField === 1) {
      baseCase.decision_date = null
    } else if (missingField === 2) {
      baseCase.filing_date = null
    } else {
      baseCase.case_value = null
    }

    cases.push(baseCase)
  }
  return cases
}

/**
 * Generate cases within a specific date range
 */
export function generateCasesInDateRange(
  count: number,
  startDate: string,
  endDate: string,
  judgeId: string = 'judge-001'
) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const cases = []

  for (let i = 0; i < count; i++) {
    const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime())
    const randomDate = new Date(randomTime)

    cases.push(
      createMockCase({
        id: `case-date-${i}`,
        judge_id: judgeId,
        filing_date: randomDate.toISOString().split('T')[0],
        decision_date: new Date(randomDate.getTime() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      })
    )
  }

  return cases
}

/**
 * Generate large dataset for comprehensive testing (500+ cases minimum)
 */
export function generateLargeDataset(judgeId: string = 'judge-001') {
  return [
    ...generateCasesByType({ Civil: 300, Criminal: 150, Family: 100 }, judgeId),
    ...generateCasesWithSettlementRate(50, 0.6, judgeId),
  ]
}
