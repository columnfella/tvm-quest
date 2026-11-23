'use client';
import { motion } from 'framer-motion';
import { Calculator, Check, Crown, Lock, Settings, Star, Trophy, Zap } from 'lucide-react';
import { DIFF_LABEL, QUESTIONS, WORLDS, type Lesson } from '@/lib/data';
import { levelInfo, MAX_HEARTS, type useGame } from '@/lib/store';
import { sfx } from '@/lib/sound';
import { Asset, Bar } from './ui';

type G = ReturnType<typeof useGame>;

export function TopBar({ g, openPanel }: { g: G; openPanel: (p: 'profile' | 'settings' | 'calc') => void }) {
  const s = g.state;
  const lv = levelInfo(s.xp);
  return (
    <header className="topbar">
      <div className="brand">
        <Asset name="pig_face_3d.png" size={34} />
        <span>TVM Quest</span>
      </div>
      <div className="stats">
        <span className="stat" title={`${s.streak}-day streak`}>
          <Asset name="fire_3d.png" size={24} />
          <b style={{ color: s.lastDay ? 'var(--orange)' : 'var(--muted)' }}>{s.streak}</b>
        </span>
        <span className="stat" title="Gems">
          <Asset name="gem_stone_3d.png" size={24} />
          <b style={{ color: 'var(--blue)' }}>{s.gems}</b>
        </span>
        <span className="stat" title="Hearts">
          <Asset name="red_heart_3d.png" size={24} />
          <b style={{ color: 'var(--red)' }}>{s.settings.unlimitedHearts ? '∞' : `${s.hearts}/${MAX_HEARTS}`}</b>
        </span>
        <button className="stat level" onClick={() => openPanel('profile')} title="Profile & badges">
          <span className="lv-badge">{lv.level}</span>
          <span className="lv-bar">
            <Bar value={lv.into / lv.span} height={8} color="var(--gold)" />
          </span>
        </button>
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

function DailyCard({ g }: { g: G }) {
  const s = g.state;
  const pct = s.todayXp / s.dailyGoal;
  const done = Object.values(s.lessons).filter((l) => l.done).length;
  const total = WORLDS.flatMap((w) => w.sections.flatMap((x) => x.lessons)).length;
  return (
    <aside className="side">
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

function PathNode({ lesson, index, state, color, onStart }: { lesson: Lesson; index: number; state: 'locked' | 'open' | 'current' | 'done'; color: string; onStart: () => void }) {
  const isMatch = lesson.kind === 'match';
  return (
    <div className="node-wrap" style={{ transform: `translateX(${OFFSETS[index % OFFSETS.length]}px)` }}>
      {state === 'current' && (
        <motion.div className="start-tip" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
          START
        </motion.div>
      )}
      <motion.button
        className={`node ${state} ${isMatch ? 'match' : ''}`}
        style={{ ['--c' as string]: `var(${color})` }}
        whileHover={state !== 'locked' ? { scale: 1.06 } : undefined}
        whileTap={state !== 'locked' ? { scale: 0.94 } : undefined}
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
      </div>
    </div>
  );
}

export default function Home({ g, world, setWorld, onStart, openPanel }: { g: G; world: 'theory' | 'math'; setWorld: (w: 'theory' | 'math') => void; onStart: (id: string) => void; openPanel: (p: 'profile' | 'settings' | 'calc') => void }) {
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
                        <PathNode lesson={l} index={i} state={st} color={sec.color} onStart={() => onStart(l.id)} />
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
        <DailyCard g={g} />
      </main>
    </>
  );
}
