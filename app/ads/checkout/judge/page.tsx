'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Shield, Check, CreditCard, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function JudgeCheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const judgeId = searchParams.get('id')
  const judgeName = searchParams.get('name')
  const courtName = searchParams.get('court')
  const courtLevel = searchParams.get('level') as 'federal' | 'state' | null
  const position = searchParams.get('position') || '1'

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Calculate pricing
  const pricing = {
    federal: { monthly: 500, annual: 5000 },
    state: { monthly: 200, annual: 2000 },
  }

  const monthlyPrice = courtLevel === 'federal' ? pricing.federal.monthly : pricing.state.monthly
  const annualPrice = courtLevel === 'federal' ? pricing.federal.annual : pricing.state.annual
  const savings = monthlyPrice * 12 - annualPrice

  useEffect(() => {
    if (!judgeId || !judgeName || !courtLevel) {
      setError('Missing required parameters. Please try again from the judge profile page.')
    }
  }, [judgeId, judgeName, courtLevel])

  async function handleCheckout() {
    if (!user?.primaryEmailAddress?.emailAddress) {
      setError('Please sign in to continue')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/checkout/adspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: user.firstName || 'Law Firm',
          email: user.primaryEmailAddress.emailAddress,
          ad_type: 'judge-profile',
          billing_cycle: billingCycle,
          judge_id: judgeId,
          judge_name: judgeName,
          court_name: courtName,
          court_level: courtLevel,
          ad_position: parseInt(position),
          notes: `Booking for Judge ${judgeName} - Rotation Slot ${position}`,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create checkout session')
      }

      const data = await response.json()

      // Redirect to Stripe Checkout
      if (data.session_url) {
        window.location.href = data.session_url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (error && (!judgeId || !judgeName || !courtLevel)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-red-900">Invalid Checkout Link</h2>
                <p className="mt-2 text-sm text-red-700">{error}</p>
                <Link
                  href="/judges"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Judges Directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface-elevated to-background">
      <div className="mx-auto max-w-4xl px-4 py-8 md:py-16">
        {/* Back Link */}
        <Link
          href={`/judges/${judgeName?.toLowerCase().replace(/\s+/g, '-')}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Judge Profile
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Judge Info & Benefits */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Book Ad Spot for Judge {judgeName}
              </h1>
              <p className="text-muted-foreground">
                {courtName} • {courtLevel === 'federal' ? 'Federal' : 'State'} Court
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">What You Get</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Premium Placement</p>
                    <p className="text-sm text-muted-foreground">
                      Featured rotation slot #{position} on Judge {judgeName}'s profile page
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">High-Intent Audience</p>
                    <p className="text-sm text-muted-foreground">
                      Reach attorneys and litigants actively researching this specific judge
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Bar Verification Badge</p>
                    <p className="text-sm text-muted-foreground">
                      Display your verified California bar status and credentials
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Flexible Management</p>
                    <p className="text-sm text-muted-foreground">
                      Update your profile, pause, or cancel anytime from your dashboard
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-surface-elevated p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <p>
                  <span className="font-semibold">Verified Attorneys Only</span> - All advertisers
                  are verified California bar members
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Pricing & Checkout */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Select Billing</h2>

              {/* Billing Cycle Toggle */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    billingCycle === 'monthly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface-elevated hover:border-primary/50'
                  }`}
                >
                  <p className="font-semibold text-foreground">Monthly</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ${monthlyPrice}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Billed monthly</p>
                </button>

                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`rounded-lg border-2 p-4 text-left transition-all relative ${
                    billingCycle === 'annual'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface-elevated hover:border-primary/50'
                  }`}
                >
                  <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    Save ${savings}
                  </div>
                  <p className="font-semibold text-foreground">Annual</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ${annualPrice}
                    <span className="text-sm font-normal text-muted-foreground">/yr</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${Math.round(annualPrice / 12)}/mo · 2 months free
                  </p>
                </button>
              </div>

              {/* Summary */}
              <div className="border-t border-border pt-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Ad Spot</span>
                  <span className="text-sm font-medium text-foreground">Rotation #{position}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Billing Cycle</span>
                  <span className="text-sm font-medium text-foreground capitalize">
                    {billingCycle}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-foreground">
                    ${billingCycle === 'annual' ? annualPrice : monthlyPrice}
                    <span className="text-sm font-normal text-muted-foreground">
                      {billingCycle === 'annual' ? '/year' : '/month'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-primary text-white rounded-lg py-3 px-4 font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Continue to Secure Checkout
                  </>
                )}
              </button>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secured by Stripe • PCI-DSS Compliant</span>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-surface-elevated p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Money-Back Guarantee</p>
              <p>
                Cancel anytime within the first 30 days for a full refund. After that, cancel
                anytime from your dashboard—no long-term commitment required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JudgeCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading checkout...</div>
        </div>
      }
    >
      <JudgeCheckoutContent />
    </Suspense>
  )
}
