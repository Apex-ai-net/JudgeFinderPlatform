'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

interface PersonalizedGreetingProps {
  userName?: string
  roleInfo: {
    role: string
    label?: string
  }
}

export function PersonalizedGreeting({ userName, roleInfo }: PersonalizedGreetingProps) {
  const [greeting, setGreeting] = useState('')
  const [timeBasedMessage, setTimeBasedMessage] = useState('')

  useEffect(() => {
    const hour = new Date().getHours()

    // Time-based greeting
    if (hour < 12) {
      setGreeting('Good morning')
    } else if (hour < 18) {
      setGreeting('Good afternoon')
    } else {
      setGreeting('Good evening')
    }

    // Time-based contextual message
    if (hour >= 6 && hour < 9) {
      setTimeBasedMessage('Start your day with insights')
    } else if (hour >= 9 && hour < 12) {
      setTimeBasedMessage('Your legal intelligence hub')
    } else if (hour >= 12 && hour < 14) {
      setTimeBasedMessage('Quick midday research')
    } else if (hour >= 14 && hour < 17) {
      setTimeBasedMessage('Afternoon analytics ready')
    } else if (hour >= 17 && hour < 20) {
      setTimeBasedMessage('Evening case review')
    } else if (hour >= 20 && hour < 23) {
      setTimeBasedMessage('Late-night preparation')
    } else {
      setTimeBasedMessage('Burning the midnight oil')
    }
  }, [])

  const displayName = userName || 'there'
  const roleLabel = roleInfo.label || roleInfo.role

  return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {greeting}, {displayName}
            <span className="inline-block ml-2 animate-wave origin-bottom-right">👋</span>
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <p className="text-lg">{timeBasedMessage}</p>
          </div>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Role: <span className="font-medium text-foreground">{roleLabel}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
