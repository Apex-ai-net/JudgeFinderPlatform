'use client'

import Link from 'next/link'
import { Megaphone, TrendingUp, ChevronRight } from 'lucide-react'

interface AdvertisingCTAProps {
  judgeName?: string
  courtLevel?: 'federal' | 'state'
  variant?: 'inline' | 'card'
}

export default function AdvertisingCTA({
  judgeName,
  courtLevel = 'state',
  variant = 'card',
}: AdvertisingCTAProps): JSX.Element {
  const price = courtLevel === 'federal' ? 500 : 200

  if (variant === 'inline') {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground text-sm mb-1">
                Advertise on this profile
              </h3>
              <p className="text-xs text-muted-foreground">
                Reach attorneys researching {judgeName || 'this judge'}. Starting at ${price}/month.
              </p>
            </div>
          </div>
          <Link
            href="/advertise"
            className="inline-flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Learn More
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Megaphone className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground mb-2">Advertise on this Profile</h3>
          <p className="text-muted-foreground text-sm">
            Promote your legal practice to attorneys and litigants researching{' '}
            {judgeName || 'this judge'}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-foreground">
            High-intent traffic from attorneys preparing cases
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-foreground">Bar-verified placement with credibility badge</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-foreground">
            Detailed analytics: impressions, clicks, conversions
          </span>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">${price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          or save 2 months with annual billing
        </p>
      </div>

      <Link
        href="/advertise"
        className="block w-full text-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold"
      >
        View Advertising Options
      </Link>
    </div>
  )
}
