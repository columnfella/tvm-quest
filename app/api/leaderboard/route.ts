import { json, publicUser } from '@/lib/api';
import { db } from '@/lib/db';
import { seasonEnd, seasonId } from '@/lib/season';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = await db.all();
    users.sort((a, b) => b.xp - a.xp || a.joinedAt - b.joinedAt);
    return json({ season: seasonId(), endsAt: seasonEnd(), total: users.length, players: users.slice(0, 100).map(publicUser) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
