# antseed-provider

Running an [Antseed](https://antseed.com) provider (seller) on a shared VPS — full
research, plan, setup log, operations runbook and earnings tracking, documented
as we go.

> **Antseed** is a peer-to-peer marketplace for AI inference. Buyers pay per
> request through payment channels on **Base**; sellers earn **USDC** (96% —
> the protocol takes 4%). Docs: https://antseed.com/docs/provide

## Live node

**Status: live** — registered on-chain, seeding on the DHT, advertising a premium
`code-review` agent + a free `deepseek-v4-flash` tier.

| | |
|---|---|
| Wallet / peer ID | `0x5473831A3142d912FdF88495e17c08b2a6fc37Ec` |
| Agent ID (ERC-8004) | `157681` |
| Public endpoint | `ant.cavedl.xyz:6882` (TCP 6882, UDP 6881 DHT) |
| Domain claims | `ant.cavedl.xyz` (DNS TXT), GitHub (`antseed.json`) |
| Upstream | DeepSeek official API (`https://api.deepseek.com`) |
| Services | `code-review` $0.80/$0.08c/$2.00 per 1M · `deepseek-v4-flash` free |
| VPS | Ubuntu 24.04, Xeon Gold 6138 (80t), 6 GB RAM, no GPU — shared with other services |
| Target | ~$50/month net after upstream costs |

## Budget (month 1)

| Item | Amount | Status |
|---|---|---|
| VPS (shared, already running other services) | marginal | paid |
| ETH on Base (gas) | $5 | funded (`0.00208424 ETH`) |
| DeepSeek API credit | $20 | platform.deepseek.com |

## Documentation map

| File | What it is |
|---|---|
| [docs/00-research.md](docs/00-research.md) | Network research: size, leaderboards, earnings reality |
| [docs/01-plan.md](docs/01-plan.md) | Strategy, phases, pricing rules, $50/mo math |
| [docs/02-setup-log.md](docs/02-setup-log.md) | Chronological setup log (commands + outputs) |
| [docs/03-operations.md](docs/03-operations.md) | Runbook: start/stop, gas, ports, monitoring, troubleshooting |
| [docs/04-earnings.md](docs/04-earnings.md) | P&L tracker + daily snapshot history |
| [docs/05-value-proposition.md](docs/05-value-proposition.md) | What "add value" means and how we do it |
| [agents/code-review/](agents/code-review/) | The `code-review` agent (manifest, persona, knowledge modules) |
| [config.example.json](config.example.json) | Seller config template (no secrets; `apiKeyEnv` refers to `.env`) |
| [antseed.json](antseed.json) | GitHub ownership-proof file (peer ID ↔ username) |
| [.env.example](.env.example) | **Funding address + env var format** |

## Security rules (non-negotiable)

1. `~/.antseed/identity.key` **is the wallet**. Never copy it into this repo,
   never commit it, never paste it in chat/logs.
2. Real credentials live only in `/root/.antseed/.env` (git-ignored) or env vars.
3. `config.json` may reference env var *names* (`apiKeyEnv`) but never key values.
4. This repo is **public** — assume everything in it is world-readable.

## Quick reference

```bash
# load env
set -a; source /root/.antseed/.env; set +a

# status / earnings
antseed seller status
antseed seller status --json

# health
antseed seller doctor
bash scripts/check-node.sh

# network presence
antseed network browse
antseed network peer 5473831A3142d912FdF88495e17c08b2a6fc37Ec
```
