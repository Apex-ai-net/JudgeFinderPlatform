'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Credit {
  id: string
  amount: number
  currency: string
  description: string
  created: Date
  source: 'refund' | 'proration' | 'manual' | 'promotion'
}

interface Refund {
  id: string
  amount: number
  currency: string
  status: string
  reason: string | null
  created: Date
  chargeId: string
  receiptNumber: string | null
}

interface CreditsRefundsData {
  currentBalance: number
  currency: string
  credits: Credit[]
  refunds: Refund[]
  totalCreditsApplied: number
  totalRefunded: number
}

export default function CreditsRefundsWidget() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CreditsRefundsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'credits' | 'refunds'>('credits')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/billing/credits-refunds')

      if (!response.ok) {
        throw new Error('Failed to load credits and refunds')
      }

      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'refund':
        return 'destructive'
      case 'proration':
        return 'secondary'
      case 'promotion':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'succeeded':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <p className="text-muted-foreground text-center">Loading credits and refunds...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <p className="text-destructive text-center">{error}</p>
        <div className="flex justify-center mt-4">
          <Button onClick={loadData} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const hasCredits = data.credits.length > 0
  const hasRefunds = data.refunds.length > 0

  if (!hasCredits && !hasRefunds && data.currentBalance === 0) {
    return null // Don't show widget if no data
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Credits & Refunds</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Track your account balance, credits, and refunds
            </p>
          </div>
          {data.currentBalance > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${data.currentBalance.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-muted/30">
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase font-medium">Total Credits</p>
          <p className="text-2xl font-bold mt-1">${data.totalCreditsApplied.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.credits.length} transactions</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-xs text-muted-foreground uppercase font-medium">Total Refunded</p>
          <p className="text-2xl font-bold mt-1">${data.totalRefunded.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-1">{data.refunds.length} refunds</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          <button
            onClick={() => setActiveTab('credits')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'credits'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Credits ({data.credits.length})
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'refunds'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Refunds ({data.refunds.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'credits' ? (
          hasCredits ? (
            <div className="space-y-3">
              {data.credits.map((credit) => (
                <div
                  key={credit.id}
                  className="bg-muted/50 rounded-lg p-4 border border-border flex items-start justify-between"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{credit.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(credit.created).toLocaleDateString()}
                      </p>
                      <Badge
                        variant={getSourceBadgeVariant(credit.source) as any}
                        className="text-xs"
                      >
                        {credit.source}
                      </Badge>
                    </div>
                  </div>
                  <p className="font-semibold text-green-600 dark:text-green-400 ml-4">
                    +${credit.amount.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No credits on your account</p>
            </div>
          )
        ) : hasRefunds ? (
          <div className="space-y-3">
            {data.refunds.map((refund) => (
              <div key={refund.id} className="bg-muted/50 rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm font-mono">
                      {refund.receiptNumber || refund.id.substring(0, 12)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(refund.created).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-semibold">${refund.amount.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {refund.reason && (
                    <p className="text-xs text-muted-foreground capitalize">
                      {refund.reason.replace(/_/g, ' ')}
                    </p>
                  )}
                  <Badge variant={getStatusBadgeVariant(refund.status) as any} className="text-xs">
                    {refund.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No refunds processed</p>
          </div>
        )}
      </div>
    </div>
  )
}
