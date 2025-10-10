#!/bin/bash

# ============================================
# Pre-Commit Security Check Hook
# ============================================
# This script runs automatically before each git commit
# to prevent accidentally committing secrets or sensitive files
#
# Installation:
#   chmod +x scripts/pre-commit-security-check.sh
#   cp scripts/pre-commit-security-check.sh .git/hooks/pre-commit
#
# Or use with husky (recommended):
#   Add to .husky/pre-commit
# ============================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Running pre-commit security checks..."
echo ""

ERRORS=0

# ============================================
# CHECK 1: Prevent committing .env files
# ============================================

echo "Checking for .env files..."

ENV_FILES=$(git diff --cached --name-only | grep -E '\.env(\.|$)' | grep -v '.env.example' | grep -v '.env.production.example' || true)

if [ ! -z "$ENV_FILES" ]; then
    echo -e "${RED}✗ ERROR: Environment files are staged for commit:${NC}"
    echo "$ENV_FILES"
    echo ""
    echo "These files contain sensitive data and should never be committed."
    echo ""
    echo "To fix:"
    echo "  git reset HEAD .env*"
    echo ""
    echo "Make sure these patterns are in .gitignore:"
    echo "  .env"
    echo "  .env.*"
    echo "  !.env.example"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No .env files staged${NC}"
fi

echo ""

# ============================================
# CHECK 2: Scan staged files for secrets
# ============================================

echo "Scanning staged files for secrets..."

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ ! -z "$STAGED_FILES" ]; then
    SECRET_FOUND=false

    # Patterns to check for
    PATTERNS=(
        'sk_live_[a-zA-Z0-9]+'
        'sk_test_[a-zA-Z0-9]+'
        'pk_live_[a-zA-Z0-9]+'
        'rk_live_[a-zA-Z0-9]+'
        'whsec_[a-zA-Z0-9]+'
        'sk-proj-[a-zA-Z0-9_-]{20,}'
        'AIzaSy[a-zA-Z0-9_-]{33}'
        'postgres://[^[:space:]]+'
        'mysql://[^[:space:]]+'
        'mongodb://[^[:space:]]+'
    )

    for file in $STAGED_FILES; do
        if [ -f "$file" ]; then
            for pattern in "${PATTERNS[@]}"; do
                if grep -qE "$pattern" "$file" 2>/dev/null; then
                    if [ "$SECRET_FOUND" = false ]; then
                        echo -e "${RED}✗ ERROR: Potential secrets found in staged files:${NC}"
                        SECRET_FOUND=true
                        ERRORS=$((ERRORS + 1))
                    fi
                    echo "  $file: matches pattern $pattern"
                fi
            done
        fi
    done

    if [ "$SECRET_FOUND" = false ]; then
        echo -e "${GREEN}✓ No secrets detected in staged files${NC}"
    else
        echo ""
        echo "To fix:"
        echo "  1. Remove the secret from the file"
        echo "  2. Add it to environment variables instead"
        echo "  3. Update .gitignore if needed"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠ No files staged for commit${NC}"
fi

echo ""

# ============================================
# CHECK 3: Prevent committing sensitive files
# ============================================

echo "Checking for sensitive files..."

SENSITIVE_FILES=$(git diff --cached --name-only | grep -E '(keys?\.txt|secrets?\.txt|credentials?\.json|PRODUCTION_KEYS|NETLIFY_ENV_VARIABLES|backup.*\.json)' || true)

if [ ! -z "$SENSITIVE_FILES" ]; then
    echo -e "${RED}✗ ERROR: Sensitive files are staged for commit:${NC}"
    echo "$SENSITIVE_FILES"
    echo ""
    echo "To fix:"
    echo "  git reset HEAD <filename>"
    echo "  echo '<filename>' >> .gitignore"
    echo ""
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ No sensitive files staged${NC}"
fi

echo ""

# ============================================
# CHECK 4: Verify files are in .gitignore
# ============================================

echo "Verifying .gitignore configuration..."

if [ -f ".gitignore" ]; then
    REQUIRED_PATTERNS=("^\.env$" "^\.env\.\*$" "^\*\.key$" "^\*\.pem$")
    MISSING_PATTERNS=()

    for pattern in "${REQUIRED_PATTERNS[@]}"; do
        if ! grep -qE "$pattern" .gitignore; then
            MISSING_PATTERNS+=("$pattern")
        fi
    done

    if [ ${#MISSING_PATTERNS[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ .gitignore properly configured${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING: .gitignore missing patterns:${NC}"
        for pattern in "${MISSING_PATTERNS[@]}"; do
            echo "  $pattern"
        done
        echo ""
        echo "Add these patterns to .gitignore to prevent accidentally committing secrets"
        echo ""
    fi
else
    echo -e "${RED}✗ ERROR: .gitignore not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================
# CHECK 5: Verify commit message (optional)
# ============================================

# Skip this check if SKIP_COMMIT_MSG_CHECK is set
if [ -z "$SKIP_COMMIT_MSG_CHECK" ]; then
    COMMIT_MSG_FILE=".git/COMMIT_EDITMSG"

    if [ -f "$COMMIT_MSG_FILE" ]; then
        COMMIT_MSG=$(cat "$COMMIT_MSG_FILE" 2>/dev/null || echo "")

        # Check if commit message contains patterns that might indicate committed secrets
        if echo "$COMMIT_MSG" | grep -qiE '(api.?key|secret|password|token|credentials?)'; then
            echo -e "${YELLOW}⚠ WARNING: Commit message mentions secrets/keys${NC}"
            echo "Make sure you're not describing committed secrets in the message"
            echo ""
        fi
    fi
fi

# ============================================
# RESULTS
# ============================================

echo "========================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All security checks passed${NC}"
    echo "Proceeding with commit..."
    exit 0
else
    echo -e "${RED}✗ Security checks failed with $ERRORS error(s)${NC}"
    echo ""
    echo "Commit aborted to protect sensitive data."
    echo ""
    echo "To bypass this check (NOT RECOMMENDED):"
    echo "  git commit --no-verify"
    echo ""
    echo "To skip commit message check:"
    echo "  SKIP_COMMIT_MSG_CHECK=1 git commit"
    echo ""
    exit 1
fi
