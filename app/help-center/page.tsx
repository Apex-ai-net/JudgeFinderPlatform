import { Metadata } from 'next'
import Link from 'next/link'
import {
  Search,
  BookOpen,
  Scale,
  Users,
  MessageCircle,
  Video,
  FileText,
  HelpCircle,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Help Center | JudgeFinder',
  description:
    'Get help with JudgeFinder. Browse guides, tutorials, and FAQs to make the most of your judicial research.',
}

const categories = [
  {
    title: 'Getting Started',
    description: 'New to JudgeFinder? Start here to learn the basics.',
    icon: BookOpen,
    href: '/help-center/getting-started',
    articles: [
      'Creating your account',
      'Understanding judge profiles',
      'Your first search',
      'Navigating the platform',
    ],
  },
  {
    title: 'Features & Tools',
    description: 'Learn about all the features available to you.',
    icon: Scale,
    href: '/help-center/features',
    articles: [
      'Judicial analytics explained',
      'Using the comparison tool',
      'Bookmarking judges',
      'Advanced search filters',
    ],
  },
  {
    title: 'For Attorneys',
    description: 'Specialized guidance for legal professionals.',
    icon: Users,
    href: '/help-center/for-attorneys',
    articles: [
      'Case preparation workflows',
      'Exporting research reports',
      'Bias analysis interpretation',
      'Subscription benefits',
    ],
  },
  {
    title: 'Troubleshooting',
    description: 'Solve common issues and technical problems.',
    icon: HelpCircle,
    href: '/help-center/troubleshooting',
    articles: [
      'Account access issues',
      'Search not working',
      'Missing judge data',
      'Billing questions',
    ],
  },
]

const popularArticles = [
  {
    title: 'How to interpret bias analytics',
    category: 'Features',
    href: '/help-center/features#bias-analytics',
  },
  {
    title: 'Understanding reversal rates',
    category: 'Features',
    href: '/help-center/features#reversal-rates',
  },
  {
    title: 'Comparing judges across jurisdictions',
    category: 'Features',
    href: '/help-center/features#comparison',
  },
  {
    title: 'Attorney subscription features',
    category: 'For Attorneys',
    href: '/help-center/for-attorneys#subscription',
  },
  {
    title: 'Data sources and methodology',
    category: 'Getting Started',
    href: '/help-center/getting-started#methodology',
  },
]

export default function HelpCenterPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-enterprise-primary/20 via-enterprise-deep/10 to-background px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl md:text-5xl font-bold text-foreground">
            How can we help you?
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Search our knowledge base or browse categories below
          </p>

          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto">
            <input
              type="text"
              placeholder="Search help articles..."
              className="w-full px-6 py-4 pl-14 text-lg rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Categories Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Link
                  key={category.href}
                  href={category.href}
                  className="group p-6 rounded-lg border border-border bg-card hover:border-primary hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                      <ul className="space-y-2">
                        {category.articles.map((article, index) => (
                          <li
                            key={index}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            • {article}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Popular Articles */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6">Popular Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularArticles.map((article, index) => (
              <Link
                key={index}
                href={article.href}
                className="p-4 rounded-lg border border-border bg-card hover:border-primary hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{article.category}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Additional Resources */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-border bg-card">
              <Video className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Video Tutorials</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Watch step-by-step guides for using JudgeFinder features.
              </p>
              <Link href="/tutorials" className="text-sm text-primary hover:underline">
                Watch tutorials →
              </Link>
            </div>

            <div className="p-6 rounded-lg border border-border bg-card">
              <MessageCircle className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Contact Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Can't find what you're looking for? Our team is here to help.
              </p>
              <Link href="/contact" className="text-sm text-primary hover:underline">
                Contact us →
              </Link>
            </div>

            <div className="p-6 rounded-lg border border-border bg-card">
              <BookOpen className="h-8 w-8 text-primary mb-3" />
              <h3 className="font-semibold text-foreground mb-2">API Documentation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Technical documentation for developers and integrations.
              </p>
              <Link href="/docs" className="text-sm text-primary hover:underline">
                View docs →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
