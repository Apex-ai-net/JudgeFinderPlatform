/**
 * CourtListener Position History Data Sync
 * Enriches judge profiles with position history (courts, dates, types)
 * Rate-limited and batched to respect API quotas
 */

import { CourtListenerClient } from './client'
import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PositionRecord {
  id: number
  position_type?: string
  date_start?: string
  date_termination?: string
  court_id?: string
  court_full_name?: string
  [key: string]: unknown
}

export interface PositionSyncOptions {
  judgeIds?: string[] // Specific judge CL IDs to sync
  batchSize?: number // Process N judges at a time (default: 10)
  delayMs?: number // Delay between batches (default: 2000ms)
  skipIfExists?: boolean // Skip judges that already have position data
}

export interface PositionSyncResult {
  success: boolean
  judgesProcessed: number
  judgesUpdated: number
  judgesSkipped: number
  errors: string[]
  duration: number
}

export class PositionSyncManager {
  private readonly supabase: SupabaseClient
  private readonly clClient: CourtListenerClient
  private readonly API_DELAY_MS = 1500 // 1.5s between requests (well under 5k/hr)

  constructor(supabase: SupabaseClient, clClient?: CourtListenerClient) {
    this.supabase = supabase
    this.clClient = clClient || new CourtListenerClient()
  }

  /**
   * Sync position history data for judges
   * Safe for API limits: max 10 judges/batch * 1.5s delay = ~24 judges/min = 1,440/hr (well under 5,000)
   */
  async syncPositions(options: PositionSyncOptions = {}): Promise<PositionSyncResult> {
    const startTime = Date.now()
    const result: PositionSyncResult = {
      success: false,
      judgesProcessed: 0,
      judgesUpdated: 0,
      judgesSkipped: 0,
      errors: [],
      duration: 0,
    }

    try {
      const {
        judgeIds,
        batchSize = 10,
        delayMs = 2000,
        skipIfExists = true,
      } = options

      logger.info('Starting position history sync', { batchSize, skipIfExists, judgeIds: judgeIds?.length || 'all' })

      // Get judges to process
      let query = this.supabase
        .from('judges')
        .select('id, courtlistener_id, name, positions')
        .not('courtlistener_id', 'is', null)

      if (judgeIds && judgeIds.length > 0) {
        query = query.in('courtlistener_id', judgeIds)
      }

      if (skipIfExists) {
        query = query.or('positions.is.null')
      }

      const { data: judges, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch judges: ${fetchError.message}`)
      }

      if (!judges || judges.length === 0) {
        logger.info('No judges found to sync positions')
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      logger.info(`Found ${judges.length} judges to sync position history`)

      // Process in batches
      for (let i = 0; i < judges.length; i += batchSize) {
        const batch = judges.slice(i, i + batchSize)

        logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(judges.length / batchSize)}`, {
          judgeCount: batch.length,
        })

        for (const judge of batch) {
          try {
            // Fetch positions from CourtListener
            const positionData = await this.fetchPositions(judge.courtlistener_id!)

            if (positionData && positionData.length > 0) {
              // Store positions as JSONB
              const formattedPositions = this.formatPositions(positionData)

              // Update judge record
              const { error: updateError } = await this.supabase
                .from('judges')
                .update({ positions: formattedPositions })
                .eq('id', judge.id)

              if (updateError) {
                logger.error('Failed to update judge positions', {
                  judgeId: judge.id,
                  name: judge.name,
                  error: updateError.message,
                })
                result.errors.push(`${judge.name}: ${updateError.message}`)
              } else {
                logger.info('Updated judge positions', {
                  judgeId: judge.id,
                  name: judge.name,
                  positionCount: positionData.length,
                })
                result.judgesUpdated++
              }
            } else {
              logger.debug('No position data found for judge', {
                judgeId: judge.id,
                name: judge.name,
              })
              result.judgesSkipped++
            }

            result.judgesProcessed++

            // Rate limit: delay between each judge
            await sleep(this.API_DELAY_MS)

          } catch (error) {
            const err = error as Error
            logger.error('Error processing judge positions', {
              judgeId: judge.id,
              name: judge.name,
              error: err.message,
            })
            result.errors.push(`${judge.name}: ${err.message}`)
          }
        }

        // Delay between batches
        if (i + batchSize < judges.length) {
          logger.info(`Batch complete, delaying ${delayMs}ms before next batch...`)
          await sleep(delayMs)
        }
      }

      result.success = result.errors.length === 0 || result.judgesUpdated > 0
      result.duration = Date.now() - startTime

      logger.info('Position sync complete', {
        ...result,
        durationSeconds: Math.round(result.duration / 1000),
      })

      return result

    } catch (error) {
      const err = error as Error
      logger.error('Position sync failed', { error: err.message })
      result.errors.push(err.message)
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * Fetch position data from CourtListener for a specific judge
   */
  private async fetchPositions(courtlistenerId: string): Promise<PositionRecord[]> {
    try {
      // CourtListener v4 positions endpoint
      // GET /api/rest/v4/positions/?person={id}
      const response = await this.clClient.getPositions(courtlistenerId)

      return response.results || []

    } catch (error) {
      const err = error as Error
      logger.error('Failed to fetch positions from CourtListener', {
        courtlistenerId,
        error: err.message,
      })
      return []
    }
  }

  /**
   * Format position records for JSONB storage
   * Stores as array of structured objects for easy querying
   */
  private formatPositions(records: PositionRecord[]): Array<{
    court: string
    position_type: string
    date_start: string | null
    date_termination: string | null
    court_id: string | null
  }> {
    return records.map((pos) => ({
      court: pos.court_full_name || pos.court_id || 'Unknown Court',
      position_type: pos.position_type || 'Judge',
      date_start: pos.date_start || null,
      date_termination: pos.date_termination || null,
      court_id: pos.court_id || null,
    }))
  }
}
