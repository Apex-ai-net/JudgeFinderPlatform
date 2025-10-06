'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Search } from 'lucide-react'
import { SafeSignInButton, SafeUserButton, useSafeUser } from '@/lib/auth/safe-clerk-components'
import NavLogo from './NavLogo'
import { ThemeToggle } from './ThemeToggle'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { fadeInDown, staggerContainer, staggerItem, tap, transitions } from '@/lib/animations/presets'

const NAV_LINKS = [
  { href: '/judges', label: 'Judges' },
  { href: '/courts', label: 'Courts' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/about', label: 'About' },
  { href: '/docs', label: 'Docs' },
  { href: '/help', label: 'Resources' },
]

export function Header() {
  const pathname = usePathname()
  const { isSignedIn } = useSafeUser()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Liquid glass: dynamic blur/opacity based on scroll
  const { scrollY } = useScroll()
  const blur = useTransform(scrollY, [0, 120], [6, 14])
  const blurPx = useTransform(blur, (v) => `blur(${v}px)`)
  const opacity = useTransform(scrollY, [0, 120], [0.6, 0.9])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const closeMenu = () => setIsMenuOpen(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <motion.header
      style={{ backdropFilter: blurPx, opacity }}
      className="sticky top-0 z-50 w-full border-b border-border bg-background/60 supports-[backdrop-filter]:bg-background/50"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <NavLogo />
          <nav className="hidden md:flex md:items-center md:gap-6" aria-label="Main navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative inline-flex items-center text-sm font-medium transition-colors group',
                  isActive(href)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
                {isActive(href) ? (
                  <motion.span
                    className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-primary"
                    layoutId="activeIndicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                ) : (
                  <motion.span
                    className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-primary opacity-0 group-hover:opacity-30"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex md:items-center md:gap-3">
          <Link
            href="/search"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'gap-2 text-muted-foreground hover:text-foreground'
            )}
          >
            <Search className="h-4 w-4" />
            Search
          </Link>
          <ThemeToggle />
          {isSignedIn ? (
            <SafeUserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: '32px', height: '32px' } } }} />
          ) : (
            <SafeSignInButton mode="modal" fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard">
              <span
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'cursor-pointer'
                )}
              >
                Sign in
              </span>
            </SafeSignInButton>
          )}
        </div>

        {/* Mobile menu button removed - users navigate via BottomNavigation component */}
      </div>

      {/* Mobile Navigation - Hidden per client request */}
    </motion.header>
  )
}
