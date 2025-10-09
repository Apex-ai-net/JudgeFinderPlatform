import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, AlertCircle, Search, Database, CreditCard, Lock, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Troubleshooting | Help Center | JudgeFinder',
  description: 'Solve common issues and technical problems with JudgeFinder.',
}

const issues = [
  {
    id: 'account-access',
    icon: Lock,
    title: 'Account Access Issues',
    problems: [
      {
        symptom: 'Forgot my password',
        solution: [
          'Click "Forgot Password" on the sign-in page.',
          'Enter your email address to receive a reset link.',
          "Check your spam folder if you don't see the email within 5 minutes.",
          'Reset links expire after 1 hour for security.',
          'If still having issues, contact support@judgefinder.io',
        ],
      },
      {
        symptom: 'Account locked after multiple failed login attempts',
        solution: [
          'Your account is temporarily locked for security after 5 failed attempts.',
          'Wait 30 minutes, then try again.',
          'Use the "Forgot Password" feature to reset your password.',
          'Contact support if you suspect unauthorized access attempts.',
        ],
      },
      {
        symptom: 'Email verification not working',
        solution: [
          'Check your spam/junk folder for the verification email.',
          'Click "Resend Verification Email" from your account settings.',
          "Ensure you're checking the correct email address.",
          'Try adding noreply@judgefinder.io to your contacts.',
          'Contact support if issues persist after 24 hours.',
        ],
      },
    ],
  },
  {
    id: 'search-issues',
    icon: Search,
    title: 'Search Not Working',
    problems: [
      {
        symptom: 'No results when searching for a judge',
        solution: [
          'Try searching with just the last name first.',
          'Remove titles like "Judge" or "Honorable" from your search.',
          'Check spelling - our search is intelligent but requires close matches.',
          'Try searching by court name or jurisdiction instead.',
          'Some judges may be retired or not yet in our database.',
        ],
      },
      {
        symptom: 'Search is slow or timing out',
        solution: [
          'Check your internet connection speed.',
          'Try clearing your browser cache and cookies.',
          'Disable browser extensions that might interfere.',
          'Try a different browser or incognito/private mode.',
          'If issue persists, our servers may be under heavy load - try again in a few minutes.',
        ],
      },
    ],
  },
  {
    id: 'missing-data',
    icon: Database,
    title: 'Missing Judge Data',
    problems: [
      {
        symptom: 'Judge profile is incomplete or missing information',
        solution: [
          'We continuously update our database but some judges may have limited public information.',
          'Recently appointed judges may not have enough case history for analytics.',
          'You can report missing information using the "Report Issue" button on any profile.',
          'Federal judges are still being added to our database.',
          'Some data may be temporarily unavailable during maintenance periods.',
        ],
      },
      {
        symptom: 'Analytics not showing for a judge',
        solution: [
          'Judges need at least 500 recorded cases for analytics to be generated.',
          'Recently appointed judges may not have sufficient data yet.',
          'Some practice areas may have limited case data.',
          'Analytics are regenerated monthly, so recent decisions may not be reflected yet.',
        ],
      },
    ],
  },
  {
    id: 'billing',
    icon: CreditCard,
    title: 'Billing Questions',
    problems: [
      {
        symptom: 'Payment declined or failed',
        solution: [
          'Verify your card details are entered correctly.',
          "Check that your card has sufficient funds and isn't expired.",
          'Some banks flag subscription payments - contact your bank.',
          'Try a different payment method (we accept major credit cards).',
          'Contact billing@judgefinder.io for assistance.',
        ],
      },
      {
        symptom: 'Cannot cancel subscription',
        solution: [
          'Go to Account Settings > Subscription.',
          'Click "Cancel Subscription" at the bottom of the page.',
          'Follow the confirmation prompts.',
          "You'll retain access until the end of your billing period.",
          'Contact support if you need immediate cancellation.',
        ],
      },
      {
        symptom: "Didn't receive receipt or invoice",
        solution: [
          'Check your spam folder for emails from billing@judgefinder.io.',
          'View all receipts in Account Settings > Billing History.',
          'Download invoices directly from your billing portal.',
          'Contact billing@judgefinder.io to request past receipts.',
        ],
      },
    ],
  },
  {
    id: 'email-notifications',
    icon: Mail,
    title: 'Email Notification Issues',
    problems: [
      {
        symptom: 'Not receiving email notifications',
        solution: [
          'Check your spam/junk folder and mark JudgeFinder emails as "Not Spam".',
          'Verify notification settings in Account Settings > Notifications.',
          'Add noreply@judgefinder.io and alerts@judgefinder.io to your contacts.',
          'Check if your email provider has blocked our domain.',
          'Try updating your email address in account settings.',
        ],
      },
      {
        symptom: 'Receiving too many notifications',
        solution: [
          'Adjust notification frequency in Account Settings > Notifications.',
          'Choose "Weekly Digest" instead of immediate alerts.',
          'Unsubscribe from specific alert types while keeping others.',
          "Remove bookmarks for judges you're no longer tracking.",
        ],
      },
    ],
  },
]

const commonErrors = [
  {
    code: '404 - Page Not Found',
    meaning: "The judge profile or page you're looking for doesn't exist.",
    fix: 'Check the URL for typos. The judge may have been removed or merged with another profile.',
  },
  {
    code: '500 - Server Error',
    meaning: 'Our servers encountered an unexpected error.',
    fix: 'Refresh the page. If it persists, try again in a few minutes or contact support.',
  },
  {
    code: 'Rate Limit Exceeded',
    meaning: "You've made too many requests in a short time.",
    fix: 'Wait a few minutes before making more searches. Premium users have higher rate limits.',
  },
]

export default function TroubleshootingPage(): JSX.Element {
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
          <h1 className="text-4xl font-bold text-foreground mb-4">Troubleshooting</h1>
          <p className="text-xl text-muted-foreground">
            Solutions to common issues and technical problems
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Issues */}
        <div className="space-y-12 mb-16">
          {issues.map((issue) => {
            const Icon = issue.icon
            return (
              <div key={issue.id} id={issue.id} className="scroll-mt-24">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Icon className="h-6 w-6 text-orange-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{issue.title}</h2>
                </div>
                <div className="ml-16 space-y-6">
                  {issue.problems.map((problem, index) => (
                    <div key={index} className="p-6 rounded-lg border border-border bg-card">
                      <h3 className="font-semibold text-foreground mb-3 flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        {problem.symptom}
                      </h3>
                      <div className="ml-7 space-y-2">
                        {problem.solution.map((step, stepIndex) => (
                          <div key={stepIndex} className="flex items-start gap-2">
                            <span className="text-primary font-medium">{stepIndex + 1}.</span>
                            <p className="text-muted-foreground">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Common Error Codes */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-foreground mb-6">Common Error Codes</h2>
          <div className="space-y-4">
            {commonErrors.map((error, index) => (
              <div key={index} className="p-6 rounded-lg border border-border bg-card">
                <div className="flex items-start gap-3 mb-2">
                  <code className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-sm font-mono">
                    {error.code}
                  </code>
                  <h3 className="font-semibold text-foreground">{error.meaning}</h3>
                </div>
                <p className="text-muted-foreground ml-0">{error.fix}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="p-6 rounded-lg bg-primary/10 border border-primary/20">
          <h3 className="text-xl font-semibold text-foreground mb-3">Still need help?</h3>
          <p className="text-muted-foreground mb-4">
            Our support team is here to assist you with any issues not covered in this guide.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="mailto:support@judgefinder.io"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Email Support
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-6 py-3 border border-border bg-card text-foreground rounded-md hover:bg-muted transition-colors font-medium"
            >
              Contact Form
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Premium subscribers: Call (555) 123-4567 for priority phone support
          </p>
        </div>
      </div>
    </div>
  )
}
