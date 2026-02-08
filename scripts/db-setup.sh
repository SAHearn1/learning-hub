#!/usr/bin/env bash
# scripts/db-setup.sh — One-command database provisioning
#
# Usage:
#   ./scripts/db-setup.sh          # Migrate + generate + seed
#   ./scripts/db-setup.sh --reset  # Drop all data, re-migrate, re-seed
#
# Prerequisites:
#   - PostgreSQL running and accessible via DATABASE_URL in .env
#   - Node.js and npm dependencies installed (npm install)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Load .env if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No color

info()  { echo -e "${GREEN}[db-setup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[db-setup]${NC} $*"; }
error() { echo -e "${RED}[db-setup]${NC} $*" >&2; }

# Check prerequisites
if [ -z "${DATABASE_URL:-}" ]; then
  error "DATABASE_URL is not set. Copy .env.example to .env and configure it."
  exit 1
fi

if ! command -v npx &> /dev/null; then
  error "npx not found. Install Node.js first."
  exit 1
fi

if [ ! -d node_modules ]; then
  warn "node_modules not found. Running npm install..."
  npm install
fi

# Handle --reset flag
if [ "${1:-}" = "--reset" ]; then
  warn "Resetting database (dropping all tables)..."
  npx prisma migrate reset --force --skip-generate
  info "Database reset complete."
fi

# Step 1: Generate Prisma Client
info "Generating Prisma client..."
npx prisma generate

# Step 2: Deploy migrations
info "Deploying migrations..."
npx prisma migrate deploy

# Step 3: Seed the database
info "Seeding database with demo data..."
npx tsx prisma/seed.ts

info "Database setup complete!"
echo ""
echo "  Next steps:"
echo "    npm run dev          # Start the development server"
echo "    npm run db:studio    # Open Prisma Studio (database GUI)"
echo ""
