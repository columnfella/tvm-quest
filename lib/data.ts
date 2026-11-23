import raw from '@/data/questions.json';

export type Diff = 'E' | 'M' | 'T';
export type StemBlock = { k: 'p' | 'pre'; t: string };
export type Question = {
  id: string;
  part: 'theory' | 'math';
  diff: Diff;
  topic: string;
  stem: StemBlock[];
  opts: string[];
  ans: number;
  sol: string;
  isNew: boolean;
};

export type Lesson = {
  id: string;
  title: string;
  kind: 'quiz' | 'match';
  questionIds: string[];
  diff: Diff;
};

export type Section = {
  id: string;
  name: string;
  blurb: string;
  icon: string; // asset file name
  color: string; // css var name
  lessons: Lesson[];
};

export type World = {
  id: 'theory' | 'math';
  name: string;
  tagline: string;
  icon: string;
  sections: Section[];
};

export const QUESTIONS: Question[] = raw as Question[];
export const QMAP: Record<string, Question> = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

export const DIFF_LABEL: Record<Diff, string> = { E: 'Easy', M: 'Medium', T: 'Tough' };
export const DIFF_XP: Record<Diff, number> = { E: 10, M: 15, T: 25 };

function shortTopic(t: string) {
  return t
    .replace(/^PV of an uneven CF stream$/i, 'Uneven cash flows')
    .replace(/^FV of an uneven CF stream$/i, 'Uneven cash flows')
    .replace(/Remaining (mortgage|loan) balance/i, 'Remaining balances')
    .replace(/Required annuity payments/i, 'Required payments')
    .replace(/Time value concepts/i, 'Core concepts');
}

function titleFor(ids: string[]) {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const t = shortTopic(QMAP[id].topic);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length > 1 && sorted[1][1] >= 2 && sorted[0][0].length + sorted[1][0].length < 34) {
    return `${sorted[0][0]} & ${sorted[1][0]}`;
  }
  return sorted[0][0];
}

function chunk(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  if (out.length > 1 && out[out.length - 1].length < 3) {
    const last = out.pop()!;
    out[out.length - 1].push(...last);
  }
  return out;
}

const theoryIds = QUESTIONS.filter((q) => q.part === 'theory').map((q) => q.id);
const mathBy = (d: Diff) => QUESTIONS.filter((q) => q.part === 'math' && q.diff === d).map((q) => q.id);

function lessonsFrom(prefix: string, ids: string[], size: number, diff: Diff): Lesson[] {
  return chunk(ids, size).map((c, i) => ({
    id: `${prefix}-${i + 1}`,
    title: titleFor(c),
    kind: 'quiz',
    questionIds: c,
    diff,
  }));
}

export const WORLDS: World[] = [
  {
    id: 'theory',
    name: 'Theory',
    tagline: 'Concepts, definitions and formulas',
    icon: 'books_3d.png',
    sections: [
      {
        id: 'library',
        name: 'Concept Library',
        blurb: 'The 15 conceptual MCQs from the Black Book, plus formula drills.',
        icon: 'books_3d.png',
        color: '--theory',
        lessons: [
          { id: 'th-1', title: 'PV, annuities & EAR', kind: 'quiz', questionIds: theoryIds.slice(0, 5), diff: 'E' },
          { id: 'th-m1', title: 'Formula Match I', kind: 'match', questionIds: [], diff: 'E' },
          { id: 'th-2', title: 'EAR & amortization', kind: 'quiz', questionIds: theoryIds.slice(5, 10), diff: 'E' },
          { id: 'th-m2', title: 'Formula Match II', kind: 'match', questionIds: [], diff: 'M' },
          { id: 'th-3', title: 'Boss: annuities & loans', kind: 'quiz', questionIds: theoryIds.slice(10), diff: 'M' },
          { id: 'th-m3', title: 'Formula Match: speed run', kind: 'match', questionIds: [], diff: 'T' },
        ],
      },
    ],
  },
  {
    id: 'math',
    name: 'Math',
    tagline: 'Problems straight from the Black Book',
    icon: 'abacus_3d.png',
    sections: [
      {
        id: 'easy',
        name: 'Seedling Meadow',
        blurb: 'Easy problems: lump sums, annuities, EAR, loan basics.',
        icon: 'seedling_3d.png',
        color: '--easy',
        lessons: lessonsFrom('e', mathBy('E'), 6, 'E'),
      },
      {
        id: 'medium',
        name: 'Snowcap Ridge',
        blurb: 'Medium problems: non-annual compounding, uneven flows, amortization.',
        icon: 'snow-capped_mountain_3d.png',
        color: '--medium',
        lessons: lessonsFrom('m', mathBy('M'), 6, 'M'),
      },
      {
        id: 'tough',
        name: 'Volcano Vault',
        blurb: 'Tough problems: multi-step retirement, college and savings plans.',
        icon: 'volcano_3d.png',
        color: '--tough',
        lessons: lessonsFrom('t', mathBy('T'), 5, 'T'),
      },
    ],
  },
];

export const ALL_LESSONS: Lesson[] = WORLDS.flatMap((w) => w.sections.flatMap((s) => s.lessons));
export const LESSON_MAP: Record<string, Lesson> = Object.fromEntries(ALL_LESSONS.map((l) => [l.id, l]));
export const worldOfLesson = (id: string) => WORLDS.find((w) => w.sections.some((s) => s.lessons.some((l) => l.id === id)))!;
export const sectionOfLesson = (id: string) => WORLDS.flatMap((w) => w.sections).find((s) => s.lessons.some((l) => l.id === id))!;

export type FormulaPair = { name: string; formula: string };
// ^{...} renders as superscript.
export const FORMULAS: FormulaPair[] = [
  { name: 'FV of a lump sum', formula: 'PV(1 + i)^{N}' },
  { name: 'PV of a lump sum', formula: 'FV / (1 + i)^{N}' },
  { name: 'FV of an ordinary annuity', formula: 'PMT · [(1 + i)^{N} − 1] / i' },
  { name: 'PV of an ordinary annuity', formula: 'PMT · [1 − (1 + i)^{−N}] / i' },
  { name: 'Annuity due value', formula: 'Ordinary value × (1 + i)' },
  { name: 'PV of a perpetuity', formula: 'PMT / i' },
  { name: 'Effective annual rate', formula: '(1 + i_{nom}/m)^{m} − 1' },
  { name: 'Periodic rate', formula: 'i_{nom} / m' },
  { name: 'APR', formula: 'Periodic rate × periods per year' },
  { name: 'FV, continuous compounding', formula: 'PV · e^{iN}' },
  { name: 'EAR, continuous compounding', formula: 'e^{i} − 1' },
  { name: 'Number of periods', formula: 'ln(FV/PV) / ln(1 + i)' },
  { name: 'Interest part of a loan payment', formula: 'Beginning balance × periodic rate' },
  { name: 'Principal part of a loan payment', formula: 'PMT − interest' },
  { name: 'PV of uneven cash flows', formula: 'Σ CF_{t} / (1 + i)^{t}' },
];
