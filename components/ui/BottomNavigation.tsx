'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Search, BarChart3, Bookmark, User } from 'lucide-react'
import { useSafeUser } from '@/lib/auth/safe-clerk-components'
import { cn } from '@/lib/utils'
import { tap, transitions } from '@/lib/animations/presets'
import { focusRingInset } from '@/lib/design-system/focus-states'

const BottomNavigation = () => {
  const pathname = usePathname()
  const { isSignedIn } = useSafeUser()

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
    },
    {
      name: 'Search',
      href: '/search',
      icon: Search,
    },
    {
      name: 'Insights',
      href: '/judges',
      icon: BarChart3,
    },
    {
      name: 'Saved',
      href: isSignedIn ? '/dashboard' : '/sign-in',
      icon: Bookmark,
    },
    {
      name: 'Account',
      href: isSignedIn ? '/profile' : '/sign-in',
      icon: User,
    },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="safe-area-pb md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-lg shadow-lg"
      aria-label="Primary"
    >
      <div className="mx-auto flex h-20 w-full max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 items-center justify-center touch-manipulation rounded-2xl',
                focusRingInset
              )}
            >
              <motion.div
                className={cn(
                  'relative flex min-w-[72px] flex-col items-center gap-1.5 rounded-2xl px-3 py-3 transition-colors duration-200',
                  active ? 'bg-primary/15 text-primary' : 'text-muted-foreground active:bg-accent'
                )}
                variants={tap}
                whileTap="whileTap"
                transition={transitions.fast}
              >
                {/* Active Indicator */}
                {active && (
                  <motion.div
                    className="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary"
                    layoutId="activeTab"
                    transition={transitions.spring}
                  />
                )}

                <motion.div
                  animate={active ? { scale: 1.1 } : { scale: 1 }}
                  transition={transitions.smooth}
                >
                  <item.icon
                    className={cn(
                      'h-6 w-6 transition-colors',
                      active ? 'text-primary' : 'text-muted-foreground'
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </motion.div>

                <span
                  className={cn(
                    'text-[11px] font-semibold tracking-tight',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {item.name}
                </span>

                {/* Ripple effect on tap */}
                {active && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-primary/10"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={transitions.smooth}
                  />
                )}
              </motion.div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavigation
