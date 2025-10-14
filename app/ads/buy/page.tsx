import { Metadata } from 'next'
import { PurchaseAdForm } from './PurchaseAdForm'
import { getBaseUrl } from '@/lib/utils/baseUrl'

const BASE_URL = getBaseUrl()

export const metadata: Metadata = {
  title: 'Purchase Ad Space | JudgeFinder',
  description:
    'Advertise your legal services to California attorneys and litigants. Premium ad placements on judge profiles and court listings.',
  alternates: {
    canonical: `${BASE_URL}/ads/buy`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function PurchaseAdSpacePage({
  searchParams,
}: {
  searchParams?: Promise<{ canceled?: string }>
}) {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Purchase Ad Space
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Reach California legal professionals with targeted advertising on JudgeFinder.io
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-lg p-6 sm:p-8">
          <PurchaseAdForm searchParams={searchParams} />
        </div>

        {/* Pricing Information */}
        <div className="mt-8 bg-muted/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Universal Access Pricing</h2>
          <div className="space-y-4">
            {/* Monthly Option */}
            <div className="bg-background rounded-lg p-4 border-2 border-border">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-semibold text-foreground text-lg">Monthly</p>
                  <p className="text-xs text-muted-foreground">Billed monthly • Cancel anytime</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">$500</p>
                  <p className="text-xs text-muted-foreground">/month</p>
                </div>
              </div>
            </div>

            {/* Annual Option - Highlighted */}
            <div className="bg-primary/5 rounded-lg p-4 border-2 border-primary relative">
              <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                Save $1,000
              </div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-semibold text-foreground text-lg">Annual</p>
                  <p className="text-xs text-muted-foreground">Billed annually • Best value</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-foreground">$5,000</p>
                  <p className="text-xs text-muted-foreground">/year</p>
                  <p className="text-xs text-primary font-medium">($417/mo • 2 months free)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium text-foreground mb-3">Universal access includes:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Unlimited placements on all California judge profiles</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Featured listings on all court directory pages</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Full analytics dashboard and performance metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 text-primary flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Priority support and account management</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Signals */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <svg
              className="h-5 w-5 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Secure payment powered by Stripe</span>
          </div>
        </div>
      </div>
    </div>
  )
}
