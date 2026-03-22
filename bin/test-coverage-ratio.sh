#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# test-coverage-ratio.sh — Quick test quality indicator
# Ratio of expect() assertions vs routes × estimated states
# ──────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

STATES_PER_ROUTE=4
MIN_RATIO="${MIN_RATIO:-1.5}"

# ── Count routes ──────────────────────────────────────────────
mapfile -t routes < <(find src/routes -name '+page.svelte' | sort)
route_count=${#routes[@]}

# ── Count expects ─────────────────────────────────────────────
expect_count=$(grep -r -c 'expect(' e2e/ --include='*.ts' 2>/dev/null | awk -F: '{s+=$2} END {print s+0}')

# ── Calculate ─────────────────────────────────────────────────
expected_min=$(echo "$route_count * $STATES_PER_ROUTE" | bc)
ratio=$(echo "scale=1; $expect_count / $expected_min" | bc)

# ── Report ────────────────────────────────────────────────────
echo -e "${BOLD}=== Test Coverage Ratio ===${NC}"
echo ""
echo -e "  Routes (+page.svelte):  ${BOLD}${route_count}${NC}"
echo -e "  States/route (est.):    ${BOLD}${STATES_PER_ROUTE}${NC}"
echo -e "  Route×States:           ${BOLD}${expected_min}${NC}"
echo -e "  expect() assertions:    ${BOLD}${expect_count}${NC}"
echo -e "  Ratio:                  ${BOLD}${ratio}${NC} (min: ${MIN_RATIO})"
echo -e ""
echo -e "  Warning: shared tests are counted only once"
echo ""

# ── Per-route detail ──────────────────────────────────────────
echo -e "${BOLD}--- Per route ---${NC}"

# Build a map: top-level route segment → test file → expect count
declare -A route_expects

for route in "${routes[@]}"; do
  # src/routes/files/[name]/+page.svelte → files
  # src/routes/+page.svelte → (root)
  # src/routes/repositories/[name]/tags/[tag]/+page.svelte → repositories
  rel=$(dirname "$route" | sed 's|^src/routes||; s|^/||')
  segment="${rel%%/*}"
  if [[ -z "$segment" ]]; then
    segment="(root)"
  fi

  # Skip if already counted this segment
  if [[ -n "${route_expects[$segment]+x}" ]]; then
    continue
  fi

  # Find matching test files by name pattern
  local_count=0
  if [[ "$segment" == "(root)" ]]; then
    # Root route — check auth.test.ts
    if [[ -f "e2e/auth.test.ts" ]]; then
      local_count=$(grep -c 'expect(' "e2e/auth.test.ts" 2>/dev/null || echo 0)
    fi
  else
    # Find test files that navigate to this route segment's URLs
    # e.g. segment "repositories" → any test file containing goto('/repositories
    # or goto('/files  for segment "files"
    for tf in e2e/*.test.ts; do
      [[ -f "$tf" ]] || continue
      if grep -q "goto('/${segment}" "$tf" 2>/dev/null; then
        c=$(grep -c 'expect(' "$tf" 2>/dev/null || echo 0)
        local_count=$((local_count + c))
      fi
    done
  fi

  route_expects[$segment]=$local_count
done

# Count sub-routes per segment for display
declare -A route_subcount
for route in "${routes[@]}"; do
  rel=$(dirname "$route" | sed 's|^src/routes||; s|^/||')
  segment="${rel%%/*}"
  if [[ -z "$segment" ]]; then segment="(root)"; fi
  route_subcount[$segment]=$(( ${route_subcount[$segment]:-0} + 1 ))
done

# Display sorted
for segment in $(echo "${!route_expects[@]}" | tr ' ' '\n' | sort); do
  count=${route_expects[$segment]}
  sub=${route_subcount[$segment]:-1}

  if [[ "$count" -eq 0 ]]; then
    color="$RED"; marker="✗"
  elif [[ "$count" -lt $((sub * 3)) ]]; then
    color="$YELLOW"; marker="~"
  else
    color="$GREEN"; marker="✓"
  fi

  printf "  ${color}%s${NC} %-30s ${BOLD}%3s${NC} expects  (%s routes)\n" \
    "$marker" "$segment" "$count" "$sub"
done

echo ""

# ── Verdict ───────────────────────────────────────────────────
pass=$(echo "$ratio >= $MIN_RATIO" | bc -l)
if [[ "$pass" -eq 1 ]]; then
  echo -e "${GREEN}✓ Ratio ${ratio} >= ${MIN_RATIO} — OK${NC}"
  exit 0
else
  echo -e "${RED}✗ Ratio ${ratio} < ${MIN_RATIO} — insufficient test coverage${NC}"
  exit 1
fi
