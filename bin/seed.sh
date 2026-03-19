#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# seed.sh — Populate a Pulp instance with test container data
# Idempotent: safe to re-run on an already-seeded instance
# Requires: pulp-cli configured via `pulp config create`
#
# Optional Docker Hub auth (bypasses ~100 pulls/6h rate limit):
#   DOCKERHUB_USERNAME=user DOCKERHUB_PASSWORD=token ./bin/seed.sh
# ──────────────────────────────────────────────────────────────

source "./.env"

PREFIX="dockerhub/library"

# name|upstream|tags (comma-separated, limits sync to avoid Docker Hub rate limits)
IMAGES=(
  "alpine|library/alpine|3.18,3.19,latest,edge"
  "busybox|library/busybox|1.36,1.37,stable,latest"
  "hello-world|library/hello-world|latest,linux"
)

# ── Helpers ───────────────────────────────────────────────────

exists() { pulp container "$@" >/dev/null 2>&1; }

ensure_remote() {
  local name="$1" upstream="$2"; shift 2
  # remaining args are --include-tags values
  if exists remote show --name "$name"; then
    echo "  Remote exists"
  else
    echo "  Creating remote..."
    pulp container remote create \
      --name "$name" \
      --url "https://registry-1.docker.io" \
      --upstream-name "$upstream" \
      --policy "on_demand"
    echo "  Remote created"
  fi
  # Set include_tags to limit sync scope (avoid Docker Hub rate limits)
  local update_args=()
  if [[ $# -gt 0 ]]; then
    update_args+=("$@")
  fi
  # Optional Docker Hub auth (bypasses rate limits)
  if [[ -n "${DOCKERHUB_USERNAME:-}" ]]; then
    update_args+=(--username "$DOCKERHUB_USERNAME" --password "${DOCKERHUB_PASSWORD:-}")
  fi
  if [[ ${#update_args[@]} -gt 0 ]]; then
    echo "  Updating remote${DOCKERHUB_USERNAME:+ (with Docker Hub auth)}..."
    pulp container remote update --name "$name" "${update_args[@]}" >/dev/null 2>&1 || true
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
pulp status >/dev/null 2>&1 || { echo "ERROR: Pulp unreachable. Run 'make setup' first."; exit 1; }
echo "✓ Pulp API OK"

if [[ -n "${DOCKERHUB_USERNAME:-}" ]]; then
  echo "  Using DockerHub credentials ${DOCKERHUB_USERNAME}:${DOCKERHUB_PASSWORD}"
fi

for entry in "${IMAGES[@]}"; do
  IFS='|' read -r NAME UPSTREAM TAGS <<< "$entry"
  FULL="${PREFIX}/${NAME}"

  echo ""
  echo "── ${FULL} ──"

  # Build --include-tags as JSON array: '["3.18","3.19","latest"]'
  IFS=',' read -ra TAG_LIST <<< "$TAGS"
  TAG_JSON=$(printf '"%s",' "${TAG_LIST[@]}")
  TAG_JSON="[${TAG_JSON%,}]"

  ensure_remote "$FULL" "$UPSTREAM" --include-tags "$TAG_JSON"
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
