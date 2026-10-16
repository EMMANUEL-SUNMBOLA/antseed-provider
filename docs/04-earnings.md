# 04 — Earnings tracker

Target: **~$50/month net** (after DeepSeek credit + 4% protocol fee; VPS is sunk).

## Fixed facts

- Protocol take: 4% of every settle → you receive 96%.
- Upstream: DeepSeek pay-as-you-go (≈35–45% of revenue at competitive prices).
- ETH gas: funded once ($5 covers months).

## Ledger

| Date | Gross USDC (settled) | Net USDC (96%) | API spend est. | ETH gas | Net profit | Notes |
|---|---|---|---|---|---|---|
| — | | | | | | (snapshots start after go-live) |

## Daily snapshots

`scripts/snapshot-earnings.sh` appends one JSON line per day
(`data/earnings.jsonl` — git-ignored locally, pushed as a weekly summary
below). After each week, paste the roll-up here:

### Week of ____ (YYYY-MM-DD → ____)

- Gross settled: $
- Net to wallet: $
- Serves / requests:
- Tokens in/out:
- DeepSeek spend: $
- Notes:

## Targets by month

| Month | Gross target | Reality check |
|---|---|---|
| 1 | $0–30 | cold start, reputation 0 — learning, not earning |
| 2 | $30–100 | verified ✓, prices tuned, first agent live |
| 3+ | $80–150 | → ~$50 net if margins hold |

## Decision points

- **After week 2**: if 0 settlements → reprice harder / check presence in
  `network browse` from outside; consider free tier.
- **After month 1**: if gross < $10 → reassess: agent direction, more models,
  niche categories, or fold (max loss = $25).
- **After month 2**: if gross > $80 → consider Moonshot/Groq upstreams,
  second service lines, ANTS stake for reputation weight.
