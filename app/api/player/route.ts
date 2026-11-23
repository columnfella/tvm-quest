import { json } from '@/lib/api';
import { db } from '@/lib/db';
import { nameKey } from '@/lib/username';

export const dynamic = 'force-dynamic';

const n = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);

// GET /api/player?name=X → a player's public profile (never the token or the raw state blob).
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get('name') ?? '';
  if (!name || name.length > 32) return json({ error: 'Bad request' }, 400);
  try {
    const users = await db.all();
    users.sort((a, b) => b.xp - a.xp || a.joinedAt - b.joinedAt);
    const i = users.findIndex((u) => nameKey(u.name) === nameKey(name));
    if (i < 0) return json({ error: 'Not found' }, 404);
    const u = users[i];
    const st = (u.state && typeof u.state === 'object' ? u.state : {}) as Record<string, unknown>;
    const stats = (st.stats && typeof st.stats === 'object' ? st.stats : {}) as Record<string, unknown>;
    const lessons: Record<string, { done: boolean; stars: number }> = {};
    if (st.lessons && typeof st.lessons === 'object') {
      for (const [id, p] of Object.entries(st.lessons as Record<string, Record<string, unknown>>).slice(0, 500)) {
        if (p && typeof p === 'object' && p.done === true) lessons[id.slice(0, 120)] = { done: true, stars: Math.max(0, Math.min(3, n(p.stars))) };
      }
    }
    return json({
      name: u.name,
      avatar: u.avatar,
      xp: u.xp,
      level: u.level,
      streak: u.streak,
      rank: i + 1,
      total: users.length,
      joinedAt: u.joinedAt,
      stats: { correct: n(stats.correct), answered: n(stats.answered), bestCombo: n(stats.bestCombo), perfect: n(stats.perfect) },
      achievements: Array.isArray(st.achievements) ? (st.achievements as unknown[]).filter((a): a is string => typeof a === 'string').slice(0, 100) : [],
      lessons,
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Server error' }, 500);
  }
}
