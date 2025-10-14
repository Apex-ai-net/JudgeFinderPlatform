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
          <h2 className="text-lg font-semibold text-foreground mb-4">Ad Placement Options</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-foreground">Judge Profile Ads</p>
                <p className="text-xs">Featured banner on specific judge profiles</p>
              </div>
              <span className="font-semibold text-foreground">Starting at $299/mo</span>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-foreground">Court Listing Ads</p>
                <p className="text-xs">Sponsored listings on court directory pages</p>
              </div>
              <span className="font-semibold text-foreground">Starting at $199/mo</span>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-foreground">Featured Spot</p>
                <p className="text-xs">Homepage featured placement</p>
              </div>
              <span className="font-semibold text-foreground">Starting at $499/mo</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            * Pricing shown is for standard monthly placements. Custom packages available. Contact
            us for volume discounts.
          </p>
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
