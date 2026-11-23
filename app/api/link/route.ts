import { randomInt } from 'crypto';
import { body, json } from '@/lib/api';
import { LINK_TTL, db, putLink } from '@/lib/db';
import { nameKey } from '@/lib/username';

export const dynamic = 'force-dynamic';

// No look-alike characters (0/O, 1/I/L), so codes are easy to read off a screen and type.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = () => Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

// POST { name, token } → { code, expiresAt }: a one-time code another device can use to sign in to this account.
export async function POST(req: Request) {
  const b = await body(req);
  if (typeof b.name !== 'string' || typeof b.token !== 'string') return json({ error: 'Bad request' }, 400);
  try {
    const k = nameKey(b.name);
    const u = await db.get(k);
    if (!u || u.token !== b.token) return json({ error: 'Not found' }, 404);
    for (let i = 0; i < 5; i++) {
      const code = makeCode();
      if (await putLink(code, k)) return json({ code, expiresAt: Date.now() + LINK_TTL * 1000 });
    }
    return json({ error: 'Try again' }, 503);
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
