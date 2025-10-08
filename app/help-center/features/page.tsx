import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, TrendingUp, GitCompare, Bookmark, Filter, FileText, AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Features & Tools | Help Center | JudgeFinder',
  description: 'Learn about all the features and tools available in JudgeFinder.',
}

const features = [
  {
    id: 'bias-analytics',
    icon: TrendingUp,
    title: 'Judicial Analytics Explained',
    description: 'Understanding AI-powered insights from thousands of cases',
    content: [
      'Reversal Rate: Percentage of decisions overturned on appeal. Lower rates indicate stronger legal reasoning.',
      'Settlement Preference: Tendency to encourage settlement vs. trial. Useful for case strategy planning.',
      'Decision Speed: Average time from hearing to decision. Helps estimate case timelines.',
      'Consistency Score: How predictable the judge\'s rulings are based on historical patterns.',
      'All metrics include confidence intervals based on sample size and data quality.',
    ],
  },
  {
    id: 'reversal-rates',
    icon: AlertCircle,
    title: 'Understanding Reversal Rates',
    description: 'What reversal rates mean and how to interpret them',
    content: [
      'A reversal rate of 0-10% is considered excellent and indicates strong legal reasoning.',
      '10-20% is average and typical for most judges.',
      '20%+ may indicate more aggressive or novel legal interpretations.',
      'Consider the sample size - rates based on fewer than 50 cases may not be statistically significant.',
      'Context matters: Appellate judges naturally have different patterns than trial judges.',
    ],
  },
  {
    id: 'comparison',
    icon: GitCompare,
    title: 'Using the Comparison Tool',
    description: 'Compare judges side-by-side to make informed decisions',
    content: [
      'Click the "Compare" button on any judge profile to add them to your comparison.',
      'Compare up to 4 judges simultaneously with side-by-side metrics.',
      'View differences in reversal rates, decision patterns, and case volumes.',
      'Export comparison reports (premium feature) for case preparation.',
      'Comparison data is saved to your session for easy reference.',
    ],
  },
  {
    id: 'bookmarks',
    icon: Bookmark,
    title: 'Bookmarking Judges',
    description: 'Save judges for quick access and updates',
    content: [
      'Click the bookmark icon on any judge profile to save for later.',
      'Access all bookmarked judges from your dashboard.',
      'Receive notifications when bookmarked judges have profile updates (premium feature).',
      'Organize bookmarks by case or practice area using tags (coming soon).',
      'Export your bookmark list for team collaboration.',
    ],
  },
  {
    id: 'advanced-filters',
    icon: Filter,
    title: 'Advanced Search Filters',
    description: 'Narrow results with powerful filtering options',
    content: [
      'Jurisdiction: Filter by county or judicial district.',
      'Court Type: Superior, Appellate, Supreme, or Federal courts.',
      'Appointment Date: Find judges by years of experience.',
      'Practice Area: Filter by common case types (family law, criminal, civil, etc.).',
      'Save filter combinations for quick access to frequent searches.',
    ],
  },
  {
    id: 'exports',
    icon: FileText,
    title: 'Exporting Research Reports',
    description: 'Generate professional reports for case preparation',
    content: [
      'Premium subscribers can export any judge profile as a PDF report.',
      'Reports include full analytics, professional background, and recent decisions.',
      'Customize report contents to include only relevant sections.',
      'Add custom notes and case-specific observations to exports.',
      'Reports are formatted for professional presentation to clients or colleagues.',
    ],
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-enterprise-primary/20 via-enterprise-deep/10 to-background px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/help-center"
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Help Center
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-4">Features & Tools</h1>
          <p className="text-xl text-muted-foreground">
            Master all the tools available for judicial research
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-12">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div key={feature.id} id={feature.id} className="scroll-mt-24">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">{feature.title}</h2>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
                <div className="ml-16 space-y-3">
                  {feature.content.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <p className="text-muted-foreground">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tips Section */}
        <div className="mt-16 p-6 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <h3 className="text-lg font-semibold text-foreground mb-3">Pro Tips</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Use keyboard shortcuts: Press "/" to focus the search bar from anywhere</li>
            <li>• Bookmark frequently researched judges for instant access</li>
            <li>• Set up email alerts for updates on judges in your active cases</li>
            <li>• Export comparison reports before important hearings for team review</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
