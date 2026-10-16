// Admin-only command handlers. Every message that is not from ADMIN_CHAT_ID is
// ignored entirely (no reply, no processing).

import { ADMIN_CHAT_ID } from "./config.js";
import { escapeHtml } from "./format.js";
import {
  buildBalanceMessage,
  buildSalesMessage,
  buildStatusMessage,
  buildTodayMessage,
  evaluateProblems,
} from "./report.js";

const HELP = [
  "<b>Antseed seller monitor</b>",
  "",
  "/status — live seller snapshot",
  "/today — today's usage & earnings",
  "/sales — recent requests and receipts",
  "/balance — ETH / USDC balances",
  "/problems — current issues",
  "/help — this message",
].join("\n");

export function isAdmin(msg) {
  if (!ADMIN_CHAT_ID) return false;
  const fromId = String(msg.from?.id ?? "");
  const chatId = String(msg.chat?.id ?? "");
  return fromId === ADMIN_CHAT_ID || chatId === ADMIN_CHAT_ID;
}

function safeSend(bot, text, options = {}) {
  return bot
    .sendMessage(ADMIN_CHAT_ID, text, { parse_mode: "HTML", ...options })
    .catch((error) => {
      console.error("sendMessage failed:", error.message);
    });
}

// FactCheck-style progress: post a placeholder, then replace it in place with the
// result so the chat stays tidy. cavedl-tgbot-style typing action while we work.
async function runWithLoading(bot, loadingLabel, fn) {
  bot.sendChatAction(ADMIN_CHAT_ID, "typing").catch(() => {});
  let placeholder = null;
  try {
    placeholder = await bot.sendMessage(ADMIN_CHAT_ID, loadingLabel, {
      parse_mode: "HTML",
    });
  } catch (error) {
    console.error("loading message failed:", error.message);
  }

  const deliver = async (text) => {
    if (!placeholder) return safeSend(bot, text);
    try {
      await bot.editMessageText(text, {
        chat_id: ADMIN_CHAT_ID,
        message_id: placeholder.message_id,
        parse_mode: "HTML",
      });
    } catch (error) {
      console.error("editMessageText failed:", error.message);
      await safeSend(bot, text);
    }
  };

  try {
    await deliver(await fn());
  } catch (error) {
    console.error("command failed:", error);
    await deliver(`⚠️ Command failed: <code>${escapeHtml(error.message)}</code>`);
  }
}

export function registerCommands(bot) {
  const handler = (fn, loadingLabel) => async (msg) => {
    if (!isAdmin(msg)) {
      console.log(`ignored message from chat ${msg.chat?.id} (not admin)`);
      return;
    }
    if (loadingLabel) return runWithLoading(bot, loadingLabel, fn);
    try {
      await safeSend(bot, await fn());
    } catch (error) {
      console.error("command failed:", error);
      await safeSend(
        bot,
        `⚠️ Command failed: <code>${escapeHtml(error.message)}</code>`,
      );
    }
  };

  bot.onText(/^\/(help|start)\b/, handler(async () => HELP));

  bot.onText(
    /^\/(status|antseed)\b/,
    handler(buildStatusMessage, "⏳ Checking seller status…"),
  );

  bot.onText(
    /^\/today\b/,
    handler(buildTodayMessage, "⏳ Crunching today's usage…"),
  );

  bot.onText(
    /^\/sales\b/,
    handler(buildSalesMessage, "⏳ Fetching recent activity…"),
  );

  bot.onText(
    /^\/balance\b/,
    handler(buildBalanceMessage, "⏳ Reading balances…"),
  );

  bot.onText(
    /^\/problems\b/,
    handler(async () => {
      const problems = await evaluateProblems();
      if (problems.length === 0) return "✅ No problems detected.";
      return [
        "<b>Problems</b>",
        "",
        ...problems.map(
          (p) => `${p.level === "critical" ? "🔴" : "🟠"} ${p.text}`,
        ),
      ].join("\n");
    }, "⏳ Running health checks…"),
  );

  bot.onText(
    /^\/id\b/,
    handler(async () => `Your chat id: <code>${ADMIN_CHAT_ID}</code>`),
  );
}
