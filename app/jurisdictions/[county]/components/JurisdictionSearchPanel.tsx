import { Search, Loader2 } from 'lucide-react'
import { ChangeEvent } from 'react'
import { JurisdictionMetadata } from '../types'

export interface JurisdictionSearchPanelProps {
  jurisdiction: JurisdictionMetadata
  searchValue: string
  totalCourts: number
  visibleCourts: number
  loading: boolean
  onSearchChange: (value: string) => void
}

class JurisdictionSearchPanelView {
  constructor(private readonly props: JurisdictionSearchPanelProps) {}

  private handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    this.props.onSearchChange(event.target.value)
  }

  render(): JSX.Element {
    const { jurisdiction, searchValue, totalCourts, visibleCourts, loading } = this.props

    return (
      <section className="relative -mt-10 pb-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-card border border-border/50 shadow-lg p-6 sm:p-8">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Search Courts</p>
                <h2 className="text-2xl font-semibold text-foreground">
                  Explore Courts in {jurisdiction.displayName}
                </h2>
              </div>

              <label className="block">
                <span className="text-sm text-muted-foreground">Search by court name</span>
                <div className="mt-2 relative flex items-center">
                  <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchValue}
                    onChange={this.handleInputChange}
                    placeholder="Los Angeles Superior Court..."
                    className="w-full rounded-xl border border-border bg-surface-elevated px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring transition"
                  />
                </div>
              </label>

              <div className="rounded-xl border border-border bg-muted p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-foreground">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading courts...
                    </span>
                  ) : (
                    <span>
                      Found {totalCourts.toLocaleString()} courts in {jurisdiction.displayName}
                    </span>
                  )}
                </div>

                {!loading && totalCourts > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">
                    Showing {visibleCourts.toLocaleString()} of {totalCourts.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
}

export function JurisdictionSearchPanel(props: JurisdictionSearchPanelProps): JSX.Element {
  return new JurisdictionSearchPanelView(props).render()
}

export const renderJurisdictionSearchPanel = (
  props: JurisdictionSearchPanelProps
): JSX.Element => JurisdictionSearchPanel(props)

