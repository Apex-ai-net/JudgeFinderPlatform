'use client'

import { useEffect, useState } from 'react'
import ActiveSubscriptionsWidget from './ActiveSubscriptionsWidget'
import PaymentMethodsWidget from './PaymentMethodsWidget'
import BillingAlertsWidget from './BillingAlertsWidget'
import { Loader2 } from 'lucide-react'

interface BillingData {
  subscriptions: any[]
  paymentMethods: any[]
}

export default function BillingDataClient() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBillingData() {
      try {
        const response = await fetch('/api/billing/subscriptions')
        if (!response.ok) {
          throw new Error('Failed to fetch billing data')
        }
        const billingData = await response.json()
        setData(billingData)
      } catch (err) {
        console.error('Error fetching billing data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load billing data')
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Unable to load billing information</p>
      </div>
    )
  }

  if (!data || (data.subscriptions.length === 0 && data.paymentMethods.length === 0)) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Billing Alerts */}
      {(data.subscriptions.length > 0 || data.paymentMethods.length > 0) && (
        <BillingAlertsWidget
          subscriptions={data.subscriptions}
          paymentMethods={data.paymentMethods}
        />
      )}

      {/* Active Subscriptions */}
      {data.subscriptions.length > 0 && (
        <ActiveSubscriptionsWidget subscriptions={data.subscriptions} />
      )}

      {/* Payment Methods */}
      {data.paymentMethods.length > 0 && (
        <PaymentMethodsWidget paymentMethods={data.paymentMethods} />
      )}
    </div>
  )
}
