import type { Judge, JudgeDecisionSummary } from '@/types'

export interface JudgeWithDecisions extends Judge {
  decision_summary?: JudgeDecisionSummary
}

export interface JudgeDirectoryApiResponse {
  judges: JudgeWithDecisions[]
  total_count: number
  page: number
  per_page: number
  has_more: boolean
}

export interface JudgeDirectoryRequestParams {
  page: number
  limit: number
  searchTerm?: string
  jurisdiction?: string
  onlyWithDecisions?: boolean
  recentYears?: number
  includeDecisions?: boolean
}

export interface JudgeDirectoryMetrics {
  durationMs: number
  timestamp: number
  endpoint: string
  page: number
  cached: boolean
  traceId: string
}

export interface JudgeDirectoryFetchResult {
  response: JudgeDirectoryApiResponse
  metrics: JudgeDirectoryMetrics
}

export interface JudgeDirectoryState extends JudgeDirectoryApiResponse {
  loading: boolean
  error: string | null
  searchTerm: string
  appliedSearchTerm: string
  jurisdiction: string | null
  onlyWithDecisions: boolean
  recentYears: number
  currentPage: number
  totalPages: number
  metricsHistory: JudgeDirectoryMetrics[]
  initialized: boolean
}

export interface JudgesDirectoryDataManagerOptions {
  baseUrl?: string
  defaultLimit?: number
}

export interface JudgesDirectoryViewModelOptions {
  manager: any
  initialState?: JudgeDirectoryApiResponse
}
