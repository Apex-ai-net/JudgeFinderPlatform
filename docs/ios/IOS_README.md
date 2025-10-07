# JudgeFinder iOS App 📱

> **Status**: Foundation Complete (48%) | 8-12 days to App Store Launch

Transform your JudgeFinder web platform into a native iOS app with push notifications, widgets, and App Store distribution.

## 🚀 Quick Start

### For Developers (macOS Required)

```bash
# 1. Install dependencies
npm install

# 2. Build Next.js app
npm run build

# 3. Sync to iOS
npm run ios:sync

# 4. Open in Xcode
npm run ios:open

# 5. Run on simulator
npm run ios:run
```

### For Non-Developers

1. **Get Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com
2. **Hire iOS Developer** or use these docs to build yourself
3. **Estimated Timeline**: 1.5-2.5 weeks to launch

## ✅ What's Done (Phases 1-2)

- ✅ Capacitor iOS project initialized
- ✅ Universal links configured (AASA file)
- ✅ Deep linking implemented
- ✅ Push notification framework ready
- ✅ Native bridge services built
- ✅ React hooks for iOS features
- ✅ Backend API for push tokens
- ✅ Database migration prepared
- ✅ Comprehensive documentation written

**You can test the app shell right now** with `npm run ios:run`!

## ⏳ What's Left (Phases 3-5)

### Week 1: Native Features (18-26 hours)
- Push notification backend service
- Share extension (accept URLs from Safari)
- iOS widgets (show saved judges on home screen)

### Week 2: App Store Prep (14-20 hours)
- Sign in with Apple integration
- Native settings screen
- App icon & screenshots
- App Store metadata

### Week 3: Launch (6-12 hours)
- TestFlight beta testing
- Bug fixes
- App Store submission
- Wait for review (1-2 days)

## 📚 Documentation

| File | Purpose |
|------|---------|
| `docs/IOS_APP_SETUP.md` | Complete setup guide |
| `docs/IOS_APP_PROGRESS.md` | Current status & roadmap |
| `docs/IOS_INTEGRATION_EXAMPLES.md` | Code examples |
| This file | Quick reference |

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│         Next.js Web App                 │
│    (runs inside WKWebView)              │
└─────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│      Capacitor Native Bridge            │
│  • AppBridge (deep links, lifecycle)    │
│  • PushNotificationManager (APNs)       │
│  • React Hooks (useIOSApp, etc.)        │
└─────────────────────────────────────────┘
              ↕
┌─────────────────────────────────────────┐
│        iOS Native Features              │
│  • Share Extension                      │
│  • Home Screen Widgets                  │
│  • Push Notifications                   │
│  • Universal Links                      │
└─────────────────────────────────────────┘
```

## 🔌 Key Integrations

### Using iOS Features in Components

```tsx
import { useIOSApp } from '@/hooks/useIOSApp'

export function MyComponent() {
  const { isNative, openExternal, enablePush } = useIOSApp()
  
  // Detect iOS app
  if (isNative) {
    // Show native-only features
  }
  
  // Open external link
  await openExternal('https://help.judgefinder.io')
  
  // Enable push notifications
  await enablePush()
}
```

See `docs/IOS_INTEGRATION_EXAMPLES.md` for more examples.

## 🎯 Next Actions

### If You Have macOS + Xcode

1. **Get Your Apple Team ID**
   - Log in to https://developer.apple.com/account
   - Go to "Membership"
   - Copy your 10-character Team ID

2. **Update AASA File**
   ```bash
   # Edit: public/.well-known/apple-app-site-association
   # Replace "TEAM_ID" with your actual Team ID
   ```

3. **Configure Xcode**
   ```bash
   npm run ios:open
   ```
   - Select App target
   - Signing & Capabilities → Add Team
   - Add Associated Domains capability
   - Add domain: `applinks:olms-4375-tw501-x421.netlify.app`

4. **Test on Simulator**
   ```bash
   npm run ios:run
   ```

### If You Don't Have macOS

You'll need to either:
1. **Hire an iOS developer** (budget: $5K-$10K)
2. **Use a Mac build service** (like MacStadium)
3. **Wait until you get access to a Mac**

iOS apps **require** macOS and Xcode. No workarounds.

## 💰 Cost Breakdown

| Item | Cost | Required |
|------|------|----------|
| Apple Developer Account | $99/year | Yes |
| macOS Computer | $0-$2,000 | Yes |
| iOS Developer (if hiring) | $5K-$10K | Optional |
| Push Notification Service | $0 (DIY) | Yes |
| TestFlight Distribution | $0 (included) | Yes |
| **Total** | **$99-$12K** | - |

## 🎨 App Store Assets Needed

- [ ] App Icon (1024x1024)
- [ ] iPhone Screenshots (6.7" & 6.1")
- [ ] iPad Screenshots (optional)
- [ ] App Description (4000 chars)
- [ ] Keywords (100 chars)
- [ ] Privacy Policy (already at /privacy)
- [ ] Support URL (already at /help)

## 🔐 Required Accounts & Credentials

- [x] Apple Developer Account
- [x] App ID: `com.judgefinder.ios`
- [ ] APNs Certificate (for push notifications)
- [ ] App Store Connect access
- [ ] TestFlight access

## 📈 Success Metrics

After launch, track:
- App downloads
- Push notification opt-in rate
- Daily active users (DAU)
- Widget installations
- Share extension usage
- Crash rate
- App Store rating

## 🐛 Troubleshooting

### "xcode-select: error: tool 'xcodebuild' requires Xcode"
**Solution**: Install Xcode from Mac App Store (14+ GB)

### "Could not find CocoaPods"
**Solution**: `sudo gem install cocoapods`

### "No provisioning profiles found"
**Solution**: 
1. Open Xcode
2. Preferences → Accounts → Add Apple ID
3. Let Xcode create profiles automatically

### "AASA file not recognized"
**Solution**: 
1. Verify Content-Type is `application/json`
2. Wait 24-48 hours for CDN cache
3. Test with: `curl -I https://yoursite.com/.well-known/apple-app-site-association`

### Universal links open in Safari instead of app
**Solution**:
1. Uninstall app completely
2. Reinstall from TestFlight
3. Test link from Notes app (not Safari address bar)

## 🤝 Contributing

iOS app contributions welcome! See `CONTRIBUTING.md`.

**Key areas needing work**:
- Share extension implementation
- Widget development
- Push notification backend
- TestFlight beta testing
- App Store screenshots

## 📞 Support

- **Setup Questions**: See `docs/IOS_APP_SETUP.md`
- **Code Examples**: See `docs/IOS_INTEGRATION_EXAMPLES.md`
- **Progress Tracking**: See `docs/IOS_APP_PROGRESS.md`
- **Email**: dev@judgefinder.io

## 🎓 Learning Resources

New to iOS development? Start here:

1. [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
2. [Apple Developer Docs](https://developer.apple.com/documentation/)
3. [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
4. [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## 🚢 Launch Checklist

- [ ] Phase 1: Mobile Readiness ✅
- [ ] Phase 2: Capacitor Setup ✅
- [ ] Phase 3: Native Features ⏳
- [ ] Phase 4: App Store Prep ⏳
- [ ] Phase 5: Testing & Launch ⏳
- [ ] App Review Approval 🎉
- [ ] Public Release 🚀

## 📊 Current Progress

```
████████████░░░░░░░░░░░░░░ 48% Complete

Phases 1-2: ██████████ 100%
Phase 3:    ████░░░░░░  40%
Phase 4:    ░░░░░░░░░░   0%
Phase 5:    ░░░░░░░░░░   0%
```

**Estimated Time Remaining**: 38-58 hours (8-12 days)

---

**Built with**: Next.js 15 | Capacitor 7 | TypeScript | Tailwind CSS  
**Platform**: iOS 15+ | iPhone & iPad  
**Status**: 🔄 Active Development  
**Last Updated**: January 29, 2025

**Ready to build?** Start with `docs/IOS_APP_SETUP.md` 📱
