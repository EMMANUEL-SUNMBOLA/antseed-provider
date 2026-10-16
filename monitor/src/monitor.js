// Background monitor: periodic health checks with alert/recovery transitions,
// per-activity sales/failure pushes, anomaly detection, and a daily overview.

import {
  ACTIVITY_INTERVAL_MS,
  ANOMALY_REQUESTS_PER_HOUR,
  CHECK_INTERVAL_MS,
  ADMIN_CHAT_ID,
  SALES_ALERTS,
} from "./config.js";
import {
  eventsAfter,
  receiptsAfter,
  rangeSummary,
  yesterdaySummary,
} from "./metering.js";
import { gatherSnapshot, evaluateProblems } from "./report.js";
import { escapeHtml, fmtTokens, fmtUsd, fmtUtc } from "./format.js";
import { getState, saveState } from "./store.js";

const ANOMALY_COOLDOWN_MS = 60 * 60 * 1000;

let botRef = null;
async function notify(text) {
  if (!botRef) return;
  try {
    await botRef.sendMessage(ADMIN_CHAT_ID, text, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } catch (error) {
    console.error("notify failed:", error.message);
  }
}

async function checkProblems() {
  const snapshot = await gatherSnapshot();
  const problems = await evaluateProblems(snapshot);
  const state = getState();
  const currentKeys = new Set(problems.map((p) => p.key));

  // New problems -> alert.
  const fresh = problems.filter(
    (p) => !state.activeProblems.includes(p.key),
  );
  if (fresh.length > 0) {
    const header =
      fresh.some((p) => p.level === "critical")
        ? "🚨 <b>Antseed problem</b>"
        : "⚠️ <b>Antseed warning</b>";
    await notify(
      [header, "", ...fresh.map((p) => `• ${p.text}`)].join("\n"),
    );
  }

  // Resolved problems -> recovery notice.
  const resolved = state.activeProblems.filter((k) => !currentKeys.has(k));
  if (resolved.length > 0) {
    await notify(
      `✅ <b>Recovered</b>\n\n${resolved.map((k) => `• ${escapeHtml(k)}`).join("\n")}`,
    );
  }

  state.activeProblems = [...currentKeys];
  saveState();
}

async function checkAnomaly() {
  const now = Date.now();
  const recent = await rangeSummary(now - 60 * 60 * 1000, now);
  if (recent.requests > ANOMALY_REQUESTS_PER_HOUR) {
    const state = getState();
    const last = state.lastAlertAt?.anomaly || 0;
    if (now - last > ANOMALY_COOLDOWN_MS) {
      await notify(
        `📈 <b>Traffic spike</b>\n\n${recent.requests} requests in the last hour (threshold ${ANOMALY_REQUESTS_PER_HOUR}).\nTokens: ${fmtTokens(recent.inputTokens + recent.outputTokens)} · earned ${fmtUsd(recent.costUsd)}`,
      );
      state.lastAlertAt = { ...(state.lastAlertAt || {}), anomaly: now };
      saveState();
    }
  }
}

async function checkActivity() {
  if (!SALES_ALERTS) return;
  const state = getState();
  const events = await eventsAfter(state.lastEventTs, 50);
  const receipts = await receiptsAfter(state.lastReceiptTs, 50);
  if (events.length === 0 && receipts.length === 0) return;

  const ok = events.filter(
    (e) => e.status_code >= 200 && e.status_code < 300,
  );
  const failed = events.filter(
    (e) => !(e.status_code >= 200 && e.status_code < 300),
  );
  const earned = receipts.reduce((sum, r) => sum + (r.cost_cents || 0), 0) / 100;
  const tokens = events.reduce((sum, e) => sum + (e.total_tokens || 0), 0);

  const lines = ["🔔 <b>Antseed activity</b>", ""];
  if (ok.length) lines.push(`✅ ${ok.length} request(s) served`);
  if (failed.length) {
    lines.push(`❌ ${failed.length} failed`);
    for (const f of failed.slice(0, 5)) {
      lines.push(`   • HTTP ${f.status_code} at ${fmtUtc(f.timestamp)}`);
    }
  }
  if (tokens) lines.push(`Tokens: ${fmtTokens(tokens)}`);
  if (earned) lines.push(`Earned: <b>${fmtUsd(earned)}</b> USDC`);
  await notify(lines.join("\n"));

  const maxEventTs = events.reduce(
    (m, e) => Math.max(m, e.timestamp || 0),
    state.lastEventTs,
  );
  const maxReceiptTs = receipts.reduce(
    (m, r) => Math.max(m, r.timestamp || 0),
    state.lastReceiptTs,
  );
  state.lastEventTs = maxEventTs;
  state.lastReceiptTs = maxReceiptTs;
  saveState();
}

async function runDailyReport() {
  const day = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const state = getState();
  if (state.lastDailyDate === day) return;
  const t = await yesterdaySummary();
  const s = await gatherSnapshot();
  const eth = s.ants?.wallet?.eth;
  const lines = [
    `📊 <b>Daily overview — ${day} UTC</b>`,
    "",
    `Requests: <b>${t.requests}</b>  (✅ ${t.ok} · ❌ ${t.failed})`,
    `Tokens: ${fmtTokens(t.inputTokens)} in / ${fmtTokens(t.outputTokens)} out`,
    `Earned: <b>${fmtUsd(t.costUsd)}</b> USDC`,
    `Free-tier uses: ${t.freeUses}`,
    `Unique buyers: ${t.buyers}`,
    "",
    `ETH left: ${eth !== undefined ? (Number(eth) / 1e18).toFixed(6) + " ETH" : "?"}`,
    `USDC left: ${s.usdc !== null ? fmtUsd(s.usdc) : "?"}`,
  ];
  await notify(lines.join("\n"));
  state.lastDailyDate = day;
  saveState();
}

let dailyTimer = null;
function scheduleDaily() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(0, 5, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  dailyTimer = setTimeout(async () => {
    await runDailyReport().catch((e) => console.error("daily report:", e));
    scheduleDaily();
  }, next.getTime() - now.getTime());
  dailyTimer.unref?.();
}

async function tick() {
  await checkProblems().catch((e) => console.error("problems:", e));
  await checkAnomaly().catch((e) => console.error("anomaly:", e));
}

async function activityTick() {
  await checkActivity().catch((e) => console.error("activity:", e));
}

export function startMonitor(bot) {
  botRef = bot;
  process.on("SIGINT", () => dailyTimer && clearTimeout(dailyTimer));
  process.on("SIGTERM", () => dailyTimer && clearTimeout(dailyTimer));
  // Prime the activity watermark so a restart doesn't replay old rows.
  const state = getState();
  if (!state.lastEventTs) state.lastEventTs = Date.now();
  if (!state.lastReceiptTs) state.lastReceiptTs = Date.now();
  saveState();

  tick();
  setInterval(tick, CHECK_INTERVAL_MS).unref?.();
  setInterval(activityTick, ACTIVITY_INTERVAL_MS).unref?.();
  scheduleDaily();
}

export { runDailyReport, tick };
