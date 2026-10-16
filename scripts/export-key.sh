#!/usr/bin/env bash
# Reveal the Antseed wallet private key so it can be imported into a wallet
# (MetaMask / Rabby / hardware). This script contains NO secret itself; it only
# prints the key that already lives at ~/.antseed/identity.key when YOU run it.
#
#   bash scripts/export-key.sh
#
# SECURITY: the key controls all ETH + USDC in the wallet. Run this yourself,
# never paste the output into a website, chat, AI tool, or commit. Prefer a
# hardware wallet for meaningful balances.
set -euo pipefail

KEY_FILE="${ANTSEED_KEY_FILE:-/root/.antseed/identity.key}"

if [ ! -f "$KEY_FILE" ]; then
  echo "No identity key found at $KEY_FILE" >&2
  exit 1
fi

raw="$(tr -d '[:space:]' < "$KEY_FILE")"
raw="${raw#0x}"

if ! printf '%s' "$raw" | grep -qiE '^[0-9a-f]{64}$'; then
  echo "Refusing: $KEY_FILE is not a plaintext 64-hex key." >&2
  echo "It may be passphrase-encrypted (identity.enc / Electron safeStorage)," >&2
  echo "which this script does not decrypt." >&2
  exit 1
fi

cat <<EOF
==================================================================
  ANTSEED WALLET — PRIVATE KEY
  Anyone with this key can move ALL funds (ETH + USDC) in the
  wallet. Treat it like cash. Do NOT paste it anywhere online.
==================================================================

  Address : 0x5473831A3142d912FdF88495e17c08b2a6fc37Ec
  Key     : 0x${raw}

  Import  : MetaMask/Rabby -> Import account -> paste the private key.
  Network : Base (chainId 8453)
  USDC    : 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913  (Base USDC)

  After importing, add the Base network + the USDC token to see balances.

  NOTE: the seller needs this key on the server to sign settlement txs, so
  exporting it means the key now lives in two places. If it may have been
  exposed, create a fresh identity and migrate funds instead.
EOF
