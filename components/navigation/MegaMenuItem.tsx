'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MegaMenuItem as MegaMenuItemType } from './mega-menu-config'

interface MegaMenuItemProps {
  item: MegaMenuItemType
  onItemClick?: () => void
  isNested?: boolean
}

/**
 * MegaMenuItem Component
 * Individual menu item with optional description and nested children
 * Supports keyboard navigation and WCAG 2.2 Level AA compliance
 */
export function MegaMenuItem({ item, onItemClick, isNested = false }: MegaMenuItemProps) {
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-foreground">
          {item.label}
          <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </div>
        <ul className="space-y-1 pl-3" aria-label={`${item.label} submenu`}>
          {item.children?.map((child, index) => (
            <li key={`${child.href}-${index}`}>
              <MegaMenuItem item={child} onItemClick={onItemClick} isNested />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <Link
        href={item.href}
        onClick={onItemClick}
        className={cn(
          'group block rounded-lg px-3 py-2.5 transition-colors',
          'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isNested && 'py-2'
        )}
        aria-label={item.description ? `${item.label}: ${item.description}` : item.label}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'font-medium text-foreground transition-colors group-hover:text-primary',
                  isNested ? 'text-sm' : 'text-base'
                )}
              >
                {item.label}
              </span>
            </div>
            {item.description && (
              <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

interface MegaMenuSectionProps {
  title: string
  items: MegaMenuItemType[]
  onItemClick?: () => void
}

/**
 * MegaMenuSection Component
 * Groups related menu items under a section heading
 */
export function MegaMenuSection({ title, items, onItemClick }: MegaMenuSectionProps) {
  return (
    <div className="space-y-3">
      <h3
        id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h3>
      <ul
        className="space-y-1"
        aria-labelledby={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        {items.map((item, index) => (
          <li key={`${item.href}-${index}`}>
            <MegaMenuItem item={item} onItemClick={onItemClick} />
          </li>
        ))}
      </ul>
    </div>
  )
}
