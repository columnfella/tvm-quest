import { body, json } from '@/lib/api';
import { db, update } from '@/lib/db';
import { nameKey } from '@/lib/username';

export const dynamic = 'force-dynamic';

// POST { name, token } → marks the moderator notice as seen.
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== 'string' || typeof b.token !== 'string') return json({ error: 'Bad request' }, 400);
  try {
    const k = nameKey(b.name);
    const u = await db.get(k);
    if (!u || u.token !== b.token) return json({ error: 'Not found' }, 404);
    if (u.notice) await update(k, (x) => (x.notice ? { ...x, notice: undefined } : null));
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
