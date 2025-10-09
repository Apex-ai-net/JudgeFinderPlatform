import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import type { AdSpotWithDetails } from '@/types/advertising'
import { logger } from '@/lib/utils/logger'
import { getMaxJudgeRotations } from '@/lib/ads/service'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  entityType: z.enum(['', 'judge', 'court']).default(''),
  courtLevel: z.enum(['', 'federal', 'state']).default(''),
  priceRange: z.enum(['all', 'budget', 'standard', 'premium']).default('all'),
  jurisdiction: z.string().optional().default(''),
  status: z.enum(['available', 'reserved', 'booked', 'maintenance', '']).default('available'),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  const startedAt = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const parsed = querySchema.safeParse({
      entityType: searchParams.get('entity_type') ?? '',
      courtLevel: searchParams.get('court_level') ?? '',
      priceRange: (searchParams.get('price_range') as any) ?? 'all',
      jurisdiction: searchParams.get('jurisdiction') ?? '',
      status: (searchParams.get('status') as any) ?? 'available',
    })

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
    }

    const { entityType, courtLevel, priceRange, jurisdiction, status } = parsed.data
    const supabase = await createServerClient()

    let query = supabase.from('ad_spots').select('*').order('position', { ascending: true })

    if (status) query = query.eq('status', status)
    if (entityType) query = query.eq('entity_type', entityType)
    if (courtLevel) query = query.eq('court_level', courtLevel)

    if (!entityType || entityType === 'judge') {
      query = query.lte('position', getMaxJudgeRotations())
    }

    // Coarse price filters aligned with AdSpotsExplorer hints
    if (priceRange === 'budget') query = query.lte('base_price_monthly', 200)
    if (priceRange === 'standard')
      query = query.gte('base_price_monthly', 201).lte('base_price_monthly', 500)
    if (priceRange === 'premium') query = query.gte('base_price_monthly', 501)

    const { data: spots, error } = await query

    if (error) {
      logger.error('Failed to list available ad spots', { error: error.message })
      return NextResponse.json({ error: 'Failed to load spots' }, { status: 500 })
    }

    // Partition ids for entity enrichment
    const judgeIds = (spots || [])
      .filter((spot) => spot.entity_type === 'judge')
      .map((spot) => spot.entity_id)
    const courtIds = (spots || [])
      .filter((spot) => spot.entity_type === 'court')
      .map((spot) => spot.entity_id)

    const [judgesRes, courtsRes] = await Promise.all([
      judgeIds.length
        ? supabase
            .from('judges')
            .select('id, name, jurisdiction, court_name')
            .in('id', Array.from(new Set(judgeIds)))
        : Promise.resolve({ data: [], error: null } as any),
      courtIds.length
        ? supabase
            .from('courts')
            .select('id, name, jurisdiction')
            .in('id', Array.from(new Set(courtIds)))
        : Promise.resolve({ data: [], error: null } as any),
    ])

    const judgeById = Object.fromEntries((judgesRes.data || []).map((j: any) => [j.id, j]))
    const courtById = Object.fromEntries((courtsRes.data || []).map((c: any) => [c.id, c]))

    let results: AdSpotWithDetails[] = (spots || []).map((s: any) => {
      if (s.entity_type === 'judge') {
        const j = judgeById[s.entity_id] || {}
        return {
          id: s.id,
          entity_type: 'judge',
          entity_id: s.entity_id,
          position: s.position,
          status: s.status,
          base_price_monthly: s.base_price_monthly,
          current_advertiser_id: s.current_advertiser_id,
          impressions_total: s.impressions_total || 0,
          clicks_total: s.clicks_total || 0,
          court_level: s.court_level,
          pricing_tier: s.pricing_tier,
          created_at: s.created_at,
          updated_at: s.updated_at,
          entity_name: j.name || 'Judge',
          entity_details: {
            jurisdiction: j.jurisdiction,
            court_name: j.court_name,
            court_level: s.court_level,
          },
        }
      } else {
        const c = courtById[s.entity_id] || {}
        return {
          id: s.id,
          entity_type: 'court',
          entity_id: s.entity_id,
          position: s.position,
          status: s.status,
          base_price_monthly: s.base_price_monthly,
          current_advertiser_id: s.current_advertiser_id,
          impressions_total: s.impressions_total || 0,
          clicks_total: s.clicks_total || 0,
          court_level: s.court_level,
          pricing_tier: s.pricing_tier,
          created_at: s.created_at,
          updated_at: s.updated_at,
          entity_name: c.name || 'Court',
          entity_details: {
            jurisdiction: c.jurisdiction,
            court_level: s.court_level,
          },
        }
      }
    })

    if (jurisdiction) {
      const q = jurisdiction.toLowerCase()
      results = results.filter((r) =>
        (r.entity_details.jurisdiction || '').toLowerCase().includes(q)
      )
    }

    const res = NextResponse.json({ spots: results })
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=120')
    return res
  } catch (e: any) {
    logger.error('available ad spots error', { error: e?.message })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    logger.apiResponse('GET', '/api/advertising/spots/available', 200, Date.now() - startedAt)
  }
}
