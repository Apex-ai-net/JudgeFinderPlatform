import { chunkArray } from '@/lib/utils/helpers'
import { logger } from '@/lib/utils/logger'

export async function enrichCasesWithOpinions(supabase: any, cases: any[]): Promise<any[]> {
  if (!cases || cases.length === 0) {
    return []
  }

  const caseMap = new Map<string, any>()
  const caseIds: string[] = []

  for (const caseItem of cases) {
    if (!caseItem?.id) continue
    caseMap.set(caseItem.id, { ...caseItem })
    caseIds.push(caseItem.id)
  }

  if (caseIds.length === 0) {
    return Array.from(caseMap.values())
  }

  const batches = chunkArray(caseIds, 100)

  for (const batch of batches) {
    const { data: opinions, error } = await supabase
      .from('opinions')
      .select('case_id, opinion_type, plain_text, opinion_text, html_text')
      .in('case_id', batch)

    if (error) {
      logger.error('Failed to fetch opinions for cases', { batchSize: batch.length }, error as Error)
      continue
    }

    for (const opinion of opinions || []) {
      if (!opinion?.case_id) continue
      const targetCase = caseMap.get(opinion.case_id)
      if (!targetCase) continue

      const opinionText = extractOpinionText(opinion)
      if (!opinionText) continue

      const isLeadOpinion = opinion.opinion_type === 'lead'
      if (!targetCase.plain_text || isLeadOpinion) {
        targetCase.plain_text = opinionText
        targetCase.analyzable = true
      }
    }
  }

  return Array.from(caseMap.values())
}

export function extractOpinionText(opinion: any): string | null {
  if (!opinion) return null
  if (opinion.plain_text && typeof opinion.plain_text === 'string') {
    return opinion.plain_text
  }
  if (opinion.opinion_text && typeof opinion.opinion_text === 'string') {
    return opinion.opinion_text
  }
  if (opinion.html_text && typeof opinion.html_text === 'string') {
    return opinion.html_text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null
  }
  return null
}


