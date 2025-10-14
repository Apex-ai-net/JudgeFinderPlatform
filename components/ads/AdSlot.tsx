'use client'

import { useEffect } from 'react'
import type { CSSProperties } from 'react'

interface AdSlotProps {
  slot: string
  format?: string
  responsive?: boolean
  style?: CSSProperties
  className?: string
}

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

export default function AdSlot({
  slot,
  format = 'auto',
  responsive = true,
  style,
  className,
}: AdSlotProps): JSX.Element | null {
  const client = process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT
  const isValidClient = typeof client === 'string' && /^ca-pub-\d{16,}$/.test(client)

  useEffect(() => {
    if (!isValidClient) return
    try {
      // Initialize the ad after the element is in the DOM
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // Ignore AdSense init errors in non-production/adtest
    }
  }, [])

  // Do not render if client is invalid
  if (!isValidClient) return null

  return (
    <ins
      className={`adsbygoogle${className ? ` ${className}` : ''}`}
      style={style || { display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
      data-adtest={process.env.NODE_ENV !== 'production' ? 'on' : undefined}
    />
  )
}
