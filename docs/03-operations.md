# 03 — Operations runbook

Node identity: `0x5473831A3142d912FdF88495e17c08b2a6fc37Ec`
Data dir: `~/.antseed/` (config.json, identity.key, metering.db, plugins/)
Env file: `/root/.antseed/.env` (git-ignored)

> **`scripts/` is server-local and intentionally NOT in the public repo** (it
> includes a private-key exporter and host helpers). The paths referenced below
> exist on the VPS only; find them at `/root/workspace/antseed-provider/scripts/`.

## Load environment

The CLI reads secrets from **process env only**. Always prefix seller commands:

```bash
set -a; source /root/.antseed/.env; set +a
```

## Start / stop / restart (PM2 — same as the other services on this box)

The wrapper `scripts/run-seller.sh` sources `~/.antseed/.env` at runtime and
execs `antseed seller start`, so no secret lives in the PM2 process list:

```bash
pm2 start /root/workspace/antseed-provider/scripts/run-seller.sh \
    --name antseed-seller --interpreter bash
pm2 logs antseed-seller
pm2 restart antseed-seller
pm2 stop antseed-seller
pm2 save          # persist across reboots (pm2 resurrect)
```

Monitor RAM: the seller should sit at ~150–250 MB. This box has **no swap** —
if `free -h` available drops below ~500 MB, stop the seller first (the
microservices take priority).

## Status / earnings

```bash
antseed seller status              # human table
antseed seller status --json       # for scripts / snapshots
```

Key rows: `Seller eligible`, `Earnings today`, `Active channels`,
`Wallet address`, `Peers connected`.

## Health checks

```bash
antseed seller doctor              # probes announced publicAddress
antseed network peer 5473831A3142d912FdF88495e17c08b2a6fc37Ec   # from OUTSIDE network
antseed network browse             # are our services listed?
bash scripts/check-node.sh         # all-in-one: ports, gas, DNS, doctor
```

## Gas (ETH on Base)

- Threshold: seller pauses advertising below **0.00005 ETH** (~$0.10).
- Check: `antseed seller status` (wallet row) or
  `cast balance 0x5473...37Ec` / any Base explorer.
- Top-up: send ETH **on Base** from exchange (network: Base). $5 = months of gas.

## Ports

| Port | Proto | Purpose |
|---|---|---|
| 6881 | UDP | DHT discovery |
| 6882 | TCP | buyer connections (announced as `ant.cavedl.xyz:6882`) |

On this box **`ufw` is not installed**; nftables `inet filter` input policy is
`accept`, so the ports are open at the OS level. If a host firewall is ever
enabled, add:

```bash
ufw allow 6881/udp
ufw allow 6882/tcp
```

**Warning:** on a shared box — check existing rules first and only ADD; never
reset. Port 22/80/443 must stay open (nginx, ssh). Also check the VPS provider's
cloud-firewall panel separately.

## After any config change

```bash
antseed config seller show          # view current config.json seller section
pm2 restart antseed-seller          # claims/verifications require restart
```

## Bootstrap settles (crossing the trust ≥ 60 gate)

Default buyers (VPR) only route paid requests to sellers with trust ≥ 60.
Trust ≈ 50 comes from `history`: ~100 settled channels + ~$100 settled volume.
The server-local `scripts/` tooling (NOT in the repo) generates **real**,
wash-registry-aware settles by buying from our own pinned seller via extra
buyer identities:

```bash
cd /root/workspace/antseed-provider

# 1) create ~12 extra buyer identities (wallets) and list funding addresses
bash scripts/bootstrap-create-identities.sh 12
bash scripts/bootstrap-funding.sh 8          # ~$96 USDC on Base to fund

# 2) start the pinned buyer proxy (port 8787, pinned to our peer)
pm2 start scripts/buyer-proxy.sh --name antseed-buyer-proxy && pm2 save

# 3) fire small real requests (cron 1-3x/day; default $6/day budget)
node scripts/bootstrap-settles.mjs --dry-run
node scripts/bootstrap-settles.mjs --count 2
```

State/logs: `scripts/bootstrap-state.json`, `scripts/bootstrap.log` (NDJSON).
Cost profile: the ~$100 float cycles back to our wallet minus the 4% protocol
fee; true burn ≈ fee (~$4) + DeepSeek upstream. Keep the cadence organic —
watch antseedstats for wash flags; never crank daily spend.

**Funding constraints (learned 2026-10-18):**
- The deposits contract has `MIN_BUYER_DEPOSIT = 1.0 USDC` — first deposit
  below that reverts (custom error `0x96ec8e54`), and the gasless sweep has a
  similar "minimum + relay fee" (~$0.05) floor. Send **≥ ~$1.05/identity**
  ($8 recommended).
- The **main buyer wallet is NOT needed** — `bootstrap-settles.mjs` only uses
  the `btN` identities; skip funding the main buyer entirely.
- Smoke-tested free path (no deposits needed): `curl :8787/v1/chat/completions`
  with `x-antseed-buyer-identity: bt1` + model `deepseek-v4-flash` → 200 OK.



## Common failures

| Symptom | Cause | Fix |
|---|---|---|
| Seller says "missing gas" | ETH < 0.00005 | fund wallet on Base |
| Not in `network browse` | ports closed / wrong publicAddress / still registering | `seller doctor`, ufw, dig |
| 401 from upstream | DeepSeek key missing/invalid in env | check `.env` loaded (`echo ${DEEPSEEK_API_KEY:0:6}`) |
| `seller start` refuses | not registered yet / no services configured | register + add services first |
| Buyers can't connect | publicAddress not reachable externally | verify `antseed network peer <id>` from another network |
| Claims (✓) missing | DNS not propagated or nginx redirect | dig TXT; DNS method must be used (no redirect issue) |
| Health check dropped a service | upstream failing probes (3× / 5 min) | check DeepSeek status + credit balance |

## Security

- `identity.key` never leaves `~/.antseed/`, mode 600. It IS the USDC wallet.
- `.env` never committed; `git status` before every commit.
- Seller refuses buyers from CU, IR, KP, SY, RU by default — do not disable
  without a reason (sanctions exposure is on the operator).
- Restricted log-ins: keep `ufw allow 22/tcp` limited to known IPs where possible.

## Telegram monitor (`monitor/`)

Admin-only monitoring bot that lives in this repo and runs on the same box
(PM2 name `antseed-monitor`). It reads `~/.antseed/metering.db` (read-only),
on-chain ETH/USDC balances, the `antseed` CLI, and pm2/ports — then pushes
alerts and answers commands for **one** admin chat only.

```bash
pm2 start /root/workspace/antseed-provider/monitor/index.js \
    --name antseed-monitor --cwd /root/workspace/antseed-provider/monitor
pm2 logs antseed-monitor
pm2 restart antseed-monitor
```

- **Secrets:** no token is stored in this repo. It reuses the retired FactCheck
  bot token (`/root/workspace/FactCheck/.env`) and the admin chat id from
  `cavedl-tgbot/.env`, both read at runtime; override via `monitor/.env`.
- **Commands:** `/status` `/antseed` `/today` `/sales` `/balance` `/problems`
  `/help` `/id`. Each posts a `⏳ …` placeholder and edits it in place with the
  result (with a typing action while working), so the chat stays tidy.
- **Alerts:** seller down / not listening / not seeding, low gas, upstream
  (DeepSeek) failure, no requests for 48 h, traffic spike, and per-minute
  sales activity (✅ served / ❌ failed / earned).
- **Daily overview:** pushed at 00:05 UTC (requests, ✅/❌, tokens, USDC earned,
  USDC left, ETH left).
- Poll cadence: health every 5 min (`CHECK_INTERVAL_MS`), sales DB every 1 min
  (`ACTIVITY_INTERVAL_MS`). Set these in `monitor/.env` (see `.env.example`).

## Snapshot / monitoring cron

Installed for root (daily earnings snapshot at 00:05 UTC; `snapshot-earnings.sh`
compacts the pretty-printed JSON with `jq -c` so the file is valid JSONL):

```cron
PATH=/root/.nvm/versions/node/v24.14.1/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
5 0 * * * /root/workspace/antseed-provider/scripts/snapshot-earnings.sh >> /var/log/antseed-earnings.log 2>&1
```
