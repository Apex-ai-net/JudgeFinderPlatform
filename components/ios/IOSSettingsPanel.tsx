/**
 * iOS Settings Panel
 * 
 * Native settings screen for iOS app with notification preferences,
 * app info, and links to policies.
 */

'use client'

import { useState, useEffect } from 'react'
import { useIOSApp, usePushNotifications } from '@/hooks/useIOSApp'
import { Button } from '@/components/ui/button'
import { 
  BellIcon, 
  ExternalLinkIcon,
  InfoIcon,
  ShieldIcon,
  FileTextIcon,
  MailIcon
} from 'lucide-react'

export function IOSSettingsPanel() {
  const { isNative, version, build, openExternal } = useIOSApp()
  const { isEnabled, enableNotifications, disableNotifications } = usePushNotifications()
  const [isLoading, setIsLoading] = useState(false)
  
  // Only show in native iOS app
  if (!isNative) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-muted-foreground">
          iOS-specific settings are only available in the native app.
        </p>
      </div>
    )
  }
  
  async function handleToggleNotifications() {
    setIsLoading(true)
    try {
      if (isEnabled) {
        await disableNotifications()
      } else {
        await enableNotifications()
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Notifications Section */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <BellIcon className="h-5 w-5" />
            Notifications
          </h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                Get alerts about saved judges, new decisions, and updates
              </p>
            </div>
            
            <Button
              onClick={handleToggleNotifications}
              disabled={isLoading}
              variant={isEnabled ? 'default' : 'outline'}
              size="sm"
            >
              {isEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
          
          {isEnabled && (
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ You'll receive notifications for your saved judges
              </p>
            </div>
          )}
          
          {!isEnabled && (
            <div className="rounded-md bg-primary/5 p-3 dark:bg-blue-950">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Enable notifications to stay updated on judge activity
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Legal & Privacy Section */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" />
            Legal & Privacy
          </h3>
        </div>
        
        <div className="divide-y divide-border">
          <button
            onClick={() => window.location.href = '/privacy'}
            className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileTextIcon className="h-5 w-5 text-muted-foreground" />
              <span>Privacy Policy</span>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <button
            onClick={() => window.location.href = '/terms'}
            className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileTextIcon className="h-5 w-5 text-muted-foreground" />
              <span>Terms of Service</span>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      
      {/* Support Section */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MailIcon className="h-5 w-5" />
            Support
          </h3>
        </div>
        
        <div className="divide-y divide-border">
          <button
            onClick={() => window.location.href = '/help'}
            className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <InfoIcon className="h-5 w-5 text-muted-foreground" />
              <span>Help & FAQ</span>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
          </button>
          
          <button
            onClick={() => window.location.href = '/contact'}
            className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MailIcon className="h-5 w-5 text-muted-foreground" />
              <span>Contact Support</span>
            </div>
            <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
      
      {/* App Information */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            App Information
          </h3>
        </div>
        
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">App Name</span>
            <span className="font-medium">JudgeFinder</span>
          </div>
          
          {version && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{version}</span>
            </div>
          )}
          
          {build && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Build</span>
              <span className="font-medium">{build}</span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform</span>
            <span className="font-medium">iOS</span>
          </div>
        </div>
      </div>
      
      {/* About */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground text-center">
          JudgeFinder provides transparent access to California judicial information.
          All data is public record from official court sources.
        </p>
      </div>
    </div>
  )
}
