/**
 * Judge Details Synchronization Module
 * Syncs detailed judge data: positions, education, political affiliations
 * This is Phase 1.3 of the comprehensive California data sync plan
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { CourtListenerClient } from '@/lib/courtlistener/client'
import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/helpers'

interface JudgeDetailsSyncOptions {
  batchSize?: number
  judgeIds?: string[] // Specific judges to sync
  incompleteOnly?: boolean // Only sync judges missing details
  jurisdiction?: string
}

interface JudgeDetailsSyncResult {
  success: boolean
  judgesProcessed: number
  positionsSynced: number
  educationSynced: number
  affiliationsSynced: number
  errors: string[]
  duration: number
}

export class JudgeDetailsSyncManager {
  private supabase: SupabaseClient
  private courtListener: CourtListenerClient
  private syncId: string

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'Supabase credentials missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
      )
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
    this.courtListener = new CourtListenerClient()
    this.syncId = `judge-details-sync-${Date.now()}`
  }

  /**
   * Main sync function for judge details
   */
  async syncJudgeDetails(options: JudgeDetailsSyncOptions = {}): Promise<JudgeDetailsSyncResult> {
    const startTime = Date.now()
    const result: JudgeDetailsSyncResult = {
      success: false,
      judgesProcessed: 0,
      positionsSynced: 0,
      educationSynced: 0,
      affiliationsSynced: 0,
      errors: [],
      duration: 0,
    }

    try {
      logger.info('[Judge Details Sync] Starting sync', { syncId: this.syncId, options })

      // Get judges that need details synced
      const judgesToSync = await this.getJudgesNeedingDetails(options)
      logger.info('[Judge Details Sync] Found judges needing details', {
        count: judgesToSync.length,
      })

      if (judgesToSync.length === 0) {
        logger.info('[Judge Details Sync] No judges need details sync')
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      // Process judges in batches
      const batchSize = options.batchSize || 50
      for (let i = 0; i < judgesToSync.length; i += batchSize) {
        const batch = judgesToSync.slice(i, i + batchSize)

        logger.info('[Judge Details Sync] Processing batch', {
          batch: Math.floor(i / batchSize) + 1,
          size: batch.length,
        })

        for (const judge of batch) {
          try {
            await this.syncJudgeDetails_single(judge)
            result.judgesProcessed++
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            result.errors.push(`Failed to sync judge ${judge.id}: ${message}`)
            logger.error('[Judge Details Sync] Failed to sync judge', {
              judgeId: judge.id,
              error,
            })
          }
        }

        // Rate limiting between batches
        if (i + batchSize < judgesToSync.length) {
          await sleep(1500)
        }
      }

      result.duration = Date.now() - startTime
      result.success = result.errors.length === 0

      logger.info('[Judge Details Sync] Completed', {
        syncId: this.syncId,
        judgesProcessed: result.judgesProcessed,
        errors: result.errors.length,
        duration: result.duration,
      })

      return result
    } catch (error) {
      result.duration = Date.now() - startTime
      result.success = false
      result.errors.push(`Sync failed: ${error}`)

      logger.error('[Judge Details Sync] Failed', { syncId: this.syncId, error })
      return result
    }
  }

  /**
   * Get judges that need details synced
   */
  private async getJudgesNeedingDetails(options: JudgeDetailsSyncOptions) {
    let query = this.supabase
      .from('judges')
      .select('id, name, courtlistener_id')
      .not('courtlistener_id', 'is', null)

    // Filter by jurisdiction if provided
    if (options.jurisdiction) {
      query = query.eq('jurisdiction', options.jurisdiction)
    }

    // If specific judge IDs provided, use them
    if (options.judgeIds && options.judgeIds.length > 0) {
      query = query.in('id', options.judgeIds)
    }

    // If incompleteOnly, join with sync_progress to find incomplete judges
    if (options.incompleteOnly) {
      // Get judges that don't have complete details
      const { data: incompleteProgress } = await this.supabase
        .from('sync_progress')
        .select('judge_id')
        .or('has_education.is.false,has_political_affiliations.is.false,has_positions.is.false')

      if (incompleteProgress && incompleteProgress.length > 0) {
        const incompleteJudgeIds = incompleteProgress.map((p) => p.judge_id)
        query = query.in('id', incompleteJudgeIds)
      }
    }

    const { data, error } = await query.limit(250)

    if (error) {
      throw new Error(`Failed to get judges needing details: ${error.message}`)
    }

    return data || []
  }

  /**
   * Sync details for a single judge
   */
  private async syncJudgeDetails_single(judge: { id: string; courtlistener_id: string }) {
    const courtlistenerId = judge.courtlistener_id.toString()

    // Fetch positions
    const positions = await this.fetchPositions(courtlistenerId)
    if (positions.length > 0) {
      await this.savePositions(judge.id, positions)
      await this.updateSyncProgress(judge.id, { has_positions: true })
    }

    // Small delay between API calls
    await sleep(300)

    // Fetch education
    const educations = await this.fetchEducations(courtlistenerId)
    if (educations.length > 0) {
      await this.saveEducations(judge.id, educations)
      await this.updateSyncProgress(judge.id, { has_education: true })
    }

    // Small delay between API calls
    await sleep(300)

    // Fetch political affiliations
    const affiliations = await this.fetchPoliticalAffiliations(courtlistenerId)
    if (affiliations.length > 0) {
      await this.savePoliticalAffiliations(judge.id, affiliations)
      await this.updateSyncProgress(judge.id, { has_political_affiliations: true })
    }

    logger.info('[Judge Details Sync] Synced judge details', {
      judgeId: judge.id,
      positions: positions.length,
      educations: educations.length,
      affiliations: affiliations.length,
    })
  }

  /**
   * Fetch positions from CourtListener
   */
  private async fetchPositions(courtlistenerId: string) {
    try {
      const response = await this.courtListener.getPositions(courtlistenerId)
      return response.results || []
    } catch (error) {
      logger.warn('[Judge Details Sync] Failed to fetch positions', {
        courtlistenerId,
        error,
      })
      return []
    }
  }

  /**
   * Fetch educations from CourtListener
   */
  private async fetchEducations(courtlistenerId: string) {
    try {
      const response = await this.courtListener.getEducations(courtlistenerId)
      return response.results || []
    } catch (error) {
      logger.warn('[Judge Details Sync] Failed to fetch educations', {
        courtlistenerId,
        error,
      })
      return []
    }
  }

  /**
   * Fetch political affiliations from CourtListener
   */
  private async fetchPoliticalAffiliations(courtlistenerId: string) {
    try {
      const response = await this.courtListener.getPoliticalAffiliations(courtlistenerId)
      return response.results || []
    } catch (error) {
      logger.warn('[Judge Details Sync] Failed to fetch political affiliations', {
        courtlistenerId,
        error,
      })
      return []
    }
  }

  /**
   * Save positions to database
   */
  private async savePositions(judgeId: string, positions: any[]) {
    // Store positions in judge record's courtlistener_data
    const { error } = await this.supabase
      .from('judges')
      .update({
        courtlistener_data: {
          positions,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', judgeId)

    if (error) {
      throw new Error(`Failed to save positions: ${error.message}`)
    }
  }

  /**
   * Save educations to database
   */
  private async saveEducations(judgeId: string, educations: any[]) {
    // Store educations in judge record's courtlistener_data
    const { data: currentJudge } = await this.supabase
      .from('judges')
      .select('courtlistener_data')
      .eq('id', judgeId)
      .single()

    const updatedData = {
      ...(currentJudge?.courtlistener_data || {}),
      educations,
    }

    const { error } = await this.supabase
      .from('judges')
      .update({
        courtlistener_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', judgeId)

    if (error) {
      throw new Error(`Failed to save educations: ${error.message}`)
    }
  }

  /**
   * Save political affiliations to database
   */
  private async savePoliticalAffiliations(judgeId: string, affiliations: any[]) {
    // Store affiliations in judge record's courtlistener_data
    const { data: currentJudge } = await this.supabase
      .from('judges')
      .select('courtlistener_data')
      .eq('id', judgeId)
      .single()

    const updatedData = {
      ...(currentJudge?.courtlistener_data || {}),
      political_affiliations: affiliations,
    }

    const { error } = await this.supabase
      .from('judges')
      .update({
        courtlistener_data: updatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', judgeId)

    if (error) {
      throw new Error(`Failed to save political affiliations: ${error.message}`)
    }
  }

  /**
   * Update sync progress
   */
  private async updateSyncProgress(
    judgeId: string,
    updates: {
      has_positions?: boolean
      has_education?: boolean
      has_political_affiliations?: boolean
    }
  ) {
    try {
      const updateData: any = {
        judge_id: judgeId,
        last_synced_at: new Date().toISOString(),
        ...updates,
      }

      if (updates.has_positions !== undefined) {
        updateData.positions_synced_at = new Date().toISOString()
      }
      if (updates.has_education !== undefined) {
        updateData.education_synced_at = new Date().toISOString()
      }
      if (updates.has_political_affiliations !== undefined) {
        updateData.political_affiliations_synced_at = new Date().toISOString()
      }

      await this.supabase.from('sync_progress').upsert(updateData, {
        onConflict: 'judge_id',
      })
    } catch (error) {
      logger.warn('[Judge Details Sync] Failed to update sync progress', {
        judgeId,
        error,
      })
    }
  }
}
