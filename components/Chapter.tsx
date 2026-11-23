'use client';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, Shuffle, Star, Undo2 } from 'lucide-react';
import { useCourse, type Chapter, type Lesson } from '@/lib/course';
import { sfx } from '@/lib/sound';
import type { Game } from '@/lib/store';
import { chapterProgress } from './Home';
import { Asset, Bar, Btn } from './ui';

function LessonTile({ lesson, n, g, onPlay, delay }: { lesson: Lesson; n: number; g: Game; onPlay: () => void; delay: number }) {
  const course = useCourse();
  const prog = g.state.lessons[lesson.id];
  const d = course.diff(lesson.difficulty);
  const isMatch = lesson.kind === 'match';
  return (
    <motion.button
      className={`tile-lesson ${prog?.done ? 'done' : ''}`}
      style={{ ['--d' as string]: d.color }}
      onClick={() => { sfx.tap(); onPlay(); }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 18, delay }}
      whileHover={{ y: -4 }}
      whileTap={{ scaleX: 1.06, scaleY: 0.92 }}
    >
      <span className="tl-num">{prog?.done ? <Check size={18} strokeWidth={4} /> : isMatch ? <Asset name="brain_3d.png" size={22} /> : n}</span>
      <span className="tl-title">{lesson.title}</span>
      <span className="tl-meta">{isMatch ? `${lesson.pairCount} pairs` : `${lesson.questionKeys.length} Qs`} · {d.label}</span>
      <span className="tl-stars" aria-label={`${prog?.stars ?? 0} of 3 stars`}>
        {[1, 2, 3].map((i) => <Star key={i} size={15} fill={i <= (prog?.stars ?? 0) ? '#ffd60a' : 'rgba(18,10,42,0.18)'} stroke="#120a2a" strokeWidth={2.5} />)}
      </span>
    </motion.button>
  );
}

export default function ChapterView({ g, chapter, onBack, onPlay, onQuick }: { g: Game; chapter: Chapter; onBack: () => void; onPlay: (l: Lesson) => void; onQuick: (mode: 'mix' | 'review') => void }) {
  const p = chapterProgress(g, chapter);
  const missed = chapter.questionKeys.filter((k) => g.state.missed.includes(k)).length;
  let n = 0;
  return (
    <main className="chapter" style={{ ['--c' as string]: chapter.color }}>
      <button className="back-btn" onClick={onBack}><ArrowLeft size={18} strokeWidth={3} /> All chapters</button>

      <motion.section className="ch-hero" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="ch-hero-text">
          <small>{chapter.number !== null ? `Chapter ${chapter.number}` : 'Chapter'}</small>
          <h1>{chapter.title}</h1>
          {chapter.tagline && <p>{chapter.tagline}</p>}
          <div className="ch-hero-bar">
            <Bar value={p.total ? p.done / p.total : 0} height={14} color="linear-gradient(180deg, #fff27a, #ffc400)" />
            <span>{p.done}/{p.total}</span>
          </div>
        </div>
        <motion.div animate={{ y: [0, -8, 0], rotate: [-4, 4, -4] }} transition={{ repeat: Infinity, duration: 3 }}>
          <Asset name={chapter.icon} size={110} className="ch-hero-art" />
        </motion.div>
      </motion.section>

      {chapter.questionKeys.length > 0 && (
        <div className="quick-row">
          <Btn variant="gold" onClick={() => onQuick('mix')}><Shuffle size={20} /> Quick practice</Btn>
          <Btn variant="blue" onClick={() => onQuick('review')} disabled={missed === 0} title={missed ? '' : 'No mistakes to review yet'}>
            <Undo2 size={20} /> Review mistakes{missed ? ` (${missed})` : ''}
          </Btn>
        </div>
      )}

      {chapter.sections.map((sec, si) => (
        <section key={sec.id} className="sec">
          <div className="sec-head">
            <h2>{sec.name}</h2>
            {sec.blurb && <p>{sec.blurb}</p>}
          </div>
          <div className="tile-grid">
            {sec.lessons.map((l, li) => {
              if (l.kind === 'quiz') n++;
              return <LessonTile key={l.id} lesson={l} n={n} g={g} onPlay={() => onPlay(l)} delay={Math.min(si * 0.05 + li * 0.03, 0.6)} />;
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
