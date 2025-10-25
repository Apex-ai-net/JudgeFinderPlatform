import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SEOBreadcrumbs } from '@/components/seo/SEOBreadcrumbs'
import {
  Search,
  BarChart3,
  Scale,
  Users,
  FileText,
  TrendingUp,
  BookOpen,
  Database,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Legal Research Tools | JudgeFinder',
  description:
    'Advanced legal research tools for judicial analytics, case outcome analysis, judge comparison, and court performance metrics.',
  alternates: {
    canonical: '/legal-research-tools',
  },
  openGraph: {
    title: 'Legal Research Tools | JudgeFinder',
    description: 'Advanced legal research and judicial analytics tools',
    type: 'website',
  },
}

export default function LegalResearchToolsPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Legal Research Tools', href: '/legal-research-tools' },
  ]

  const researchTools = [
    {
      icon: Search,
      title: 'Judge Search',
      description: 'Find judges by name, jurisdiction, court, or practice area specialization',
      href: '/judges',
      features: [
        'Advanced filters',
        'Practice area tags',
        'Experience level sorting',
        'Quick search',
      ],
      badge: 'Available',
    },
    {
      icon: Users,
      title: 'Judge Comparison',
      description: 'Side-by-side comparison of judicial decision patterns and case outcomes',
      href: '/compare',
      features: [
        'Multi-judge comparison',
        'Statistical analysis',
        'Outcome patterns',
        'Bias reports',
      ],
      badge: 'Available',
    },
    {
      icon: BarChart3,
      title: 'Judicial Analytics',
      description: 'Platform-wide analytics and aggregate judicial statistics',
      href: '/judicial-analytics',
      features: ['Aggregate statistics', 'Trend analysis', 'Performance metrics', 'Benchmarking'],
      badge: 'Available',
    },
    {
      icon: FileText,
      title: 'Case Analytics',
      description: 'Analyze case outcomes, settlement rates, and decision patterns by jurisdiction',
      href: '/case-analytics',
      features: ['Outcome analysis', 'Settlement rates', 'Decision times', 'Court efficiency'],
      badge: 'Available',
    },
    {
      icon: Database,
      title: 'Court Directory',
      description: 'Browse courts by jurisdiction, type, and geographic location',
      href: '/courts',
      features: ['Court hierarchy', 'Jurisdiction maps', 'Judge listings', 'Contact information'],
      badge: 'Available',
    },
    {
      icon: TrendingUp,
      title: 'Bias Reports',
      description: 'Statistical bias analysis for judges with confidence scoring',
      href: '/judges',
      features: [
        'Pattern detection',
        'Confidence intervals',
        'Baseline comparison',
        'Trend analysis',
      ],
      badge: 'On Judge Profiles',
    },
  ]

  const upcomingTools = [
    {
      icon: Sparkles,
      title: 'AI Legal Assistant',
      description: 'Chat with our AI to get insights about judges, courts, and case patterns',
      features: [
        'Natural language queries',
        'Case law search',
        'Judge recommendations',
        'Strategic insights',
      ],
      comingSoon: true,
    },
    {
      icon: BookOpen,
      title: 'Case Law Research',
      description: 'Search and analyze judicial opinions and case law',
      features: [
        'Full-text search',
        'Citation analysis',
        'Opinion summaries',
        'Precedent tracking',
      ],
      comingSoon: true,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <SEOBreadcrumbs items={breadcrumbs} />

      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Legal Research Tools</h1>
            <p className="text-xl text-blue-100">
              Comprehensive suite of judicial analytics and legal research tools for attorneys and
              litigants
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Available Tools */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-3">Available Research Tools</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Access powerful analytics and research capabilities to inform your legal strategy
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {researchTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Link key={tool.title} href={tool.href}>
                  <Card className="h-full hover:shadow-lg transition-all hover:border-blue-300 group">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <Icon className="h-10 w-10 text-blue-600 group-hover:scale-110 transition-transform" />
                        <Badge
                          variant={tool.badge === 'Available' ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          {tool.badge}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mb-2">{tool.title}</CardTitle>
                      <CardDescription className="text-sm">{tool.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 mb-4">
                        {tool.features.map((feature) => (
                          <li
                            key={feature}
                            className="text-sm text-muted-foreground flex items-start"
                          >
                            <ChevronRight className="h-4 w-4 mr-1 mt-0.5 text-blue-600 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="text-primary group-hover:text-blue-800 font-medium text-sm flex items-center">
                        Access Tool
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Upcoming Tools */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-3">Upcoming Features</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            New research capabilities in development
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Card key={tool.title} className="h-full border-dashed border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <Icon className="h-10 w-10 text-muted-foreground" />
                      <Badge variant="outline" className="text-xs">
                        Coming Soon
                      </Badge>
                    </div>
                    <CardTitle className="text-xl mb-2">{tool.title}</CardTitle>
                    <CardDescription className="text-sm">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {tool.features.map((feature) => (
                        <li
                          key={feature}
                          className="text-sm text-muted-foreground flex items-start"
                        >
                          <ChevronRight className="h-4 w-4 mr-1 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Tool Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8">Research by Category</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
              <CardHeader>
                <Scale className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-lg">Judicial Research</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/judges" className="text-primary hover:text-blue-800">
                      • Judge Directory
                    </Link>
                  </li>
                  <li>
                    <Link href="/compare" className="text-primary hover:text-blue-800">
                      • Judge Comparison
                    </Link>
                  </li>
                  <li>
                    <Link href="/judicial-analytics" className="text-primary hover:text-blue-800">
                      • Judicial Analytics
                    </Link>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle className="text-lg">Case Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/case-analytics" className="text-primary hover:text-blue-800">
                      • Case Outcome Analysis
                    </Link>
                  </li>
                  <li>
                    <Link href="/case-analytics" className="text-primary hover:text-blue-800">
                      • Settlement Patterns
                    </Link>
                  </li>
                  <li>
                    <Link href="/case-analytics" className="text-primary hover:text-blue-800">
                      • Decision Trends
                    </Link>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-200">
              <CardHeader>
                <Database className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle className="text-lg">Court Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/courts" className="text-primary hover:text-blue-800">
                      • Court Directory
                    </Link>
                  </li>
                  <li>
                    <Link href="/jurisdictions" className="text-primary hover:text-blue-800">
                      • By Jurisdiction
                    </Link>
                  </li>
                  <li>
                    <Link href="/courts" className="text-primary hover:text-blue-800">
                      • Court Performance
                    </Link>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Getting Started */}
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle className="text-2xl">Getting Started</CardTitle>
            <CardDescription className="text-base">
              New to JudgeFinder? Start with these popular tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link
                href="/judges"
                className="p-4 bg-white border border-border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-foreground mb-1 flex items-center">
                  <Search className="h-5 w-5 mr-2 text-blue-600" />
                  Find a Judge
                </h3>
                <p className="text-sm text-muted-foreground">
                  Search by name, jurisdiction, or court to access judicial profiles and analytics
                </p>
              </Link>

              <Link
                href="/compare"
                className="p-4 bg-white border border-border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-foreground mb-1 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Compare Judges
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select multiple judges to compare decision patterns side-by-side
                </p>
              </Link>

              <Link
                href="/case-analytics"
                className="p-4 bg-white border border-border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-foreground mb-1 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  View Case Analytics
                </h3>
                <p className="text-sm text-muted-foreground">
                  Explore case outcome patterns and court performance metrics by jurisdiction
                </p>
              </Link>

              <Link
                href="/help-center"
                className="p-4 bg-white border border-border rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-foreground mb-1 flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  Read the Guide
                </h3>
                <p className="text-sm text-muted-foreground">
                  Learn how to use our research tools effectively for your legal strategy
                </p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
