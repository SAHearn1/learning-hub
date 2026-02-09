#!/bin/bash

#
# Database Restore Script
# Restores PostgreSQL database from backup
# For disaster recovery
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/learninghub}"
DATABASE_URL="${DATABASE_URL:-}"

# Parse command line arguments
BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
  echo -e "${RED}Error: Backup file not specified${NC}"
  echo "Usage: $0 <backup_file>"
  echo ""
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/learninghub_backup_*.sql* 2>/dev/null || echo "  (none found)"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  # Try to find in backup directory
  BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
  if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL environment variable not set${NC}"
  exit 1
fi

# Parse database URL
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo -e "${YELLOW}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ⚠️  WARNING: DATABASE RESTORE  ⚠️"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

echo "This will restore the database from backup, overwriting all current data."
echo ""
echo "Restore Configuration:"
echo "  Database:     ${DB_NAME}"
echo "  Host:         ${DB_HOST}:${DB_PORT}"
echo "  Backup File:  ${BACKUP_FILE}"
echo ""

# Confirm restore
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Decrypt backup if needed
RESTORE_FILE="$BACKUP_FILE"
if [[ "$BACKUP_FILE" == *.gpg ]]; then
  echo -e "${YELLOW}Decrypting backup...${NC}"

  RESTORE_FILE="${BACKUP_FILE%.gpg}"
  gpg --decrypt --output "$RESTORE_FILE" "$BACKUP_FILE"

  if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Decryption failed${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Backup decrypted${NC}"

  # Clean up decrypted file on exit
  trap "rm -f $RESTORE_FILE" EXIT
fi

# Create pre-restore backup
echo -e "${YELLOW}Creating pre-restore backup...${NC}"

PRE_RESTORE_BACKUP="${BACKUP_DIR}/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
export PGPASSWORD="$DB_PASS"

pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --file="$PRE_RESTORE_BACKUP"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Pre-restore backup created: ${PRE_RESTORE_BACKUP}${NC}"
else
  echo -e "${RED}Warning: Pre-restore backup failed${NC}"
fi

# Restore database
echo -e "${YELLOW}Restoring database...${NC}"

# Drop existing connections
psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="postgres" \
  --command="SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$DB_NAME' AND pid <> pg_backend_pid();"

# Restore from backup
pg_restore \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --verbose \
  "$RESTORE_FILE"

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Restore failed${NC}"
  echo -e "${YELLOW}You can restore from pre-restore backup: ${PRE_RESTORE_BACKUP}${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Database restore completed successfully${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify restore
echo "Verifying database..."
TABLES_COUNT=$(psql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --tuples-only \
  --command="SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

echo -e "${GREEN}✓ Database verified (${TABLES_COUNT} tables restored)${NC}"

exit 0
