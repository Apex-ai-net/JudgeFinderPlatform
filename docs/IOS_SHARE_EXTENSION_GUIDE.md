# iOS Share Extension Implementation Guide

## Overview

The Share Extension allows users to share judge profile URLs from Safari (or any app) directly to JudgeFinder, which will deep-link to the appropriate page within the app.

## What It Does

1. User browses a judge profile in Safari
2. Taps the Share button
3. Selects "JudgeFinder" from share sheet
4. App opens directly to that judge's profile

## Implementation Steps

### Step 1: Create Share Extension Target in Xcode

```bash
# Open Xcode project
npm run ios:open
```

**In Xcode:**

1. **File → New → Target**
2. Select **iOS → Application Extension → Share Extension**
3. Configure:
   - **Product Name**: `JudgeFinderShare`
   - **Team**: Your Apple Developer Team
   - **Bundle ID**: `com.judgefinder.ios.share`
   - **Language**: Swift
   - **Activate scheme**: Yes

4. **Signing & Capabilities**:
   - Select JudgeFinderShare target
   - Set Team
   - Enable Automatically manage signing

### Step 2: Configure Share Extension Info.plist

Edit `ios/App/JudgeFinderShare/Info.plist`:

```xml
<dict>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionAttributes</key>
        <dict>
            <key>NSExtensionActivationRule</key>
            <dict>
                <!-- Accept URLs only -->
                <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
                <integer>1</integer>
                <key>NSExtensionActivationSupportsWebPageWithMaxCount</key>
                <integer>1</integer>
            </dict>
        </dict>
        <key>NSExtensionMainStoryboard</key>
        <string>MainInterface</string>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.share-services</string>
    </dict>
</dict>
```

### Step 3: Implement Share Extension View Controller

Replace `ios/App/JudgeFinderShare/ShareViewController.swift`:

```swift
import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {
    
    // App Group ID for sharing data between app and extension
    let appGroupID = "group.com.judgefinder.ios"
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Extract the shared URL
        if let item = extensionContext?.inputItems.first as? NSExtensionItem {
            if let attachments = item.attachments {
                for attachment in attachments {
                    // Check if it's a URL
                    if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                        attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] (url, error) in
                            guard let self = self else { return }
                            
                            if let sharedURL = url as? URL {
                                DispatchQueue.main.async {
                                    self.handleSharedURL(sharedURL)
                                }
                            } else if let error = error {
                                print("Error loading URL: \(error.localizedDescription)")
                                self.completeRequest()
                            }
                        }
                        return
                    }
                }
            }
        }
        
        // No valid URL found
        completeRequest()
    }
    
    func handleSharedURL(_ url: URL) {
        print("[ShareExtension] Shared URL: \(url.absoluteString)")
        
        // Check if URL is from JudgeFinder domain
        let host = url.host ?? ""
        let isJudgeFinderURL = host.contains("judgefinder.io") || 
                              host.contains("netlify.app")
        
        if isJudgeFinderURL {
            // Valid JudgeFinder URL - open in app
            openInMainApp(url: url)
        } else {
            // Not a JudgeFinder URL - show error
            showError("This URL is not a JudgeFinder link")
        }
    }
    
    func openInMainApp(url: URL) {
        // Store the URL in shared container
        if let defaults = UserDefaults(suiteName: appGroupID) {
            defaults.set(url.absoluteString, forKey: "sharedURL")
            defaults.set(Date(), forKey: "sharedURLDate")
            defaults.synchronize()
        }
        
        // Create deep link URL
        let path = url.path
        var deepLinkURL: URL?
        
        // Convert https URL to custom scheme
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            var deepComponents = components
            deepComponents.scheme = "judgefinder"
            deepComponents.host = "open"
            deepLinkURL = deepComponents.url
        }
        
        // Open main app with deep link
        if let deepLink = deepLinkURL {
            self.extensionContext?.open(deepLink, completionHandler: { success in
                if success {
                    print("[ShareExtension] Successfully opened app")
                } else {
                    print("[ShareExtension] Failed to open app")
                }
                self.completeRequest()
            })
        } else {
            completeRequest()
        }
    }
    
    func showError(_ message: String) {
        let alert = UIAlertController(
            title: "Cannot Share",
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            self.completeRequest()
        })
        present(alert, animated: true)
    }
    
    func completeRequest() {
        // Close the share extension
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
    
    override func isContentValid() -> Bool {
        // Always valid - we'll handle validation in handleSharedURL
        return true
    }
    
    override func didSelectPost() {
        // Called when user taps "Post" button
        // We don't use this - auto-processing in viewDidLoad
        completeRequest()
    }
    
    override func configurationItems() -> [Any]! {
        // No additional configuration needed
        return []
    }
}
```

### Step 4: Add App Groups Entitlement

**For Main App:**

1. Select **App** target
2. **Signing & Capabilities** → **+ Capability**
3. Add **App Groups**
4. Click **+** and add: `group.com.judgefinder.ios`

**For Share Extension:**

1. Select **JudgeFinderShare** target
2. **Signing & Capabilities** → **+ Capability**
3. Add **App Groups**
4. Click **+** and add: `group.com.judgefinder.ios`

### Step 5: Handle Shared URLs in Main App

Update `lib/ios/AppBridge.ts` to check for shared URLs:

```typescript
/**
 * Check for URLs shared from Share Extension
 */
async checkForSharedURL() {
  try {
    const { Preferences } = await import('@capacitor/preferences')
    
    // Check App Group UserDefaults for shared URL
    const sharedURL = await Preferences.get({ key: 'sharedURL' })
    const sharedDate = await Preferences.get({ key: 'sharedURLDate' })
    
    if (sharedURL.value) {
      console.log('[AppBridge] Found shared URL:', sharedURL.value)
      
      // Check if it's recent (within last 5 minutes)
      const shareDate = sharedDate.value ? new Date(sharedDate.value) : new Date(0)
      const now = new Date()
      const timeDiff = now.getTime() - shareDate.getTime()
      
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        // Navigate to the shared URL
        const url = new URL(sharedURL.value)
        const path = url.pathname + url.search + url.hash
        
        if (typeof window !== 'undefined') {
          window.location.href = path
        }
        
        // Clear the shared URL
        await Preferences.remove({ key: 'sharedURL' })
        await Preferences.remove({ key: 'sharedURLDate' })
      }
    }
  } catch (error) {
    console.error('[AppBridge] Error checking shared URL:', error)
  }
}
```

Update the `initialize()` method to call this:

```typescript
async initialize() {
  console.log('[AppBridge] Initializing iOS native bridge...')
  
  try {
    const isNative = await this.isNativeApp()
    
    if (isNative) {
      await this.setupDeepLinkHandlers()
      await this.setupAppStateListeners()
      
      // Check for shared URLs from Share Extension
      await this.checkForSharedURL()
      
      console.log('[AppBridge] iOS bridge initialized successfully')
    }
  } catch (error) {
    console.error('[AppBridge] Failed to initialize:', error)
  }
}
```

### Step 6: Configure Share Extension Icon

1. Create 60x60, 120x120, 180x180 PNG icons
2. Add to `ios/App/JudgeFinderShare/Assets.xcassets/AppIcon.appiconset/`
3. Update `Contents.json` with icon references

### Step 7: Build & Test

```bash
# Build Next.js app
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npm run ios:open

# Select JudgeFinderShare scheme
# Run on simulator or device
```

**Testing:**

1. Open Safari
2. Navigate to a judge profile (e.g., https://judgefinder.io/judges/john-doe)
3. Tap Share button
4. Scroll and find "JudgeFinder" in share sheet
5. Tap it
6. App should open directly to that judge's profile

## Troubleshooting

### Share Extension Not Appearing

**Possible causes:**
- App not installed on device
- Share Extension scheme not built
- Bundle ID mismatch

**Solutions:**
1. Build and run main app first
2. Then build and run Share Extension scheme
3. Verify both have same Team ID
4. Check both have App Groups enabled

### App Doesn't Open from Extension

**Possible causes:**
- Custom URL scheme not registered
- App Groups not configured
- Deep link routing not working

**Solutions:**
1. Verify `judgefinder://` scheme in Info.plist
2. Check App Groups ID matches exactly
3. Add console logs to track URL flow
4. Test custom scheme directly: `xcrun simctl openurl booted "judgefinder://open?url=/judges/john-doe"`

### URLs Not Being Detected

**Possible causes:**
- Wrong UTType in activation rules
- URL not in correct format
- Extension filtering wrong types

**Solutions:**
1. Check Info.plist activation rules
2. Verify `NSExtensionActivationSupportsWebURLWithMaxCount` is set
3. Test with different URL formats
4. Add logging to see what's being shared

## Advanced Features

### Custom UI

Instead of auto-processing, show a custom UI:

```swift
override func viewDidLoad() {
    super.viewDidLoad()
    
    // Customize appearance
    navigationController?.navigationBar.backgroundColor = .systemBlue
    placeholder = "Opening in JudgeFinder..."
    
    // Hide text view
    textView.isHidden = true
}
```

### Preview Generation

Show a preview of the judge profile:

```swift
func loadJudgePreview(from url: URL) async {
    // Fetch judge data from API
    let judgeId = extractJudgeId(from: url)
    let apiURL = URL(string: "https://api.judgefinder.io/judges/\(judgeId)")!
    
    do {
        let (data, _) = try await URLSession.shared.data(from: apiURL)
        let judge = try JSONDecoder().decode(Judge.self, from: data)
        
        // Update UI with judge info
        DispatchQueue.main.async {
            self.title = judge.name
            self.textView.text = "\(judge.court_name)\n\(judge.jurisdiction)"
        }
    } catch {
        print("Error loading preview: \(error)")
    }
}
```

### Analytics

Track share extension usage:

```swift
func logShareEvent(url: URL) {
    // Send analytics event
    let event = [
        "event": "share_extension_used",
        "url": url.absoluteString,
        "timestamp": Date().timeIntervalSince1970
    ]
    
    // Store for later sync or send immediately
    if let defaults = UserDefaults(suiteName: appGroupID) {
        var events = defaults.array(forKey: "analytics_events") as? [[String: Any]] ?? []
        events.append(event)
        defaults.set(events, forKey: "analytics_events")
    }
}
```

## File Structure

```
ios/App/
├── App/                           # Main app
├── JudgeFinderShare/              # Share Extension
│   ├── Info.plist
│   ├── ShareViewController.swift
│   └── Assets.xcassets/
│       └── AppIcon.appiconset/
└── App.xcodeproj/
```

## Testing Checklist

- [ ] Share extension appears in share sheet
- [ ] Tapping extension opens main app
- [ ] Deep link routes to correct page
- [ ] Works from Safari
- [ ] Works from Messages
- [ ] Works from Notes
- [ ] Works from Mail
- [ ] Handles invalid URLs gracefully
- [ ] Works on cold start
- [ ] Works when app is backgrounded

## App Store Considerations

### Privacy Manifest

Add to Share Extension's Info.plist:

```xml
<key>NSPrivacyAccessedAPICategoryUserDefaults</key>
<dict>
    <key>NSPrivacyAccessedAPIType</key>
    <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
    <key>NSPrivacyAccessedAPITypeReasons</key>
    <array>
        <string>CA92.1</string>
    </array>
</dict>
```

### App Review Notes

Include in submission:
> The Share Extension allows users to quickly open JudgeFinder links from Safari or other apps. It only processes URLs from judgefinder.io domain and opens them in the main app.

## Resources

- [App Extension Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/)
- [Share Extension Documentation](https://developer.apple.com/documentation/uikit/share_extensions)
- [App Groups](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups)

---

**Estimated Implementation Time**: 4-6 hours  
**Difficulty**: Medium  
**App Review Risk**: Low (standard extension pattern)

**Next**: After implementing, test thoroughly and move to Widget implementation.
