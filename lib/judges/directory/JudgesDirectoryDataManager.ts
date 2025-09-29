import { nanoid } from 'nanoid'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import type {
  JudgeDirectoryFetchResult,
  JudgeDirectoryRequestParams,
  JudgeDirectoryMetrics,
  JudgesDirectoryDataManagerOptions,
} from './types'

const DEFAULT_LIMIT = 24

export class JudgesDirectoryDataManager {
  private readonly baseUrl: string
  private readonly defaultLimit: number

  constructor(options: JudgesDirectoryDataManagerOptions = {}) {
    this.baseUrl = options.baseUrl ?? getBaseUrl()
    this.defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT
  }

  async fetchJudges(params: Partial<JudgeDirectoryRequestParams> = {}): Promise<JudgeDirectoryFetchResult> {
    const requestParams: JudgeDirectoryRequestParams = {
      page: params.page ?? 1,
      limit: params.limit ?? this.defaultLimit,
      searchTerm: params.searchTerm?.trim() || undefined,
      jurisdiction: params.jurisdiction || undefined,
      onlyWithDecisions: params.onlyWithDecisions ?? false,
      recentYears: params.recentYears ?? 3,
      includeDecisions: params.includeDecisions ?? true,
    }

    const query = new URLSearchParams({
      page: requestParams.page.toString(),
      limit: requestParams.limit.toString(),
      include_decisions: requestParams.includeDecisions ? 'true' : 'false',
    })

    if (requestParams.searchTerm) {
      query.set('q', requestParams.searchTerm)
    }

    if (requestParams.jurisdiction) {
      query.set('jurisdiction', requestParams.jurisdiction)
    }

    if (requestParams.onlyWithDecisions) {
      query.set('only_with_decisions', 'true')
      query.set('recent_years', requestParams.recentYears?.toString() ?? '3')
    }

    const endpoint = `${this.baseUrl}/api/judges/list?${query.toString()}`
    const start = performance.now()
    const response = await fetch(endpoint)

    if (!response.ok) {
      throw new Error(`Failed to fetch judges: ${response.status}`)
    }

    const payload = (await response.json()) as JudgeDirectoryFetchResult['response']
    const metrics = this.buildMetrics({
      requestParams,
      durationMs: Math.round(performance.now() - start),
      endpoint,
      cached: response.headers.get('X-Cache') === 'HIT',
    })

    return {
      response: payload,
      metrics,
    }
  }

  private buildMetrics({
    requestParams,
    durationMs,
    endpoint,
    cached,
  }: {
    requestParams: JudgeDirectoryRequestParams
    durationMs: number
    endpoint: string
    cached: boolean
  }): JudgeDirectoryMetrics {
    return {
      durationMs,
      timestamp: Date.now(),
      endpoint,
      page: requestParams.page,
      cached,
      traceId: nanoid(12),
    }
  }
}

