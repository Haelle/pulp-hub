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
echo -e "${GREEN}✓ Cleanup complete${NC}"
