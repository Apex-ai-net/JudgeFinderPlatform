import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'

export const dynamic = 'force-dynamic'

function iso(d: string | null | Date | undefined): string {
  try {
    const dt = d ? new Date(d) : new Date()
    return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerClient()
    const { data: rows, error } = await supabase
      .from('courts')
      .select('jurisdiction, updated_at')
      .not('jurisdiction', 'is', null)
      .limit(5000)

    if (error) {
      console.error('[Sitemaps/Jurisdictions] DB error:', error)
    }

    const latest: Record<string, string> = {}
    for (const r of rows || []) {
      const slug = createCanonicalSlug(String(r.jurisdiction))
      const lm = iso(r.updated_at)
      if (!latest[slug] || lm > latest[slug]) latest[slug] = lm
    }

    const base = getBaseUrl()
    const urls = Object.entries(latest).map(
      ([slug, lastmod]) =>
        `  <url>\n    <loc>${base}/jurisdictions/${slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.55</priority>\n  </url>`
    )

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    return new NextResponse(xml, {
      headers: {
        'content-type': 'application/xml; charset=UTF-8',
        'cache-control': 'public, max-age=86400',
      },
    })
  } catch (err: any) {
    console.error('[Sitemaps/Jurisdictions] Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to generate jurisdictions sitemap' }, { status: 500 })
  }
}
