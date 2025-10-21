'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreVertical, PauseCircle, PlayCircle, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CampaignCard } from './CampaignCard'
import { CreateCampaignDialog } from './CreateCampaignDialog'
import { EditCampaignDialog } from './EditCampaignDialog'
import { logger } from '@/lib/utils/logger'

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

interface CampaignManagementDashboardProps {
  userId: string
  advertiserProfile: {
    id: string
    organization_name: string
    contact_email: string
    bar_number: string | null
    verification_status: string
  }
}

export function CampaignManagementDashboard({
  userId,
  advertiserProfile,
}: CampaignManagementDashboardProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('active')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/advertising/campaigns?status=${statusFilter}&limit=50`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns')
      }

      const data = await response.json()
      setCampaigns(data.campaigns || [])
      setError(null)
    } catch (err) {
      logger.error('Failed to fetch campaigns', { error: err })
      setError(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [statusFilter])

  // Handle campaign actions
  const handlePauseCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/advertising/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      })

      if (!response.ok) throw new Error('Failed to pause campaign')

      await fetchCampaigns()
    } catch (err) {
      logger.error('Failed to pause campaign', { campaignId, error: err })
      alert('Failed to pause campaign')
    }
  }

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/advertising/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      if (!response.ok) throw new Error('Failed to resume campaign')

      await fetchCampaigns()
    } catch (err) {
      logger.error('Failed to resume campaign', { campaignId, error: err })
      alert('Failed to resume campaign')
    }
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return

    try {
      const response = await fetch(`/api/advertising/campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete campaign')

      await fetchCampaigns()
    } catch (err) {
      logger.error('Failed to delete campaign', { campaignId, error: err })
      alert('Failed to cancel campaign')
    }
  }

  // Filter campaigns by search query
  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.judge_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.court_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Calculate summary stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    totalSpent: campaigns.reduce((sum, c) => sum + c.spent, 0),
    totalImpressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
    totalClicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="text-sm text-muted-foreground">Total Campaigns</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {stats.total}
          </div>
          <div className="mt-1 text-xs text-muted-foreground/70">
            {stats.active} active, {stats.paused} paused
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="text-sm text-muted-foreground">Total Spend</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            ${stats.totalSpent.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted-foreground/70">All-time</div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="text-sm text-muted-foreground">Impressions</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {stats.totalImpressions.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted-foreground/70">All campaigns</div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="text-sm text-muted-foreground">Clicks</div>
          <div className="mt-2 text-3xl font-bold text-foreground">
            {stats.totalClicks.toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-muted-foreground/70">
            {stats.totalImpressions > 0
              ? `${((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2)}% CTR`
              : '0% CTR'}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
            <Input
              type="search"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <Button onClick={() => setShowCreateDialog(true)} className="whitespace-nowrap">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading campaigns...</div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-destructive mb-2">Error loading campaigns</div>
          <div className="text-sm text-muted-foreground">{error}</div>
          <Button onClick={fetchCampaigns} variant="outline" className="mt-4">
            Retry
          </Button>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <div className="text-muted-foreground mb-4">
            {searchQuery
              ? 'No campaigns match your search'
              : 'No campaigns yet'}
          </div>
          {!searchQuery && (
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Campaign
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onPause={() => handlePauseCampaign(campaign.id)}
              onResume={() => handleResumeCampaign(campaign.id)}
              onEdit={() => setEditingCampaign(campaign)}
              onDelete={() => handleDeleteCampaign(campaign.id)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showCreateDialog && (
        <CreateCampaignDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false)
            fetchCampaigns()
          }}
          advertiserProfile={advertiserProfile}
        />
      )}

      {editingCampaign && (
        <EditCampaignDialog
          campaign={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSuccess={() => {
            setEditingCampaign(null)
            fetchCampaigns()
          }}
        />
      )}
    </div>
  )
}
