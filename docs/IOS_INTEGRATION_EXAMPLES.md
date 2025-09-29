# iOS Integration Examples

Quick reference for using iOS native features in JudgeFinder components.

## Basic Usage in Components

### Detect if Running in iOS App

```tsx
import { useIsNativeIOS } from '@/hooks/useIOSApp'

export function MyComponent() {
  const isNative = useIsNativeIOS()
  
  return (
    <div>
      {isNative ? (
        <p>Running in iOS app</p>
      ) : (
        <p>Running in web browser</p>
      )}
    </div>
  )
}
```

### Open External Links in Safari View

```tsx
import { useIOSApp } from '@/hooks/useIOSApp'

export function HelpLink() {
  const { openExternal } = useIOSApp()
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    openExternal('https://help.judgefinder.io/faq')
  }
  
  return (
    <a href="/help" onClick={handleClick}>
      Help & FAQ
    </a>
  )
}
```

### Enable Push Notifications

```tsx
'use client'

import { usePushNotifications } from '@/hooks/useIOSApp'
import { Button } from '@/components/ui/button'

export function SaveJudgeButton({ judgeId }: { judgeId: string }) {
  const { isEnabled, enableNotifications } = usePushNotifications()
  
  const handleSave = async () => {
    // Save judge to bookmarks
    await saveJudge(judgeId)
    
    // Prompt for notifications if not already enabled
    if (!isEnabled) {
      const success = await enableNotifications()
      if (success) {
        console.log('Notifications enabled!')
      }
    }
  }
  
  return (
    <Button onClick={handleSave}>
      💾 Save Judge {!isEnabled && '& Enable Alerts'}
    </Button>
  )
}
```

### Show Native-Only Features

```tsx
import { useIOSApp } from '@/hooks/useIOSApp'

export function JudgeProfileActions() {
  const { isNative } = useIOSApp()
  
  return (
    <div className="flex gap-2">
      <Button>Share</Button>
      <Button>Bookmark</Button>
      
      {isNative && (
        <>
          <Button>Add to Widget</Button>
          <Button>Create Shortcut</Button>
        </>
      )}
    </div>
  )
}
```

## Advanced Integration Examples

### Store User Preferences

```tsx
import { useIOSApp } from '@/hooks/useIOSApp'
import { useEffect, useState } from 'react'

export function NotificationSettings() {
  const { savePreference, getPreference } = useIOSApp()
  const [emailAlerts, setEmailAlerts] = useState(false)
  
  // Load preference on mount
  useEffect(() => {
    const loadPref = async () => {
      const value = await getPreference('email_alerts')
      setEmailAlerts(value === 'true')
    }
    loadPref()
  }, [getPreference])
  
  // Save when changed
  const toggleEmailAlerts = async () => {
    const newValue = !emailAlerts
    setEmailAlerts(newValue)
    await savePreference('email_alerts', String(newValue))
  }
  
  return (
    <label>
      <input 
        type="checkbox" 
        checked={emailAlerts}
        onChange={toggleEmailAlerts}
      />
      Email alerts for saved judges
    </label>
  )
}
```

### Display App Version

```tsx
import { useIOSApp } from '@/hooks/useIOSApp'

export function AppFooter() {
  const { isNative, version, build } = useIOSApp()
  
  return (
    <footer>
      <p>JudgeFinder</p>
      {isNative && version && (
        <p className="text-sm text-gray-500">
          v{version} (Build {build})
        </p>
      )}
    </footer>
  )
}
```

### Conditional Navigation

```tsx
import { useIOSApp } from '@/hooks/useIOSApp'
import { useRouter } from 'next/navigation'

export function ExternalDocLink() {
  const { isNative, openExternal } = useIOSApp()
  const router = useRouter()
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (isNative) {
      // Open in Safari View Controller
      openExternal('https://docs.judgefinder.io')
    } else {
      // Open in new tab
      window.open('https://docs.judgefinder.io', '_blank')
    }
  }
  
  return (
    <a href="https://docs.judgefinder.io" onClick={handleClick}>
      View Documentation
    </a>
  )
}
```

## Deep Link Handling Examples

### Handle Incoming Deep Links

Deep links are automatically handled by the AppBridge. When a user taps a link, the app navigates to the appropriate page.

**Supported patterns:**
- `judgefinder://judges/john-doe` → `/judges/john-doe`
- `https://judgefinder.io/compare?judges=a,b` → `/compare?judges=a,b`
- `https://judgefinder.io/search?q=family+law` → `/search?q=family+law`

**No additional code needed** - navigation happens automatically!

### Share Judge Profile (Future)

When Share Extension is implemented:

```tsx
export function ShareButton({ judgeSlug }: { judgeSlug: string }) {
  const { isNative } = useIOSApp()
  
  const handleShare = async () => {
    const url = `https://judgefinder.io/judges/${judgeSlug}`
    
    if (isNative && 'navigator' in window && 'share' in navigator) {
      // Use native share sheet
      await navigator.share({
        title: 'Judge Profile',
        url: url
      })
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(url)
    }
  }
  
  return (
    <Button onClick={handleShare}>
      Share Profile
    </Button>
  )
}
```

## Push Notification Examples

### Enable on First Save

```tsx
import { usePushNotifications } from '@/hooks/useIOSApp'

export function FollowJudgeButton({ judgeId }: { judgeId: string }) {
  const { isEnabled, enableNotifications } = usePushNotifications()
  const [isFollowing, setIsFollowing] = useState(false)
  
  const handleFollow = async () => {
    // Save to backend
    await fetch('/api/user/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ judgeId })
    })
    
    setIsFollowing(true)
    
    // Prompt for notifications on first follow
    if (!isEnabled) {
      await enableNotifications()
    }
  }
  
  return (
    <Button onClick={handleFollow}>
      {isFollowing ? '✓ Following' : 'Follow Judge'}
    </Button>
  )
}
```

### Show Notification Status

```tsx
import { usePushNotifications } from '@/hooks/useIOSApp'

export function NotificationStatusBanner() {
  const { isEnabled, enableNotifications } = usePushNotifications()
  
  if (isEnabled) return null
  
  return (
    <div className="bg-blue-50 p-4 rounded">
      <p>Enable notifications to get alerts about your saved judges</p>
      <Button onClick={enableNotifications}>
        Enable Notifications
      </Button>
    </div>
  )
}
```

### Disable Notifications

```tsx
import { usePushNotifications } from '@/hooks/useIOSApp'

export function SettingsPage() {
  const { isEnabled, disableNotifications } = usePushNotifications()
  
  return (
    <div>
      <h2>Notification Settings</h2>
      
      {isEnabled ? (
        <div>
          <p>✓ Notifications enabled</p>
          <Button onClick={disableNotifications}>
            Disable Notifications
          </Button>
        </div>
      ) : (
        <p>Notifications are disabled</p>
      )}
    </div>
  )
}
```

## Widget Integration (Future)

When widgets are implemented, you'll be able to:

### Provide Data for Widgets

```tsx
// app/api/widgets/saved-judges/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get user's saved judges for widget display
  const { data: bookmarks } = await supabase
    .from('user_bookmarks')
    .select('judge:judges(*)')
    .eq('user_id', user.id)
    .limit(5)
  
  return NextResponse.json({ judges: bookmarks })
}
```

## Platform Detection Utilities

### Check Platform in Server Components

```tsx
// app/judges/[slug]/page.tsx
export default async function JudgePage({ params }: Props) {
  const userAgent = headers().get('user-agent') || ''
  const isIOS = userAgent.includes('JudgeFinder-iOS')
  
  return (
    <div>
      {isIOS && <IOSOnlyFeature />}
      <JudgeProfile judge={judge} />
    </div>
  )
}
```

### Progressive Enhancement

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useIOSApp } from '@/hooks/useIOSApp'

export function AdaptiveFeature() {
  const { isNative } = useIOSApp()
  const [mounted, setMounted] = useState(false)
  
  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return <DefaultFeature />
  }
  
  return isNative ? <NativeFeature /> : <WebFeature />
}
```

## Testing Tips

### Simulate Native Environment

```tsx
// For testing in browser, you can mock the native environment
if (process.env.NODE_ENV === 'development') {
  (window as any).Capacitor = {
    platform: 'ios',
    isNative: true
  }
}
```

### Console Logging

The iOS managers include extensive logging. Check browser/Xcode console:

```
[AppBridge] Initializing iOS native bridge...
[AppBridge] Deep link handlers registered
[PushNotifications] Registering with APNs...
[PushNotifications] APNs token received: abc123...
```

## Best Practices

### 1. Always Check Native Status

```tsx
// ✅ Good
const { isNative, openExternal } = useIOSApp()
if (isNative) {
  openExternal(url)
}

// ❌ Bad
openExternal(url) // Will fail in web browser
```

### 2. Graceful Degradation

```tsx
// ✅ Good - Works everywhere
const handleShare = async () => {
  if (isNative && navigator.share) {
    await navigator.share({ url })
  } else {
    await navigator.clipboard.writeText(url)
  }
}

// ❌ Bad - Breaks in browser
const handleShare = async () => {
  await navigator.share({ url })
}
```

### 3. User Permissions

```tsx
// ✅ Good - Explain before requesting
<div>
  <p>Get notified when judges you follow have new decisions</p>
  <Button onClick={enableNotifications}>
    Enable Notifications
  </Button>
</div>

// ❌ Bad - Request without context
<Button onClick={enableNotifications}>Click me</Button>
```

### 4. Error Handling

```tsx
// ✅ Good
const handlePush = async () => {
  try {
    const success = await enableNotifications()
    if (!success) {
      toast.error('Notifications were denied')
    }
  } catch (error) {
    console.error('Failed to enable notifications:', error)
    toast.error('Something went wrong')
  }
}
```

## Common Patterns

### Save Judge + Enable Notifications

```tsx
export function SaveJudgeFlow({ judge }: Props) {
  const { enableNotifications } = usePushNotifications()
  const [step, setStep] = useState<'save' | 'notify' | 'done'>('save')
  
  const handleSave = async () => {
    // Step 1: Save judge
    await saveJudge(judge.id)
    setStep('notify')
  }
  
  const handleNotifications = async () => {
    // Step 2: Enable notifications
    await enableNotifications()
    setStep('done')
  }
  
  if (step === 'save') {
    return <Button onClick={handleSave}>Save Judge</Button>
  }
  
  if (step === 'notify') {
    return (
      <div>
        <p>✓ Judge saved!</p>
        <p>Get alerts when they have new decisions?</p>
        <Button onClick={handleNotifications}>Enable Alerts</Button>
        <Button onClick={() => setStep('done')} variant="ghost">
          Maybe Later
        </Button>
      </div>
    )
  }
  
  return <p>✓ All set!</p>
}
```

---

**Last Updated**: January 29, 2025  
**For Questions**: See `docs/IOS_APP_SETUP.md`
