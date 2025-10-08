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
