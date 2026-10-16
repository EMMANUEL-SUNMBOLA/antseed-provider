# 03 — Operations runbook

Node identity: `0x5473831A3142d912FdF88495e17c08b2a6fc37Ec`
Data dir: `~/.antseed/` (config.json, identity.key, metering.db, plugins/)
Env file: `/root/.antseed/.env` (git-ignored)

## Load environment

The CLI reads secrets from **process env only**. Always prefix seller commands:

```bash
set -a; source /root/.antseed/.env; set +a
```

## Start / stop / restart (PM2 — same as the other services on this box)

```bash
set -a; source /root/.antseed/.env; set +a
pm2 start --name antseed-seller --kill-timeout 10000 -- antseed seller start
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

```bash
sudo ufw allow 6881/udp
sudo ufw allow 6882/tcp
sudo ufw status
```

**Warning:** ufw on a shared box — check existing rules first and only ADD;
never reset. Port 22/80/443 must stay open (nginx, ssh).

## After any config change

```bash
antseed config seller show          # view current config.json seller section
pm2 restart antseed-seller          # claims/verifications require restart
```

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

## Snapshot / monitoring cron

```bash
crontab -e
# daily earnings snapshot at 00:05 UTC
5 0 * * * /root/workspace/antseed-provider/scripts/snapshot-earnings.sh >> /root/workspace/antseed-provider/data/earnings.jsonl 2>&1
```
