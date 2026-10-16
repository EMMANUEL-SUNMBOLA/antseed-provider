# 02 — Setup log (chronological)

Every step, command, output. Times are UTC.

---

## 2026-10-16 — Phase A: CLI + identity

**Install**

```console
$ npm install -g @antseed/cli
added 310 packages in 19s
```

**Node check**

```console
$ node -v
v24.14.1        # requirement: >= 20 ✓
```

**Identity creation** — running any seller command auto-creates the secp256k1
key if missing:

```console
$ antseed seller status
Seller Status: IDLE
...
│ Wallet address          │ 0x5473831A3142d912FdF88495e17c08b2a6fc37Ec │
│ Configured providers    │ (none)                                      │
│ On-chain mode           │ recognized-usage                            │
│ Seller eligible         │ false                                       │
```

```console
$ ls -la ~/.antseed/
-rw------- 1 root root 64 Oct 16 10:26 identity.key      # 64 hex chars, mode 600
```

| Item | Value |
|---|---|
| Key file | `~/.antseed/identity.key` (permission 600 — **the wallet, never leave this box**) |
| **Wallet (fund ETH on Base here)** | **`0x5473831A3142d912FdF88495e17c08b2a6fc37Ec`** |
| Peer ID (no 0x) | `5473831A3142d912FdF88495e17c08b2a6fc37Ec` |
| config.json | not created yet (created in Phase C) |

**Repo created** with README, .env.example (funding address baked in),
docs 00–05, scripts/.

---

## DNS records to create (Hostinger → cavedl.xyz → DNS & Nameservers)

Subdomain: **`ant.cavedl.xyz`**

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `ant` | `104.237.11.135` | 3600 |
| TXT | `_antseed.ant` | `antseed-peer=5473831A3142d912FdF88495e17c08b2a6fc37Ec` | 3600 |

Notes:
- Names are relative to `cavedl.xyz` in Hostinger's form. If the form demands
  a FQDN, use `ant.cavedl.xyz` / `_antseed.ant.cavedl.xyz`.
- TXT is what proves domain ownership; A record just makes the subdomain
  resolve to this VPS (used as our `publicAddress`).
- Propagation 5–30 min. Verify from the VPS:

```console
dig +short A ant.cavedl.xyz
dig +short TXT _antseed.ant.cavedl.xyz
```

---

## Funding (operator)

- **$5 ETH on Base mainnet** → `0x5473831A3142d912FdF88495e17c08b2a6fc37Ec`
  (withdraw from exchange on the **Base** network — not Ethereum mainnet!)
- Seller checks gas every 60 s; pauses advertising below 0.00005 ETH.

## DeepSeek key (operator)

1. https://platform.deepseek.com → API keys → create → copy `sk-...`
2. Buy $20 credit (top-up)
3. On your machine: copy `.env.example` → `.env`, set `DEEPSEEK_API_KEY=sk-...`
4. `scp .env root@104.237.11.135:/root/.antseed/.env`

---

## Phase B — funding, key, DNS (verified)

**Repo pushed** to `git@github.com:EMMANUEL-SUNMBOLA/antseed-provider.git`
(branch `main`, first commit `dff537e`). `.env` is git-ignored — only
`.env.example` is tracked.

**DNS verified** (local resolver + `8.8.8.8`):

```console
$ dig +short A ant.cavedl.xyz
104.237.11.135
$ dig +short TXT _antseed.ant.cavedl.xyz
"antseed-peer=5473831A3142d912FdF88495e17c08b2a6fc37Ec"
```

**DeepSeek key** placed at `/root/.antseed/.env` (scp'd), then hardened:

```console
$ chmod 600 /root/.antseed/.env
$ set -a; source /root/.antseed/.env; set +a
$ curl -s -o /dev/null -w '%{http_code}\n' https://api.deepseek.com/models \
    -H "Authorization: Bearer $DEEPSEEK_API_KEY"
200
```

**Wallet funded:** `0.002084241305195851 ETH` on Base (~$5).

## Phase C — register, config, agent, run

**Register (important gotcha):** the first `antseed seller register` failed with a
custom error `0x7e273289`. Decoded via 4byte/openchain it is
`ERC721NonexistentToken(uint256)`: the identity mint hadn't been mined yet when the
binding call was estimated — a **race in the CLI flow**, not a missing stake.

```console
$ antseed seller register --agent-id 157681
# tx 0x26c561f1... mined OK (status 1, block 52689574); verification check raced
$ antseed seller status | grep -E 'Agent ID|eligible'
│ Agent ID       │ 157681 │
│ Seller eligible │ true  │
```

On-chain confirmed: `SellerRegistry.getAgentId(wallet) = 157681`,
`agentSeller(157681) = 0x5473…37Ec`.

**Config** written to `/root/.antseed/config.json`: provider `deepseek`
(plugin `openai`, `baseUrl https://api.deepseek.com`, `apiKeyEnv DEEPSEEK_API_KEY`),
services `code-review` ($0.80 / $0.08 cached / $2.00 per 1M) and a free
`deepseek-v4-flash` ($0), `agentDir` for `code-review`, `publicAddress
ant.cavedl.xyz:6882`, `freeTier` 5/addr + 20/IP per 24 h, and `verifications`
(DNS TXT + GitHub).

**Agent** `agents/code-review/` (manifest + persona + 4 knowledge modules),
tracked in the repo. GitHub claim file `antseed.json` at the repo root.

**Firewall:** `ufw` is **not installed**; `nft list ruleset` shows the `inet filter`
input policy is `accept` — ports 6881/6882 are open at the OS level, so no ufw
rules were added (nothing to reset).

**Run under PM2** via `scripts/run-seller.sh` (sources `~/.antseed/.env` at
runtime, so no secret is stored in the process list):

```console
$ pm2 start scripts/run-seller.sh --name antseed-seller --interpreter bash
$ pm2 save
```

Startup log:

```text
✔ Provider "deepseek" loaded via @antseed/provider-openai
✔ Seeding active
  free tier: 5 per buyer address, 20 per IP every 86400000ms
  domain verification: ant.cavedl.xyz
  github verification: emmanuel-sunmbola
  ant agent: "code-review" → code-review (4 knowledge modules)
  Peer ID: 5473831a3142d912fdf88495e17c08b2a6fc37ec
  DHT port: 6881   Signaling port: 6882
```

**Live on the network** (`antseed network peer <id>`, live DHT lookup):

```text
Peer ID:        5473831a3142d912fdf88495e17c08b2a6fc37ec
Display name:   CaveDL Code Review
Public address: ant.cavedl.xyz:6882
Last seen:      1s ago
code-review         in $0.80/1M  out $2.00/1M  cached-in $0.08/1M
deepseek-v4-flash   in $0.00/1M  out $0.00/1M
Trust: 5 = free models 5
```

`antseed seller doctor` → "Announced endpoint ant.cavedl.xyz:6882, local TCP probe
connected". Earnings cron installed (daily 00:05 UTC → `scripts/snapshot-earnings.sh`,
which now compacts the pretty-printed `--json` output with `jq -c`).

## Open items / follow-ups

- **Dedicated Base RPC** (recommended): default is `https://base.gateway.tenderly.co`
  with drpc/nodies/mainnet fallbacks; set `rpcUrl` in `config.json` if a
  dedicated endpoint (Alchemy/QuickNode key) becomes available.
- **External reachability**: confirmed via live DHT lookup; a true inbound probe
  from a separate network (or the provider's cloud-firewall panel) is still worth
  a one-time check.
- **Identity trust points** (`identity —`) not yet indexed at log time; verifier
  crawls DNS/repo periodically — re-check with `antseed network peer <id>`.
- **End-to-end paid request** with a real buyer still to be observed
  (`antseed network browse`).
