'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Search, LayoutDashboard } from 'lucide-react'
import { SafeSignInButton, SafeUserButton, useSafeUser } from '@/lib/auth/safe-clerk-components'
import NavLogo from './NavLogo'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  fadeInDown,
  staggerContainer,
  staggerItem,
  tap,
  transitions,
} from '@/lib/animations/presets'
import { MegaMenu } from '@/components/navigation/MegaMenu'

// Navigation links with mega menu configuration
const NAV_LINKS = [
  { href: '/judges', label: 'Judges', hasMegaMenu: true, megaMenuType: 'judges' as const },
  { href: '/courts', label: 'Courts', hasMegaMenu: true, megaMenuType: 'courts' as const },
  { href: '/analytics', label: 'Analytics', hasMegaMenu: false },
  { href: '/about', label: 'About', hasMegaMenu: false },
  { href: '/docs', label: 'Docs', hasMegaMenu: false },
  { href: '/help', label: 'Resources', hasMegaMenu: true, megaMenuType: 'resources' as const },
]

export function Header(): JSX.Element {
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
            {NAV_LINKS.map((link) => {
              if (link.hasMegaMenu && link.megaMenuType) {
                return (
                  <MegaMenu
                    key={link.href}
                    type={link.megaMenuType}
                    label={link.label}
                    isActive={isActive(link.href)}
                  />
                )
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'relative inline-flex items-center text-sm font-medium transition-colors group',
                    isActive(link.href)
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {link.label}
                  {isActive(link.href) ? (
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
              )
            })}
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
          {isSignedIn && (
            <Link
              href="/dashboard"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'gap-2 text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          )}
          {isSignedIn ? (
            <SafeUserButton
              signOutRedirectUrl="/"
              appearance={{ elements: { userButtonAvatarBox: { width: '32px', height: '32px' } } }}
            />
          ) : (
            <SafeSignInButton
              mode="modal"
              fallbackRedirectUrl="/dashboard"
              forceRedirectUrl="/dashboard"
            >
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                aria-label="Sign in"
              >
                Sign in
              </button>
            </SafeSignInButton>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center justify-center p-2 md:hidden"
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMenuOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Menu className="h-6 w-6 text-foreground" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <nav className="py-4" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                if (link.hasMegaMenu && link.megaMenuType) {
                  return (
                    <MegaMenu
                      key={link.href}
                      type={link.megaMenuType}
                      label={link.label}
                      isActive={isActive(link.href)}
                      isMobile
                    />
                  )
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMenu}
                    className={cn(
                      'block border-b border-border px-4 py-3 text-base font-medium transition-colors',
                      isActive(link.href)
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}

              {/* Mobile menu actions */}
              <div className="mt-4 space-y-2 border-t border-border px-4 pt-4">
                <Link
                  href="/search"
                  onClick={closeMenu}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'w-full justify-start gap-2'
                  )}
                >
                  <Search className="h-4 w-4" />
                  Search
                </Link>
                {isSignedIn ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'w-full justify-start gap-2'
                      )}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </>
                ) : (
                  <SafeSignInButton
                    mode="modal"
                    fallbackRedirectUrl="/dashboard"
                    forceRedirectUrl="/dashboard"
                  >
                    <button
                      type="button"
                      className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'w-full')}
                      aria-label="Sign in"
                    >
                      Sign in
                    </button>
                  </SafeSignInButton>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
