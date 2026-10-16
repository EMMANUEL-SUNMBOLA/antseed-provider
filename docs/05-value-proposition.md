# 05 — Value proposition: what "add value" means here

## The rule (verbatim from the docs)

> "Antseed is for providers who build differentiated services: TEE-secured
> inference, domain-specific skills or agents, fine-tuned models, or managed
> products. Reselling raw API access or subscription credentials is not the
> intended use and may violate your upstream provider's terms."

Buyers also pay for **trust**: reputation, verification, latency, uptime —
so "value" is partly operational professionalism, not only clever packaging.

## What counts as value (platform-recognized options)

| Option | Mechanism | Our hardware? |
|---|---|---|
| **Ant agent** | `agent.json` persona + guardrails + private knowledge files + custom tools wrapped around a model via `seller.agentDir`. Buyers see one named service; your prompt engineering stays private; premium pricing | ✅ free, zero compute |
| **Niche categories** | services tagged `legal` / `finance` / `privacy` / `uncensored` / `coding` — less price pressure than commodity chat | ✅ free |
| **Verified identity** | DNS TXT + GitHub proofs → ✓ badge, feeds trust score | ✅ free |
| **Routing service** | router plugin picks best/cheapest/TEE-only upstream per request; earn per routed request | ✅ possible |
| **Free tier** | zero-priced service with `seller.freeTier` limits → on-chain usage records → early reputation | ✅ cheap (seller pays record gas) |
| **TEE attestation** | Intel TDX quote before payment | ❌ no TDX hardware |
| **Fine-tune / local model** | own weights served locally | ❌ no GPU |

## Our position (launch → month 2)

**Launch (phase C):** legitimate base layer — multi-model **DeepSeek proxy**
with honest capabilities, cached-input pricing, fast/uptime-verified presence.
This gets us into the network and earning while we build the differentiator.
Pure-proxiness is mitigated by immediately layering:

**Month 1 (phase D):**
1. **Ant agent #1** — direction TBD among:
   - (a) **coding assistant** persona — biggest category on the network,
     highest buyer volume, agents/tools capability in demand
   - (b) **privacy/uncensored** angle — small crowd, loyal, premium,
     matches Antseed's "privacy" positioning
   - (c) **finance/research niche** — least price war, best margins,
     needs real knowledge files to be honest value
2. **Verified identity** (domain TXT + GitHub) — cheap trust, hard to beat.
3. **Free tier** (e.g. 20 req/day on one flash model) to seed usage records —
   then convert those users to paid models.

## Why this fits a $7 box

Everything above is config + a few files — no GPU, no extra RAM. The machine's
job stays: run the seller process (≈200 MB) + existing microservices; the
model lives on DeepSeek's GPUs; our value = packaging, trust and routing.

## Honest risks

- DeepSeek upstream ToS must allow resale/API usage (verify before scale).
- If the network's price war pushes margins below ~20%, proxy alone never
  reaches $50 net → the agent/niche layer is the actual path to the target.
- ANTS rewards: currently locked emissions — do not count them in P&L.
