# 01 — Plan

Goal: **~$50/month net** from an Antseed provider running on an already-paid
$7/mo VPS, without disturbing the existing microservices (PM2 bots, nginx).

## Constraints (decided)

- **No local models**: 6 GB RAM, no GPU — proxy upstream APIs instead.
- **No TEE**: no Intel TDX on this box (phase 2+ consideration).
- Upstream: **DeepSeek official API only** for launch (highest network demand,
  cheapest legit source for the top-selling models).
- Value-add layer: ant agent(s) + niche categories + verified identity
  + optional free tier (see 05).
- Budget at risk: **$25** ($5 Base ETH + $20 DeepSeek credit; VPS sunk).

## Machine fit

| Resource | State | Verdict |
|---|---|---|
| CPU | Xeon Gold 6138, 80 threads, load ~14 | plenty (seller uses almost nothing) |
| RAM | 6 GB, ~4.9 GB free, **no swap** | seller ≈ 150–250 MB — OK, monitor |
| Ports | 6881/udp + 6882/tcp free | OK, will open via ufw |
| Network | public IPv4 104.237.11.135, datacenter | ideal (no NAT) |
| OS | Ubuntu 24.04, Node 24 | matches docs |

## Phases

### A. Identity & repo (done → in progress)
1. Install `@antseed/cli` ✅ (2026-10-16)
2. Create identity ✅ → wallet `0x5473831A3142d912FdF88495e17c08b2a6fc37Ec`
3. This repo with `.env.example` containing the funding address ✅
4. Push to GitHub so the operator can copy the address from there

### B. Operator funding (human)
5. Operator funds **$5 of ETH on Base mainnet** to the wallet above → says "funded"
6. Operator buys **$20 DeepSeek credit**, builds `/root/.antseed/.env` from
   `.env.example`, `scp`s it to the VPS → says "key landed"

### C. Registration & network (after B)
7. `antseed seller register` → status "Seller eligible"
8. Hostinger DNS (operator adds; values in 02-setup-log):
   - A  `ant` → 104.237.11.135 (TTL 3600)
   - TXT `_antseed.ant` → `antseed-peer=5473831A3142d912FdF88495e17c08b2a6fc37Ec` (TTL 3600)
9. Configure provider: plugin `openai`, base-url `https://api.deepseek.com`,
   `apiKeyEnv DEEPSEEK_API_KEY` + 2–3 flash-class services with correct
   capabilities/categories
10. `ufw allow 6881/udp && ufw allow 6882/tcp`, set
    `publicAddress "ant.cavedl.xyz:6882"`, run `seller doctor` + external
    `network peer` check
11. Domain claim (`dns-txt`) + GitHub claim → ✓ badges
12. Start seller under PM2 (survives reboots), env loaded from `/root/.antseed/.env`

### D. Value layer (after C is live)
13. First ant agent (direction pending: coding / privacy / niche)
14. Optional free tier (e.g. 20 req/day one model) to seed reputation
15. Verified GitHub identity definitely; domain ✓ from step 11

### E. Operate
16. Daily earnings snapshot cron (`scripts/snapshot-earnings.sh`)
17. Weekly price tune: `antseed network browse` → undercut cheapest *verified*
    seller by 10–15% on high-demand models; never price below upstream cost
18. Monthly P&L in 04-earnings.md

## Pricing rules

1. **Margin floor**: price ≥ (upstream cost × 1.35) at minimum — the 4% fee
   plus gas come out of that.
2. **Competitiveness**: buyers pick the cheapest trusted seller → being 2nd
   cheapest with 70+ reputation beats being cheapest with 0 reputation, but
   being expensive = zero traffic. Tune weekly.
3. Always set `cachedInputUsdPerMillion` (≈10% of input) — offers without it
   get **half trust score** once any competitor advertises one.
4. Set accurate `capabilities` (context window, toolUse, reasoning) — buyers
   filter on these.

## Definition of done (month 1)

- [ ] Seller visible in `antseed network browse` from an external network
- [ ] Domain + GitHub ✓ claims visible
- [ ] First USDC settlement received (any amount)
- [ ] 7 days of earnings snapshots collected
- [ ] ≥ 3 models priced competitively
- [ ] Verdict on agent direction + free tier
