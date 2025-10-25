import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase/server'
import { createCanonicalSlug } from '@/lib/utils/slug'
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs'
import { MapPin, Scale, Users, Briefcase, GraduationCap, Building } from 'lucide-react'

interface PageProps {
  params: Promise<{ jurisdiction: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { jurisdiction: jurisdictionSlug } = await params

  // Convert slug to readable name
  const jurisdictionName = jurisdictionSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    title: `Attorneys in ${jurisdictionName} | JudgeFinder`,
    description: `Find experienced attorneys in ${jurisdictionName}. Search by practice area, court experience, and judge appearance history.`,
    alternates: {
      canonical: `/attorneys/${jurisdictionSlug}`,
    },
    openGraph: {
      title: `Attorneys in ${jurisdictionName} | JudgeFinder`,
      description: `Find experienced attorneys in ${jurisdictionName}`,
      type: 'website',
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function AttorneyJurisdictionPage({ params }: PageProps) {
  const { jurisdiction: jurisdictionSlug } = await params
  const supabase = await createServerClient()

  // Convert slug to jurisdiction name
  const jurisdictionName = jurisdictionSlug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // Verify jurisdiction exists
  const { data: courts, error: courtsError } = await supabase
    .from('courts')
    .select('*')
    .ilike('jurisdiction', jurisdictionName)
    .limit(1)

  if (courtsError || !courts || courts.length === 0) {
    notFound()
  }

  // Get stats for this jurisdiction
  const { data: allCourts } = await supabase
    .from('courts')
    .select('id, name, slug, type')
    .ilike('jurisdiction', jurisdictionName)

  const { data: judges } = await supabase
    .from('judges')
    .select('id, name, slug, appointed_date')
    .ilike('jurisdiction', jurisdictionName)

  const courtCount = allCourts?.length || 0
  const judgeCount = judges?.length || 0

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Attorney Directory', href: '/attorneys' },
    { label: jurisdictionName, href: `/attorneys/${jurisdictionSlug}` },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SEOBreadcrumbs items={breadcrumbs} />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <div className="flex items-center text-blue-100 mb-2">
              <MapPin className="h-5 w-5 mr-2" />
              <span>{jurisdictionName}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Attorney Directory</h1>
            <p className="text-xl text-blue-100">
              Find experienced attorneys practicing in {jurisdictionName} courts
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Coming Soon Notice */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Attorney Profiles Coming Soon</CardTitle>
            <CardDescription className="text-blue-700">
              We are building a comprehensive attorney directory for {jurisdictionName} with
              verified profiles, practice areas, and court appearance history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-blue-700">The attorney directory will include:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
                <li className="flex items-start">
                  <Briefcase className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Practice area specializations</span>
                </li>
                <li className="flex items-start">
                  <GraduationCap className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Years of experience and education</span>
                </li>
                <li className="flex items-start">
                  <Scale className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Court appearance history by judge</span>
                </li>
                <li className="flex items-start">
                  <Building className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>State Bar verification and status</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Jurisdiction Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">{judgeCount}</CardTitle>
              <CardDescription>Active Judges</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={`/jurisdictions/${jurisdictionSlug}`}
                className="text-sm text-primary hover:text-blue-800 font-medium"
              >
                View all judges →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Building className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">{courtCount}</CardTitle>
              <CardDescription>Courts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Courts serving {jurisdictionName}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Scale className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-2xl">Soon</CardTitle>
              <CardDescription>Attorney Profiles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Verified legal professionals</p>
            </CardContent>
          </Card>
        </div>

        {/* Courts in Jurisdiction */}
        {allCourts && allCourts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Courts in {jurisdictionName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Browse courts where attorneys in this jurisdiction practice. Each court has detailed
              judge profiles and case analytics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCourts.map((court) => {
                const courtSlug = court.slug || createCanonicalSlug(court.name)

                return (
                  <Link key={court.id} href={`/courts/${courtSlug}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow hover:border-blue-300">
                      <CardHeader>
                        <CardTitle className="text-base line-clamp-2">{court.name}</CardTitle>
                        <Badge variant="outline" className="w-fit text-xs">
                          {court.type || 'Court'}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-1" />
                          {jurisdictionName}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Related Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Explore {jurisdictionName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href={`/jurisdictions/${jurisdictionSlug}`}
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">All Judges</h3>
                <p className="text-sm text-muted-foreground">
                  Browse all {judgeCount} judges in {jurisdictionName}
                </p>
              </Link>

              <Link
                href={`/case-analytics/${jurisdictionSlug}`}
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Case Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze case patterns in {jurisdictionName}
                </p>
              </Link>

              <Link
                href="/attorneys"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Other Jurisdictions</h3>
                <p className="text-sm text-muted-foreground">
                  Browse attorneys in other California counties
                </p>
              </Link>

              <Link
                href="/legal-research-tools"
                className="p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-primary/5 transition-colors"
              >
                <h3 className="font-semibold text-foreground mb-1">Research Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced legal research and analytics
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
