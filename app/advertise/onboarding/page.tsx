'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSafeUser } from '@/lib/auth/safe-clerk-components'
import { Shield, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

export default function AdvertiserOnboardingPage(): JSX.Element {
  const router = useRouter()
  const { isSignedIn, isLoaded } = useSafeUser()
  const [barNumber, setBarNumber] = useState('')
  const [barState, setBarState] = useState('CA')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if not signed in
  if (isLoaded && !isSignedIn) {
    router.push('/sign-in?redirect_url=/advertise/onboarding')
    return <div>Redirecting to sign in...</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/advertising/verify-bar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barNumber,
          barState,
          turnstileToken,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      setSuccess(true)

      // Redirect to advertiser dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/advertiser')
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Verification Successful!</h2>
          <p className="text-muted-foreground">
            Your bar number has been verified. Redirecting to advertiser dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/10 text-primary text-sm font-medium mb-4">
            <Shield className="w-4 h-4" />
            Legal Professional Verification
          </div>
          <h1 className="text-3xl font-bold mb-2">Complete Your Advertiser Profile</h1>
          <p className="text-muted-foreground">
            Verify your bar number to access advertising features on JudgeFinder
          </p>
        </div>

        {/* Verification Form */}
        <div className="bg-card rounded-2xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">Verification Failed</p>
                  <p className="text-sm text-red-500/80">{error}</p>
                </div>
              </div>
            )}

            {/* Bar State Selection */}
            <div>
              <label htmlFor="barState" className="block text-sm font-medium mb-2">
                State Bar
              </label>
              <select
                id="barState"
                value={barState}
                onChange={(e) => setBarState(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isSubmitting}
              >
                <option value="CA">California</option>
                <option value="NY">New York</option>
                <option value="TX">Texas</option>
                <option value="FL">Florida</option>
                <option value="IL">Illinois</option>
                {/* Add more states as needed */}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Select the state where you're licensed to practice law
              </p>
            </div>

            {/* Bar Number Input */}
            <div>
              <label htmlFor="barNumber" className="block text-sm font-medium mb-2">
                Bar Number
              </label>
              <input
                type="text"
                id="barNumber"
                value={barNumber}
                onChange={(e) => setBarNumber(e.target.value)}
                placeholder="e.g., 123456"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your state bar registration number
              </p>
            </div>

            {/* Turnstile CAPTCHA */}
            <div>
              <label className="block text-sm font-medium mb-2">Verification</label>
              <TurnstileWidget
                onVerify={setTurnstileToken}
                onError={() => setError('CAPTCHA verification failed. Please try again.')}
                onExpire={() => setTurnstileToken(null)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!barNumber || !turnstileToken || isSubmitting}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Verify Bar Number
                </>
              )}
            </button>
          </form>

          {/* Info Section */}
          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="font-semibold mb-3">Why do we verify bar numbers?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Ensures ethical compliance with legal advertising standards</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Protects users from unauthorized or misleading advertisers</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Maintains platform integrity and trust</span>
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-4">
              Your bar number will be securely stored and verified against official state bar
              records. This information is kept confidential and used only for verification purposes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
