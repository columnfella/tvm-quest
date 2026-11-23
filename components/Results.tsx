'use client';
import confetti from '@/lib/confetti';
import { animate, m } from 'framer-motion';
import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCourse, type Lesson } from '@/lib/course';
import { sfx } from '@/lib/sound';
import { completeDay, levelInfo, type Game } from '@/lib/store';
import type { LessonResult } from './Lesson';
import Coach from './Coach';
import Crate, { type CrateTier, type Loot } from './Crate';
import { Asset, Bar, Btn } from './ui';

type G = Game;

function Count({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, to, { duration: 1.1, ease: 'easeOut', onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [to]);
  return <>{v}{suffix}</>;
}

export default function Results({ g, lesson, r, nextId, onBack, onRetry, onNext }: { g: G; lesson: Lesson; r: LessonResult; nextId: string | null; onBack: () => void; onRetry: () => void; onNext: (id: string) => void }) {
  const course = useCourse();
  const tracked = !!course.lessonMap[lesson.id]; // quick practice / review aren't saved as lesson progress
  const applied = useRef(false);
  const acc = r.total ? r.correctFirst / r.total : 1;
  const perfect = r.mistakes === 0;
  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
  const tier: CrateTier = perfect && r.kind === 'quiz' ? 'legendary' : stars === 3 ? 'epic' : stars === 2 ? 'rare' : 'common';
  const chestGems = { common: 5, rare: 10, epic: 20, legendary: 35 }[tier];
  const chestXp = { common: 5, rare: 10, epic: 15, legendary: 30 }[tier];
  const loot: Loot[] = [
    { icon: 'coin_3d.png', amount: chestGems, label: 'Coins' },
    { icon: 'high_voltage_3d.png', amount: chestXp, label: 'Bonus XP', rare: tier === 'legendary' },
  ];
  const [opened, setOpened] = useState(false);
  const [coachTick, setCoachTick] = useState(0);
  useEffect(() => {
    if (stars < 2) return;
    const id = setTimeout(() => setCoachTick(1), 1400);
    return () => clearTimeout(id);
  }, [stars]);
  const totalXp = r.xp + chestXp;
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
    const after = levelInfo(g.state.xp + totalXp).level;
    if (after > before) setTimeout(() => { setLevelUp(after); sfx.unlock(); }, 2600);
    g.update((s) => {
      const prev = s.lessons[lesson.id];
      return completeDay({
        ...s,
        xp: s.xp + totalXp,
        todayXp: s.todayXp + totalXp,
        gems: s.gems + chestGems,
        lessons: tracked
          ? { ...s.lessons, [lesson.id]: { done: true, stars: Math.max(prev?.stars ?? 0, stars), bestAcc: Math.max(prev?.bestAcc ?? 0, acc), plays: (prev?.plays ?? 0) + 1 } }
          : s.lessons,
        stats: { ...s.stats, perfect: s.stats.perfect + (perfect && r.kind === 'quiz' ? 1 : 0) },
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goal = g.state.todayXp / g.state.dailyGoal;

  return (
    <div className="results">
      <div className="rays" />
      <m.div className="victory" initial={{ scale: 3, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 16 }}>
        <h1>{perfect ? 'FLAWLESS!' : 'CLEARED!'}</h1>
      </m.div>
      <p className="subtitle">{lesson.title}</p>

      <div className="stars" aria-label={`${stars} of 3 stars`}>
        {[1, 2, 3].map((i) => (
          <m.span key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: i <= stars ? 1 : 0.8, rotate: 0 }} transition={{ delay: 0.3 + i * 0.22, type: 'spring', stiffness: 300, damping: 12 }}>
            <Star size={i === 2 ? 64 : 50} fill={i <= stars ? 'var(--yellow)' : 'var(--line)'} stroke={i <= stars ? 'var(--yellow-dark)' : 'var(--line)'} strokeWidth={2} />
          </m.span>
        ))}
      </div>

      <Crate tier={tier} loot={loot} onOpen={() => setOpened(true)} />

      <div className="result-tiles">
        <m.div className="tile-stat gold" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
          <small>Total XP</small>
          <b><Asset name="high_voltage_3d.png" size={26} /> <Count to={opened ? totalXp : r.xp} /></b>
        </m.div>
        <m.div className="tile-stat green" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.62 }}>
          <small>{r.kind === 'match' ? 'Accuracy' : 'First-try accuracy'}</small>
          <b><Asset name="hundred_points_3d.png" size={26} /> <Count to={Math.round(acc * 100)} suffix="%" /></b>
        </m.div>
        <m.div className="tile-stat blue" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.74 }}>
          <small>Time</small>
          <b><Asset name="hourglass_done_3d.png" size={26} /> {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</b>
        </m.div>
        <m.div className="tile-stat orange" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.86 }}>
          <small>Best combo</small>
          <b><Asset name="fire_3d.png" size={26} /> {r.bestCombo}</b>
        </m.div>
      </div>

      <div className="reward-row">
        <span className="reward"><Asset name="fire_3d.png" size={22} /> {g.state.streak}-day streak</span>
      </div>

      <div className="goal-mini">
        <span>Daily goal</span>
        <Bar value={goal} color="var(--yellow)" />
        <span>{Math.min(g.state.todayXp, g.state.dailyGoal)}/{g.state.dailyGoal}</span>
      </div>

      <div className="result-actions">
        <Btn variant="ghost" onClick={onRetry}>Practice again</Btn>
        {nextId ? <Btn variant="primary" onClick={() => onNext(nextId)}>Next lesson</Btn> : <Btn variant="primary" onClick={onBack}>Continue</Btn>}
      </div>
      <button className="link-btn" onClick={onBack}>Back to the chapter</button>

      <Coach trigger={coachTick} placement="results" />

      {levelUp && (
        <m.div className="levelup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setLevelUp(null)}>
          <div className="rays" />
          <m.div className="levelup-card" initial={{ scale: 0.2, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
            <div className="loop-float">
              <Asset name="crown_3d.png" size={120} eager />
            </div>
            <span className="chest-label">LEVEL UP!</span>
            <h2>{levelUp}</h2>
            <p>You&apos;re getting stronger. Keep the streak alive.</p>
            <Btn variant="gold" onClick={() => setLevelUp(null)}>Awesome</Btn>
          </m.div>
        </m.div>
      )}
    </div>
  );
}
