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

        <motion.button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground hover:bg-accent active:bg-accent/80 md:hidden touch-manipulation"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          variants={tap}
          whileTap="whileTap"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={isMenuOpen ? 'close' : 'open'}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={transitions.fast}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.div>
          </AnimatePresence>
          <span className="sr-only">Toggle navigation</span>
        </motion.button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-md md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transitions.fast}
              onClick={closeMenu}
              aria-hidden="true"
            />
            <motion.div
              id="mobile-navigation"
              className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-border bg-background px-4 pb-10 shadow-2xl md:hidden"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={transitions.smooth}
            >
              <motion.nav
                className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6"
                aria-label="Mobile navigation"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div
                  className="flex items-center justify-between gap-3"
                  variants={staggerItem}
                >
                  <span className="text-sm font-semibold text-muted-foreground">Quick actions</span>
                  <ThemeToggle />
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Link
                    href="/search"
                    onClick={closeMenu}
                    className={cn(
                      buttonVariants({ variant: 'secondary', size: 'lg' }),
                      'w-full justify-between text-base touch-manipulation min-h-[48px]'
                    )}
                  >
                    Start a search
                    <Search className="h-5 w-5" />
                  </Link>
                </motion.div>

                <motion.div className="flex flex-col gap-3" variants={staggerItem}>
                  {NAV_LINKS.map(({ href, label }, index) => (
                    <motion.div
                      key={href}
                      variants={staggerItem}
                      custom={index}
                    >
                      <Link
                        href={href}
                        onClick={closeMenu}
                        className={cn(
                          'block rounded-xl border border-border px-5 py-4 text-base font-medium transition-all touch-manipulation min-h-[52px] flex items-center',
                          isActive(href)
                            ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                            : 'text-foreground hover:bg-accent active:bg-accent/80'
                        )}
                      >
                        {label}
                        {isActive(href) && (
                          <motion.div
                            className="ml-auto h-2 w-2 rounded-full bg-primary"
                            layoutId="activeDot"
                          />
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div
                  className="mt-2 flex flex-col gap-3 border-t border-border pt-6"
                  variants={staggerItem}
                >
                  {isSignedIn ? (
                    <div className="flex items-center justify-between min-h-[44px]">
                      <span className="text-sm font-medium text-muted-foreground">Account</span>
                      <SafeUserButton
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            userButtonAvatarBox: { width: '40px', height: '40px' }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <SafeSignInButton mode="modal" fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard">
                      <span
                        className={cn(
                          buttonVariants({ size: 'lg' }),
                          'cursor-pointer w-full touch-manipulation min-h-[48px]'
                        )}
                      >
                        Sign in to personalize
                      </span>
                    </SafeSignInButton>
                  )}
                </motion.div>
              </motion.nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
