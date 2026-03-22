#!/usr/bin/env bash
set -euo pipefail

source "./.env"
source "./bin/lib/seed_oci"
source "./bin/lib/seed_file"
source "./bin/lib/seed_users"
source "./bin/lib/seed_npm"

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
seed_users

# Pull-through setup (standalone script, needs env vars to skip prompts)
export PULP_URL PULP_USERNAME PULP_PASSWORD
PULP_URL="${PULP_URL:-$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('base_url','http://localhost:8081'))" 2>/dev/null || echo "http://localhost:8081")}"
PULP_USERNAME="${PULP_USERNAME:-$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('username','admin'))" 2>/dev/null || echo "admin")}"
PULP_PASSWORD="${PULP_PASSWORD:-$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('password','admin'))" 2>/dev/null || echo "admin")}"
./bin/setup-pullthrough.sh
seed_npm

# ── Verify ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}=== Verification ===${NC}"

verify_oci
verify_file
verify_users
verify_npm

echo -e "\n${GREEN}✓ Done${NC}"
