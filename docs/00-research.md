# 00 — Research: the Antseed network (Oct 2026)

Sources: antseed.com/docs, antseedstats.com (community, on-chain), captured 2026-10-16.

## What it is

- P2P marketplace for AI inference; no company in the middle.
- Buyers sign capped payment channels on **Base**; sellers settle USDC on-chain.
- Protocol fee **4%** → seller keeps **96%**.
- Sellers announce services/prices on a DHT; buyers pick cheapest seller above
  a trust threshold (reputation, verified claims, latency, uptime).
- Raised $2.4M led by Spark Capital. ~2026 launch, active on-chain.

## Network size (live at capture)

| Metric | Value |
|---|---|
| Gross settled (all-time) | ~$315k over 602,796 settles |
| Net to sellers | ~$303k |
| Sellers (settled) | 227 |
| Buyers | 1,252 |
| Services / peers online | 1,635 services / ~58 peers on DHT |
| Avg settle | $0.52 |
| Median saving vs list price | **−54%** (cheapest offers −99%) |

## Top sellers (all-time gross)

| Seller | Total | 7-day |
|---|---|---|
| CatGPT | $52.9k | — |
| Flash | $50.3k | — |
| Dark Signal | $16.5k | — |
| StrataCode | $14.5k | — |
| ▲ Apex Ant | $6.7k | $1.46k (recent ≈ $341/day) |
| GesundAI | $1.7k | $698/wk |

Long tail: ~150 of 227 sellers have earned **<$5/week**; median seller earns
close to zero. Top ~10–15 sellers capture most volume.

## Where demand is

Highest-volume models on the network: **DeepSeek V4 Flash**, **Kimi K3**
(by tokens and users). Categories with less price pressure: `legal`, `medical`,
`finance`, `uncensored`, `privacy` (e.g. Auralis medical/legal sellers each
~$7k all-time at premium pricing).

## Cost to run (three tiers)

| Path | Requirement | Notes |
|---|---|---|
| Proxy upstream API | any VPS, public IP, ports 6881/6882, Node 20+ | cheapest; upstream API = real cost |
| Local models | GPU (24GB+ VRAM) | no GPU on our box — ruled out |
| TEE seller | genuine Intel TDX VM (e.g. GCP c3), root | not available on our bare metal — ruled out (for now) |

## Earnings math for us

- $50/mo **gross** ≈ $11.50/wk ≈ top-15 finish among 227 sellers → plausible
  with competitive pricing + verification within 1–2 months.
- $50/mo **net** needs ~$90 gross (API cost ≈ 35–45% of revenue + 4% fee)
  ≈ top-10 territory → ambitious, not guaranteed.
- Cold start: reputation starts at 0 → expect **$0–10 in month 1**,
  $10–50 in month 2 if prices are tuned weekly.

## Key rules from the docs

- **"Add value, don't resell access"** — pure pass-through reselling of raw
  API access is not the intended use and may violate upstream ToS. Value =
  TEE, agents, fine-tunes, routing, niche expertise (see 05).
- Subscription-credential plugins (`claude-code`, etc.) are test-only.
- Restricted buyer countries by default: CU, IR, KP, SY, RU.
- Provider-side ANTS token emissions are currently **tracked but locked**
  (anti-wash-trading validation pending) → treat ANTS as speculative upside,
  USDC as real income.
- Staking ANTS is optional; it adds rewards + stake-weighted reputation.
- Free services must be metered on-chain (seller pays gas) — cheap way to
  farm early usage if freeTier limits are set.
