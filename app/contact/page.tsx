'use client'

import { motion } from 'framer-motion'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Mail, Database, MapPin, RefreshCw, Shield, Sparkles } from 'lucide-react'
import { AnimatedCard } from '@/components/micro-interactions'

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <AnimatedCard intensity="medium" className="shadow-elevated">
          <CardHeader>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 w-fit">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Get in Touch</span>
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-enterprise-primary to-enterprise-deep bg-clip-text text-transparent">
              Contact Us
            </CardTitle>
          </CardHeader>
          <CardContent>
          <motion.p
            className="text-muted-foreground mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            We're here to help with any questions about JudgeFinder.io or the judicial information we provide.
          </motion.p>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="text-xl font-semibold mb-6">Get in Touch</h2>

              <motion.div
                className="p-6 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                whileHover={{ scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Email</h3>
                    <a
                      href="mailto:tanner@thefiredev.com"
                      className="text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      tanner@thefiredev.com
                    </a>
                    <p className="text-sm text-muted-foreground mt-2">
                      We respond within 24-48 hours
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold mb-6">Common Inquiries</h2>

              <div className="space-y-4">
                {[
                  {
                    icon: Database,
                    title: 'Data Sources',
                    description: 'Our data comes from public court records and official judicial databases.',
                    color: 'text-blue-500',
                    bgColor: 'bg-blue-500/10'
                  },
                  {
                    icon: MapPin,
                    title: 'Coverage',
                    description: 'We currently cover all California state courts with plans to expand.',
                    color: 'text-purple-500',
                    bgColor: 'bg-purple-500/10'
                  },
                  {
                    icon: RefreshCw,
                    title: 'Updates',
                    description: 'Court data is updated daily to ensure accuracy and completeness.',
                    color: 'text-green-500',
                    bgColor: 'bg-green-500/10'
                  },
                  {
                    icon: Shield,
                    title: 'Legal Advice',
                    description: 'JudgeFinder.io provides information only and cannot offer legal advice.',
                    color: 'text-amber-500',
                    bgColor: 'bg-amber-500/10'
                  }
                ].map((item, index) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.title}
                      className="flex items-start gap-3 p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                      whileHover={{ x: 5 }}
                    >
                      <div className={`p-2 rounded-lg ${item.bgColor} flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${item.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-muted-foreground text-sm">{item.description}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>

          <motion.div
            className="mt-8 p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            whileHover={{ scale: 1.01 }}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground text-lg mb-2">
                  For Attorneys & Legal Professionals
                </h3>
                <p className="text-muted-foreground text-sm">
                  Interested in advanced analytics or bulk data access? Contact us at{' '}
                  <a
                    href="mailto:tanner@thefiredev.com"
                    className="text-primary hover:text-primary/80 transition-colors font-semibold"
                  >
                    tanner@thefiredev.com
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        </CardContent>
      </AnimatedCard>
    </motion.div>
    </div>
  )
}