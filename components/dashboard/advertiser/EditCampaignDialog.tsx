'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/utils/logger'

interface Campaign {
  id: string
  name: string
  status: string
  budget: number
  notes?: string
}

interface EditCampaignDialogProps {
  campaign: Campaign
  onClose: () => void
  onSuccess: () => void
}

export function EditCampaignDialog({
  campaign,
  onClose,
  onSuccess,
}: EditCampaignDialogProps) {
  const [formData, setFormData] = useState({
    name: campaign.name,
    budget: campaign.budget,
    notes: campaign.notes || '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const response = await fetch(`/api/advertising/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update campaign')
      }

      logger.info('Campaign updated successfully', { campaignId: campaign.id })
      onSuccess()
    } catch (err) {
      logger.error('Failed to update campaign', { campaignId: campaign.id, error: err })
      setError(err instanceof Error ? err.message : 'Failed to update campaign')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Edit Campaign
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
              htmlFor="edit-campaign-name"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Campaign Name
            </label>
            <Input
              id="edit-campaign-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div>
            <label
              htmlFor="edit-campaign-budget"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Monthly Budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="edit-campaign-budget"
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
          </div>

          <div>
            <label
              htmlFor="edit-campaign-notes"
              className="block text-sm font-medium text-foreground/80 mb-2"
            >
              Notes
            </label>
            <textarea
              id="edit-campaign-notes"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              disabled={submitting}
            />
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
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
