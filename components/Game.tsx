'use client';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { learnLessons } from '@/lessons';
import type { LearnLesson } from '@/lib/learn';
import { CourseProvider, shuffle, useChapterQuestions, useCourseIndex, type Course, type Lesson as L } from '@/lib/course';
import { setSoundEnabled } from '@/lib/sound';
import { useGame } from '@/lib/store';
import ChapterView from './Chapter';
import Home, { Ticker, TopBar } from './Home';
import Lesson, { type LessonResult } from './Lesson';
import Match from './Match';
import Onboarding from './Onboarding';
import Results from './Results';
import { BadgeToast, CalculatorPanel, ProfilePanel, RenamePanel, SettingsPanel } from './Panels';
import { cleanCode, formatCode } from './Link';
import { LeaderboardPanel } from './Season';
import { Asset, Btn, Modal } from './ui';

// interactive lessons (template + visuals) load only when one is opened, keeping the home page light
const LearnScreen = dynamic(() => import('./learn/LessonShell'), {
  ssr: false,
  loading: () => <div className="onboard"><span className="spinner" aria-label="Loading lesson" /></div>,
});

/** Loads the chapter's full questions (usually already prefetched by the chapter screen), then shows the lesson. */
function LessonLoader(props: Omit<React.ComponentProps<typeof Lesson>, 'questions'>) {
  const { questions, error, retry } = useChapterQuestions(props.lesson.chapterId);
  if (questions) return <Lesson {...props} questions={questions} />;
  return (
    <div className="onboard">
      <div className="center-col">
        {error ? (
          <>
            <p className="loading-text">Couldn&apos;t load the questions. Check your connection.</p>
            <button className="btn3d btn-gold" onClick={retry}>Try again</button>
            <button className="link-btn" onClick={props.onExit}>Back</button>
          </>
        ) : (
          <span className="spinner" aria-label="Loading questions" />
        )}
      </div>
    </div>
  );
}

type Screen =
  | { v: 'home' }
  | { v: 'chapter'; id: string }
  | { v: 'play'; lesson: L }
  | { v: 'learn'; lesson: LearnLesson }
  | { v: 'results'; lesson: L; r: LessonResult };

export type PanelId = 'profile' | 'settings' | 'calc' | 'board' | 'rename';

export default function Game({ course: raw }: { course: Course }) {
  const course = useCourseIndex(raw);
  const g = useGame(course);
  const [screen, setScreen] = useState<Screen>({ v: 'home' });
  const [panel, setPanel] = useState<null | PanelId>(null);

  // /?link=CODE comes from scanning another device's QR code
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkErr, setLinkErr] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    const c = cleanCode(url.searchParams.get('link') ?? '');
    if (!url.searchParams.has('link')) return;
    url.searchParams.delete('link');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    if (c.length === 6) setLinkCode(c);
  }, []);
  const confirmSwitch = async () => {
    if (!linkCode) return;
    setLinking(true);
    const err = await g.linkDevice(linkCode);
    setLinking(false);
    if (err) setLinkErr(err); else { setLinkCode(null); setScreen({ v: 'home' }); }
  };

  useEffect(() => setSoundEnabled(g.state.settings.sound), [g.state.settings.sound]);
  // a message from the site owner: show it as a browser alert once, then (if asked) offer a rename
  const { notice, ackNotice, mustRename } = g;
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => { window.alert(notice); ackNotice(); if (mustRename) setPanel('rename'); }, 400);
    return () => clearTimeout(id);
  }, [notice, ackNotice, mustRename]);
  useEffect(() => { if (mustRename && !notice) setPanel((p) => p ?? 'rename'); }, [mustRename, notice]);
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
        <div className="loop-wiggle">
          <Asset name={course.mascot} size={96} alt="Loading" eager />
        </div>
      </div>
    );
  }

  return (
    <CourseProvider value={course}>
      <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {!g.profile ? (
          <Onboarding
            wiped={g.auth === 'wiped'}
            initialCode={linkCode}
            // once signed in here, the scanned code is used up: don't offer it again as an account switch
            register={async (n, av) => { const e = await g.register(n, av); if (!e) setLinkCode(null); return e; }}
            linkDevice={async (c) => { const e = await g.linkDevice(c); if (!e) setLinkCode(null); return e; }}
          />
        ) : (
          <div className="app">
            {(screen.v === 'home' || screen.v === 'chapter') && (
              <div className="top-stack">
                <TopBar g={g} openPanel={setPanel} onHome={() => go({ v: 'home' })} />
                <Ticker g={g} />
              </div>
            )}
            <AnimatePresence mode="wait">
              {screen.v === 'home' && (
                <m.div key="home" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.18 }}>
                  <Home g={g} onOpen={(id) => go({ v: 'chapter', id })} openPanel={setPanel} />
                </m.div>
              )}
              {screen.v === 'chapter' && (
                <m.div key={'c' + screen.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.18 }}>
                  <ChapterView g={g} chapter={course.chapterMap[screen.id]} onBack={() => go({ v: 'home' })} onPlay={play} onQuick={(m, part) => quick(screen.id, m, part)} onLearn={(lesson) => go({ v: 'learn', lesson })} />
                </m.div>
              )}
              {screen.v === 'play' && (
                <m.div key={'p' + screen.lesson.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                  {screen.lesson.kind === 'match' ? (
                    <Match g={g} lesson={screen.lesson} onExit={() => back(screen.lesson)} onFinish={(r) => go({ v: 'results', lesson: screen.lesson, r })} />
                  ) : (
                    <LessonLoader g={g} lesson={screen.lesson} onExit={() => back(screen.lesson)} onFinish={(r) => go({ v: 'results', lesson: screen.lesson, r })} openCalc={() => setPanel('calc')} />
                  )}
                </m.div>
              )}
              {screen.v === 'learn' && course.chapterMap[screen.lesson.chapterId] && (
                <m.div key={'l' + screen.lesson.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
                  <LearnScreen
                    g={g}
                    chapter={course.chapterMap[screen.lesson.chapterId]}
                    lesson={screen.lesson}
                    lessons={learnLessons(screen.lesson.chapterId)}
                    onExit={() => go({ v: 'chapter', id: screen.lesson.chapterId })}
                    onOpen={(lesson) => go({ v: 'learn', lesson })}
                  />
                </m.div>
              )}
              {screen.v === 'results' && (
                <m.div key="res" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Results
                    g={g}
                    lesson={screen.lesson}
                    r={screen.r}
                    nextId={course.nextLessonId(screen.lesson.id)}
                    onBack={() => back(screen.lesson)}
                    onRetry={() => (course.lessonMap[screen.lesson.id] ? play(screen.lesson) : quick(screen.lesson.chapterId, screen.lesson.id.startsWith('review') ? 'review' : 'mix', screen.lesson.id.split(':')[2] ?? ''))}
                    onNext={(id) => play(course.lessonMap[id])}
                  />
                </m.div>
              )}
            </AnimatePresence>

            <ProfilePanel open={panel === 'profile'} onClose={() => setPanel(null)} g={g} onRename={() => setPanel('rename')} />
            <RenamePanel open={panel === 'rename'} onClose={() => setPanel(null)} g={g} required={g.mustRename} />
            <SettingsPanel open={panel === 'settings'} onClose={() => setPanel(null)} g={g} />
            {course.calculator && <CalculatorPanel open={panel === 'calc'} onClose={() => setPanel(null)} />}
            <LeaderboardPanel open={panel === 'board'} onClose={() => setPanel(null)} me={g.profile.name} />
            <BadgeToast badge={g.newBadges[0] ?? null} onDone={g.dismissBadge} />
            <Modal open={!!linkCode} onClose={() => { setLinkCode(null); setLinkErr(null); }} title="Switch account?">
              <div className="center-col">
                <p>You scanned a link code ({linkCode ? formatCode(linkCode) : ''}). This device is signed in as <b>{g.profile.name}</b>. Switch it to the account that made the code?</p>
                <p className="muted small">{g.profile.name}’s progress stays saved, but this device will only get back into it with a code from a device still signed in as {g.profile.name}.</p>
                {linkErr && <p className="small bad-text">{linkErr}</p>}
                <Btn variant="gold" block onClick={confirmSwitch} disabled={linking}>{linking ? 'Switching…' : 'Switch account'}</Btn>
                <Btn variant="ghost" block onClick={() => { setLinkCode(null); setLinkErr(null); }}>Keep {g.profile.name}</Btn>
              </div>
            </Modal>
          </div>
        )}
      </MotionConfig>
      </LazyMotion>
    </CourseProvider>
  );
}
