'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'

export default function ManageBillingButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleManageBilling = async () => {
    try {
      setIsLoading(true)

      const response = await fetch('/api/billing/customer-portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url
    } catch (error) {
      console.error('Error opening billing portal:', error)
      alert(
        error instanceof Error ? error.message : 'Failed to open billing portal. Please try again.'
      )
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleManageBilling}
      disabled={isLoading}
      className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Opening...
        </>
      ) : (
        <>
          <CreditCard className="h-5 w-5" />
          Manage Subscriptions & Payment Methods
        </>
      )}
    </button>
  )
}
