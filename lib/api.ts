// Shared helpers for the API routes.
import type { UserRecord } from './db';

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export const publicUser = (u: UserRecord) => ({ name: u.name, avatar: u.avatar, xp: u.xp, level: u.level, streak: u.streak });

export const num = (v: unknown, max: number) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const text = await req.text();
    if (text.length > 100_000) return {};
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
