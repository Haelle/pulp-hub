#!/usr/bin/env bash
set -euo pipefail

source "./bin/lib/seed_oci"
source "./bin/lib/seed_file"

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── Main ──────────────────────────────────────────────────────

echo -e "${BOLD}=== Pulp Seed ===${NC}"
pulp status >/dev/null 2>&1 || { echo -e "${RED}ERROR: Pulp unreachable. Run 'make setup' first.${NC}"; exit 1; }
echo -e "${GREEN}✓ Pulp API OK${NC}"

seed_oci
seed_file

# ── Verify ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}=== Verification ===${NC}"

verify_oci
verify_file

echo -e "\n${GREEN}✓ Done${NC}"
