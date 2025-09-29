/**
 * iOS Features Banner
 * 
 * Promotes iOS-specific features to users running the native app.
 * Shows onboarding for push notifications, widgets, and share extension.
 */

'use client'

import { useState, useEffect } from 'react'
import { useIOSApp } from '@/hooks/useIOSApp'
import { Button } from '@/components/ui/button'
import { 
  BellIcon, 
  ShareIcon, 
  LayoutGridIcon, 
  XIcon 
} from 'lucide-react'

export function IOSFeaturesBanner() {
  const { isNative, pushEnabled, enablePush } = useIOSApp()
  const [isDismissed, setIsDismissed] = useState(false)
  const [currentFeature, setCurrentFeature] = useState(0)
  
  // Only show in native iOS app
  if (!isNative || isDismissed) return null
  
  const features = [
    {
      icon: BellIcon,
      title: 'Get Instant Alerts',
      description: 'Receive push notifications when saved judges have new decisions or updates',
      action: pushEnabled ? null : {
        label: 'Enable Notifications',
        handler: enablePush
      }
    },
    {
      icon: LayoutGridIcon,
      title: 'Add Widgets',
      description: 'See your saved judges and recent decisions right on your home screen',
      action: {
        label: 'Learn How',
        handler: () => window.location.href = '/help/widgets'
      }
    },
    {
      icon: ShareIcon,
      title: 'Quick Share',
      description: 'Share judge profiles directly from Safari using the share button',
      action: {
        label: 'Try It',
        handler: () => window.location.href = '/help/sharing'
      }
    }
  ]
  
  const feature = features[currentFeature]
  const FeatureIcon = feature.icon
  
  function handleNext() {
    if (currentFeature < features.length - 1) {
      setCurrentFeature(currentFeature + 1)
    } else {
      handleDismiss()
    }
  }
  
  function handleDismiss() {
    setIsDismissed(true)
    localStorage.setItem('ios-features-banner-dismissed', 'true')
  }
  
  // Check if already dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem('ios-features-banner-dismissed')
    if (dismissed) {
      setIsDismissed(true)
    }
  }, [])
  
  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 dark:border-blue-900 dark:from-blue-950 dark:to-indigo-950">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 rounded-full p-1 hover:bg-white/50 dark:hover:bg-black/50"
        aria-label="Dismiss"
      >
        <XIcon className="h-4 w-4" />
      </button>
      
      {/* Feature content */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
          <FeatureIcon className="h-6 w-6" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {feature.title}
          </h3>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
            {feature.description}
          </p>
          
          <div className="mt-4 flex items-center gap-3">
            {feature.action && (
              <Button
                onClick={feature.action.handler}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {feature.action.label}
              </Button>
            )}
            
            <button
              onClick={handleNext}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              {currentFeature < features.length - 1 ? 'Next' : 'Got it'}
            </button>
            
            {/* Progress dots */}
            <div className="ml-auto flex gap-1">
              {features.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${
                    index === currentFeature 
                      ? 'bg-blue-600 dark:bg-blue-400' 
                      : 'bg-blue-300 dark:bg-blue-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
