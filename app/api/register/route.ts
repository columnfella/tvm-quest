import { randomBytes } from 'crypto';
import { body, json, publicUser } from '@/lib/api';
import { isAvatar } from '@/lib/avatars';
import { db } from '@/lib/db';
import { nameKey, validateName } from '@/lib/username';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const b = await body(req);
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const err = validateName(name);
  if (err) return json({ error: err }, 400);
  if (!isAvatar(b.avatar)) return json({ error: 'Pick a profile picture' }, 400);

  const now = Date.now();
  const rec = { name, avatar: b.avatar, token: randomBytes(18).toString('base64url'), xp: 0, level: 1, streak: 0, state: null, joinedAt: now, updatedAt: now };
  try {
    if (!(await db.create(nameKey(name), rec))) return json({ error: 'That name is taken this week' }, 409);
  } catch (e) {
    console.error(e);
    return json({ error: 'Server is busy, try again' }, 500);
  }
  return json({ token: rec.token, user: publicUser(rec) });
}
