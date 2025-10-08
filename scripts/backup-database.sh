#!/bin/bash

################################################################################
# Database Backup Script for JudgeFinder Platform
#
# This script creates a complete backup of the Supabase database including:
# - Full schema (tables, functions, indexes, constraints)
# - All data from production tables
# - Compressed archive with timestamp
#
# Requirements:
# - Supabase CLI installed: npm install -g supabase
# - SUPABASE_DB_URL environment variable set
# - PostgreSQL client tools (pg_dump)
#
# Usage:
#   ./scripts/backup-database.sh
#   ./scripts/backup-database.sh --schema-only  # Schema without data
#   ./scripts/backup-database.sh --data-only    # Data without schema
#
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="judgefinder_backup_${TIMESTAMP}"
SCHEMA_FILE="${BACKUP_NAME}_schema.sql"
DATA_FILE="${BACKUP_NAME}_data.sql"
FULL_FILE="${BACKUP_NAME}_full.sql"
ARCHIVE_FILE="${BACKUP_NAME}.tar.gz"

# Parse command line arguments
SCHEMA_ONLY=false
DATA_ONLY=false

for arg in "$@"; do
  case $arg in
    --schema-only)
      SCHEMA_ONLY=true
      shift
      ;;
    --data-only)
      DATA_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --schema-only  Backup schema only (no data)"
      echo "  --data-only    Backup data only (no schema)"
      echo "  --help         Show this help message"
      exit 0
      ;;
  esac
done

# Check for required tools
check_requirements() {
  echo -e "${BLUE}🔍 Checking requirements...${NC}"

  if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ pg_dump not found. Install PostgreSQL client tools.${NC}"
    exit 1
  fi

  if [ -z "${SUPABASE_DB_URL:-}" ]; then
    echo -e "${RED}❌ SUPABASE_DB_URL environment variable not set${NC}"
    echo "Set it in your .env.local file or export it:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:[port]/[database]'"
    exit 1
  fi

  echo -e "${GREEN}✓ Requirements met${NC}"
}

# Create backup directory
create_backup_dir() {
  echo -e "${BLUE}📁 Creating backup directory...${NC}"

  mkdir -p "${BACKUP_DIR}"

  echo -e "${GREEN}✓ Backup directory: ${BACKUP_DIR}${NC}"
}

# Backup schema
backup_schema() {
  echo -e "${BLUE}📋 Backing up database schema...${NC}"

  pg_dump "${SUPABASE_DB_URL}" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="${BACKUP_DIR}/${SCHEMA_FILE}"

  echo -e "${GREEN}✓ Schema backed up: ${SCHEMA_FILE}${NC}"
}

# Backup data
backup_data() {
  echo -e "${BLUE}💾 Backing up database data...${NC}"

  # List of tables to backup
  TABLES=(
    "judges"
    "courts"
    "cases"
    "judge_court_assignments"
    "judge_analytics"
    "attorneys"
    "attorney_slots"
    "ad_impressions"
    "ad_clicks"
    "app_users"
    "profile_issues"
    "sync_queue"
    "sync_validation_results"
  )

  # Backup each table
  for table in "${TABLES[@]}"; do
    echo "  Backing up table: ${table}"
    pg_dump "${SUPABASE_DB_URL}" \
      --data-only \
      --no-owner \
      --no-privileges \
      --format=plain \
      --table="public.${table}" \
      --file="${BACKUP_DIR}/${table}_${TIMESTAMP}.sql" 2>/dev/null || echo "    ⚠️  Table ${table} not found, skipping"
  done

  # Combine all data files
  cat "${BACKUP_DIR}/"*"_${TIMESTAMP}.sql" > "${BACKUP_DIR}/${DATA_FILE}" 2>/dev/null || true

  # Clean up individual table files
  rm -f "${BACKUP_DIR}/"*"_${TIMESTAMP}.sql"

  echo -e "${GREEN}✓ Data backed up: ${DATA_FILE}${NC}"
}

# Backup full database (schema + data)
backup_full() {
  echo -e "${BLUE}💿 Backing up full database...${NC}"

  pg_dump "${SUPABASE_DB_URL}" \
    --no-owner \
    --no-privileges \
    --format=plain \
    --file="${BACKUP_DIR}/${FULL_FILE}"

  echo -e "${GREEN}✓ Full backup created: ${FULL_FILE}${NC}"
}

# Compress backup
compress_backup() {
  echo -e "${BLUE}📦 Compressing backup...${NC}"

  cd "${BACKUP_DIR}"

  if [ "$SCHEMA_ONLY" = true ]; then
    tar -czf "${ARCHIVE_FILE}" "${SCHEMA_FILE}"
    rm -f "${SCHEMA_FILE}"
  elif [ "$DATA_ONLY" = true ]; then
    tar -czf "${ARCHIVE_FILE}" "${DATA_FILE}"
    rm -f "${DATA_FILE}"
  else
    tar -czf "${ARCHIVE_FILE}" "${FULL_FILE}"
    rm -f "${FULL_FILE}"
  fi

  cd - > /dev/null

  ARCHIVE_SIZE=$(du -h "${BACKUP_DIR}/${ARCHIVE_FILE}" | cut -f1)
  echo -e "${GREEN}✓ Compressed backup: ${ARCHIVE_FILE} (${ARCHIVE_SIZE})${NC}"
}

# Generate backup metadata
generate_metadata() {
  echo -e "${BLUE}📝 Generating backup metadata...${NC}"

  METADATA_FILE="${BACKUP_DIR}/${BACKUP_NAME}_metadata.json"

  cat > "${METADATA_FILE}" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "backup_name": "${BACKUP_NAME}",
  "archive_file": "${ARCHIVE_FILE}",
  "backup_type": "$([ "$SCHEMA_ONLY" = true ] && echo "schema-only" || [ "$DATA_ONLY" = true ] && echo "data-only" || echo "full")",
  "size_bytes": $(stat -f%z "${BACKUP_DIR}/${ARCHIVE_FILE}" 2>/dev/null || stat -c%s "${BACKUP_DIR}/${ARCHIVE_FILE}"),
  "database_url": "${SUPABASE_DB_URL%%:*}://***:***@***",
  "operator": "${USER:-unknown}",
  "hostname": "$(hostname)"
}
EOF

  echo -e "${GREEN}✓ Metadata saved: ${METADATA_FILE}${NC}"
}

# Clean old backups (keep last 10)
clean_old_backups() {
  echo -e "${BLUE}🧹 Cleaning old backups...${NC}"

  cd "${BACKUP_DIR}"

  # Count backup files
  BACKUP_COUNT=$(ls -1 judgefinder_backup_*.tar.gz 2>/dev/null | wc -l)

  if [ "$BACKUP_COUNT" -gt 10 ]; then
    # Remove oldest backups, keeping last 10
    ls -1t judgefinder_backup_*.tar.gz | tail -n +11 | xargs rm -f
    echo -e "${GREEN}✓ Removed old backups (keeping last 10)${NC}"
  else
    echo -e "${GREEN}✓ No old backups to clean (${BACKUP_COUNT} total)${NC}"
  fi

  cd - > /dev/null
}

# Display backup info
display_backup_info() {
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}✅ BACKUP COMPLETED SUCCESSFULLY${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  Backup Name: ${YELLOW}${BACKUP_NAME}${NC}"
  echo -e "  Archive: ${YELLOW}${BACKUP_DIR}/${ARCHIVE_FILE}${NC}"
  echo -e "  Size: ${YELLOW}$(du -h "${BACKUP_DIR}/${ARCHIVE_FILE}" | cut -f1)${NC}"
  echo -e "  Type: ${YELLOW}$([ "$SCHEMA_ONLY" = true ] && echo "Schema Only" || [ "$DATA_ONLY" = true ] && echo "Data Only" || echo "Full Database")${NC}"
  echo ""
  echo -e "${BLUE}📖 Restoration Instructions:${NC}"
  echo ""
  echo "  1. Extract the backup:"
  echo "     tar -xzf ${BACKUP_DIR}/${ARCHIVE_FILE}"
  echo ""
  echo "  2. Restore to database:"
  if [ "$SCHEMA_ONLY" = true ]; then
    echo "     psql \${SUPABASE_DB_URL} < ${SCHEMA_FILE}"
  elif [ "$DATA_ONLY" = true ]; then
    echo "     psql \${SUPABASE_DB_URL} < ${DATA_FILE}"
  else
    echo "     psql \${SUPABASE_DB_URL} < ${FULL_FILE}"
  fi
  echo ""
  echo "  3. Verify restoration:"
  echo "     psql \${SUPABASE_DB_URL} -c \"SELECT COUNT(*) FROM judges;\""
  echo ""
  echo -e "${YELLOW}⚠️  Always test restoration in staging before production!${NC}"
  echo ""
  echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
}

# Main execution
main() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  JudgeFinder Database Backup${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""

  check_requirements
  create_backup_dir

  if [ "$SCHEMA_ONLY" = true ]; then
    backup_schema
  elif [ "$DATA_ONLY" = true ]; then
    backup_data
  else
    backup_full
  fi

  compress_backup
  generate_metadata
  clean_old_backups
  display_backup_info
}

# Run main function
main
