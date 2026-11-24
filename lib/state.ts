// The player's game state and the algorithm that keeps it in sync across devices.
// Pure functions with no React or Node imports, shared by the browser (lib/store.ts), the API (app/api/sync)
// and the tests (scripts/check-sync.ts).
//
// How sync works (a three-way merge, like git):
//   * Each device remembers `base`: the last state it and the server agreed on.
//   * To save, it sends only what changed since then: `diff(base, local)` → a Delta of +XP, +coins,
//     lessons finished, badges earned, questions missed and fixed, settings changed.
//   * The server applies that Delta to whatever it has NOW (`apply(server, delta)`), so progress made on
//     another device in the meantime is kept: two devices earning 30 XP each end up with +60, not +30.
//   * The server answers with the merged state; the device re-applies anything it changed while the request
//     was in flight and adopts the result as its new base. Pulling works the same way.
//   * A device with no base (first run after this update, or old saves) joins its copy with the server's
//     using `merge`, which keeps the best of both (union of lessons and badges, highest counters).

export type LessonProgress = { done: boolean; stars: number; bestAcc: number; plays: number };
export type Settings = { sound: boolean };
export type GameState = {
  xp: number;
  gems: number;
  streak: number;
  lastDay: string | null;
  todayXp: number;
  today: string;
  dailyGoal: number;
  lessons: Record<string, LessonProgress>;
  missed: string[]; // question keys answered wrong and not yet answered right since
  stats: { correct: number; answered: number; bestCombo: number; perfect: number; matchBest: number | null };
  achievements: string[];
  settings: Settings;
};

export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const initialState = (): GameState => ({
  xp: 0,
  gems: 50,
  streak: 0,
  lastDay: null,
  todayXp: 0,
  today: dayKey(),
  dailyGoal: 50,
  lessons: {},
  missed: [],
  stats: { correct: 0, answered: 0, bestCombo: 0, perfect: 0, matchBest: null },
  achievements: [],
  settings: { sound: true },
});

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const n = (v: unknown, fallback = 0, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-max, Math.min(max, v)) : fallback);
const nn = (v: unknown, fallback = 0, max = 1e9) => Math.max(0, n(v, fallback, max));
const strs = (v: unknown, max = 2000) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && x.length <= 200))].slice(0, max) : []);
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(v) ? v : null);

function lesson(v: unknown): LessonProgress | null {
  if (!isObj(v)) return null;
  return { done: v.done === true, stars: Math.round(nn(v.stars, 0, 3)), bestAcc: nn(v.bestAcc, 0, 1), plays: Math.round(nn(v.plays, 0, 1e6)) };
}
function lessons(v: unknown): Record<string, LessonProgress> {
  const out: Record<string, LessonProgress> = {};
  if (!isObj(v)) return out;
  for (const [k, x] of Object.entries(v).slice(0, 2000)) {
    const l = k.length <= 200 ? lesson(x) : null;
    if (l) out[k] = l;
  }
  return out;
}

/** Turns any saved value (older versions, partial, or hostile) into a valid GameState. */
export function hydrate(v: unknown): GameState {
  const base = initialState();
  if (!isObj(v)) return base;
  const st = isObj(v.stats) ? v.stats : {};
  const set = isObj(v.settings) ? v.settings : {};
  return {
    xp: Math.floor(nn(v.xp)),
    gems: Math.floor(nn(v.gems, base.gems)),
    streak: Math.floor(nn(v.streak, 0, 10000)),
    lastDay: day(v.lastDay),
    todayXp: Math.floor(nn(v.todayXp)),
    today: day(v.today) ?? base.today,
    dailyGoal: Math.floor(nn(v.dailyGoal, base.dailyGoal, 10000)) || base.dailyGoal,
    lessons: lessons(v.lessons),
    missed: strs(v.missed),
    stats: {
      correct: Math.floor(nn(st.correct)),
      answered: Math.floor(nn(st.answered)),
      bestCombo: Math.floor(nn(st.bestCombo)),
      perfect: Math.floor(nn(st.perfect)),
      matchBest: typeof st.matchBest === 'number' && Number.isFinite(st.matchBest) && st.matchBest >= 0 ? st.matchBest : null,
    },
    achievements: strs(v.achievements, 500),
    settings: { sound: typeof set.sound === 'boolean' ? set.sound : base.settings.sound },
  };
}

/** Orders day keys like "2026-11-9" correctly (they are not zero-padded). */
export function dayCmp(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

function mergeLesson(a: LessonProgress | undefined, b: LessonProgress): LessonProgress {
  if (!a) return b;
  return { done: a.done || b.done, stars: Math.max(a.stars, b.stars), bestAcc: Math.max(a.bestAcc, b.bestAcc), plays: Math.max(a.plays, b.plays) };
}
const sameLesson = (a: LessonProgress | undefined, b: LessonProgress) => !!a && a.done === b.done && a.stars === b.stars && a.bestAcc === b.bestAcc && a.plays === b.plays;

// ---------- the Delta ----------

export type Delta = {
  xp?: number; // XP added (XP never goes down through a sync; "Reset progress" uses `reset`)
  gems?: number; // earned minus spent
  correct?: number;
  answered?: number;
  perfect?: number;
  bestCombo?: number; // new best, if beaten
  matchBest?: number; // new best time, if beaten
  lessons?: Record<string, LessonProgress>; // lessons whose progress changed (merged by "best of")
  achievements?: string[]; // badges earned
  missedAdd?: string[];
  missedDel?: string[];
  day?: { today: string; todayXp: number }; // the device's day and the XP it added to that day
  streak?: { streak: number; lastDay: string | null };
  dailyGoal?: number;
  settings?: Settings;
  reset?: GameState; // "Reset progress" in settings: replace everything with this
};

/** What changed from `base` to `cur`. */
export function diff(base: GameState, cur: GameState): Delta {
  const d: Delta = {};
  const add = (k: 'xp' | 'gems', v: number) => { if (v) d[k] = v; };
  add('xp', cur.xp - base.xp);
  add('gems', cur.gems - base.gems);
  if (cur.stats.correct !== base.stats.correct) d.correct = cur.stats.correct - base.stats.correct;
  if (cur.stats.answered !== base.stats.answered) d.answered = cur.stats.answered - base.stats.answered;
  if (cur.stats.perfect !== base.stats.perfect) d.perfect = cur.stats.perfect - base.stats.perfect;
  if (cur.stats.bestCombo > base.stats.bestCombo) d.bestCombo = cur.stats.bestCombo;
  if (cur.stats.matchBest !== null && (base.stats.matchBest === null || cur.stats.matchBest < base.stats.matchBest)) d.matchBest = cur.stats.matchBest;
  const ls: Record<string, LessonProgress> = {};
  for (const [k, l] of Object.entries(cur.lessons)) if (!sameLesson(base.lessons[k], l)) ls[k] = l;
  if (Object.keys(ls).length) d.lessons = ls;
  const ach = cur.achievements.filter((a) => !base.achievements.includes(a));
  if (ach.length) d.achievements = ach;
  const mAdd = cur.missed.filter((q) => !base.missed.includes(q));
  const mDel = base.missed.filter((q) => !cur.missed.includes(q));
  if (mAdd.length) d.missedAdd = mAdd;
  if (mDel.length) d.missedDel = mDel;
  if (cur.today !== base.today || cur.todayXp !== base.todayXp) {
    d.day = { today: cur.today, todayXp: cur.today === base.today ? cur.todayXp - base.todayXp : cur.todayXp };
  }
  if (cur.streak !== base.streak || cur.lastDay !== base.lastDay) d.streak = { streak: cur.streak, lastDay: cur.lastDay };
  if (cur.dailyGoal !== base.dailyGoal) d.dailyGoal = cur.dailyGoal;
  if (cur.settings.sound !== base.settings.sound) d.settings = { ...cur.settings };
  return d;
}

export const isEmpty = (d: Delta) => Object.keys(d).length === 0;

/** Applies a Delta on top of `s` (the server's current state, or a fresh pull on the device). */
export function apply(s: GameState, d: Delta): GameState {
  if (d.reset) return hydrate(d.reset);
  const out: GameState = { ...s, stats: { ...s.stats }, lessons: { ...s.lessons }, settings: { ...s.settings } };
  out.xp = Math.max(0, s.xp + (d.xp ?? 0));
  out.gems = Math.max(0, s.gems + (d.gems ?? 0));
  out.stats.correct = Math.max(0, s.stats.correct + (d.correct ?? 0));
  out.stats.answered = Math.max(0, s.stats.answered + (d.answered ?? 0));
  out.stats.perfect = Math.max(0, s.stats.perfect + (d.perfect ?? 0));
  if (d.bestCombo !== undefined) out.stats.bestCombo = Math.max(s.stats.bestCombo, d.bestCombo);
  if (d.matchBest !== undefined) out.stats.matchBest = s.stats.matchBest === null ? d.matchBest : Math.min(s.stats.matchBest, d.matchBest);
  for (const [k, l] of Object.entries(d.lessons ?? {})) out.lessons[k] = mergeLesson(s.lessons[k], l);
  if (d.achievements?.length) out.achievements = [...new Set([...s.achievements, ...d.achievements])];
  if (d.missedAdd?.length || d.missedDel?.length) {
    const del = new Set(d.missedDel ?? []);
    out.missed = [...new Set([...s.missed, ...(d.missedAdd ?? [])])].filter((q) => !del.has(q));
  }
  if (d.day) {
    const c = dayCmp(d.day.today, s.today);
    if (c === 0) out.todayXp = Math.max(0, s.todayXp + d.day.todayXp);
    else if (c > 0) { out.today = d.day.today; out.todayXp = Math.max(0, d.day.todayXp); }
    // an older day from a device that was asleep: today's counter is not affected
  }
  if (d.streak) {
    const c = dayCmp(d.streak.lastDay, s.lastDay);
    if (c > 0 || (c === 0 && d.streak.streak > s.streak)) { out.streak = d.streak.streak; out.lastDay = d.streak.lastDay; }
  }
  if (d.dailyGoal !== undefined) out.dailyGoal = d.dailyGoal;
  if (d.settings) out.settings = { ...d.settings };
  return out;
}

/** Joins two copies with no common base: keeps the best of both. Used once per device after this update, and for old clients. */
export function merge(a: GameState, b: GameState): GameState {
  const ls: Record<string, LessonProgress> = { ...a.lessons };
  for (const [k, l] of Object.entries(b.lessons)) ls[k] = mergeLesson(ls[k], l);
  const dc = dayCmp(a.today, b.today);
  const sc = dayCmp(a.lastDay, b.lastDay);
  const mb = [a.stats.matchBest, b.stats.matchBest].filter((x): x is number => x !== null);
  return {
    xp: Math.max(a.xp, b.xp),
    gems: Math.max(a.gems, b.gems),
    streak: sc > 0 ? a.streak : sc < 0 ? b.streak : Math.max(a.streak, b.streak),
    lastDay: sc >= 0 ? a.lastDay : b.lastDay,
    today: dc >= 0 ? a.today : b.today,
    todayXp: dc > 0 ? a.todayXp : dc < 0 ? b.todayXp : Math.max(a.todayXp, b.todayXp),
    dailyGoal: b.dailyGoal,
    lessons: ls,
    missed: [...new Set([...a.missed, ...b.missed])],
    stats: {
      correct: Math.max(a.stats.correct, b.stats.correct),
      answered: Math.max(a.stats.answered, b.stats.answered),
      bestCombo: Math.max(a.stats.bestCombo, b.stats.bestCombo),
      perfect: Math.max(a.stats.perfect, b.stats.perfect),
      matchBest: mb.length ? Math.min(...mb) : null,
    },
    achievements: [...new Set([...a.achievements, ...b.achievements])],
    settings: { ...b.settings },
  };
}

/** Validates a Delta that came over the network. `maxXp` caps the XP one save can add. */
export function cleanDelta(v: unknown, maxXp: number): Delta | null {
  if (!isObj(v)) return null;
  const d: Delta = {};
  if (v.reset !== undefined) { d.reset = hydrate(v.reset); return d; }
  const int = (x: unknown, lo: number, hi: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(Math.max(lo, Math.min(hi, x))) : undefined);
  const xp = int(v.xp, 0, maxXp); if (xp) d.xp = xp; // XP only ever grows through a sync
  const gems = int(v.gems, -100000, 5000); if (gems) d.gems = gems;
  const correct = int(v.correct, -100000, 2000); if (correct) d.correct = correct;
  const answered = int(v.answered, -100000, 2000); if (answered) d.answered = answered;
  const perfect = int(v.perfect, -10000, 200); if (perfect) d.perfect = perfect;
  const bc = int(v.bestCombo, 0, 100000); if (bc !== undefined) d.bestCombo = bc;
  if (typeof v.matchBest === 'number' && Number.isFinite(v.matchBest) && v.matchBest >= 0) d.matchBest = v.matchBest;
  if (isObj(v.lessons)) { const ls = lessons(v.lessons); if (Object.keys(ls).length) d.lessons = ls; }
  const ach = strs(v.achievements, 500); if (ach.length) d.achievements = ach;
  const ma = strs(v.missedAdd); if (ma.length) d.missedAdd = ma;
  const md = strs(v.missedDel); if (md.length) d.missedDel = md;
  if (isObj(v.day) && day(v.day.today)) d.day = { today: day(v.day.today)!, todayXp: int(v.day.todayXp, -1e6, maxXp) ?? 0 };
  if (isObj(v.streak)) d.streak = { streak: int(v.streak.streak, 0, 10000) ?? 0, lastDay: day(v.streak.lastDay) };
  const goal = int(v.dailyGoal, 1, 10000); if (goal !== undefined) d.dailyGoal = goal;
  if (isObj(v.settings) && typeof v.settings.sound === 'boolean') d.settings = { sound: v.settings.sound };
  return d;
}
