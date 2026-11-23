'use client';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Timer, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FORMULAS, type Lesson } from '@/lib/data';
import { sfx } from '@/lib/sound';
import type { useGame } from '@/lib/store';
import type { LessonResult } from './Lesson';
import { Asset, Bar, Rich } from './ui';

type G = ReturnType<typeof useGame>;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export default function Match({ g, lesson, onExit, onFinish }: { g: G; lesson: Lesson; onExit: () => void; onFinish: (r: LessonResult) => void }) {
  const count = lesson.diff === 'T' ? 8 : 6;
  const pairs = useMemo(() => shuffle(FORMULAS.map((f, i) => ({ ...f, i }))).slice(0, count), [count]);
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
        const xp = Math.max(5, 20 + (lesson.diff === 'T' ? 10 : 0) - mistakes * 2 + (secs < 30 ? 10 : secs < 60 ? 5 : 0));
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
        <div style={{ flex: 1 }}><Bar value={done.size / pairs.length} color="var(--theory)" height={18} /></div>
        <span className="stat"><Timer size={20} /><b>{secs}s</b></span>
      </div>
      <div className="lesson-body">
        <div className="q-head">
          <Asset name="brain_3d.png" size={64} className="q-face" />
          <div className="q-stem">
            <h2 className="match-title">{lesson.title}</h2>
            <p>Tap a name, then the formula that goes with it. Under 30 seconds earns a speed bonus.</p>
          </div>
        </div>
        <div className="match-grid">
          <div className="match-col">
            {left.map((p) => (
              <motion.button
                key={'l' + p.i}
                className={`tile ${done.has(p.i) ? 'gone' : ''} ${pickL === p.i ? 'sel' : ''}`}
                disabled={done.has(p.i)}
                onClick={() => { sfx.tap(); setPickL(p.i); }}
                animate={done.has(p.i) ? { scale: [1, 1.08, 0.96], opacity: 0.35 } : { scale: 1, opacity: 1 }}
              >
                {p.name}
              </motion.button>
            ))}
          </div>
          <div className="match-col">
            {right.map((p) => (
              <motion.button
                key={'r' + p.i}
                className={`tile formula-tile ${done.has(p.i) ? 'gone' : ''} ${pickR === p.i ? 'sel' : ''} ${bad === p.i ? 'bad' : ''}`}
                disabled={done.has(p.i) || pickL === null}
                onClick={() => { setPickR(p.i); }}
                animate={bad === p.i ? { x: [0, -8, 8, -5, 5, 0] } : done.has(p.i) ? { scale: [1, 1.08, 0.96], opacity: 0.35 } : { scale: 1, opacity: 1 }}
              >
                <Rich text={p.formula} />
              </motion.button>
            ))}
          </div>
        </div>
        {combo >= 3 && <p className="match-combo"><Asset name="fire_3d.png" size={20} /> {combo} in a row</p>}
      </div>
    </div>
  );
}
