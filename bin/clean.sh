#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# clean.sh — Remove all seed data from Pulp
# Requires: pulp-cli configured via `pulp config create`
# ──────────────────────────────────────────────────────────────

NAMES=(
  "dockerhub/library/alpine"
  "dockerhub/library/busybox"
  "dockerhub/library/hello-world"
)

destroy() {
  local resource="$1" name="$2"
  if pulp container "$resource" show --name "$name" >/dev/null 2>&1; then
    echo "  Destroying ${resource}: ${name}"
    pulp container "$resource" destroy --name "$name" >/dev/null 2>&1
  fi
}

echo "=== Pulp Clean ==="
pulp status >/dev/null 2>&1 || { echo "ERROR: Pulp unreachable."; exit 1; }

for name in "${NAMES[@]}"; do
  echo ""
  echo "── ${name} ──"
  # Order matters: distribution → repository → remote
  destroy distribution "$name"
  destroy repository "$name"
  destroy remote "$name"
done

echo ""
echo "✓ Cleanup complete"
