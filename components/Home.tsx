'use client';
import { motion } from 'framer-motion';
import { Calculator, Check, Crown, Lock, Settings, Star, Trophy, Zap } from 'lucide-react';
import { DIFF_LABEL, QUESTIONS, WORLDS, type Lesson } from '@/lib/data';
import { levelInfo, MAX_HEARTS, type useGame } from '@/lib/store';
import { sfx } from '@/lib/sound';
import type { PanelId } from './Game';
import { MiniBoard, useCountdown } from './Season';
import { Asset, Bar } from './ui';

type G = ReturnType<typeof useGame>;

export function TopBar({ g, openPanel }: { g: G; openPanel: (p: PanelId) => void }) {
  const s = g.state;
  const lv = levelInfo(s.xp);
  const left = useCountdown();
  return (
    <header className="topbar">
      <button className="me-chip" onClick={() => { sfx.tap(); openPanel('profile'); }} title="Profile & badges">
        <span className="me-avatar">
          <Asset name={g.profile?.avatar ?? 'pig_face_3d.png'} size={36} />
          <span className="lv-badge">{lv.level}</span>
        </span>
        <span className="me-name">
          <b>{g.profile?.name}</b>
          <span className="lv-bar"><Bar value={lv.into / lv.span} height={10} color="linear-gradient(180deg, #d1a8ff, #a45cff)" /></span>
        </span>
      </button>
      <div className="stats">
        <button className="season-pill" onClick={() => { sfx.tap(); openPanel('board'); }} title="Season leaderboard">
          <Asset name="trophy_3d.png" size={22} /><span>{left}</span>
        </button>
        <span className="stat" title={`${s.streak}-day streak`}>
          <Asset name="fire_3d.png" size={30} />
          <b>{s.streak}</b>
        </span>
        <span className="stat" title="Gems">
          <Asset name="gem_stone_3d.png" size={30} />
          <b>{s.gems}</b>
        </span>
        <span className="stat" title="Hearts">
          <Asset name="red_heart_3d.png" size={30} />
          <b>{s.settings.unlimitedHearts ? '∞' : `${s.hearts}/${MAX_HEARTS}`}</b>
        </span>
        <button className="icon-btn" onClick={() => openPanel('calc')} aria-label="TVM calculator" title="TVM calculator">
          <Calculator size={20} />
        </button>
        <button className="icon-btn" onClick={() => openPanel('settings')} aria-label="Settings" title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}

function DailyCard({ g, openPanel }: { g: G; openPanel: (p: PanelId) => void }) {
  const s = g.state;
  const pct = s.todayXp / s.dailyGoal;
  const done = Object.values(s.lessons).filter((l) => l.done).length;
  const total = WORLDS.flatMap((w) => w.sections.flatMap((x) => x.lessons)).length;
  return (
    <aside className="side">
      <MiniBoard me={g.profile?.name} onOpen={() => openPanel('board')} />
      <div className="card daily">
        <div className="card-row">
          <Asset name="chart_increasing_3d.png" size={44} />
          <div style={{ flex: 1 }}>
            <h3>Daily goal</h3>
            <p className="muted">{Math.min(s.todayXp, s.dailyGoal)} / {s.dailyGoal} XP today</p>
          </div>
        </div>
        <Bar value={pct} color="var(--gold)" />
        {pct >= 1 && <p className="goal-done">Goal smashed. Interest is compounding.</p>}
      </div>
      <div className="card">
        <div className="card-row">
          <Asset name="trophy_3d.png" size={44} />
          <div>
            <h3>Progress</h3>
            <p className="muted">{done} of {total} lessons · {g.state.achievements.length} badges</p>
          </div>
        </div>
        <Bar value={done / total} color="var(--green)" />
      </div>
      <div className="card tips">
        <h3>How it works</h3>
        <ul>
          <li><Zap size={16} /> Easy +10 XP, Medium +15, Tough +25, plus combo bonus</li>
          <li><Asset name="trophy_3d.png" size={16} /> Every win drops a chest. 3 stars = Golden, flawless = Magic</li>
          <li><Asset name="hourglass_done_3d.png" size={16} /> Season XP ranks you. Everything resets each Monday</li>
          <li><Asset name="red_heart_3d.png" size={16} /> A wrong answer costs a heart and comes back later</li>
          <li><Asset name="light_bulb_3d.png" size={16} /> Hints cost 5 gems; book solutions are free after you answer</li>
          <li><Calculator size={16} /> A TVM calculator lives in the top bar</li>
        </ul>
        <p className="muted small">{QUESTIONS.length} questions from the Black Book TVM chapter.</p>
      </div>
    </aside>
  );
}

const OFFSETS = [0, 52, 84, 52, 0, -52, -84, -52];

function PathNode({ lesson, index, state, color, stars, onStart }: { lesson: Lesson; index: number; state: 'locked' | 'open' | 'current' | 'done'; color: string; stars: number; onStart: () => void }) {
  const isMatch = lesson.kind === 'match';
  return (
    <div className="node-wrap" style={{ transform: `translateX(${OFFSETS[index % OFFSETS.length]}px)` }}>
      {state === 'current' && (
        <motion.div className="start-tip" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          PLAY!
        </motion.div>
      )}
      <motion.button
        key={state}
        className={`node ${state} ${isMatch ? 'match' : ''}`}
        style={{ ['--c' as string]: `var(${color})`, rotate: isMatch ? 0 : 45 }}
        initial={{ scale: 0 }}
        animate={state === 'current' ? { scale: [1, 1.08, 1], y: [0, -4, 0] } : { scale: 1 }}
        transition={state === 'current' ? { repeat: Infinity, duration: 1.4, ease: 'easeInOut' } : { type: 'spring', stiffness: 380, damping: 14, delay: Math.min(index, 10) * 0.03 }}
        whileHover={state !== 'locked' ? { scale: 1.1 } : undefined}
        whileTap={state !== 'locked' ? { scaleX: 1.15, scaleY: 0.85 } : { x: [0, -6, 6, 0] }}
        onClick={() => {
          if (state === 'locked') return;
          sfx.tap();
          onStart();
        }}
        aria-label={`${lesson.title}${state === 'locked' ? ' (locked)' : ''}`}
      >
        {state === 'locked' ? <Lock size={30} /> : state === 'done' ? (isMatch ? <Check size={34} strokeWidth={3} /> : <Crown size={32} strokeWidth={2.5} />) : isMatch ? <Asset name="brain_3d.png" size={42} /> : <Star size={34} fill="currentColor" />}
        {state === 'current' && <span className="ring" />}
      </motion.button>
      <div className={`node-label ${state}`}>
        <b>{lesson.title}</b>
        <span>{isMatch ? 'Formula match' : `${lesson.questionIds.length} questions · ${DIFF_LABEL[lesson.diff]}`}</span>
        {stars > 0 && (
          <span className="node-stars" aria-label={`${stars} stars`}>
            {[1, 2, 3].map((i) => <Star key={i} size={14} fill={i <= stars ? '#ffcc1f' : 'rgba(255,255,255,0.35)'} stroke="#16204a" strokeWidth={2.5} />)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Home({ g, world, setWorld, onStart, openPanel }: { g: G; world: 'theory' | 'math'; setWorld: (w: 'theory' | 'math') => void; onStart: (id: string) => void; openPanel: (p: PanelId) => void }) {
  const w = WORLDS.find((x) => x.id === world)!;
  const seq = w.sections.flatMap((s) => s.lessons);
  const currentId = seq.find((l) => g.isUnlocked(l.id) && !g.state.lessons[l.id]?.done)?.id;
  let idx = 0;

  return (
    <>
      <TopBar g={g} openPanel={openPanel} />
      <main className="home">
        <div className="col-main">
          <div className="world-tabs" role="tablist">
            {WORLDS.map((x) => (
              <button
                key={x.id}
                role="tab"
                aria-selected={world === x.id}
                className={`world-tab ${x.id} ${world === x.id ? 'active' : ''}`}
                onClick={() => {
                  sfx.tap();
                  setWorld(x.id);
                }}
              >
                <Asset name={x.icon} size={44} />
                <span>
                  <b>Part {x.id === 'theory' ? 1 : 2}: {x.name}</b>
                  <small>{x.tagline}</small>
                </span>
              </button>
            ))}
          </div>

          {w.sections.map((sec) => {
            const doneN = sec.lessons.filter((l) => g.state.lessons[l.id]?.done).length;
            return (
              <section key={sec.id} className="section">
                <div className="section-banner" style={{ ['--c' as string]: `var(${sec.color})` }}>
                  <div>
                    <small>{w.name} · {doneN}/{sec.lessons.length} done</small>
                    <h2>{sec.name}</h2>
                    <p>{sec.blurb}</p>
                  </div>
                  <Asset name={sec.icon} size={84} className="banner-art" />
                </div>
                <div className="path">
                  {sec.lessons.map((l) => {
                    const i = idx++;
                    const st = g.state.lessons[l.id]?.done ? 'done' : l.id === currentId ? 'current' : g.isUnlocked(l.id) ? 'open' : 'locked';
                    return (
                      <div key={l.id} className="path-row">
                        <PathNode lesson={l} index={i} state={st} color={sec.color} stars={g.state.lessons[l.id]?.stars ?? 0} onStart={() => onStart(l.id)} />
                        {l.id === currentId && (
                          <motion.div className="mascot-peek" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ [OFFSETS[i % OFFSETS.length] >= 0 ? 'left' : 'right']: '6%' }}>
                            <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ repeat: Infinity, duration: 3 }}>
                              <Asset name="pig_face_3d.png" size={72} alt="Penny the pig" />
                            </motion.div>
                            <span className="bubble">{doneN === 0 && i === 0 ? "Let's grow some money!" : 'Next stop!'}</span>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <div className="path-end">
            <Asset name={world === 'theory' ? 'graduation_cap_3d.png' : 'trophy_3d.png'} size={72} />
            <p>{world === 'theory' ? 'Finish Theory to earn the Theorist badge' : 'Tame the volcano to become a Time Lord'}</p>
            <button className="link-btn" onClick={() => openPanel('profile')}>
              <Trophy size={16} /> See badges
            </button>
          </div>
        </div>
        <DailyCard g={g} openPanel={openPanel} />
      </main>
    </>
  );
}
