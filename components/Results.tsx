'use client';
import confetti from 'canvas-confetti';
import { animate, motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Lesson } from '@/lib/data';
import { sfx } from '@/lib/sound';
import { completeDay, levelInfo, type useGame } from '@/lib/store';
import type { LessonResult } from './Lesson';
import { Asset, Bar, Btn } from './ui';

type G = ReturnType<typeof useGame>;

function Count({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration: 1.1, ease: 'easeOut', onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [to]);
  return <>{v}{suffix}</>;
}

export default function Results({ g, lesson, r, nextId, onHome, onRetry, onNext }: { g: G; lesson: Lesson; r: LessonResult; nextId: string | null; onHome: () => void; onRetry: () => void; onNext: (id: string) => void }) {
  const applied = useRef(false);
  const acc = r.total ? r.correctFirst / r.total : 1;
  const perfect = r.mistakes === 0;
  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
  const gems = 5 + (perfect ? 10 : 0);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const secs = Math.round(r.ms / 1000);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    sfx.complete();
    try {
      const end = Date.now() + 900;
      const frame = () => {
        confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0 }, disableForReducedMotion: true });
        confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1 }, disableForReducedMotion: true });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } catch { /* noop */ }
    const before = levelInfo(g.state.xp).level;
    const after = levelInfo(g.state.xp + r.xp).level;
    if (after > before) setTimeout(() => { setLevelUp(after); sfx.unlock(); }, 1300);
    g.update((s) => {
      const prev = s.lessons[lesson.id];
      return completeDay({
        ...s,
        xp: s.xp + r.xp,
        todayXp: s.todayXp + r.xp,
        gems: s.gems + gems,
        lessons: {
          ...s.lessons,
          [lesson.id]: { done: true, stars: Math.max(prev?.stars ?? 0, stars), bestAcc: Math.max(prev?.bestAcc ?? 0, acc), plays: (prev?.plays ?? 0) + 1 },
        },
        stats: { ...s.stats, perfect: s.stats.perfect + (perfect && r.kind === 'quiz' ? 1 : 0) },
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goal = g.state.todayXp / g.state.dailyGoal;

  return (
    <div className="results">
      <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
        <Asset name={perfect ? 'smiling_face_with_sunglasses_3d.png' : 'pig_face_3d.png'} size={132} alt="" />
      </motion.div>
      <h1>{perfect ? 'Perfect lesson!' : 'Lesson complete!'}</h1>
      <p className="muted">{lesson.title}</p>

      <div className="stars" aria-label={`${stars} of 3 stars`}>
        {[1, 2, 3].map((i) => (
          <motion.span key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: i <= stars ? 1 : 0.8, rotate: 0 }} transition={{ delay: 0.3 + i * 0.22, type: 'spring', stiffness: 300, damping: 12 }}>
            <Star size={i === 2 ? 64 : 50} fill={i <= stars ? 'var(--gold)' : 'var(--line)'} stroke={i <= stars ? 'var(--gold-dark)' : 'var(--line)'} strokeWidth={2} />
          </motion.span>
        ))}
      </div>

      <div className="result-tiles">
        <motion.div className="tile-stat gold" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <small>Total XP</small>
          <b><Asset name="high_voltage_3d.png" size={26} /> <Count to={r.xp} /></b>
        </motion.div>
        <motion.div className="tile-stat green" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.62 }}>
          <small>{r.kind === 'match' ? 'Accuracy' : 'First-try accuracy'}</small>
          <b><Asset name="hundred_points_3d.png" size={26} /> <Count to={Math.round(acc * 100)} suffix="%" /></b>
        </motion.div>
        <motion.div className="tile-stat blue" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.74 }}>
          <small>Time</small>
          <b><Asset name="hourglass_done_3d.png" size={26} /> {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</b>
        </motion.div>
        <motion.div className="tile-stat orange" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.86 }}>
          <small>Best combo</small>
          <b><Asset name="fire_3d.png" size={26} /> {r.bestCombo}</b>
        </motion.div>
      </div>

      <div className="reward-row">
        <span className="reward"><Asset name="gem_stone_3d.png" size={22} /> +{gems} gems{perfect ? ' (perfect bonus)' : ''}</span>
        <span className="reward"><Asset name="fire_3d.png" size={22} /> {g.state.streak}-day streak</span>
      </div>

      <div className="goal-mini">
        <span>Daily goal</span>
        <Bar value={goal} color="var(--gold)" />
        <span>{Math.min(g.state.todayXp, g.state.dailyGoal)}/{g.state.dailyGoal}</span>
      </div>

      <div className="result-actions">
        <Btn variant="ghost" onClick={onRetry}>Practice again</Btn>
        {nextId ? <Btn variant="primary" onClick={() => onNext(nextId)}>Next lesson</Btn> : <Btn variant="primary" onClick={onHome}>Continue</Btn>}
      </div>
      <button className="link-btn" onClick={onHome}>Back to the map</button>

      {levelUp && (
        <motion.div className="levelup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setLevelUp(null)}>
          <motion.div className="levelup-card" initial={{ scale: 0.5, y: 40 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
            <Asset name="crown_3d.png" size={110} />
            <h2>Level {levelUp}!</h2>
            <p>Your knowledge is compounding nicely.</p>
            <Btn variant="gold" onClick={() => setLevelUp(null)}>Awesome</Btn>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
