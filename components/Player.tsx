'use client';
// Public profile of any player on the leaderboard: score, rank, stats, chapter progress and badges.
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useCourse } from '@/lib/course';
import { progressFrom } from '@/lib/progress';
import { buildAchievements, levelInfo } from '@/lib/store';
import { Asset, Bar } from './ui';

type PublicPlayer = {
  name: string; avatar: string; xp: number; level: number; streak: number; rank: number; total: number; joinedAt: number;
  stats: { correct: number; answered: number; bestCombo: number; perfect: number };
  achievements: string[];
  lessons: Record<string, { done: boolean; stars: number }>;
};

export function PlayerView({ name, me, onBack }: { name: string; me?: string; onBack: () => void }) {
  const course = useCourse();
  const badges = useMemo(() => buildAchievements(course), [course]);
  const [p, setP] = useState<PublicPlayer | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setP(null);
    setErr(null);
    fetch(`/api/player?name=${encodeURIComponent(name)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: PublicPlayer) => alive && setP(d))
      .catch((s) => alive && setErr(s === 404 ? 'This player is no longer on the board.' : 'Could not load this player.'));
    return () => { alive = false; };
  }, [name]);

  const back = <button className="back-btn player-back" onClick={onBack}><ArrowLeft size={18} strokeWidth={3} /> Leaderboard</button>;
  if (err) return <div className="player">{back}<p className="lb-empty">{err}</p></div>;
  if (!p) return <div className="player">{back}<div className="center-col"><span className="spinner" aria-label="Loading player" /></div></div>;

  const lv = levelInfo(p.xp);
  const acc = p.stats.answered ? Math.round((p.stats.correct / p.stats.answered) * 100) : 0;
  const lessonsDone = Object.keys(p.lessons).length;
  const stars = Object.values(p.lessons).reduce((a, l) => a + l.stars, 0);
  const earned = badges.filter((b) => p.achievements.includes(b.id));
  const isMe = !!me && me.toLowerCase() === p.name.toLowerCase();

  return (
    <div className="player">
      {back}
      <div className="profile-head">
        <span className="lb-av player-av"><Asset name={p.avatar} size={64} /></span>
        <div style={{ flex: 1 }}>
          <h3>{p.name}{isMe ? ' (you)' : ''}</h3>
          <p className="muted small">#{p.rank} of {p.total} this season · Level {lv.level}</p>
          <Bar value={lv.into / lv.span} color="var(--yellow)" height={12} />
        </div>
      </div>
      <div className="profile-stats">
        {[
          ['high_voltage_3d.png', p.xp, 'Season XP'],
          ['fire_3d.png', p.streak, 'Day streak'],
          ['books_3d.png', lessonsDone, 'Lessons'],
          ['star_3d.png', stars, 'Stars'],
          ['hundred_points_3d.png', `${acc}%`, `Accuracy (${p.stats.answered} Qs)`],
          ['rocket_3d.png', p.stats.bestCombo, 'Best combo'],
        ].map(([icon, v, l]) => (
          <div key={l as string} className="pstat">
            <Asset name={icon as string} size={30} />
            <b>{v}</b>
            <small>{l}</small>
          </div>
        ))}
      </div>

      <h3 className="badges-title">Chapters</h3>
      <div className="player-chapters">
        {course.chapters.map((ch) => {
          const pr = progressFrom(p.lessons, ch);
          return (
            <div key={ch.id} className="player-ch">
              <Asset name={ch.icon} size={28} />
              <div style={{ flex: 1 }}>
                <div className="player-ch-row"><b>{ch.number !== null ? `Ch. ${ch.number} · ` : ''}{ch.title}</b><span>{pr.done}/{pr.total}</span></div>
                <Bar value={pr.total ? pr.done / pr.total : 0} height={10} color="linear-gradient(180deg, #fff27a, #ffc400)" />
              </div>
            </div>
          );
        })}
      </div>

      <h3 className="badges-title">Badges · {earned.length}/{badges.length}</h3>
      {earned.length ? (
        <div className="badges">
          {earned.map((a) => (
            <div key={a.id} className="badge has" title={a.desc}>
              <Asset name={a.icon} size={40} />
              <b>{a.name}</b>
              <small>{a.desc}</small>
            </div>
          ))}
        </div>
      ) : <p className="muted small">No badges yet.</p>}
      <p className="muted small" style={{ marginTop: 12 }}>Playing since {new Date(p.joinedAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}. The board is for fun and resets every Monday.</p>
    </div>
  );
}
