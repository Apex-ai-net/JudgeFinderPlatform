# iOS App Setup Checklist - Step-by-Step Guide

## Current Status
✅ Phase 1: Mobile Readiness (100%)  
✅ Phase 2: Capacitor Setup (100%)  
✅ Phase 3: Native Features (100%)  
⏳ **Now Starting: Phase 4 Setup**

---

## Prerequisites Check

### 1. macOS System Requirements
- [ ] macOS 12 (Monterey) or newer
- [ ] At least 20GB free disk space (for Xcode)
- [ ] Admin access on Mac

### 2. Apple Developer Account
- [ ] Sign up at https://developer.apple.com/programs/
- [ ] Pay $99/year enrollment fee
- [ ] Wait for account approval (usually 24-48 hours)

### 3. Development Tools
- [ ] Xcode 15+ installed from Mac App Store
- [ ] Xcode Command Line Tools installed
- [ ] CocoaPods installed

---

## Part 1: Environment Setup (30 minutes)

### Step 1: Install Xcode (if not already installed)

```bash
# Check if Xcode is installed
xcodebuild -version

# If not installed:
# 1. Open Mac App Store
# 2. Search "Xcode"
# 3. Click "Get" (14GB download, takes 30-60 minutes)
# 4. Wait for installation to complete
```

### Step 2: Install Command Line Tools

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Accept license
sudo xcodebuild -license accept

# Verify installation
xcode-select -p
# Should output: /Applications/Xcode.app/Contents/Developer
```

### Step 3: Install CocoaPods

```bash
# Install CocoaPods (required for iOS dependencies)
sudo gem install cocoapods

# Verify installation
pod --version
# Should output version number (e.g., 1.14.3)
```

### Step 4: Install iOS Pods

```bash
# Navigate to iOS project
cd /Users/tannerosterkamp/JudgeFinderPlatform-1/ios/App

# Install dependencies
pod install

# Go back to project root
cd ../..
```

---

## Part 2: Apple Developer Portal Setup (20 minutes)

### Step 5: Get Your Apple Team ID

1. Go to https://developer.apple.com/account
2. Sign in with your Apple ID
3. Click **"Membership"** in left sidebar
4. Copy your **Team ID** (10-character string like "ABC123DEFG")
5. Save it - you'll need this multiple times

**Your Team ID**: `________________` (write it here)

### Step 6: Update AASA File with Team ID

```bash
# Open AASA file
# File: /Users/tannerosterkamp/JudgeFinderPlatform-1/public/.well-known/apple-app-site-association

# Find line with "TEAM_ID" and replace with your actual Team ID
# Example: Change "TEAM_ID.com.judgefinder.ios" 
# to "ABC123DEFG.com.judgefinder.ios"
```

**Action Required**: Edit the AASA file and replace both instances of "TEAM_ID"

### Step 7: Create App ID (Bundle Identifier)

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **"+"** button
3. Select **"App IDs"** → Continue
4. Select **"App"** → Continue
5. Configure:
   - **Description**: JudgeFinder iOS
   - **Bundle ID**: Explicit → `com.judgefinder.ios`
   - **Capabilities**: Check these boxes:
     - ✅ Push Notifications
     - ✅ Associated Domains
     - ✅ App Groups
6. Click **"Continue"** → **"Register"**

---

## Part 3: Xcode Project Configuration (30 minutes)

### Step 8: Open Xcode Project

```bash
# Open project in Xcode
npm run ios:open

# Or manually:
# open ios/App/App.xcworkspace
```

### Step 9: Configure Signing & Capabilities

**In Xcode**:

1. **Select "App" target** (in left sidebar under TARGETS)
2. Go to **"Signing & Capabilities"** tab

3. **General Signing**:
   - ✅ Check "Automatically manage signing"
   - **Team**: Select your Apple Developer team
   - **Bundle Identifier**: Should show `com.judgefinder.ios`
   
4. **Add Capabilities** (click **"+ Capability"**):
   
   a. **Push Notifications**:
      - Click "+" → Search "Push Notifications" → Add
   
   b. **Associated Domains**:
      - Click "+" → Search "Associated Domains" → Add
      - Click "+" under Domains
      - Add: `applinks:olms-4375-tw501-x421.netlify.app`
      - (Later add: `applinks:judgefinder.io` when you have custom domain)
   
   c. **App Groups**:
      - Click "+" → Search "App Groups" → Add
      - Click "+" under App Groups
      - Add: `group.com.judgefinder.ios`

5. **Verify Provisioning Profile** created automatically

### Step 10: Configure App Information

**In Xcode** (still on App target):

1. **General tab**:
   - **Display Name**: JudgeFinder
   - **Bundle Identifier**: com.judgefinder.ios
   - **Version**: 1.0.0
   - **Build**: 1
   - **Deployment Target**: iOS 15.0

2. **Info tab**:
   - Verify URL Schemes include: `judgefinder`

---

## Part 4: Build & Test (20 minutes)

### Step 11: Build Next.js App

```bash
# In project root
npm run build

# Sync to iOS
npx cap sync ios
```

### Step 12: Run on Simulator

**In Xcode**:

1. Select simulator from top bar (e.g., "iPhone 15 Pro")
2. Press **Cmd+R** or click ▶️ Play button
3. Wait for build to complete (2-5 minutes first time)
4. App should launch in simulator

**Test Basic Functionality**:
- [ ] App launches without crashing
- [ ] Can see judge listings
- [ ] Can navigate to a judge profile
- [ ] Can use comparison tool
- [ ] Search works

### Step 13: Test on Physical Device (Optional but Recommended)

**Connect iPhone**:

1. Connect iPhone to Mac via USB
2. Unlock iPhone
3. Trust computer when prompted
4. In Xcode, select your iPhone from device menu
5. Press **Cmd+R** to build and run
6. On iPhone: **Settings → General → VPN & Device Management**
7. Trust your developer certificate
8. Launch app from home screen

---

## Part 5: APNs Configuration (30 minutes)

### Step 14: Create APNs Authentication Key

1. Go to https://developer.apple.com/account/resources/authkeys/list
2. Click **"+"** button
3. **Key Name**: JudgeFinder APNs Key
4. ✅ Check **"Apple Push Notifications service (APNs)"**
5. Click **"Continue"** → **"Register"**
6. **Download the .p8 file** (only chance to download!)
7. Save as: `AuthKey_[KEY_ID].p8`
8. Note the **Key ID** (10-character string)

**Your Key ID**: `________________`

### Step 15: Configure APNs Environment Variables

Create `.env.local` with APNs credentials:

```bash
# Copy example file
cp .env.ios.example .env.local

# Edit .env.local and add:
APNS_TEAM_ID=ABC123DEFG           # Your Team ID from Step 5
APNS_KEY_ID=ABC123DEFG            # Key ID from Step 14
APNS_BUNDLE_ID=com.judgefinder.ios
APNS_KEY_PATH=/path/to/AuthKey_ABC123DEFG.p8  # Full path to .p8 file
APNS_ENVIRONMENT=development      # Use 'production' for App Store builds
```

### Step 16: Store APNs Key Securely

```bash
# Create secure directory
mkdir -p ~/.apns-keys
chmod 700 ~/.apns-keys

# Move .p8 file to secure location
mv ~/Downloads/AuthKey_*.p8 ~/.apns-keys/

# Set restrictive permissions
chmod 600 ~/.apns-keys/AuthKey_*.p8

# Update .env.local with correct path
# APNS_KEY_PATH=/Users/[YOUR_USERNAME]/.apns-keys/AuthKey_[KEY_ID].p8
```

---

## Part 6: Test Push Notifications (15 minutes)

### Step 17: Test Push Notification Registration

**In the app** (running on simulator or device):

1. Navigate to any judge profile
2. Tap **"Save Judge"** button
3. Should see notification permission prompt
4. Tap **"Allow"**
5. Check Xcode console for:
   ```
   [PushNotifications] APNs token received: ...
   [PushNotifications] Token saved successfully
   ```

### Step 18: Verify Token in Database

```bash
# Check if token was stored
# Open Supabase dashboard
# Navigate to: Database → user_push_tokens table
# Should see new row with your token
```

---

## Part 7: Deploy to Netlify (5 minutes)

### Step 19: Push Updated AASA File

```bash
# Commit changes
git add .
git commit -m "feat(ios): Configure iOS app with Team ID and AASA file"

# Push to trigger Netlify deploy
git push origin main

# Wait for deployment (2-3 minutes)
# Check: https://app.netlify.com
```

### Step 20: Verify AASA File Live

```bash
# Test AASA file is accessible
curl -I https://olms-4375-tw501-x421.netlify.app/.well-known/apple-app-site-association

# Should see:
# HTTP/2 200
# content-type: application/json

# Get full content
curl https://olms-4375-tw501-x421.netlify.app/.well-known/apple-app-site-association

# Verify it shows your Team ID
```

---

## Verification Checklist

After completing all steps, verify:

### Environment
- [ ] Xcode 15+ installed and working
- [ ] Command Line Tools installed
- [ ] CocoaPods installed
- [ ] iOS dependencies installed

### Apple Developer Portal
- [ ] Team ID obtained and saved
- [ ] App ID created (com.judgefinder.ios)
- [ ] Capabilities enabled (Push, Associated Domains, App Groups)
- [ ] APNs key created and downloaded

### Xcode Project
- [ ] Signing configured with your team
- [ ] All capabilities added and working
- [ ] App runs on simulator
- [ ] App runs on physical device (optional)

### Configuration Files
- [ ] AASA file updated with Team ID
- [ ] .env.local created with APNs credentials
- [ ] APNs .p8 key stored securely

### Testing
- [ ] App launches successfully
- [ ] Basic navigation works
- [ ] Push notification permission prompt appears
- [ ] Token registered (check console logs)

### Deployment
- [ ] Changes pushed to GitHub
- [ ] Netlify deployed successfully
- [ ] AASA file accessible and correct

---

## Next Steps After Setup

Once setup is complete, you can:

1. **Implement Share Extension** (4-6 hours)
   - Follow: `docs/IOS_SHARE_EXTENSION_GUIDE.md`

2. **Implement Widgets** (8-12 hours)
   - Follow: `docs/IOS_WIDGET_GUIDE.md`

3. **Create App Store Assets** (6-8 hours)
   - App icon, screenshots, metadata

4. **TestFlight Beta** (4-6 hours)
   - Archive and upload
   - Add testers

5. **App Store Submission** (2-4 hours)
   - Complete metadata
   - Submit for review

---

## Troubleshooting Common Issues

### "No signing certificate found"
**Solution**: 
1. Xcode → Preferences → Accounts
2. Add your Apple ID
3. Download Manual Profiles
4. Try "Automatically manage signing" again

### "Team not found"
**Solution**: 
- Wait 24-48 hours after enrolling in Apple Developer Program
- Check https://developer.apple.com/account for status

### CocoaPods installation fails
**Solution**:
```bash
# Use sudo
sudo gem install cocoapods

# Or use Homebrew
brew install cocoapods
```

### App crashes on launch
**Solution**:
1. Check Xcode console for error messages
2. Verify all environment variables are set
3. Clean build: Product → Clean Build Folder (Cmd+Shift+K)
4. Rebuild

### Push notification permission doesn't appear
**Solution**:
1. Delete app from simulator/device
2. Reset permissions: Settings → General → Reset → Reset Location & Privacy
3. Reinstall and try again

---

## Time Estimates

| Section | Time | Waiting Time |
|---------|------|--------------|
| Part 1: Environment Setup | 30 min | Xcode download: 30-60 min |
| Part 2: Apple Portal | 20 min | Account approval: 0-48 hrs |
| Part 3: Xcode Config | 30 min | - |
| Part 4: Build & Test | 20 min | First build: 5 min |
| Part 5: APNs Setup | 30 min | - |
| Part 6: Test Push | 15 min | - |
| Part 7: Deploy | 5 min | Netlify: 2-3 min |
| **Total Active Time** | **2.5 hours** | **Total Wait: 30-110 min** |

**Best Case**: 3 hours total (if Xcode installed, account approved)  
**Worst Case**: 6 hours + 48 hours waiting (new account, fresh install)

---

## Support

**Stuck?** Check these resources:
- Main setup guide: `docs/IOS_APP_SETUP.md`
- Testing guide: `docs/IOS_TESTING_GUIDE.md`
- Quick reference: `IOS_QUICK_REFERENCE.md`
- Code examples: `docs/IOS_INTEGRATION_EXAMPLES.md`

**Still stuck?** Common solutions documented in each guide's troubleshooting section.

---

**Ready to begin?** Start with **Part 1: Environment Setup** above!

Good luck! 🚀

