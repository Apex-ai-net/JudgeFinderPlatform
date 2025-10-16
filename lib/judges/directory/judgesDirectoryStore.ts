import { makeAutoObservable, runInAction } from 'mobx'
import * as Sentry from '@sentry/nextjs'
import type { JudgesDirectoryDataManager } from './JudgesDirectoryDataManager'
import type {
  JudgeDirectoryFetchResult,
  JudgeDirectoryState,
  JudgesDirectoryViewModelOptions,
} from './types'

const DEFAULT_PER_PAGE = 24

export class JudgesDirectoryStore {
  private readonly manager: JudgesDirectoryDataManager

  state: JudgeDirectoryState = {
    judges: [],
    total_count: 0,
    page: 1,
    per_page: DEFAULT_PER_PAGE,
    has_more: false,
    loading: false,
    error: null,
    searchTerm: '',
    appliedSearchTerm: '',
    jurisdiction: 'CA',
    onlyWithDecisions: false,
    recentYears: 3,
    currentPage: 1,
    totalPages: 0,
    metricsHistory: [],
    initialized: false,
  }

  constructor(options: JudgesDirectoryViewModelOptions) {
    this.manager = options.manager as JudgesDirectoryDataManager
    makeAutoObservable(this, {}, { autoBind: true })

    if (options.initialState) {
      console.log('[JudgesDirectoryStore] Initializing with SSR data:', {
        page: options.initialState.page,
        judgeCount: options.initialState.judges.length,
        firstJudge: options.initialState.judges[0]?.name,
        totalPages: Math.ceil(options.initialState.total_count / options.initialState.per_page),
      })
      this.applyResponse(options.initialState)
      this.state.initialized = true
    } else {
      console.log('[JudgesDirectoryStore] Initialized without SSR data (client-side only)')
    }
  }

  get hasCachedResults(): boolean {
    return this.state.judges.length > 0
  }

  get isInitialLoading(): boolean {
    return !this.state.initialized && this.state.loading
  }

  setSearchTerm(value: string) {
    this.state.searchTerm = value
  }

  setJurisdiction(value: string | null) {
    this.state.jurisdiction = value
  }

  toggleOnlyWithDecisions(enabled: boolean) {
    this.state.onlyWithDecisions = enabled
  }

  setRecentYears(years: number) {
    this.state.recentYears = years
  }

  setPage(page: number) {
    console.log('[JudgesDirectoryStore] setPage() called:', {
      requestedPage: page,
      currentPage: this.state.currentPage,
      totalPages: this.state.totalPages,
    })

    // Allow fetch when totalPages is unknown (0) to compute server-side
    if (page < 1) {
      console.log('[JudgesDirectoryStore] Invalid page number (< 1)')
      return
    }
    if (this.state.totalPages > 0 && page > this.state.totalPages) {
      console.log('[JudgesDirectoryStore] Page exceeds total pages')
      return
    }

    console.log('[JudgesDirectoryStore] Fetching page:', page)
    void this.fetchPage({ page, replace: true })
  }

  clearError() {
    this.state.error = null
  }

  async loadInitial() {
    console.log('[JudgesDirectoryStore] loadInitial() called:', {
      hasJudges: this.state.judges.length > 0,
      initialized: this.state.initialized,
      currentPage: this.state.currentPage,
    })

    if (this.state.judges.length > 0) {
      console.log('[JudgesDirectoryStore] Skipping loadInitial - data already exists')
      return
    }

    console.log('[JudgesDirectoryStore] Fetching page 1 (no initial data)')
    await this.fetchPage({ page: 1, replace: true })
  }

  async refresh() {
    await this.fetchPage({ page: this.state.currentPage, replace: true })
  }

  private buildRequestParams(page: number) {
    return {
      page,
      limit: this.state.per_page,
      searchTerm: this.state.searchTerm,
      jurisdiction: this.state.jurisdiction ?? undefined,
      onlyWithDecisions: this.state.onlyWithDecisions,
      recentYears: this.state.recentYears,
      includeDecisions: true,
    }
  }

  private applyResponse(response: JudgeDirectoryFetchResult['response']) {
    console.log('[JudgesDirectoryStore] applyResponse() called:', {
      page: response.page,
      judgeCount: response.judges.length,
      firstJudge: response.judges[0]?.name,
      totalCount: response.total_count,
      totalPages: Math.ceil(response.total_count / response.per_page),
    })

    this.state.judges = response.judges
    this.state.total_count = response.total_count
    this.state.page = response.page
    this.state.per_page = response.per_page
    this.state.has_more = response.has_more
    this.state.currentPage = response.page
    this.state.totalPages = Math.ceil(response.total_count / response.per_page)
    this.state.appliedSearchTerm = this.state.searchTerm
  }

  private trackMetrics(metrics: JudgeDirectoryFetchResult['metrics']) {
    this.state.metricsHistory = [...this.state.metricsHistory.slice(-9), metrics]
  }

  private async fetchPage({ page, replace }: { page: number; replace: boolean }) {
    this.state.loading = true
    this.state.error = null

    try {
      const requestParams = this.buildRequestParams(page)
      const { response, metrics } = await this.manager.fetchJudges(requestParams)

      runInAction(() => {
        this.applyResponse(response)
        this.trackMetrics(metrics)
      })

      if (page === 1) {
        Sentry.captureMessage('judges-directory-fetch-success', {
          level: 'info',
          tags: { feature: 'judges-directory' },
          extra: {
            durationMs: metrics.durationMs,
            hasMore: response.has_more,
            totalCount: response.total_count,
            searchTerm: this.state.searchTerm || null,
            jurisdiction: this.state.jurisdiction || 'all',
            onlyWithDecisions: this.state.onlyWithDecisions,
            recentYears: this.state.recentYears,
            endpoint: metrics.endpoint,
            traceId: metrics.traceId,
          },
        })
      }
    } catch (error) {
      runInAction(() => {
        this.state.error = error instanceof Error ? error.message : 'Unable to load judges'
      })

      Sentry.captureException(error, {
        tags: {
          feature: 'judges-directory',
          fetch_type: replace ? 'refresh' : 'paginate',
        },
        extra: {
          page,
          searchTerm: this.state.searchTerm || null,
          jurisdiction: this.state.jurisdiction || 'all',
          onlyWithDecisions: this.state.onlyWithDecisions,
          recentYears: this.state.recentYears,
        },
        level: 'error',
      })
    } finally {
      runInAction(() => {
        this.state.loading = false
        this.state.initialized = true
      })
    }
  }
}

export function getJudgesDirectoryStore(
  manager: JudgesDirectoryDataManager,
  initialState?: JudgeDirectoryFetchResult['response']
): JudgesDirectoryStore {
  // Create new store instance per component to avoid stale state issues
  return new JudgesDirectoryStore({ manager, initialState })
}
