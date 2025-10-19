'use client'

import { Search, Bookmark, Eye, GitCompare } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/date-formatters'

interface Activity {
  id: string
  activity_type: 'search' | 'bookmark' | 'view' | 'compare'
  created_at: string
  search_query?: string
}

interface ActivityTimelineProps {
  activities: Activity[]
}

const activityConfig = {
  search: {
    icon: Search,
    label: 'Searched for judges',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/30 dark:to-blue-900/20',
  },
  bookmark: {
    icon: Bookmark,
    label: 'Bookmarked a judge',
    color: 'text-green-600 dark:text-green-400',
    bgColor:
      'bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950/30 dark:to-green-900/20',
  },
  view: {
    icon: Eye,
    label: 'Viewed judge profile',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor:
      'bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/30 dark:to-purple-900/20',
  },
  compare: {
    icon: GitCompare,
    label: 'Compared judges',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor:
      'bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/20',
  },
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
          <Eye className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">No recent activity</p>
        <p className="text-xs text-muted-foreground">Your searches and views will appear here</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-5 top-5 bottom-5 w-px bg-border" />

      {activities.map((activity, index) => {
        const config = activityConfig[activity.activity_type]
        const Icon = config.icon

        return (
          <div
            key={activity.id}
            className="relative flex items-start space-x-4 group animate-in fade-in slide-in-from-left-2"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Icon */}
            <div className="flex-shrink-0 relative z-10">
              <div
                className={`w-10 h-10 ${config.bgColor} rounded-full flex items-center justify-center transition-transform group-hover:scale-110`}
              >
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{config.label}</p>
                  {activity.search_query && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      <span className="font-medium">Query:</span> {activity.search_query}
                    </p>
                  )}
                </div>
                <time
                  className="text-xs text-muted-foreground/60 whitespace-nowrap"
                  dateTime={activity.created_at}
                  title={new Date(activity.created_at).toLocaleString()}
                >
                  {formatRelativeTime(activity.created_at)}
                </time>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
