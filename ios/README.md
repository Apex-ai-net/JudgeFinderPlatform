# iOS App - Isolated Configuration

## Architecture

The iOS app is **completely separate** from the web application:

- **Web App** (root): Untouched, pristine Next.js application
- **iOS App** (`ios/`): Native wrapper that loads production site

## Configuration

### iOS-Specific Config

**File**: `ios/App/App/capacitor.config.json`

```json
{
  "server": {
    "url": "https://judgefinder.io",
    "cleartext": false
  }
}
```

This file is **manually maintained** and should NOT be overwritten by `npx cap sync`.

### Web App Config

**Files**: `capacitor.config.ts`, `next.config.js`, `package.json`

These files remain in their original state with NO iOS-specific modifications.

## How It Works

1. iOS app launches
2. Capacitor reads `ios/App/App/capacitor.config.json`
3. `server.url` tells Capacitor to load from `https://judgefinder.io`
4. Production site opens in native WKWebView wrapper
5. All features work (API routes, auth, SSR, etc.)

## Development Workflow

### Building iOS App

```bash
# Open Xcode
npm run ios:open

# In Xcode: Select simulator/device → Press Cmd+R
```

### Updating iOS Config

**IMPORTANT**: Do NOT run `npx cap sync ios` as it will overwrite the manually configured `capacitor.config.json`.

To update iOS config:
1. Manually edit `ios/App/App/capacitor.config.json`
2. Rebuild in Xcode (Cmd+R)

### Changing Production URL

Edit `ios/App/App/capacitor.config.json`:

```json
{
  "server": {
    "url": "https://your-new-domain.com"
  }
}
```

## Benefits

✅ **Web app pristine** - No iOS pollution
✅ **Easy updates** - Change production site, iOS app updates automatically
✅ **No App Store review** - Content updates don't require resubmission
✅ **Full functionality** - All Next.js features work (SSR, API routes, auth)
✅ **Simple maintenance** - One config file to manage

## Testing

```bash
# 1. Open Xcode
npm run ios:open

# 2. Select iPhone simulator (top bar)

# 3. Build and run (Cmd+R)
```

**Expected**: App loads https://judgefinder.io directly

**If you see fallback page**: Check `ios/App/App/capacitor.config.json` has correct `server.url`

## Fallback Page

Located: `ios/App/App/public/index.html`

This page only appears if `server.url` fails to load. It indicates a configuration issue.

## Production Deployment

For App Store submission:

1. **Test in simulator** - Ensure production site loads
2. **Test on device** - Connect iPhone, build, verify functionality
3. **Archive** - Product → Archive in Xcode
4. **Upload** - Distribute to App Store Connect
5. **Submit** - Complete App Store listing

## Maintenance Notes

- ⚠️ **Never run `npx cap sync ios`** - Overwrites manual config
- ✅ **iOS config is isolated** - Web app remains untouched
- ✅ **Update strategy** - Edit iOS config, rebuild in Xcode
- ✅ **Content updates** - Deploy web app, iOS picks up changes automatically

## Troubleshooting

**White screen**:
- Check `ios/App/App/capacitor.config.json` has `server.url`
- Verify https://judgefinder.io is accessible
- Clean build: Xcode → Product → Clean Build Folder (Cmd+Shift+K)

**Fallback page appears**:
- `server.url` is missing or incorrect
- Network connectivity issue
- Check Xcode console for errors

**Changes not reflecting**:
- Rebuild in Xcode (Cmd+R)
- Don't run `npx cap sync` (overwrites config)
