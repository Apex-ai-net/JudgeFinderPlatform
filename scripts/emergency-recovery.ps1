# =====================================================
# JudgeFinder.io Emergency Recovery Script (PowerShell)
# =====================================================
# This script automates the recovery process for Windows
# Based on: docs/SITE_DIAGNOSTIC_REPORT_2025_10_10.md
#
# Usage:
#   .\scripts\emergency-recovery.ps1
# =====================================================

param(
    [string]$BaseUrl = "https://judgefinder.io",
    [string]$SupabaseProjectId = "xstlnicbnzdxlgfiewmg"
)

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

# Check if required commands exist
function Test-Requirements {
    Write-Info "Checking requirements..."
    
    $missing = @()
    
    if (-not (Get-Command curl -ErrorAction SilentlyContinue)) {
        $missing += "curl"
    }
    
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Warning "npm not found. Install Node.js from https://nodejs.org"
    }
    
    if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
        Write-Warning "Netlify CLI not found. Install with: npm install -g netlify-cli"
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne 'y') {
            exit 1
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-Error-Custom "Missing required commands: $($missing -join ', ')"
        exit 1
    }
    
    Write-Success "All requirements met"
}

# Test a single endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Info "Testing: $Name"
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -SkipHttpErrorCheck -TimeoutSec 10
        $status = $response.StatusCode
        
        if ($status -eq $ExpectedStatus) {
            Write-Success "$Name - HTTP $status ✓"
            return $true
        } else {
            Write-Error-Custom "$Name - HTTP $status (expected $ExpectedStatus)"
            return $false
        }
    } catch {
        Write-Error-Custom "$Name - Request failed: $_"
        return $false
    }
}

# Phase 1: System Diagnostics
function Start-Phase1Diagnostics {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Phase 1: System Diagnostics" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    
    Write-Info "Testing API endpoints..."
    
    Test-Endpoint -Name "Health Check" -Url "$BaseUrl/api/health" | Out-Null
    Test-Endpoint -Name "Judge List" -Url "$BaseUrl/api/judges/list?limit=5" | Out-Null
    Test-Endpoint -Name "Judge Search" -Url "$BaseUrl/api/judges/search?q=smith" | Out-Null
    Test-Endpoint -Name "Homepage" -Url $BaseUrl | Out-Null
    
    Write-Host ""
    Write-Info "Checking detailed health status..."
    try {
        $health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method Get -TimeoutSec 10
        $health | ConvertTo-Json -Depth 10 | Write-Host
    } catch {
        Write-Warning "Could not fetch health status"
    }
    
    Write-Host ""
    $continue = Read-Host "Continue with recovery? (y/n)"
    if ($continue -ne 'y') {
        Write-Info "Recovery cancelled by user"
        exit 0
    }
}

# Phase 2: Database Fix
function Start-Phase2DatabaseFix {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Phase 2: Database Fix" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    
    Write-Warning "This phase requires manual action in Supabase dashboard"
    Write-Host ""
    Write-Host "Steps:" -ForegroundColor Yellow
    Write-Host "1. Open: https://supabase.com/dashboard/project/$SupabaseProjectId/editor"
    Write-Host "2. Navigate to SQL Editor"
    Write-Host "3. Copy contents of: supabase\migrations\20251001_002_fix_search_function_return_type.sql"
    Write-Host "4. Paste into SQL Editor"
    Write-Host "5. Click 'Run'"
    Write-Host "6. Verify success: SELECT * FROM search_judges_ranked('test', NULL, 5, 0.3);"
    Write-Host ""
    
    # Offer to open files
    $openFile = Read-Host "Open migration file now? (y/n)"
    if ($openFile -eq 'y') {
        $migrationFile = "supabase\migrations\20251001_002_fix_search_function_return_type.sql"
        if (Test-Path $migrationFile) {
            Start-Process notepad.exe $migrationFile
        } else {
            Write-Warning "Migration file not found at: $migrationFile"
        }
    }
    
    $openBrowser = Read-Host "Open Supabase dashboard? (y/n)"
    if ($openBrowser -eq 'y') {
        Start-Process "https://supabase.com/dashboard/project/$SupabaseProjectId/editor"
    }
    
    Write-Host ""
    $confirmed = Read-Host "Have you completed the database fix? (y/n)"
    if ($confirmed -ne 'y') {
        Write-Warning "Skipping database fix. Some features may not work."
    } else {
        Write-Success "Database fix confirmed"
    }
}

# Phase 3: Environment Variables
function Start-Phase3EnvVars {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Phase 3: Environment Variables Check" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    
    if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
        Write-Warning "Netlify CLI not installed. Skipping env var check."
        Write-Info "Install with: npm install -g netlify-cli"
        return
    }
    
    Write-Info "Checking if linked to Netlify site..."
    $statusOutput = netlify status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Linked to Netlify site"
        
        Write-Info "Listing environment variables..."
        netlify env:list
    } else {
        Write-Warning "Not linked to Netlify site"
        Write-Info "Run: netlify link --name=olms-4375-tw501-x421"
    }
    
    Write-Host ""
    Write-Info "Critical environment variables that should be set:" -ForegroundColor Yellow
    @(
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_JWT_SECRET",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
        "UPSTASH_REDIS_REST_URL",
        "UPSTASH_REDIS_REST_TOKEN",
        "SYNC_API_KEY",
        "CRON_SECRET",
        "ENCRYPTION_KEY",
        "NEXT_PUBLIC_SITE_URL"
    ) | ForEach-Object {
        Write-Host "  - $_"
    }
    Write-Host ""
    
    $configure = Read-Host "Do you need to configure environment variables? (y/n)"
    if ($configure -eq 'y') {
        Write-Host ""
        Write-Info "Opening configuration guide..."
        $guideUrl = "https://supabase.com/dashboard/project/$SupabaseProjectId/settings/api"
        Write-Info "Supabase credentials: $guideUrl"
        
        $openGuide = Read-Host "Open Supabase settings in browser? (y/n)"
        if ($openGuide -eq 'y') {
            Start-Process $guideUrl
        }
        
        Write-Host ""
        Write-Info "Use these commands to set variables:" -ForegroundColor Yellow
        Write-Host "netlify env:set NEXT_PUBLIC_SUPABASE_URL ""your-value"""
        Write-Host "netlify env:set SUPABASE_SERVICE_ROLE_KEY ""your-value"""
        Write-Host "netlify env:set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ""your-value"""
        Write-Host "netlify env:set CLERK_SECRET_KEY ""your-value"""
        Write-Host "netlify env:set UPSTASH_REDIS_REST_URL ""your-value"""
        Write-Host "netlify env:set UPSTASH_REDIS_REST_TOKEN ""your-value"""
        Write-Host "netlify env:set SYNC_API_KEY ""your-value"""
        Write-Host "netlify env:set CRON_SECRET ""your-value"""
        Write-Host "netlify env:set ENCRYPTION_KEY ""your-value"""
        Write-Host "netlify env:set NEXT_PUBLIC_SITE_URL ""https://judgefinder.io"""
        Write-Host "netlify env:set SUPABASE_JWT_SECRET ""your-value"""
        Write-Host ""
    }
    
    $confirmed = Read-Host "Are all environment variables configured? (y/n)"
    if ($confirmed -ne 'y') {
        Write-Warning "Please configure environment variables before continuing"
    }
}

# Phase 4: Rebuild
function Start-Phase4Rebuild {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Phase 4: Rebuild Application" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    
    if (-not (Get-Command netlify -ErrorAction SilentlyContinue)) {
        Write-Warning "Netlify CLI not installed. Please rebuild via dashboard:"
        Write-Host "  https://app.netlify.com/sites/olms-4375-tw501-x421/deploys"
        Write-Host "  Click: Trigger deploy → Clear cache and deploy site"
        
        $openDashboard = Read-Host "Open Netlify dashboard? (y/n)"
        if ($openDashboard -eq 'y') {
            Start-Process "https://app.netlify.com/sites/olms-4375-tw501-x421/deploys"
        }
        return
    }
    
    Write-Info "Ready to trigger a clean rebuild..."
    
    $rebuild = Read-Host "Trigger Netlify rebuild now? (y/n)"
    if ($rebuild -eq 'y') {
        Write-Info "Triggering rebuild with cache clear..."
        netlify build --clear-cache
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Build failed"
        }
    } else {
        Write-Info "Skipping rebuild. You can trigger manually via Netlify dashboard"
    }
}

# Phase 5: Verification
function Start-Phase5Verification {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Phase 5: Post-Recovery Verification" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    
    Write-Info "Waiting 30 seconds for deployment to stabilize..."
    Start-Sleep -Seconds 30
    
    Write-Info "Testing all critical endpoints..."
    
    $failures = 0
    
    if (-not (Test-Endpoint -Name "Health Check" -Url "$BaseUrl/api/health")) { $failures++ }
    if (-not (Test-Endpoint -Name "Judge List" -Url "$BaseUrl/api/judges/list?limit=5")) { $failures++ }
    if (-not (Test-Endpoint -Name "Judge Search" -Url "$BaseUrl/api/judges/search?q=smith&limit=5")) { $failures++ }
    if (-not (Test-Endpoint -Name "Courts API" -Url "$BaseUrl/api/courts?limit=5")) { $failures++ }
    if (-not (Test-Endpoint -Name "Homepage" -Url $BaseUrl)) { $failures++ }
    
    Write-Host ""
    if ($failures -eq 0) {
        Write-Success "All tests passed! ✓"
        Write-Success "Site appears to be functional"
    } else {
        Write-Warning "$failures tests failed"
        Write-Warning "Review errors above and check logs"
    }
    
    # Test search response
    Write-Host ""
    Write-Info "Testing search response data..."
    try {
        $searchResponse = Invoke-RestMethod -Uri "$BaseUrl/api/judges/search?q=smith&limit=5" -Method Get -TimeoutSec 10
        if ($searchResponse.results) {
            $count = $searchResponse.results.Count
            Write-Success "Search returned $count results"
        } else {
            Write-Error-Custom "Search response is invalid"
        }
    } catch {
        Write-Error-Custom "Search request failed: $_"
    }
}

# Phase 6: Analytics (Optional)
function Start-Phase6Analytics {
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Phase 6: Analytics Cache Generation (Optional)" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    
    Write-Info "Analytics cache generation takes ~13-14 minutes"
    Write-Info "This will improve profile load times from 15-20s to <100ms"
    Write-Host ""
    
    $generate = Read-Host "Generate analytics cache now? (y/n)"
    if ($generate -eq 'y') {
        Write-Info "Starting analytics generation..."
        npm run analytics:generate
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Analytics generation failed"
        }
    } else {
        Write-Info "Skipping analytics generation"
        Write-Info "You can run later with: npm run analytics:generate"
    }
}

# Main execution
function Start-Recovery {
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "JudgeFinder.io Emergency Recovery Script" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This script will guide you through recovering the site."
    Write-Host "It follows the plan in: docs\SITE_DIAGNOSTIC_REPORT_2025_10_10.md"
    Write-Host ""
    
    Test-Requirements
    
    Start-Phase1Diagnostics
    Start-Phase2DatabaseFix
    Start-Phase3EnvVars
    Start-Phase4Rebuild
    Start-Phase5Verification
    Start-Phase6Analytics
    
    Write-Host ""
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "Recovery Process Complete" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Info "Next steps:"
    Write-Host "  1. Monitor error rates in Sentry"
    Write-Host "  2. Watch Netlify function logs: netlify functions:log"
    Write-Host "  3. Test major user flows"
    Write-Host "  4. Set up uptime monitoring"
    Write-Host ""
    Write-Success "See docs\SITE_DIAGNOSTIC_REPORT_2025_10_10.md for details"
}

# Run main function
Start-Recovery

