#!/bin/bash

#
# Database Backup Script
# Creates encrypted PostgreSQL backups with retention
# For COPPA compliance and disaster recovery
#

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/learninghub}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
ENCRYPT_BACKUPS="${ENCRYPT_BACKUPS:-true}"
GPG_RECIPIENT="${GPG_RECIPIENT:-backups@learninghub.com}"
S3_BUCKET="${S3_BUCKET:-}" # Optional: upload to S3

# Database connection from environment
DATABASE_URL="${DATABASE_URL:-}"

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

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="learninghub_backup_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Learning Hub - Database Backup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

echo "Backup Configuration:"
echo "  Database:  ${DB_NAME}"
echo "  Host:      ${DB_HOST}:${DB_PORT}"
echo "  File:      ${BACKUP_FILE}"
echo "  Directory: ${BACKUP_DIR}"
echo "  Encrypt:   ${ENCRYPT_BACKUPS}"
echo ""

# Create database backup
echo -e "${YELLOW}Creating database backup...${NC}"

export PGPASSWORD="$DB_PASS"
pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=custom \
  --file="$BACKUP_PATH" \
  --verbose

# Check if backup was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Backup failed${NC}"
  exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
echo -e "${GREEN}✓ Backup created: ${BACKUP_SIZE}${NC}"

# Encrypt backup if enabled
if [ "$ENCRYPT_BACKUPS" = "true" ]; then
  echo -e "${YELLOW}Encrypting backup...${NC}"

  if ! command -v gpg &> /dev/null; then
    echo -e "${RED}Warning: gpg not installed, skipping encryption${NC}"
  else
    gpg \
      --encrypt \
      --recipient "$GPG_RECIPIENT" \
      --output "${BACKUP_PATH}.gpg" \
      "$BACKUP_PATH"

    if [ $? -eq 0 ]; then
      # Remove unencrypted backup
      rm "$BACKUP_PATH"
      BACKUP_PATH="${BACKUP_PATH}.gpg"
      echo -e "${GREEN}✓ Backup encrypted${NC}"
    else
      echo -e "${RED}Warning: Encryption failed, keeping unencrypted backup${NC}"
    fi
  fi
fi

# Upload to S3 if configured
if [ -n "$S3_BUCKET" ]; then
  echo -e "${YELLOW}Uploading to S3...${NC}"

  if ! command -v aws &> /dev/null; then
    echo -e "${RED}Warning: AWS CLI not installed, skipping S3 upload${NC}"
  else
    aws s3 cp \
      "$BACKUP_PATH" \
      "s3://${S3_BUCKET}/backups/database/${BACKUP_FILE}" \
      --storage-class STANDARD_IA

    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ Backup uploaded to S3${NC}"
    else
      echo -e "${RED}Warning: S3 upload failed${NC}"
    fi
  fi
fi

# Clean up old backups
echo -e "${YELLOW}Cleaning up old backups (older than ${BACKUP_RETENTION_DAYS} days)...${NC}"

find "$BACKUP_DIR" \
  -name "learninghub_backup_*.sql*" \
  -type f \
  -mtime +${BACKUP_RETENTION_DAYS} \
  -delete

OLD_BACKUPS_COUNT=$(find "$BACKUP_DIR" -name "learninghub_backup_*.sql*" -type f | wc -l)
echo -e "${GREEN}✓ Retention policy enforced (${OLD_BACKUPS_COUNT} backups remaining)${NC}"

# Generate backup manifest
echo -e "${YELLOW}Generating backup manifest...${NC}"

cat > "${BACKUP_DIR}/LATEST_BACKUP.txt" <<EOF
Backup Timestamp: ${TIMESTAMP}
Backup File: ${BACKUP_FILE}
Backup Size: ${BACKUP_SIZE}
Database: ${DB_NAME}
Encrypted: ${ENCRYPT_BACKUPS}
EOF

echo -e "${GREEN}✓ Manifest created${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Backup completed successfully${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verify backup integrity
echo "Verifying backup integrity..."
if [[ "$BACKUP_PATH" == *.gpg ]]; then
  echo "  (Encrypted backup - manual verification required)"
else
  pg_restore --list "$BACKUP_PATH" > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup integrity verified${NC}"
  else
    echo -e "${RED}✗ Backup integrity check failed${NC}"
    exit 1
  fi
fi

exit 0
