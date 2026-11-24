'use client';
import { m } from 'framer-motion';
import { Calculator, Settings, Star } from 'lucide-react';
import { useCourse, type Chapter } from '@/lib/course';
import { learnLessons } from '@/lessons';
import { progressFrom } from '@/lib/progress';
import { sfx } from '@/lib/sound';
import { levelInfo, type Game } from '@/lib/store';
import type { PanelId } from './Game';
import { MiniBoard, useCountdown } from './Season';
import { Asset, Bar } from './ui';

export function TopBar({ g, openPanel, onHome }: { g: Game; openPanel: (p: PanelId) => void; onHome: () => void }) {
  const course = useCourse();
  const s = g.state;
  const lv = levelInfo(s.xp);
  const left = useCountdown();
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="me-chip" onClick={() => { sfx.tap(); openPanel('profile'); }} title="Profile & badges">
          <span className="me-avatar">
            <Asset name={g.profile?.avatar ?? course.mascot} size={36} />
            <span className="lv-badge">{lv.level}</span>
          </span>
          <span className="me-name">
            <b>{g.profile?.name}</b>
            <span className="lv-bar"><Bar value={lv.into / lv.span} height={10} color="linear-gradient(180deg, #7ef0ff, #22c3ee)" /></span>
          </span>
        </button>
        <button className="brand" onClick={onHome} title="All chapters">{course.title}</button>
      </div>
      <div className="stats">
        <button className="season-pill" onClick={() => { sfx.tap(); openPanel('board'); }} title="Season leaderboard">
          <Asset name="trophy_3d.png" size={22} /><span>{left}</span>
        </button>
        <span className="stat" title={`${s.streak}-day streak`}>
          <Asset name="fire_3d.png" size={30} />
          <b>{s.streak}</b>
        </span>
        <span className="stat" title="Coins (spend on hints)">
          <Asset name="coin_3d.png" size={30} />
          <b>{s.gems}</b>
        </span>
        {course.calculator && (
          <button className="icon-btn" onClick={() => openPanel('calc')} aria-label="Calculator" title="Calculator (basic, TVM, cash flows)">
            <Calculator size={20} />
          </button>
        )}
        <button className="icon-btn" onClick={() => openPanel('settings')} aria-label="Settings" title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}

/** Ticker symbol from a chapter: number + initials, e.g. "CH6·VB". */
const symbol = (ch: Chapter) => `${ch.number !== null ? 'CH' + ch.number : 'CH'}·${ch.title.split(/[\s&]+/).filter((w) => w.length > 2).map((w) => w[0]).join('').toUpperCase().slice(0, 3)}`;

/** Scrolling market ticker of the player's own progress per chapter. */
export function Ticker({ g }: { g: Game }) {
  const course = useCourse();
  const items = [
    { sym: 'XP', val: String(g.state.xp), up: g.state.todayXp > 0, chg: `+${g.state.todayXp} today` },
    ...course.chapters.map((ch) => {
      const p = chapterProgress(g, ch);
      const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
      return { sym: symbol(ch), val: `${pct}%`, up: pct > 0, chg: `${p.stars}★` };
    }),
    { sym: 'STREAK', val: `${g.state.streak}d`, up: g.state.streak > 0, chg: g.state.streak ? 'hot' : 'start today' },
  ];
  const row = items.map((it, i) => (
    <span key={i} className="tick">
      <b>{it.sym}</b> {it.val} <em className={it.up ? 'up' : 'flat'}>{it.up ? '▲' : '■'} {it.chg}</em>
    </span>
  ));
  // Seamless loop: the track holds two identical halves and slides left by exactly one half (-50%),
  // then restarts at a position that looks identical. Each half repeats the row 3× so it is always
  // wider than the screen, and spacing lives on each item (not a flex gap) so both halves match exactly.
  const half = (h: number) => (
    <div className="ticker-half" aria-hidden={h === 1 || undefined}>
      {[0, 1, 2].map((r) => <span key={r} className="ticker-row">{row}</span>)}
    </div>
  );
  return (
    <div className="ticker" aria-label="Your progress ticker">
      <div className="ticker-track">{half(0)}{half(1)}</div>
    </div>
  );
}

/** Decorative sparkline: a deterministic wiggle per chapter that trends up with progress. */
function Sparkline({ seed, progress }: { seed: string; progress: number }) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) / 2 ** 32);
  const n = 14;
  const pts = Array.from({ length: n }, (_, i) => {
    const trend = (i / (n - 1)) * (0.35 + progress * 0.6);
    const y = 1 - Math.min(0.95, Math.max(0.05, 0.25 + trend + (rand() - 0.5) * 0.28));
    return `${(i / (n - 1)) * 100},${(y * 40).toFixed(1)}`;
  });
  return (
    <svg className="spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
      <polygon points={`0,40 ${pts.join(' ')} 100,40`} fill="rgba(255,255,255,0.18)" />
      <polyline points={pts.join(' ')} fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const chapterProgress = (g: Game, ch: Chapter) => progressFrom(g.state.lessons, ch);

function ChapterCard({ ch, i, g, onOpen }: { ch: Chapter; i: number; g: Game; onOpen: () => void }) {
  const course = useCourse();
  const p = chapterProgress(g, ch);
  const missed = ch.questionKeys.filter((k) => g.state.missed.includes(k)).length;
  const learn = learnLessons(ch.id).length;
  return (
    <m.button
      className="ch-card"
      style={{ ['--c' as string]: ch.color }}
      onClick={() => { sfx.tap(); onOpen(); }}
      initial={{ opacity: 0, y: 40, rotate: -3 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.06 }}
      whileHover={{ y: -6, rotate: -1 }}
      whileTap={{ scale: 0.96 }}
    >
      <span className="ch-num">{ch.number ?? i + 1}</span>
      <Asset name={ch.icon} size={72} className="ch-icon" />
      <span className="ch-body">
        <small>{ch.number !== null ? `Chapter ${ch.number}` : 'Chapter'}</small>
        <b>{ch.title}</b>
        {ch.tagline && <em>{ch.tagline}</em>}
      </span>
      <span className="ch-foot">
        <span className="ch-meta">
          {learn > 0 && <span className="ch-learn">{learn} interactive lessons</span>}
          {course.parts.length > 1
            ? course.parts.map((pt) => {
                const n = ch.questionKeys.filter((k) => course.questions[k].part === pt.id).length;
                return n ? <span key={pt.id}>{n} {pt.label.toLowerCase()}</span> : null;
              })
            : <span>{ch.questionKeys.length} questions</span>}
          <span className="ch-stars"><Star size={14} fill="#facc15" stroke="#0b1220" strokeWidth={2.5} /> {p.stars}/{p.maxStars}</span>
          {missed > 0 && <span className="ch-missed">{missed} to review</span>}
          <Sparkline seed={ch.id} progress={p.total ? p.done / p.total : 0} />
        </span>
        <Bar value={p.total ? p.done / p.total : 0} height={12} color="linear-gradient(180deg, #fff27a, #ffc400)" />
      </span>
    </m.button>
  );
}

export default function Home({ g, onOpen, openPanel }: { g: Game; onOpen: (chapterId: string) => void; openPanel: (p: PanelId) => void }) {
  const course = useCourse();
  const s = g.state;
  const totalDone = course.allLessons.filter((l) => s.lessons[l.id]?.done).length;
  return (
    <main className="home">
      <div className="col-main">
        <div className="home-head">
          <h1 className="sc">Pick a chapter <Asset name="dollar_banknote_3d.png" size={48} className="head-icon" /></h1>
          <p>{course.subtitle || course.tagline}</p>
        </div>
        <div className="ch-grid">
          {course.chapters.map((ch, i) => <ChapterCard key={ch.id} ch={ch} i={i} g={g} onOpen={() => onOpen(ch.id)} />)}
        </div>
        {course.chapters.length === 0 && <p className="lb-empty">No chapters yet. Add JSON files to content/chapters/.</p>}
      </div>
      <aside className="side">
        <MiniBoard me={g.profile?.name} onOpen={() => openPanel('board')} />
        <div className="card">
          <div className="card-row">
            <Asset name="chart_increasing_3d.png" size={44} />
            <div style={{ flex: 1 }}>
              <h3>Daily goal</h3>
              <p className="muted">{Math.min(s.todayXp, s.dailyGoal)} / {s.dailyGoal} XP today</p>
            </div>
          </div>
          <Bar value={s.todayXp / s.dailyGoal} color="linear-gradient(180deg, #fff27a, #ffc400)" />
          <div className="card-row" style={{ marginTop: 4 }}>
            <Asset name="trophy_3d.png" size={44} />
            <div style={{ flex: 1 }}>
              <h3>Progress</h3>
              <p className="muted">{totalDone} of {course.allLessons.length} lessons · {s.achievements.length} badges</p>
            </div>
          </div>
          <Bar value={course.allLessons.length ? totalDone / course.allLessons.length : 0} color="linear-gradient(180deg, #8bff7a, #2bd64a)" />
        </div>
      </aside>
    </main>
  );
}
