'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import GlassCard from '@/components/ui/GlassCard'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { GradualBlur } from '@/components/ui/GradualBlur'
import { fadeInUp, staggerContainer } from '@/lib/animations/presets'
import { Search, Scale, TrendingUp, Clock } from 'lucide-react'

export default function HomeHero(): JSX.Element {
  return (
    <section className="relative bg-gradient-to-b from-background via-primary/5 to-background overflow-hidden">
      {/* Animated Background Pattern */}
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

      <div className="relative max-w-7xl mx-auto px-4 pt-12 pb-12 lg:pt-24 lg:pb-16">
        <motion.div
          className="grid gap-12 lg:grid-cols-2 lg:items-center"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeInUp}>
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              California Judicial Transparency
            </motion.span>

            <GradualBlur delay={0.2} duration={1}>
              <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
                <span className="block text-foreground">Just Got Assigned a Judge?</span>
                <motion.span
                  className="block mt-2 bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent"
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
                  Get Instant Insights
                </motion.span>
              </h1>
            </GradualBlur>

            <GradualBlur delay={0.4} duration={1}>
              <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Search any California judge to see ruling patterns, judicial tendencies, and case history instantly. Free, private, and updated daily with official court records.
              </p>
            </GradualBlur>

            <GradualBlur delay={0.6} duration={1}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/judges"
                    className="link-reset inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 relative overflow-hidden group"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                    />
                    <Search className="h-5 w-5" />
                    <span className="relative z-10">Find My Judge</span>
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href="/compare"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-border bg-background px-8 py-3.5 text-base font-semibold text-foreground hover:bg-accent transition-all duration-200"
                  >
                    <Scale className="h-5 w-5" />
                    Compare Judges
                  </Link>
                </motion.div>
              </div>
            </GradualBlur>

            <motion.dl
              className="mt-10 grid gap-6 text-sm sm:grid-cols-3"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="space-y-1">
                <dt className="font-semibold text-foreground flex items-center gap-2">
                  <span className="text-primary">✓</span> Statewide Coverage
                </dt>
                <dd className="text-muted-foreground">Every active California judge</dd>
              </motion.div>
              <motion.div variants={fadeInUp} className="space-y-1">
                <dt className="font-semibold text-foreground flex items-center gap-2">
                  <span className="text-primary">✓</span> AI Bias Detection
                </dt>
                <dd className="text-muted-foreground">Six key analytics signals</dd>
              </motion.div>
              <motion.div variants={fadeInUp} className="space-y-1">
                <dt className="font-semibold text-foreground flex items-center gap-2">
                  <span className="text-primary">✓</span> Daily Updates
                </dt>
                <dd className="text-muted-foreground">New decisions synced twice daily</dd>
              </motion.div>
            </motion.dl>
          </motion.div>

          <motion.div className="relative" variants={fadeInUp}>
            <motion.div
              className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-3xl blur-2xl"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />

            <GlassCard className="relative rounded-2xl p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div className="flex items-center gap-3">
                  <motion.span
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-2xl"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    ⚖️
                  </motion.span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">AI Bias Snapshot</p>
                    <p className="text-xs text-muted-foreground">Example Judge · Orange County</p>
                  </div>
                </div>
                <motion.span
                  className="rounded-full bg-success/20 px-3 py-1 text-xs font-semibold text-success"
                  whileHover={{ scale: 1.05 }}
                >
                  <AnimatedCounter end={91} duration={2} />% Coverage
                </motion.span>
              </div>

              <dl className="grid gap-4 px-5 py-6 sm:grid-cols-2">
                <motion.div
                  className="rounded-xl bg-muted/50 p-4 border border-border/50"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Criminal Sentencing Severity
                  </dt>
                  <dd className="mt-2 text-3xl font-bold text-foreground">
                    <AnimatedCounter end={46} duration={2} /> / 100
                  </dd>
                  <p className="mt-2 text-xs text-muted-foreground">
                    More lenient than 54% of CA judges
                  </p>
                </motion.div>

                <motion.div
                  className="rounded-xl bg-muted/50 p-4 border border-border/50"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Scale className="h-3 w-3" />
                    Settlement Preference
                  </dt>
                  <dd className="mt-2 text-3xl font-bold text-foreground">High</dd>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Frequently encourages mediation
                  </p>
                </motion.div>

                <motion.div
                  className="rounded-xl bg-muted/50 p-4 border border-border/50"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Recent Rulings Reviewed
                  </dt>
                  <dd className="mt-2 text-3xl font-bold text-foreground">
                    <AnimatedCounter end={128} duration={2.5} />
                  </dd>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Updated from last 18 months
                  </p>
                </motion.div>

                <motion.div
                  className="rounded-xl bg-muted/50 p-4 border border-border/50"
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Confidence Score
                  </dt>
                  <dd className="mt-2 text-3xl font-bold text-foreground">
                    <AnimatedCounter end={82} duration={2} />%
                  </dd>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Based on data completeness
                  </p>
                </motion.div>
              </dl>

              <div className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
                  Insights by Gemini 1.5 Flash + GPT-4o verification
                </p>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
