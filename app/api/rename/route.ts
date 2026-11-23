import { body, json, publicUser } from '@/lib/api';
import { db } from '@/lib/db';
import { nameKey, validateName } from '@/lib/username';

export const dynamic = 'force-dynamic';

// POST { name, token, newName } → renames the account, keeping all progress.
// `name` is the name the account is stored under (it can differ from the shown name after a moderator rename).
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== 'string' || typeof b.token !== 'string' || typeof b.newName !== 'string') return json({ error: 'Bad request' }, 400);
  const newName = b.newName.trim();
  const err = validateName(newName);
  if (err) return json({ error: err }, 400);
  try {
    const from = nameKey(b.name);
    const u = await db.get(from);
    if (!u || u.token !== b.token) return json({ error: 'Not found' }, 404);
    const to = nameKey(newName);
    const rec = { ...u, name: newName, mustRename: false, updatedAt: Date.now() };
    if (to === from) await db.put(from, rec);
    else if (!(await db.move(from, to, rec))) return json({ error: 'That name is taken this week' }, 409);
    return json({ ok: true, user: publicUser(rec) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
