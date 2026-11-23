import { body, json, publicUser } from '@/lib/api';
import { db } from '@/lib/db';
import { nameKey } from '@/lib/username';

export const dynamic = 'force-dynamic';

// POST { name, token } → the player's saved progress, or 404 when the season was wiped.
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== 'string' || typeof b.token !== 'string') return json({ error: 'Bad request' }, 400);
  try {
    const u = await db.get(nameKey(b.name));
    if (!u || u.token !== b.token) return json({ error: 'Not found' }, 404);
    return json({ user: publicUser(u), state: u.state });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
