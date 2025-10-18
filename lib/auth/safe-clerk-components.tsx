'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { UserButton, SignInButton, SignOutButton, useUser } from '@clerk/nextjs'

// Type definitions for Clerk user
interface SafeUser {
  isSignedIn: boolean
  user: any | null
  isLoaded: boolean
}

// Default mock data for SSR/build time
const DEFAULT_USER_STATE: SafeUser = {
  isSignedIn: false,
  user: null,
  isLoaded: false,
}

// Check if we're in a browser environment
const isBrowser = () => typeof window !== 'undefined'

// Safe UserButton component
export function SafeUserButton(props: any): JSX.Element {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before mount, show placeholder
  if (!mounted) {
    return (
      <Link
        href="/profile"
        className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center"
      >
        <span className="text-white text-sm">U</span>
      </Link>
    )
  }

  // Use Clerk's UserButton when mounted
  return <UserButton {...props} />
}

// Safe SignInButton component
interface SafeSignInButtonProps {
  mode?: 'modal' | 'redirect'
  children: ReactNode
  fallbackRedirectUrl?: string
  forceRedirectUrl?: string
}

export function SafeSignInButton({
  mode = 'modal',
  children,
  fallbackRedirectUrl = '/dashboard',
  forceRedirectUrl,
}: SafeSignInButtonProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before mount, show fallback link
  if (!mounted) {
    return <Link href="/sign-in">{children}</Link>
  }

  // Use Clerk's SignInButton when mounted
  return (
    <SignInButton
      mode={mode}
      fallbackRedirectUrl={fallbackRedirectUrl}
      forceRedirectUrl={forceRedirectUrl}
    >
      {children}
    </SignInButton>
  )
}

// Safe SignOutButton component (for AdvertiserSidebar)
interface SafeSignOutButtonProps {
  children?: ReactNode
  signOutRedirectUrl?: string
  [key: string]: any
}

export function SafeSignOutButton({
  children,
  signOutRedirectUrl = '/',
  ...rest
}: SafeSignOutButtonProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before mount, show fallback
  if (!mounted) {
    return (
      <button
        className="w-full text-left"
        onClick={() => {
          window.location.href = signOutRedirectUrl
        }}
      >
        {children || 'Sign Out'}
      </button>
    )
  }

  // Use Clerk's SignOutButton when mounted
  // Note: SignOutButton uses redirectUrl prop, not signOutRedirectUrl
  return (
    <SignOutButton redirectUrl={signOutRedirectUrl} {...rest}>
      {children}
    </SignOutButton>
  )
}

// Safe useUser hook - Returns mock data during SSR, real data on client
export function useSafeUser(): SafeUser {
  const [mounted, setMounted] = useState(false)

  // Always call useUser hook (React rules require hooks to be called unconditionally)
  // but wrap the actual Clerk provider in a try-catch for safety
  let clerkUser: SafeUser = DEFAULT_USER_STATE
  try {
    const clerk = useUser()
    clerkUser = {
      isSignedIn: clerk.isSignedIn || false,
      user: clerk.user || null,
      isLoaded: clerk.isLoaded || false,
    }
  } catch (error) {
    // Clerk not available (SSR or not wrapped in ClerkProvider)
    // Return default state
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR or before mount, return default state
  if (!isBrowser() || !mounted) {
    return DEFAULT_USER_STATE
  }

  return clerkUser
}
