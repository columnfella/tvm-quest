'use client';
// The reusable Interactive Lesson Template: Concept → Explore → Formula (+ optional derivation) → Practice → Complete.
// It owns navigation, progress, XP and the completion screen; the lesson file supplies every bit of content.
import confetti from '@/lib/confetti';
import { AnimatePresence, m } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calculator, Check, RotateCcw, Star, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chapter } from '@/lib/course';
import { learnReward, starsFor, type LearnLesson, type LessonContent } from '@/lib/learn';
import { sfx } from '@/lib/sound';
import { completeDay, levelInfo, type Game } from '@/lib/store';
import { chapterProgress } from '../Home';
import { Asset, Bar, Btn } from '../ui';
import Assessment, { type CheckResult } from './Assessment';
import { Expand } from './kit';

type StageId = 'intro' | 'explore' | 'formula' | 'practice' | 'done';
const LABELS: Record<StageId, string> = { intro: 'Concept', explore: 'Explore', formula: 'Formula', practice: 'Practice', done: 'Done' };
const NEXT_LABEL: Partial<Record<StageId, string>> = { intro: 'Explore it', explore: 'See the maths', formula: 'Practice' };

type Outcome = { xp: number; coins: number; repeat: boolean; stars: number; firstTry: number; total: number; levelUp: number | null };

/** Loads a lesson's code on demand, then shows it in the template. */
export default function LearnScreen(props: { g: Game; chapter: Chapter; lesson: LearnLesson; lessons: LearnLesson[]; onExit: () => void; onOpen: (l: LearnLesson) => void; openCalc?: () => void }) {
  const [content, setContent] = useState<LessonContent | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setContent(null);
    setError(false);
    props.lesson.load().then((mod) => alive && setContent(mod.default)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [props.lesson, attempt]);
  if (content) return <LessonShell key={props.lesson.id} {...props} content={content} />;
  return (
    <div className="onboard">
      <div className="center-col">
        {error ? (
          <>
            <p className="loading-text">Couldn&apos;t load this lesson. Check your connection.</p>
            <button className="btn3d btn-gold" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
            <button className="link-btn" onClick={props.onExit}>Back</button>
          </>
        ) : <span className="spinner" aria-label="Loading lesson" />}
      </div>
    </div>
  );
}

export function LessonShell({ g, chapter, lesson, lessons, content, onExit, onOpen, openCalc }: {
  g: Game; chapter: Chapter; lesson: LearnLesson; lessons: LearnLesson[]; content: LessonContent; onExit: () => void; onOpen: (l: LearnLesson) => void; openCalc?: () => void;
}) {
  const stages: StageId[] = ['intro', 'explore', 'formula', ...(content.checks.length ? (['practice'] as const) : []), 'done'];
  const [at, setAt] = useState(0);
  const [reached, setReached] = useState(0);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const stage = stages[at];
  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const next = lessons[idx + 1] ?? null;
  const solved = content.checks.filter((c) => results[c.id]?.solved).length;
  const allSolved = solved === content.checks.length;
  const topRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((i: number) => {
    setAt(i);
    setReached((r) => Math.max(r, i));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const onResult = (id: string, r: CheckResult) => {
    const prev = results[id];
    setResults((rs) => ({ ...rs, [id]: r }));
    // first attempts count toward the global accuracy stats, like exercise questions
    if (!prev?.attempts && r.attempts === 1) {
      g.update((s) => ({ ...s, stats: { ...s.stats, answered: s.stats.answered + 1, correct: s.stats.correct + (r.firstTry ? 1 : 0) } }));
    }
  };

  const finish = () => {
    const total = content.checks.length;
    const firstTry = content.checks.filter((c) => results[c.id]?.firstTry).length;
    const stars = starsFor(firstTry, total);
    const reward = learnReward(g.state.lessons[lesson.id], stars);
    const before = levelInfo(g.state.xp).level;
    const after = levelInfo(g.state.xp + reward.xp).level;
    const acc = total ? firstTry / total : 1;
    g.update((s) => {
      const p = s.lessons[lesson.id];
      return completeDay({
        ...s,
        xp: s.xp + reward.xp,
        todayXp: s.todayXp + reward.xp,
        gems: s.gems + reward.coins,
        lessons: { ...s.lessons, [lesson.id]: { done: true, stars: Math.max(p?.stars ?? 0, stars), bestAcc: Math.max(p?.bestAcc ?? 0, acc), plays: (p?.plays ?? 0) + 1 } },
        stats: { ...s.stats, perfect: s.stats.perfect + (total > 0 && firstTry === total ? 1 : 0) },
      });
    });
    setOutcome({ ...reward, stars, firstTry, total, levelUp: after > before ? after : null });
    sfx.complete();
    if (!reward.repeat) {
      try { confetti({ particleCount: 90, spread: 80, origin: { y: 0.35 }, disableForReducedMotion: true }); } catch { /* noop */ }
    }
    goTo(stages.length - 1);
  };

  const retake = () => { setResults({}); setOutcome(null); goTo(stages.indexOf('practice')); };
  const forward = () => {
    sfx.tap();
    if (stage === 'practice' || (stage === 'formula' && !content.checks.length)) finish();
    else goTo(at + 1);
  };

  return (
    <div className="learn" style={{ ['--c' as string]: chapter.color }} ref={topRef}>
      <header className="learn-top">
        <button className="icon-btn" onClick={onExit} aria-label="Back to the chapter" title="Back to the chapter"><X size={22} strokeWidth={3} /></button>
        <div className="learn-title">
          <small>{chapter.number !== null ? `Chapter ${chapter.number}` : chapter.title} · Lesson {idx + 1} of {lessons.length}</small>
          <h1>{lesson.title}</h1>
        </div>
        <Asset name={lesson.icon} size={44} className="learn-icon" eager />
      </header>

      <nav className="stepper" aria-label="Lesson steps">
        {stages.filter((s) => s !== 'done').map((s, i) => (
          <button key={s} className={`step ${i === at ? 'cur' : ''} ${i < reached || stage === 'done' ? 'seen' : ''}`} disabled={i > reached} onClick={() => goTo(i)} aria-current={i === at ? 'step' : undefined}>
            <span className="step-n">{i < reached || stage === 'done' ? <Check size={14} strokeWidth={4} /> : i + 1}</span>
            <span className="step-l">{LABELS[s]}</span>
          </button>
        ))}
      </nav>

      <main className="learn-body">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={stage} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            {stage === 'intro' && <div className="stage">{content.intro}</div>}
            {stage === 'explore' && <div className="stage">{content.explore}</div>}
            {stage === 'formula' && (
              <div className="stage">
                {content.formula}
                {content.derivation && (
                  <Expand title={<><Asset name="light_bulb_3d.png" size={24} /> {content.derivation.title}</>}>
                    {content.derivation.body}
                  </Expand>
                )}
              </div>
            )}
            {stage === 'practice' && (
              <div className="stage">
                <p className="stage-lead">Use what you just explored. Wrong answers explain what went wrong, and you can retry as often as you like. Stars count first tries.</p>
                <Assessment checks={content.checks} results={results} onResult={onResult} />
              </div>
            )}
            {stage === 'done' && outcome && (
              <Completion g={g} chapter={chapter} lesson={lesson} outcome={outcome} takeaways={content.takeaways} next={next} onOpen={onOpen} onExit={onExit} onReview={() => goTo(0)} onRetake={content.checks.length ? retake : null} />
            )}
          </m.div>
        </AnimatePresence>
      </main>

      {stage !== 'done' && (
        <footer className="learn-foot">
          <div className="learn-foot-in">
            <Btn variant="ghost" onClick={() => (at === 0 ? onExit() : goTo(at - 1))}><ArrowLeft size={18} /> {at === 0 ? 'Chapter' : 'Back'}</Btn>
            {stage === 'practice' && !allSolved && <span className="foot-note">{solved}/{content.checks.length} solved</span>}
            {openCalc && (
              <Btn variant="secondary" className="foot-calc" onClick={openCalc} title="Basic and financial calculator" aria-label="Calculator">
                <Calculator size={18} /> <span>Calculator</span>
              </Btn>
            )}
            <Btn variant={stage === 'practice' ? 'gold' : 'primary'} onClick={forward} disabled={stage === 'practice' && !allSolved}>
              {stage === 'practice' || (stage === 'formula' && !content.checks.length) ? 'Finish lesson' : NEXT_LABEL[stage]} <ArrowRight size={18} />
            </Btn>
          </div>
        </footer>
      )}
    </div>
  );
}

function Completion({ g, chapter, lesson, outcome, takeaways, next, onOpen, onExit, onReview, onRetake }: {
  g: Game; chapter: Chapter; lesson: LearnLesson; outcome: Outcome; takeaways?: string[]; next: LearnLesson | null;
  onOpen: (l: LearnLesson) => void; onExit: () => void; onReview: () => void; onRetake: (() => void) | null;
}) {
  const p = chapterProgress(g, chapter);
  const best = g.state.lessons[lesson.id]?.stars ?? outcome.stars;
  return (
    <div className="learn-done">
      <m.div className="victory" initial={{ scale: 2.4, opacity: 0, rotate: -6 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 16 }}>
        <h1>LESSON COMPLETE!</h1>
      </m.div>
      <div className="stars" aria-label={`${outcome.stars} of 3 stars`}>
        {[1, 2, 3].map((i) => (
          <m.span key={i} initial={{ scale: 0, rotate: -90 }} animate={{ scale: i <= outcome.stars ? 1 : 0.8, rotate: 0 }} transition={{ delay: 0.2 + i * 0.18, type: 'spring', stiffness: 300, damping: 12 }}>
            <Star size={i === 2 ? 58 : 46} fill={i <= outcome.stars ? 'var(--yellow)' : 'var(--line)'} stroke={i <= outcome.stars ? 'var(--yellow-dark)' : 'var(--line)'} strokeWidth={2} />
          </m.span>
        ))}
      </div>

      <div className="result-tiles">
        <div className="tile-stat gold">
          <small>XP earned</small>
          <b><Asset name="high_voltage_3d.png" size={26} /> +{outcome.xp}</b>
        </div>
        <div className="tile-stat green">
          <small>First-try score</small>
          <b><Asset name="hundred_points_3d.png" size={26} /> {outcome.firstTry}/{outcome.total}</b>
        </div>
        <div className="tile-stat orange">
          <small>Coins</small>
          <b><Asset name="coin_3d.png" size={26} /> +{outcome.coins}</b>
        </div>
        <div className="tile-stat blue">
          <small>Best stars</small>
          <b><Asset name="star_3d.png" size={26} /> {best}/3</b>
        </div>
      </div>
      {outcome.repeat && (
        <p className="done-note">You already completed this lesson, so XP is only given for new stars ({outcome.xp ? `+${outcome.xp} for beating your best` : 'no new stars this time'}).</p>
      )}
      {outcome.levelUp && <p className="done-level"><Asset name="crown_3d.png" size={30} /> Level up! You reached level {outcome.levelUp}.</p>}

      <div className="card done-progress">
        <div className="card-row">
          <Asset name={chapter.icon} size={40} />
          <div style={{ flex: 1 }}>
            <h3>{chapter.title}</h3>
            <p className="muted small">{p.done} of {p.total} lessons and exercise sets done</p>
          </div>
        </div>
        <Bar value={p.total ? p.done / p.total : 0} color="linear-gradient(180deg, #fff27a, #ffc400)" />
      </div>

      {takeaways && takeaways.length > 0 && (
        <div className="card takeaways">
          <h3>Remember</h3>
          <ul>{takeaways.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}

      <div className="result-actions">
        {next ? <Btn variant="primary" onClick={() => onOpen(next)}>Next: {next.title} <ArrowRight size={18} /></Btn> : <Btn variant="primary" onClick={onExit}>Back to the chapter</Btn>}
      </div>
      <div className="done-links">
        {onRetake && <button className="link-btn" onClick={onRetake}><RotateCcw size={16} /> Retake the questions</button>}
        <button className="link-btn" onClick={onReview}>Review the lesson</button>
        {next && <button className="link-btn" onClick={onExit}>Back to the chapter</button>}
      </div>
    </div>
  );
}
