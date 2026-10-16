#!/usr/bin/env bash
# Launch the Antseed seller under a process manager (PM2/systemd).
# Sources the secret env file at runtime so no secrets are stored here.
set -euo pipefail

# Ensure the Node/npm global bin (where `antseed` lives) is on PATH.
export PATH="/root/.nvm/versions/node/v24.14.1/bin:${PATH}"

ENV_FILE="${ANTSEED_ENV_FILE:-/root/.antseed/.env}"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

exec antseed seller start
