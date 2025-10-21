'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MegaMenuSection } from './MegaMenuItem'
import { MegaMenuType, megaMenuConfig } from './mega-menu-config'
import { dropdown } from '@/lib/animations/presets'

interface MegaMenuProps {
  type: MegaMenuType
  label: string
  isActive?: boolean
  isMobile?: boolean
}

/**
 * MegaMenu Component
 * Desktop: Hover-activated dropdown with smooth animations
 * Mobile: Accordion-style expandable menu
 *
 * Features:
 * - Keyboard accessible (Tab, Enter, Esc)
 * - Click-outside to close
 * - WCAG 2.2 Level AA compliant
 * - Smooth Framer Motion animations
 */
export function MegaMenu({ type, label, isActive = false, isMobile = false }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const sections = megaMenuConfig[type]

  // Close on click outside
  useEffect(() => {
    if (!isOpen || isMobile) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, isMobile])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleMouseEnter = () => {
    if (isMobile) return
    clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    if (isMobile) return
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  const handleClick = () => {
    if (isMobile) {
      setIsOpen(!isOpen)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(!isOpen)
    }
  }

  const handleItemClick = () => {
    setIsOpen(false)
  }

  // Desktop mega menu
  if (!isMobile) {
    return (
      <div
        ref={menuRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          className={cn(
            'relative inline-flex items-center gap-1 text-sm font-medium transition-colors group',
            isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label={`${label} menu`}
        >
          {label}
          <ChevronDown
            className={cn('h-3 w-3 transition-transform duration-200', isOpen && 'rotate-180')}
            aria-hidden="true"
          />
          {isActive && (
            <motion.span
              className="absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-primary"
              layoutId="activeIndicator"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={dropdown}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2"
              role="menu"
              aria-label={`${label} menu`}
            >
              <div className="rounded-lg border border-border bg-background shadow-xl">
                <div
                  className={cn(
                    'grid gap-6 p-6',
                    sections.length === 2 && 'grid-cols-2',
                    sections.length === 3 && 'grid-cols-3',
                    sections.length === 4 && 'grid-cols-2 lg:grid-cols-4',
                    sections.length > 4 && 'grid-cols-2 lg:grid-cols-3'
                  )}
                  style={{ minWidth: '480px', maxWidth: '720px' }}
                >
                  {sections.map((section) => (
                    <MegaMenuSection
                      key={section.id}
                      title={section.label}
                      items={section.items}
                      onItemClick={handleItemClick}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Mobile accordion menu
  return (
    <div className="border-b border-border">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-accent"
        aria-expanded={isOpen}
        aria-controls={`mobile-menu-${type}`}
      >
        {label}
        <ChevronDown
          className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={`mobile-menu-${type}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden bg-accent/30"
          >
            <div className="space-y-4 px-4 py-4">
              {sections.map((section) => (
                <MegaMenuSection
                  key={section.id}
                  title={section.label}
                  items={section.items}
                  onItemClick={handleItemClick}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
