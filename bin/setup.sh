#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────
# setup.sh — Configure pulp-cli to connect to the Pulp instance
# pulp-cli is already installed via the devcontainer Dockerfile
# ──────────────────────────────────────────────────────────────

echo "=== PulpHub Setup ==="

# Check if pulp config exists
config_file="${XDG_CONFIG_HOME:-$HOME/.config}/pulp/cli.toml"
if [[ ! -f "$config_file" ]]; then
  echo ""
  echo "No pulp config found. Creating one..."
  read -rp "  Pulp URL [https://pulp.local:8443]: " pulp_url
  pulp_url="${pulp_url:-https://pulp.local:8443}"
  read -rp "  Username [admin]: " username
  username="${username:-admin}"
  read -rsp "  Password [admin]: " password
  password="${password:-admin}"
  echo ""

  pulp config create \
    --base-url "$pulp_url" \
    --username "$username" \
    --password "$password" \
    --no-verify-ssl \
    --overwrite

  echo "✓ Pulp config created at ${config_file}"
else
  echo "✓ Pulp config already exists at ${config_file}"
fi

# Verify connectivity
echo ""
if pulp status >/dev/null 2>&1; then
  echo "✓ Pulp API reachable"
else
  echo "⚠ Cannot reach Pulp API. Check your config: ${config_file}"
fi

echo ""
echo "Done. Next: make seed"
