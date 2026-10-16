#!/usr/bin/env bash
# All-in-one node health check: env, ports, gas, DNS, doctor.
set -uo pipefail

WALLET="0x5473831A3142d912FdF88495e17c08b2a6fc37Ec"
PEER="5473831A3142d912FdF88495e17c08b2a6fc37Ec"
DOMAIN="ant.cavedl.xyz"

[ -f /root/.antseed/.env ] && { set -a; source /root/.antseed/.env; set +a; }

echo "== seller status =="
antseed seller status 2>&1 | sed -n '1,40p'

echo
echo "== listening ports (6881/udp 6882/tcp) =="
ss -ulnp 2>/dev/null | grep -q ':6881 ' && echo "6881/udp  OK" || echo "6881/udp  NOT LISTENING"
ss -tlnp 2>/dev/null | grep -q ':6882 ' && echo "6882/tcp  OK" || echo "6882/tcp  NOT LISTENING"

echo
echo "== DNS =="
echo -n "$DOMAIN A: " ; dig +short A "$DOMAIN" | tr '\n' ' ' ; echo
echo -n "TXT _antseed.ant.cavedl.xyz: " ; dig +short TXT "_antseed.ant.cavedl.xyz" | tr '\n' ' ' ; echo

echo
echo "== doctor =="
antseed seller doctor 2>&1 | tail -20

echo
echo "== external-style presence =="
antseed network peer "$PEER" 2>&1 | head -30
