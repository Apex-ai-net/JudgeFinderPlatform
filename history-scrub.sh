#!/bin/bash
set -euo pipefail

###############################################################################
# Git History Scrubbing Script
# Purpose: Remove secrets from git history (DESTRUCTIVE - rewrites history)
# Prerequisites: Install git-filter-repo: pip install git-filter-repo
###############################################################################

echo "=========================================="
echo "GIT HISTORY SECRETS SCRUBBING"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This script rewrites git history!"
echo "   - All commit SHAs will change"
echo "   - Requires force-push to remote"
echo "   - Team members must re-clone the repo"
echo ""
read -p "Type 'SCRUB' to continue or Ctrl+C to abort: " confirm

if [ "$confirm" != "SCRUB" ]; then
  echo "❌ Aborted"
  exit 1
fi

###############################################################################
# Step 1: Backup current repo
###############################################################################
echo ""
echo "[1/6] Creating backup..."
BACKUP_DIR="../JudgeFinder-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"

###############################################################################
# Step 2: Create replacements file for BFG or git-filter-repo
###############################################################################
echo ""
echo "[2/6] Creating replacements file..."

cat > /tmp/replacements.txt <<'EOF'
# JWT tokens (full and partial)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzdGxuaWNibnpkeGxnZmlld21nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjMzNzMzNCwiZXhwIjoyMDcxOTEzMzM0fQ.g7gsBTUa_Ij2aLJ6dYxMUkurHmg8VDjd_Ma_4JvbXRY==>***REMOVED_SERVICE_ROLE_KEY***

# Database password
Zhn7BuF6HX5bhSwz==>***REMOVED_DB_PASSWORD***

# Generic patterns (add any other found secrets)
regex:eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}==>***REMOVED_JWT_TOKEN***
EOF

echo "✅ Replacements file created"

###############################################################################
# Step 3: Check if git-filter-repo is installed
###############################################################################
echo ""
echo "[3/6] Checking for git-filter-repo..."

if ! command -v git-filter-repo &> /dev/null; then
  echo "❌ git-filter-repo not found"
  echo "   Install with: pip install git-filter-repo"
  echo "   Or on macOS: brew install git-filter-repo"
  exit 1
fi

echo "✅ git-filter-repo installed"

###############################################################################
# Step 4: Remove files from history
###############################################################################
echo ""
echo "[4/6] Removing files containing secrets from all history..."

# Remove eslint-report.json (contains secrets in source snapshots)
git-filter-repo --path eslint-report.json --invert-paths --force

# Remove .claude/settings.local.json if it exists in history
git-filter-repo --path .claude/settings.local.json --invert-paths --force --partial

echo "✅ Files removed from history"

###############################################################################
# Step 5: Replace secret strings in remaining files
###############################################################################
echo ""
echo "[5/6] Replacing secret strings in git history..."

git-filter-repo --replace-text /tmp/replacements.txt --force --partial

echo "✅ Secrets replaced in history"

###############################################################################
# Step 6: Clean up and verify
###############################################################################
echo ""
echo "[6/6] Cleaning up and verifying..."

# Remove temp file
rm /tmp/replacements.txt

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo "✅ Cleanup complete"

###############################################################################
# Verification
###############################################################################
echo ""
echo "=========================================="
echo "VERIFICATION"
echo "=========================================="
echo ""

echo "Searching for remaining secrets in history..."
echo ""

# Check for JWT patterns
echo "[1] Checking for JWT tokens..."
if git log --all --source --full-history -S 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' | grep -q 'commit'; then
  echo "❌ WARNING: JWT tokens still found in history!"
  git log --all --source --full-history -S 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' --oneline | head -5
else
  echo "✅ No JWT tokens found"
fi

# Check for database password
echo ""
echo "[2] Checking for database password..."
if git log --all --source --full-history -S 'Zhn7BuF6HX5bhSwz' | grep -q 'commit'; then
  echo "❌ WARNING: Database password still found in history!"
  git log --all --source --full-history -S 'Zhn7BuF6HX5bhSwz' --oneline | head -5
else
  echo "✅ No database password found"
fi

# Check for eslint-report.json
echo ""
echo "[3] Checking for eslint-report.json..."
if git log --all --source --full-history -- eslint-report.json | grep -q 'commit'; then
  echo "❌ WARNING: eslint-report.json still in history!"
  git log --all --source --full-history -- eslint-report.json --oneline | head -5
else
  echo "✅ eslint-report.json removed from history"
fi

###############################################################################
# Force Push Instructions
###############################################################################
echo ""
echo "=========================================="
echo "NEXT STEPS"
echo "=========================================="
echo ""
echo "History has been rewritten. To apply changes to remote:"
echo ""
echo "1. Verify backup is safe: ls -lh $BACKUP_DIR"
echo ""
echo "2. Force push to ALL remotes (DESTRUCTIVE):"
echo "   git push origin --all --force"
echo "   git push origin --tags --force"
echo ""
echo "3. Notify team members to re-clone:"
echo "   rm -rf JudgeFinderPlatform"
echo "   git clone <repo-url>"
echo ""
echo "4. Alternative for team members (if they have local commits):"
echo "   git fetch origin"
echo "   git reset --hard origin/main  # or their branch"
echo "   git clean -fdx"
echo ""
echo "5. CRITICAL: Rotate secrets immediately (see RUNBOOK.md)"
echo ""
echo "=========================================="
echo ""
echo "✅ History scrubbing complete!"
echo "   Backup: $BACKUP_DIR"
echo ""
