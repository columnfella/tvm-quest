import { json } from '@/lib/api';
import { db, dbKind } from '@/lib/db';
import { seasonEnd, seasonId } from '@/lib/season';

export const dynamic = 'force-dynamic';

// GET /api/health → is the database connected? (no secrets are returned)
export async function GET() {
  try {
    const players = (await db.all()).length;
    return json({
      ok: true,
      database: dbKind, // "redis" in production, "file" locally
      persistent: dbKind === 'redis' || !process.env.VERCEL,
      season: seasonId(),
      resetsAt: new Date(seasonEnd()).toISOString(),
      players,
    });
  } catch (e) {
    console.error(e);
    return json({ ok: false, database: dbKind, error: 'Database unreachable' }, 500);
  }
}
