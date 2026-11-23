// Course types shared by the server loader (lib/content.ts) and the client.
// The loader turns the JSON files in /content into one `Course` object; nothing here is course-specific.
'use client';
import { createContext, useContext, useMemo } from 'react';

export type Difficulty = { label: string; xp: number; color: string };
export type Hint = { title: string; lines: string[]; topics: string[] };
export type Pair = { left: string; right: string };
export type Coach = { name: string; image: string; lines: string[] };

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
};

export type Lesson = {
  id: string;
  chapterId: string;
  title: string;
  kind: 'quiz' | 'match';
  questionKeys: string[];
  difficulty: string;
  pairCount?: number; // match lessons
};

export type Section = { id: string; name: string; blurb: string; lessons: Lesson[] };

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
  credits: string;
  coach: Coach | null; // optional pop-up character with encouragement lines
  chapters: Chapter[];
  questions: Record<string, Question>;
  issues: string[]; // content problems found while loading (shown in Settings)
};

// ---------- client helpers ----------
export type CourseIndex = Course & {
  lessonMap: Record<string, Lesson>;
  chapterMap: Record<string, Chapter>;
  allLessons: Lesson[];
  diff: (key: string) => Difficulty;
  hintFor: (q: Question) => Hint | null;
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

export function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
