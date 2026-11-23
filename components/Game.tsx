'use client';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CourseProvider, shuffle, useCourseIndex, type Course, type Lesson as L } from '@/lib/course';
import { setSoundEnabled } from '@/lib/sound';
import { useGame } from '@/lib/store';
import ChapterView from './Chapter';
import Home, { Ticker, TopBar } from './Home';
import Lesson, { type LessonResult } from './Lesson';
import Match from './Match';
import Onboarding from './Onboarding';
import Results from './Results';
import { BadgeToast, CalculatorPanel, ProfilePanel, SettingsPanel } from './Panels';
import { LeaderboardPanel } from './Season';
import { Asset } from './ui';

type Screen =
  | { v: 'home' }
  | { v: 'chapter'; id: string }
  | { v: 'play'; lesson: L }
  | { v: 'results'; lesson: L; r: LessonResult };

export type PanelId = 'profile' | 'settings' | 'calc' | 'board';

export default function Game({ course: raw }: { course: Course }) {
  const course = useCourseIndex(raw);
  const g = useGame(course);
  const [screen, setScreen] = useState<Screen>({ v: 'home' });
  const [panel, setPanel] = useState<null | PanelId>(null);

  useEffect(() => setSoundEnabled(g.state.settings.sound), [g.state.settings.sound]);
  useEffect(() => { if (!g.profile) setScreen({ v: 'home' }); }, [g.profile]);

  const go = (s: Screen) => { setScreen(s); window.scrollTo({ top: 0 }); };
  const play = (lesson: L) => go({ v: 'play', lesson });
  const back = (lesson: L) => go({ v: 'chapter', id: lesson.chapterId });

  /** Ad-hoc lessons built from one part of a chapter: random mix or "review mistakes". */
  const quick = (chapterId: string, mode: 'mix' | 'review', part: string) => {
    const ch = course.chapterMap[chapterId];
    const inPart = ch.questionKeys.filter((k) => !part || course.questions[k].part === part);
    const pool = mode === 'review' ? inPart.filter((k) => g.state.missed.includes(k)) : inPart;
    const keys = shuffle(pool).slice(0, course.quickPracticeSize);
    if (!keys.length) return;
    const label = course.parts.length > 1 ? course.parts.find((p) => p.id === part)?.label : '';
    play({
      id: `${mode}:${chapterId}:${part}:${Date.now()}`,
      chapterId,
      title: `${mode === 'review' ? 'Review mistakes' : 'Quick practice'}${label ? ` · ${label}` : ''}`,
      kind: 'quiz',
      questionKeys: keys,
      difficulty: Object.keys(course.difficulties)[1] ?? Object.keys(course.difficulties)[0],
    });
  };

  if (!g.ready || (g.auth === 'loading' && !g.profile)) {
    return (
      <div className="onboard">
        <motion.div animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
          <Asset name={course.mascot} size={96} alt="Loading" />
        </motion.div>
      </div>
    );
  }

  return (
    <CourseProvider value={course}>
      <MotionConfig reducedMotion="user">
        {!g.profile ? (
          <Onboarding wiped={g.auth === 'wiped'} register={g.register} />
        ) : (
          <div className="app">
            {(screen.v === 'home' || screen.v === 'chapter') && (
              <>
                <TopBar g={g} openPanel={setPanel} onHome={() => go({ v: 'home' })} />
                <Ticker g={g} />
              </>
            )}
            <AnimatePresence mode="wait">
              {screen.v === 'home' && (
                <motion.div key="home" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.18 }}>
                  <Home g={g} onOpen={(id) => go({ v: 'chapter', id })} openPanel={setPanel} />
                </motion.div>
              )}
              {screen.v === 'chapter' && (
                <motion.div key={'c' + screen.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.18 }}>
                  <ChapterView g={g} chapter={course.chapterMap[screen.id]} onBack={() => go({ v: 'home' })} onPlay={play} onQuick={(m, part) => quick(screen.id, m, part)} />
                </motion.div>
              )}
              {screen.v === 'play' && (
                <motion.div key={'p' + screen.lesson.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                  {screen.lesson.kind === 'match' ? (
                    <Match g={g} lesson={screen.lesson} onExit={() => back(screen.lesson)} onFinish={(r) => go({ v: 'results', lesson: screen.lesson, r })} />
                  ) : (
                    <Lesson g={g} lesson={screen.lesson} onExit={() => back(screen.lesson)} onFinish={(r) => go({ v: 'results', lesson: screen.lesson, r })} openCalc={() => setPanel('calc')} />
                  )}
                </motion.div>
              )}
              {screen.v === 'results' && (
                <motion.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Results
                    g={g}
                    lesson={screen.lesson}
                    r={screen.r}
                    nextId={course.nextLessonId(screen.lesson.id)}
                    onBack={() => back(screen.lesson)}
                    onRetry={() => (course.lessonMap[screen.lesson.id] ? play(screen.lesson) : quick(screen.lesson.chapterId, screen.lesson.id.startsWith('review') ? 'review' : 'mix', screen.lesson.id.split(':')[2] ?? ''))}
                    onNext={(id) => play(course.lessonMap[id])}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <ProfilePanel open={panel === 'profile'} onClose={() => setPanel(null)} g={g} />
            <SettingsPanel open={panel === 'settings'} onClose={() => setPanel(null)} g={g} />
            {course.calculator && <CalculatorPanel open={panel === 'calc'} onClose={() => setPanel(null)} />}
            <LeaderboardPanel open={panel === 'board'} onClose={() => setPanel(null)} me={g.profile.name} />
            <BadgeToast badge={g.newBadges[0] ?? null} onDone={g.dismissBadge} />
          </div>
        )}
      </MotionConfig>
    </CourseProvider>
  );
}
