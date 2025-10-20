'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface PurchaseAdFormProps {
  searchParams?: Promise<{ canceled?: string }>
}

export function PurchaseAdForm({ searchParams }: PurchaseAdFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelMessage, setShowCancelMessage] = useState(false)

  // Check if user canceled payment
  if (searchParams) {
    searchParams.then((params) => {
      if (params.canceled && !showCancelMessage) {
        setShowCancelMessage(true)
      }
    })
  }

  const [formData, setFormData] = useState({
    organization_name: '',
    email: '',
    billing_cycle: 'monthly' as 'monthly' | 'annual',
    notes: '',
    promo_code: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Basic validation
      if (!formData.organization_name.trim()) {
        throw new Error('Organization name is required')
      }

      if (!formData.email.trim()) {
        throw new Error('Email is required')
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address')
      }

      // Call checkout API
      const response = await fetch('/api/checkout/adspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create checkout session')
      }

      const { session_url } = await response.json()

      if (!session_url) {
        throw new Error('No checkout URL received')
      }

      // Redirect to Stripe Checkout
      window.location.href = session_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Cancel Message */}
      {showCancelMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Payment Canceled
              </h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                Your payment was canceled. You can try again by completing the form below.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-4"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-destructive">Error</h3>
              <p className="mt-1 text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Organization Name */}
        <div>
          <label
            htmlFor="organization_name"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Organization Name *
          </label>
          <input
            type="text"
            id="organization_name"
            name="organization_name"
            required
            value={formData.organization_name}
            onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Your Law Firm or Company"
            disabled={isSubmitting}
          />
        </div>

        {/* Promo Code */}
        <div>
          <label htmlFor="promo_code" className="block text-sm font-medium text-foreground mb-2">
            Promo Code (Optional)
          </label>
          <input
            type="text"
            id="promo_code"
            name="promo_code"
            value={formData.promo_code}
            onChange={(e) => setFormData({ ...formData, promo_code: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter code (e.g., ONECENT)"
            disabled={isSubmitting}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-foreground">Promotion codes apply automatically when valid.</p>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            We'll send your receipt and ad details to this email
          </p>
        </div>

        {/* Billing Cycle */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">Billing Cycle *</label>
          <div className="space-y-3">
            {/* Monthly Option */}
            <label
              htmlFor="billing-monthly"
              className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                formData.billing_cycle === 'monthly'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/50'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="billing-monthly"
                  name="billing_cycle"
                  value="monthly"
                  checked={formData.billing_cycle === 'monthly'}
                  onChange={(e) => setFormData({ ...formData, billing_cycle: 'monthly' })}
                  className="h-4 w-4 text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <div>
                  <p className="font-semibold text-foreground">Monthly</p>
                  <p className="text-xs text-muted-foreground">Billed monthly • Cancel anytime</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">$500</p>
                <p className="text-xs text-muted-foreground">/month</p>
              </div>
            </label>

            {/* Annual Option */}
            <label
              htmlFor="billing-annual"
              className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all relative ${
                formData.billing_cycle === 'annual'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background hover:border-primary/50'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Savings Badge */}
              <div className="absolute -top-2 right-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                Save $1,000
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="billing-annual"
                  name="billing_cycle"
                  value="annual"
                  checked={formData.billing_cycle === 'annual'}
                  onChange={(e) => setFormData({ ...formData, billing_cycle: 'annual' })}
                  className="h-4 w-4 text-primary focus:ring-primary"
                  disabled={isSubmitting}
                />
                <div>
                  <p className="font-semibold text-foreground">Annual</p>
                  <p className="text-xs text-muted-foreground">Billed annually • Best value</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-foreground">$5,000</p>
                <p className="text-xs text-muted-foreground">/year</p>
                <p className="text-xs text-primary font-medium">($417/mo)</p>
              </div>
            </label>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder="Any specific requirements or questions? (e.g., target specific judges or courts)"
            disabled={isSubmitting}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-5 w-5" />
              <span>Proceed to Payment</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          You'll be redirected to Stripe's secure payment page
        </p>
      </form>
    </div>
  )
}
