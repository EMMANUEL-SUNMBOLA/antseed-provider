# AGENTS.md — antseed-provider

Project guide + living plan for running an **Antseed** provider (seller) on a
shared VPS, and for the decisions we're still weighing. Read this first; the
`docs/` folder holds the long-form research and runbooks.

> **Antseed** is a P2P marketplace for AI inference. Buyers pay per request
> through payment channels on **Base**; sellers earn **USDC** (96%; protocol
> takes 4%). Docs: https://antseed.com/docs/provide

---

## Project map

| Path | Role |
|---|---|
| `agents/code-review/` | The `code-review` ant agent — `agent.json` + persona + 4 knowledge modules |
| `monitor/` | Admin-only Telegram bot: status, daily overview, sales + health alerts |
| `docs/` | Research, plan, setup log, ops runbook, earnings, value proposition |
| `scripts/` | **Server-local helper scripts — intentionally NOT in this repo (see Security).** Live only on the VPS |
| `config.example.json` | Secrets-free seller config template (`apiKeyEnv` names only) |
| `antseed.json` | GitHub ownership proof (`antseed-github-verification`) |
| `data/` | Local earnings snapshots (`earnings.jsonl`) — git-ignored |

Runtime lives on the VPS at `/root/workspace/antseed-provider/`. The seller
process and its secrets live outside the repo under `/root/.antseed/`.

## Live node (as of 2026-10-16)

| | |
|---|---|
| Wallet / peer ID | `0x5473831A3142d912FdF88495e17c08b2a6fc37Ec` (peer: no `0x`) |
| Agent ID (ERC-8004) | `157681` (mint tx `0x26c561f12...cc9e`) |
| Public endpoint | `ant.cavedl.xyz:6882` (TCP 6882, UDP 6881 DHT) |
| Upstream | DeepSeek official API (`https://api.deepseek.com`) |
| Services | `code-review` $0.80/$0.08c/$2.00 per 1M · free `deepseek-v4-flash` |
| Claims | DNS TXT (`ant.cavedl.xyz`) + GitHub (`antseed.json`) |
| PM2 | `antseed-seller` (wrapper) + `antseed-monitor` |
| State | `seeding`, `eligible: true`, `mode: recognized-usage`, 0 stake, 0 pool |
| Trust | `5` (free model bonus only; identity shows `—` until buyer-verified) |

## Stack / conventions

- Node **v24** (`/root/.nvm/versions/node/v24.14.1/bin`); CLI `@antseed/cli`.
- Seller is a real process from `antseed seller start`, run under **PM2** via the
  server-local wrapper (sources `/root/.antseed/.env` at runtime).
- Monitor is ESM + `node-telegram-bot-api`, PM2 name `antseed-monitor`.
- Base mainnet only. No GPU, no local models, no TEE.

## Essential commands

```bash
# vps paths
cd /root/workspace/antseed-provider

# load seller secrets for CLI use
set -a; source /root/.antseed/.env; set +a

antseed seller status --json
antseed seller doctor
antseed network browse --services            # market: prices, demand, sessions
antseed network peer 5473831A3142d912FdF88495e17c08b2a6fc37Ec

pm2 restart antseed-seller
pm2 restart antseed-monitor
pm2 save
```

---

## How the network picks sellers (the decisive mechanics)

1. **Price first, then reputation.** The default buyer router sorts candidate
   peers by cheapest input price, *then* reputation, then latency
   (`@antseed/node/dist/routing/default-router.js:13`). A `$0` service sorts
   ahead of every paid one — this is why the free tier receives traffic.
2. **Trust score** (`@antseed/node/dist/reputation/trust-score.js`) — 0–100:
   - `history` 50 — settled channels + USDC volume.
   - `usage` 20 — share of pool recognized-usage points. **Needs an ANTS-staked pool.**
   - `power` 10 — share of lock-weighted staking power. **Needs a pool.**
   - `identity` 20 — buyer-verified history (GitHub ≤70 / domain ≤12 sub-points).
   - `freeModels` +5 — bonus for offering any model at $0.
   - We forfeit `usage` + `power` (30 pts) without staking; identity stays
     unclaimed until a **buyer** verifies our DNS/GitHub claims.
3. **Discovery** is by exact **model/service name** plus category tags
   (`coding`, `legal`, `privacy`, `finance`, `uncensored`, `tee`). Buyers
   request a model id and the router picks among peers offering it.
4. **Consequence:** sitting and "building trust" is weak — price beats
   reputation for selection. To win paid volume you must be **cheapest for a
   model** or offer a **name with demand that few others serve**.

## Market snapshot (2026-10-16, 73 peers)

| Service | Peers | Median in/out | Sessions | Volume |
|---|---|---|---|---|
| `medical-reasoning-r1` | **1** | $1.20 / $3.00 | 6,951 | **$7,204** |
| `legal-vl1` | 1 | $1.20 / $3.00 | 4,461 | $6,921 |
| `code-review` (competitor) | 1 | $1.20 / $3.00 | 63 | $2,008 |
| `deepseek-v4-flash` | 9 (2 free) | $0.048 / $0.12 | 10,107 | $14.2k |
| `deepseek-v4-flash-0731` | 7 | $0.064 / $0.13 | 7,779 | $9.6k |

Two money patterns: **single-seller vertical agents** at $1.20/$3.00 (medical
and legal are near-monopolies), or **high-volume commodity resale** (thin
margins, 7–13 competitors). Our `code-review` sits in a weak niche (63 sessions
network-wide) and currently earns $0.

---

## Strategy options (decide after the 24h test)

| # | Move | Cost / risk | Upside |
|---|---|---|---|
| A | Kill/cap the free tier | lose +5 trust + "Free" exposure | stops the free-inference bleed |
| A′ | **Cap** free tier (fewer/addr/IP, smaller context) but keep the `$0` model | minimal | stops most bleed while **keeping the +5** |
| B | **Differentiated vertical agent** in an in-demand niche at $1.20/$3.00 | build effort | highest ceiling — can be a near-monopoly; fits existing agent framework |
| C | Commodity undercut (paid `deepseek-v4-flash-0731` just under median) | thin margin, 7+ peers | small, steady |
| D | Stake ANTS + open a pool | capital + token risk | unlocks trust `usage`+`power`, but price still dominates routing |

## Decision log

- **2026-10-16 — Freeze.** Do **not** change provider config for 24h, and do
  **not** remove the free model: we just started and the `+5` freeModels trust
  bonus is worth protecting over a small short-term token cost.
- **Deferred:** choose among A–D after the 24h window. Note **A′ keeps the +5**
  (the bonus only requires offering *a* $0 model, not its cap size), so it is
  the preferred lever if the bleed gets expensive before the window ends.

## 24h experiment (T0 = 2026-10-16T20:06Z)

**Baseline (T0):** 22 requests (20 ✅ / 2 ❌), 2,327,129 tokens
(2,311,095 in / 16,034 out), 6 distinct buyers, **all `deepseek-v4-flash`,
$0.00** earned. Rate ≈ 7 req/h → ~2.3M tokens/3h ≈ **~$2.6–5.2/day** of
DeepSeek upstream (estimate).

**Watch** (sources): monitor bot `/today` `/sales` `/status`; `metering.db`;
`antseed seller status --json`; `antseed network peer <id>`; 00:05 UTC cron
snapshot in `data/earnings.jsonl`.

**Metrics:** free vs paid requests · tokens (→ est. cost) · unique buyers ·
failures · latency · any paid `code-review` hit · free→paid conversions · trust.

**Early-abort guardrail:** if cumulative free tokens > ~10M or est. cost > ~$2,
act early with **A′** (cap the free tier — the +5 survives).

**End-of-window decision:**
- Zero paid demand + farming continues → **A′/A** (cap or cut free).
- Paid hits on `code-review` → tune price / lean in.
- Any free→paid conversion → **keep free**, invest more.

---

## Monitoring (`monitor/`)

Admin-only Telegram bot (PM2 `antseed-monitor`), reuses the retired FactCheck
bot token + `cavedl-tgbot` admin chat id, both read at runtime. Commands
`/status /antseed /today /sales /balance /problems /help /id` post a `⏳`
placeholder then edit it in place. Alerts: seller down/not seeding, low gas,
upstream failure, no traffic 48h, traffic spike, per-minute sales activity;
daily overview 00:05 UTC. See `docs/03-operations.md`.

## Security rules

1. **`scripts/` is deliberately NOT in this public repo.** It holds server-local
   helpers — including a private-key exporter — that make extraction of
   `~/.antseed/identity.key` trivial and advertise where the key lives. Keep it
   off GitHub; run it locally only.
2. `~/.antseed/identity.key` (wallet key) is never committed, never printed in
   chat/logs, never copied anywhere insecure. It controls all ETH + USDC.
3. Real credentials live only in `/root/.antseed/.env` or env vars. `config.json`
   references env-var *names* (`apiKeyEnv`), never values.
4. This repo is **public** — assume world-readable. No secrets, no server-only
   helpers, no key paths.
5. Seller blocks sanctioned regions by default — do not disable casually.

## Doc map

| File | Contents |
|---|---|
| `README.md` | Public overview + live status + quick reference |
| `docs/00-research.md` | Antseed network research |
| `docs/01-plan.md` | Goal, constraints, phases, pricing rules |
| `docs/02-setup-log.md` | What was actually run, in order |
| `docs/03-operations.md` | Runbook (PM2, ports, gas, monitor) |
| `docs/04-earnings.md` | Daily snapshots + P&L |
| `docs/05-value-proposition.md` | Why differentiated services, not raw resale |

## Related services on this box

`cavedl-api`, `roarrumble`, `cavedl-tgbot`, `mintbot` (PM2). The former
**FactCheck** service was retired and replaced by `monitor/`.
