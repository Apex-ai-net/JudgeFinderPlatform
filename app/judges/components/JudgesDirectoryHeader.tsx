'use client'

import Link from 'next/link'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronRight, TrendingUp, Clock, Users } from 'lucide-react'
import { ScrollIndicator } from '@/components/ui/ScrollIndicator'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { fadeInUp, staggerContainer } from '@/lib/animations/presets'

interface JudgesDirectoryHeaderProps {
  showSkeleton?: boolean
}

export function JudgesDirectoryHeader({
  showSkeleton = false,
}: JudgesDirectoryHeaderProps): JSX.Element {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3])

  return (
    <section className="relative min-h-[45vh] md:min-h-[60vh] flex items-center justify-center overflow-hidden">
      {/* Animated Background Pattern - Matching Homepage */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 20,
          ease: 'linear',
        }}
      />

      <motion.div
        className="relative z-10 text-center px-4 max-w-7xl mx-auto w-full"
        style={{ y, opacity }}
      >
        {/* Breadcrumb */}
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

        {/* Pulsing Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-6"
        >
          <motion.span
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Comprehensive Judicial Database
          </motion.span>
        </motion.div>

        {/* Title with Gradient Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight leading-tight">
            <motion.span
              className="block bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0%', '100%', '0%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ backgroundSize: '200% 200%' }}
            >
              California Judges
            </motion.span>
            <span className="block text-foreground mt-2">Directory</span>
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          className="mx-auto mb-10 max-w-2xl text-base md:text-xl text-muted-foreground leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Search and explore detailed profiles, ruling patterns, and case histories for every active
          California judge
        </motion.p>

        {/* Feature Highlights */}
        <motion.dl
          className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm max-w-3xl mx-auto"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp} className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <dt className="font-semibold text-foreground">
              <AnimatedCounter end={2800} duration={2} />+ Active Judges
            </dt>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <dt className="font-semibold text-foreground">Updated Daily</dt>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <dt className="font-semibold text-foreground">Free Access</dt>
          </motion.div>
        </motion.dl>

        {/* Simple Stats Display */}
        <motion.div
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <motion.div
            className="rounded-xl bg-muted/50 p-4 border border-border/50"
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Users className="h-3 w-3" />
              <span className="uppercase tracking-wide">Courts Covered</span>
            </div>
            <div className="text-2xl font-bold text-foreground">
              <AnimatedCounter end={58} duration={2} />
            </div>
          </motion.div>

          <motion.div
            className="rounded-xl bg-muted/50 p-4 border border-border/50"
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <TrendingUp className="h-3 w-3" />
              <span className="uppercase tracking-wide">Analytics Signals</span>
            </div>
            <div className="text-2xl font-bold text-foreground">6 Types</div>
          </motion.div>

          <motion.div
            className="rounded-xl bg-muted/50 p-4 border border-border/50"
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
              <Clock className="h-3 w-3" />
              <span className="uppercase tracking-wide">Sync Frequency</span>
            </div>
            <div className="text-2xl font-bold text-foreground">2x Daily</div>
          </motion.div>
        </motion.div>
      </motion.div>

      <ScrollIndicator />
    </section>
  )
}
