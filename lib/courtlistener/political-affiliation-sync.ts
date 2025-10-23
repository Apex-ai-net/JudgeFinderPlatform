/**
 * CourtListener Political Affiliation Data Sync
 * Enriches judge profiles with political party affiliation history
 * Rate-limited and batched to respect API quotas
 */

import { CourtListenerClient } from './client'
import { logger } from '@/lib/utils/logger'
import { sleep } from '@/lib/utils/helpers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CourtListenerPoliticalAffiliation,
  PoliticalAffiliationSyncOptions,
  PoliticalAffiliationSyncResult,
  FormattedPoliticalAffiliation,
} from './types/political-affiliation'

export class PoliticalAffiliationSyncManager {
  private readonly supabase: SupabaseClient
  private readonly clClient: CourtListenerClient
  private readonly API_DELAY_MS = 1500 // 1.5s between requests (well under 5k/hr)

  constructor(supabase: SupabaseClient, clClient?: CourtListenerClient) {
    this.supabase = supabase
    this.clClient = clClient || new CourtListenerClient()
  }

  /**
   * Sync political affiliation data for judges
   * Safe for API limits: max 10 judges/batch * 1.5s delay = ~24 judges/min = 1,440/hr (well under 5,000)
   */
  async syncPoliticalAffiliations(
    options: PoliticalAffiliationSyncOptions = {}
  ): Promise<PoliticalAffiliationSyncResult> {
    const startTime = Date.now()
    const result: PoliticalAffiliationSyncResult = {
      success: false,
      judgesProcessed: 0,
      judgesUpdated: 0,
      judgesSkipped: 0,
      errors: [],
      duration: 0,
      stats: {
        democraticCount: 0,
        republicanCount: 0,
        independentCount: 0,
        otherCount: 0,
        noDataCount: 0,
      },
    }

    try {
      const {
        judgeIds,
        batchSize = 10,
        delayMs = 2000,
        skipIfExists = true,
        includeHistorical = false,
      } = options

      logger.info('Starting political affiliation sync', {
        batchSize,
        skipIfExists,
        includeHistorical,
        judgeIds: judgeIds?.length || 'all',
      })

      // Get judges to process
      let query = this.supabase
        .from('judges')
        .select('id, courtlistener_id, name, political_affiliation')
        .not('courtlistener_id', 'is', null)

      if (judgeIds && judgeIds.length > 0) {
        query = query.in('courtlistener_id', judgeIds)
      }

      if (skipIfExists) {
        query = query.or('political_affiliation.is.null,political_affiliation.eq.""')
      }

      const { data: judges, error: fetchError } = await query

      if (fetchError) {
        throw new Error(`Failed to fetch judges: ${fetchError.message}`)
      }

      if (!judges || judges.length === 0) {
        logger.info('No judges found to sync political affiliations')
        result.success = true
        result.duration = Date.now() - startTime
        return result
      }

      logger.info(`Found ${judges.length} judges to sync political affiliations`)

      // Process in batches
      for (let i = 0; i < judges.length; i += batchSize) {
        const batch = judges.slice(i, i + batchSize)

        logger.info(
          `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
            judges.length / batchSize
          )}`,
          {
            judgeCount: batch.length,
          }
        )

        for (const judge of batch) {
          try {
            // Fetch political affiliations from CourtListener
            const affiliations = await this.fetchPoliticalAffiliations(judge.courtlistener_id!)

            if (affiliations && affiliations.length > 0) {
              // Format affiliations as readable text
              const affiliationText = includeHistorical
                ? this.formatAffiliationsWithHistory(affiliations)
                : this.formatCurrentAffiliation(affiliations)

              // Update stats based on current affiliation
              const currentAffiliation = this.getCurrentAffiliation(affiliations)
              if (currentAffiliation) {
                this.updateStats(result.stats!, currentAffiliation)
              }

              // Update judge record
              const updateData: any = {
                political_affiliation: affiliationText,
              }

              // Optionally store full data in courtlistener_data JSONB
              if (includeHistorical) {
                const { data: currentJudge } = await this.supabase
                  .from('judges')
                  .select('courtlistener_data')
                  .eq('id', judge.id)
                  .single()

                const courtlistenerData = currentJudge?.courtlistener_data || {}
                courtlistenerData.political_affiliations = affiliations

                updateData.courtlistener_data = courtlistenerData
              }

              const { error: updateError } = await this.supabase
                .from('judges')
                .update(updateData)
                .eq('id', judge.id)

              if (updateError) {
                logger.error('Failed to update judge political affiliation', {
                  judgeId: judge.id,
                  name: judge.name,
                  error: updateError.message,
                })
                result.errors.push(`${judge.name}: ${updateError.message}`)
              } else {
                logger.info('Updated judge political affiliation', {
                  judgeId: judge.id,
                  name: judge.name,
                  affiliation: affiliationText,
                  recordCount: affiliations.length,
                })
                result.judgesUpdated++
              }
            } else {
              logger.debug('No political affiliation data found for judge', {
                judgeId: judge.id,
                name: judge.name,
              })
              result.judgesSkipped++
              result.stats!.noDataCount++
            }

            result.judgesProcessed++

            // Rate limit: delay between each judge
            await sleep(this.API_DELAY_MS)
          } catch (error) {
            const err = error as Error
            logger.error('Error processing judge political affiliation', {
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

      logger.info('Political affiliation sync complete', {
        ...result,
        durationSeconds: Math.round(result.duration / 1000),
      })

      return result
    } catch (error) {
      const err = error as Error
      logger.error('Political affiliation sync failed', { error: err.message })
      result.errors.push(err.message)
      result.duration = Date.now() - startTime
      return result
    }
  }

  /**
   * Fetch political affiliation data from CourtListener for a specific judge
   */
  private async fetchPoliticalAffiliations(
    courtlistenerId: string
  ): Promise<CourtListenerPoliticalAffiliation[]> {
    try {
      // CourtListener v4 political-affiliations endpoint
      // GET /api/rest/v4/political-affiliations/?person={id}
      const response = await this.clClient.getPoliticalAffiliations(courtlistenerId)

      return response.results || []
    } catch (error) {
      const err = error as Error
      logger.error('Failed to fetch political affiliations from CourtListener', {
        courtlistenerId,
        error: err.message,
      })
      return []
    }
  }

  /**
   * Get the current (most recent) political affiliation
   */
  private getCurrentAffiliation(
    affiliations: CourtListenerPoliticalAffiliation[]
  ): CourtListenerPoliticalAffiliation | null {
    if (!affiliations || affiliations.length === 0) return null

    // Sort by date_start descending, nulls last
    const sorted = [...affiliations].sort((a, b) => {
      if (!a.date_start && !b.date_start) return 0
      if (!a.date_start) return 1
      if (!b.date_start) return -1
      return b.date_start.localeCompare(a.date_start)
    })

    // Return the most recent affiliation (or the one with no end date)
    return sorted.find((a) => !a.date_end) || sorted[0]
  }

  /**
   * Format current political affiliation as readable text
   * Example: "Republican Party (2018-present, appointed by Trump)"
   */
  private formatCurrentAffiliation(affiliations: CourtListenerPoliticalAffiliation[]): string {
    const current = this.getCurrentAffiliation(affiliations)
    if (!current) return ''

    const party = this.formatPartyName(current.political_party, current.political_party_id)
    const yearStart = current.date_start ? new Date(current.date_start).getFullYear() : null
    const yearEnd = current.date_end ? new Date(current.date_end).getFullYear() : null
    const period = yearStart ? `${yearStart}-${yearEnd || 'present'}` : ''

    const parts = [party]

    const details = []
    if (period) details.push(period)
    if (current.appointer?.name) details.push(`appointed by ${current.appointer.name}`)

    if (details.length > 0) {
      parts.push(`(${details.join(', ')})`)
    }

    return parts.join(' ')
  }

  /**
   * Format all political affiliations with history
   * Example: "Republican Party (2018-present); Republican Party (2003-2018, appointed by Bush)"
   */
  private formatAffiliationsWithHistory(
    affiliations: CourtListenerPoliticalAffiliation[]
  ): string {
    if (!affiliations || affiliations.length === 0) return ''

    // Sort by date_start descending
    const sorted = [...affiliations].sort((a, b) => {
      if (!a.date_start && !b.date_start) return 0
      if (!a.date_start) return 1
      if (!b.date_start) return -1
      return b.date_start.localeCompare(a.date_start)
    })

    const entries = sorted
      .map((affiliation) => {
        const party = this.formatPartyName(
          affiliation.political_party,
          affiliation.political_party_id
        )
        const yearStart = affiliation.date_start
          ? new Date(affiliation.date_start).getFullYear()
          : null
        const yearEnd = affiliation.date_end
          ? new Date(affiliation.date_end).getFullYear()
          : null
        const period = yearStart ? `${yearStart}-${yearEnd || 'present'}` : ''

        const parts = [party]

        const details = []
        if (period) details.push(period)
        if (affiliation.appointer?.name) {
          details.push(`appointed by ${affiliation.appointer.name}`)
        }

        if (details.length > 0) {
          parts.push(`(${details.join(', ')})`)
        }

        return parts.join(' ')
      })
      .filter(Boolean)

    // Limit to first 3 affiliations for readability
    const limited = entries.slice(0, 3)
    if (entries.length > 3) {
      limited.push(`... and ${entries.length - 3} more`)
    }

    return limited.join('; ')
  }

  /**
   * Format party name for display
   */
  private formatPartyName(partyName: string | null, partyId: string | null): string {
    if (partyName && partyName.trim().length > 0) {
      return partyName.trim()
    }

    // Fallback to party ID mapping
    const partyMap: Record<string, string> = {
      d: 'Democratic Party',
      r: 'Republican Party',
      i: 'Independent',
      g: 'Green Party',
      l: 'Libertarian Party',
      f: 'Federalist',
      w: 'Whig',
      dr: 'Democratic-Republican',
      n: 'Non-partisan',
    }

    if (partyId && partyMap[partyId.toLowerCase()]) {
      return partyMap[partyId.toLowerCase()]
    }

    return 'Unknown'
  }

  /**
   * Update statistics based on party affiliation
   */
  private updateStats(
    stats: NonNullable<PoliticalAffiliationSyncResult['stats']>,
    affiliation: CourtListenerPoliticalAffiliation
  ): void {
    const partyId = affiliation.political_party_id?.toLowerCase()

    switch (partyId) {
      case 'd':
        stats.democraticCount++
        break
      case 'r':
        stats.republicanCount++
        break
      case 'i':
        stats.independentCount++
        break
      case null:
      case undefined:
      case '':
        stats.noDataCount++
        break
      default:
        stats.otherCount++
        break
    }
  }
}