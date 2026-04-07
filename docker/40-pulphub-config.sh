#!/bin/sh
# Runs from the nginx:alpine /docker-entrypoint.d/ hook directory.
# Renders /var/www/config.js from its template using PULP_URL.
set -e

RED='\033[31m'
GREEN='\033[32m'
NC='\033[0m'

if [ -z "$PULP_URL" ]; then
  printf "${RED}ERROR: PULP_URL environment variable is required${NC}\n" >&2
  exit 1
fi

# Strip trailing slash
PULP_URL="${PULP_URL%/}"
export PULP_URL

envsubst < /var/www/config.js.tpl > /var/www/config.js

printf "${GREEN}PulpHub configured for ${PULP_URL}${NC}\n"
