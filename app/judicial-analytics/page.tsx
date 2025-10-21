import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Scale,
  TrendingUp,
  BarChart3,
  Activity,
  Target,
  Brain,
  FileText,
  Download,
  ArrowRight,
  Sparkles,
  PieChart,
  LineChart,
  Users,
  Clock,
} from 'lucide-react'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { createServerClient } from '@/lib/supabase/server'
import { getBaseUrl } from '@/lib/utils/baseUrl'
import { createCanonicalSlug } from '@/lib/utils/slug'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Judicial Analytics | AI-Powered Bias Analysis & Outcome Prediction',
  description:
    'Comprehensive judicial analytics platform analyzing 1,000+ California judges. AI-powered bias detection, settlement rate analysis, motion grant patterns, and temporal trend forecasting with statistical confidence scoring.',
  alternates: {
    canonical: `${BASE_URL}/judicial-analytics`,
  },
  openGraph: {
    title: 'Judicial Analytics | AI-Powered Bias Analysis',
    description:
      'Platform-wide judicial analytics with bias detection, settlement analysis, and outcome prediction for 1,000+ California judges.',
    url: `${BASE_URL}/judicial-analytics`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Judicial Analytics | JudgeFinder',
    description: 'AI-powered judicial bias analysis and outcome prediction for California courts.',
  },
  keywords: [
    'judicial analytics',
    'judge bias analysis',
    'AI bias detection',
    'settlement rate analysis',
    'motion grant rates',
    'judicial patterns',
    'outcome prediction',
    'California judges',
    'statistical confidence',
    'temporal trends',
  ],
}

const analyticsFeatures = [
  {
    icon: Scale,
    title: 'Bias Pattern Detection',
    description:
      'AI-powered correlation analysis identifies patterns in case outcomes by party type, representation, and case characteristics.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    keyMetrics: [
      'Plaintiff vs Defendant bias',
      'Pro se vs Represented bias',
      'Corporate vs Individual bias',
      'Statistical significance testing',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Settlement Rate Analysis',
    description:
      'Track settlement vs trial preferences by case type, monetary value, and representation to optimize negotiation timing.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    keyMetrics: [
      'Settlement vs trial rates',
      'Case type breakdown',
      'Monetary threshold analysis',
      'Party representation impact',
    ],
  },
  {
    icon: Target,
    title: 'Motion Grant Rates',
    description:
      'Historical analysis of motion outcomes including summary judgment, dismissal, and discovery motions with confidence scores.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    keyMetrics: [
      'Motion success rates by type',
      'Grant vs denial patterns',
      'Timing optimization',
      'Confidence intervals',
    ],
  },
  {
    icon: Activity,
    title: 'Temporal Trend Analysis',
    description:
      'Identify decision patterns over time including seasonal variations, career evolution, and recent trend shifts.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    keyMetrics: [
      'Time-based patterns',
      'Seasonal variations',
      'Career trajectory',
      'Trend forecasting',
    ],
  },
  {
    icon: BarChart3,
    title: 'Baseline Comparisons',
    description:
      'Compare individual judge metrics against jurisdiction averages and peer benchmarks for context.',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    keyMetrics: [
      'Jurisdiction averages',
      'Peer comparisons',
      'Outlier detection',
      'Percentile rankings',
    ],
  },
  {
    icon: Brain,
    title: 'AI-Augmented Insights',
    description:
      'Google Gemini and GPT-4 powered analysis generates plain-language summaries with actionable recommendations.',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    keyMetrics: [
      'Natural language summaries',
      'Strategic recommendations',
      'Pattern explanations',
      'Citation sources',
    ],
  },
]

const exportCapabilities = [
  {
    title: 'PDF Reports',
    description: 'Download comprehensive analytical reports with charts and statistics',
    icon: FileText,
  },
  {
    title: 'CSV Data Export',
    description: 'Export raw data for custom analysis in Excel or statistical software',
    icon: Download,
  },
  {
    title: 'API Access',
    description: 'Programmatic access to analytics data for integration (coming soon)',
    icon: Activity,
  },
]

const confidenceMetrics = [
  {
    title: 'Minimum 500 Cases',
    description:
      'Analytics generated only for judges with sufficient case volume for statistical reliability',
    value: '500+',
  },
  {
    title: 'Confidence Scoring',
    description: 'All metrics include confidence intervals and statistical significance levels',
    value: '95%',
  },
  {
    title: 'Regular Updates',
    description: 'Analytics refreshed weekly with latest case data from CourtListener API',
    value: 'Weekly',
  },
  {
    title: 'Data Transparency',
    description: 'Full methodology documentation and source attribution for all calculations',
    value: '100%',
  },
]

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-12 bg-muted rounded w-3/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

async function JudicialAnalyticsContent() {
  const supabase = await createServerClient()

  // Fetch platform-wide statistics
  const { count: totalJudges } = await supabase
    .from('judges')
    .select('*', { count: 'exact', head: true })

  const { count: totalCases } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })

  const { data: judgesWithAnalytics } = await supabase
    .from('judges')
    .select('id')
    .gte('case_count', 500)

  const { data: topJurisdictions } = await supabase
    .from('judges')
    .select('jurisdiction')
    .not('jurisdiction', 'is', null)
    .limit(1000)

  const jurisdictionSet = new Set(topJurisdictions?.map((j) => j.jurisdiction).filter(Boolean))

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Judicial Analytics',
    description:
      'AI-powered judicial analytics platform analyzing 1,000+ California judges with bias detection, settlement analysis, and outcome prediction.',
    url: `${BASE_URL}/judicial-analytics`,
    mainEntity: {
      '@type': 'AnalysisNewsArticle',
      headline: 'Judicial Analytics: AI-Powered Bias Analysis & Outcome Prediction',
      description:
        'Comprehensive analysis platform providing statistical bias detection, settlement rate analysis, motion grant patterns, and temporal trend forecasting.',
      about: {
        '@type': 'Thing',
        name: 'Judicial Analytics',
        description: 'Statistical analysis and AI-powered insights for judicial decision patterns',
      },
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: BASE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Judicial Analytics',
          item: `${BASE_URL}/judicial-analytics`,
        },
      ],
    },
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

        <div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Analytics Engine</span>
          </div>

          <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Judicial Analytics
            </span>
            <br />
            <span className="text-foreground">
              <TypewriterText text="Bias Detection & Prediction" />
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-3xl text-lg md:text-xl text-muted-foreground">
            Comprehensive AI-powered analysis of judicial patterns across 1,000+ California judges.
            Statistical bias detection, settlement rate analysis, motion grant patterns, and
            temporal trend forecasting with 95% confidence scoring.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/judges"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <Users className="h-5 w-5" />
              Browse Judges
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-muted transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              Compare Analytics
            </Link>
          </div>
        </div>

        <ScrollIndicator />
      </section>

      {/* Platform Statistics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-4xl font-bold text-foreground mb-1">
              {totalJudges?.toLocaleString() || '1,000+'}
            </h3>
            <p className="text-sm text-muted-foreground">Judges Analyzed</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-4xl font-bold text-foreground mb-1">
              {totalCases?.toLocaleString() || '500K+'}
            </h3>
            <p className="text-sm text-muted-foreground">Cases Processed</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-4xl font-bold text-foreground mb-1">
              {judgesWithAnalytics?.length || '800+'}
            </h3>
            <p className="text-sm text-muted-foreground">With Full Analytics</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h3 className="text-4xl font-bold text-foreground mb-1">
              {jurisdictionSet.size || '58'}
            </h3>
            <p className="text-sm text-muted-foreground">Jurisdictions Covered</p>
          </div>
        </div>
      </div>

      {/* Analytics Features Grid */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Analytics Capabilities
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Comprehensive metrics powered by statistical analysis and artificial intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {analyticsFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className={`inline-flex p-3 ${feature.bgColor} rounded-lg mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.keyMetrics.map((metric, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Confidence & Quality Metrics */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Statistical Confidence & Quality
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            All analytics include rigorous statistical validation and confidence scoring
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {confidenceMetrics.map((metric, index) => (
            <div
              key={index}
              className="text-center bg-card border border-border rounded-xl p-6 shadow-sm"
            >
              <div className="text-4xl font-bold text-primary mb-2">{metric.value}</div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{metric.title}</h3>
              <p className="text-sm text-muted-foreground">{metric.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Section */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Methodology</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Data Collection</h3>
                    <p className="text-sm text-muted-foreground">
                      Automated sync from CourtListener API with weekly updates for comprehensive
                      case coverage
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Statistical Analysis</h3>
                    <p className="text-sm text-muted-foreground">
                      Correlation analysis, regression modeling, and confidence interval calculation
                      with 95% threshold
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">AI Enhancement</h3>
                    <p className="text-sm text-muted-foreground">
                      Google Gemini 1.5 Flash generates plain-language summaries with actionable
                      insights
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Quality Control</h3>
                    <p className="text-sm text-muted-foreground">
                      Automated data quality checks, outlier detection, and minimum threshold
                      enforcement
                    </p>
                  </div>
                </div>
              </div>
              <Link
                href="/docs/methodology"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mt-6 font-semibold"
              >
                Read Full Methodology
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-card border border-border rounded-xl p-8">
              <h3 className="text-xl font-bold text-foreground mb-6">Export & Integration</h3>
              <div className="space-y-4">
                {exportCapabilities.map((capability, index) => {
                  const Icon = capability.icon
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{capability.title}</h4>
                        <p className="text-sm text-muted-foreground">{capability.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Explained */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Understanding the Analytics
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <PieChart className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Bias Pattern Detection</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Analyzes case outcomes to identify systematic patterns favoring or disfavoring certain
              parties, case types, or representation. Includes plaintiff/defendant bias, pro se
              penalties, and corporate favoritism indicators.
            </p>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
              <strong>Example:</strong> A judge showing 65% plaintiff win rate vs 45% jurisdiction
              average indicates potential pro-plaintiff bias (confidence: 92%)
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <LineChart className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Settlement Rate Analysis</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Tracks settlement vs trial preferences by case type, monetary value, and party
              representation. Helps determine optimal negotiation timing and settlement strategy.
            </p>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
              <strong>Example:</strong> Judge settles 75% of cases under $100K but only 40% above
              $1M, suggesting different approaches for high-value disputes
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Motion Grant Rates</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Historical analysis of motion outcomes by type (summary judgment, dismissal,
              discovery) with success rates and timing patterns to optimize motion strategy.
            </p>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
              <strong>Example:</strong> Judge grants 35% of summary judgment motions filed in month
              6-12 but only 15% filed earlier, suggesting timing optimization
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Temporal Trends</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Identifies decision pattern changes over time including seasonal variations, career
              evolution, and recent trend shifts to predict current judicial approach.
            </p>
            <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
              <strong>Example:</strong> Judge's plaintiff win rate increased from 45% (2020-2022) to
              58% (2023-2024), indicating evolving judicial philosophy
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-b from-background via-primary/5 to-background py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Explore Judicial Analytics Now
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Access comprehensive analytics for 1,000+ California judges. 100% free. No registration
            required.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/judges"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
            >
              <Users className="h-5 w-5" />
              Browse All Judges
            </Link>
            <Link
              href="/compare"
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-muted transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              Compare Judges
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function JudicialAnalyticsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <JudicialAnalyticsContent />
    </Suspense>
  )
}
