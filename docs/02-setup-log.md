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

## NEXT STEPS (executed in order)

- [ ] Push repo to GitHub
- [ ] Operator adds DNS records above (verify with dig)
- [ ] Operator funds $5 ETH on Base → confirm with `antseed seller status`
- [ ] `antseed seller register` → expect "Seller eligible: true"
- [ ] Operator scp `/root/.antseed/.env` with real DeepSeek key
- [ ] Configure provider + services (Phase C step 9)
- [ ] ufw + publicAddress + doctor + external peer check
- [ ] Domain/GitHub claims
- [ ] PM2 start + first `network browse` sighting
