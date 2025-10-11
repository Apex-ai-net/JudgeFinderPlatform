import { NextRequest, NextResponse } from 'next/server'
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

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const sizeRaw = Math.max(1, parseInt(searchParams.get('size') || '50000', 10))
    const pageSize = Math.min(50000, sizeRaw)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = await createServerClient()
    const { data: judges, error } = await supabase
      .from('judges')
      .select('name, slug, updated_at')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .range(from, to)

    if (error) {
      console.error('[Sitemaps/Judges] DB error:', error)
    }

    const base = getBaseUrl()
    const urls = (judges || []).map((j) => {
      const canonicalSlug = j.slug || createCanonicalSlug(j.name)
      return `  <url>\n    <loc>${base}/judges/${canonicalSlug}</loc>\n    <lastmod>${iso(j.updated_at)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.90</priority>\n  </url>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

    return new NextResponse(xml, {
      headers: {
        'content-type': 'application/xml; charset=UTF-8',
        'cache-control': 'public, max-age=3600',
      },
    })
  } catch (err: any) {
    console.error('[Sitemaps/Judges] Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to generate judges sitemap' }, { status: 500 })
  }
}
