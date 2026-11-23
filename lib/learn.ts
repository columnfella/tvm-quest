// Interactive lessons ("Learn" tab): types, progress ids and the XP rule.
// Lessons are hand-written React (see lessons/README.md); this file only defines the shape they plug into.
import type { ReactNode } from 'react';
import type { LessonProgress } from './store';

/** One assessment item. `explain` is shown after every attempt; `solution` is an optional step-by-step working. */
type CheckBase = { id: string; prompt: ReactNode; explain: ReactNode; solution?: ReactNode };

export type McqCheck = CheckBase & {
  kind: 'mcq';
  choices: string[];
  answer: number; // index into choices (shown in this order: write choices so position gives nothing away)
  why?: (string | undefined)[]; // optional feedback per wrong choice, same order as choices
};

export type NumberCheck = CheckBase & {
  kind: 'number';
  answer: number; // the exact value (percent questions: in percent, e.g. 4.2 for 4.2%)
  unit?: '$' | '%' | '';
  tol?: number; // absolute tolerance (default 0.01)
  relTol?: number; // relative tolerance (default 0.5%), whichever is larger wins
  traps?: { value: number; msg: string }[]; // common wrong answers with targeted feedback
};

/** Anything else: the lesson renders its own interaction and reports right/wrong with submit(). */
export type CustomCheck = CheckBase & {
  kind: 'custom';
  render: (api: { submit: (correct: boolean, feedback?: ReactNode) => void; locked: boolean }) => ReactNode;
};

export type Check = McqCheck | NumberCheck | CustomCheck;

/** What a lesson file exports (default). Each slot is free-form React. */
export type LessonContent = {
  intro: ReactNode; // A. concept introduction
  explore: ReactNode; // B. interactive explanation (custom components)
  formula: ReactNode; // C. mathematical formalisation + worked example
  derivation?: { title: string; body: ReactNode }; // optional "why does this work?"
  checks: Check[]; // D. assessment
  takeaways?: string[]; // E. shown on the completion screen
};

export type LearnMeta = {
  slug: string; // unique inside the chapter, used in the progress id: never rename a published slug
  title: string;
  summary: string;
  minutes: number;
  icon: string; // /public/assets image
  load: () => Promise<{ default: LessonContent }>;
};

export type LearnLesson = LearnMeta & { id: string; chapterId: string };

/** Progress id stored in GameState.lessons, next to the exercise lessons. */
export const learnId = (chapterId: string, slug: string) => `learn:${chapterId}/${slug}`;

// ---------- XP: full reward once, then only for new stars (no farming by replaying) ----------
export const LEARN_XP = { first: 30, perStar: 10, coins: 15 };

export const starsFor = (firstTry: number, total: number) => {
  const acc = total ? firstTry / total : 1;
  return acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
};

export function learnReward(prev: LessonProgress | undefined, stars: number) {
  if (!prev?.done) return { xp: LEARN_XP.first + LEARN_XP.perStar * stars, coins: LEARN_XP.coins, repeat: false };
  return { xp: LEARN_XP.perStar * Math.max(0, stars - prev.stars), coins: 0, repeat: true };
}

// ---------- numeric answers ----------
/** Parses "$1,234.5", "17.9", "4.2%", "−3.33" → number (null when it isn't a number). */
export function parseNumber(raw: string): number | null {
  const s = raw.replace(/[\s,$]/g, '').replace(/[−–]/g, '-').replace(/%$/, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  return Number(s);
}

export function numberMatches(x: number, c: Pick<NumberCheck, 'answer' | 'tol' | 'relTol' | 'unit'>): boolean {
  const ok = (v: number) => Math.abs(v - c.answer) <= Math.max(c.tol ?? 0.01, (c.relTol ?? 0.005) * Math.abs(c.answer)) + 1e-9;
  if (ok(x)) return true;
  // percent questions: also accept the decimal form (0.042 for 4.2%)
  return c.unit === '%' && Math.abs(x) < 1 && Math.abs(c.answer) >= 1 && ok(x * 100);
}
