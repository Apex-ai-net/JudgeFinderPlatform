'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, AlertCircle, CheckCircle, Flame, Loader2 } from 'lucide-react'

interface AdSlotStats {
  federal: {
    total: number
    available: number
    percentage: number
  }
  state: {
    total: number
    available: number
    percentage: number
  }
  trending: Array<{
    name: string
    type: 'court' | 'judge'
    booked: number
    total: number
  }>
}

export default function AdSlotStatusWidget(): JSX.Element {
  const [stats, setStats] = useState<AdSlotStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSlotStats() {
      try {
        setLoading(true)
        const response = await fetch('/api/advertising/slot-stats')

        if (!response.ok) {
          // If API doesn't exist yet, use mock data
          setStats({
            federal: { total: 150, available: 42, percentage: 28 },
            state: { total: 500, available: 128, percentage: 26 },
            trending: [
              { name: 'Los Angeles Superior Court', type: 'court', booked: 3, total: 3 },
              { name: 'Central District of California', type: 'court', booked: 2, total: 3 },
              { name: 'Judge Morrison England Jr.', type: 'judge', booked: 2, total: 2 },
            ],
          })
          setLoading(false)
          return
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        // Use mock data on error
        setStats({
          federal: { total: 150, available: 42, percentage: 28 },
          state: { total: 500, available: 128, percentage: 26 },
          trending: [
            { name: 'Los Angeles Superior Court', type: 'court', booked: 3, total: 3 },
            { name: 'Central District of California', type: 'court', booked: 2, total: 3 },
            { name: 'Judge Morrison England Jr.', type: 'judge', booked: 2, total: 2 },
          ],
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSlotStats()
  }, [])

  const getAvailabilityStatus = (percentage: number) => {
    if (percentage >= 30) return { color: 'green', label: 'Good availability', icon: CheckCircle }
    if (percentage >= 10) return { color: 'yellow', label: 'Limited availability', icon: AlertCircle }
    return { color: 'red', label: 'High demand', icon: Flame }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 shadow-sm">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const federalStatus = getAvailabilityStatus(stats.federal.percentage)
  const stateStatus = getAvailabilityStatus(stats.state.percentage)

  return (
    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Live Ad Slot Availability
      </h3>

      {/* Availability Stats */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Federal Judges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Federal Judges</h4>
            <div className={`flex items-center gap-1.5 text-sm font-medium text-${federalStatus.color}-600`}>
              <federalStatus.icon className="h-4 w-4" />
              <span>{federalStatus.label}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Available slots</span>
              <span className="text-lg font-bold text-foreground">
                {stats.federal.available} of {stats.federal.total}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all bg-${federalStatus.color}-500`}
                style={{ width: `${stats.federal.percentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.federal.percentage}% availability
            </div>
          </div>
        </div>

        {/* State Judges */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">State Judges</h4>
            <div className={`flex items-center gap-1.5 text-sm font-medium text-${stateStatus.color}-600`}>
              <stateStatus.icon className="h-4 w-4" />
              <span>{stateStatus.label}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Available slots</span>
              <span className="text-lg font-bold text-foreground">
                {stats.state.available} of {stats.state.total}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all bg-${stateStatus.color}-500`}
                style={{ width: `${stats.state.percentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {stats.state.percentage}% availability
            </div>
          </div>
        </div>
      </div>

      {/* Trending/High Demand */}
      {stats.trending && stats.trending.length > 0 && (
        <div className="pt-6 border-t border-border">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            High Demand Spots
          </h4>
          <div className="space-y-2">
            {stats.trending.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-2 px-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">({item.type})</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.booked === item.total ? (
                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">
                      Sold Out
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {item.booked}/{item.total} booked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-muted-foreground">Good availability (&gt;30%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-muted-foreground">Limited (10-30%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-muted-foreground">High demand (&lt;10%)</span>
        </div>
      </div>
    </div>
  )
}
