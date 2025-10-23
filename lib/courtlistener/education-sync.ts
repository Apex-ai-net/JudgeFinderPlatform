/**
 * CourtListener Education Data Sync
 * Enriches judge profiles with education history (schools, degrees, years)
 * Rate-limited and batched to respect API quotas
 */

import { CourtListenerClient } from './client'
import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/helpers'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface EducationRecord {
  school?: string
  degree?: string
  degree_year?: string
  degree_detail?: string
  [key: string]: unknown
}

export interface EducationSyncOptions {
  judgeIds?: string[] // Specific judge CL IDs to sync
  batchSize?: number // Process N judges at a time (default: 10)
  delayMs?: number // Delay between batches (default: 2000ms)
  skipIfExists?: boolean // Skip judges that already have education data
}

export interface EducationSyncResult {
  success: boolean
  judgesProcessed: number
  judgesUpdated: number
  judgesSkipped: number
  errors: string[]
  duration: number
}

export class EducationSyncManager {
  private readonly supabase: SupabaseClient
  private readonly clClient: CourtListenerClient
  private readonly API_DELAY_MS = 1500 // 1.5s between requests (well under 5k/hr)

  constructor(supabase: SupabaseClient, clClient?: CourtListenerClient) {
    this.supabase = supabase
    this.clClient = clClient || new CourtListenerClient()
  }

  /**
   * Sync education data for judges
   * Safe for API limits: max 10 judges/batch * 1.5s delay = ~24 judges/min = 1,440/hr (well under 5,000)
   */
  async syncEducation(options: EducationSyncOptions = {}): Promise<EducationSyncResult> {
    const startTime = Date.now()
    const result: EducationSyncResult = {
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

      logger.info('Starting education sync', { batchSize, skipIfExists, judgeIds: judgeIds?.length || 'all' })

      // Get judges to process
      let query = this.supabase
        .from('judges')
        .select('id, courtlistener_id, name, education')
        .not('courtlistener_id', 'is', null)

      if (judgeIds && judgeIds.length > 0) {
        query = query.in('courtlistener_id', judgeIds)
      }

      if (skipIfExists) {
        query = query.or('education.is.null,education.eq.""')
      }

      const { data: judges, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch judges: ${fetchError.message}`)
      }

      if (!judges || judges.length === 0) {
        logger.info('No judges found to sync education')
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      logger.info(`Found ${judges.length} judges to sync education`)

      // Process in batches
      for (let i = 0; i < judges.length; i += batchSize) {
        const batch = judges.slice(i, i + batchSize)

        logger.info(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(judges.length / batchSize)}`, {
          judgeCount: batch.length,
        })

        for (const judge of batch) {
          try {
            // Fetch education from CourtListener
            const educationData = await this.fetchEducation(judge.courtlistener_id!)

            if (educationData && educationData.length > 0) {
              // Format education as readable text
              const educationText = this.formatEducation(educationData)

              // Update judge record
              const { error: updateError } = await this.supabase
                .from('judges')
                .update({ education: educationText })
                .eq('id', judge.id)

              if (updateError) {
                logger.error('Failed to update judge education', {
                  judgeId: judge.id,
                  name: judge.name,
                  error: updateError.message,
                })
                result.errors.push(`${judge.name}: ${updateError.message}`)
              } else {
                logger.info('Updated judge education', {
                  judgeId: judge.id,
                  name: judge.name,
                  schoolCount: educationData.length,
                })
                result.judgesUpdated++
              }
            } else {
              logger.debug('No education data found for judge', {
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
            logger.error('Error processing judge education', {
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

      logger.info('Education sync complete', {
        ...result,
        durationSeconds: Math.round(result.duration / 1000),
      })

      return result

    } catch (error) {
      const err = error as Error
      logger.error('Education sync failed', { error: err.message })
      result.errors.push(err.message)
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * Fetch education data from CourtListener for a specific judge
   */
  private async fetchEducation(courtlistenerId: string): Promise<EducationRecord[]> {
    try {
      // CourtListener v4 educations endpoint
      // GET /api/rest/v4/educations/?person={id}
      const response = await this.clClient.getEducations(courtlistenerId)

      return response.results || []

    } catch (error) {
      const err = error as Error
      logger.error('Failed to fetch education from CourtListener', {
        courtlistenerId,
        error: err.message,
      })
      return []
    }
  }

  /**
   * Format education records as readable text
   * Example: "Harvard Law School (J.D., 1995); Yale University (B.A., 1992)"
   */
  private formatEducation(records: EducationRecord[]): string {
    const entries = records
      .map((edu) => {
        const school = typeof edu.school === 'string' && edu.school.trim().length > 0
          ? edu.school.trim()
          : 'Unknown institution'

        const parts: string[] = [school]

        const degreeValue =
          typeof edu.degree === 'string' && edu.degree.trim().length > 0
            ? edu.degree.trim()
            : typeof edu.degree_detail === 'string' && edu.degree_detail.trim().length > 0
              ? edu.degree_detail.trim()
              : undefined

        const year =
          typeof edu.degree_year === 'string' && edu.degree_year.trim().length > 0
            ? edu.degree_year.trim()
            : undefined

        if (degreeValue || year) {
          const degreeText = degreeValue ?? 'Unknown degree'
          const yearText = year ? `, ${year}` : ''
          parts.push(`(${degreeText}${yearText})`)
        }

        return parts.join(' ')
      })
      .filter(Boolean)

    return entries.join('; ')
  }
}
