'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { ExternalLink, Briefcase, Phone, Mail, Shield, RotateCw } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useInView } from 'react-intersection-observer'

interface AdvertiserSlotsProps {
  judgeId: string
  judgeName: string
}

interface AdSlot {
  id: string
  position: number
  status?: string
  base_price_monthly?: number
  pricing_tier?: string | null
  advertiser?: {
    id?: string
    firm_name: string
    description: string
    website?: string
    phone?: string
    email?: string
    logo_url?: string
    specializations?: string[]
    badge?: string
    bar_number?: string
  } | null
  creative?: {
    headline: string
    description: string
    cta_text: string
    cta_url: string
  }
}

interface ApiResponse {
  slots?: AdSlot[]
  max_rotations?: number
}

const DEFAULT_MAX_ROTATIONS = 2

function rotationLabel(position: number, maxRotations: number): string {
  if (maxRotations <= 1) return 'Featured Sponsor'
  return `Rotation ${position} of ${maxRotations}`
}

function isBooked(slot: AdSlot): boolean {
  const status = slot.status?.toLowerCase()
  if (!status) return false
  return status === 'booked' || status === 'reserved' || status === 'active'
}

export function AdvertiserSlots({ judgeId, judgeName }: AdvertiserSlotsProps): JSX.Element {
  const [slots, setSlots] = useState<AdSlot[]>([])
  const [maxRotations, setMaxRotations] = useState<number>(DEFAULT_MAX_ROTATIONS)
  const [loading, setLoading] = useState(true)

  const fetchAdSlots = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/judges/${judgeId}/advertising-slots`)

      if (!response.ok) {
        setSlots(getDemoSlots(DEFAULT_MAX_ROTATIONS))
        setMaxRotations(DEFAULT_MAX_ROTATIONS)
        return
      }

      const data: ApiResponse = await response.json()
      const rotations = Math.max(
        1,
        Math.min(data.max_rotations ?? DEFAULT_MAX_ROTATIONS, DEFAULT_MAX_ROTATIONS)
      )
      setMaxRotations(rotations)

      const incoming = (data.slots ?? []).reduce<Record<number, AdSlot>>((acc, slot) => {
        if (
          slot &&
          typeof slot.position === 'number' &&
          slot.position >= 1 &&
          slot.position <= rotations
        ) {
          acc[slot.position] = slot
        }
        return acc
      }, {})

      const normalized: AdSlot[] = Array.from({ length: rotations }, (_, index) => {
        const position = index + 1
        return (
          incoming[position] ?? {
            id: `placeholder-${position}`,
            position,
            status: 'available',
            advertiser: null,
          }
        )
      })

      setSlots(normalized)
    } catch (error) {
      console.error('Error fetching ad slots:', error)
      setSlots(getDemoSlots(DEFAULT_MAX_ROTATIONS))
      setMaxRotations(DEFAULT_MAX_ROTATIONS)
    } finally {
      setLoading(false)
    }
  }, [judgeId])

  useEffect(() => {
    fetchAdSlots()
  }, [fetchAdSlots])

  const soldOut = useMemo(() => {
    if (!slots.length) return false
    return slots.every((slot) => isBooked(slot) || Boolean(slot.advertiser))
  }, [slots])

  function getDemoSlots(rotations: number): AdSlot[] {
    return Array.from({ length: rotations }, (_, index) => ({
      id: `placeholder-${index + 1}`,
      position: index + 1,
      status: 'available',
      advertiser: null,
    }))
  }

  function trackClick(slotId: string, url: string): void {
    fetch('/api/advertising/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot_id: slotId, judge_id: judgeId }),
    }).catch(console.error)

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const waitlistMailTo = useMemo(() => {
    const subject = encodeURIComponent(`Join waitlist for Judge ${judgeName}`)
    const body = encodeURIComponent(
      'Please keep me informed when a verified sponsorship rotation opens for this judge.\n\nFirm / Attorney Name:\nPreferred Contact:\nCounty Focus:\n'
    )
    return `mailto:sponsors@judgefinder.io?subject=${subject}&body=${body}`
  }, [judgeName])

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: maxRotations }, (_, index) => index + 1).map((rotation) => (
          <div
            key={rotation}
            className="animate-pulse rounded-2xl border border-border/60 bg-card p-4"
          >
            <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }

  function SlotCard({
    slot,
    maxRotations,
    judgeId,
    judgeName,
    onTrackClick,
  }: {
    slot: AdSlot
    maxRotations: number
    judgeId: string
    judgeName: string
    onTrackClick: (slotId: string, url: string) => void
  }) {
    const advertiser = slot.advertiser || undefined
    const barNumber = advertiser?.bar_number?.trim()
    const barVerificationUrl = barNumber
      ? `https://apps.calbar.ca.gov/attorney/Licensee/Detail/${barNumber}`
      : undefined
    const available = slot.status === 'available' && !advertiser

    const { ref, inView } = useInView({ threshold: 0.5, triggerOnce: true })

    useEffect(() => {
      if (!inView) return
      if (!slot.id) return
      if (!(advertiser || !available)) return
      fetch('/api/advertising/track-impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: slot.id, judge_id: judgeId }),
      }).catch(() => {})
    }, [inView, advertiser, available, slot.id, judgeId])

    return (
      <article
        key={slot.id}
        ref={ref}
        className="overflow-hidden rounded-lg md:rounded-2xl border border-border/60 bg-card transition-shadow hover:shadow-lg"
      >
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-border/50 bg-surface-elevated px-2 py-2 md:px-5 md:py-3 text-[10px] md:text-xs font-semibold text-muted-foreground/70 gap-1">
          <span className="hidden md:inline">{rotationLabel(slot.position, maxRotations)}</span>
          <span className="md:hidden text-[9px]">#{slot.position}</span>
          {!available && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/45 bg-interactive/10 px-2 py-0.5 md:px-3 md:py-1 text-[8px] md:text-[10px] uppercase tracking-[0.25em] text-primary">
              Ad
            </span>
          )}
        </header>

        {advertiser ? (
          <div className="space-y-2 md:space-y-4 p-2 md:p-5">
            <div className="flex flex-col gap-2 md:gap-3">
              <div className="flex flex-col md:flex-row items-start justify-between gap-2 md:gap-3">
                <div className="flex-1 w-full">
                  <h4 className="text-xs md:text-lg font-semibold text-foreground truncate">
                    {advertiser.firm_name}
                  </h4>
                  <p className="mt-1 text-[10px] md:text-sm text-muted-foreground line-clamp-2 md:line-clamp-none">
                    {advertiser.description}
                  </p>
                </div>
                {advertiser.logo_url && (
                  <Image
                    src={advertiser.logo_url}
                    alt={advertiser.firm_name}
                    width={52}
                    height={52}
                    className="hidden md:block h-12 w-12 rounded-lg border border-border/40 bg-surface-elevated object-contain p-2"
                  />
                )}
              </div>
              <div className="hidden md:flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/70">
                {barVerificationUrl && (
                  <a
                    href={barVerificationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-foreground"
                  >
                    <Shield className="h-3 w-3" aria-hidden />
                    CA Bar #{barNumber}
                  </a>
                )}
                <span>Verified by JudgeFinder</span>
              </div>
            </div>

            {slot.creative && (
              <div className="hidden md:block rounded-xl border border-border/60 bg-surface-elevated p-4">
                <h5 className="mb-1 text-sm font-semibold text-foreground">
                  {slot.creative.headline}
                </h5>
                <p className="text-sm text-muted-foreground">{slot.creative.description}</p>
              </div>
            )}

            {advertiser.specializations && advertiser.specializations.length > 0 && (
              <div className="hidden md:flex flex-wrap gap-2">
                {advertiser.specializations.map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center rounded-full border border-border/50 bg-surface-elevated px-3 py-1 text-xs text-muted-foreground/70"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}

            <div className="hidden md:block space-y-2 text-sm text-muted-foreground">
              {advertiser.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" aria-hidden />
                  <span>{advertiser.phone}</span>
                </div>
              )}
              {advertiser.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" aria-hidden />
                  <a
                    href={`mailto:${advertiser.email}`}
                    className="text-primary transition-colors hover:text-foreground"
                  >
                    {advertiser.email}
                  </a>
                </div>
              )}
              {advertiser.website && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  <a
                    href={advertiser.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary transition-colors hover:text-foreground"
                    onClick={(event) => {
                      event.preventDefault()
                      onTrackClick(slot.id, advertiser.website!)
                    }}
                  >
                    Visit website
                  </a>
                </div>
              )}
            </div>

            {/* Mobile: Show simple CTA button */}
            {advertiser.website && (
              <button
                type="button"
                onClick={() => onTrackClick(slot.id, advertiser.website!)}
                className="md:hidden w-full rounded-full border border-primary/45 bg-interactive/15 px-2 py-1.5 text-[10px] font-semibold text-primary transition-colors hover:bg-[rgba(110,168,254,0.25)]"
              >
                Visit
              </button>
            )}

            {/* Desktop: Show custom CTA if available */}
            {slot.creative?.cta_text && slot.creative?.cta_url && (
              <button
                type="button"
                onClick={() => onTrackClick(slot.id, slot.creative!.cta_url)}
                className="hidden md:block w-full rounded-full border border-primary/45 bg-interactive/15 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-[rgba(110,168,254,0.25)]"
              >
                {slot.creative.cta_text}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 md:gap-3 border border-dashed border-border/50 bg-surface-elevated p-3 md:p-6 text-center">
            <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground/70" aria-hidden />
            <p className="text-[10px] md:text-sm font-semibold text-foreground">Available</p>
            <p className="hidden md:block text-xs text-muted-foreground/70">
              High-intent visibility for attorneys appearing before Judge {judgeName}.
            </p>
            <Link
              href={`/dashboard/advertiser/ad-spots?preselected=true&entityType=judge&entityId=${encodeURIComponent(judgeId)}&position=${encodeURIComponent(String(slot.position))}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-2 py-1.5 md:px-4 md:py-2 text-[10px] md:text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground"
            >
              <span className="hidden md:inline">Book this rotation</span>
              <span className="md:hidden">Book</span>
            </Link>
          </div>
        )}
      </article>
    )
  }

  return (
    <div className="space-y-5" id="attorney-slots" aria-label="Verified legal sponsors">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Verified Legal Sponsors</h3>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
            <RotateCw className="h-3 w-3" aria-hidden />
            {maxRotations === 1
              ? 'One verified sponsor per judge page.'
              : `One sponsor slot, up to ${maxRotations} rotating attorneys.`}
          </p>
        </div>
        <Link
          href="/docs/ads-policy"
          className="inline-flex items-center gap-2 text-xs font-medium text-primary transition-colors hover:text-foreground"
        >
          Understand our ad policy
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/70">
        Listings labeled <span className="font-semibold text-primary">Ad</span> are paid placements.
        We verify every sponsor&apos;s California bar status before activation.
      </p>

      {soldOut && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface-elevated p-4 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Sponsor inventory sold out</p>
          <p className="mt-1">
            Both rotations are currently filled. Join the waitlist and we&apos;ll notify you the
            moment a verified slot becomes available.
          </p>
          <Link
            href={waitlistMailTo}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-primary/45 bg-interactive/15 px-4 py-2 text-xs font-semibold text-primary transition-colors hover:bg-[rgba(110,168,254,0.25)]"
          >
            Join waitlist
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 md:flex md:flex-col md:gap-5">
        {slots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            maxRotations={maxRotations}
            judgeId={judgeId}
            judgeName={judgeName}
            onTrackClick={trackClick}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground/70">
          <Shield className="mt-0.5 h-4 w-4 text-primary" aria-hidden />
          <div>
            <p className="mb-1 font-semibold text-muted-foreground">Trust &amp; verification</p>
            <p>
              We confirm California bar standing and active insurance before approving any sponsor.
              Listings are removed immediately if a bar license lapses.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
