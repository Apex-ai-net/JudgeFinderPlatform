'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Target,
  Calendar,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Megaphone,
  Users,
  TrendingUp,
  ImageIcon,
  Activity,
} from 'lucide-react'
import { SafeSignOutButton } from '@/lib/auth/safe-clerk-components'

const navigation = [
  { name: 'Overview', href: '/dashboard/advertiser', icon: Home },
  { name: 'Campaigns', href: '/dashboard/advertiser/campaigns', icon: Megaphone },
  { name: 'Performance', href: '/dashboard/advertiser/performance', icon: Activity },
  { name: 'Ad Creative', href: '/dashboard/advertiser/creative', icon: ImageIcon },
  { name: 'Ad Spots', href: '/dashboard/advertiser/ad-spots', icon: Target },
  { name: 'Bookings', href: '/dashboard/advertiser/bookings', icon: Calendar },
  { name: 'Billing', href: '/dashboard/advertiser/billing', icon: CreditCard },
]

const bottomNav = [
  { name: 'Settings', href: '/dashboard/advertiser/settings', icon: Settings },
  { name: 'Help & Support', href: '/dashboard/advertiser/support', icon: HelpCircle },
]

export default function AdvertiserSidebar(): JSX.Element {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-surface-sunken text-white">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b border-border/20 px-6">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">JudgeFinder</h2>
            <p className="text-xs text-muted-foreground">Advertiser Portal</p>
          </div>
        </div>

        {/* Main Navigation */}
        <nav aria-label="Advertiser dashboard navigation" className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard/advertiser' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-card hover:text-white'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Navigation */}
        <nav
          aria-label="Account settings navigation"
          className="border-t border-border/20 px-3 py-4"
        >
          {bottomNav.map((item) => {
            const isActive = pathname === item.href

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-card text-white'
                      : 'text-muted-foreground hover:bg-card hover:text-white'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}

          {/* Sign Out */}
          <SafeSignOutButton>
            <button className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-white">
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </SafeSignOutButton>
        </nav>

        {/* User Info */}
        <div className="border-t border-border/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-card flex items-center justify-center">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Advertiser Account</p>
              <p className="text-xs text-muted-foreground truncate">Manage your campaigns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
