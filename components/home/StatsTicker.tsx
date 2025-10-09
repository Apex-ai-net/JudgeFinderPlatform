'use client'

import { motion } from 'framer-motion'
import { Database, Gavel, Building2, TrendingUp } from 'lucide-react'
import { AnimatedNumber } from '@/components/micro-interactions'

interface StatProps {
  icon: React.ReactNode
  value: number
  label: string
  delay: number
}

function Stat({ icon, value, label, delay }: StatProps): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col items-center gap-2"
    >
      <div className="flex items-center gap-2">
        <div className="text-primary">{icon}</div>
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          <AnimatedNumber value={value} />
        </div>
      </div>
      <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
    </motion.div>
  )
}

export function StatsTicker(): JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative py-8 md:py-12"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />

      <div className="relative max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <Stat
            icon={<Gavel className="w-5 h-5 md:w-6 md:h-6" />}
            value={1903}
            label="California Judges"
            delay={0.1}
          />
          <Stat
            icon={<Database className="w-5 h-5 md:w-6 md:h-6" />}
            value={441729}
            label="Case Records"
            delay={0.2}
          />
          <Stat
            icon={<Building2 className="w-5 h-5 md:w-6 md:h-6" />}
            value={134}
            label="CA Courts"
            delay={0.3}
          />
          <Stat
            icon={<TrendingUp className="w-5 h-5 md:w-6 md:h-6" />}
            value={100}
            label="Daily Updates"
            delay={0.4}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Updated daily with official court records • Always free
        </motion.p>
      </div>
    </motion.div>
  )
}
