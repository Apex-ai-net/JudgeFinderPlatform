import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Getting Started | Help Center | JudgeFinder',
  description: 'Learn the basics of using JudgeFinder for judicial research.',
}

const sections = [
  {
    id: 'creating-account',
    title: 'Creating Your Account',
    content: [
      'Click the "Sign Up" button in the top right corner of the homepage.',
      'Enter your email address and create a secure password.',
      'Complete the onboarding wizard to customize your experience.',
      'Verify your email address by clicking the link sent to your inbox.',
    ],
  },
  {
    id: 'understanding-profiles',
    title: 'Understanding Judge Profiles',
    content: [
      'Judge profiles contain comprehensive information including current position, appointment date, and jurisdiction.',
      'The analytics section shows AI-powered insights from thousands of cases.',
      'Professional background includes education, prior experience, and bar admissions.',
      'Recent decisions section displays the latest rulings and case outcomes.',
    ],
  },
  {
    id: 'first-search',
    title: 'Your First Search',
    content: [
      'Use the search bar to enter a judge name, court, or jurisdiction.',
      'Our AI-powered search understands natural language queries like "family law judges in Orange County".',
      'Results display key metrics at a glance including case volume and experience.',
      'Click any result to view the full profile with detailed analytics.',
    ],
  },
  {
    id: 'navigating',
    title: 'Navigating the Platform',
    content: [
      'Dashboard: Your personalized home with recent searches and bookmarks.',
      'Search: Find judges using our advanced filtering system.',
      'Bookmarks: Save judges for quick access and receive updates.',
      'Profile: Manage your account settings and subscription.',
    ],
  },
  {
    id: 'methodology',
    title: 'Data Sources and Methodology',
    content: [
      'JudgeFinder aggregates data from official court records, public filings, and verified legal databases.',
      'Our AI analyzes case outcomes, decision patterns, and judicial behavior using proprietary algorithms.',
      'All analytics include confidence intervals and sample size information for transparency.',
      'Data is updated regularly to ensure accuracy and relevance.',
    ],
  },
]

const faqs = [
  {
    question: 'Is JudgeFinder free to use?',
    answer:
      'Yes! Basic search and judge profiles are free for all users. Premium features like advanced analytics and export capabilities are available with a subscription.',
  },
  {
    question: 'How accurate is the data?',
    answer:
      'We source data from official court records and verified legal databases. Our AI analyzes this data with statistical rigor, providing confidence intervals for all metrics.',
  },
  {
    question: 'Which jurisdictions are covered?',
    answer:
      'JudgeFinder currently covers all California state courts including Superior, Appellate, and Supreme Courts. Federal court coverage is in development.',
  },
  {
    question: 'Can I download or export judge data?',
    answer:
      'Yes, premium subscribers can export judge profiles and analytics as PDF reports for case preparation.',
  },
]

export default function GettingStartedPage(): JSX.Element {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Getting Started</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to know to start using JudgeFinder effectively
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Sections */}
        <div className="space-y-12 mb-16">
          {sections.map((section) => (
            <div key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-foreground mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.content.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 rounded-lg border border-border bg-card">
                <h3 className="text-lg font-semibold text-foreground mb-3">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-16 p-6 rounded-lg bg-primary/10 border border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-3">Ready to continue?</h3>
          <p className="text-muted-foreground mb-4">
            Now that you understand the basics, learn about all the features available to you.
          </p>
          <Link
            href="/help-center/features"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Explore Features →
          </Link>
        </div>
      </div>
    </div>
  )
}
