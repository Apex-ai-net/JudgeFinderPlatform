import { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, Mail, Calendar } from 'lucide-react'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Purchase Complete | JudgeFinder',
  description: 'Your ad space purchase has been completed successfully.',
  alternates: {
    canonical: `${BASE_URL}/ads/success`,
  },
  robots: {
    index: false, // Don't index success pages
    follow: false,
  },
}

export default async function AdPurchaseSuccessPage({
  searchParams,
}: {
  searchParams?: Promise<{ session_id?: string }>
}) {
  const params = searchParams ? await searchParams : undefined
  const sessionId = params?.session_id

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Payment Successful!
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Thank you for your purchase. Your ad space order has been confirmed.
          </p>
        </div>

        {/* Order Details */}
        <div className="bg-card rounded-lg shadow-lg p-6 sm:p-8 space-y-6">
          {sessionId && (
            <div className="text-sm text-muted-foreground border-b border-border pb-4">
              <p className="font-mono">Order ID: {sessionId.substring(0, 24)}...</p>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">What happens next?</h2>

            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Email Confirmation</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You'll receive a receipt and order details at the email address you provided
                    within the next few minutes.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    Setup & Activation (1-2 business days)
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Our team will review your order and contact you to finalize ad creative,
                    targeting, and placement details. Your ad will go live once setup is complete.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Campaign Launch</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your ad will begin appearing in the selected placements. You'll receive monthly
                    performance reports including impressions, clicks, and engagement metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-foreground mb-2">Need help?</h3>
            <p className="text-sm text-muted-foreground">
              If you have any questions about your order, contact us at{' '}
              <a href="mailto:advertising@judgefinder.io" className="text-primary hover:underline">
                advertising@judgefinder.io
              </a>{' '}
              or reply to your confirmation email.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return to Homepage
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/judges"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-border bg-background text-foreground font-semibold rounded-lg hover:bg-accent transition-colors"
          >
            Browse Judges
          </Link>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive a confirmation email? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
