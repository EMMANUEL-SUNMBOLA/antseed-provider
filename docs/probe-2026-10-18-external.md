ANTSEED SELLER PROBE — ant.cavedl.xyz:6882
==========================================
Date: Sun 18 Oct 2026, ~01:05–01:15 UTC
Probed from: external network (not the VPS itself) — laptop behind NAT,
path via Cogent (cogentco.com), ~140 ms RTT
Target IP: 104.237.11.135

VERDICT: LIVE AND HEALTHY. Ports, DNS claim, metadata freshness,
service catalog, and DHT presence all check out — buyers on other
networks can reach this seller right now.


1. DNS
------
A       ant.cavedl.xyz                  -> 104.237.11.135            OK
TXT     _antseed.ant.cavedl.xyz         -> antseed-peer=5473831A3142
                                           d912FdF88495e17c08b2a6fc37Ec
                                               OK — matches wallet/peer ID


2. TCP 6882 (buyer connections) — OPEN, SELLER RESPONDING
----------------------------------------------------------
- nc -zv: "Connection ... 6882 port [tcp/*] succeeded!"
- Connect latency ~0.27 s (connect=0.269..0.288 s over 3 runs,
  total HTTP round trip ~0.53..0.58 s).
- Server speaks plain HTTP (NOT TLS): openssl s_client on 6882 does
  not complete a handshake ("unexpected eof", 0 bytes read).
- GET /metadata -> HTTP 200 OK, Content-Type: application/json,
  Content-Length: 1350. THIS IS THE ONLY PUBLICLY SERVED PATH.
- Any other path (/, /health, /healthz, /status, /v1/models, /models,
  /api, /info, /peer, /doctor, /metrics, /rpc, /invoke, /call,
  /seller, /service, /services, /list, /query, /antseed,
  /.well-known/antseed, /robots.txt, /favicon.ico, /graphql,
  /openapi, /v1, /v1/chat/completions, /ping, /echo, /version,
  /api/v1/*, /chat, /completions, /v1/completions, ...) ->
  404 {"error":"not found"} (application/json, 21 bytes).
- HEAD / -> 404 with same JSON body.
- HTTP/1.0 GET / -> still 404 JSON (server handles 1.0 fine).
- POST / and OPTIONS / -> "Empty reply from server" (connection
  closed without response — consistent with the Antseed framing
  server, which only accepts the signed JSON `intro` handshake line
  on non-HTTP traffic).
- Non-HTTP data (raw "HELLO" line) -> connection closed, no reply.
- Sending fake/unsigned `intro` handshake lines ({"type":"intro"}
  with bogus sigs, valid-looking ts/nonce) -> empty reply, no
  error message leaked. Fails closed as documented.

2a. /metadata contents (two samples, 01:09:38 and 01:14:31 UTC)
    - peerId:        5473831a3142d912fdf88495e17c08b2a6fc37ec
    - version:       12 (current; buyers accept 10..12)
    - displayName:   "CaveDL Code Review"
    - publicAddress: "ant.cavedl.xyz:6882"  (correctly announced)
    - providers[0]:
        provider: openai
        services: ["code-review", "deepseek-v4-flash"]
        defaultPricing:  input 10 / output 10 USD per Mtok
        servicePricing:
            code-review:        input 0.8 / cached 0.08 / output 2
            deepseek-v4-flash:  input 0 / cached 0 / output 0  (free)
        serviceCategories:
            code-review:        [coding, code-review]
            deepseek-v4-flash:  [chat, coding]
        serviceApiProtocols:    both "openai-chat-completions"
        maxConcurrency: 50,  currentLoad: 0
    - capabilities:
        verification.response-auth.v1
        payments.cooperative-close.v1
        transport.signed-sdp.v1
        transport.tcp-enc.v1
        payments.relays-sweeps.v1
        transport.webrtc.v1
        seller.model-health.v1
    - region: "unknown"
    - timestamp age: 74.7 s (sample 1), 277.3 s (sample 2)
      -> within the 5-minute re-announce interval; metadata FRESH
    - verifications:
        domains: [{ant.cavedl.xyz, methods:[dns-txt]}]
        github:  [{user emmanuel-sunmbola, repo antseed-provider}]
    - onChainChannelCount: 0, onChainGhostCount: 0
      (brand new node, no payment channels yet — expected)
    - signature: 130 hex chars present (136-char field checked,
      structure matches spec; not independently recovered here)


3. UDP 6881 (BitTorrent-style DHT) — OPEN, RESPONDING
------------------------------------------------------
- ping                -> reply from 104.237.11.135:6881,
                         node id d7dd22ae32ace1c2262886b51a2328fa9a4781b0
- find_node (random target, eth-addr-like 20-byte id)
                      -> reply, 713 nodes in routing table
                         (well-peered — this node IS part of the DHT)
- find_node with target SHA1("antseed:*")
                      -> reply with 713 compact nodes
- get_peers WITHOUT info_hash (used `target` key)
                      -> structured protocol error:
                         [203, "`get_peers` missing required `a.info_hash` field"]
                         (server validates request schema strictly)
- get_peers WITH a.info_hash = SHA1("antseed:*")
                    -> no reply (timeout, 6 s then 10 s then 25 s)
- get_peers with info_hash = SHA1("antseed:peer:5473831a…")
                      -> no reply (timeout 10 s / 25 s)
  Interpretation: the node answers ping/find_node and rejects
  malformed queries, but appears selective about answering
  get_peers from an unknown foreign node id. NOT a red flag by
  itself (real buyers join via Antseed bootstrap nodes
  dht1/dht2.antseed.com:6881 and are treated differently), but
  worth watching: if the seller later does not show up in
  `antseed network browse`, this selective get_peers behaviour is
  the first suspect.


4. SIDE FINDINGS (non-blocking)
--------------------------------
a) Port 443 / HTTPS on ant.cavedl.xyz:
   - TLS handshake succeeds (TLSv1.3, TLS_AES_256_GCM_SHA384,
     ALPN http/1.1) BUT certificate CN=cavedl.xyz, SAN only:
       DNS:api.cavedl.xyz, DNS:cavedl.xyz, DNS:www.cavedl.xyz
     -> "subjectAltName does not match ant.cavedl.xyz"
     -> curl fails with SSL error (HTTP 000), no body.
   - Irrelevant to the seller (metadata is fetched over plain
     HTTP on :6882), but fix the SAN if anything user-facing is
     ever served on https://ant.*.
   - Cert validity: notBefore Oct 13 2026, notAfter Jan 11 2027,
     issuer Let's Encrypt (YE1).

b) Port 80: nginx/1.24.0 (Ubuntu) responds, every path 404
   (nginx default server block, no vhost for ant.cavedl.xyz).
   Not used by the Antseed protocol.

c) https://cavedl.xyz/.well-known/antseed.json -> 200 but returns
   the SPA HTML shell (<!doctype html> ... caveDL3.svg), not the
   Antseed verification JSON. Harmless — the domain claim is proven
   via the DNS TXT record, which works. If HTTPS-based domain proof
   is ever wanted, serve the real file.

d) GitHub claim: https://github.com/EMMANUEL-SUNMBOLA/antseed-provider
   exists, public, default branch main, updated 2026-10-16.
   (GitHub is case-insensitive; metadata says emmanuel-sunmbola —
   matches.)

e) antseed CLI is NOT installed on this laptop (only on the VPS);
   probes above were done with curl/nc/openssl/python (manual DHT
   bencode) + docs at antseed.com/docs.


5. WHAT WAS COMPARED AGAINST (protocol docs)
--------------------------------------------
- https://antseed.com/docs/provide/  — seller setup, doctor,
  ports 6881/udp + 6882/tcp, publicAddress
- https://antseed.com/docs/transport/ — signed JSON `intro`
  handshake, 8 KiB / 10 s limits, frame format, 402/payment flow
- https://antseed.com/docs/discovery/ — DHT topic hashing
  (antseed:* / antseed:subnet:N / antseed:peer:<hex>), GET
  /metadata endpoint, PeerMetadata schema versions 10..12
- npm: @antseed/node 0.2.146, @antseed/cli 0.1.195 (latest)


6. ACTION ITEMS
---------------
[x] DNS A + TXT correct and matching wallet
[x] TCP 6882 reachable from external network
[x] /metadata served, fresh (<=5 min old), correct publicAddress,
    correct services/prices, version 12
[x] UDP 6881 DHT alive, node in routing tables (713 nodes)
[ ] Optional: add ant.cavedl.xyz to the 443 cert SAN
[ ] Optional: serve real /.well-known/antseed.json on cavedl.xyz
[ ] Optional: verify end-to-end buyer path once with
    `antseed network browse` / `antseed network peer 5473831A3142d912FdF88495e17c08b2a6fc37Ec`
    from a machine with the CLI (this probe could not run it)
[ ] Watch: get_peers selectivity (see section 3) if the seller
    fails to appear in network browse
