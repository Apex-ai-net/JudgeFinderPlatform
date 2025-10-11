import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug, resolveCourtSlug } from '@/lib/utils/slug'

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
    const { data: courts, error } = await supabase
      .from('courts')
      .select('name, slug, updated_at')
      .limit(5000)

    if (error) {
      console.error('[Sitemaps/Courts] DB error:', error)
    }

    const base = getBaseUrl()
    const urls = (courts || []).map((c) => {
      const slug = resolveCourtSlug(c) || createCanonicalSlug(c.name)
      return `  <url>\n    <loc>${base}/courts/${slug}</loc>\n    <lastmod>${iso(c.updated_at)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.60</priority>\n  </url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
    return new NextResponse(xml, {
      headers: {
        'content-type': 'application/xml; charset=UTF-8',
        'cache-control': 'public, max-age=86400',
      },
    })
  } catch (err: any) {
    console.error('[Sitemaps/Courts] Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to generate courts sitemap' }, { status: 500 })
  }
}
