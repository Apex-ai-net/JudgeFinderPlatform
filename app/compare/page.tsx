'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Scale, ArrowLeft, BarChart3 } from 'lucide-react'
import { ComparisonContent } from '@/components/compare/ComparisonContent'
import { fadeInUp, fadeInDown } from '@/lib/animations/presets'

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Gradient */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-background border-b border-border overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
        />

        <div className="relative container mx-auto px-4 py-12">
          {/* Back Link */}
          <motion.div
            variants={fadeInDown}
            initial="initial"
            animate="animate"
          >
            <Link
              href="/judges"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors group mb-8"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Judges Directory</span>
            </Link>
          </motion.div>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.1 }}
            >
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Analytics</span>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.2 }}
            >
              Judge Comparison Tool
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground leading-relaxed"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.3 }}
            >
              Compare up to 3 judges side-by-side. Analyze judicial profiles, decision patterns, consistency scores, and comprehensive AI-powered bias detection.
            </motion.p>

            {/* Stats Row */}
            <motion.div
              className="flex flex-wrap gap-6 mt-8"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Real-time Analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm text-muted-foreground">5-Metric Bias Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                <span className="text-sm text-muted-foreground">California Statewide</span>
              </div>
            </motion.div>
          </div>

          {/* Decorative Scale Icon */}
          <motion.div
            className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 hidden lg:block"
            initial={{ rotate: 0, scale: 1 }}
            animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
          >
            <Scale className="w-64 h-64" />
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <ComparisonContent />
      </div>
    </div>
  )
}