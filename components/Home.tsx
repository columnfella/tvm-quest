'use client';
import { motion } from 'framer-motion';
import { Calculator, Settings, Star } from 'lucide-react';
import { useCourse, type Chapter } from '@/lib/course';
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
        <span className="stat" title="Gems (spend on hints)">
          <Asset name="gem_stone_3d.png" size={30} />
          <b>{s.gems}</b>
        </span>
        {course.calculator && (
          <button className="icon-btn" onClick={() => openPanel('calc')} aria-label="Financial calculator" title="Financial calculator">
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

export function chapterProgress(g: Game, ch: Chapter) {
  const lessons = ch.sections.flatMap((s) => s.lessons);
  const done = lessons.filter((l) => g.state.lessons[l.id]?.done).length;
  const stars = lessons.reduce((a, l) => a + (g.state.lessons[l.id]?.stars ?? 0), 0);
  return { done, total: lessons.length, stars, maxStars: lessons.length * 3 };
}

function ChapterCard({ ch, i, g, onOpen }: { ch: Chapter; i: number; g: Game; onOpen: () => void }) {
  const p = chapterProgress(g, ch);
  const missed = ch.questionKeys.filter((k) => g.state.missed.includes(k)).length;
  return (
    <motion.button
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
          <span>{ch.questionKeys.length} questions</span>
          <span className="ch-stars"><Star size={14} fill="#ffd60a" stroke="#120a2a" strokeWidth={2.5} /> {p.stars}/{p.maxStars}</span>
          {missed > 0 && <span className="ch-missed">{missed} to review</span>}
        </span>
        <Bar value={p.total ? p.done / p.total : 0} height={12} color="linear-gradient(180deg, #fff27a, #ffc400)" />
      </span>
    </motion.button>
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
          <h1 className="sc">Pick a chapter</h1>
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
