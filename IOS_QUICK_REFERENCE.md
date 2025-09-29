# iOS Quick Reference Card 🚀

> Keep this handy while developing the iOS app

## Essential Commands

```bash
# Build & Sync
npm run build && npx cap sync ios

# Open in Xcode
npm run ios:open

# Run on simulator
npm run ios:run

# Run on device
npm run ios:run --target="iPhone 15 Pro"

# Update Capacitor
npm run capacitor:update
```

## Development Workflow

1. **Make changes to web app**
   ```bash
   # Edit files in app/, components/, lib/
   npm run dev  # Test in browser
   ```

2. **Test in iOS simulator**
   ```bash
   npm run build
   npx cap sync ios
   npm run ios:run
   ```

3. **Test on physical device**
   ```bash
   npm run build
   npx cap sync ios
   # In Xcode: Select device → Product → Run
   ```

## File Structure

```
/ios/App/                  # Xcode project
/lib/ios/                  # Native bridges
  ├── AppBridge.ts         # Deep links, lifecycle
  ├── PushNotificationManager.ts  # APNs
  └── APNsService.ts       # Backend notifications

/hooks/useIOSApp.ts        # React hooks
/components/ios/           # iOS-specific components
/app/api/user/push-token/  # Token API
/app/api/notifications/    # Notification API

/docs/IOS_APP_*.md         # Documentation
```

## Using iOS Features in Components

```tsx
// Detect native app
import { useIsNativeIOS } from '@/hooks/useIOSApp'
const isNative = useIsNativeIOS()

// Full iOS API
import { useIOSApp } from '@/hooks/useIOSApp'
const { isNative, pushEnabled, openExternal, enablePush } = useIOSApp()

// Push notifications
import { usePushNotifications } from '@/hooks/useIOSApp'
const { isEnabled, enableNotifications, disableNotifications } = usePushNotifications()
```

## Testing Deep Links

### From Terminal
```bash
# Test custom scheme
xcrun simctl openurl booted "judgefinder://judges/john-doe"

# Test universal link
xcrun simctl openurl booted "https://judgefinder.io/judges/john-doe"
```

### From Device
1. Send link in Messages to yourself
2. Tap the link
3. Should open in JudgeFinder app

## Sending Test Notifications

```bash
# Via API (requires auth)
curl -X POST http://localhost:3005/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new_decision",
    "judgeId": "123",
    "judgeName": "John Doe",
    "decisionCount": 3
  }'
```

## Common Xcode Tasks

### Setup Signing
1. Open Xcode: `npm run ios:open`
2. Select **App** target (not AppClip)
3. **Signing & Capabilities** tab
4. Add your Apple Developer team
5. Enable **Automatically manage signing**

### Add Capability
1. **Signing & Capabilities** tab
2. **+ Capability**
3. Select capability (e.g., Push Notifications)

### View Logs
1. **Window** → **Devices and Simulators**
2. Select device
3. Click **Open Console**
4. Filter: `JudgeFinder` or `[AppBridge]`

### Debug
1. Set breakpoint in Swift files
2. Run app (Cmd+R)
3. Trigger action
4. Debugger pauses at breakpoint

## Environment Variables

Copy `.env.ios.example` to `.env.local` and add:

```bash
# Required for push notifications
APNS_TEAM_ID=ABC123DEFG
APNS_KEY_ID=ABC123DEFG
APNS_BUNDLE_ID=com.judgefinder.ios
APNS_KEY_PATH=/path/to/AuthKey.p8
```

## Troubleshooting Quick Fixes

### App won't build
```bash
# Clean and rebuild
npm run build
rm -rf ios/App/Pods
cd ios/App && pod install
cd ../..
npx cap sync ios
```

### Simulator not working
```bash
# Reset simulator
xcrun simctl shutdown all
xcrun simctl erase all
```

### Deep links not working
1. Check AASA file: `curl https://yoursite.com/.well-known/apple-app-site-association`
2. Verify Team ID matches
3. Uninstall app, reinstall
4. Wait 24-48 hours for CDN

### Push not working
1. Check APNs certificate valid
2. Verify token in database
3. Check Xcode console for errors
4. Use Apple Push Notification Console

## Git Workflow

```bash
# Create feature branch
git checkout -b ios/feature-name

# Commit iOS changes
git add ios/ lib/ios/ hooks/ components/ios/
git commit -m "feat(ios): Add feature name"

# Keep .gitignore updated
# Never commit: *.p8, *.p12, *.mobileprovision
```

## Documentation Shortcuts

| Need | See File |
|------|----------|
| Quick start | `IOS_README.md` |
| Full setup | `docs/IOS_APP_SETUP.md` |
| Code examples | `docs/IOS_INTEGRATION_EXAMPLES.md` |
| Progress tracking | `docs/IOS_APP_PROGRESS.md` |
| Testing checklist | `docs/IOS_TESTING_GUIDE.md` |
| Summary | `IOS_IMPLEMENTATION_SUMMARY.md` |

## Key URLs

- **Apple Developer**: https://developer.apple.com/account
- **App Store Connect**: https://appstoreconnect.apple.com
- **TestFlight**: https://testflight.apple.com
- **Push Console**: https://icloud.developer.apple.com/dashboard

## Performance Benchmarks

| Metric | Target | Tool |
|--------|--------|------|
| Launch time | <3s | Time Profiler |
| Memory | <200MB | Allocations |
| CPU | <40% | Time Profiler |
| FPS | 60 | Core Animation |
| Crashes | <1% | Xcode Organizer |

## Next Steps Cheat Sheet

```
TODAY:
□ Get Apple Developer account
□ Install Xcode
□ Update AASA with Team ID
□ Test basic app in simulator

THIS WEEK:
□ Configure signing
□ Test deep links
□ Enable push notifications
□ Test on physical device

NEXT WEEK:
□ Build Share Extension
□ Build Widgets
□ Sign in with Apple
□ Create screenshots

WEEK 3:
□ TestFlight beta
□ Collect feedback
□ Fix bugs
□ App Store submission
```

## Emergency Contacts

- **Documentation**: All files in `/docs/IOS_*.md`
- **Code Examples**: `docs/IOS_INTEGRATION_EXAMPLES.md`
- **Apple Support**: https://developer.apple.com/support/

---

**Print this and keep it visible!** 📌

**Last Updated**: January 29, 2025
