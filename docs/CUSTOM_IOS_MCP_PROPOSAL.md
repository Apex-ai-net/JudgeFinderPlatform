# Custom iOS Development MCP Server - Proposal

## Overview

Create a Model Context Protocol (MCP) server that automates iOS development tasks, specifically for App Store Connect, Xcode project management, and certificate/provisioning profile handling.

## Problem Statement

Currently, iOS app development requires manual:
- Xcode project configuration
- Certificate and provisioning profile management
- App Store Connect metadata entry
- TestFlight distribution
- App Store submission

**No existing MCP server addresses these needs.**

## Proposed Solution: `ios-dev-mcp-server`

A custom MCP server that wraps:
1. **App Store Connect API** (REST API)
2. **Fastlane** (Ruby-based iOS automation)
3. **xcodebuild** (Xcode command-line tools)
4. **AppleScript** (for Xcode GUI automation)

---

## Architecture

### Technology Stack

```
MCP Server (Node.js/TypeScript)
├── App Store Connect API Client
│   ├── Authentication (JWT)
│   ├── App Management
│   ├── TestFlight
│   └── App Store Submission
├── Fastlane Wrapper
│   ├── Certificate Management
│   ├── Provisioning Profiles
│   ├── Build & Archive
│   └── Upload to App Store Connect
├── Xcode CLI Tools
│   ├── xcodebuild
│   ├── xcrun
│   └── altool
└── AppleScript Bridge
    ├── Xcode project configuration
    └── GUI automation
```

### MCP Tools to Expose

#### 1. **App Store Connect Tools**

```typescript
{
  name: "asc_create_app",
  description: "Create a new app in App Store Connect",
  parameters: {
    bundleId: string,
    name: string,
    primaryLanguage: string,
    sku: string
  }
}

{
  name: "asc_update_metadata",
  description: "Update app metadata (description, keywords, etc.)",
  parameters: {
    appId: string,
    metadata: {
      description?: string,
      keywords?: string,
      releaseNotes?: string,
      supportUrl?: string,
      marketingUrl?: string
    }
  }
}

{
  name: "asc_upload_screenshots",
  description: "Upload app screenshots for App Store",
  parameters: {
    appId: string,
    deviceType: "iPhone_6_7" | "iPhone_6_1" | "iPad_Pro_12_9",
    screenshots: string[] // File paths
  }
}

{
  name: "asc_create_testflight_build",
  description: "Create a new TestFlight build",
  parameters: {
    appId: string,
    buildPath: string,
    changelog: string
  }
}

{
  name: "asc_submit_for_review",
  description: "Submit app for App Store review",
  parameters: {
    appId: string,
    versionId: string,
    notes: string // Reviewer notes
  }
}
```

#### 2. **Certificate & Provisioning Tools**

```typescript
{
  name: "cert_create_development",
  description: "Create development certificate",
  parameters: {
    teamId: string,
    output: string // Path to save .p12
  }
}

{
  name: "cert_create_distribution",
  description: "Create distribution certificate",
  parameters: {
    teamId: string,
    output: string
  }
}

{
  name: "profile_create",
  description: "Create provisioning profile",
  parameters: {
    bundleId: string,
    type: "development" | "app-store" | "ad-hoc",
    name: string
  }
}

{
  name: "cert_list",
  description: "List all certificates for team",
  parameters: {
    teamId: string
  }
}
```

#### 3. **Xcode Project Tools**

```typescript
{
  name: "xcode_configure_signing",
  description: "Configure code signing in Xcode project",
  parameters: {
    projectPath: string,
    teamId: string,
    bundleId: string,
    autoManage: boolean
  }
}

{
  name: "xcode_add_capability",
  description: "Add capability to Xcode project",
  parameters: {
    projectPath: string,
    capability: "push" | "app-groups" | "associated-domains",
    config?: object
  }
}

{
  name: "xcode_build",
  description: "Build Xcode project",
  parameters: {
    projectPath: string,
    scheme: string,
    configuration: "Debug" | "Release",
    destination: string // "generic/platform=iOS"
  }
}

{
  name: "xcode_archive",
  description: "Create archive for distribution",
  parameters: {
    projectPath: string,
    scheme: string,
    archivePath: string
  }
}
```

#### 4. **APNs Configuration Tools**

```typescript
{
  name: "apns_create_key",
  description: "Create APNs authentication key",
  parameters: {
    teamId: string,
    keyName: string,
    output: string
  }
}

{
  name: "apns_configure",
  description: "Configure APNs in app capabilities",
  parameters: {
    bundleId: string,
    environment: "development" | "production"
  }
}
```

---

## Implementation Plan

### Phase 1: Core MCP Server (Week 1)

**Files to Create**:
```
ios-dev-mcp-server/
├── package.json
├── src/
│   ├── index.ts                    # Main MCP server
│   ├── tools/
│   │   ├── app-store-connect.ts   # ASC API wrapper
│   │   ├── certificates.ts         # Cert management
│   │   ├── provisioning.ts         # Profile management
│   │   ├── xcode.ts               # Xcode automation
│   │   └── apns.ts                # APNs configuration
│   ├── clients/
│   │   ├── asc-client.ts          # App Store Connect API
│   │   ├── fastlane.ts            # Fastlane wrapper
│   │   └── xcode-cli.ts           # xcodebuild wrapper
│   └── utils/
│       ├── auth.ts                # JWT token management
│       └── validation.ts          # Input validation
└── README.md
```

**Dependencies**:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "axios": "^1.6.0",
    "jsonwebtoken": "^9.0.2",
    "execa": "^8.0.0",
    "fs-extra": "^11.0.0"
  }
}
```

### Phase 2: App Store Connect Integration (Week 2)

**App Store Connect API Implementation**:

```typescript
// src/clients/asc-client.ts
import jwt from 'jsonwebtoken'
import axios from 'axios'

export class AppStoreConnectClient {
  private token: string
  
  constructor(
    private keyId: string,
    private issuerId: string,
    private privateKey: string
  ) {
    this.token = this.generateToken()
  }
  
  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000)
    
    return jwt.sign(
      {
        iss: this.issuerId,
        exp: now + 20 * 60, // 20 minutes
        aud: 'appstoreconnect-v1'
      },
      this.privateKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: this.keyId,
          typ: 'JWT'
        }
      }
    )
  }
  
  async createApp(bundleId: string, name: string, sku: string) {
    const response = await axios.post(
      'https://api.appstoreconnect.apple.com/v1/apps',
      {
        data: {
          type: 'apps',
          attributes: {
            bundleId,
            name,
            primaryLocale: 'en-US',
            sku
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    return response.data
  }
  
  async updateMetadata(appId: string, metadata: any) {
    // Implementation
  }
  
  async uploadScreenshot(appId: string, deviceType: string, filePath: string) {
    // Implementation with multipart upload
  }
  
  async submitForReview(appId: string, versionId: string, notes: string) {
    // Implementation
  }
}
```

### Phase 3: Fastlane Integration (Week 3)

**Fastlane Wrapper**:

```typescript
// src/clients/fastlane.ts
import { execa } from 'execa'

export class FastlaneClient {
  async createCertificate(
    type: 'development' | 'distribution',
    teamId: string,
    output: string
  ) {
    await execa('fastlane', [
      'cert',
      '--development', String(type === 'development'),
      '--team_id', teamId,
      '--output_path', output
    ])
  }
  
  async createProvisioningProfile(
    bundleId: string,
    type: 'development' | 'appstore',
    name: string
  ) {
    await execa('fastlane', [
      'sigh',
      '--app_identifier', bundleId,
      '--adhoc', String(type === 'adhoc'),
      '--filename', name
    ])
  }
  
  async buildAndUpload(
    scheme: string,
    workspace: string
  ) {
    await execa('fastlane', [
      'gym',
      '--scheme', scheme,
      '--workspace', workspace,
      '--export_method', 'app-store'
    ])
    
    await execa('fastlane', [
      'pilot',
      'upload',
      '--skip_waiting_for_build_processing'
    ])
  }
}
```

### Phase 4: Xcode Automation (Week 4)

**Xcode CLI Wrapper**:

```typescript
// src/clients/xcode-cli.ts
import { execa } from 'execa'

export class XcodeClient {
  async configureSigning(
    projectPath: string,
    teamId: string,
    bundleId: string
  ) {
    // Use PBXProj parser to modify project.pbxproj
    // Or use xcodebuild with specific flags
  }
  
  async addCapability(
    projectPath: string,
    capability: string,
    config?: any
  ) {
    // Modify entitlements file
    // Update project settings
  }
  
  async build(
    projectPath: string,
    scheme: string,
    configuration: string
  ) {
    const { stdout } = await execa('xcodebuild', [
      '-project', projectPath,
      '-scheme', scheme,
      '-configuration', configuration,
      'build'
    ])
    
    return stdout
  }
  
  async archive(
    projectPath: string,
    scheme: string,
    archivePath: string
  ) {
    await execa('xcodebuild', [
      '-project', projectPath,
      '-scheme', scheme,
      '-archivePath', archivePath,
      'archive'
    ])
  }
}
```

---

## Usage Example (Once Built)

```typescript
// In Claude/Cursor with MCP configured:

// 1. Create app in App Store Connect
await mcp_iOS_create_app({
  bundleId: "com.judgefinder.ios",
  name: "JudgeFinder",
  sku: "judgefinder-ios-001"
})

// 2. Configure signing
await mcp_iOS_configure_signing({
  projectPath: "/path/to/ios/App/App.xcodeproj",
  teamId: "ABC123DEFG",
  bundleId: "com.judgefinder.ios",
  autoManage: true
})

// 3. Add capabilities
await mcp_iOS_add_capability({
  projectPath: "/path/to/ios/App/App.xcodeproj",
  capability: "push",
  config: { environment: "production" }
})

await mcp_iOS_add_capability({
  projectPath: "/path/to/ios/App/App.xcodeproj",
  capability: "app-groups",
  config: { groups: ["group.com.judgefinder.ios"] }
})

// 4. Build and archive
await mcp_iOS_archive({
  projectPath: "/path/to/ios/App/App.xcodeproj",
  scheme: "App",
  archivePath: "./build/JudgeFinder.xcarchive"
})

// 5. Upload to TestFlight
await mcp_iOS_upload_testflight({
  archivePath: "./build/JudgeFinder.xcarchive",
  changelog: "Initial beta release"
})

// 6. Update metadata
await mcp_iOS_update_metadata({
  appId: "123456789",
  metadata: {
    description: "AI-powered judicial transparency...",
    keywords: "judge, court, California, legal",
    supportUrl: "https://judgefinder.io/help"
  }
})

// 7. Submit for review
await mcp_iOS_submit_review({
  appId: "123456789",
  versionId: "1.0",
  notes: "This app provides judicial transparency..."
})
```

---

## Benefits

### For JudgeFinder Project:
- ✅ **Automate 80% of iOS setup** (signing, capabilities, profiles)
- ✅ **One-command TestFlight uploads**
- ✅ **Automated App Store metadata**
- ✅ **Reduce setup time from days to hours**

### For Broader Community:
- ✅ **First iOS Development MCP** (fill market gap)
- ✅ **Open source contribution**
- ✅ **Reusable for any iOS project**
- ✅ **Could become standard tool**

---

## Prerequisites

### To Use This MCP:

1. **macOS** (required for Xcode tools)
2. **Xcode Command Line Tools**: `xcode-select --install`
3. **Fastlane**: `gem install fastlane`
4. **Node.js 18+**
5. **Apple Developer Account** ($99/year)
6. **App Store Connect API Key** (from developer portal)

### Environment Variables:

```bash
# App Store Connect API
ASC_KEY_ID=ABC123DEFG
ASC_ISSUER_ID=12345678-1234-1234-1234-123456789012
ASC_PRIVATE_KEY_PATH=/path/to/AuthKey_ABC123DEFG.p8

# Apple Developer
APPLE_TEAM_ID=ABC123DEFG
APPLE_ID=your-apple-id@email.com
```

---

## Implementation Timeline

| Phase | Task | Time | Output |
|-------|------|------|--------|
| 1 | MCP Server Setup | 3 days | Core server running |
| 2 | ASC API Integration | 5 days | App creation, metadata |
| 3 | Fastlane Integration | 5 days | Certificates, profiles |
| 4 | Xcode Automation | 5 days | Build, archive, upload |
| 5 | Testing & Docs | 3 days | Ready for use |
| **Total** | **Full Implementation** | **3-4 weeks** | **Production MCP** |

---

## Alternative: Use Existing Tools Directly

**If MCP is overkill**, you could use existing tools:

### 1. **Fastlane** (Recommended)
```bash
# Install
gem install fastlane

# Setup
cd ios/App
fastlane init

# Common tasks
fastlane match development  # Certificates
fastlane gym               # Build
fastlane pilot            # TestFlight
fastlane deliver          # App Store
```

### 2. **App Store Connect API** (Direct)
```typescript
// Use REST API directly in Node.js
import axios from 'axios'
import jwt from 'jsonwebtoken'

const token = jwt.sign(payload, privateKey, options)
const response = await axios.post(
  'https://api.appstoreconnect.apple.com/v1/apps',
  data,
  { headers: { Authorization: `Bearer ${token}` }}
)
```

### 3. **xcodebuild** (Command Line)
```bash
# Build
xcodebuild -project App.xcodeproj -scheme App build

# Archive
xcodebuild -project App.xcodeproj -scheme App archive \
  -archivePath build/App.xcarchive

# Export
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

---

## Recommendation

### Short Term (Next 2 weeks):
**Use Fastlane directly** - It's mature, well-documented, and solves 90% of the automation needs.

```bash
# Quick setup
cd ios/App
fastlane init
# Follow prompts

# Then automate with:
fastlane match development
fastlane gym
fastlane pilot upload
```

### Long Term (Next 1-2 months):
**Build custom iOS MCP server** if:
- You're doing lots of iOS projects
- You want AI-assisted iOS development
- You want to contribute to open source
- You need tighter integration with AI assistants

The MCP would wrap Fastlane + ASC API + xcodebuild in a clean interface.

---

## Conclusion

**No existing iOS development MCP exists**, but:

1. ✅ **Feasible to build**: ~3-4 weeks of work
2. ✅ **High value**: Automates 80% of iOS setup
3. ✅ **Reusable**: Benefits entire community
4. ✅ **Fill market gap**: First of its kind

**For JudgeFinder right now**: Use Fastlane directly (faster)
**For future**: Build iOS MCP as open source contribution

---

**Would you like me to**:
1. Create a basic iOS MCP server prototype?
2. Set up Fastlane for your project instead?
3. Document manual Xcode automation steps?

Let me know which direction you'd prefer!

