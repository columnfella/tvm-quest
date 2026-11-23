'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ALL_LESSONS, WORLDS } from './data';
import { seasonId } from './season';

export const MAX_HEARTS = 5;
export const HEART_REGEN_MS = 20 * 60 * 1000;
export const REFILL_COST = 50;
export const HINT_COST = 5;

export type LessonProgress = { done: boolean; stars: number; bestAcc: number; plays: number };
export type Settings = { sound: boolean; freePlay: boolean; unlimitedHearts: boolean };
export type GameState = {
  xp: number;
  gems: number;
  hearts: number;
  heartsAt: number;
  streak: number;
  lastDay: string | null;
  todayXp: number;
  today: string;
  dailyGoal: number;
  lessons: Record<string, LessonProgress>;
  stats: { correct: number; answered: number; bestCombo: number; perfect: number; matchBest: number | null };
  achievements: string[];
  settings: Settings;
};

const KEY = 'tvm-quest-v1';
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export const initialState = (): GameState => ({
  xp: 0,
  gems: 100,
  hearts: MAX_HEARTS,
  heartsAt: Date.now(),
  streak: 0,
  lastDay: null,
  todayXp: 0,
  today: dayKey(),
  dailyGoal: 50,
  lessons: {},
  stats: { correct: 0, answered: 0, bestCombo: 0, perfect: 0, matchBest: null },
  achievements: [],
  settings: { sound: true, freePlay: false, unlimitedHearts: false },
});

function load(): GameState {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return initialState();
    const parsed = JSON.parse(s) as Partial<GameState>;
    const base = initialState();
    return { ...base, ...parsed, stats: { ...base.stats, ...parsed.stats }, settings: { ...base.settings, ...parsed.settings } };
  } catch {
    return initialState();
  }
}

function regen(s: GameState): GameState {
  if (s.hearts >= MAX_HEARTS) return { ...s, heartsAt: Date.now() };
  const gained = Math.floor((Date.now() - s.heartsAt) / HEART_REGEN_MS);
  if (gained <= 0) return s;
  const hearts = Math.min(MAX_HEARTS, s.hearts + gained);
  return { ...s, hearts, heartsAt: hearts >= MAX_HEARTS ? Date.now() : s.heartsAt + gained * HEART_REGEN_MS };
}

function rollDay(s: GameState): GameState {
  const t = dayKey();
  if (s.today === t) return s;
  return { ...s, today: t, todayXp: 0 };
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

// ---------- achievements ----------
export type Achievement = { id: string; name: string; desc: string; icon: string };
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first', name: 'First Deposit', desc: 'Finish your first lesson', icon: 'coin_3d.png' },
  { id: 'combo5', name: 'Compounding', desc: 'Hit a 5-answer combo', icon: 'fire_3d.png' },
  { id: 'combo10', name: 'Exponential', desc: 'Hit a 10-answer combo', icon: 'high_voltage_3d.png' },
  { id: 'perfect', name: 'Flawless Ledger', desc: 'Finish a lesson with no mistakes', icon: 'hundred_points_3d.png' },
  { id: 'theory', name: 'Theorist', desc: 'Complete every Theory lesson', icon: 'graduation_cap_3d.png' },
  { id: 'easy', name: 'Meadow Cleared', desc: 'Complete Seedling Meadow', icon: 'seedling_3d.png' },
  { id: 'medium', name: 'Summit Reached', desc: 'Complete Snowcap Ridge', icon: 'snow-capped_mountain_3d.png' },
  { id: 'tough', name: 'Volcano Tamer', desc: 'Complete Volcano Vault', icon: 'volcano_3d.png' },
  { id: 'speed', name: 'Formula Flash', desc: 'Clear a Formula Match in under 30 s', icon: 'rocket_3d.png' },
  { id: 'century', name: 'Century', desc: 'Answer 100 questions correctly', icon: 'sports_medal_3d.png' },
  { id: 'xp1000', name: 'Four Figures', desc: 'Earn 1,000 XP', icon: 'money_bag_3d.png' },
  { id: 'streak3', name: 'Habit Forming', desc: 'Keep a 3-day streak', icon: 'glowing_star_3d.png' },
  { id: 'all', name: 'Time Lord', desc: 'Complete every lesson in the game', icon: 'crown_3d.png' },
];

function sectionDone(s: GameState, sectionId: string) {
  const sec = WORLDS.flatMap((w) => w.sections).find((x) => x.id === sectionId)!;
  return sec.lessons.every((l) => s.lessons[l.id]?.done);
}

export function earned(s: GameState): string[] {
  const out: string[] = [];
  const doneCount = Object.values(s.lessons).filter((l) => l.done).length;
  if (doneCount >= 1) out.push('first');
  if (s.stats.bestCombo >= 5) out.push('combo5');
  if (s.stats.bestCombo >= 10) out.push('combo10');
  if (s.stats.perfect >= 1) out.push('perfect');
  if (sectionDone(s, 'library')) out.push('theory');
  if (sectionDone(s, 'easy')) out.push('easy');
  if (sectionDone(s, 'medium')) out.push('medium');
  if (sectionDone(s, 'tough')) out.push('tough');
  if (s.stats.matchBest !== null && s.stats.matchBest < 30) out.push('speed');
  if (s.stats.correct >= 100) out.push('century');
  if (s.xp >= 1000) out.push('xp1000');
  if (s.streak >= 3) out.push('streak3');
  if (ALL_LESSONS.every((l) => s.lessons[l.id]?.done)) out.push('all');
  return out;
}

// ---------- profile (server account) ----------
export type Profile = { name: string; avatar: string; token: string; season: string };
const PKEY = 'tvm-quest-profile';

function loadProfile(): Profile | null {
  try {
    const p = JSON.parse(localStorage.getItem(PKEY) || 'null') as Profile | null;
    return p && p.season === seasonId() ? p : null; // last week's account is gone
  } catch {
    return null;
  }
}

function saveProfile(p: Profile | null) {
  try {
    if (p) localStorage.setItem(PKEY, JSON.stringify(p));
    else { localStorage.removeItem(PKEY); localStorage.removeItem(KEY); }
  } catch { /* storage unavailable */ }
}

async function post<T>(url: string, data: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

/** 'loading' until we know whether the saved account still exists; 'wiped' = a new season started. */
export type AuthStatus = 'loading' | 'guest' | 'wiped' | 'in';

// ---------- hook ----------
export function useGame() {
  const [state, setState] = useState<GameState>(initialState);
  const [ready, setReady] = useState(false);
  const [newBadges, setNewBadges] = useState<Achievement[]>([]);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [auth, setAuth] = useState<AuthStatus>('loading');
  const first = useRef(true);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wipe = useCallback((why: AuthStatus) => {
    saveProfile(null);
    setProfileState(null);
    setState(initialState());
    setAuth(why);
  }, []);

  useEffect(() => {
    const hadProfile = !!localStorage.getItem(PKEY);
    const p = loadProfile();
    if (!p) {
      if (hadProfile) wipe('wiped');
      else setAuth('guest');
      setReady(true);
      return;
    }
    const local = rollDay(regen(load()));
    setProfileState(p);
    setState(local);
    setReady(true);
    // confirm the account still exists on the server and pick up progress from other devices/tabs
    post<{ state?: GameState }>('/api/me', { name: p.name, token: p.token })
      .then((r) => {
        if (r.status === 404) return wipe('wiped');
        if (r.ok && r.data.state && (r.data.state as GameState).xp > local.xp) {
          const base = initialState();
          const s = r.data.state;
          setState(rollDay(regen({ ...base, ...s, stats: { ...base.stats, ...s.stats }, settings: { ...base.settings, ...s.settings } })));
        }
        setAuth('in');
      })
      .catch(() => setAuth('in')); // offline: keep playing locally
  }, [wipe]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => rollDay(regen(s)));
      // the season rolled over while the app was open
      const p = loadProfile();
      if (!p && localStorage.getItem(PKEY)) wipe('wiped');
    }, 30_000);
    return () => clearInterval(id);
  }, [wipe]);

  useEffect(() => {
    if (!ready || !profile) return;
    if (first.current) { first.current = false; return; }
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
    // debounce a save to the server
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      post('/api/sync', { name: profile.name, token: profile.token, avatar: profile.avatar, xp: state.xp, level: levelInfo(state.xp).level, streak: state.streak, state })
        .then((r) => { if (r.status === 404) wipe('wiped'); })
        .catch(() => { /* offline: next change retries */ });
    }, 1200);
  }, [state, ready, profile, wipe]);

  const register = useCallback(async (name: string, avatar: string): Promise<string | null> => {
    try {
      const r = await post<{ token?: string; error?: string }>('/api/register', { name, avatar });
      if (!r.ok || !r.data.token) return r.data.error ?? 'Something went wrong';
      const p: Profile = { name: name.trim(), avatar, token: r.data.token, season: seasonId() };
      saveProfile(p);
      try { localStorage.removeItem(KEY); } catch { /* noop */ }
      first.current = true;
      setState(initialState());
      setProfileState(p);
      setAuth('in');
      return null;
    } catch {
      return 'Cannot reach the server';
    }
  }, []);

  const setAvatar = useCallback((avatar: string) => {
    setProfileState((p) => {
      if (!p) return p;
      const np = { ...p, avatar };
      saveProfile(np);
      return np;
    });
    setState((s) => ({ ...s })); // trigger a sync
  }, []);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => {
      const next = fn(prev);
      const got = earned(next).filter((id) => !next.achievements.includes(id));
      if (got.length) {
        const badges = ACHIEVEMENTS.filter((a) => got.includes(a.id));
        setTimeout(() => setNewBadges((b) => [...b, ...badges]), 0);
        return { ...next, achievements: [...next.achievements, ...got] };
      }
      return next;
    });
  }, []);

  const isUnlocked = useCallback(
    (lessonId: string) => {
      if (state.settings.freePlay) return true;
      for (const w of WORLDS) {
        const seq = w.sections.flatMap((s) => s.lessons);
        const idx = seq.findIndex((l) => l.id === lessonId);
        if (idx === -1) continue;
        return idx === 0 || !!state.lessons[seq[idx - 1].id]?.done;
      }
      return false;
    },
    [state.lessons, state.settings.freePlay],
  );

  const dismissBadge = useCallback(() => setNewBadges((b) => b.slice(1)), []);
  const reset = useCallback(() => setState(initialState()), []);

  return { state, ready, update, isUnlocked, newBadges, dismissBadge, reset, profile, auth, register, setAvatar };
}

export function completeDay(s: GameState): GameState {
  const t = dayKey();
  if (s.lastDay === t) return s;
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const streak = s.lastDay === dayKey(y) ? s.streak + 1 : 1;
  return { ...s, streak, lastDay: t };
}
