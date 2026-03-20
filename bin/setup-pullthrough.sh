#!/usr/bin/env bash
# setup-pullthrough.sh — Configure pull-through caching on a Pulp instance
#
# Supported registries: DockerHub, Quay.io, PyPI, npm
# Uses the REST API directly (pulp-cli does not fully support pull-through yet)
#
# Environment variables (skip interactive prompts):
#   PULP_URL       — Pulp base URL
#   PULP_USERNAME  — Pulp admin username
#   PULP_PASSWORD  — Pulp admin password
#
# Usage:
#   ./bin/setup-pullthrough.sh
#   PULP_URL=http://pulp:8080 PULP_USERNAME=admin PULP_PASSWORD=secret ./bin/setup-pullthrough.sh

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# ── Config (prompt if not set) ────────────────────────────────

if [[ -z "${PULP_URL:-}" ]]; then
  read -rp "  Pulp URL [http://localhost:8081]: " PULP_URL
  PULP_URL="${PULP_URL:-http://localhost:8081}"
fi

if [[ -z "${PULP_USERNAME:-}" ]]; then
  read -rp "  Username [admin]: " PULP_USERNAME
  PULP_USERNAME="${PULP_USERNAME:-admin}"
fi

if [[ -z "${PULP_PASSWORD:-}" ]]; then
  read -rsp "  Password [admin]: " PULP_PASSWORD
  PULP_PASSWORD="${PULP_PASSWORD:-admin}"
  echo ""
fi

# ── HTTP helpers ──────────────────────────────────────────────

pulp_api() {
  local method="$1" endpoint="$2"
  shift 2
  curl -s -u "${PULP_USERNAME}:${PULP_PASSWORD}" \
    -X "$method" \
    -H "Content-Type: application/json" \
    "${PULP_URL}/pulp/api/v3${endpoint}" \
    "$@"
}

pulp_get()  { pulp_api GET  "$1"; }
pulp_post() { pulp_api POST "$1" -d "$2"; }

resource_exists() {
  local endpoint="$1" name="$2"
  local count
  count=$(pulp_get "${endpoint}?name=${name}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))")
  [[ "$count" -gt 0 ]]
}

wait_task() {
  local task_href="$1"
  if [[ -z "$task_href" || "$task_href" == "null" ]]; then
    return 0
  fi
  while true; do
    local state
    state=$(curl -s -u "${PULP_USERNAME}:${PULP_PASSWORD}" "${PULP_URL}${task_href}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('state',''))")
    case "$state" in
      completed) return 0 ;;
      failed|canceled|cancelled) return 1 ;;
      *) sleep 1 ;;
    esac
  done
}

# ── Container pull-through (DockerHub, Quay.io) ──────────────

setup_container_pullthrough() {
  local name="$1" url="$2"

  echo ""
  echo -e "${BOLD}── ${name} ──${NC}"

  if resource_exists "/remotes/container/pull-through/" "$name"; then
    echo -e "  ${YELLOW}Remote exists${NC}"
  else
    echo -e "  ${BLUE}Creating remote...${NC}"
    pulp_post "/remotes/container/pull-through/" \
      "{\"name\":\"${name}\",\"url\":\"${url}\"}" >/dev/null
    echo -e "  ${GREEN}Remote created${NC}"
  fi

  local remote_href
  remote_href=$(pulp_get "/remotes/container/pull-through/?name=${name}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['results'][0]['pulp_href'])")

  if resource_exists "/distributions/container/pull-through/" "$name"; then
    echo -e "  ${YELLOW}Distribution exists${NC}"
  else
    echo -e "  ${BLUE}Creating distribution...${NC}"
    local task_href
    task_href=$(pulp_post "/distributions/container/pull-through/" \
      "{\"name\":\"${name}\",\"base_path\":\"${name}\",\"remote\":\"${remote_href}\"}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('task',''))")
    wait_task "$task_href"
    echo -e "  ${GREEN}Distribution created${NC}"
  fi

  echo -e "  ${GREEN}→ podman pull <pulp-content>/${name}/<image>:<tag>${NC}"
}

# ── Python pull-through (PyPI) ────────────────────────────────

setup_python_pullthrough() {
  local name="$1" url="$2"

  echo ""
  echo -e "${BOLD}── ${name} ──${NC}"

  if resource_exists "/remotes/python/python/" "$name"; then
    echo -e "  ${YELLOW}Remote exists${NC}"
  else
    echo -e "  ${BLUE}Creating remote...${NC}"
    pulp_post "/remotes/python/python/" \
      "{\"name\":\"${name}\",\"url\":\"${url}\",\"policy\":\"on_demand\"}" >/dev/null
    echo -e "  ${GREEN}Remote created${NC}"
  fi

  local remote_href
  remote_href=$(pulp_get "/remotes/python/python/?name=${name}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['results'][0]['pulp_href'])")

  if resource_exists "/repositories/python/python/" "$name"; then
    echo -e "  ${YELLOW}Repository exists${NC}"
  else
    echo -e "  ${BLUE}Creating repository...${NC}"
    pulp_post "/repositories/python/python/" \
      "{\"name\":\"${name}\"}" >/dev/null
    echo -e "  ${GREEN}Repository created${NC}"
  fi

  local repo_href
  repo_href=$(pulp_get "/repositories/python/python/?name=${name}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['results'][0]['pulp_href'])")

  if resource_exists "/distributions/python/pypi/" "$name"; then
    echo -e "  ${YELLOW}Distribution exists${NC}"
  else
    echo -e "  ${BLUE}Creating distribution...${NC}"
    local task_href
    task_href=$(pulp_post "/distributions/python/pypi/" \
      "{\"name\":\"${name}\",\"base_path\":\"${name}\",\"repository\":\"${repo_href}\",\"remote\":\"${remote_href}\"}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('task',''))")
    wait_task "$task_href"
    echo -e "  ${GREEN}Distribution created${NC}"
  fi

  echo -e "  ${GREEN}→ pip/uv --index-url ${PULP_URL}/pypi/${name}/simple/${NC}"
}

# ── npm pull-through ──────────────────────────────────────────

setup_npm_pullthrough() {
  local name="$1" url="$2"

  echo ""
  echo -e "${BOLD}── ${name} ──${NC}"

  if resource_exists "/remotes/npm/npm/" "$name"; then
    echo -e "  ${YELLOW}Remote exists${NC}"
  else
    echo -e "  ${BLUE}Creating remote...${NC}"
    pulp_post "/remotes/npm/npm/" \
      "{\"name\":\"${name}\",\"url\":\"${url}\"}" >/dev/null
    echo -e "  ${GREEN}Remote created${NC}"
  fi

  local remote_href
  remote_href=$(pulp_get "/remotes/npm/npm/?name=${name}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['results'][0]['pulp_href'])")

  if resource_exists "/distributions/npm/npm/" "$name"; then
    echo -e "  ${YELLOW}Distribution exists${NC}"
  else
    echo -e "  ${BLUE}Creating distribution...${NC}"
    local task_href
    task_href=$(pulp_post "/distributions/npm/npm/" \
      "{\"name\":\"${name}\",\"base_path\":\"${name}\",\"remote\":\"${remote_href}\"}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('task',''))")
    wait_task "$task_href"
    echo -e "  ${GREEN}Distribution created${NC}"
  fi

  echo -e "  ${GREEN}→ npm --registry ${PULP_URL}/pulp/content/${name}/${NC}"
}

# ── Main ──────────────────────────────────────────────────────

echo -e "${BOLD}=== Pulp Pull-Through Cache Setup ===${NC}"
echo -e "  Pulp URL: ${BLUE}${PULP_URL}${NC}"

# Check connectivity
if ! pulp_get "/status/" >/dev/null 2>&1; then
  echo -e "${RED}ERROR: Pulp unreachable at ${PULP_URL}${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓ Pulp API OK${NC}"

# Detect available plugins
plugins=$(pulp_get "/status/" | python3 -c "
import sys, json
plugins = json.load(sys.stdin).get('versions', [])
print(' '.join(p['component'] for p in plugins))
")
echo -e "  Plugins: ${BLUE}${plugins}${NC}"

# Set up each registry (skip if plugin not installed)
if [[ "$plugins" == *"container"* ]]; then
  setup_container_pullthrough "dockerhub-cache" "https://registry-1.docker.io"
  setup_container_pullthrough "quay-cache" "https://quay.io"
else
  echo -e "\n  ${YELLOW}⚠ Skipping DockerHub/Quay: pulp_container not installed${NC}"
fi

if [[ "$plugins" == *"python"* ]]; then
  setup_python_pullthrough "pypi-cache" "https://pypi.org/simple/"
else
  echo -e "\n  ${YELLOW}⚠ Skipping PyPI: pulp_python not installed${NC}"
fi

if [[ "$plugins" == *"npm"* ]]; then
  setup_npm_pullthrough "npmjs-cache" "https://registry.npmjs.org/"
else
  echo -e "\n  ${YELLOW}⚠ Skipping npm: pulp_npm not installed${NC}"
fi

echo ""
echo -e "${GREEN}✓ Done${NC}"
