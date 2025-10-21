import { Suspense } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Search,
  Scale,
  BarChart3,
  MessageSquare,
  TrendingUp,
  Users,
  FileText,
  Brain,
  ArrowRight,
  Sparkles,
  Shield,
  Clock,
} from 'lucide-react'
import { TypewriterText } from '@/components/ui/TypewriterText'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { getBaseUrl } from '@/lib/utils/baseUrl'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Legal Research Tools | Comprehensive Judicial Intelligence Platform',
  description:
    'Access powerful legal research tools for California courts. Search judges, analyze bias patterns, compare judicial tendencies, and leverage AI-powered insights for strategic case preparation.',
  alternates: {
    canonical: `${BASE_URL}/legal-research-tools`,
  },
  openGraph: {
    title: 'Legal Research Tools | JudgeFinder',
    description:
      'Comprehensive suite of legal research tools for judges, courts, case analytics, and AI-powered insights.',
    url: `${BASE_URL}/legal-research-tools`,
    type: 'website',
    siteName: 'JudgeFinder',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legal Research Tools | JudgeFinder',
    description: 'Powerful tools for judicial research, bias analysis, and case strategy.',
  },
  keywords: [
    'legal research tools',
    'judicial analytics',
    'judge bias analysis',
    'court research',
    'case analytics',
    'legal AI',
    'California courts',
    'judge comparison',
    'litigation strategy',
  ],
}

const researchTools = [
  {
    icon: Search,
    title: 'Judge Search & Profiles',
    description:
      'Search 1,000+ California judges with comprehensive profiles including biography, jurisdiction, case history, and detailed analytics.',
    href: '/judges',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    features: [
      'Advanced search filters',
      'Detailed judicial biographies',
      'Appointment history',
      'Court assignments',
    ],
  },
  {
    icon: Scale,
    title: 'Bias Analysis Reports',
    description:
      'AI-powered analysis of judicial patterns including bias detection, outcome trends, and settlement preferences based on 500+ cases per judge.',
    href: '/judicial-analytics',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    features: [
      'Statistical bias detection',
      'Confidence scoring',
      'Pattern recognition',
      'Baseline comparisons',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Settlement Rate Analysis',
    description:
      'Track settlement tendencies by case type, monetary value, and party representation to inform negotiation strategies.',
    href: '/judicial-analytics',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    features: [
      'Settlement vs trial rates',
      'Case type breakdown',
      'Monetary thresholds',
      'Temporal trends',
    ],
  },
  {
    icon: BarChart3,
    title: 'Case Outcome Analytics',
    description:
      'Comprehensive case outcome data including dismissals, decisions, settlements, and motion grant rates across all jurisdictions.',
    href: '/case-analytics',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    features: [
      'Outcome distribution',
      'Decision time analysis',
      'Motion success rates',
      'Jurisdiction comparisons',
    ],
  },
  {
    icon: Users,
    title: 'Judge Comparison Tool',
    description:
      'Side-by-side comparison of judges with key metrics, case outcomes, and analytical insights to guide forum selection.',
    href: '/compare',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    features: [
      'Multi-judge comparison',
      'Key metrics dashboard',
      'Outcome predictions',
      'Forum shopping insights',
    ],
  },
  {
    icon: MessageSquare,
    title: 'AI Legal Assistant',
    description:
      'Ask questions about judges, courts, and case law. Get instant answers powered by Google Gemini and GPT-4 with source citations.',
    href: '/search',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    features: [
      'Natural language queries',
      'Context-aware responses',
      'Source citations',
      'Legal domain expertise',
    ],
  },
  {
    icon: FileText,
    title: 'Court Directory',
    description:
      'Complete directory of California courts including superior, appellate, and supreme courts with jurisdiction details and judge rosters.',
    href: '/courts',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    features: [
      'Court hierarchy',
      'Contact information',
      'Judge assignments',
      'Jurisdiction mapping',
    ],
  },
  {
    icon: Clock,
    title: 'Temporal Trend Analysis',
    description:
      'Track judicial decision patterns over time to identify trends, seasonal variations, and evolving judicial philosophies.',
    href: '/judicial-analytics',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    features: [
      'Time-based patterns',
      'Seasonal analysis',
      'Evolution tracking',
      'Trend forecasting',
    ],
  },
]

const useCases = [
  {
    icon: Shield,
    title: 'For Litigators',
    description: 'Develop data-driven litigation strategies with comprehensive judicial analytics.',
    benefits: [
      'Forum selection guidance',
      'Motion strategy optimization',
      'Settlement timing insights',
      'Judicial preference analysis',
    ],
  },
  {
    icon: Brain,
    title: 'For Legal Researchers',
    description: 'Access deep analytical data for academic research and judicial studies.',
    benefits: [
      'Statistical analysis',
      'Pattern identification',
      'Comparative studies',
      'Historical trends',
    ],
  },
  {
    icon: Users,
    title: 'For Clients & Public',
    description: '100% free access to judicial information for informed legal decisions.',
    benefits: [
      'No registration required',
      'Transparent data',
      'Plain-language summaries',
      'Educational resources',
    ],
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

async function LegalResearchToolsContent() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Legal Research Tools',
    description:
      'Comprehensive suite of legal research tools for California courts including judge search, bias analysis, case analytics, and AI-powered insights.',
    url: `${BASE_URL}/legal-research-tools`,
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'JudgeFinder Legal Research Platform',
      applicationCategory: 'LegalApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        'Judge Search & Profiles',
        'Bias Analysis Reports',
        'Settlement Rate Analysis',
        'Case Outcome Analytics',
        'Judge Comparison Tool',
        'AI Legal Assistant',
        'Court Directory',
        'Temporal Trend Analysis',
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
            <span>Powered by AI & Data Science</span>
          </div>

          <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              Legal Research Tools
            </span>
            <br />
            <span className="text-foreground">
              <TypewriterText text="Data-Driven Insights" />
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-3xl text-lg md:text-xl text-muted-foreground">
            Comprehensive suite of research tools for California courts. Search judges, analyze bias
            patterns, compare outcomes, and leverage AI-powered insights for strategic case
            preparation.
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/judges"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <Search className="h-5 w-5" />
              Search Judges
            </Link>
            <Link
              href="/judicial-analytics"
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-muted transition-colors"
            >
              <BarChart3 className="h-5 w-5" />
              View Analytics
            </Link>
          </div>
        </div>

        <ScrollIndicator />
      </section>

      {/* Tools Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-center">
            Research Tools & Features
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto">
            Everything you need for comprehensive judicial research and case preparation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {researchTools.map((tool, index) => {
            const Icon = tool.icon
            return (
              <Link
                key={index}
                href={tool.href}
                className="group bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-xl hover:border-primary/50 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 ${tool.bgColor} rounded-lg`}>
                    <Icon className={`h-6 w-6 ${tool.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                      {tool.title}
                    </h3>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">{tool.description}</p>

                <ul className="space-y-2 mb-4">
                  {tool.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center text-sm text-primary group-hover:text-primary/80 transition-colors">
                  Explore Tool
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="bg-muted/30 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Who Uses JudgeFinder?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Trusted by legal professionals, researchers, and the public for judicial intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => {
              const Icon = useCase.icon
              return (
                <div
                  key={index}
                  className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="inline-flex p-3 bg-primary/10 rounded-lg mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{useCase.description}</p>
                  <ul className="space-y-2">
                    {useCase.benefits.map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">1,000+</div>
            <div className="text-sm text-muted-foreground">Judges Profiled</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">500+</div>
            <div className="text-sm text-muted-foreground">Cases Per Judge</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">58</div>
            <div className="text-sm text-muted-foreground">California Counties</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-primary mb-2">100%</div>
            <div className="text-sm text-muted-foreground">Free for Users</div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-b from-background via-primary/5 to-background py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to Start Your Research?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Access all tools instantly. No registration required. 100% free.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/judges"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
            >
              <Search className="h-5 w-5" />
              Start Searching
            </Link>
            <Link
              href="/help-center"
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-muted transition-colors"
            >
              Learn More
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tutorial Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Getting Started Guide</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  1
                </span>
                Search for Your Judge
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Use the judge search to find your assigned judge by name, court, or jurisdiction.
                Filter by county or court type.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  2
                </span>
                Review Analytics
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Explore bias patterns, settlement rates, motion grant rates, and temporal trends
                based on hundreds of cases.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  3
                </span>
                Compare Judges
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Use the comparison tool to analyze multiple judges side-by-side for forum selection
                or transfer decisions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  4
                </span>
                Ask the AI
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Have questions? Use our AI assistant to get instant answers about judges, courts,
                and case strategies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function LegalResearchToolsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LegalResearchToolsContent />
    </Suspense>
  )
}
