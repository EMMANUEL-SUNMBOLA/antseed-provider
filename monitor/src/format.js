// Formatting helpers. All times are rendered in UTC.

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function fmtUsd(value) {
  const n = Number(value || 0);
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

export function fmtEth(wei) {
  return `${(Number(wei) / 1e18).toFixed(6)} ETH`;
}

export function fmtTokens(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function fmtDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h) parts.push(`${sec}s`);
  return parts.join(" ") || "0s";
}

export function fmtUtc(ms) {
  if (!ms) return "never";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function shortPeer(peerId) {
  const p = String(peerId || "");
  return p.length > 12 ? `${p.slice(0, 6)}…${p.slice(-4)}` : p;
}
