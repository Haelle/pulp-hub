#!/usr/bin/env bash
set -euo pipefail

source "./.env"

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── Pulp connection ──────────────────────────────────────────
export PULP_URL PULP_USERNAME PULP_PASSWORD
PULP_URL="${PULP_URL:-$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('base_url','http://localhost:8081'))" 2>/dev/null || echo "http://localhost:8081")}"
PULP_USERNAME="${PULP_USERNAME:-$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('username','admin'))" 2>/dev/null || echo "admin")}"
PULP_PASSWORD="${PULP_PASSWORD:-$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('password','admin'))" 2>/dev/null || echo "admin")}"

# HTTP helper (used by verify functions in sourced scripts)
pulp_get() {
  curl -s -u "${PULP_USERNAME}:${PULP_PASSWORD}" \
    -X GET \
    -H "Content-Type: application/json" \
    "${PULP_URL}/pulp/api/v3${1}"
}

# ── Source modules ───────────────────────────────────────────
source "./bin/lib/seed_pull_oci"
source "./bin/lib/seed_pull_npm"
source "./bin/lib/seed_pull_pypi"
source "./bin/lib/seed_file"
source "./bin/lib/seed_users"

# ── Main ──────────────────────────────────────────────────────

echo -e "${BOLD}=== Pulp Seed ===${NC}"
pulp status >/dev/null 2>&1 || { echo -e "${RED}ERROR: Pulp unreachable. Run 'make setup' first.${NC}"; exit 1; }
echo -e "${GREEN}✓ Pulp API OK${NC}"

# 1. Create pull-through caches
./bin/setup-pullthrough.sh

# 2. Pull content through caches
seed_pull_oci
seed_pull_npm
seed_pull_pypi

# 3. Seed file repositories (direct upload, no pull-through)
seed_file

# 4. Seed test users
seed_users

# ── Verify ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}=== Verification ===${NC}"

verify_pull_oci
verify_pull_npm
verify_pull_pypi
verify_file
verify_users

echo -e "\n${GREEN}✓ Done${NC}"
