'use client';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Calculator, ChevronDown, Lightbulb, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCourse, type Lesson as L } from '@/lib/course';
import { sfx } from '@/lib/sound';
import { HINT_COST, type Game } from '@/lib/store';
import { Asset, Bar, Btn, Modal, QText, Rich } from './ui';

type G = Game;
export type LessonResult = { xp: number; correctFirst: number; total: number; bestCombo: number; ms: number; mistakes: number; kind: 'quiz' | 'match' };

const PRAISE = ['Excellent!', 'Nicely done!', 'Spot on!', 'You nailed it!', 'Big brain!', 'Boom!', 'Brilliant!', 'Correct!'];
const OOPS = ['Not quite.', 'So close!', 'Almost there.', 'Keep going!'];
const LETTERS = 'ABCDEFGHIJ'.split('');

function burst(el: HTMLElement | null, big = false) {
  try {
    const r = el?.getBoundingClientRect();
    const x = r ? (r.left + r.width / 2) / window.innerWidth : 0.5;
    const y = r ? (r.top + r.height / 2) / window.innerHeight : 0.7;
    confetti({ particleCount: big ? 140 : 50, spread: big ? 100 : 65, startVelocity: big ? 45 : 32, origin: { x, y }, colors: ['#ffc800', '#58cc02', '#1cb0f6', '#ff4b4b', '#a560ff'], scalar: 0.9, disableForReducedMotion: true });
  } catch { /* noop */ }
}

export default function Lesson({ g, lesson, onExit, onFinish, openCalc }: { g: G; lesson: L; onExit: () => void; onFinish: (r: LessonResult) => void; openCalc: () => void }) {
  const course = useCourse();
  const chapter = course.chapterMap[lesson.chapterId];
  const [queue, setQueue] = useState<string[]>(() => [...lesson.questionKeys]);
  const [pos, setPos] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [gain, setGain] = useState(0);
  const [missed, setMissed] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState<Set<string>>(new Set());
  const [showSol, setShowSol] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [hinted, setHinted] = useState<Set<string>>(new Set());
  const [comboFlash, setComboFlash] = useState<number | null>(null);
  const [quitAsk, setQuitAsk] = useState(false);
  const t0 = useRef(Date.now());
  const checkRef = useRef<HTMLButtonElement>(null);

  const qid = queue[pos];
  const q = course.questions[qid];
  const total = lesson.questionKeys.length;
  const progress = solved.size / total;
  const isRetry = pos >= total; // re-queued after a miss
  const hint = useMemo(() => course.hintFor(q), [q, course]);
  const diff = course.diff(q.difficulty);

  const check = useCallback(() => {
    if (sel === null || status !== 'idle') return;
    const ok = sel === q.answer;
    if (ok) {
      const c = combo + 1;
      const base = isRetry ? Math.ceil(diff.xp / 2) : diff.xp;
      const bonus = isRetry ? 0 : Math.min(c - 1, 5) * 2;
      const earned = base + bonus;
      setCombo(c);
      setBestCombo((b) => Math.max(b, c));
      setXp((x) => x + earned);
      setGain(earned);
      setStatus('correct');
      setSolved((s) => new Set(s).add(qid));
      if (c > 0 && c % 5 === 0) {
        sfx.combo();
        setComboFlash(c);
        setTimeout(() => setComboFlash(null), 1400);
        burst(null, true);
      } else {
        sfx.correct();
        burst(checkRef.current);
      }
      g.update((s) => ({
        ...s,
        missed: isRetry ? s.missed : s.missed.filter((k) => k !== qid),
        stats: { ...s.stats, correct: s.stats.correct + 1, answered: s.stats.answered + 1, bestCombo: Math.max(s.stats.bestCombo, c) },
      }));
    } else {
      sfx.wrong();
      setCombo(0);
      setStatus('wrong');
      setGain(0);
      setMissed((m) => new Set(m).add(qid));
      setQueue((qq) => [...qq, qid]);
      g.update((s) => ({
        ...s,
        missed: s.missed.includes(qid) ? s.missed : [...s.missed, qid],
        stats: { ...s.stats, answered: s.stats.answered + 1 },
      }));
    }
  }, [sel, status, q, combo, isRetry, qid, g, diff.xp]);

  const next = useCallback(() => {
    if (status === 'idle') return;
    if (pos + 1 >= queue.length) {
      const correctFirst = total - missed.size;
      onFinish({ xp, correctFirst, total, bestCombo, ms: Date.now() - t0.current, mistakes: queue.length - total, kind: 'quiz' });
      return;
    }
    setPos((p) => p + 1);
    setSel(null);
    setStatus('idle');
    setShowSol(false);
    setHintOpen(false);
  }, [status, pos, queue.length, total, missed.size, xp, bestCombo, onFinish]);

  // keyboard: 1–5 choose, Enter check/continue
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const n = parseInt(e.key, 10);
      if (status === 'idle' && n >= 1 && n <= q.choices.length) { setSel(n - 1); sfx.tap(); }
      if (e.key === 'Enter') { if (status === 'idle') check(); else next(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, check, next]);

  const buyHint = () => {
    if (hinted.has(qid)) { setHintOpen((o) => !o); return; }
    if (g.state.gems < HINT_COST) return;
    g.update((s) => ({ ...s, gems: s.gems - HINT_COST }));
    setHinted((h) => new Set(h).add(qid));
    setHintOpen(true);
    sfx.unlock();
  };

  return (
    <div className={`lesson ${status}`}>
      <div className="lesson-top">
        <button className="icon-btn" onClick={() => setQuitAsk(true)} aria-label="Quit lesson"><X size={26} /></button>
        <div style={{ flex: 1 }}><Bar value={progress} color="var(--green)" height={18} /></div>
        <AnimatePresence>
          {combo >= 2 && (
            <motion.span key={combo} className="combo-chip" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}>
              <Asset name="fire_3d.png" size={20} /> {combo}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="stat"><Asset name="high_voltage_3d.png" size={26} /><b>{xp}</b></span>
      </div>

      <motion.div className="lesson-body" key={'shake' + pos + status} animate={status === 'wrong' ? { x: [0, -14, 12, -8, 6, 0] } : { x: 0 }} transition={{ duration: 0.45 }}>
        <div className="q-meta">
          <span className="pill" style={{ ['--c' as string]: diff.color }}>{diff.label}</span>
          <span className="pill ghost">{q.topic}</span>
          {q.source && <span className="pill ghost">{q.source}</span>}
          {isRetry && <span className="pill retry">Second chance · half XP</span>}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={qid + pos} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.22 }}>
            <div className="q-head">
              <Asset name={status === 'wrong' ? 'pensive_face_3d.png' : status === 'correct' ? 'star-struck_3d.png' : 'thinking_face_3d.png'} size={64} className="q-face" />
              <div className="q-stem">
                <QText text={q.question} />
              </div>
            </div>

            <div className="options">
              {q.choices.map((o, i) => {
                const state = status === 'idle' ? (sel === i ? 'sel' : '') : i === q.answer ? 'right' : sel === i ? 'bad' : 'dim';
                return (
                  <motion.button
                    key={i}
                    className={`opt ${state}`}
                    disabled={status !== 'idle'}
                    onClick={() => { setSel(i); sfx.tap(); }}
                    animate={state === 'bad' ? { x: [0, -10, 10, -6, 6, 0] } : state === 'right' && status === 'correct' ? { scale: [1, 1.04, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <span className="opt-key">{LETTERS[i]}</span>
                    <span className="opt-text">{o}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {hintOpen && hint && (
            <motion.div className="hint-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
              <Asset name="light_bulb_3d.png" size={36} />
              <div>
                <b>{hint.title}</b>
                {hint.lines.map((l, i) => <div key={i} className="formula"><Rich text={l} /></div>)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {status === 'correct' && !comboFlash && (
          <motion.div key={'xp' + pos} className="xp-pop" initial={{ scale: 0.2, y: 40, opacity: 0 }} animate={{ scale: [0.2, 1.3, 1], y: -40, opacity: [0, 1, 1, 0] }} transition={{ duration: 1.1, times: [0, 0.3, 0.7, 1] }}>
            +{gain} XP
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {comboFlash && (
          <motion.div className="combo-flash" initial={{ scale: 0.3, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: 1.4, opacity: 0 }}>
            <Asset name="high_voltage_3d.png" size={70} />
            <span>{comboFlash} IN A ROW!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className={`lesson-foot ${status}`}>
        <div className="foot-inner">
          {status === 'idle' ? (
            <>
              <div className="foot-tools">
                {hint && <Btn variant="secondary" onClick={buyHint} disabled={!hinted.has(qid) && g.state.gems < HINT_COST} title="Show a hint">
                  <Lightbulb size={18} /> {hinted.has(qid) ? 'Hint' : `Hint · ${HINT_COST}`}
                  {!hinted.has(qid) && <Asset name="gem_stone_3d.png" size={16} />}
                </Btn>}
                {course.calculator && chapter?.calculator && (
                  <Btn variant="secondary" onClick={openCalc} title="Open the financial calculator"><Calculator size={18} /> Calculator</Btn>
                )}
              </div>
              <Btn ref={checkRef} variant="primary" disabled={sel === null} onClick={check} className="check-btn">Check</Btn>
            </>
          ) : (
            <motion.div className="verdict" initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
              <div className="verdict-row">
                <div className="verdict-msg">
                  <span className="verdict-icon">
                    <Asset name={status === 'correct' ? 'party_popper_3d.png' : 'broken_heart_3d.png'} size={44} />
                  </span>
                  <div>
                    <h3>{status === 'correct' ? PRAISE[(pos + qid.length) % PRAISE.length] : OOPS[pos % OOPS.length]}</h3>
                    {status === 'correct' ? (
                      <p>+{gain} XP{combo >= 2 ? ` · ${combo}× combo` : ''}</p>
                    ) : (
                      <p>Correct answer: <b>{LETTERS[q.answer]}. {q.choices[q.answer]}</b>. This one comes back at the end.</p>
                    )}
                  </div>
                </div>
                <Btn variant={status === 'correct' ? 'primary' : 'danger'} onClick={next} className="check-btn">Continue</Btn>
              </div>
              {q.explanation && (
                <button className="sol-toggle" onClick={() => setShowSol((v) => !v)} aria-expanded={showSol}>
                  <BookOpen size={16} /> {showSol ? 'Hide' : 'Show'} the explanation <ChevronDown size={16} style={{ transform: showSol ? 'rotate(180deg)' : undefined }} />
                </button>
              )}

              <AnimatePresence>
                {showSol && (
                  <motion.pre className="solution" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    {q.explanation}
                  </motion.pre>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </footer>

      <Modal open={quitAsk} onClose={() => setQuitAsk(false)} title="Quit this lesson?">
        <div className="center-col">
          <Asset name={course.mascot} size={84} />
          <p>You&apos;ll lose the XP from this lesson so far.</p>
          <Btn variant="primary" block onClick={() => setQuitAsk(false)}>Keep learning</Btn>
          <Btn variant="ghost" block onClick={onExit}>Quit</Btn>
        </div>
      </Modal>
    </div>
  );
}
