import type { DashboardStats, FreshnessRow } from '@/app/analytics/StatsTypes'

export interface AnalyticsDataPayload {
  judges: Record<string, unknown>
  courts: Record<string, unknown>
  cases: Record<string, unknown>
  platform: Record<string, unknown>
  freshness: { rows?: FreshnessRow[] } | null
}

export interface AnalyticsFetchResult {
  stats: DashboardStats
  freshness: FreshnessRow[]
}

export class AnalyticsDataService {
  constructor(private readonly baseUrl: string = '') {}

  async fetchAnalytics(): Promise<AnalyticsDataPayload> {
    const [judgesRes, courtsRes, casesRes, platformRes, freshnessRes] = await Promise.all([
      fetch(this.resolveUrl('/api/stats/judges'), { cache: 'no-store' }),
      fetch(this.resolveUrl('/api/stats/courts'), { cache: 'no-store' }),
      fetch(this.resolveUrl('/api/stats/cases'), { cache: 'no-store' }),
      fetch(this.resolveUrl('/api/stats/platform'), { cache: 'no-store' }),
      fetch(this.resolveUrl('/api/stats/freshness-by-court'), { cache: 'no-store' }),
    ])

    // Gracefully handle partial failures - return empty objects for failed endpoints
    const judges = judgesRes.ok ? await judgesRes.json() : {}
    const courts = courtsRes.ok ? await courtsRes.json() : {}
    const cases = casesRes.ok ? await casesRes.json() : {}
    const platform = platformRes.ok ? await platformRes.json() : {}
    const freshness = freshnessRes.ok ? await freshnessRes.json() : null

    return { judges, courts, cases, platform, freshness }
  }

  private resolveUrl(path: string): string {
    if (!this.baseUrl) return path
    return `${this.baseUrl}${path}`
  }

  private ensureOk(response: Response): void {
    if (response.ok) return
    throw new Error(`Analytics endpoint failed: ${response.status}`)
  }
}
