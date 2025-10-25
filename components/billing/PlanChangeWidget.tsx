'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

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
  proratedAmount: number
  newPlanAmount: number
  billingCycleAnchor: Date
  description: string
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
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [preview, setPreview] = useState<ProrationPreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load available plans when dialog opens
  const handleOpenDialog = async () => {
    setIsOpen(true)
    setLoading(true)
    setError(null)

    try {
      // Fetch available plans from API
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

  // Preview plan change
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

  // Confirm plan change
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

      // Success - close dialog and refresh page
      setIsOpen(false)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button onClick={handleOpenDialog} variant="outline" className="w-full sm:w-auto">
        Change Plan
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Your Plan</DialogTitle>
            <DialogDescription>
              Current Plan: {currentSubscription.planName} - ${currentSubscription.amount}/
              {currentSubscription.interval}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading available plans...</div>
          ) : (
            <div className="space-y-4">
              {/* Available Plans */}
              <div className="space-y-3">
                {availablePlans.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No other plans available at this time.
                  </p>
                ) : (
                  availablePlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handlePreviewChange(plan)}
                      disabled={loadingPreview}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        selectedPlan?.id === plan.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-base">{plan.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            ${plan.amount.toFixed(2)}/{plan.interval}
                          </p>
                        </div>
                        <div className="text-right">
                          {plan.isUpgrade ? (
                            <span className="px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                              Upgrade
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                              Downgrade
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Proration Preview */}
              {loadingPreview && (
                <div className="bg-muted rounded-lg p-4 text-center text-muted-foreground">
                  Calculating proration...
                </div>
              )}

              {preview && selectedPlan && (
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">Proration Summary</h4>
                  <p className="text-sm text-muted-foreground">{preview.description}</p>

                  <div className="space-y-2 pt-2 border-t border-border">
                    {preview.immediateCharge > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Charge Today:</span>
                        <span className="font-semibold text-foreground">
                          ${preview.immediateCharge.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {preview.creditApplied > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Credit Applied:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          -${preview.creditApplied.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Next Invoice Amount:</span>
                      <span className="font-semibold text-foreground">
                        ${preview.nextInvoiceAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Next Billing Date:</span>
                      <span className="font-medium text-foreground">
                        {new Date(preview.billingCycleAnchor).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmChange}
              disabled={!selectedPlan || loading || loadingPreview}
            >
              {loading ? 'Updating...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
