// Data layer: shells out to the antseed CLI / pm2 / ss and does one on-chain
// eth_call for the USDC balance. Every function resolves to a value or throws;
// callers decide how to degrade.

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import {
  ANTSEED_BIN,
  ANTSEED_ENV_FILE,
  BASE_RPC,
  PEER_ID,
  PM2_NAME,
  RPC_TIMEOUT_MS,
  USDC_ADDRESS,
  USDC_DECIMALS,
  WALLET,
} from "./config.js";

const execFileAsync = promisify(execFile);

function loadAntseedEnv() {
  const env = { ...process.env };
  try {
    const text = readFileSync(ANTSEED_ENV_FILE, "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  } catch {
    // no env file — seller status still works
  }
  return env;
}

async function run(cmd, args, { timeout = 30000, env } = {}) {
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    env: env ?? process.env,
  });
  return { stdout, stderr };
}

/** The CLI prints progress lines before JSON; grab the JSON body. */
export function parseJsonLoose(text) {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function antseedJson(args, { timeout = 60000 } = {}) {
  const env = loadAntseedEnv();
  const { stdout } = await run(ANTSEED_BIN, args, { timeout, env });
  const json = parseJsonLoose(stdout);
  if (!json) throw new Error(`Could not parse antseed ${args.join(" ")} output`);
  return json;
}

export function getSellerStatus() {
  return antseedJson(["seller", "status", "--json"], { timeout: 30000 });
}

export function getAntsStatus() {
  return antseedJson(["ants", "status", "--json"], { timeout: 60000 });
}

export function getPeer() {
  return antseedJson(["network", "peer", PEER_ID, "--json"], { timeout: 60000 });
}

export function weiToEth(wei) {
  return Number(wei) / 1e18;
}

// --- USDC balance via eth_call (no ethers dependency) ---------------------

function encodeBalanceOf(address) {
  const selector = "70a08231"; // balanceOf(address)
  const clean = address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return `0x${selector}${clean}`;
}

export async function getUsdcBalance() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          { to: USDC_ADDRESS, data: encodeBalanceOf(WALLET) },
          "latest",
        ],
      }),
      signal: controller.signal,
    });
    const payload = await res.json();
    if (!payload.result || payload.result === "0x") return null;
    const raw = BigInt(payload.result);
    const scale = 10n ** BigInt(USDC_DECIMALS);
    const whole = raw / scale;
    const frac = raw % scale;
    return Number(whole) + Number(frac) / Number(scale);
  } finally {
    clearTimeout(timer);
  }
}

// --- process / port health ------------------------------------------------

export async function getPm2Status() {
  try {
    const { stdout } = await run("pm2", ["jlist"], { timeout: 15000 });
    const list = JSON.parse(stdout);
    const proc = list.find((p) => p.name === PM2_NAME);
    if (!proc) return { found: false, status: "missing" };
    return {
      found: true,
      status: proc.pm2_env?.status || "unknown",
      restarts: proc.pm2_env?.restart_time ?? 0,
      uptimeMs: proc.pm2_env?.pm_uptime ? Date.now() - proc.pm2_env.pm_uptime : 0,
      memoryBytes: proc.monit?.memory ?? 0,
    };
  } catch (error) {
    return { found: false, status: "error", error: error.message };
  }
}

async function ssHas(flag, needle) {
  try {
    const { stdout } = await run("ss", ["-H", flag], { timeout: 8000 });
    return stdout
      .split("\n")
      .some((line) => line.includes(needle));
  } catch {
    return false;
  }
}

export async function getPorts() {
  const [udp6881, tcp6882] = await Promise.all([
    ssHas("-lunp", ":6881"),
    ssHas("-tlnp", ":6882"),
  ]);
  return { udp6881, tcp6882 };
}

export async function getDeepseekHealth() {
  const env = loadAntseedEnv();
  const key = env.DEEPSEEK_API_KEY;
  if (!key) return { ok: false, reason: "no key" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.deepseek.com/models", {
      headers: { authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status };
  } catch (error) {
    return { ok: false, reason: error.message };
  } finally {
    clearTimeout(timer);
  }
}
