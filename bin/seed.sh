#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# seed.sh — Populate a Pulp instance with test container data
# Idempotent: safe to re-run on an already-seeded instance
# Requires: pulp-cli configured via `pulp config create`
# ──────────────────────────────────────────────────────────────

PREFIX="dockerhub/library"

# name|upstream|tags (comma-separated)
IMAGES=(
  "alpine|library/alpine|3.18,3.19,latest"
  "busybox|library/busybox|1.36,latest"
  "hello-world|library/hello-world|latest"
)

# ── Helpers ───────────────────────────────────────────────────

exists() { pulp container "$@" >/dev/null 2>&1; }

ensure_remote() {
  local name="$1" upstream="$2"; shift 2
  # remaining args are --include-tags values
  if exists remote show --name "$name"; then
    echo "  Remote exists, updating tags..."
    pulp container remote update --name "$name" "$@" >/dev/null 2>&1 || true
  else
    echo "  Creating remote..."
    # pulp-cli 0.38 has a bug on remote create, fall back to curl
    local config_file="${XDG_CONFIG_HOME:-$HOME/.config}/pulp/cli.toml"
    local base_url username password
    base_url=$(python3 -c "import tomllib; c=tomllib.load(open('$config_file','rb')); print(c['cli']['base_url'])")
    username=$(python3 -c "import tomllib; c=tomllib.load(open('$config_file','rb')); print(c['cli']['username'])")
    password=$(python3 -c "import tomllib; c=tomllib.load(open('$config_file','rb')); print(c['cli']['password'])")

    local tags_json
    tags_json=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1:]))" "$@")
    # $@ contains --include-tags tag1 --include-tags tag2, extract just the tag values
    local tag_values=()
    while [[ $# -gt 0 ]]; do
      [[ "$1" == "--include-tags" ]] && { tag_values+=("$2"); shift 2; continue; }
      shift
    done
    tags_json=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1:]))" "${tag_values[@]}")

    curl -sk -u "${username}:${password}" \
      -X POST "${base_url}/pulp/api/v3/remotes/container/container/" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"${name}\",\"url\":\"https://registry-1.docker.io\",\"upstream_name\":\"${upstream}\",\"policy\":\"on_demand\",\"include_tags\":${tags_json}}" \
      >/dev/null
    echo "  Remote created"
  fi
}

ensure_repo() {
  local name="$1"
  if exists repository show --name "$name"; then
    echo "  Repository exists"
  else
    echo "  Creating repository..."
    pulp container repository create \
      --name "$name" \
      --remote "container:container:${name}" >/dev/null
    echo "  Repository created"
  fi
}

sync_repo() {
  local name="$1"
  echo "  Syncing..."
  if pulp container repository sync \
    --name "$name" \
    --remote "container:container:${name}" 2>&1; then
    echo "  Sync complete"
  else
    echo "  ⚠ Sync failed (Docker Hub rate limit?), skipping"
  fi
}

ensure_distribution() {
  local name="$1"
  if exists distribution show --name "$name"; then
    echo "  Distribution exists"
  else
    echo "  Creating distribution..."
    pulp container distribution create \
      --name "$name" \
      --base-path "$name" \
      --repository "container:container:${name}" >/dev/null
    echo "  Distribution created"
  fi
}

# ── Main ──────────────────────────────────────────────────────

echo "=== Pulp Seed ==="
pulp status >/dev/null 2>&1 || { echo "ERROR: Pulp unreachable. Run 'pulp config create' first."; exit 1; }
echo "✓ Pulp API OK"

for entry in "${IMAGES[@]}"; do
  IFS='|' read -r NAME UPSTREAM TAGS <<< "$entry"
  FULL="${PREFIX}/${NAME}"

  echo ""
  echo "── ${FULL} ──"

  # Build --include-tags args
  IFS=',' read -ra TAG_LIST <<< "$TAGS"
  TAG_ARGS=()
  for t in "${TAG_LIST[@]}"; do TAG_ARGS+=(--include-tags "$t"); done

  ensure_remote "$FULL" "$UPSTREAM" "${TAG_ARGS[@]}"
  ensure_repo "$FULL"
  sync_repo "$FULL"
  ensure_distribution "$FULL"
done

# ── Verify ────────────────────────────────────────────────────
echo ""
echo "=== Verification ==="

count=$(pulp --format json container distribution list | \
  python3 -c "import sys,json; print(sum(1 for d in json.load(sys.stdin) if d['name'].startswith('$PREFIX/')))")
echo "Seed distributions: ${count}/3"

for entry in "${IMAGES[@]}"; do
  IFS='|' read -r NAME _ _ <<< "$entry"
  FULL="${PREFIX}/${NAME}"
  tags=$(pulp --format json container repository version list \
    --repository "container:container:${FULL}" 2>/dev/null | \
    python3 -c "
import sys,json
v=json.load(sys.stdin)
print(v[0]['content_summary']['present'].get('container.tag',{}).get('count',0) if v else 'not synced')
" 2>/dev/null || echo "?")
  echo "  ${FULL}: ${tags} tags"
done

[[ "$count" -ge 3 ]] && echo -e "\n✓ Done" || { echo -e "\n⚠ Missing distributions"; exit 1; }
