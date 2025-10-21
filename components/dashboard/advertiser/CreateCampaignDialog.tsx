'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/utils/logger'

interface CreateCampaignDialogProps {
  onClose: () => void
  onSuccess: () => void
  advertiserProfile: {
    organization_name: string
    contact_email: string
  }
}

export function CreateCampaignDialog({
  onClose,
  onSuccess,
  advertiserProfile,
}: CreateCampaignDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    budget: 500,
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch('/api/advertising/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create campaign')
      }

      logger.info('Campaign created successfully')
      onSuccess()
    } catch (err) {
      logger.error('Failed to create campaign', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Create New Campaign
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="campaign-name"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Campaign Name *
            </label>
            <Input
              id="campaign-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., San Francisco Civil Litigation - Judge Smith"
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground/70">
              Choose a descriptive name to help you identify this campaign
            </p>
          </div>

          <div>
            <label
              htmlFor="campaign-budget"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Monthly Budget *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="campaign-budget"
                type="number"
                required
                min={500}
                step={100}
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                className="pl-7"
                disabled={submitting}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Minimum $500/month per judge placement
            </p>
          </div>

          <div>
            <label
              htmlFor="campaign-notes"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Notes (Optional)
            </label>
            <textarea
              id="campaign-notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes about this campaign..."
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground/50"
              disabled={submitting}
            />
          </div>

          <div className="bg-primary/10 border border-primary/30 rounded-md p-4">
            <h3 className="text-sm font-medium text-primary mb-2">
              Next Steps
            </h3>
            <ul className="text-xs text-primary/90 space-y-1 list-disc list-inside">
              <li>Choose which judge profiles to advertise on</li>
              <li>Upload your ad creative (logo, tagline, website link)</li>
              <li>Complete payment setup via Stripe</li>
              <li>Campaign goes live after verification (1-2 business days)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
