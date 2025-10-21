'use client'

/**
 * Reusable Cloudflare Turnstile CAPTCHA widget component
 *
 * Usage:
 * ```tsx
 * <TurnstileWidget onVerify={(token) => setTurnstileToken(token)} />
 * ```
 */

import { Turnstile, TurnstileInstance } from '@marsidev/react-turnstile'
import { useRef } from 'react'
import { getTurnstileSiteKey } from '@/lib/auth/turnstile'

export interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  className?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  className = '',
  theme = 'dark',
  size = 'normal',
}: TurnstileWidgetProps): JSX.Element {
  const turnstileRef = useRef<TurnstileInstance | null>(null)
  const siteKey = getTurnstileSiteKey()

  if (!siteKey) {
    return (
      <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
        ⚠️ Turnstile CAPTCHA is not configured. Please add NEXT_PUBLIC_TURNSTILE_SITE_KEY to
        environment variables.
      </div>
    )
  }

  return (
    <div className={className}>
      <Turnstile
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={() => {
          console.error('Turnstile verification error')
          onError?.()
        }}
        onExpire={() => {
          console.warn('Turnstile token expired')
          onExpire?.()
        }}
        options={{
          theme,
          size,
          action: 'submit',
          refreshExpired: 'auto',
        }}
      />
    </div>
  )
}
