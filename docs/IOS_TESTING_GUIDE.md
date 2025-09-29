# iOS App Testing Guide

Complete testing checklist for the JudgeFinder iOS app before App Store submission.

## Prerequisites

- macOS with Xcode 15+
- Physical iPhone (iOS 15+) for final testing
- Apple Developer account
- TestFlight access

## Phase 1: Local Development Testing

### Setup

```bash
# 1. Build Next.js app
npm run build

# 2. Sync to iOS
npm run ios:sync

# 3. Open in Xcode
npm run ios:open
```

### Test Cases

#### 1.1 App Launch
- [ ] App launches without crashes
- [ ] Production URL loads correctly
- [ ] No console errors in Xcode debugger
- [ ] Splash screen displays properly

#### 1.2 Navigation
- [ ] Home page loads
- [ ] Can navigate to judge profiles
- [ ] Can use comparison tool
- [ ] Can browse jurisdictions
- [ ] Back button works correctly

#### 1.3 Web Content
- [ ] All pages render correctly
- [ ] Images load properly
- [ ] Styles are correct
- [ ] Interactive elements work (buttons, forms)
- [ ] Search functionality works

## Phase 2: Deep Linking Testing

### Universal Links

Test from various sources:

#### From Messages App
```
1. Send yourself: https://judgefinder.io/judges/john-doe
2. Tap the link
3. ✓ Should open in JudgeFinder app (not Safari)
4. ✓ Should navigate directly to judge profile
```

#### From Notes App
```
1. Create note with: https://judgefinder.io/compare?judges=a,b
2. Tap the link
3. ✓ Should open comparison page in app
```

#### From Email
```
1. Email yourself a judge profile URL
2. Tap in email
3. ✓ Should open in app with correct page
```

### Custom URL Scheme

Test from Safari:
```
1. Navigate to: judgefinder://judges/john-doe
2. ✓ Should prompt to open JudgeFinder
3. ✓ Should open correct page
```

### Test Cases

- [ ] Universal links open in app (not Safari)
- [ ] Deep links route to correct pages
- [ ] Invalid URLs show error gracefully
- [ ] Deep links work from cold start
- [ ] Deep links work when app is backgrounded

## Phase 3: Push Notifications Testing

### Setup APNs

1. Configure APNs certificate (see `docs/IOS_APP_SETUP.md`)
2. Set environment variables in `.env.local`
3. Deploy backend with APNs configuration

### Permission Flow

```
1. Open app for first time
2. Navigate to any judge profile
3. Tap "Save Judge" button
4. ✓ Notification permission prompt appears
5. Tap "Allow"
6. ✓ Token is registered and sent to backend
```

### Sending Test Notifications

```bash
# Via API
curl -X POST http://localhost:3005/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new_decision",
    "judgeId": "123",
    "judgeName": "John Doe",
    "decisionCount": 3
  }'
```

### Test Cases

#### Foreground Notifications
- [ ] Notification received while app is open
- [ ] Banner displays with correct content
- [ ] Tapping banner navigates to correct page

#### Background Notifications
- [ ] Notification received when app is backgrounded
- [ ] Badge number updates
- [ ] Sound plays (if enabled)
- [ ] Notification shows in Notification Center

#### Notification Actions
- [ ] Tapping notification opens app
- [ ] Deep link routing works from notification
- [ ] Notification clears after tapping

#### Edge Cases
- [ ] Multiple notifications stack correctly
- [ ] Old notifications clear properly
- [ ] Invalid tokens are handled gracefully

## Phase 4: Settings & Preferences Testing

### Settings Screen

```
1. Navigate to Settings (profile icon)
2. ✓ All sections visible
3. ✓ Notification toggle works
4. ✓ Privacy Policy link opens
5. ✓ Terms link opens
6. ✓ Help link opens
7. ✓ App version displays correctly
```

### Test Cases

- [ ] Settings UI renders correctly
- [ ] Toggle switches work
- [ ] External links open in SFSafariViewController
- [ ] Preferences persist across app restarts

## Phase 5: Authentication Testing

### Login Flow

```
1. Fresh install (not logged in)
2. Tap "Save Judge" button
3. ✓ Redirected to login page
4. ✓ Can log in successfully
5. ✓ Redirected back to original page
6. ✓ Save action completes
```

### Session Persistence

```
1. Log in to app
2. Close app completely
3. Reopen app
4. ✓ Still logged in
5. ✓ Can access protected features
```

### Test Cases

- [ ] Login works correctly
- [ ] Session persists across app launches
- [ ] Logout works properly
- [ ] Sign in with Apple works (if implemented)

## Phase 6: Performance Testing

### Metrics to Monitor

```
1. App launch time: < 3 seconds
2. Page load time: < 2 seconds
3. Memory usage: < 200 MB typical
4. CPU usage: < 40% typical
5. Battery drain: Minimal
```

### Test Cases

- [ ] App launches quickly
- [ ] Pages load without lag
- [ ] Scrolling is smooth (60 FPS)
- [ ] No memory leaks after extended use
- [ ] Battery usage is reasonable

### Tools

```
Xcode → Product → Profile → Choose:
- Time Profiler (CPU usage)
- Allocations (Memory)
- Leaks (Memory leaks)
- Energy Log (Battery)
```

## Phase 7: Device Compatibility Testing

Test on various devices:

### iPhone Models
- [ ] iPhone 15 Pro Max (6.7")
- [ ] iPhone 15 Pro (6.1")
- [ ] iPhone 14 (6.1")
- [ ] iPhone SE (4.7")
- [ ] iPhone 12 Mini (5.4")

### iOS Versions
- [ ] iOS 17.x (latest)
- [ ] iOS 16.x
- [ ] iOS 15.x (minimum supported)

### Orientations
- [ ] Portrait mode
- [ ] Landscape mode
- [ ] Rotation transitions smooth

## Phase 8: Edge Cases & Error Handling

### Network Conditions

```
1. Enable Airplane Mode
2. ✓ App shows offline message
3. ✓ Previously loaded content still visible
4. ✓ Graceful error handling
```

Test with Network Link Conditioner:
- [ ] Slow 3G
- [ ] WiFi with packet loss
- [ ] Complete network failure

### Low Storage
- [ ] App handles low storage gracefully
- [ ] No crashes when disk is full

### Low Memory
```
1. Xcode → Debug → Simulate Memory Warning
2. ✓ App doesn't crash
3. ✓ Cached content released properly
```

### Background & Foreground
- [ ] App saves state when backgrounded
- [ ] App restores state when foregrounded
- [ ] No data loss during transitions

## Phase 9: TestFlight Beta Testing

### Pre-Flight Checklist

- [ ] All local tests passing
- [ ] Build number incremented
- [ ] Archive created successfully
- [ ] Upload to TestFlight successful
- [ ] Beta review approved

### Beta Testing Plan

**Week 1**: Internal Testing (5-10 users)
- [ ] Daily use by team
- [ ] Log all issues in GitHub Issues
- [ ] Collect crash reports

**Week 2**: External Beta (25-50 users)
- [ ] Invite attorneys and legal professionals
- [ ] Send feedback survey
- [ ] Monitor TestFlight analytics

**Week 3**: Final Beta (100+ users)
- [ ] Open to public beta
- [ ] Stress test with real usage
- [ ] Prepare for App Store submission

### Beta Feedback Collection

Create feedback form with:
- App stability (1-5 stars)
- Performance (1-5 stars)
- Features used
- Issues encountered
- Suggestions for improvement

## Phase 10: Pre-Submission Checklist

### App Store Connect

- [ ] App metadata complete
- [ ] Screenshots uploaded (all sizes)
- [ ] App preview video uploaded (optional)
- [ ] Keywords optimized
- [ ] Age rating selected (4+)
- [ ] Privacy details completed
- [ ] App Review Information provided
- [ ] Export compliance answered

### Final Build

- [ ] Production build created
- [ ] Build uploaded to App Store Connect
- [ ] All capabilities enabled
- [ ] Provisioning profiles valid
- [ ] No hardcoded secrets in code

### Documentation for Reviewers

```
Test Account:
Email: reviewer@judgefinder.io
Password: [Provide secure password]

Native Features to Test:

1. Push Notifications:
   - Tap any judge profile
   - Tap "Save Judge" button
   - Allow notifications
   - Expect notification when judge updates

2. Deep Links:
   - Open link in Safari
   - Share to JudgeFinder app
   - Opens correct page

3. Settings:
   - Tap Profile icon
   - Access native settings panel
   - View Privacy Policy and Terms
```

## Common Issues & Solutions

### Issue: Deep Links Open in Safari

**Solution**:
1. Uninstall app completely
2. Reinstall from TestFlight
3. Wait 24-48 hours for AASA propagation
4. Test link from Messages (not Safari address bar)

### Issue: Push Notifications Not Received

**Solution**:
1. Check APNs certificate is valid
2. Verify token stored in database
3. Check server logs for errors
4. Test with Apple's Push Notification Console
5. Ensure production APNs cert (not dev)

### Issue: App Crashes on Launch

**Solution**:
1. Check Xcode crash logs
2. Verify all environment variables set
3. Check for nil unwrapping errors
4. Test on clean device (not just simulator)

### Issue: Slow Performance

**Solution**:
1. Profile with Instruments
2. Check for retain cycles
3. Optimize image loading
4. Reduce bundle size
5. Enable caching

## Automated Testing (Future)

```typescript
// Example with Detox or Appium
describe('JudgeFinder iOS', () => {
  it('should launch app', async () => {
    await expect(element(by.id('home-screen'))).toBeVisible()
  })
  
  it('should navigate to judge profile', async () => {
    await element(by.id('search-input')).typeText('John Doe')
    await element(by.id('judge-result-0')).tap()
    await expect(element(by.id('judge-profile'))).toBeVisible()
  })
  
  it('should enable notifications', async () => {
    await element(by.id('save-judge-button')).tap()
    await element(by.text('Allow')).tap()
    await expect(element(by.id('notification-enabled'))).toBeVisible()
  })
})
```

## Metrics to Track

Post-launch analytics:

### Engagement
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session duration
- Screens per session

### Features
- Push notification opt-in rate
- Deep link usage
- Widget installations
- Share extension usage

### Performance
- Crash-free sessions (target: >99%)
- App launch time (target: <3s)
- API response times
- Error rates

### Retention
- Day 1 retention
- Day 7 retention
- Day 30 retention
- Churn rate

## Resources

- [Xcode Testing Documentation](https://developer.apple.com/documentation/xcode/testing-your-apps-in-xcode)
- [TestFlight Beta Testing](https://developer.apple.com/testflight/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Push Notification Testing](https://developer.apple.com/documentation/usernotifications/testing_notifications_using_the_push_notification_console)

---

**Last Updated**: January 29, 2025  
**Next Review**: After TestFlight beta  
**Owner**: QA Team
