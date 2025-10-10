# =====================================================
# JudgeFinder.io Recovery Verification Script
# =====================================================
# Tests all critical endpoints to verify site is working
#
# Usage:
#   .\scripts\test-recovery.ps1
#   .\scripts\test-recovery.ps1 -BaseUrl "https://staging.judgefinder.io"
# =====================================================

param(
    [string]$BaseUrl = "https://judgefinder.io"
)

# Colors for output
function Write-TestHeader {
    param([string]$Message)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-TestName {
    param([string]$Message)
    Write-Host "Testing: " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Pass {
    param([string]$Message)
    Write-Host "  ✓ PASS: " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Fail {
    param([string]$Message)
    Write-Host "  ✗ FAIL: " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Write-Info {
    param([string]$Message)
    Write-Host "  ℹ INFO: " -ForegroundColor Blue -NoNewline
    Write-Host $Message
}

# Test counter
$script:totalTests = 0
$script:passedTests = 0
$script:failedTests = 0

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$ExpectedStatus = 200,
        [scriptblock]$Validator = $null
    )
    
    $script:totalTests++
    Write-TestName $Name
    Write-Info "URL: $Url"
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -SkipHttpErrorCheck -TimeoutSec 10
        $status = $response.StatusCode
        
        # Check status code
        if ($status -ne $ExpectedStatus) {
            Write-Fail "HTTP $status (expected $ExpectedStatus)"
            $script:failedTests++
            return $false
        }
        
        Write-Pass "HTTP $status"
        
        # Run custom validator if provided
        if ($Validator) {
            try {
                $content = $response.Content | ConvertFrom-Json
                $validationResult = & $Validator $content
                
                if ($validationResult) {
                    Write-Pass "Validation passed"
                    $script:passedTests++
                    return $true
                } else {
                    Write-Fail "Validation failed"
                    $script:failedTests++
                    return $false
                }
            } catch {
                Write-Fail "Validation error: $_"
                $script:failedTests++
                return $false
            }
        } else {
            $script:passedTests++
            return $true
        }
    } catch {
        Write-Fail "Request failed: $_"
        $script:failedTests++
        return $false
    }
}

# Start testing
Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║   JudgeFinder.io Recovery Verification   ║" -ForegroundColor Magenta
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "Testing site: $BaseUrl"
Write-Host ""

# Test 1: Health Check
Write-TestHeader "Test 1: Health Check Endpoint"
Test-Endpoint -Name "Health Check" -Url "$BaseUrl/api/health" -Validator {
    param($data)
    
    if (-not $data.status) {
        Write-Fail "Missing 'status' field"
        return $false
    }
    
    $validStatuses = @("healthy", "degraded")
    if ($data.status -notin $validStatuses) {
        Write-Fail "Status is '$($data.status)' (expected: healthy or degraded)"
        return $false
    }
    
    Write-Info "Status: $($data.status)"
    
    if ($data.checks) {
        Write-Info "Database: $($data.checks.database)"
        Write-Info "Redis: $($data.checks.redis)"
        Write-Info "Memory: $($data.checks.memory)"
    }
    
    return $true
}

# Test 2: Judge List
Write-TestHeader "Test 2: Judge List Endpoint"
Test-Endpoint -Name "Judge List (first 5)" -Url "$BaseUrl/api/judges/list?limit=5" -Validator {
    param($data)
    
    if (-not $data.judges) {
        Write-Fail "Missing 'judges' array"
        return $false
    }
    
    if (-not $data.total_count) {
        Write-Fail "Missing 'total_count' field"
        return $false
    }
    
    $count = $data.judges.Count
    if ($count -eq 0) {
        Write-Fail "No judges returned"
        return $false
    }
    
    Write-Info "Total judges: $($data.total_count)"
    Write-Info "Returned: $count judges"
    
    # Check first judge has required fields
    $firstJudge = $data.judges[0]
    $requiredFields = @("id", "name", "slug")
    
    foreach ($field in $requiredFields) {
        if (-not $firstJudge.$field) {
            Write-Fail "Judge missing required field: $field"
            return $false
        }
    }
    
    Write-Info "First judge: $($firstJudge.name)"
    
    return $true
}

# Test 3: Search
Write-TestHeader "Test 3: Judge Search Endpoint"
Test-Endpoint -Name "Search (query: 'smith')" -Url "$BaseUrl/api/judges/search?q=smith&limit=5" -Validator {
    param($data)
    
    if (-not $data.results) {
        Write-Fail "Missing 'results' array"
        return $false
    }
    
    if (-not ($data.PSObject.Properties.Name -contains 'total_count')) {
        Write-Fail "Missing 'total_count' field"
        return $false
    }
    
    $count = $data.results.Count
    
    Write-Info "Total results: $($data.total_count)"
    Write-Info "Returned: $count results"
    
    if ($count -gt 0) {
        $firstResult = $data.results[0]
        Write-Info "First result: $($firstResult.name)"
        
        # Verify required fields
        if (-not $firstResult.id -or -not $firstResult.name) {
            Write-Fail "Result missing required fields"
            return $false
        }
    }
    
    return $true
}

# Test 4: Courts API
Write-TestHeader "Test 4: Courts List Endpoint"
Test-Endpoint -Name "Courts List" -Url "$BaseUrl/api/courts?limit=5" -Validator {
    param($data)
    
    if (-not $data.courts) {
        Write-Fail "Missing 'courts' array"
        return $false
    }
    
    if (-not ($data.PSObject.Properties.Name -contains 'total_count')) {
        Write-Fail "Missing 'total_count' field"
        return $false
    }
    
    Write-Info "Total courts: $($data.total_count)"
    Write-Info "Returned: $($data.courts.Count) courts"
    
    if ($data.courts.Count -gt 0) {
        Write-Info "First court: $($data.courts[0].name)"
    }
    
    return $true
}

# Test 5: Jurisdictions API
Write-TestHeader "Test 5: Jurisdictions Endpoint"
Test-Endpoint -Name "Jurisdictions List" -Url "$BaseUrl/api/jurisdictions" -Validator {
    param($data)
    
    if (-not $data) {
        Write-Fail "No data returned"
        return $false
    }
    
    # Should be an array
    if ($data -isnot [array]) {
        Write-Fail "Expected array of jurisdictions"
        return $false
    }
    
    Write-Info "Total jurisdictions: $($data.Count)"
    
    if ($data.Count -gt 0) {
        Write-Info "First jurisdiction: $($data[0].name)"
    }
    
    return $true
}

# Test 6: Homepage
Write-TestHeader "Test 6: Homepage Load"
Test-Endpoint -Name "Homepage" -Url $BaseUrl

# Test 7: Static Pages
Write-TestHeader "Test 7: Static Pages"
Test-Endpoint -Name "About Page" -Url "$BaseUrl/about"
Test-Endpoint -Name "Privacy Page" -Url "$BaseUrl/privacy"
Test-Endpoint -Name "Terms Page" -Url "$BaseUrl/terms"

# Test 8: Search Page
Write-TestHeader "Test 8: Search Page"
Test-Endpoint -Name "Search Page" -Url "$BaseUrl/search"

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Test Summary" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Total Tests: $script:totalTests"
Write-Host "Passed: " -NoNewline
Write-Host "$script:passedTests" -ForegroundColor Green
Write-Host "Failed: " -NoNewline
Write-Host "$script:failedTests" -ForegroundColor Red
Write-Host ""

# Calculate pass rate
$passRate = [math]::Round(($script:passedTests / $script:totalTests) * 100, 1)
Write-Host "Pass Rate: " -NoNewline

if ($passRate -eq 100) {
    Write-Host "$passRate%" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎉 ALL TESTS PASSED! 🎉" -ForegroundColor Green
    Write-Host "Your site is fully operational!" -ForegroundColor Green
} elseif ($passRate -ge 80) {
    Write-Host "$passRate%" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  SITE IS MOSTLY FUNCTIONAL" -ForegroundColor Yellow
    Write-Host "Some features may not be working correctly." -ForegroundColor Yellow
    Write-Host "Review failed tests above." -ForegroundColor Yellow
} else {
    Write-Host "$passRate%" -ForegroundColor Red
    Write-Host ""
    Write-Host "❌ SITE HAS CRITICAL ISSUES" -ForegroundColor Red
    Write-Host "Review failed tests and recovery steps." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Exit with appropriate code
if ($script:failedTests -eq 0) {
    exit 0
} else {
    exit 1
}

