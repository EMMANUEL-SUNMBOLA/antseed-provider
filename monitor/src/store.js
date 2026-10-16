// Tiny JSON state file so restarts don't replay alerts or re-report days.

import { readFileSync, writeFileSync, renameSync } from "node:fs";

const HERE = new URL(".", import.meta.url).pathname;
const STATE_PATH = `${HERE}../state.json`;

const DEFAULTS = {
  lastEventTs: 0,
  lastReceiptTs: 0,
  lastDailyDate: null,
  activeProblems: [], // keys currently alerted, for recovery notices
  lastAlertAt: {}, // key -> ms
};

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(STATE_PATH, "utf8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

let state = load();

export function getState() {
  return state;
}

export function saveState() {
  try {
    const tmp = `${STATE_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, STATE_PATH);
  } catch {
    // State is best-effort; never let it break the monitor.
  }
}
