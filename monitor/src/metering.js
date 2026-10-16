// Read-only queries against the seller's metering.db (SQLite). Uses the sqlite3
// CLI in JSON mode so there is no native module to build. Timestamps in the DB
// are epoch milliseconds.

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { METERING_DB, SQLITE_BIN } from "./config.js";

const execFileAsync = promisify(execFile);
const DB_URI = `file:${METERING_DB}?mode=ro`;

async function sqlJson(query) {
  const { stdout } = await execFileAsync(
    SQLITE_BIN,
    ["-json", DB_URI, query],
    { timeout: 15000, maxBuffer: 16 * 1024 * 1024 },
  );
  const text = stdout.trim();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export function startOfUtcDay(offsetDays = 0, now = Date.now()) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.getTime();
}

/** Aggregate one time window [startMs, endMs). */
export async function rangeSummary(startMs, endMs) {
  const events = await sqlJson(
    `SELECT
       COUNT(*) AS requests,
       SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) AS ok,
       SUM(CASE WHEN status_code < 200 OR status_code >= 300 THEN 1 ELSE 0 END) AS failed,
       COALESCE(SUM(input_tokens),0) AS input_tokens,
       COALESCE(SUM(output_tokens),0) AS output_tokens,
       COUNT(DISTINCT buyer_peer_id) AS buyers
     FROM metering_events
     WHERE timestamp >= ${startMs} AND timestamp < ${endMs}`,
  );
  const receipts = await sqlJson(
    `SELECT COALESCE(SUM(cost_cents),0) AS cost_cents,
            COUNT(*) AS receipt_count
     FROM usage_receipts
     WHERE timestamp >= ${startMs} AND timestamp < ${endMs}`,
  );
  const free = await sqlJson(
    `SELECT COUNT(*) AS free_uses
     FROM free_tier_usage
     WHERE timestamp >= ${startMs} AND timestamp < ${endMs}`,
  );
  const e = events[0] || {};
  const r = receipts[0] || {};
  return {
    requests: e.requests || 0,
    ok: e.ok || 0,
    failed: e.failed || 0,
    inputTokens: e.input_tokens || 0,
    outputTokens: e.output_tokens || 0,
    buyers: e.buyers || 0,
    costCents: r.cost_cents || 0,
    costUsd: (r.cost_cents || 0) / 100,
    receipts: r.receipt_count || 0,
    freeUses: free[0]?.free_uses || 0,
  };
}

export function todaySummary(now = Date.now()) {
  return rangeSummary(startOfUtcDay(0, now), now);
}

export function yesterdaySummary(now = Date.now()) {
  return rangeSummary(startOfUtcDay(-1, now), startOfUtcDay(0, now));
}

/** Per-day totals for the last `days` UTC days (oldest first). */
export async function daySeries(days = 7, now = Date.now()) {
  const start = startOfUtcDay(-(days - 1), now);
  const rows = await sqlJson(
    `SELECT date(timestamp/1000, 'unixepoch') AS day,
            COUNT(*) AS requests,
            SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) AS ok,
            COALESCE(SUM(total_tokens),0) AS tokens
     FROM metering_events
     WHERE timestamp >= ${start}
     GROUP BY day ORDER BY day ASC`,
  );
  const costs = await sqlJson(
    `SELECT date(timestamp/1000, 'unixepoch') AS day,
            COALESCE(SUM(cost_cents),0) AS cost_cents
     FROM usage_receipts
     WHERE timestamp >= ${start}
     GROUP BY day ORDER BY day ASC`,
  );
  const costByDay = new Map(costs.map((c) => [c.day, c.cost_cents]));
  return rows.map((r) => ({
    day: r.day,
    requests: r.requests,
    ok: r.ok || 0,
    failed: (r.requests || 0) - (r.ok || 0),
    tokens: r.tokens || 0,
    costUsd: (costByDay.get(r.day) || 0) / 100,
  }));
}

export async function recentEvents(limit = 10) {
  return sqlJson(
    `SELECT timestamp, provider, status_code, input_tokens, output_tokens,
            total_tokens, latency_ms, buyer_peer_id
     FROM metering_events
     ORDER BY timestamp DESC LIMIT ${Number(limit)}`,
  );
}

export async function recentReceipts(limit = 10) {
  return sqlJson(
    `SELECT timestamp, provider, total_tokens, cost_cents, buyer_peer_id
     FROM usage_receipts
     ORDER BY timestamp DESC LIMIT ${Number(limit)}`,
  );
}

/** New events strictly after `sinceMs`, oldest first (for activity alerts). */
export async function eventsAfter(sinceMs, limit = 50) {
  return sqlJson(
    `SELECT timestamp, provider, status_code, total_tokens, latency_ms,
            buyer_peer_id
     FROM metering_events
     WHERE timestamp > ${Number(sinceMs)}
     ORDER BY timestamp ASC LIMIT ${Number(limit)}`,
  );
}

export async function receiptsAfter(sinceMs, limit = 50) {
  return sqlJson(
    `SELECT timestamp, total_tokens, cost_cents, buyer_peer_id
     FROM usage_receipts
     WHERE timestamp > ${Number(sinceMs)}
     ORDER BY timestamp ASC LIMIT ${Number(limit)}`,
  );
}

export async function lastEventTs() {
  const rows = await sqlJson(
    "SELECT COALESCE(MAX(timestamp),0) AS ts FROM metering_events",
  );
  return rows[0]?.ts || 0;
}

export async function lastReceiptTs() {
  const rows = await sqlJson(
    "SELECT COALESCE(MAX(timestamp),0) AS ts FROM usage_receipts",
  );
  return rows[0]?.ts || 0;
}

export async function lastServedTs() {
  const rows = await sqlJson(
    `SELECT COALESCE(MAX(timestamp),0) AS ts FROM metering_events
     WHERE status_code >= 200 AND status_code < 300`,
  );
  return rows[0]?.ts || 0;
}
