'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Briefcase, TrendingUp, FileText, ChevronRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fadeInLeft } from '@/lib/animations/presets'

interface TOCItem {
  id: string
  label: string
  icon: React.ReactNode
}

const tocItems: TOCItem[] = [
  { id: 'profile', label: 'Overview', icon: <User className="w-4 h-4" /> },
  { id: 'professional-background', label: 'Background', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'recent-decisions', label: 'Decisions', icon: <FileText className="w-4 h-4" /> },
]

export function JudgeDetailTOC() {
  const [activeSection, setActiveSection] = useState('profile')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    )

    tocItems.forEach(({ id }) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <motion.button
        className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </motion.button>

      {/* Mobile TOC Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-30 bg-background/95 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-xl p-4 w-64"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">Jump to section</h3>
              <nav className="space-y-1">
                {tocItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      activeSection === item.id
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {activeSection === item.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sticky TOC */}
      <motion.div
        className="hidden lg:block sticky top-24 h-fit"
        variants={fadeInLeft}
        initial="initial"
        animate="animate"
      >
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Menu className="w-4 h-4" />
            On this page
          </h3>
          <nav className="space-y-1">
            {tocItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                  activeSection === item.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className={cn(
                  'flex-shrink-0',
                  activeSection === item.id && 'animate-pulse'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {activeSection === item.id && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </nav>

          {/* Progress indicator */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Reading progress</span>
              <span>{Math.round((tocItems.findIndex((item) => item.id === activeSection) + 1) / tocItems.length * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{
                  width: `${((tocItems.findIndex((item) => item.id === activeSection) + 1) / tocItems.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          className="mt-4 bg-card border border-border rounded-xl p-4 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </h4>
          <div className="space-y-2">
            <motion.button
              className="w-full px-3 py-2 text-sm font-medium text-left rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Compare Judges
            </motion.button>
            <motion.button
              className="w-full px-3 py-2 text-sm font-medium text-left rounded-lg bg-muted text-foreground hover:bg-accent transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Share Profile
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}