import { Metadata } from 'next'
import Link from 'next/link'
import {
  ChevronLeft,
  Briefcase,
  FileDown,
  BarChart3,
  Bell,
  Users,
  Shield,
  Megaphone,
  TrendingUp,
  Target,
  Award,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'For Attorneys | JudgeFinder',
  description:
    'Specialized guidance for legal professionals using JudgeFinder - research tools, advertising options, and premium features.',
}

const sections = [
  {
    id: 'advertising',
    icon: Megaphone,
    title: 'Advertising Your Legal Services',
    description: 'Promote your firm on high-traffic judge profiles',
    content: [
      'Reach attorneys and litigants researching judges in your practice area',
      'Bar-verified placements with professional credibility indicators',
      'Rotation slots ensure equal visibility among advertisers',
      'Track performance with detailed impressions, clicks, and CTR analytics',
      'Federal judge profiles ($500/month per judge) for complex litigation matters',
      'State judge profiles ($500/month per judge) for high-volume local targeting',
      'Instant placement within 24 hours of bar verification',
      'Annual billing saves 2 months (16.67% discount)',
    ],
    cta: {
      text: 'Learn More About Advertising',
      href: '/advertise',
    },
  },
  {
    id: 'case-prep',
    icon: Briefcase,
    title: 'Case Preparation Workflows',
    description: 'Integrate JudgeFinder into your case preparation process',
    content: [
      'Start research as soon as you receive a case assignment or hearing date.',
      "Review the judge's professional background to understand their legal philosophy.",
      'Analyze bias patterns and decision trends relevant to your case type.',
      'Compare your assigned judge with others in the same jurisdiction for context.',
      'Export a comprehensive report to share with your legal team.',
      'Set up alerts to track any profile updates before your hearing date.',
    ],
  },
  {
    id: 'export-reports',
    icon: FileDown,
    title: 'Exporting Research Reports',
    description: 'Generate professional reports for case preparation',
    content: [
      'Premium subscribers can export judge profiles as formatted PDF reports.',
      'Reports include all analytics, background, and recent decisions.',
      'Customize which sections to include based on case needs.',
      'Add custom notes specific to your case strategy.',
      'Reports are professionally formatted for client presentations.',
      'Bulk export multiple judge profiles for comparative analysis.',
    ],
  },
  {
    id: 'bias-interpretation',
    icon: BarChart3,
    title: 'Bias Analysis Interpretation',
    description: 'Understanding judicial patterns for case strategy',
    content: [
      'Bias indicators show statistical patterns, not personal prejudice.',
      'Higher plaintiff favorability means statistically more plaintiff victories in similar cases.',
      "Settlement preference indicates the judge's tendency to encourage pre-trial resolution.",
      'Decision consistency helps predict how the judge may rule in your case.',
      'Always consider confidence intervals - larger sample sizes are more reliable.',
      'Combine analytics with legal research for comprehensive case strategy.',
    ],
  },
  {
    id: 'subscription',
    icon: Shield,
    title: 'Premium Subscription Benefits',
    description: 'Advanced features for legal professionals',
    content: [
      'Unlimited judge profile views and searches.',
      'Export unlimited PDF reports for case preparation.',
      'Advanced analytics including predictive modeling.',
      'Email alerts for profile updates on bookmarked judges.',
      'Priority customer support via phone and email.',
      'Team collaboration features (coming soon).',
      'API access for practice management integration (enterprise).',
    ],
    cta: {
      text: 'View Subscription Plans',
      href: '/pricing',
    },
  },
  {
    id: 'team-collaboration',
    icon: Users,
    title: 'Team Collaboration (Coming Soon)',
    description: 'Share research across your legal team',
    content: [
      'Create shared workspaces for case teams.',
      'Collaboratively bookmark and annotate judge profiles.',
      'Share custom notes and case strategies internally.',
      'Track team member research activity.',
      'Assign research tasks to paralegals and associates.',
      'Enterprise features available for firms with 10+ attorneys.',
    ],
  },
  {
    id: 'alerts',
    icon: Bell,
    title: 'Setting Up Alerts',
    description: 'Stay informed about judge profile changes',
    content: [
      'Bookmark any judge to enable alert options.',
      'Choose to receive alerts for new decisions, appointment changes, or analytics updates.',
      'Set alert frequency: immediate, daily digest, or weekly summary.',
      'Customize alert content to include only relevant information.',
      'Alerts are sent via email with direct links to updated profiles.',
      'Manage all alert preferences from your account settings.',
    ],
  },
]

const bestPractices = [
  'Begin judge research immediately upon case assignment',
  'Cross-reference JudgeFinder analytics with legal research databases',
  'Bookmark judges for all active cases to track updates',
  'Export reports before team strategy meetings',
  'Use comparison tool when judge shopping or venue selection',
  'Set up alerts at least 2 weeks before scheduled hearings',
]

const comparisonTable = [
  {
    feature: 'Purpose',
    research: 'Case preparation & judicial analytics',
    advertising: 'Client acquisition & firm promotion',
  },
  {
    feature: 'Target Audience',
    research: 'Attorneys researching judges',
    advertising: 'Attorneys & litigants seeking representation',
  },
  {
    feature: 'Pricing',
    research: 'Premium subscription ($X/month)',
    advertising: 'Ad placement ($500/month per judge, $1,000/month per court)',
  },
  {
    feature: 'Benefits',
    research: 'Unlimited profiles, exports, alerts',
    advertising: 'Targeted visibility, bar verification, analytics',
  },
]

export default function ForAttorneysPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-4">For Attorneys</h1>
          <p className="text-xl text-muted-foreground">
            Specialized guidance for legal professionals using JudgeFinder
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Advertising vs Research Comparison */}
        <div className="mb-16 bg-white rounded-lg border border-border p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Research Tools vs. Advertising
          </h3>
          <p className="text-muted-foreground mb-4">
            JudgeFinder offers two distinct services for legal professionals:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Research Tools
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-foreground">
                    Advertising
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonTable.map((row, idx) => (
                  <tr key={idx} className="border-b border-border">
                    <td className="py-3 px-4 font-medium text-foreground">{row.feature}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row.research}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row.advertising}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12 mb-16">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <div key={section.id} id={section.id} className="scroll-mt-24">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-foreground mb-2">{section.title}</h2>
                    <p className="text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="ml-16 space-y-3">
                  {section.content.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground">{item}</p>
                    </div>
                  ))}
                  {section.cta && (
                    <div className="mt-4">
                      <Link
                        href={section.cta.href}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                      >
                        {section.cta.text}
                        <TrendingUp className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Best Practices */}
        <div className="mb-16 p-6 rounded-lg border border-border bg-card">
          <h3 className="text-xl font-semibold text-foreground mb-4">Best Practices</h3>
          <div className="space-y-3">
            {bestPractices.map((practice, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-green-500">{index + 1}</span>
                </div>
                <p className="text-muted-foreground">{practice}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Dual CTAs */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Research CTA */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
            <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Upgrade to Premium Research
            </h3>
            <p className="text-muted-foreground mb-4">
              Get full access to all premium features including exports, advanced analytics,
              and priority support.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              View Pricing Plans →
            </Link>
          </div>

          {/* Advertising CTA */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-green-50 to-green-50/30 border border-green-200">
            <div className="p-3 bg-green-100 rounded-lg w-fit mb-4">
              <Megaphone className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Advertise Your Practice
            </h3>
            <p className="text-muted-foreground mb-4">
              Reach attorneys when they&apos;re researching judges. Bar-verified placements with
              detailed analytics.
            </p>
            <Link
              href="/advertise"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              Start Advertising →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
