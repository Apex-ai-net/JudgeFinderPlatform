/**
 * Related Content System for internal linking and content discovery
 * Enhances SEO through strategic internal linking and user engagement
 */

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { resolveCourtSlug, createCanonicalSlug } from '@/lib/utils/slug'
import type { Judge } from '@/types'

interface RelatedContentProps {
  currentJudge: Judge
  relatedJudges: Judge[]
  jurisdiction: string
  courtName: string
  courtSlug?: string | null
}

export function RelatedContent({
  currentJudge,
  relatedJudges,
  jurisdiction,
  courtName,
  courtSlug,
}: RelatedContentProps) {
  const safeName = currentJudge.name || 'Unknown Judge'
  const cleanName = safeName.replace(/^(judge|justice|the honorable)\s+/i, '')
  const preferredCourtSlug =
    courtSlug ||
    resolveCourtSlug({ slug: currentJudge.court_slug, name: courtName }) ||
    'unknown-court'

  return (
    <div className="space-y-8">
      {/* Related Judges Section */}
      {relatedJudges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Other Judges in {jurisdiction}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Explore other judicial officers serving in {jurisdiction}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relatedJudges.slice(0, 5).map((judge) => {
                const relatedName =
                  judge.name?.replace(/^(judge|justice|the honorable)\s+/i, '') || 'Unknown Judge'
                const slug =
                  judge.slug || judge.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'

                return (
                  <Link
                    key={judge.id}
                    href={`/judges/${slug}`}
                    className="block p-3 rounded-lg border border-border hover:border-blue-300 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-foreground">Judge {relatedName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {judge.court_name || courtName}
                        </p>
                        {judge.appointed_date && (
                          <p className="text-xs text-muted-foreground">
                            Appointed {new Date(judge.appointed_date).getFullYear()}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        View Profile
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t">
              <Link
                href={`/jurisdictions/${createCanonicalSlug(jurisdiction)}`}
                className="text-primary hover:text-blue-800 text-sm font-medium"
              >
                View All {jurisdiction} Judges →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Court Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{courtName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Learn more about Judge {cleanName}'s court
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-foreground mb-2">Court Information</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Jurisdiction: {jurisdiction}</li>
                <li>• Court Type: {getCourtType(courtName)}</li>
                <li>• Service Area: {getServiceArea(jurisdiction)}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Link
                href={`/courts/${preferredCourtSlug}`}
                className="block p-2 text-primary hover:text-blue-800 text-sm font-medium"
              >
                View {courtName} Directory →
              </Link>
              <Link
                href={`/jurisdictions/${createCanonicalSlug(jurisdiction)}`}
                className="block p-2 text-primary hover:text-blue-800 text-sm font-medium"
              >
                Explore {jurisdiction} Legal System →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Resources Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Legal Resources</CardTitle>
          <p className="text-sm text-muted-foreground">
            Additional resources for legal professionals and litigants
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <Link
                href={`/attorneys/${createCanonicalSlug(jurisdiction)}`}
                className="p-3 border border-border rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <h4 className="font-medium text-foreground">Attorney Directory</h4>
                <p className="text-sm text-muted-foreground">
                  Find experienced attorneys in {jurisdiction}
                </p>
              </Link>

              <Link
                href={`/case-analytics/${createCanonicalSlug(jurisdiction)}`}
                className="p-3 border border-border rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <h4 className="font-medium text-foreground">Case Analytics</h4>
                <p className="text-sm text-muted-foreground">Research case patterns and outcomes</p>
              </Link>

              <Link
                href="/legal-research-tools"
                className="p-3 border border-border rounded-lg hover:border-primary/60 hover:bg-primary/5 transition-colors"
              >
                <h4 className="font-medium text-foreground">Research Tools</h4>
                <p className="text-sm text-muted-foreground">
                  Advanced legal research and analytics
                </p>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO-focused Content Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Popular Searches</CardTitle>
          <p className="text-sm text-muted-foreground">Frequently searched judicial information</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <Link
              href={`/judges?jurisdiction=${encodeURIComponent(jurisdiction)}`}
              className="text-primary hover:text-blue-800"
            >
              All {jurisdiction} Judges
            </Link>
            <Link
              href={`/judges?court=${encodeURIComponent(courtName)}`}
              className="text-primary hover:text-blue-800"
            >
              {getCourtType(courtName)} Judges
            </Link>
            <Link href="/judges?experience=veteran" className="text-primary hover:text-blue-800">
              Veteran Judges (15+ Years)
            </Link>
            <Link
              href="/judges?recently-appointed=true"
              className="text-primary hover:text-blue-800"
            >
              Recently Appointed Judges
            </Link>
            <Link href="/judicial-analytics" className="text-primary hover:text-blue-800">
              Judicial Analytics Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Helper function to determine court type
 */
function getCourtType(courtName: string): string {
  const name = courtName.toLowerCase()

  if (name.includes('superior')) return 'Superior Court'
  if (name.includes('appeal')) return 'Court of Appeal'
  if (name.includes('supreme')) return 'Supreme Court'
  if (name.includes('federal')) return 'Federal Court'
  if (name.includes('family')) return 'Family Court'
  if (name.includes('criminal')) return 'Criminal Court'
  if (name.includes('civil')) return 'Civil Court'

  return 'Court'
}

/**
 * Helper function to determine service area
 */
function getServiceArea(jurisdiction: string): string {
  const jurisdictionData: Record<string, string> = {
    'Orange County': '3.2M residents across 34 cities',
    'Los Angeles County': '10M residents across 88 cities',
    'San Francisco County': '875K residents in San Francisco',
    'San Diego County': '3.3M residents across 18 cities',
    'Sacramento County': '1.6M residents across 19 cities',
    'Alameda County': '1.7M residents across 14 cities',
    'Santa Clara County': '1.9M residents across 15 cities',
    'Riverside County': '2.4M residents across 28 cities',
    'San Bernardino County': '2.2M residents across 24 cities',
    California: '39M residents statewide',
  }

  return jurisdictionData[jurisdiction] || `${jurisdiction} residents`
}
