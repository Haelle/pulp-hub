#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

OCI_NAMES=(
  "dockerhub/library/alpine"
  "dockerhub/library/busybox"
  "dockerhub/library/hello-world"
)

FILE_NAMES=(
  "test-docs"
  "test-data"
)

destroy_container() {
  local resource="$1" name="$2"
  if pulp container "$resource" show --name "$name" >/dev/null 2>&1; then
    echo -e "  ${RED}Destroying ${resource}: ${name}${NC}"
    pulp container "$resource" destroy --name "$name" >/dev/null 2>&1
  fi
}

destroy_file() {
  local resource="$1" name="$2"
  if pulp file "$resource" show --name "$name" >/dev/null 2>&1; then
    echo -e "  ${RED}Destroying ${resource}: ${name}${NC}"
    pulp file "$resource" destroy --name "$name" >/dev/null 2>&1
  fi
}

echo -e "${BOLD}=== Pulp Clean ===${NC}"
pulp status >/dev/null 2>&1 || { echo -e "${RED}ERROR: Pulp unreachable.${NC}"; exit 1; }

echo ""
echo -e "${BOLD}--- Container ---${NC}"
for name in "${OCI_NAMES[@]}"; do
  echo ""
  echo -e "${BOLD}── ${name} ──${NC}"
  destroy_container distribution "$name"
  destroy_container repository "$name"
  destroy_container remote "$name"
done

echo ""
echo -e "${BOLD}--- File ---${NC}"
for name in "${FILE_NAMES[@]}"; do
  echo ""
  echo -e "${BOLD}── ${name} ──${NC}"
  destroy_file distribution "$name"
  destroy_file repository "$name"
done

echo ""
echo -e "${BOLD}--- Pull-Through ---${NC}"

# Pull-through uses the REST API (pulp-cli doesn't support pull-through types)
PULP_URL="${PULP_URL:-http://localhost:8081}"
PULP_USERNAME="${PULP_USERNAME:-admin}"
PULP_PASSWORD="${PULP_PASSWORD:-admin}"

# Read credentials from pulp-cli config if available
if command -v pulp >/dev/null 2>&1; then
  cli_url=$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('base_url',''))" 2>/dev/null) || true
  cli_user=$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('username',''))" 2>/dev/null) || true
  cli_pass=$(pulp config show 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('password',''))" 2>/dev/null) || true
  [[ -n "$cli_url" ]] && PULP_URL="$cli_url"
  [[ -n "$cli_user" ]] && PULP_USERNAME="$cli_user"
  [[ -n "$cli_pass" ]] && PULP_PASSWORD="$cli_pass"
fi

destroy_pullthrough() {
  local type="$1" endpoint="$2" name="$3"
  local href
  href=$(curl -s -u "${PULP_USERNAME}:${PULP_PASSWORD}" \
    "${PULP_URL}/pulp/api/v3${endpoint}?name=${name}" \
    | python3 -c "
import sys,json
r=json.load(sys.stdin).get('results',[])
print(r[0]['pulp_href'] if r else '')
" 2>/dev/null) || true

  if [[ -n "$href" ]]; then
    echo -e "  ${RED}Destroying ${type}: ${name}${NC}"
    curl -s -u "${PULP_USERNAME}:${PULP_PASSWORD}" -X DELETE "${PULP_URL}${href}" >/dev/null
  fi
}

PULLTHROUGH_CONTAINER_NAMES=("dockerhub-cache" "quay-cache")
for name in "${PULLTHROUGH_CONTAINER_NAMES[@]}"; do
  echo ""
  echo -e "${BOLD}── ${name} ──${NC}"
  destroy_pullthrough "distribution" "/distributions/container/pull-through/" "$name"
  destroy_pullthrough "remote" "/remotes/container/pull-through/" "$name"
done

echo ""
echo -e "${BOLD}── pypi-cache ──${NC}"
destroy_pullthrough "distribution" "/distributions/python/pypi/" "pypi-cache"
destroy_pullthrough "repository" "/repositories/python/python/" "pypi-cache"
destroy_pullthrough "remote" "/remotes/python/python/" "pypi-cache"

echo ""
echo -e "${BOLD}── npmjs-cache ──${NC}"
destroy_pullthrough "distribution" "/distributions/npm/npm/" "npmjs-cache"
destroy_pullthrough "remote" "/remotes/npm/npm/" "npmjs-cache"

echo ""
echo -e "${GREEN}✓ Cleanup complete${NC}"
