'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, LucideIcon } from 'lucide-react'

interface CourtGroupAccordionProps {
  title: string
  icon: LucideIcon
  iconColor: string
  iconBgColor: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CourtGroupAccordion({
  title,
  icon: Icon,
  iconColor,
  iconBgColor,
  count,
  defaultOpen = false,
  children,
}: CourtGroupAccordionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors group"
        aria-expanded={isOpen}
        aria-controls={`accordion-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgColor}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {count !== undefined && (
            <span className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {count}
            </span>
          )}
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="text-muted-foreground group-hover:text-foreground transition-colors"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`accordion-${title.replace(/\s+/g, '-').toLowerCase()}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
