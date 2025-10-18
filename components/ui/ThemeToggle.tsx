'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { focusRing } from '@/lib/design-system/focus-states'
import { cn } from '@/lib/utils'

export function ThemeToggle(): JSX.Element {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const buttonClasses = cn(
    'p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors',
    focusRing
  )

  if (!mounted) {
    return (
      <button type="button" className={buttonClasses} aria-label="Toggle theme" disabled>
        <Sun className="h-5 w-5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={buttonClasses}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-pressed={theme === 'dark'}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
