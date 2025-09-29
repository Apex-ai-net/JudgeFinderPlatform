# iOS Widget Implementation Guide

## Overview

Home Screen widgets allow users to see their saved judges and recent decisions at a glance without opening the app. This is a key native feature for App Store approval.

## Widget Types

### 1. Small Widget (Saved Judge)
- Shows single saved judge
- Judge name and court
- Tap to open profile

### 2. Medium Widget (Saved Judges List)
- Shows 2-3 saved judges
- Quick access to profiles
- Tap judge to open their profile

### 3. Large Widget (Recent Decisions)
- Shows recent decisions from saved judges
- Decision count and dates
- Tap to open judge profile

## Implementation Steps

### Step 1: Create Widget Extension Target in Xcode

```bash
# Open Xcode project
npm run ios:open
```

**In Xcode:**

1. **File → New → Target**
2. Select **iOS → Application Extension → Widget Extension**
3. Configure:
   - **Product Name**: `JudgeFinderWidget`
   - **Team**: Your Apple Developer Team
   - **Bundle ID**: `com.judgefinder.ios.widget`
   - **Include Configuration Intent**: Yes (for customization)
   - **Language**: Swift
4. **Activate scheme**: Yes

5. **Signing & Capabilities**:
   - Select JudgeFinderWidget target
   - Set Team
   - Enable Automatically manage signing
   - Add **App Groups** capability
   - Add group: `group.com.judgefinder.ios`

### Step 2: Create Widget Data Model

Create `ios/App/JudgeFinderWidget/Models/JudgeData.swift`:

```swift
import Foundation

// Match TypeScript Judge interface
struct JudgeData: Codable, Identifiable {
    let id: String
    let name: String
    let court_name: String?
    let jurisdiction: String?
    let slug: String?
    let appointed_date: String?
    
    var displayName: String {
        name.replacingOccurrences(of: "Judge ", with: "")
            .replacingOccurrences(of: "Hon. ", with: "")
    }
    
    var displayCourt: String {
        court_name ?? "Unknown Court"
    }
    
    var displayJurisdiction: String {
        jurisdiction ?? "California"
    }
}

struct WidgetData: Codable {
    let judges: [JudgeData]
    let lastUpdated: Date
}
```

### Step 3: Create Widget Provider

Create `ios/App/JudgeFinderWidget/JudgeWidgetProvider.swift`:

```swift
import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    let appGroupID = "group.com.judgefinder.ios"
    
    func placeholder(in context: Context) -> JudgeEntry {
        JudgeEntry(date: Date(), judges: getSampleJudges())
    }

    func getSnapshot(in context: Context, completion: @escaping (JudgeEntry) -> ()) {
        let entry = JudgeEntry(date: Date(), judges: loadJudges())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // Load saved judges from App Group UserDefaults
        let judges = loadJudges()
        
        // Create entry for current time
        let currentDate = Date()
        let entry = JudgeEntry(date: currentDate, judges: judges)
        
        // Update every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: currentDate)!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    func loadJudges() -> [JudgeData] {
        guard let defaults = UserDefaults(suiteName: appGroupID),
              let data = defaults.data(forKey: "widgetJudges") else {
            return getSampleJudges()
        }
        
        do {
            let widgetData = try JSONDecoder().decode(WidgetData.self, from: data)
            return Array(widgetData.judges.prefix(5)) // Max 5 judges
        } catch {
            print("Error decoding widget data: \(error)")
            return getSampleJudges()
        }
    }
    
    func getSampleJudges() -> [JudgeData] {
        return [
            JudgeData(
                id: "sample-1",
                name: "John Smith",
                court_name: "Orange County Superior Court",
                jurisdiction: "Orange County",
                slug: "john-smith",
                appointed_date: "2020-01-01"
            )
        ]
    }
}

struct JudgeEntry: TimelineEntry {
    let date: Date
    let judges: [JudgeData]
}
```

### Step 4: Create Widget Views

Create `ios/App/JudgeFinderWidget/Views/WidgetViews.swift`:

```swift
import SwiftUI
import WidgetKit

// MARK: - Small Widget (Single Judge)
struct SmallJudgeView: View {
    let judge: JudgeData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Judge gavel icon
            Image(systemName: "gavel.fill")
                .font(.title2)
                .foregroundColor(.blue)
            
            Spacer()
            
            // Judge name
            Text(judge.displayName)
                .font(.system(size: 14, weight: .semibold))
                .lineLimit(2)
                .minimumScaleFactor(0.8)
            
            // Court
            Text(judge.displayCourt)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
                .lineLimit(1)
        }
        .padding()
        .widgetURL(URL(string: "judgefinder://judges/\(judge.slug ?? judge.id)"))
    }
}

// MARK: - Medium Widget (Judge List)
struct MediumJudgeListView: View {
    let judges: [JudgeData]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "bookmark.fill")
                    .foregroundColor(.blue)
                Text("Saved Judges")
                    .font(.headline)
                Spacer()
            }
            
            // Judge list
            VStack(alignment: .leading, spacing: 6) {
                ForEach(judges.prefix(3)) { judge in
                    Link(destination: URL(string: "judgefinder://judges/\(judge.slug ?? judge.id)")!) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(judge.displayName)
                                    .font(.system(size: 13, weight: .medium))
                                    .lineLimit(1)
                                
                                Text(judge.displayCourt)
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            
                            Spacer()
                            
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                    
                    if judge.id != judges.prefix(3).last?.id {
                        Divider()
                    }
                }
            }
        }
        .padding()
    }
}

// MARK: - Large Widget (Recent Decisions)
struct LargeDecisionsView: View {
    let judges: [JudgeData]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header
            HStack {
                Image(systemName: "doc.text.fill")
                    .foregroundColor(.blue)
                Text("Recent Decisions")
                    .font(.headline)
                Spacer()
                Text("Today")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Decision items (simulated)
            VStack(alignment: .leading, spacing: 8) {
                ForEach(judges.prefix(4)) { judge in
                    Link(destination: URL(string: "judgefinder://judges/\(judge.slug ?? judge.id)")!) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(judge.displayName)
                                    .font(.system(size: 13, weight: .semibold))
                                    .lineLimit(1)
                                
                                Text("New decision filed")
                                    .font(.system(size: 11))
                                    .foregroundColor(.secondary)
                                
                                Text(judge.displayCourt)
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                                    .lineLimit(1)
                            }
                            
                            Spacer()
                            
                            // Decision count badge
                            Text("3")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 24, height: 24)
                                .background(Color.blue)
                                .clipShape(Circle())
                        }
                        .padding(.vertical, 6)
                    }
                    
                    if judge.id != judges.prefix(4).last?.id {
                        Divider()
                    }
                }
            }
            
            Spacer()
        }
        .padding()
    }
}
```

### Step 5: Create Main Widget

Replace `ios/App/JudgeFinderWidget/JudgeFinderWidget.swift`:

```swift
import WidgetKit
import SwiftUI

@main
struct JudgeFinderWidget: Widget {
    let kind: String = "JudgeFinderWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            JudgeFinderWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("JudgeFinder")
        .description("Quick access to your saved judges and recent decisions.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct JudgeFinderWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: Provider.Entry

    var body: some View {
        switch family {
        case .systemSmall:
            if let judge = entry.judges.first {
                SmallJudgeView(judge: judge)
            } else {
                Text("No saved judges")
                    .font(.caption)
                    .padding()
            }
            
        case .systemMedium:
            if !entry.judges.isEmpty {
                MediumJudgeListView(judges: entry.judges)
            } else {
                EmptyStateView(size: .medium)
            }
            
        case .systemLarge:
            if !entry.judges.isEmpty {
                LargeDecisionsView(judges: entry.judges)
            } else {
                EmptyStateView(size: .large)
            }
            
        @unknown default:
            Text("Unsupported")
        }
    }
}

struct EmptyStateView: View {
    let size: WidgetFamily
    
    var body: some View {
        VStack {
            Image(systemName: "bookmark.slash")
                .font(.largeTitle)
                .foregroundColor(.secondary)
            
            Text("No Saved Judges")
                .font(.headline)
            
            Text("Save judges in the app to see them here")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding()
    }
}

struct JudgeFinderWidget_Previews: PreviewProvider {
    static var previews: some View {
        JudgeFinderWidgetEntryView(entry: JudgeEntry(
            date: Date(),
            judges: Provider().getSampleJudges()
        ))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        
        JudgeFinderWidgetEntryView(entry: JudgeEntry(
            date: Date(),
            judges: Provider().getSampleJudges()
        ))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
        
        JudgeFinderWidgetEntryView(entry: JudgeEntry(
            date: Date(),
            judges: Provider().getSampleJudges()
        ))
        .previewContext(WidgetPreviewContext(family: .systemLarge))
    }
}
```

### Step 6: Update Widget Data from Main App

Create `lib/ios/WidgetManager.ts`:

```typescript
/**
 * Widget Manager
 * 
 * Updates widget data when user saves/unsaves judges
 */

import { Preferences } from '@capacitor/preferences'
import { createBrowserClient } from '@/lib/supabase/client'

export class WidgetManager {
  private static instance: WidgetManager
  
  private constructor() {}
  
  static getInstance(): WidgetManager {
    if (!WidgetManager.instance) {
      WidgetManager.instance = new WidgetManager()
    }
    return WidgetManager.instance
  }
  
  /**
   * Update widget data with user's saved judges
   */
  async updateWidgetData() {
    try {
      const supabase = createBrowserClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('[WidgetManager] No user logged in')
        return
      }
      
      // Fetch user's saved judges
      const { data: bookmarks, error } = await supabase
        .from('user_bookmarks')
        .select(`
          judge_id,
          judges:judge_id (
            id,
            name,
            court_name,
            jurisdiction,
            slug,
            appointed_date
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) {
        console.error('[WidgetManager] Error fetching bookmarks:', error)
        return
      }
      
      // Transform data for widget
      const judges = bookmarks
        ?.map(b => b.judges)
        .filter(j => j !== null)
        .map(j => ({
          id: j.id,
          name: j.name,
          court_name: j.court_name,
          jurisdiction: j.jurisdiction,
          slug: j.slug,
          appointed_date: j.appointed_date
        })) || []
      
      const widgetData = {
        judges,
        lastUpdated: new Date().toISOString()
      }
      
      // Store in App Group preferences (shared with widget)
      await Preferences.set({
        key: 'widgetJudges',
        value: JSON.stringify(widgetData)
      })
      
      console.log('[WidgetManager] Widget data updated:', judges.length, 'judges')
      
      // Reload all widgets
      await this.reloadWidgets()
      
    } catch (error) {
      console.error('[WidgetManager] Error updating widget:', error)
    }
  }
  
  /**
   * Reload all widgets to show updated data
   */
  async reloadWidgets() {
    try {
      // Note: Capacitor doesn't have a direct widget reload API
      // Widgets will reload on their next update cycle (hourly)
      // For immediate updates, you could use a native plugin
      console.log('[WidgetManager] Widgets will update on next cycle')
    } catch (error) {
      console.error('[WidgetManager] Error reloading widgets:', error)
    }
  }
  
  /**
   * Clear widget data (when user logs out)
   */
  async clearWidgetData() {
    try {
      await Preferences.remove({ key: 'widgetJudges' })
      console.log('[WidgetManager] Widget data cleared')
      await this.reloadWidgets()
    } catch (error) {
      console.error('[WidgetManager] Error clearing widget:', error)
    }
  }
}

export const widgetManager = WidgetManager.getInstance()
```

### Step 7: Integrate with SaveJudgeButton

Update `components/judges/SaveJudgeButton.tsx` to refresh widgets:

```typescript
import { widgetManager } from '@/lib/ios/WidgetManager'

// After successfully saving/unsaving a judge:
if (isNative) {
  // Update widget data
  await widgetManager.updateWidgetData()
}
```

### Step 8: Build & Test

```bash
# Build Next.js
npm run build

# Sync to iOS
npx cap sync ios

# Open Xcode
npm run ios:open

# Select JudgeFinderWidget scheme and run
```

**Add Widget to Home Screen:**

1. Long-press home screen
2. Tap **+** in top corner
3. Search "JudgeFinder"
4. Select widget size
5. Tap "Add Widget"

## Advanced Features

### Widget Configuration

Allow users to choose which judge to display:

```swift
import AppIntents

struct SelectJudgeIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Judge"
    
    @Parameter(title: "Judge")
    var judge: JudgeEntity?
    
    init(judge: JudgeEntity? = nil) {
        self.judge = judge
    }
    
    init() {}
}

struct JudgeEntity: AppEntity {
    let id: String
    let name: String
    
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Judge"
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(name)")
    }
}
```

### Live Activities (iOS 16.1+)

Show live updates for ongoing cases:

```swift
struct CaseActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var status: String
        var nextHearing: Date?
    }
    
    var caseName: String
    var judgeName: String
}
```

### Widget Intents

Handle deep links from widgets:

```swift
struct OpenJudgeIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Judge"
    
    @Parameter(title: "Judge ID")
    var judgeId: String
    
    func perform() async throws -> some IntentResult {
        // Open app to judge profile
        return .result()
    }
}
```

## Testing Checklist

- [ ] Small widget displays correctly
- [ ] Medium widget shows judge list
- [ ] Large widget shows decisions
- [ ] Tapping widget opens app
- [ ] Deep links work correctly
- [ ] Widget updates when judges saved
- [ ] Empty state shows when no judges
- [ ] Widget works on lock screen
- [ ] Widget respects dark mode
- [ ] Widget data persists across reboots

## Troubleshooting

### Widget Not Appearing

**Solutions:**
1. Clean build folder (Cmd+Shift+K)
2. Delete app and reinstall
3. Restart device
4. Check widget scheme is enabled

### Widget Not Updating

**Solutions:**
1. Check App Groups configured correctly
2. Verify data is being written to UserDefaults
3. Check timeline update policy
4. Force widget reload by removing and re-adding

### Deep Links Not Working

**Solutions:**
1. Verify URL scheme registered
2. Check widgetURL is correct format
3. Test custom scheme directly
4. Ensure app handles deep links

## App Store Requirements

### Privacy Manifest

Add to widget's Info.plist:

```xml
<key>NSPrivacyTracking</key>
<false/>
<key>NSPrivacyTrackingDomains</key>
<array/>
```

### Screenshots

Take screenshots of all widget sizes for App Store:
- Small widget on home screen
- Medium widget on home screen
- Large widget on home screen
- Widget in Today View

## Resources

- [WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [Widget Tutorial](https://developer.apple.com/tutorials/widgetkit)
- [App Intents](https://developer.apple.com/documentation/appintents)

---

**Estimated Implementation Time**: 8-12 hours  
**Difficulty**: Medium-High  
**App Review Risk**: Low (standard widget pattern)

**This completes Phase 3: Native Features!**
