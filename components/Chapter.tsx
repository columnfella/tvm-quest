'use client';
import { m } from 'framer-motion';
import { ArrowLeft, BookOpen, Check, Shuffle, Star, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { loadChapter, useCourse, type Chapter, type Lesson } from '@/lib/course';
import { sfx } from '@/lib/sound';
import type { Game } from '@/lib/store';
import { chapterProgress } from './Home';
import { Asset, Bar, Btn, Modal, Rich } from './ui';

function LessonTile({ lesson, n, g, onPlay, delay }: { lesson: Lesson; n: number; g: Game; onPlay: () => void; delay: number }) {
  const course = useCourse();
  const prog = g.state.lessons[lesson.id];
  const d = course.diff(lesson.difficulty);
  const isMatch = lesson.kind === 'match';
  return (
    <m.button
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
        {[1, 2, 3].map((i) => <Star key={i} size={15} fill={i <= (prog?.stars ?? 0) ? '#facc15' : 'rgba(11,18,32,0.18)'} stroke="#0b1220" strokeWidth={2.5} />)}
      </span>
    </m.button>
  );
}

/** Every hint card and match pair of the chapter, free to read: a quick revision sheet. */
function CheatSheet({ chapter, open, onClose }: { chapter: Chapter; open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Cheat sheet" wide>
      <p className="muted small" style={{ marginBottom: 12 }}>{chapter.title}: everything the hints cover, in one place.</p>
      <div className="sheet-grid">
        {chapter.hints.map((h, i) => (
          <div key={i} className="sheet-card">
            <b>{h.title}</b>
            {h.lines.map((l, j) => <div key={j} className="formula"><Rich text={l} /></div>)}
          </div>
        ))}
      </div>
      {chapter.pairs.length > 0 && (
        <>
          <h3 className="sheet-title">{chapter.pairsTitle}</h3>
          <table className="sheet-table">
            <tbody>
              {chapter.pairs.map((p, i) => (
                <tr key={i}><th>{p.left}</th><td className={chapter.pairsMono ? 'formula' : ''}><Rich text={p.right} /></td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Modal>
  );
}

export default function ChapterView({ g, chapter, onBack, onPlay, onQuick }: { g: Game; chapter: Chapter; onBack: () => void; onPlay: (l: Lesson) => void; onQuick: (mode: 'mix' | 'review', part: string) => void }) {
  const course = useCourse();
  const p = chapterProgress(g, chapter);
  const parts = course.parts.filter((pt) => chapter.sections.some((s) => s.part === pt.id));
  const tabKey = `quest-tab-${chapter.id}`;
  const [part, setPart] = useState(parts[0]?.id ?? '');
  const [sheet, setSheet] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(tabKey);
      if (saved && parts.some((x) => x.id === saved)) setPart(saved);
    } catch { /* noop */ }
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // warm the cache so lessons open instantly
  useEffect(() => { loadChapter(chapter.id).catch(() => { /* retried when a lesson opens */ }); }, [chapter.id]);
  const choose = (id: string) => { setPart(id); sfx.tap(); try { localStorage.setItem(tabKey, id); } catch { /* noop */ } };

  const sections = chapter.sections.filter((s) => s.part === part);
  const keys = chapter.questionKeys.filter((k) => course.questions[k].part === part);
  const missed = keys.filter((k) => g.state.missed.includes(k)).length;
  const cur = parts.find((x) => x.id === part);
  let n = 0;

  return (
    <main className="chapter" style={{ ['--c' as string]: chapter.color }}>
      <div className="chapter-top">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={18} strokeWidth={3} /> All chapters</button>
        {(chapter.hints.length > 0 || chapter.pairs.length > 0) && (
          <button className="back-btn sheet-btn" onClick={() => { sfx.tap(); setSheet(true); }}><BookOpen size={18} strokeWidth={3} /> Cheat sheet</button>
        )}
      </div>

      <m.section className="ch-hero" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <div className="ch-hero-text">
          <small>{chapter.number !== null ? `Chapter ${chapter.number}` : 'Chapter'}</small>
          <h1>{chapter.title}</h1>
          {chapter.tagline && <p>{chapter.tagline}</p>}
          <div className="ch-hero-bar">
            <Bar value={p.total ? p.done / p.total : 0} height={14} color="linear-gradient(180deg, #fef08a, #facc15)" />
            <span>{p.done}/{p.total}</span>
          </div>
        </div>
        <div className="loop-float">
          <Asset name={chapter.icon} size={110} className="ch-hero-art" eager />
        </div>
      </m.section>

      {parts.length > 1 && (
        <div className="part-tabs" role="tablist">
          {parts.map((pt) => {
            const count = chapter.questionKeys.filter((k) => course.questions[k].part === pt.id).length;
            return (
              <button key={pt.id} role="tab" aria-selected={part === pt.id} className={`part-tab ${part === pt.id ? 'on' : ''}`} onClick={() => choose(pt.id)}>
                <Asset name={pt.icon} size={40} />
                <span>
                  <b>{pt.label}</b>
                  <small>{count} questions{pt.tagline ? ` · ${pt.tagline}` : ''}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {keys.length > 0 && (
        <div className="quick-row">
          <Btn variant="gold" onClick={() => onQuick('mix', part)}><Shuffle size={20} /> Quick {cur && parts.length > 1 ? cur.label.toLowerCase() : 'practice'}</Btn>
          <Btn variant="blue" onClick={() => onQuick('review', part)} disabled={missed === 0} title={missed ? '' : 'No mistakes to review yet'}>
            <Undo2 size={20} /> Review mistakes{missed ? ` (${missed})` : ''}
          </Btn>
        </div>
      )}

      {sections.map((sec, si) => (
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

      <CheatSheet chapter={chapter} open={sheet} onClose={() => setSheet(false)} />
    </main>
  );
}
