import { body, json, num } from '@/lib/api';
import { isAvatar } from '@/lib/avatars';
import { db } from '@/lib/db';
import { nameKey } from '@/lib/username';

export const dynamic = 'force-dynamic';
const MAX_XP_PER_SAVE = 1500;
// same curve as levelInfo() in lib/store.ts: level n starts at 50·n·(n−1) XP
const levelOf = (xp: number) => { let n = 1; while (50 * (n + 1) * n <= xp) n++; return n; };

// POST { name, token, xp, level, streak, avatar?, state } → saves progress.
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== 'string' || typeof b.token !== 'string') return json({ error: 'Bad request' }, 400);
  try {
    const k = nameKey(b.name);
    const u = await db.get(k);
    if (!u || u.token !== b.token) return json({ error: 'Not found' }, 404);
    // a single save can't jump more than a few lessons' worth of XP (stops pasted fake scores)
    const xp = Math.min(num(b.xp, 1_000_000), u.xp + MAX_XP_PER_SAVE);
    await db.put(k, {
      ...u,
      avatar: isAvatar(b.avatar) ? b.avatar : u.avatar,
      xp,
      level: levelOf(xp), // derived on the server, never trusted from the client
      streak: num(b.streak, 1000),
      state: b.state ?? u.state,
      updatedAt: Date.now(),
    });
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
