'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Target,
  DollarSign,
  MousePointer,
  Eye,
  Calendar,
  ArrowRight,
  Plus,
  BarChart3,
} from 'lucide-react'
import CampaignPerformanceChart from './CampaignPerformanceChart'
import type { AdvertiserDashboardStats, AdvertiserProfile } from '@/types/advertising'

interface AdvertiserOverviewProps {
  stats: AdvertiserDashboardStats
  advertiserProfile: AdvertiserProfile
}

export default function AdvertiserOverview({
  stats,
  advertiserProfile,
}: AdvertiserOverviewProps): JSX.Element {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const statCards = [
    {
      title: 'Total Spend',
      value: `$${stats.total_spend.toLocaleString()}`,
      icon: DollarSign,
      change: '+12%',
      changeType: 'positive' as const,
      bgColor: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      title: 'Active Campaigns',
      value: stats.active_campaigns.toString(),
      icon: Target,
      change: `${stats.total_campaigns} total`,
      changeType: 'neutral' as const,
      bgColor: 'bg-primary/5',
      iconColor: 'text-primary',
    },
    {
      title: 'Total Impressions',
      value: stats.total_impressions.toLocaleString(),
      icon: Eye,
      change: '+25%',
      changeType: 'positive' as const,
      bgColor: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      title: 'Click-through Rate',
      value: `${stats.average_ctr}%`,
      icon: MousePointer,
      change: '+0.5%',
      changeType: 'positive' as const,
      bgColor: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                <p
                  className={`mt-2 text-sm ${
                    stat.changeType === 'positive'
                      ? 'text-success'
                      : stat.changeType === 'neutral'
                        ? 'text-muted-foreground'
                        : 'text-destructive'
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div className={`${stat.bgColor} rounded-lg p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/advertiser/campaigns/new"
            className="flex items-center justify-between p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">Create Campaign</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/advertiser/ad-spots"
            className="flex items-center justify-between p-4 bg-accent/10 rounded-lg hover:bg-accent/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-accent" />
              <span className="font-medium text-foreground">Browse Ad Spots</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/advertiser/analytics"
            className="flex items-center justify-between p-4 bg-success/10 rounded-lg hover:bg-success/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-success" />
              <span className="font-medium text-foreground">View Analytics</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Bookings */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Active Ad Spots</h2>
            <Link
              href="/dashboard/advertiser/bookings"
              className="text-sm text-primary hover:text-primary/80"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {stats.active_bookings > 0 ? (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Judge Smith - Position 1</p>
                    <p className="text-sm text-muted-foreground">Orange County Superior Court</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Court of Appeal - Position 2</p>
                    <p className="text-sm text-muted-foreground">Fourth Appellate District</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    Active
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No active ad spots.
                <Link
                  href="/dashboard/advertiser/ad-spots"
                  className="text-primary hover:text-blue-700 ml-1"
                >
                  Book your first spot
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Upcoming Bookings</h2>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {stats.upcoming_bookings > 0 ? (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Judge Johnson - Position 3</p>
                    <p className="text-sm text-muted-foreground">Starts Jan 1, 2025</p>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                    Scheduled
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No upcoming bookings scheduled
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex justify-end gap-2">
        {(['7d', '30d', '90d'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              timeRange === range
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-muted bg-card border border-border'
            }`}
          >
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
          </button>
        ))}
      </div>

      {/* Performance Chart */}
      <CampaignPerformanceChart timeRange={timeRange} />
    </div>
  )
}
