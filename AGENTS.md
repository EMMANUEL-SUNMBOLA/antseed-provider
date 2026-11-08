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

## Live node (as of 2026-10-18)

| | |
|---|---|
| Wallet / peer ID | `0x5473831A3142d912FdF88495e17c08b2a6fc37Ec` (peer: no `0x`) |
| Agent ID (ERC-8004) | `157681` (mint tx `0x26c561f12...cc9e`) |
| Public endpoint | `ant.cavedl.xyz:6882` (TCP 6882, UDP 6881 DHT) |
| Upstream | DeepSeek official API (`https://api.deepseek.com`; `deepseek-flash` + `deepseek-v4-pro`) |
| Services | `code-review` + `medical-reasoning-r1` $0.60/$0.06c/$1.50 per 1M · free `deepseek-v4-flash` |
| Free tier caps | 3 req/addr · 5 req/IP per 24h (tightened 2026-10-18) |
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

1. **Trust gate FIRST, then price.** The default buyer router (what the VPR
   desktop app ships with) **drops any seller below trust ≥ 60**, *then* sorts
   the survivors by cheapest input price, then reputation, then latency
   (`@antseed/node/dist/routing/default-router.js:9`; gate documented on
   antseedstats model pages). At trust 5 we are **invisible to every
   default-routed paid request** — being cheapest changes nothing until we
   cross 60. The `$0` free path is exempt (18 free buyers arrived at trust 5).
2. **Trust score** (`@antseed/node/dist/reputation/trust-score.js`) — 0–100:
   - `history` 50 — log curves over **settled channels (target 100)** and
     **settled volume (target $100)**, halved then summed.
   - `usage` 20 — share of pool recognized-usage points. **Needs an ANTS-staked pool.**
   - `power` 10 — share of lock-weighted staking power. **Needs a pool.**
   - `identity` 20 — buyer-verified history (GitHub ≤70 / domain ≤12 sub-points).
   - `freeModels` +5 — bonus for offering any model at $0.
   - We forfeit `usage` + `power` (30 pts) without staking; identity stays
     unclaimed until a **buyer** verifies our DNS/GitHub claims.
   - **ANTS transfers are gated (no market price)** — points can't be bought;
     pools get staked into by external stakers (see "antseedmarkets").
3. **Discovery** is by exact **model/service name** plus category tags
   (`coding`, `legal`, `privacy`, `finance`, `uncensored`, `tee`). Buyers
   request a model id and the router picks among peers offering it.
4. **Consequence:** the sequence is: free/pinned traffic → first settles →
   `history` pts → staker(s) → cross 60 → routing flywheel. Only after 60 does
   price competition start.

## Market snapshot (2026-10-18, antseedstats.com)

| Service | Sellers | Price in/out | Settled | Buyers |
|---|---|---|---|---|
| `medical-reasoning-r1` | **1** (Auralis, rep 62.7) | $1.20 / $3.00 | **$6.30k** (5.05B tok, 109k req) | 18 |
| `legal-vl1` | 1 (Auralis, rep 62.1) | $1.20 / $3.00 | $6.12k (4.65B tok, 87k req) | 16 |
| `code-review` | 2 (SecretAI-TDX $0.03/$0.12 rep 61.8; Quillfox $1.20/$3.00 rep 60.3) | $0.03–$1.20 | $6.66k total (3.53B tok, 229k req) | 18 |
| Frontier names (Kimi K3, GPT-5.6 Sol, Opus 5.5, GPT-6 Astra…) | 15–39 each | race to bottom | 90%+ of network $ volume | 80–140 each |

Two money patterns: **single-seller vertical agents** at $1.20/$3.00 (medical
and legal are near-monopolies run by the same Auralis operator), or
**high-volume frontier resale** (multi-upstream, deep discounts, ANTS pools).
Quillfox proves a **one-model vertical** can do $2.01k/month from 9 buyers.

## Competitor playbooks (studied 2026-10-18)

- **Apex** (`0x73b4…`, rank #14, $1.43k/wk): 108 models, −53…−67% discounts,
  24.6B **free** tokens to 2,285 buyers (top of funnel → usage points),
  193k ANTS pool + 309k self-locked → 12.5k ANTS usage rewards/epoch.
- **Diem/Venice** (`0x1f22…`, rank #11, $183/wk): 84 models ~40% under list,
  211 buyers since Apr, rep 69.3 incl. 4.8 identity(github).
- **GesundAI** (since Sep 15 — one month, $750/wk, rep 72): only 13 models,
  frontier undercuts via `anthropic-messages` + `openai-responses`, 156k ANTS
  pool (22.9% network power) → 17.5k ANTS staker rewards/epoch.
- **Quillfox** (our template): ONE model (`code-review`), $2.01k in a month,
  9 buyers, gate crossed with history 47.5 + one 7.95k ANTS staker.
- Free-tier buyer `0xf93b…9732` **already pays Quillfox** for code-review —
  warm lead for pinning us.

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
- **2026-10-18 — Experiment closed; strategy set.** Window results: 48 free
  requests, 17 buyers, 4.29M tokens, 0 paid, $0 earned, ~$0.39 upstream
  (guardrails never tripped). Root-cause finding: the default buyer router
  gates at trust ≥ 60 — at trust 5 we were never routable, so price/niche
  were irrelevant. **Decisions (user-approved):**
  - **A′** — free tier capped 3/addr · 5/IP per 24h (keeps the +5).
  - Reposition pricing at **50% under competitors**: `code-review` →
    $0.60/$0.06c/$1.50 (Quillfox $1.20/$3.00).
  - **B — medical**: launch `medical-reasoning-r1` at $0.60/$0.06c/$1.50
    (incumbent Auralis $1.20/$3.00; biggest single-seller prize at $6.30k,
    vs legal $6.12k). DeepSeek-v4-pro upstream, new agent
    (`agents/medical-reasoning-r1/`, 4 knowledge modules, hard safety
    guardrails).
  - **Bootstrap the gate**: pinned self-buyer settles (~$100 volume across
    many buyer identities → `history` pts) + TG/antseedmarkets presence to
    recruit a staker. Server-local tooling in `scripts/bootstrap-*.sh|mjs`;
    needs ~$110 USDC float (user-funded).

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

**Result (window T0 → T0+24h, closed 2026-10-17T20:06Z):** 48 requests (0
errors), 4,289,488 tokens (4.27M in / 17k out), 17 buyers, all free
`deepseek-v4-flash`, **$0 earned**. Cumulative since go-live: 70 requests /
6.62M tokens / 19 buyers; guardrails (10M tok, $2) never tripped; DeepSeek
balance $19.61/$20. Zero free→paid conversions → decision branch: **A′ + B**.

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
| `docs/probe-2026-10-18-external.md` | Operator's from-outside reachability probe (verdict: live) |

## Related services on this box

`cavedl-api`, `roarrumble`, `cavedl-tgbot`, `mintbot` (PM2). The former
**FactCheck** service was retired and replaced by `monitor/`.
