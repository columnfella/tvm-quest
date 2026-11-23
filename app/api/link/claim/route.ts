import { body, json, publicUser } from '@/lib/api';
import { db, recordFailure, takeLink, tooManyFailures } from '@/lib/db';

export const dynamic = 'force-dynamic';

const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';

// POST { code } → { user, token, state }: signs this device in to the account that created the code.
export async function POST(req: Request) {
  const b = await body(req);
  const code = typeof b.code === 'string' ? b.code.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  if (code.length !== 6) return json({ error: 'Codes have 6 characters' }, 400);
  try {
    const who = `claim:${clientIp(req)}`;
    if (await tooManyFailures(who, 30)) return json({ error: 'Too many wrong codes. Wait a few minutes.' }, 429);
    const name = await takeLink(code);
    const u = name ? await db.get(name) : null;
    if (!u) {
      await recordFailure(who, 600);
      return json({ error: 'That code is wrong or has expired. Make a new one.' }, 404);
    }
    return json({ user: publicUser(u), key: name, token: u.token, state: u.state });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
