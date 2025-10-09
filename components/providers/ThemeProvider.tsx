'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { PropsWithChildren } from 'react'

type Attribute = 'class' | 'data-theme' | 'data-mode'

interface ThemeProviderProps extends PropsWithChildren {
  attribute?: Attribute | Attribute[]
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
  storageKey?: string
  themes?: string[]
  forcedTheme?: string
  value?: { [themeName: string]: string }
  nonce?: string
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps): JSX.Element {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
