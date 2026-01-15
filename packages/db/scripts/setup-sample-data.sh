#!/bin/bash
# ============================================================================
# Setup Sample Postal Code Data
# ============================================================================
# This script sets up sample Canadian postal code data for testing
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🇨🇦 Setting up Canadian postal code sample data...${NC}\n"

# Get project root (4 levels up from packages/db/scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
SAMPLE_FILE="$SCRIPT_DIR/../sample-postal-codes.csv"
TARGET_FILE="$DATA_DIR/canadian-postal-codes.csv"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Data directory: $DATA_DIR"
echo ""

# Create data directory if it doesn't exist
if [ ! -d "$DATA_DIR" ]; then
  echo -e "${YELLOW}📂 Creating data directory...${NC}"
  mkdir -p "$DATA_DIR"
  echo -e "${GREEN}✅ Data directory created${NC}\n"
fi

# Check if sample file exists
if [ ! -f "$SAMPLE_FILE" ]; then
  echo -e "${RED}❌ Sample file not found at: $SAMPLE_FILE${NC}"
  exit 1
fi

# Check if target file already exists
if [ -f "$TARGET_FILE" ]; then
  echo -e "${YELLOW}⚠️  Postal code file already exists at: $TARGET_FILE${NC}"
  read -p "Do you want to overwrite it with sample data? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Skipping data setup${NC}"
    exit 0
  fi
fi

# Copy sample file
echo -e "${YELLOW}📋 Copying sample postal codes...${NC}"
cp "$SAMPLE_FILE" "$TARGET_FILE"
echo -e "${GREEN}✅ Sample data copied to: $TARGET_FILE${NC}\n"

# Count records
RECORD_COUNT=$(tail -n +2 "$TARGET_FILE" | wc -l | tr -d ' ')
echo -e "${GREEN}📊 Sample data contains $RECORD_COUNT postal codes${NC}"
echo -e "${YELLOW}⚠️  This is test data only - covers major cities${NC}\n"

echo -e "${GREEN}🎉 Setup complete!${NC}\n"
echo "Next steps:"
echo "  1. Apply migration: psql \$POSTGRES_URL -f packages/db/migrations/postal_code_spatial_setup.sql"
echo "  2. Import data: pnpm db:import-postal-codes"
echo "  3. Verify: psql \$POSTGRES_URL -c \"SELECT COUNT(*) FROM postal_code;\""
echo ""
echo "For production, download full Canadian postal code database:"
echo "  - Statistics Canada: https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm"
echo "  - See packages/db/README_POSTAL_CODES.md for details"
