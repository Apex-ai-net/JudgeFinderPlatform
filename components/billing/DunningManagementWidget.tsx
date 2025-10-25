'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface FailedPayment {
  invoiceId: string
  invoiceNumber: string | null
  amount: number
  currency: string
  attemptCount: number
  nextAttempt: Date | null
  created: Date
  dueDate: Date | null
  lastError: string | null
  status: string
}

interface DunningStatus {
  hasFailedPayments: boolean
  failedPayments: FailedPayment[]
  totalOutstanding: number
  nextRetryDate: Date | null
  subscriptionAtRisk: boolean
}

export default function DunningManagementWidget() {
  const [loading, setLoading] = useState(true)
  const [retrying, setRetrying] = useState<string | null>(null)
  const [dunningStatus, setDunningStatus] = useState<DunningStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDunningStatus()
  }, [])

  const loadDunningStatus = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/dunning/status')

      if (!response.ok) {
        throw new Error('Failed to load dunning status')
      }

      const data = await response.json()
      setDunningStatus(data.dunningStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment status')
    } finally {
      setLoading(false)
    }
  }

  const handleRetryPayment = async (invoiceId: string) => {
    setRetrying(invoiceId)
    setError(null)

    try {
      const response = await fetch('/api/billing/dunning/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to retry payment')
      }

      // Reload dunning status
      await loadDunningStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry payment')
    } finally {
      setRetrying(null)
    }
  }

  const handleUpdatePaymentMethod = () => {
    // Redirect to Stripe Customer Portal to update payment method
    window.location.href = '/api/billing/customer-portal'
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <p className="text-muted-foreground text-center">Loading payment status...</p>
      </div>
    )
  }

  if (!dunningStatus?.hasFailedPayments) {
    return null // Don't show widget if no failed payments
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-destructive p-6 space-y-4">
      <Alert variant="destructive">
        <AlertTitle className="text-lg font-semibold">Payment Action Required</AlertTitle>
        <AlertDescription>
          {dunningStatus.failedPayments.length === 1
            ? 'You have 1 failed payment.'
            : `You have ${dunningStatus.failedPayments.length} failed payments.`}{' '}
          Your subscription may be at risk of cancellation.
        </AlertDescription>
      </Alert>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="font-semibold text-base">Failed Payments</h3>
          <p className="text-sm text-muted-foreground">
            Total Outstanding:{' '}
            <span className="font-semibold text-destructive">
              ${dunningStatus.totalOutstanding.toFixed(2)}
            </span>
          </p>
        </div>

        {dunningStatus.failedPayments.map((payment) => (
          <div
            key={payment.invoiceId}
            className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-sm">
                  Invoice #{payment.invoiceNumber || payment.invoiceId.substring(3, 15)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created {new Date(payment.created).toLocaleDateString()}
                </p>
              </div>
              <p className="font-semibold text-destructive">
                ${payment.amount.toFixed(2)} {payment.currency}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Payment Attempts:</span>
                <span className="font-medium">{payment.attemptCount}</span>
              </div>

              {payment.nextAttempt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Next Auto-Retry:</span>
                  <span className="font-medium">
                    {new Date(payment.nextAttempt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {payment.lastError && (
                <div className="mt-2 p-2 bg-destructive/5 rounded text-xs text-destructive">
                  <span className="font-medium">Error:</span> {payment.lastError}
                </div>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRetryPayment(payment.invoiceId)}
              disabled={retrying === payment.invoiceId}
              className="w-full"
            >
              {retrying === payment.invoiceId ? 'Retrying...' : 'Retry Payment Now'}
            </Button>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border space-y-3">
        <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium mb-1">How to resolve failed payments:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Update your payment method if the current one is expired or invalid</li>
            <li>Ensure sufficient funds are available on your payment method</li>
            <li>Contact your bank if the payment is being declined</li>
            {dunningStatus.nextRetryDate && (
              <li>
                Stripe will automatically retry on{' '}
                {new Date(dunningStatus.nextRetryDate).toLocaleDateString()}
              </li>
            )}
          </ul>
        </div>

        <Button onClick={handleUpdatePaymentMethod} className="w-full" size="lg">
          Update Payment Method
        </Button>
      </div>
    </div>
  )
}
