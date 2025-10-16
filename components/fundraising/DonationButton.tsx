'use client'

import { useState } from 'react'
import { HeartHandshake, ArrowRight } from 'lucide-react'
import { AnimatedButton } from '@/components/micro-interactions'
import { motion } from 'framer-motion'

interface DonationButtonProps {
  amount: number
  variant?: 'header' | 'footer' | 'inline'
  className?: string
}

export function DonationButton({
  amount,
  variant = 'inline',
  className,
}: DonationButtonProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDonate(): Promise<void> {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/donations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Unable to start donation checkout')
      }

      const data = await response.json()
      if (data.url) {
        window.location.assign(data.url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Donation failed')
    } finally {
      setLoading(false)
    }
  }

  const baseClasses =
    variant === 'header'
      ? 'inline-flex items-center gap-2 rounded-full border border-secondary-foreground/40 bg-secondary/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-secondary-foreground transition hover:bg-secondary/50'
      : variant === 'footer'
        ? 'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/20'
        : 'inline-flex items-center gap-2 rounded-full border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20'

  const HeartIcon = () => (
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <HeartHandshake className="h-4 w-4" aria-hidden />
    </motion.div>
  )

  return (
    <div className={className}>
      <AnimatedButton
        onClick={handleDonate}
        disabled={loading}
        loading={loading}
        variant={variant === 'header' ? 'outline' : 'primary'}
        size="md"
        icon={<HeartIcon />}
        iconPosition="left"
        className={baseClasses}
      >
        <span>Support transparency</span>
        <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden />
      </AnimatedButton>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  )
}
