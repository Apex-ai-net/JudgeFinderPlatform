'use client'

import { AlertTriangle, CreditCard, Calendar, Bell } from 'lucide-react'

interface PaymentMethod {
  id: string
  brand: string
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  isExpiringSoon: boolean
}

interface Subscription {
  id: string
  status: string
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  items: Array<{
    productName: string
    amount: number
    interval: string | null
  }>
}

interface BillingAlert {
  id: string
  type: 'warning' | 'info' | 'error'
  icon: React.ComponentType<{ className?: string }>
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

interface BillingAlertsWidgetProps {
  subscriptions: Subscription[]
  paymentMethods: PaymentMethod[]
}

export default function BillingAlertsWidget({
  subscriptions,
  paymentMethods,
}: BillingAlertsWidgetProps) {
  const alerts: BillingAlert[] = []

  // Check for upcoming renewals (within 7 days)
  subscriptions.forEach((subscription) => {
    if (subscription.status === 'active' && !subscription.cancelAtPeriodEnd) {
      const daysUntilRenewal = Math.ceil(
        (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )

      if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
        alerts.push({
          id: `renewal-${subscription.id}`,
          type: 'info',
          icon: Calendar,
          message: `Your ${subscription.items[0]?.productName || 'subscription'} renews in ${daysUntilRenewal} ${daysUntilRenewal === 1 ? 'day' : 'days'} for $${subscription.items[0]?.amount.toFixed(2)}`,
        })
      }
    }
  })

  // Check for expiring payment methods (within 3 months)
  const expiringCards = paymentMethods.filter((pm) => pm.isExpiringSoon)
  if (expiringCards.length > 0) {
    const cardList = expiringCards.map((card) => `${card.brand} •••• ${card.last4}`).join(', ')

    alerts.push({
      id: 'expiring-cards',
      type: 'warning',
      icon: CreditCard,
      message: `${expiringCards.length} payment ${expiringCards.length === 1 ? 'method' : 'methods'} expiring soon: ${cardList}`,
      action: {
        label: 'Update Card',
        onClick: async () => {
          // Redirect to Stripe Customer Portal
          const response = await fetch('/api/billing/customer-portal', { method: 'POST' })
          const { url } = await response.json()
          window.location.href = url
        },
      },
    })
  }

  // Check for past_due subscriptions
  const pastDueSubscriptions = subscriptions.filter((s) => s.status === 'past_due')
  if (pastDueSubscriptions.length > 0) {
    alerts.push({
      id: 'past-due',
      type: 'error',
      icon: AlertTriangle,
      message: `Payment failed for ${pastDueSubscriptions[0].items[0]?.productName || 'subscription'}. Please update your payment method to avoid service interruption.`,
      action: {
        label: 'Update Payment Method',
        onClick: async () => {
          const response = await fetch('/api/billing/customer-portal', { method: 'POST' })
          const { url } = await response.json()
          window.location.href = url
        },
      },
    })
  }

  // Check for subscriptions set to cancel
  const cancelingSubscriptions = subscriptions.filter((s) => s.cancelAtPeriodEnd)
  if (cancelingSubscriptions.length > 0) {
    cancelingSubscriptions.forEach((subscription) => {
      alerts.push({
        id: `canceling-${subscription.id}`,
        type: 'warning',
        icon: Bell,
        message: `Your ${subscription.items[0]?.productName || 'subscription'} will cancel on ${subscription.currentPeriodEnd.toLocaleDateString()}`,
      })
    })
  }

  if (alerts.length === 0) {
    return null
  }

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const Icon = alert.icon
        return (
          <div
            key={alert.id}
            role="alert"
            className={`rounded-lg border p-4 ${getAlertStyles(alert.type)}`}
          >
            <div className="flex items-start gap-3">
              <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.message}</p>
                {alert.action && (
                  <button
                    onClick={alert.action.onClick}
                    className="mt-2 text-sm font-semibold underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded"
                  >
                    {alert.action.label} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
