#!/usr/bin/env bash
# Append one JSON snapshot of seller status to data/earnings.jsonl
# Cron: 5 0 * * * /root/workspace/antseed-provider/scripts/snapshot-earnings.sh
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p data

[ -f /root/.antseed/.env ] && { set -a; source /root/.antseed/.env; set +a; }

snap="$(antseed seller status --json 2>/dev/null || echo '{}')"
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf '{"ts":"%s","status":%s}\n' "$ts" "$snap" >> data/earnings.jsonl

echo "snapshot written: $ts"
