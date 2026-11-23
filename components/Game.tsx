'use client';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LESSON_MAP, WORLDS } from '@/lib/data';
import { setSoundEnabled } from '@/lib/sound';
import { useGame } from '@/lib/store';
import Home from './Home';
import Lesson, { type LessonResult } from './Lesson';
import Match from './Match';
import Results from './Results';
import { BadgeToast, CalculatorPanel, ProfilePanel, SettingsPanel } from './Panels';

type Screen =
  | { v: 'home' }
  | { v: 'lesson'; id: string }
  | { v: 'match'; id: string }
  | { v: 'results'; id: string; r: LessonResult };

export default function Game() {
  const g = useGame();
  const [screen, setScreen] = useState<Screen>({ v: 'home' });
  const [world, setWorld] = useState<'theory' | 'math'>('theory');
  const [panel, setPanel] = useState<null | 'profile' | 'settings' | 'calc'>(null);

  useEffect(() => setSoundEnabled(g.state.settings.sound), [g.state.settings.sound]);

  const start = (id: string) => {
    const l = LESSON_MAP[id];
    setScreen({ v: l.kind === 'match' ? 'match' : 'lesson', id });
    window.scrollTo({ top: 0 });
  };

  const nextLessonId = (id: string) => {
    for (const w of WORLDS) {
      const seq = w.sections.flatMap((s) => s.lessons);
      const i = seq.findIndex((l) => l.id === id);
      if (i !== -1) return seq[i + 1]?.id ?? null;
    }
    return null;
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <AnimatePresence mode="wait">
          {screen.v === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Home g={g} world={world} setWorld={setWorld} onStart={start} openPanel={setPanel} />
            </motion.div>
          )}
          {screen.v === 'lesson' && (
            <motion.div key={'l' + screen.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Lesson
                g={g}
                lesson={LESSON_MAP[screen.id]}
                onExit={() => setScreen({ v: 'home' })}
                onFinish={(r) => setScreen({ v: 'results', id: screen.id, r })}
                openCalc={() => setPanel('calc')}
              />
            </motion.div>
          )}
          {screen.v === 'match' && (
            <motion.div key={'m' + screen.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Match g={g} lesson={LESSON_MAP[screen.id]} onExit={() => setScreen({ v: 'home' })} onFinish={(r) => setScreen({ v: 'results', id: screen.id, r })} />
            </motion.div>
          )}
          {screen.v === 'results' && (
            <motion.div key="res" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Results
                g={g}
                lesson={LESSON_MAP[screen.id]}
                r={screen.r}
                nextId={nextLessonId(screen.id)}
                onHome={() => setScreen({ v: 'home' })}
                onRetry={() => start(screen.id)}
                onNext={(id) => start(id)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ProfilePanel open={panel === 'profile'} onClose={() => setPanel(null)} g={g} />
        <SettingsPanel open={panel === 'settings'} onClose={() => setPanel(null)} g={g} />
        <CalculatorPanel open={panel === 'calc'} onClose={() => setPanel(null)} />
        <BadgeToast badge={g.newBadges[0] ?? null} onDone={g.dismissBadge} />
      </div>
    </MotionConfig>
  );
}
