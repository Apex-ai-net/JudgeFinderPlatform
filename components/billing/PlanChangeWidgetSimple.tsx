'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface Plan {
  id: string
  name: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  isUpgrade: boolean
}

interface ProrationPreview {
  immediateCharge: number
  creditApplied: number
  nextInvoiceAmount: number
  description: string
  billingCycleAnchor: Date
}

interface PlanChangeWidgetProps {
  currentSubscription: {
    id: string
    priceId: string
    planName: string
    amount: number
    interval: string
  }
}

export default function PlanChangeWidget({ currentSubscription }: PlanChangeWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [preview, setPreview] = useState<ProrationPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleExpand = async () => {
    if (!isExpanded && availablePlans.length === 0) {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/billing/subscription/available-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPriceId: currentSubscription.priceId }),
        })

        if (!response.ok) {
          throw new Error('Failed to load available plans')
        }

        const data = await response.json()
        setAvailablePlans(data.plans || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans')
      } finally {
        setLoading(false)
      }
    }

    setIsExpanded(!isExpanded)
  }

  const handlePreviewChange = async (plan: Plan) => {
    setSelectedPlan(plan)
    setLoadingPreview(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/subscription/preview-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: currentSubscription.id,
          newPriceId: plan.id,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to preview plan change')
      }

      const data = await response.json()
      setPreview(data.preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview change')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleConfirmChange = async () => {
    if (!selectedPlan) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/subscription/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: currentSubscription.id,
          newPriceId: selectedPlan.id,
          prorationBehavior: 'create_prorations',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update subscription')
      }

      // Success - refresh page
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleExpand}
        variant="outline"
        size="sm"
        className="w-full flex items-center justify-between"
      >
        <span>Change Plan</span>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {isExpanded && (
        <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-border">
          {error && (
            <div className="bg-destructive/10 text-destructive px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Loading available plans...
            </p>
          ) : (
            <>
              {availablePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No other plans available
                </p>
              ) : (
                <div className="space-y-2">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePreviewChange(plan)}
                      disabled={loadingPreview}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        selectedPlan?.id === plan.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{plan.name}</p>
                          <p className="text-xs text-muted-foreground">
                            ${plan.amount.toFixed(2)}/{plan.interval}
                          </p>
                        </div>
                        {plan.isUpgrade ? (
                          <span className="px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded text-xs font-medium">
                            Upgrade
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded text-xs font-medium">
                            Downgrade
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {loadingPreview && (
                <div className="bg-card rounded-lg p-3 text-center text-sm text-muted-foreground">
                  Calculating proration...
                </div>
              )}

              {preview && selectedPlan && (
                <div className="bg-card rounded-lg p-4 space-y-3 border border-border">
                  <h4 className="font-semibold text-sm">Proration Summary</h4>
                  <p className="text-sm text-muted-foreground">{preview.description}</p>

                  <div className="space-y-2 pt-2 border-t border-border text-sm">
                    {preview.immediateCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Charge Today:</span>
                        <span className="font-semibold">${preview.immediateCharge.toFixed(2)}</span>
                      </div>
                    )}

                    {preview.creditApplied > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credit Applied:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          -${preview.creditApplied.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Invoice:</span>
                      <span className="font-semibold">${preview.nextInvoiceAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Billing Date:</span>
                      <span className="font-medium">
                        {new Date(preview.billingCycleAnchor).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPlan(null)
                        setPreview(null)
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmChange}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Updating...' : 'Confirm Change'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
