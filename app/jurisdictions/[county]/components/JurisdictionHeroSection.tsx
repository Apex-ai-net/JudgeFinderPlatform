import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { JurisdictionMetadata } from '../types'

export interface JurisdictionHeroSectionProps {
  jurisdiction: JurisdictionMetadata
  totalCourts: number
  totalJudges: number
}

class JurisdictionHeroSectionView {
  constructor(private readonly props: JurisdictionHeroSectionProps) {}

  render(): JSX.Element {
    const { jurisdiction, totalCourts, totalJudges } = this.props

    return (
      <header className="relative overflow-hidden bg-gradient-to-b from-surface-sunken via-card to-background border-b border-border/50">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-radial from-primary/30 to-transparent opacity-60" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="mb-8">
            <Link
              href="/jurisdictions"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-white/90 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Jurisdictions
            </Link>
          </div>

          <div className="text-center lg:text-left lg:flex lg:items-center lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="uppercase tracking-[0.35em] text-xs text-primary/80 mb-4">
                {jurisdiction.displayName}
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-4">
                {jurisdiction.displayName} Courts
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                {jurisdiction.description}
              </p>
            </div>

            <div className="mt-8 lg:mt-0 flex flex-col sm:flex-row items-center gap-4">
              {totalCourts > 0 && (
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-primary to-interactive px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20">
                  {totalCourts.toLocaleString()} Courts
                </span>
              )}
              {totalJudges > 0 && (
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-success to-success/80 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-success/20">
                  {totalJudges.toLocaleString()} Judges
                </span>
              )}
            </div>
          </div>
        </div>
      </header>
    )
  }
}

export function JurisdictionHeroSection(props: JurisdictionHeroSectionProps): JSX.Element {
  return new JurisdictionHeroSectionView(props).render()
}

export const renderJurisdictionHeroSection = (
  props: JurisdictionHeroSectionProps
): JSX.Element => JurisdictionHeroSection(props)

