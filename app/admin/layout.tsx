import { ReactNode } from 'react'

// Force all admin pages to be dynamically rendered
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function AdminLayout({ children }: { children: ReactNode }): JSX.Element {
  return <>{children}</>
}
