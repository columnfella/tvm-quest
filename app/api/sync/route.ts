import { body, json } from '@/lib/api';
import { isAvatar } from '@/lib/avatars';
import { db, update } from '@/lib/db';
import { apply, cleanDelta, hydrate, merge } from '@/lib/state';
import { nameKey } from '@/lib/username';

export const dynamic = 'force-dynamic';
const MAX_XP_PER_SAVE = 1500;
// same curve as levelInfo() in lib/store.ts: level n starts at 50·n·(n−1) XP
const levelOf = (xp: number) => { let n = 1; while (50 * (n + 1) * n <= xp) n++; return n; };

// POST { name, token, avatar?, delta } → applies the device's changes to the saved progress (see lib/state.ts)
// and returns the merged state. Older clients still send { state }: that is joined, never overwritten.
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== 'string' || typeof b.token !== 'string') return json({ error: 'Bad request' }, 400);
  try {
    const k = nameKey(b.name);
    const first = await db.get(k);
    if (!first || first.token !== b.token) return json({ error: 'Not found' }, 404);
    const delta = b.delta !== undefined ? cleanDelta(b.delta, MAX_XP_PER_SAVE) : null;
    if (b.delta !== undefined && !delta) return json({ error: 'Bad request' }, 400);

    const saved = await update(k, (u) => {
      if (u.token !== b.token) return null;
      // a new account has no state yet; take the day from the device (the server runs on UTC)
      const cur = u.state ? hydrate(u.state) : { ...hydrate(null), today: delta?.day?.today ?? hydrate(null).today };
      let next = delta ? apply(cur, delta) : b.state !== undefined ? merge(cur, hydrate(b.state)) : cur;
      // a reset may only lower progress, and an old client's copy may not jump XP more than one save allows
      if (delta?.reset) next = { ...next, xp: Math.min(next.xp, cur.xp) };
      else if (next.xp > cur.xp + MAX_XP_PER_SAVE) next = { ...next, xp: cur.xp + MAX_XP_PER_SAVE };
      return {
        ...u,
        avatar: isAvatar(b.avatar) ? b.avatar : u.avatar,
        xp: next.xp,
        level: levelOf(next.xp), // derived on the server, never trusted from the client
        streak: next.streak,
        state: next,
        updatedAt: Date.now(),
      };
    });
    if (!saved || saved.token !== b.token) return json({ error: 'Not found' }, 404);
    return json({ ok: true, state: saved.state });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
