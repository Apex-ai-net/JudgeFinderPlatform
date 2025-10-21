'use client'

import { MoreVertical, PauseCircle, PlayCircle, Edit, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  budget: number
  spent: number
  impressions: number
  clicks: number
  judge_id?: string
  judge_name?: string
  court_name?: string
  created_at: string
  updated_at: string
}

interface CampaignCardProps {
  campaign: Campaign
  onPause: () => void
  onResume: () => void
  onEdit: () => void
  onDelete: () => void
}

export function CampaignCard({
  campaign,
  onPause,
  onResume,
  onEdit,
  onDelete,
}: CampaignCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const ctr = campaign.impressions > 0
    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
    : '0.00'

  const cpc = campaign.clicks > 0
    ? (campaign.spent / campaign.clicks).toFixed(2)
    : '0.00'

  const statusColors = {
    active: 'bg-success/20 text-success border border-success/30',
    paused: 'bg-warning/20 text-warning border border-warning/30',
    completed: 'bg-muted text-muted-foreground border border-border',
    cancelled: 'bg-destructive/20 text-destructive border border-destructive/30',
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              {campaign.name}
            </h3>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}
            >
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
          </div>

          {campaign.judge_name && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Judge {campaign.judge_name}</span>
              {campaign.court_name && (
                <>
                  <span>•</span>
                  <span>{campaign.court_name}</span>
                </>
              )}
              {campaign.judge_id && (
                <Link
                  href={`/judges/${campaign.judge_id}`}
                  className="text-interactive-primary hover:underline inline-flex items-center gap-1"
                  target="_blank"
                >
                  View Profile
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-muted rounded-md transition-colors"
            aria-label="Campaign actions"
          >
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 mt-1 w-48 bg-popover rounded-md shadow-lg border border-border z-20">
                <div className="py-1">
                  {campaign.status === 'active' ? (
                    <button
                      onClick={() => {
                        onPause()
                        setShowMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-popover-foreground"
                    >
                      <PauseCircle className="h-4 w-4" />
                      Pause Campaign
                    </button>
                  ) : campaign.status === 'paused' ? (
                    <button
                      onClick={() => {
                        onResume()
                        setShowMenu(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-popover-foreground"
                    >
                      <PlayCircle className="h-4 w-4" />
                      Resume Campaign
                    </button>
                  ) : null}

                  <button
                    onClick={() => {
                      onEdit()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-popover-foreground"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Campaign
                  </button>

                  <button
                    onClick={() => {
                      onDelete()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel Campaign
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <div className="text-xs text-muted-foreground">Budget</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            ${campaign.budget.toLocaleString()}/mo
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Spent</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            ${campaign.spent.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground/70">
            {campaign.budget > 0
              ? `${((campaign.spent / campaign.budget) * 100).toFixed(0)}% of budget`
              : ''}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Impressions</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {campaign.impressions.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Clicks</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {campaign.clicks.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground/70">{ctr}% CTR</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground">Avg CPC</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            ${cpc}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        Created {new Date(campaign.created_at).toLocaleDateString()} • Last updated{' '}
        {new Date(campaign.updated_at).toLocaleDateString()}
      </div>
    </div>
  )
}
