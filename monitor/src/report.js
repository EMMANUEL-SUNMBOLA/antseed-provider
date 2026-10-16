// Message builders and problem evaluation shared by the command handlers and
// the background monitor.

import {
  getAntsStatus,
  getDeepseekHealth,
  getPeer,
  getPm2Status,
  getPorts,
  getSellerStatus,
  getUsdcBalance,
} from "./antseed.js";
import {
  lastServedTs,
  recentEvents,
  recentReceipts,
  todaySummary,
} from "./metering.js";
import { GAS_LOW_WEI, NO_SALES_WARN_HOURS, WALLET } from "./config.js";
import {
  escapeHtml,
  fmtDuration,
  fmtEth,
  fmtTokens,
  fmtUsd,
  fmtUtc,
  shortPeer,
} from "./format.js";

async function safe(promise, fallback = null) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

/** Gather everything once; any individual failure degrades to null. */
export async function gatherSnapshot() {
  const [seller, ants, peer, usdc, pm2, ports, ds] = await Promise.all([
    safe(getSellerStatus()),
    safe(getAntsStatus()),
    safe(getPeer()),
    safe(getUsdcBalance()),
    safe(getPm2Status(), { found: false, status: "error" }),
    safe(getPorts(), { udp6881: false, tcp6882: false }),
    safe(getDeepseekHealth(), { ok: false, reason: "error" }),
  ]);
  return { seller, ants, peer, usdc, pm2, ports, ds };
}

function ethWei(snapshot) {
  const eth = snapshot.ants?.wallet?.eth;
  return eth !== undefined && eth !== null ? BigInt(eth) : null;
}

export async function buildStatusMessage() {
  const s = await gatherSnapshot();
  const lines = ["<b>Antseed seller — status</b>", ""];

  const state = s.seller?.state ? s.seller.state.toUpperCase() : "UNKNOWN";
  lines.push(`State: <b>${escapeHtml(state)}</b>`);
  if (s.seller?.uptime) lines.push(`Uptime: ${escapeHtml(s.seller.uptime)}`);
  lines.push(
    `PM2: ${s.pm2?.found ? escapeHtml(s.pm2.status) : "missing"}` +
      (s.pm2?.found ? ` (↺${s.pm2.restarts})` : ""),
  );
  lines.push(
    `Ports: 6881/udp ${s.ports.udp6881 ? "OK" : "DOWN"} · 6882/tcp ${
      s.ports.tcp6882 ? "OK" : "DOWN"
    }`,
  );

  const agentId = s.seller?.onChain?.agentId;
  const eligible = s.seller?.onChain?.eligible;
  lines.push(
    `Agent: <code>${escapeHtml(s.seller?.onChain?.mode || "?")}</code>` +
      (s.seller?.onChain?.agentId ? ` #${s.seller.onChain.agentId}` : "") +
      ` · eligible: ${s.seller?.onChain?.eligible ? "yes" : "no"}`,
  );

  const load = s.peer?.peer?.metadata?.providers?.[0];
  if (load) {
    lines.push(
      `Load: ${load.currentLoad ?? 0} / ${load.maxConcurrency ?? "?"}`,
    );
  }

  const eth = ethWei(s);
  lines.push(
    `Balances: ${eth !== null ? fmtEth(eth) : "? ETH"}` +
      `${s.usdc !== null ? ` · ${fmtUsd(s.usdc)} USDC` : ""}`,
  );

  if (s.ds) {
    lines.push(
      `Upstream (DeepSeek): ${s.ds.ok ? "OK" : `DEGRADED${s.ds.status ? ` (${s.ds.status})` : ""}`}`,
    );
  }
  if (s.seller?.walletAddress) {
    lines.push("", `<code>${escapeHtml(s.seller.walletAddress)}</code>`);
  }
  return lines.join("\n");
}

export async function buildTodayMessage() {
  const [t, s] = await Promise.all([todaySummary(), gatherSnapshot()]);
  const eth = ethWei(s);
  return [
    `<b>Today (${new Date().toISOString().slice(0, 10)} UTC)</b>`,
    "",
    `Requests: <b>${t.requests}</b>  (✅ ${t.ok} · ❌ ${t.failed})`,
    `Tokens: ${fmtTokens(t.inputTokens)} in / ${fmtTokens(t.outputTokens)} out`,
    `Earned today: <b>${fmtUsd(t.costUsd)}</b> USDC`,
    `Free-tier uses: ${t.freeUses}`,
    `Unique buyers: ${t.buyers}`,
    "",
    `Wallet left: ${eth !== null ? fmtEth(eth) : "?"}` +
      `${s.usdc !== null ? ` · ${fmtUsd(s.usdc)} USDC` : ""}`,
  ].join("\n");
}

export async function buildBalanceMessage() {
  const s = await gatherSnapshot();
  const eth = ethWei(s);
  const ants = s.ants?.wallet?.ants;
  return [
    "<b>Wallet balances</b>",
    "",
    `ETH (Base, gas): ${eth !== null ? fmtEth(eth) : "?"}`,
    `USDC (Base): ${s.usdc !== null ? fmtUsd(s.usdc) : "?"}`,
    `${ants !== undefined ? `ANTS: ${Number(ants).toLocaleString()}` : ""}`,
    "",
    `<code>${WALLET}</code>`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function buildSalesMessage() {
  const [events, receipts] = await Promise.all([
    safe(recentEvents(10), []),
    safe(recentReceipts(10), []),
  ]);
  const lines = ["<b>Recent activity</b>", ""];
  if (events.length === 0) {
    lines.push("No requests served yet.");
  } else {
    lines.push("<b>Requests (newest first)</b>");
    for (const e of events) {
      const ok = e.status_code >= 200 && e.status_code < 300;
      lines.push(
        `${ok ? "✅" : "❌"} ${fmtUtc(e.timestamp)} · ${fmtTokens(e.total_tokens)} tok · ${e.latency_ms ?? "?"}ms · ${shortPeer(e.buyer_peer_id)}`,
      );
    }
  }
  if (receipts.length) {
    lines.push("", "<b>Receipts (newest first)</b>");
    for (const r of receipts) {
      lines.push(
        `💵 ${fmtUtc(r.timestamp)} · ${fmtUsd((r.cost_cents || 0) / 100)} · ${fmtTokens(r.total_tokens)} tok`,
      );
    }
  }
  return lines.join("\n");
}

/**
 * Evaluate current problems. Returns an array of
 * { key, level: 'critical'|'warn', text }.
 */
export async function evaluateProblems(snapshot = null) {
  const s = snapshot || (await gatherSnapshot());
  const problems = [];

  const sellerUp = s.pm2?.found && s.pm2.status === "online";
  if (!sellerUp) {
    problems.push({
      key: "seller_down",
      level: "critical",
      text: `Seller process is <b>${escapeHtml(s.pm2?.status || "unknown")}</b> (pm2 ${s.pm2?.found ? "not online" : "process missing"}).`,
    });
  }

  if (!s.ports?.udp6881 || !s.ports?.tcp6882) {
    problems.push({
      key: "ports_down",
      level: "critical",
      text: `Not listening: ${!s.ports?.udp6881 ? "6881/udp " : ""}${!s.ports?.tcp6882 ? "6882/tcp" : ""}. Buyers can't connect.`,
    });
  }

  const state = (s.seller?.state || "").toLowerCase();
  if (sellerUp && state && state !== "seeding" && state !== "online") {
    problems.push({
      key: "not_seeding",
      level: "warn",
      text: `Seller state is <b>${escapeHtml(state)}</b> (expected seeding).`,
    });
  }

  const eth = ethWei(s);
  if (eth !== null && eth < GAS_LOW_WEI) {
    problems.push({
      key: "gas_low",
      level: "critical",
      text: `Low gas: <b>${fmtEth(eth)}</b> on Base (advertising pauses below 0.00005).`,
    });
  }

  if (s.ds && s.ds.ok === false && s.ds.reason !== "error") {
    problems.push({
      key: "upstream",
      level: "critical",
      text: `DeepSeek upstream check failed${s.ds.status ? ` (HTTP ${s.ds.status})` : s.ds.reason ? ` (${escapeHtml(s.ds.reason)})` : ""}.`,
    });
  }

  // No served requests for a long time (only meaningful once the box is up).
  const servedTs = await safe(lastServedTs(), 0);
  const warnMs = NO_SALES_WARN_HOURS * 3600 * 1000;
  const uptimeMs = s.pm2?.uptimeMs || 0;
  if (sellerUp && servedTs && Date.now() - servedTs > warnMs) {
    problems.push({
      key: "no_sales",
      level: "warn",
      text: `No served requests for over <b>${NO_SALES_WARN_HOURS}h</b> (last activity ${fmtUtc(servedTs)}).`,
    });
  } else if (sellerUp && !servedTs && uptimeMs > warnMs) {
    problems.push({
      key: "no_sales",
      level: "warn",
      text: `Still no served requests after <b>${fmtDuration(uptimeMs)}</b> uptime.`,
    });
  }

  return problems;
}
