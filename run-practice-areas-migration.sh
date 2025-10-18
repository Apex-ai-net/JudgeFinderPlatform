#!/bin/bash

# ============================================================================
# Practice Areas Migration Runner
# ============================================================================
# This script helps run the practice_areas migration on Supabase
# Created: 2025-10-17
# Migration: 20251017_add_practice_areas_to_app_users.sql
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Migration details
MIGRATION_FILE="supabase/migrations/20251017_add_practice_areas_to_app_users.sql"
PROJECT_REF="lgmqmpmaqkuwybqpofwc"

echo -e "${BLUE}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Practice Areas Migration Runner            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}✗ Error: Migration file not found: $MIGRATION_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Migration file found${NC}"
echo ""

# Show options
echo -e "${YELLOW}Select migration method:${NC}"
echo ""
echo "1) Supabase Dashboard (Manual - Recommended)"
echo "2) Supabase CLI (Automated)"
echo "3) Direct psql Connection"
echo "4) Show Migration SQL Only"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
  1)
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Manual Migration via Supabase Dashboard${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "1. Open Supabase SQL Editor:"
    echo -e "   ${GREEN}https://supabase.com/dashboard/project/$PROJECT_REF/sql${NC}"
    echo ""
    echo "2. Copy the migration SQL (opening in editor...):"

    # Open migration file in default editor
    if command -v code &> /dev/null; then
      code "$MIGRATION_FILE"
    elif command -v open &> /dev/null; then
      open "$MIGRATION_FILE"
    else
      cat "$MIGRATION_FILE"
    fi

    echo ""
    echo "3. Paste into SQL Editor and click 'Run'"
    echo ""
    echo "4. Look for success message:"
    echo -e "   ${GREEN}✓ SUCCESS: practice_areas column and index created successfully${NC}"
    echo ""
    ;;

  2)
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Automated Migration via Supabase CLI${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check if supabase CLI is installed
    if ! command -v supabase &> /dev/null; then
      echo -e "${RED}✗ Supabase CLI not found${NC}"
      echo ""
      echo "Install with:"
      echo "  npm install -g supabase"
      echo ""
      exit 1
    fi

    echo -e "${GREEN}✓ Supabase CLI found${NC}"
    echo ""

    # Check if logged in
    echo "Checking Supabase login status..."
    if ! supabase projects list &> /dev/null; then
      echo -e "${YELLOW}⚠ Not logged in to Supabase CLI${NC}"
      echo ""
      echo "Running: supabase login"
      supabase login
    fi

    echo -e "${GREEN}✓ Logged in to Supabase${NC}"
    echo ""

    # Link project if not linked
    if [ ! -f ".supabase/config.toml" ]; then
      echo "Linking to Supabase project..."
      supabase link --project-ref "$PROJECT_REF"
    fi

    echo -e "${GREEN}✓ Project linked${NC}"
    echo ""

    # Run migration
    echo "Running migration..."
    echo ""

    if supabase db push; then
      echo ""
      echo -e "${GREEN}✓ Migration completed successfully!${NC}"
      echo ""
    else
      echo ""
      echo -e "${RED}✗ Migration failed${NC}"
      echo ""
      echo "Try manual method (option 1) or direct psql (option 3)"
      exit 1
    fi
    ;;

  3)
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Direct psql Connection${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # Check if psql is installed
    if ! command -v psql &> /dev/null; then
      echo -e "${RED}✗ psql not found${NC}"
      echo ""
      echo "Install PostgreSQL client:"
      echo "  macOS: brew install postgresql"
      echo "  Ubuntu: sudo apt install postgresql-client"
      echo ""
      exit 1
    fi

    echo -e "${GREEN}✓ psql found${NC}"
    echo ""

    echo "You'll need your Supabase database connection string."
    echo ""
    echo "Get it from:"
    echo -e "  ${GREEN}https://supabase.com/dashboard/project/$PROJECT_REF/settings/database${NC}"
    echo ""
    echo "Connection String → URI (Connection Pooling Mode)"
    echo ""
    read -p "Enter connection string (or press Enter to skip): " db_url

    if [ -z "$db_url" ]; then
      echo ""
      echo -e "${YELLOW}No connection string provided${NC}"
      echo ""
      echo "Run manually:"
      echo "  psql \"YOUR_CONNECTION_STRING\" -f $MIGRATION_FILE"
      echo ""
    else
      echo ""
      echo "Running migration..."
      if psql "$db_url" -f "$MIGRATION_FILE"; then
        echo ""
        echo -e "${GREEN}✓ Migration completed successfully!${NC}"
        echo ""
      else
        echo ""
        echo -e "${RED}✗ Migration failed${NC}"
        echo ""
        exit 1
      fi
    fi
    ;;

  4)
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Migration SQL${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    cat "$MIGRATION_FILE"
    echo ""
    ;;

  *)
    echo ""
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Verify migration success in Supabase Dashboard"
echo "2. Test Practice Areas page: https://judgefinder.io/dashboard/practice-areas"
echo "3. Check API endpoint: /api/user/practice-areas"
echo ""
echo "For verification queries, see: MIGRATION_INSTRUCTIONS.md"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
