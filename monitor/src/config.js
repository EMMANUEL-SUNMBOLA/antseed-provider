// Configuration. Secrets are never stored here: the Telegram token is read
// from the retired FactCheck service and the admin ID from cavedl-tgbot, both
// at runtime. Values in this service's own .env (or the real process env)
// override those lookups.

import { readFileSync } from "node:fs";

const HERE = new URL(".", import.meta.url).pathname;
const OWN_ENV = `${HERE}.env`;

function parseEnvFile(path, into) {
  try {
    const text = readFileSync(path, "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (into[key] === undefined) into[key] = value;
    }
  } catch {
    // Missing file is fine.
  }
  return into;
}

// Precedence: real process env > own .env > service env files.
const env = { ...process.env };
parseEnvFile(OWN_ENV, env);

const FACTCHECK_ENV = env.FACTCHECK_ENV || "/root/workspace/FactCheck/.env";
const CAVEDL_ENV = env.CAVEDL_ENV || "/root/workspace/cavedl-tgbot/.env";

const factcheck = parseEnvFile(FACTCHECK_ENV, {});
const cavedl = parseEnvFile(CAVEDL_ENV, {});

export const TELEGRAM_TOKEN = env.TGTOKEN || factcheck.TGTOKEN || "";
export const ADMIN_CHAT_ID = String(
  env.ADMIN_CHAT_ID || cavedl.ADMIN_CHAT_ID || "",
);

export const ANTSEED_BIN =
  env.ANTSEED_BIN || "/root/.nvm/versions/node/v24.14.1/bin/antseed";
export const ANTSEED_ENV_FILE = env.ANTSEED_ENV_FILE || "/root/.antseed/.env";
export const METERING_DB = env.METERING_DB || "/root/.antseed/metering.db";
export const SQLITE_BIN = env.SQLITE_BIN || "sqlite3";

export const WALLET =
  env.ANTSEED_WALLET || "0x5473831A3142d912FdF88495e17c08b2a6fc37Ec";
export const PEER_ID =
  env.ANTSEED_PEER_ID || "5473831A3142d912FdF88495e17c08b2a6fc37Ec";
export const PM2_NAME = env.PM2_NAME || "antseed-seller";

export const BASE_RPC = env.BASE_RPC || "https://base.drpc.org";
export const USDC_ADDRESS =
  env.USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
export const USDC_DECIMALS = 6;

export const GAS_LOW_WEI = BigInt(env.GAS_LOW_WEI || "50000000000000"); // 0.00005 ETH
export const CHECK_INTERVAL_MS = Number(env.CHECK_INTERVAL_MS || "300000");
export const ACTIVITY_INTERVAL_MS = Number(env.ACTIVITY_INTERVAL_MS || "60000");
export const NO_SALES_WARN_HOURS = Number(env.NO_SALES_WARN_HOURS || "48");
export const ANOMALY_REQUESTS_PER_HOUR = Number(
  env.ANOMALY_REQUESTS_PER_HOUR || "100",
);
export const SALES_ALERTS = (env.SALES_ALERTS || "true") !== "false";
export const RPC_TIMEOUT_MS = Number(env.RPC_TIMEOUT_MS || "8000");
