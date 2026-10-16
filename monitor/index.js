// antseed-monitor — admin-only Telegram monitor for the Antseed seller.
// Replaces the retired FactCheck service; reuses its bot token and the
// cavedl-tgbot admin chat ID (both read in src/config.js).

import TelegramBot from "node-telegram-bot-api";
import { Agent as HttpsAgent } from "https";
import { ADMIN_CHAT_ID, TELEGRAM_TOKEN } from "./src/config.js";
import { registerCommands } from "./src/commands.js";
import { startMonitor } from "./src/monitor.js";

if (!TELEGRAM_TOKEN) {
  console.error(
    "No TGTOKEN found. Set it in .env or ensure /root/workspace/FactCheck/.env exists.",
  );
  process.exit(1);
}
if (!ADMIN_CHAT_ID) {
  console.error(
    "No ADMIN_CHAT_ID found. Set it in .env or ensure /root/workspace/cavedl-tgbot/.env defines it.",
  );
  process.exit(1);
}

const IPV4_ONLY_AGENT = new HttpsAgent({ family: 4, keepAlive: true });
const BOT = new TelegramBot(TELEGRAM_TOKEN, {
  polling: true,
  request: { agent: IPV4_ONLY_AGENT },
});

BOT.on("polling_error", (error) => {
  const code = error?.code || error?.cause?.code || "";
  console.error(`polling_error: ${error?.message} ${code}`);
});

registerCommands(BOT);
startMonitor(BOT);

(async () => {
  try {
    const me = await BOT.getMe();
    await BOT.sendMessage(
      ADMIN_CHAT_ID,
      `🟢 <b>Antseed monitor online</b>\n\nBot: @${me.username}\nHost: ${new Date().toISOString()}\nSend /help for commands.`,
      { parse_mode: "HTML" },
    );
    console.log(`[BOOT] @${me.username} online; admin chat ${ADMIN_CHAT_ID}`);
  } catch (error) {
    console.error("[BOOT] startup notice failed:", error.message);
  }
})();

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});
