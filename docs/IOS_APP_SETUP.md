# JudgeFinder iOS App - Complete Setup Guide

## Overview

The JudgeFinder iOS app is a Capacitor-wrapped version of our Next.js web application with native iOS features to pass App Store review and provide enhanced user experience.

**Timeline**: 2-3 weeks from start to App Store submission  
**Difficulty**: Moderate  
**Approach**: Capacitor wrapper with 3 key native features

## Current Status

✅ **Phase 1 Complete**: Apple App Site Association (AASA) configured  
✅ **Phase 2 In Progress**: Capacitor iOS project initialized  
⏳ **Phase 3 Pending**: Native features (Push, Share, Widgets)  
⏳ **Phase 4 Pending**: Sign in with Apple & App Store assets  
⏳ **Phase 5 Pending**: TestFlight & submission

## Prerequisites

### Required on macOS Development Machine

1. **Xcode 15+** (from Mac App Store)
2. **CocoaPods** - Install via: `sudo gem install cocoapods`
3. **Apple Developer Account** - $99/year enrollment
4. **Development Certificates & Provisioning Profiles** (via Xcode)

### Already Configured

- ✅ Capacitor installed (`@capacitor/core`, `@capacitor/ios`)
- ✅ Native plugins added (Push, Share, App, Browser, Preferences)
- ✅ iOS project created in `/ios` directory
- ✅ AASA file at `/public/.well-known/apple-app-site-association`
- ✅ Production URL configured: `https://olms-4375-tw501-x421.netlify.app`

## Setup Instructions

### Step 1: Install Xcode & CocoaPods (macOS only)

```bash
# Install Xcode from Mac App Store (14+ GB download)
# After installation, accept license agreement:
sudo xcodebuild -license accept

# Install CocoaPods
sudo gem install cocoapods

# Verify installation
pod --version
```

### Step 2: Install iOS Dependencies

```bash
cd /Users/tannerosterkamp/JudgeFinderPlatform-1
npm install

# Install iOS native dependencies via CocoaPods
cd ios/App
pod install
cd ../..
```

### Step 3: Update AASA File with Your Team ID

1. Get your Apple Team ID:
   - Log in to https://developer.apple.com/account
   - Go to "Membership" section
   - Copy your Team ID (10-character string like "ABC123DEFG")

2. Update the AASA file:

```bash
# Edit: /public/.well-known/apple-app-site-association
# Replace "TEAM_ID" with your actual Apple Team ID in both locations
```

### Step 4: Configure Associated Domains in Xcode

```bash
# Open the iOS project in Xcode
npx cap open ios
```

In Xcode:
1. Select the **App** target (not AppClip)
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** and add **Associated Domains**
4. Add domains:
   - `applinks:olms-4375-tw501-x421.netlify.app`
   - `applinks:judgefinder.io` (when custom domain is ready)

### Step 5: Configure App Bundle & Signing

In Xcode:
1. Select the **App** target
2. **General** tab:
   - Bundle Identifier: `com.judgefinder.ios`
   - Version: `1.0.0`
   - Build: `1`
   - Display Name: `JudgeFinder`
3. **Signing & Capabilities** tab:
   - Select your Team
   - Enable **Automatically manage signing**
   - Confirm provisioning profile is created

## Native Features Implementation

### 1. Push Notifications

**Purpose**: Alert users about saved judges, new decisions, or case updates  
**Location**: To be implemented in Phase 3

```typescript
// Example: lib/ios/PushNotificationManager.ts
import { PushNotifications } from '@capacitor/push-notifications';

export class PushNotificationManager {
  async register() {
    // Request permission
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      await PushNotifications.register();
    }
  }

  async getToken() {
    // Get APNs token for backend registration
    PushNotifications.addListener('registration', (token) => {
      console.log('Push token:', token.value);
      // Send to backend: POST /api/user/push-token
    });
  }
}
```

**Backend Requirements**:
- Store APNs tokens in `user_push_tokens` table
- Send notifications via APNs when:
  - Saved judge has new decisions
  - Court assignment changes
  - Profile updates requested by user

### 2. Share Extension

**Purpose**: Accept shared URLs from Safari and deep-link to judge profiles  
**Location**: To be implemented in Phase 3

**Implementation**:
1. Add Share Extension target in Xcode
2. Parse incoming URLs for judge profiles
3. Deep-link to appropriate in-app page

### 3. iOS Widgets

**Purpose**: Home Screen widgets showing recent decisions or saved judges  
**Location**: To be implemented in Phase 3

**Widget Types**:
- **Small**: Single saved judge with recent decision count
- **Medium**: 2-3 saved judges with quick links
- **Large**: Recent decisions across all saved judges

## Deep Linking Configuration

### Supported URL Patterns

The app handles these deep links:

```
judgefinder://judges/john-doe
judgefinder://compare?judges=john-doe,jane-smith
judgefinder://jurisdictions/orange-county
judgefinder://courts/123
judgefinder://search?q=family+law
```

### Universal Links (HTTPS)

These URLs will open in the app instead of browser:

```
https://judgefinder.io/judges/john-doe
https://judgefinder.io/compare
https://judgefinder.io/jurisdictions/orange-county
```

### Implementation Details

Universal links are handled automatically by iOS when:
1. AASA file is properly served with `Content-Type: application/json`
2. Associated Domains capability is configured
3. App is installed on device

## Sign in with Apple Integration

**Status**: Pending Phase 4  
**Required by**: App Store Review (if any 3rd-party sign-in exists)

### Web Implementation (Recommended)

Since we use Clerk/Supabase auth on the web, we'll add Sign in with Apple as an additional provider:

1. **Enable in Apple Developer Console**:
   - Go to Certificates, Identifiers & Profiles
   - Select your App ID
   - Enable "Sign in with Apple"
   - Configure Return URLs

2. **Add to Clerk** (if using Clerk):
   - Dashboard → Social Connections
   - Enable Apple
   - Configure client ID and private key

3. **Add Button to Login UI**:
   ```tsx
   // In app/login/page.tsx
   <SignInButton provider="apple">
     Continue with Apple
   </SignInButton>
   ```

## App Store Assets Checklist

### Required Assets

- [ ] **App Icon** - 1024x1024px PNG (no transparency)
- [ ] **Screenshots** (per device size):
  - iPhone 6.7" (iPhone 15 Pro Max): 1290x2796px
  - iPhone 6.1" (iPhone 15 Pro): 1179x2556px
  - iPad Pro 12.9": 2048x2732px (optional but recommended)

### Screenshots to Capture

1. **Home/Search**: Judge directory with search
2. **Judge Profile**: Full profile with analytics
3. **Comparison Tool**: Side-by-side judge comparison
4. **AI Analytics**: Bias analysis visualization
5. **Jurisdiction View**: County court listing

### Marketing Assets

- [ ] **App Preview Video** (optional): 15-30 second demo
- [ ] **App Store Description**: 4000 character limit
- [ ] **Keywords**: 100 character comma-separated
- [ ] **Promotional Text**: 170 characters
- [ ] **Support URL**: Link to help documentation
- [ ] **Privacy Policy URL**: Already at `/privacy`

## Build & Test Commands

```bash
# Build the Next.js app
npm run build

# Copy web assets to iOS
npx cap sync ios

# Open in Xcode for build/test
npx cap open ios

# Build from command line (macOS only)
npx cap run ios

# Build for device (requires connected iPhone)
npx cap run ios --target="iPhone 15 Pro"
```

## TestFlight Distribution

### Setup Internal Testing

1. **App Store Connect**:
   - Create new app with bundle ID `com.judgefinder.ios`
   - Go to TestFlight tab
   - Add internal testers (up to 100)

2. **Archive & Upload** (in Xcode):
   - Product → Archive
   - Window → Organizer
   - Select archive → Distribute App → App Store Connect
   - Upload to TestFlight

3. **Configure Test Details**:
   - Add "What to Test" notes for testers
   - Include login credentials for testing
   - List features to focus on

### Testing Checklist

- [ ] Deep links work from Messages/Notes
- [ ] Universal links work from Safari
- [ ] Push notifications receive and display
- [ ] Share extension accepts judge URLs
- [ ] Widgets display and update
- [ ] Sign in with Apple works
- [ ] Auth persists across app restarts
- [ ] External links open in SFSafariViewController
- [ ] Navigation works smoothly
- [ ] No crashes on cold start

## App Store Submission

### Submission Checklist

- [ ] App built in Release mode
- [ ] All capabilities configured and working
- [ ] App Store assets uploaded
- [ ] Age rating completed (likely 4+)
- [ ] App Privacy details filled (see below)
- [ ] Export compliance answered (No encryption)
- [ ] Reviewer notes provided

### App Privacy - Data Collection

Declare these data types:

**Account Data**
- Email Address: Yes (for login)
- User ID: Yes (for analytics)

**Identifiers**
- Device ID: Yes (for push notifications)

**Usage Data**
- Product Interaction: Yes (analytics)
- Other Usage Data: Yes (search queries)

**Diagnostics**
- Crash Data: Yes (Sentry)
- Performance Data: Yes (monitoring)

### App Review Notes

```
IMPORTANT FOR APP REVIEWERS:

This app provides judicial transparency and analytics for California judges.

NATIVE FEATURES TO TEST:

1. Push Notifications:
   - Tap any judge profile
   - Tap "Follow" or "Save" button
   - Allow notifications when prompted
   - Expect notification when judge has updates

2. Share Extension:
   - Open Safari and navigate to: https://judgefinder.io/judges/[any-judge]
   - Tap Share button
   - Select "JudgeFinder" from share sheet
   - App should open directly to that judge profile

3. Widgets:
   - Long-press home screen
   - Tap "+" to add widget
   - Select JudgeFinder
   - Choose widget size
   - Widget displays saved judges or recent decisions

LOGIN:
- Email: reviewer@judgefinder.io
- Password: [Provide secure test account]

The app loads our production web platform with native iOS enhancements.
All judicial data is public information aggregated from California courts.
```

## Compliance & Legal

### Age Rating: 4+
- No objectionable content
- Public legal information
- No gambling, violence, or mature themes

### Export Compliance
- Select "No" for encryption usage
- App uses HTTPS but no custom encryption

### Content Rights
- All data is public court information
- No user-generated content moderation needed

## Common Issues & Solutions

### Issue: AASA File Not Recognized

**Solution**:
1. Verify `Content-Type: application/json` header
2. Test with `curl -I https://yoursite.com/.well-known/apple-app-site-association`
3. Check Team ID matches exactly
4. Wait 24-48 hours for CDN/cache propagation

### Issue: Push Notifications Not Working

**Solution**:
1. Verify APNs entitlements in Xcode
2. Check certificates in Apple Developer Portal
3. Ensure production APNs certificate is used
4. Verify backend sends to correct APNs endpoint

### Issue: Universal Links Open in Safari

**Solution**:
1. Uninstall app completely
2. Reinstall from TestFlight/App Store
3. Test link from different source (not browser address bar)
4. Long-press link → should show "Open in JudgeFinder"

### Issue: App Rejected for 4.2 (Minimum Functionality)

**Solution**:
- Ensure all 3 native features are clearly visible
- Add onboarding that highlights native features
- Provide clear reviewer notes showing how to test features
- Consider adding more native UI elements (tabbar, native modals)

## Timeline & Milestones

### Week 1: Native Features (15-20 hours)
- Day 1-2: Push notifications integration
- Day 3-4: Share extension implementation
- Day 5: Widget development

### Week 2: Polish & Testing (10-15 hours)
- Day 1-2: Sign in with Apple integration
- Day 3: App Store assets creation
- Day 4-5: Internal testing and bug fixes

### Week 3: Submission (5-10 hours)
- Day 1: TestFlight upload and distribution
- Day 2-3: Beta testing with users
- Day 4: App Store submission
- Day 5: Wait for review (typically 24-48 hours)

## Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Universal Links Setup](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app)
- [Push Notifications Guide](https://capacitorjs.com/docs/guides/push-notifications-firebase)

## Support

For questions about the iOS app setup:
- Email: dev@judgefinder.io
- Slack: #ios-app-development
- Documentation: This file

---

**Last Updated**: January 2025  
**Next Review**: After Phase 3 completion
