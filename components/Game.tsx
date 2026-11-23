'use client';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LESSON_MAP, WORLDS } from '@/lib/data';
import { setSoundEnabled } from '@/lib/sound';
import { useGame } from '@/lib/store';
import Home from './Home';
import Lesson, { type LessonResult } from './Lesson';
import Match from './Match';
import Onboarding from './Onboarding';
import Results from './Results';
import { BadgeToast, CalculatorPanel, ProfilePanel, SettingsPanel } from './Panels';
import { LeaderboardPanel } from './Season';
import { Asset } from './ui';

type Screen =
  | { v: 'home' }
  | { v: 'lesson'; id: string }
  | { v: 'match'; id: string }
  | { v: 'results'; id: string; r: LessonResult };

export type PanelId = 'profile' | 'settings' | 'calc' | 'board';

export default function Game() {
  const g = useGame();
  const [screen, setScreen] = useState<Screen>({ v: 'home' });
  const [world, setWorld] = useState<'theory' | 'math'>('theory');
  const [panel, setPanel] = useState<null | PanelId>(null);

  useEffect(() => setSoundEnabled(g.state.settings.sound), [g.state.settings.sound]);
  useEffect(() => { if (!g.profile) setScreen({ v: 'home' }); }, [g.profile]);

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

  if (!g.ready || (g.auth === 'loading' && !g.profile)) {
    return (
      <div className="onboard">
        <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <Asset name="pig_face_3d.png" size={96} alt="Loading" />
        </motion.div>
      </div>
    );
  }

  if (!g.profile) {
    return (
      <MotionConfig reducedMotion="user">
        <Onboarding wiped={g.auth === 'wiped'} register={g.register} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="app">
        <AnimatePresence mode="wait">
          {screen.v === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
              <Home g={g} world={world} setWorld={setWorld} onStart={start} openPanel={setPanel} />
            </motion.div>
          )}
          {screen.v === 'lesson' && (
            <motion.div key={'l' + screen.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
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
            <motion.div key={'m' + screen.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
              <Match g={g} lesson={LESSON_MAP[screen.id]} onExit={() => setScreen({ v: 'home' })} onFinish={(r) => setScreen({ v: 'results', id: screen.id, r })} />
            </motion.div>
          )}
          {screen.v === 'results' && (
            <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
        <LeaderboardPanel open={panel === 'board'} onClose={() => setPanel(null)} me={g.profile.name} />
        <BadgeToast badge={g.newBadges[0] ?? null} onDone={g.dismissBadge} />
      </div>
    </MotionConfig>
  );
}
