#!/bin/bash

# ============================================
# Build Security Verification Script
# ============================================
# Run this script before committing or deploying to verify:
# 1. No secrets are present in the codebase
# 2. Environment variables are properly configured
# 3. Build completes successfully
# 4. No sensitive data in build artifacts
#
# Usage:
#   chmod +x scripts/verify-build-security.sh
#   ./scripts/verify-build-security.sh
# ============================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

echo "============================================"
echo "Build Security Verification"
echo "============================================"
echo ""

# ============================================
# FUNCTION: Print colored messages
# ============================================

print_error() {
    echo -e "${RED}✗ ERROR: $1${NC}"
    ((ERRORS++))
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
    ((WARNINGS++))
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# ============================================
# CHECK 1: Verify no .env files are committed
# ============================================

echo "----------------------------------------"
echo "Check 1: Verifying no .env files in git"
echo "----------------------------------------"

if git rev-parse --git-dir > /dev/null 2>&1; then
    # Check staged files
    ENV_FILES=$(git diff --cached --name-only | grep -E '\.env(\.|$)' || true)

    if [ ! -z "$ENV_FILES" ]; then
        print_error "Environment files are staged for commit:"
        echo "$ENV_FILES"
        echo "Run: git reset HEAD .env* to unstage them"
    else
        print_success "No .env files staged for commit"
    fi

    # Check tracked files
    TRACKED_ENV=$(git ls-files | grep -E '\.env(\.|$)' | grep -v '.env.example' | grep -v '.env.production.example' || true)

    if [ ! -z "$TRACKED_ENV" ]; then
        print_error "Environment files are tracked by git:"
        echo "$TRACKED_ENV"
        echo "Run: git rm --cached <file> to untrack them"
    else
        print_success "No .env files tracked by git (except examples)"
    fi
else
    print_warning "Not a git repository, skipping git checks"
fi

echo ""

# ============================================
# CHECK 2: Scan for common secret patterns
# ============================================

echo "----------------------------------------"
echo "Check 2: Scanning for secret patterns"
echo "----------------------------------------"

TEMP_SCAN_FILE=$(mktemp)

# Patterns to search for
PATTERN_REGEX='sk_live_[a-zA-Z0-9]+|sk_test_[a-zA-Z0-9]+|pk_live_[a-zA-Z0-9]+|rk_live_[a-zA-Z0-9]+|whsec_[a-zA-Z0-9]+|AIzaSy[a-zA-Z0-9_-]+|sk-proj-[a-zA-Z0-9]+|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+|postgres://[^[:space:]]+|mysql://[^[:space:]]+|mongodb://[^[:space:]]+'

# In post stage, only scan code roots; otherwise do a repo-wide soft scan
if [ "$1" = "post" ]; then
    SEARCH_ROOTS=(app components lib scripts netlify/functions)
    for root in "${SEARCH_ROOTS[@]}"; do
        if [ -d "$root" ]; then
            MATCHES=$(grep -r -n -E "$PATTERN_REGEX" "$root" \
                --exclude-dir={tests,__tests__,__mocks__} \
                --exclude="*.map" --exclude="*.md" --exclude="*.log" \
                --exclude="verify-build-security.sh" \
                --exclude="pre-commit-security-check.sh" \
                2>/dev/null || true)
            if [ -n "$MATCHES" ]; then
                echo "$MATCHES" >> "$TEMP_SCAN_FILE"
            fi
        fi
    done
else
    # Soft scan of entire repo excluding common dirs/files
    MATCHES=$(grep -r -n -E "$PATTERN_REGEX" . \
        --exclude-dir={.next,node_modules,.git,.netlify,coverage,out,build,dist,.cache,.parcel-cache,docs,tests,__tests__,__mocks__} \
        --exclude="*.log" --exclude="*.md" --exclude="*.map" \
        --exclude="*.tsbuildinfo" --exclude=".env.example" --exclude=".env.production.example" \
        --exclude="package-lock.json" --exclude="verify-build-security.sh" --exclude="pre-commit-security-check.sh" --exclude="netlify-env-update.sh" \
        2>/dev/null || true)
    if [ -n "$MATCHES" ]; then
        echo "$MATCHES" >> "$TEMP_SCAN_FILE"
    fi
fi

if [ -s "$TEMP_SCAN_FILE" ]; then
    if [ -n "$CI" ] && [ "$1" != "post" ]; then
        print_warning "Potential secrets found (non-post stage):"
        head -50 "$TEMP_SCAN_FILE"
        rm -f "$TEMP_SCAN_FILE"
        echo ""
        # Do not fail in non-post stages
    else
        echo "---- Offending lines (showing up to 50) ----"
        head -50 "$TEMP_SCAN_FILE"
        echo "------------------------------------------"
        print_error "Secret-like patterns detected in code roots"
        rm -f "$TEMP_SCAN_FILE"
        exit 1
    fi
else
    print_success "No common secret patterns detected"
fi

echo ""

# ============================================
# CHECK 3: Verify required environment variables
# ============================================

echo "----------------------------------------"
echo "Check 3: Verifying environment variables"
echo "----------------------------------------"

# Check if .env.local exists for local development
if [ ! -f ".env.local" ] && [ "$NODE_ENV" != "production" ]; then
    print_warning ".env.local not found (required for local development)"
    echo "Copy .env.example to .env.local and fill in values"
else
    print_success "Environment configuration found"
fi

# Required environment variables for build
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
)

# Source .env.local if it exists
if [ -f ".env.local" ]; then
    set -a
    source .env.local
    set +a
fi

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    print_success "All required public environment variables are set"
else
    print_warning "Missing environment variables (build may succeed but app may not function):"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
fi

echo ""

# ============================================
# CHECK 4: Verify .gitignore and .netlifyignore
# ============================================

echo "----------------------------------------"
echo "Check 4: Verifying ignore files"
echo "----------------------------------------"

# Check .gitignore
if [ -f ".gitignore" ]; then
    if grep -q "^\.env$" .gitignore && grep -q "^\.env\.\*$" .gitignore; then
        print_success ".gitignore properly configured for .env files"
    else
        print_error ".gitignore missing .env patterns"
        echo "Add these lines to .gitignore:"
        echo "  .env"
        echo "  .env.*"
        echo "  !.env.example"
    fi
else
    print_error ".gitignore not found"
fi

# Check .netlifyignore
if [ -f ".netlifyignore" ]; then
    if grep -q "\.env" .netlifyignore; then
        print_success ".netlifyignore properly configured for .env files"
    else
        print_warning ".netlifyignore missing .env patterns"
        echo "Consider adding .env patterns to .netlifyignore"
    fi
else
    print_warning ".netlifyignore not found (Netlify will use .gitignore)"
fi

echo ""

# ============================================
# CHECK 5: Validate package.json scripts
# ============================================

echo "----------------------------------------"
echo "Check 5: Validating build configuration"
echo "----------------------------------------"

if [ -f "package.json" ]; then
    if grep -q '"build":' package.json; then
        print_success "Build script found in package.json"
    else
        print_error "No build script in package.json"
    fi

    if grep -q '"validate:env"' package.json; then
        print_success "Environment validation script found"
    else
        print_warning "No environment validation script found"
        echo "Consider adding 'validate:env' script to package.json"
    fi
else
    print_error "package.json not found"
fi

echo ""

# ============================================
# CHECK 6: Test build (optional)
# ============================================

echo "----------------------------------------"
echo "Check 6: Test build (optional)"
echo "----------------------------------------"

# Skip interactive prompt in CI or when script is invoked with stage args (pre/post)
if [ -n "$CI" ] || [ "$1" = "pre" ] || [ "$1" = "post" ]; then
    print_info "CI/stage mode detected; skipping optional test build"
    run_build="n"
else
    read -p "Do you want to run a test build? This may take a few minutes. (y/n): " run_build
fi

if [ "$run_build" = "y" ]; then
    print_info "Starting test build..."

    # Clean previous build
    rm -rf .next

    # Run build
    if npm run build 2>&1 | tee build.log; then
        print_success "Build completed successfully"

        # Check build output for warnings
        if grep -i "warning" build.log > /dev/null; then
            print_warning "Build completed with warnings (see build.log)"
        fi

        # Check for secret-like patterns in build output
        SECRET_PATTERNS="sk_live_|sk_test_|SUPABASE_SERVICE_ROLE_KEY|CLERK_SECRET_KEY"
        if grep -E "$SECRET_PATTERNS" .next/**/*.js 2>/dev/null | grep -v "node_modules" | head -5; then
            print_error "Potential secrets found in build artifacts!"
            echo "This suggests server-side secrets may be bundled in client code"
            echo "Review your code for improper use of process.env in client components"
        else
            print_success "No secrets detected in build artifacts"
        fi
    else
        print_error "Build failed (see build.log for details)"
    fi

    # Clean up
    rm -f build.log
else
    print_info "Skipping test build"
fi

echo ""

# ============================================
# CHECK 7: Verify Netlify configuration
# ============================================

echo "----------------------------------------"
echo "Check 7: Verifying Netlify configuration"
echo "----------------------------------------"

if [ -f "netlify.toml" ]; then
    print_success "netlify.toml found"

    # Check for secrets scanning configuration
    if grep -q "SECRETS_SCAN_OMIT_PATHS" netlify.toml; then
        print_success "Secrets scanning configuration found"
    else
        print_warning "No secrets scanning configuration in netlify.toml"
        echo "Consider adding SECRETS_SCAN_OMIT_PATHS and SECRETS_SCAN_OMIT_KEYS"
    fi

    # Check for build command
    if grep -q 'command = "npm run build' netlify.toml; then
        print_success "Build command configured"
    else
        print_warning "Build command not found in netlify.toml"
    fi
else
    print_warning "netlify.toml not found"
    echo "Create netlify.toml to configure Netlify deployment settings"
fi

echo ""

# ============================================
# CHECK 8: Scan staged files for secrets
# ============================================

echo "----------------------------------------"
echo "Check 8: Scanning staged files"
echo "----------------------------------------"

if git rev-parse --git-dir > /dev/null 2>&1; then
    STAGED_FILES=$(git diff --cached --name-only)

    if [ ! -z "$STAGED_FILES" ]; then
        print_info "Scanning $(echo "$STAGED_FILES" | wc -l) staged files..."

        STAGED_SECRETS=false
        for file in $STAGED_FILES; do
            if [ -f "$file" ]; then
                # Check for common secret patterns
                if grep -qE 'sk_live_|sk_test_|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.|postgres://|mysql://' "$file" 2>/dev/null; then
                    print_error "Potential secret found in staged file: $file"
                    STAGED_SECRETS=true
                fi
            fi
        done

        if [ "$STAGED_SECRETS" = false ]; then
            print_success "No secrets detected in staged files"
        fi
    else
        print_info "No files staged for commit"
    fi
else
    print_warning "Not a git repository, skipping staged files check"
fi

echo ""

# ============================================
# SUMMARY
# ============================================

echo "============================================"
echo "Verification Summary"
echo "============================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Ready to commit/deploy.${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ ${WARNINGS} warning(s) found. Review before proceeding.${NC}"
    exit 0
else
    echo -e "${RED}✗ ${ERRORS} error(s) and ${WARNINGS} warning(s) found.${NC}"
    echo ""
    echo "Please fix all errors before committing or deploying."
    echo ""
    echo "Common fixes:"
    echo "  1. Remove .env files from git: git rm --cached .env*"
    echo "  2. Add secrets to .gitignore and .netlifyignore"
    echo "  3. Move hardcoded secrets to environment variables"
    echo "  4. Verify Netlify environment variables are set"
    echo ""
    exit 1
fi
