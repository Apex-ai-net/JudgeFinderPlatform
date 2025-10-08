#!/bin/bash

###############################################################################
# API Key Rotation Script for JudgeFinder.io
#
# This script generates new API keys and secrets for quarterly rotation
# Usage: ./scripts/rotate-api-keys.sh [--dry-run]
#
# IMPORTANT:
# - Review the output carefully before applying changes
# - Update your deployment environment variables immediately after rotation
# - Keep backup of old keys for 7 days for rollback capability
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ROTATION_DATE=$(date +%Y%m%d)
BACKUP_DIR="./logs/key-backups"
AUDIT_LOG="./logs/key-rotation-audit.json"

# Dry run flag
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}Running in DRY RUN mode - no changes will be made${NC}\n"
fi

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$AUDIT_LOG")"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  JudgeFinder.io API Key Rotation${NC}"
echo -e "${BLUE}  Date: $(date)${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to generate secure random key
generate_key() {
    local length=${1:-32}
    openssl rand -base64 "$length" | tr -d '\n' | head -c "$length"
}

# Function to generate hex key
generate_hex_key() {
    local bytes=${1:-32}
    openssl rand -hex "$bytes"
}

# Backup current .env file
backup_env() {
    if [[ -f ".env.local" ]]; then
        local backup_file="$BACKUP_DIR/.env.local.$ROTATION_DATE.backup"

        if [[ "$DRY_RUN" == false ]]; then
            cp .env.local "$backup_file"
            echo -e "${GREEN}✓${NC} Backed up .env.local to $backup_file"
        else
            echo -e "${YELLOW}[DRY RUN]${NC} Would backup .env.local to $backup_file"
        fi
    fi
}

# Generate new keys
generate_new_keys() {
    echo -e "\n${BLUE}Generating new API keys...${NC}\n"

    # Generate encryption key (64 char hex = 32 bytes)
    NEW_ENCRYPTION_KEY=$(generate_hex_key 32)
    echo -e "${GREEN}✓${NC} Generated new ENCRYPTION_KEY (64 chars)"

    # Generate JWT secret (128 char hex = 64 bytes)
    NEW_JWT_SECRET=$(generate_hex_key 64)
    echo -e "${GREEN}✓${NC} Generated new JWT_SECRET (128 chars)"

    # Generate internal API key
    NEW_INTERNAL_API_KEY=$(generate_key 48)
    echo -e "${GREEN}✓${NC} Generated new INTERNAL_API_KEY (48 chars)"

    # Generate webhook signing secret
    NEW_WEBHOOK_SECRET=$(generate_key 32)
    echo -e "${GREEN}✓${NC} Generated new WEBHOOK_SECRET (32 chars)"
}

# Create rotation summary
create_rotation_summary() {
    local summary_file="$BACKUP_DIR/rotation-summary-$ROTATION_DATE.txt"

    cat > "$summary_file" << EOF
API Key Rotation Summary
Date: $(date)
Rotation ID: $ROTATION_DATE

Keys Rotated:
- ENCRYPTION_KEY
- JWT_SECRET
- INTERNAL_API_KEY
- WEBHOOK_SECRET

Next Steps:
1. Review the generated keys below
2. Update environment variables in your deployment platform:
   - Netlify: Site settings > Environment variables
   - Vercel: Project settings > Environment Variables
   - AWS: Parameter Store or Secrets Manager

3. Deploy the changes
4. Verify all services are functioning
5. Keep this backup for 7 days for rollback

Generated Keys (STORE SECURELY):
================================================================================

ENCRYPTION_KEY="$NEW_ENCRYPTION_KEY"
JWT_SECRET="$NEW_JWT_SECRET"
INTERNAL_API_KEY="$NEW_INTERNAL_API_KEY"
WEBHOOK_SECRET="$NEW_WEBHOOK_SECRET"

================================================================================

Old keys backup location: $BACKUP_DIR/.env.local.$ROTATION_DATE.backup

IMPORTANT SECURITY NOTES:
- These keys grant full access to your application
- Store them in a secure password manager
- Never commit them to version control
- Delete this file after copying keys to production

EOF

    echo -e "\n${GREEN}✓${NC} Created rotation summary: $summary_file"
}

# Update .env.local file
update_env_file() {
    if [[ "$DRY_RUN" == true ]]; then
        echo -e "\n${YELLOW}[DRY RUN]${NC} Would update .env.local with new keys"
        return
    fi

    echo -e "\n${BLUE}Updating .env.local file...${NC}"

    # Create temporary file
    local temp_file=$(mktemp)

    if [[ -f ".env.local" ]]; then
        # Update existing keys
        sed -e "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=\"$NEW_ENCRYPTION_KEY\"/" \
            -e "s/^JWT_SECRET=.*/JWT_SECRET=\"$NEW_JWT_SECRET\"/" \
            -e "s/^INTERNAL_API_KEY=.*/INTERNAL_API_KEY=\"$NEW_INTERNAL_API_KEY\"/" \
            -e "s/^WEBHOOK_SECRET=.*/WEBHOOK_SECRET=\"$NEW_WEBHOOK_SECRET\"/" \
            .env.local > "$temp_file"

        mv "$temp_file" .env.local
        echo -e "${GREEN}✓${NC} Updated .env.local"
    else
        echo -e "${YELLOW}⚠${NC}  .env.local not found - keys not automatically updated"
    fi
}

# Create audit log entry
create_audit_entry() {
    local audit_entry=$(cat <<EOF
{
  "rotation_id": "$ROTATION_DATE",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "keys_rotated": [
    "ENCRYPTION_KEY",
    "JWT_SECRET",
    "INTERNAL_API_KEY",
    "WEBHOOK_SECRET"
  ],
  "performed_by": "$USER",
  "hostname": "$(hostname)",
  "dry_run": $DRY_RUN
}
EOF
    )

    if [[ "$DRY_RUN" == false ]]; then
        # Append to audit log
        if [[ -f "$AUDIT_LOG" ]]; then
            # Add comma and entry to existing array
            sed -i '$ d' "$AUDIT_LOG"  # Remove last ]
            echo "  ,$audit_entry" >> "$AUDIT_LOG"
            echo "]" >> "$AUDIT_LOG"
        else
            # Create new audit log
            echo "[$audit_entry]" > "$AUDIT_LOG"
        fi
        echo -e "${GREEN}✓${NC} Created audit log entry"
    else
        echo -e "${YELLOW}[DRY RUN]${NC} Would create audit log entry"
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}⚠  WARNING: This script will generate new API keys${NC}"
    echo -e "${YELLOW}⚠  Make sure to update all deployment environments${NC}\n"

    if [[ "$DRY_RUN" == false ]]; then
        read -p "Continue with key rotation? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Rotation cancelled${NC}"
            exit 1
        fi
    fi

    backup_env
    generate_new_keys
    create_rotation_summary
    update_env_file
    create_audit_entry

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}  Key Rotation Complete${NC}"
    echo -e "${GREEN}========================================${NC}\n"

    if [[ "$DRY_RUN" == false ]]; then
        echo -e "${BLUE}Next Steps:${NC}"
        echo -e "1. Review: $BACKUP_DIR/rotation-summary-$ROTATION_DATE.txt"
        echo -e "2. Update production environment variables"
        echo -e "3. Deploy changes"
        echo -e "4. Test all functionality"
        echo -e "5. Delete summary file after 7 days\n"

        echo -e "${YELLOW}⚠  IMPORTANT: Old keys backed up to $BACKUP_DIR${NC}"
        echo -e "${YELLOW}⚠  Keep for 7 days for rollback capability${NC}\n"
    else
        echo -e "${YELLOW}This was a DRY RUN - no changes were made${NC}"
        echo -e "${YELLOW}Run without --dry-run to perform actual rotation${NC}\n"
    fi
}

# Check for required commands
command -v openssl >/dev/null 2>&1 || {
    echo -e "${RED}Error: openssl is required but not installed${NC}" >&2
    exit 1
}

# Run main function
main
