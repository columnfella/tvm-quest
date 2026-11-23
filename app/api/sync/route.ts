import { body, json, num } from '@/lib/api';
import { isAvatar } from '@/lib/avatars';
import { db } from '@/lib/db';
import { nameKey } from '@/lib/username';

export const dynamic = 'force-dynamic';

// POST { name, token, xp, level, streak, avatar?, state } → saves progress.
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== 'string' || typeof b.token !== 'string') return json({ error: 'Bad request' }, 400);
  try {
    const k = nameKey(b.name);
    const u = await db.get(k);
    if (!u || u.token !== b.token) return json({ error: 'Not found' }, 404);
    await db.put(k, {
      ...u,
      avatar: isAvatar(b.avatar) ? b.avatar : u.avatar,
      xp: num(b.xp, 1_000_000),
      level: num(b.level, 1000) || 1,
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
