import { logger } from '@/lib/utils/logger'
import type { CaseAnalytics } from './types'

export async function getCachedAnalytics(supabase: any, judgeId: string): Promise<{ analytics: CaseAnalytics; created_at: string } | null> {
  try {
    const { data: cacheData, error: cacheError } = await supabase
      .from('judge_analytics_cache')
      .select('analytics, created_at')
      .eq('judge_id', judgeId)
      .single()

    if (cacheData && !cacheError) {
      return { analytics: cacheData.analytics, created_at: cacheData.created_at }
    }

    const { data: judgeData, error: judgeError } = await supabase
      .from('judges')
      .select('case_analytics, updated_at')
      .eq('id', judgeId)
      .single()

    if (judgeData?.case_analytics && !judgeError) {
      return { analytics: judgeData.case_analytics, created_at: judgeData.updated_at }
    }

    return null
  } catch {
    return null
  }
}

export async function cacheAnalytics(supabase: any, judgeId: string, analytics: CaseAnalytics): Promise<void> {
  try {
    const { error: cacheError } = await supabase
      .from('judge_analytics_cache')
      .upsert({
        judge_id: judgeId,
        analytics,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'judge_id' })

    if (!cacheError) {
      logger.info('Cached judge analytics', { judgeId })
      return
    }

    await supabase
      .from('judges')
      .update({
        case_analytics: analytics,
        updated_at: new Date().toISOString()
      })
      .eq('id', judgeId)

    logger.info('Cached analytics in judges table', { judgeId })
  } catch (error) {
    logger.error('Failed to cache analytics', { judgeId }, error as Error)
  }
}

export function isDataFresh(createdAt: string, maxAgeHours: number): boolean {
  const cacheTime = new Date(createdAt).getTime()
  const now = Date.now()
  const hoursDiff = (now - cacheTime) / (1000 * 60 * 60)
  return hoursDiff < maxAgeHours
}


