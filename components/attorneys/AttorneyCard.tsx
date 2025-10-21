import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Scale, Star, CheckCircle2 } from 'lucide-react'

export interface Attorney {
  id: string
  bar_number?: string
  firm_name?: string
  specialty?: string
  years_experience?: number
  cases_won?: number
  cases_total?: number
  rating?: number
  verified?: boolean
  jurisdiction?: string
}

interface AttorneyCardProps {
  attorney: Attorney
}

export function AttorneyCard({ attorney }: AttorneyCardProps): JSX.Element {
  const winRate =
    attorney.cases_total && attorney.cases_total > 0
      ? Math.round(((attorney.cases_won || 0) / attorney.cases_total) * 100)
      : null

  return (
    <Card className="group transition-all duration-200 hover:shadow-lg hover:border-primary/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl group-hover:text-primary transition-colors">
              {attorney.bar_number ? `Attorney #${attorney.bar_number}` : 'Attorney'}
            </CardTitle>
            {attorney.firm_name && (
              <CardDescription className="mt-1 flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {attorney.firm_name}
              </CardDescription>
            )}
          </div>
          {attorney.verified && (
            <Badge variant="default" className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Specialty */}
        {attorney.specialty && (
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{attorney.specialty}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          {attorney.years_experience !== undefined && attorney.years_experience !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Experience</p>
              <p className="text-lg font-semibold text-foreground">
                {attorney.years_experience} years
              </p>
            </div>
          )}

          {winRate !== null && (
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-semibold text-foreground">{winRate}%</p>
            </div>
          )}

          {attorney.cases_total !== undefined &&
            attorney.cases_total !== null &&
            attorney.cases_total > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Cases</p>
                <p className="text-lg font-semibold text-foreground">{attorney.cases_total}</p>
              </div>
            )}

          {attorney.rating !== undefined && attorney.rating !== null && attorney.rating > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Rating</p>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <p className="text-lg font-semibold text-foreground">
                  {attorney.rating.toFixed(1)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contact CTA - Placeholder for future functionality */}
        <div className="pt-2">
          <button
            className="w-full px-4 py-2 rounded-lg bg-primary/10 text-primary border border-primary/20
                     hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            View Profile
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export function AttorneyCardSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          <div className="space-y-1">
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
            <div className="h-5 bg-muted rounded animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
            <div className="h-5 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-10 bg-muted rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}
