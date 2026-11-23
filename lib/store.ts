'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CourseIndex } from './course';
import { seasonId } from './season';

export const HINT_COST = 5;

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

/** Merge a saved (possibly older/partial) state over the defaults so new fields never break old saves. */
function hydrate(parsed: Partial<GameState> | null | undefined): GameState {
  const base = initialState();
  if (!parsed || typeof parsed !== 'object') return base;
  return {
    ...base,
    ...parsed,
    lessons: parsed.lessons && typeof parsed.lessons === 'object' ? parsed.lessons : {},
    missed: Array.isArray(parsed.missed) ? parsed.missed : [],
    achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    stats: { ...base.stats, ...parsed.stats },
    settings: { ...base.settings, ...parsed.settings },
  };
}

function rollDay(s: GameState): GameState {
  const t = dayKey();
  return s.today === t ? s : { ...s, today: t, todayXp: 0 };
}

export function completeDay(s: GameState): GameState {
  const t = dayKey();
  if (s.lastDay === t) return s;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return { ...s, streak: s.lastDay === dayKey(y) ? s.streak + 1 : 1, lastDay: t };
}

// ---------- levels ----------
export function levelInfo(xp: number) {
  // level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000…
  let n = 1;
  while (50 * (n + 1) * n <= xp) n++;
  const start = 50 * n * (n - 1);
  const next = 50 * (n + 1) * n;
  return { level: n, into: xp - start, span: next - start };
}

// ---------- achievements (generic + one per chapter, generated from the course) ----------
export type Achievement = { id: string; name: string; desc: string; icon: string; test: (s: GameState) => boolean };

export function buildAchievements(course: CourseIndex): Achievement[] {
  const done = (s: GameState, ids: string[]) => ids.length > 0 && ids.every((id) => s.lessons[id]?.done);
  return [
    { id: 'first', name: 'First Clear', desc: 'Finish your first lesson', icon: 'coin_3d.png', test: (s) => Object.values(s.lessons).some((l) => l.done) },
    { id: 'combo5', name: 'On Fire', desc: 'Hit a 5-answer combo', icon: 'fire_3d.png', test: (s) => s.stats.bestCombo >= 5 },
    { id: 'combo10', name: 'Unstoppable', desc: 'Hit a 10-answer combo', icon: 'high_voltage_3d.png', test: (s) => s.stats.bestCombo >= 10 },
    { id: 'perfect', name: 'Flawless', desc: 'Finish a lesson with no mistakes', icon: 'hundred_points_3d.png', test: (s) => s.stats.perfect >= 1 },
    { id: 'speed', name: 'Speed Demon', desc: 'Clear a match game in under 30 s', icon: 'rocket_3d.png', test: (s) => s.stats.matchBest !== null && s.stats.matchBest < 30 },
    { id: 'century', name: 'Century', desc: 'Answer 100 questions correctly', icon: 'sports_medal_3d.png', test: (s) => s.stats.correct >= 100 },
    { id: 'xp1000', name: 'Four Figures', desc: 'Earn 1,000 XP', icon: 'money_bag_3d.png', test: (s) => s.xp >= 1000 },
    { id: 'streak3', name: 'Habit Forming', desc: 'Keep a 3-day streak', icon: 'glowing_star_3d.png', test: (s) => s.streak >= 3 },
    ...course.chapters.map((c) => ({
      id: `ch:${c.id}`,
      name: c.number !== null ? `Chapter ${c.number} Cleared` : `${c.title} Cleared`,
      desc: `Finish every lesson in ${c.title}`,
      icon: c.icon,
      test: (s: GameState) => done(s, c.sections.flatMap((x) => x.lessons.map((l) => l.id))),
    })),
    { id: 'all', name: 'Grand Master', desc: 'Finish every lesson in the course', icon: 'crown_3d.png', test: (s) => done(s, course.allLessons.map((l) => l.id)) },
  ];
}

// ---------- profile (server account) ----------
export type Profile = { name: string; avatar: string; token: string; season: string };

async function post<T>(url: string, data: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

/** 'loading' until we know whether the saved account still exists; 'wiped' = a new season started. */
export type AuthStatus = 'loading' | 'guest' | 'wiped' | 'in';

// ---------- hook ----------
export function useGame(course: CourseIndex) {
  const KEY = `quest-${course.id}-state`;
  const PKEY = `quest-${course.id}-profile`;
  const achievements = useMemo(() => buildAchievements(course), [course]);

  const [state, setState] = useState<GameState>(initialState);
  const [ready, setReady] = useState(false);
  const [newBadges, setNewBadges] = useState<Achievement[]>([]);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [auth, setAuth] = useState<AuthStatus>('loading');
  const skipSave = useRef(true);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const store = useMemo(() => ({
    loadProfile(): Profile | null {
      try {
        const p = JSON.parse(localStorage.getItem(PKEY) || 'null') as Profile | null;
        return p && p.season === seasonId() ? p : null; // last week's account is gone
      } catch { return null; }
    },
    hasProfile: () => { try { return !!localStorage.getItem(PKEY); } catch { return false; } },
    saveProfile(p: Profile | null) {
      try {
        if (p) localStorage.setItem(PKEY, JSON.stringify(p));
        else { localStorage.removeItem(PKEY); localStorage.removeItem(KEY); }
      } catch { /* storage unavailable */ }
    },
    loadState(): GameState {
      try { return hydrate(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return initialState(); }
    },
    saveState(s: GameState) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ } },
  }), [KEY, PKEY]);

  const wipe = useCallback((why: AuthStatus) => {
    store.saveProfile(null);
    setProfileState(null);
    setState(initialState());
    setAuth(why);
  }, [store]);

  useEffect(() => {
    const had = store.hasProfile();
    const p = store.loadProfile();
    if (!p) {
      if (had) wipe('wiped'); else setAuth('guest');
      setReady(true);
      return;
    }
    const local = rollDay(store.loadState());
    setProfileState(p);
    setState(local);
    setReady(true);
    // confirm the account still exists on the server and pick up progress from other tabs
    post<{ state?: Partial<GameState> }>('/api/me', { name: p.name, token: p.token })
      .then((r) => {
        if (r.status === 404) return wipe('wiped');
        if (r.ok && r.data.state && (r.data.state.xp ?? 0) > local.xp) setState(rollDay(hydrate(r.data.state)));
        setAuth('in');
      })
      .catch(() => setAuth('in')); // offline: keep playing locally
  }, [store, wipe]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => rollDay(s));
      if (!store.loadProfile() && store.hasProfile()) wipe('wiped'); // season rolled over while open
    }, 30_000);
    return () => clearInterval(id);
  }, [store, wipe]);

  useEffect(() => {
    if (!ready || !profile) return;
    if (skipSave.current) { skipSave.current = false; return; }
    store.saveState(state);
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      post('/api/sync', { name: profile.name, token: profile.token, avatar: profile.avatar, xp: state.xp, level: levelInfo(state.xp).level, streak: state.streak, state })
        .then((r) => { if (r.status === 404) wipe('wiped'); })
        .catch(() => { /* offline: the next change retries */ });
    }, 1200);
  }, [state, ready, profile, wipe, store]);

  const register = useCallback(async (name: string, avatar: string): Promise<string | null> => {
    try {
      const r = await post<{ token?: string; error?: string }>('/api/register', { name, avatar });
      if (!r.ok || !r.data.token) return r.data.error ?? 'Something went wrong';
      const p: Profile = { name: name.trim(), avatar, token: r.data.token, season: seasonId() };
      store.saveProfile(p);
      skipSave.current = true;
      setState(initialState());
      setProfileState(p);
      setAuth('in');
      return null;
    } catch {
      return 'Cannot reach the server';
    }
  }, [store]);

  const setAvatar = useCallback((avatar: string) => {
    setProfileState((p) => {
      if (!p) return p;
      const np = { ...p, avatar };
      store.saveProfile(np);
      return np;
    });
    setState((s) => ({ ...s })); // trigger a sync
  }, [store]);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => {
      const next = fn(prev);
      const got = achievements.filter((a) => !next.achievements.includes(a.id) && a.test(next));
      if (!got.length) return next;
      setTimeout(() => setNewBadges((b) => [...b, ...got]), 0);
      return { ...next, achievements: [...next.achievements, ...got.map((a) => a.id)] };
    });
  }, [achievements]);

  const dismissBadge = useCallback(() => setNewBadges((b) => b.slice(1)), []);
  const reset = useCallback(() => setState((s) => ({ ...initialState(), settings: s.settings })), []);

  return { state, ready, update, newBadges, dismissBadge, reset, profile, auth, register, setAvatar, achievements };
}

export type Game = ReturnType<typeof useGame>;
