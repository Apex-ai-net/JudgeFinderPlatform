'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { HelpCircle } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations/presets'

export function HelpHeroSection(): JSX.Element {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -50])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3])

  return (
    <section className="relative min-h-[50vh] md:min-h-[60vh] flex items-center justify-center overflow-hidden">
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
        className="relative z-10 text-center px-4 max-w-5xl mx-auto"
        style={{ y, opacity }}
      >
        {/* Pulsing Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
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
            We're Here to Help
          </motion.span>
        </motion.div>

        {/* Title with Gradient Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <motion.span
              className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent"
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
              Help &{' '}
            </motion.span>
            <span className="text-foreground">FAQ</span>
          </h1>
        </motion.div>

        {/* Description */}
        <motion.p
          className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Find answers to common questions and get the support you need
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
            <dt className="font-semibold text-foreground">Instant Answers</dt>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <dt className="font-semibold text-foreground">Quick Start Guide</dt>
          </motion.div>
          <motion.div variants={fadeInUp} className="flex items-center gap-2">
            <span className="text-primary">✓</span>
            <dt className="font-semibold text-foreground">24-48hr Support</dt>
          </motion.div>
        </motion.dl>
      </motion.div>
    </section>
  )
}
