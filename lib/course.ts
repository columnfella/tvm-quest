// Course types shared by the server loader (lib/content.ts) and the client.
// The loader turns the JSON files in /content into one `Course` object; nothing here is course-specific.
'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Difficulty = { label: string; xp: number; color: string };
export type Hint = { title: string; lines: string[]; topics: string[] };
export type Pair = { left: string; right: string };
export type Part = { id: string; label: string; tagline: string; icon: string }; // e.g. Theory / Math
export type Coach = { name: string; image: string; lines: string[]; photo: boolean }; // photo: show the image in a round frame instead of the drawn suit

export type Question = {
  key: string; // globally unique: `${chapterId}/${id}`
  id: string;
  chapterId: string;
  section: string;
  difficulty: string; // a key of course.difficulties
  topic: string;
  question: string; // plain text; ``` fences mark preformatted blocks (tables)
  choices: string[];
  answer: number; // index into choices
  explanation: string;
  source: string;
  hint: Hint | null;
  shuffle: boolean;
  part: string; // id of the part (from its section) // shuffle choice order when shown (auto-skipped for "a and c"/"all of the above" style choices)
};

/** What the page ships for every question (enough for counts, filters and hint matching). */
export type QuestionMeta = Pick<Question, 'key' | 'chapterId' | 'section' | 'difficulty' | 'topic' | 'part'>;

export type Lesson = {
  id: string;
  chapterId: string;
  title: string;
  kind: 'quiz' | 'match';
  questionKeys: string[];
  difficulty: string;
  pairCount?: number; // match lessons
};

export type Section = { id: string; name: string; blurb: string; part: string; lessons: Lesson[] };

export type Chapter = {
  id: string;
  number: number | null;
  title: string;
  tagline: string;
  icon: string;
  color: string;
  calculator: boolean;
  pairs: Pair[];
  pairsTitle: string;
  pairsMono: boolean;
  hints: Hint[];
  sections: Section[];
  questionKeys: string[];
};

export type Course = {
  id: string;
  title: string;
  subtitle: string;
  tagline: string;
  mascot: string;
  lessonSize: number;
  quickPracticeSize: number;
  calculator: boolean;
  difficulties: Record<string, Difficulty>;
  parts: Part[]; // always at least one
  credits: string;
  coach: Coach | null; // optional pop-up character with encouragement lines
  chapters: Chapter[];
  questions: Record<string, QuestionMeta>; // full text/choices load per chapter: loadChapter()
  issues: string[]; // content problems found while loading (shown in Settings)
};

// ---------- client helpers ----------
export type CourseIndex = Course & {
  lessonMap: Record<string, Lesson>;
  chapterMap: Record<string, Chapter>;
  allLessons: Lesson[];
  diff: (key: string) => Difficulty;
  hintFor: (q: QuestionMeta & { hint?: Hint | null }) => Hint | null;
  nextLessonId: (id: string) => string | null;
};

const CourseCtx = createContext<CourseIndex | null>(null);
export const CourseProvider = CourseCtx.Provider;

export function useCourse(): CourseIndex {
  const c = useContext(CourseCtx);
  if (!c) throw new Error('useCourse must be used inside <CourseProvider>');
  return c;
}

export function useCourseIndex(course: Course): CourseIndex {
  return useMemo(() => {
    const allLessons = course.chapters.flatMap((c) => c.sections.flatMap((s) => s.lessons));
    const lessonMap = Object.fromEntries(allLessons.map((l) => [l.id, l]));
    const chapterMap = Object.fromEntries(course.chapters.map((c) => [c.id, c]));
    const firstDiff = Object.values(course.difficulties)[0];
    return {
      ...course,
      allLessons,
      lessonMap,
      chapterMap,
      diff: (key) => course.difficulties[key] ?? firstDiff,
      hintFor: (q) => {
        if (q.hint) return q.hint;
        const hints = chapterMap[q.chapterId]?.hints ?? [];
        const t = `${q.topic} ${q.section}`.toLowerCase();
        return hints.find((h) => h.topics.some((k) => k !== '*' && t.includes(k.toLowerCase()))) ?? hints.find((h) => h.topics.includes('*')) ?? null;
      },
      nextLessonId: (id) => {
        const l = lessonMap[id];
        if (!l) return null;
        const seq = chapterMap[l.chapterId].sections.flatMap((s) => s.lessons);
        return seq[seq.indexOf(l) + 1]?.id ?? null;
      },
    };
  }, [course]);
}

// ---- full questions, loaded per chapter from /api/chapter/<id> (a static, CDN-cached JSON file) ----
const chapterCache = new Map<string, Promise<Record<string, Question>>>();

export function loadChapter(id: string): Promise<Record<string, Question>> {
  let p = chapterCache.get(id);
  if (!p) {
    p = fetch(`/api/chapter/${encodeURIComponent(id)}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<Record<string, Question>>; })
      .catch((e) => { chapterCache.delete(id); throw e; });
    chapterCache.set(id, p);
  }
  return p;
}

export function useChapterQuestions(id: string) {
  const [state, setState] = useState<{ questions: Record<string, Question> | null; error: boolean }>({ questions: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ questions: null, error: false });
    loadChapter(id).then((q) => alive && setState({ questions: q, error: false })).catch(() => alive && setState({ questions: null, error: true }));
    return () => { alive = false; };
  }, [id, attempt]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, retry };
}

export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
