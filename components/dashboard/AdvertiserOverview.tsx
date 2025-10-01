'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  MousePointer,
  Eye,
  Calendar,
  ArrowRight,
  Plus,
  BarChart3
} from 'lucide-react'
import type { AdvertiserDashboardStats, AdvertiserProfile } from '@/types/advertising'

interface AdvertiserOverviewProps {
  stats: AdvertiserDashboardStats
  advertiserProfile: AdvertiserProfile
}

export default function AdvertiserOverview({ stats, advertiserProfile }: AdvertiserOverviewProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const statCards = [
    {
      title: 'Total Spend',
      value: `$${stats.total_spend.toLocaleString()}`,
      icon: DollarSign,
      change: '+12%',
      changeType: 'positive' as const,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    {
      title: 'Active Campaigns',
      value: stats.active_campaigns.toString(),
      icon: Target,
      change: `${stats.total_campaigns} total`,
      changeType: 'neutral' as const,
      bgColor: 'bg-primary/5',
      iconColor: 'text-primary'
    },
    {
      title: 'Total Impressions',
      value: stats.total_impressions.toLocaleString(),
      icon: Eye,
      change: '+25%',
      changeType: 'positive' as const,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Click-through Rate',
      value: `${stats.average_ctr}%`,
      icon: MousePointer,
      change: '+0.5%',
      changeType: 'positive' as const,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{stat.value}</p>
                <p className={`mt-2 text-sm ${
                  stat.changeType === 'positive' ? 'text-green-600' :
                  stat.changeType === 'neutral' ? 'text-muted-foreground' :
                  'text-red-600'
                }`}>
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
      <div className="bg-white rounded-lg shadow-sm border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/advertiser/campaigns/new"
            className="flex items-center justify-between p-4 bg-primary/5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">Create Campaign</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/advertiser/ad-spots"
            className="flex items-center justify-between p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-purple-600" />
              <span className="font-medium text-foreground">Browse Ad Spots</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          <Link
            href="/dashboard/advertiser/analytics"
            className="flex items-center justify-between p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-foreground">View Analytics</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Active Ad Spots</h2>
            <Link href="/dashboard/advertiser/bookings" className="text-sm text-primary hover:text-blue-700">
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
                <Link href="/dashboard/advertiser/ad-spots" className="text-primary hover:text-blue-700 ml-1">
                  Book your first spot
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="bg-white rounded-lg shadow-sm border border-border p-6">
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

      {/* Performance Chart Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Performance Overview</h2>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Performance chart will be displayed here</p>
            <p className="text-sm text-muted-foreground mt-1">Showing data for the last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}