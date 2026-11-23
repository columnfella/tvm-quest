'use client';
import confetti from '@/lib/confetti';
import { m } from 'framer-motion';
import { Timer, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { shuffle, useCourse, type Lesson } from '@/lib/course';
import { sfx } from '@/lib/sound';
import type { Game } from '@/lib/store';
import type { LessonResult } from './Lesson';
import { Asset, Bar, Rich } from './ui';

type G = Game;

export default function Match({ g, lesson, onExit, onFinish }: { g: G; lesson: Lesson; onExit: () => void; onFinish: (r: LessonResult) => void }) {
  const course = useCourse();
  const chapter = course.chapterMap[lesson.chapterId];
  const count = lesson.pairCount ?? 6;
  const speedRun = count > 6;
  const pairs = useMemo(() => shuffle(chapter.pairs.map((f, i) => ({ name: f.left, formula: f.right, i }))).slice(0, count), [count, chapter]);
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);
  const [pickL, setPickL] = useState<number | null>(null);
  const [pickR, setPickR] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [bad, setBad] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [now, setNow] = useState(Date.now());
  const t0 = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (pickL === null || pickR === null) return;
    if (pickL === pickR) {
      sfx.match();
      const nd = new Set(done).add(pickL);
      setDone(nd);
      const c = combo + 1;
      setCombo(c);
      setBest((b) => Math.max(b, c));
      setPickL(null);
      setPickR(null);
      if (nd.size === pairs.length) {
        const ms = Date.now() - t0.current;
        const secs = ms / 1000;
        const xp = Math.max(5, 20 + (speedRun ? 10 : 0) - mistakes * 2 + (secs < 30 ? 10 : secs < 60 ? 5 : 0));
        try { confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, disableForReducedMotion: true }); } catch { /* noop */ }
        g.update((s) => ({ ...s, stats: { ...s.stats, matchBest: s.stats.matchBest === null ? secs : Math.min(s.stats.matchBest, secs), bestCombo: Math.max(s.stats.bestCombo, c) } }));
        setTimeout(() => onFinish({ xp, correctFirst: pairs.length - Math.min(mistakes, pairs.length), total: pairs.length, bestCombo: Math.max(best, c), ms, mistakes, kind: 'match' }), 650);
      }
    } else {
      sfx.wrong();
      setBad(pickR);
      setMistakes((m) => m + 1);
      setCombo(0);
      setTimeout(() => {
        setBad(null);
        setPickL(null);
        setPickR(null);
      }, 450);
    }
  }, [pickL, pickR]); // eslint-disable-line react-hooks/exhaustive-deps

  const secs = Math.floor((now - t0.current) / 1000);

  return (
    <div className="lesson match-screen">
      <div className="lesson-top">
        <button className="icon-btn" onClick={onExit} aria-label="Quit"><X size={26} /></button>
        <div style={{ flex: 1 }}><Bar value={done.size / pairs.length} color={chapter.color} height={18} /></div>
        <span className="stat"><Timer size={20} /><b>{secs}s</b></span>
      </div>
      <div className="lesson-body">
        <div className="q-head">
          <Asset name="brain_3d.png" size={64} className="q-face" />
          <div className="q-stem">
            <h2 className="match-title">{lesson.title}</h2>
            <p>Tap an item on the left, then its match on the right. Under 30 seconds earns a speed bonus.</p>
          </div>
        </div>
        <div className="match-grid">
          <div className="match-col">
            {left.map((p) => (
              <m.button
                key={'l' + p.i}
                className={`tile ${done.has(p.i) ? 'gone' : ''} ${pickL === p.i ? 'sel' : ''}`}
                disabled={done.has(p.i)}
                onClick={() => { sfx.tap(); setPickL(p.i); }}
                animate={done.has(p.i) ? { scale: [1, 1.08, 0.96], opacity: 0.35 } : { scale: 1, opacity: 1 }}
              >
                {p.name}
              </m.button>
            ))}
          </div>
          <div className="match-col">
            {right.map((p) => (
              <m.button
                key={'r' + p.i}
                className={`tile ${chapter.pairsMono ? 'formula-tile' : ''} ${done.has(p.i) ? 'gone' : ''} ${pickR === p.i ? 'sel' : ''} ${bad === p.i ? 'bad' : ''}`}
                disabled={done.has(p.i) || pickL === null}
                onClick={() => { setPickR(p.i); }}
                animate={bad === p.i ? { x: [0, -8, 8, -5, 5, 0] } : done.has(p.i) ? { scale: [1, 1.08, 0.96], opacity: 0.35 } : { scale: 1, opacity: 1 }}
              >
                <Rich text={p.formula} />
              </m.button>
            ))}
          </div>
        </div>
        {combo >= 3 && <p className="match-combo"><Asset name="fire_3d.png" size={20} /> {combo} in a row</p>}
      </div>
    </div>
  );
}
