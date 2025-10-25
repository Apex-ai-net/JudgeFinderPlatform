'use client'

import { CreditCard, Calendar, AlertCircle } from 'lucide-react'
import PlanChangeWidget from './PlanChangeWidgetSimple'

interface SubscriptionItem {
  id: string
  productName: string
  productDescription: string | null
  amount: number
  currency: string
  interval: string | null
}

interface Subscription {
  id: string
  status: string
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  items: SubscriptionItem[]
  created: Date
  canceledAt: Date | null
}

interface ActiveSubscriptionsWidgetProps {
  subscriptions: Subscription[]
}

const statusColors = {
  active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  past_due: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  canceled: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
  trialing: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
}

export default function ActiveSubscriptionsWidget({
  subscriptions,
}: ActiveSubscriptionsWidgetProps) {
  if (subscriptions.length === 0) {
    return null
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Active Subscriptions
        </h3>
        <span className="text-sm text-muted-foreground">
          {subscriptions.filter((s) => s.status === 'active').length} active
        </span>
      </div>

      <div className="space-y-4">
        {subscriptions.map((subscription) => (
          <div
            key={subscription.id}
            className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {subscription.items[0]?.productName || 'Subscription'}
                </p>
                {subscription.items[0]?.productDescription && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {subscription.items[0].productDescription}
                  </p>
                )}
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  statusColors[subscription.status as keyof typeof statusColors] ||
                  'bg-gray-100 text-gray-700'
                }`}
              >
                {subscription.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-foreground font-semibold">
                  $
                  {subscription.items[0]?.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-muted-foreground font-normal">
                    / {subscription.items[0]?.interval}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">
                  {subscription.cancelAtPeriodEnd ? 'Cancels' : 'Renews'}{' '}
                  {subscription.currentPeriodEnd.toLocaleDateString()}
                </span>
              </div>
            </div>

            {subscription.cancelAtPeriodEnd && (
              <div className="mt-3 flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  This subscription will cancel on{' '}
                  {subscription.currentPeriodEnd.toLocaleDateString()}. You'll still have access
                  until then.
                </p>
              </div>
            )}

            {/* Plan Change Widget - only show for active subscriptions */}
            {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
              <div className="mt-3 pt-3 border-t border-border">
                <PlanChangeWidget
                  currentSubscription={{
                    id: subscription.id,
                    priceId: subscription.items[0]?.id || '',
                    planName: subscription.items[0]?.productName || 'Current Plan',
                    amount: subscription.items[0]?.amount || 0,
                    interval: subscription.items[0]?.interval || 'month',
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Manage your subscriptions, update payment methods, and view invoices using the button
          above.
        </p>
      </div>
    </div>
  )
}
