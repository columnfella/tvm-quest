// A "season" is one calendar week, Monday 00:00 UTC → next Monday 00:00 UTC.
// All server data is keyed by the season id, so a new week starts with an empty database.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function seasonStart(now = Date.now()): number {
  const d = new Date(now);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

export function seasonId(now = Date.now()): string {
  return new Date(seasonStart(now)).toISOString().slice(0, 10); // e.g. 2026-11-23
}

export function seasonEnd(now = Date.now()): number {
  return seasonStart(now) + WEEK_MS;
}

export function formatLeft(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}
