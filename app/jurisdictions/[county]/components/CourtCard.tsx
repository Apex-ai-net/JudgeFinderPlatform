import Link from 'next/link'
import { Building, MapPin, Users, Scale, ArrowRight } from 'lucide-react'
import { CourtInfo } from '../types'
import { resolveCourtSlug } from '@/lib/utils/slug'

export interface CourtCardProps {
  court: CourtInfo
}

class CourtCardView {
  private readonly court: CourtInfo

  constructor(props: CourtCardProps) {
    this.court = props.court
  }

  private getCourtSlug(): string {
    const resolved = resolveCourtSlug(this.court)
    if (resolved) return resolved

    return this.court.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private getLocationDisplay(): string {
    if (this.court.address && typeof this.court.address === 'string') {
      return this.court.address
    }
    const nameMatch = this.court.name.match(/(.*?),\s*([A-Z]{2}\.?\s*[A-Za-z]*)/)
    if (nameMatch) {
      return nameMatch[2]
    }
    return this.court.jurisdiction || 'Location not specified'
  }

  render(): JSX.Element {
    const slug = this.getCourtSlug()
    const judgeCount = this.court.judge_count || 0

    return (
      <Link
        href={`/courts/${slug}`}
        className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-transform duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg"
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        </div>

        <div className="relative flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-interactive/20 text-primary flex items-center justify-center">
                <Building className="h-6 w-6" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary/80" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{this.court.type}</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition" />
        </div>

        <h3 className="relative text-xl font-semibold text-foreground leading-tight mb-4 line-clamp-2">
          {this.court.name}
        </h3>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{this.getLocationDisplay()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{judgeCount.toLocaleString()} judges</span>
          </div>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span>{this.court.jurisdiction} jurisdiction</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          {this.court.website && (
            <span className="inline-flex items-center rounded-full bg-interactive/10 px-3 py-1 text-primary">
              Official Website
            </span>
          )}
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-muted-foreground">
            View details →
          </span>
        </div>
      </Link>
    )
  }
}

export function CourtCard(props: CourtCardProps): JSX.Element {
  return new CourtCardView(props).render()
}

export const renderCourtCard = (props: CourtCardProps): JSX.Element => CourtCard(props)

