'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronRight, Sparkles } from 'lucide-react'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { TypewriterText } from '@/components/ui/TypewriterText'

const heroMotionInitial = { opacity: 0, y: 20 }
const heroMotionAnimate = { opacity: 1, y: 0 }

interface JudgesDirectoryHeaderProps {
  showSkeleton?: boolean
}

export function JudgesDirectoryHeader({ showSkeleton = false }: JudgesDirectoryHeaderProps) {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3])

  return (
    <section className="relative min-h-[45vh] md:min-h-[60vh] flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-enterprise-primary/10 via-enterprise-deep/10 to-background" />

      <motion.div className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full" style={{ y, opacity }}>
        <motion.div
          className="mb-6 flex items-center justify-center gap-2 text-sm"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="text-foreground font-medium">Judges</span>
        </motion.div>

        <motion.div initial={heroMotionInitial} animate={heroMotionAnimate} transition={{ duration: 0.8 }}>
          <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-enterprise-primary to-enterprise-deep bg-clip-text text-transparent">
              California Judges
            </span>
            <br />
            <span className="text-foreground">
              <TypewriterText text="Directory" />
            </span>
          </h1>
        </motion.div>

        <motion.p
          className="mx-auto mb-8 md:mb-12 max-w-2xl text-base md:text-xl text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Research judicial profiles, decision patterns, and case histories for pattern analysis and transparency
        </motion.p>

        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Comprehensive judge database</span>
        </motion.div>
      </motion.div>

      <ScrollIndicator />
    </section>
  )
}

