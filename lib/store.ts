'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CourseIndex } from './course';
import { seasonId } from './season';
import { apply, dayKey, diff, hydrate, initialState, isEmpty, merge, type GameState } from './state';

export const HINT_COST = 5;

export type { GameState, LessonProgress, Settings } from './state';
export { dayKey, initialState } from './state';

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
export type Profile = { name: string; avatar: string; token: string; season: string; key?: string };
/** Name the account is stored under on the server (differs from the shown name after a moderator rename). */
const apiName = (p: Profile) => p.key ?? p.name;
type MeReply = { state?: Partial<GameState>; user?: { name: string }; notice?: string | null; mustRename?: boolean };

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
  const BKEY = `quest-${course.id}-base`; // last state agreed with the server (see lib/state.ts)
  const achievements = useMemo(() => buildAchievements(course), [course]);

  const [state, setState] = useState<GameState>(initialState);
  const [ready, setReady] = useState(false);
  const [newBadges, setNewBadges] = useState<Achievement[]>([]);
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [auth, setAuth] = useState<AuthStatus>('loading');
  const [notice, setNotice] = useState<string | null>(null); // message from the site owner
  const [mustRename, setMustRename] = useState(false);
  // ---- cross-device sync (algorithm in lib/state.ts) ----
  const stateRef = useRef<GameState>(state); // latest state, readable from async callbacks
  stateRef.current = state;
  const profileRef = useRef<Profile | null>(null);
  profileRef.current = profile;
  const baseRef = useRef<GameState | null>(null); // last state this device and the server agreed on
  const inflight = useRef(false);
  const dirty = useRef(false); // something changed while a request was running
  const resetPending = useRef(false);
  const avatarSent = useRef<string | null>(null);
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
        else { localStorage.removeItem(PKEY); localStorage.removeItem(KEY); localStorage.removeItem(BKEY); }
      } catch { /* storage unavailable */ }
    },
    loadState(): GameState {
      try { return hydrate(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return initialState(); }
    },
    saveState(s: GameState) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* noop */ } },
    loadBase(): GameState | null {
      try { const v = localStorage.getItem(BKEY); return v ? hydrate(JSON.parse(v)) : null; } catch { return null; }
    },
    saveBase(s: GameState | null) {
      try { if (s) localStorage.setItem(BKEY, JSON.stringify(s)); else localStorage.removeItem(BKEY); } catch { /* noop */ }
    },
  }), [KEY, PKEY, BKEY]);

  const setBase = useCallback((s: GameState | null) => { baseRef.current = s; store.saveBase(s); }, [store]);

  const wipe = useCallback((why: AuthStatus) => {
    store.saveProfile(null);
    baseRef.current = null;
    setProfileState(null);
    setState(initialState());
    setAuth(why);
  }, [store]);

  const schedulePush = useRef<(delay?: number) => void>(() => {});

  /** Takes the server's copy, keeping whatever this device changed since the last agreement on top of it. */
  const adopt = useCallback((remote: GameState) => {
    const local = stateRef.current;
    const next = rollDay(baseRef.current ? apply(remote, diff(baseRef.current, local)) : merge(remote, local));
    setBase(remote);
    if (JSON.stringify(next) !== JSON.stringify(local)) { stateRef.current = next; setState(next); }
    if (!isEmpty(diff(remote, next))) schedulePush.current(300); // this device has progress the server lacks
  }, [setBase]);

  /** Fetches the server's copy and adopts it. Skipped while a save is running (its reply carries the same). */
  const pull = useCallback(async () => {
    const p = profileRef.current;
    if (!p || inflight.current) return;
    try {
      const r = await post<MeReply>('/api/me', { name: apiName(p), token: p.token });
      if (profileRef.current?.token !== p.token || apiName(profileRef.current) !== apiName(p) || inflight.current) return;
      if (r.status === 404) return wipe('wiped');
      if (!r.ok) return;
      adopt(r.data.state ? hydrate(r.data.state) : { ...initialState(), today: stateRef.current.today });
    } catch { /* offline */ }
  }, [adopt, wipe]);

  /** Sends what changed since the last agreement and adopts the merged reply. One request at a time. */
  const push = useCallback(async () => {
    const p = profileRef.current;
    if (!p) return;
    if (inflight.current) { dirty.current = true; return; }
    if (!baseRef.current) return void pull(); // first sync on this device: pull (join), which then pushes
    const sent = stateRef.current;
    const delta = resetPending.current ? { reset: sent } : diff(baseRef.current, sent);
    if (isEmpty(delta) && avatarSent.current === p.avatar) return;
    inflight.current = true;
    dirty.current = false;
    const wasReset = resetPending.current;
    try {
      const r = await post<{ state?: unknown }>('/api/sync', { name: apiName(p), token: p.token, avatar: p.avatar, delta });
      if (profileRef.current?.token !== p.token || apiName(profileRef.current) !== apiName(p)) return;
      if (r.status === 404) return wipe('wiped');
      if (!r.ok || !r.data.state) return; // server error: retried on the next change or tick
      if (wasReset) resetPending.current = false;
      avatarSent.current = p.avatar;
      const merged = hydrate(r.data.state);
      const now = stateRef.current;
      const next = rollDay(apply(merged, diff(sent, now))); // re-apply what changed during the request
      setBase(merged);
      if (JSON.stringify(next) !== JSON.stringify(now)) { stateRef.current = next; setState(next); }
      if (!isEmpty(diff(merged, next))) dirty.current = true;
    } catch { /* offline: retried later */ } finally {
      inflight.current = false;
      if (dirty.current) schedulePush.current(400);
    }
  }, [pull, setBase, wipe]);

  schedulePush.current = (delay = 1200) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => { syncTimer.current = null; void push(); }, delay);
  };

  useEffect(() => {
    const had = store.hasProfile();
    const p = store.loadProfile();
    if (!p) {
      if (had) wipe('wiped'); else setAuth('guest');
      setReady(true);
      return;
    }
    const local = rollDay(store.loadState());
    baseRef.current = store.loadBase();
    stateRef.current = local;
    profileRef.current = p;
    setProfileState(p);
    setState(local);
    setReady(true);
    // confirm the account still exists on the server and merge in progress from the player's other devices
    post<MeReply>('/api/me', { name: apiName(p), token: p.token })
      .then((r) => {
        if (r.status === 404) return wipe('wiped');
        if (r.ok) {
          adopt(r.data.state ? hydrate(r.data.state) : { ...initialState(), today: local.today });
          // the shown name was changed on the server (moderation): show it, keep using the stored key
          if (r.data.user && r.data.user.name !== p.name) {
            const np: Profile = { ...p, name: r.data.user.name, key: apiName(p) };
            store.saveProfile(np);
            setProfileState(np);
          }
          setNotice(r.data.notice || null);
          setMustRename(!!r.data.mustRename);
        }
        setAuth('in');
      })
      .catch(() => setAuth('in')); // offline: keep playing locally
  }, [store, wipe, adopt]);

  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => rollDay(s));
      if (!store.loadProfile() && store.hasProfile()) wipe('wiped'); // season rolled over while open
    }, 30_000);
    return () => clearInterval(id);
  }, [store, wipe]);

  // Pick up progress from the player's other devices: every 15 s while visible, and right away when the tab
  // comes back into view, the window gets focus, or the connection returns (which also retries failed saves).
  useEffect(() => {
    if (!profile) return;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (baseRef.current && !isEmpty(diff(baseRef.current, stateRef.current))) void push(); // unsaved changes first
      else void pull();
    };
    const id = setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [profile, pull, push]);

  // every change is saved on the device at once and sent to the server shortly after (batched)
  useEffect(() => {
    if (!ready || !profile) return;
    store.saveState(state);
    if (!baseRef.current) return; // the first pull sets the base, then pushes
    if (resetPending.current || !isEmpty(diff(baseRef.current, state)) || avatarSent.current !== profile.avatar) schedulePush.current();
  }, [state, ready, profile, store]);

  const register = useCallback(async (name: string, avatar: string): Promise<string | null> => {
    try {
      const r = await post<{ token?: string; error?: string }>('/api/register', { name, avatar });
      if (!r.ok || !r.data.token) return r.data.error ?? 'Something went wrong';
      const p: Profile = { name: name.trim(), avatar, token: r.data.token, season: seasonId() };
      const fresh = initialState();
      store.saveProfile(p);
      setBase(fresh);
      avatarSent.current = avatar;
      stateRef.current = fresh;
      setState(fresh);
      setProfileState(p);
      setAuth('in');
      return null;
    } catch {
      return 'Cannot reach the server';
    }
  }, [store, setBase]);

  /** Signs this device in to the account that created a link code (from another device). */
  const linkDevice = useCallback(async (code: string): Promise<string | null> => {
    try {
      const r = await post<{ token?: string; key?: string; user?: { name: string; avatar: string }; state?: Partial<GameState>; error?: string }>('/api/link/claim', { code });
      if (!r.ok || !r.data.token || !r.data.user) return r.data.error ?? 'Something went wrong';
      const p: Profile = { name: r.data.user.name, avatar: r.data.user.avatar, token: r.data.token, season: seasonId() };
      if (r.data.key && r.data.key !== r.data.user.name.toLowerCase()) p.key = r.data.key;
      const st = rollDay(hydrate(r.data.state));
      store.saveProfile(p);
      store.saveState(st);
      setBase(hydrate(r.data.state));
      avatarSent.current = p.avatar;
      stateRef.current = st;
      setState(st);
      setProfileState(p);
      setAuth('in');
      return null;
    } catch {
      return 'Cannot reach the server';
    }
  }, [store, setBase]);

  /** Creates a one-time code (valid 10 minutes) that lets another device sign in to this account. */
  const createLink = useCallback(async (): Promise<{ code: string; expiresAt: number } | { error: string }> => {
    if (!profile) return { error: 'Not signed in' };
    try {
      const r = await post<{ code?: string; expiresAt?: number; error?: string }>('/api/link', { name: apiName(profile), token: profile.token });
      if (r.status === 404) { wipe('wiped'); return { error: 'This season ended' }; }
      if (!r.ok || !r.data.code || !r.data.expiresAt) return { error: r.data.error ?? 'Something went wrong' };
      return { code: r.data.code, expiresAt: r.data.expiresAt };
    } catch {
      return { error: 'Cannot reach the server' };
    }
  }, [profile, wipe]);

  /** Renames the account; progress, token and rank stay the same. */
  const rename = useCallback(async (newName: string): Promise<string | null> => {
    if (!profile) return 'Not signed in';
    if (syncTimer.current) clearTimeout(syncTimer.current); // a queued save would still use the old name
    try {
      const r = await post<{ user?: { name: string }; error?: string }>('/api/rename', { name: apiName(profile), token: profile.token, newName: newName.trim() });
      if (r.status === 404) { wipe('wiped'); return 'This season ended'; }
      if (!r.ok || !r.data.user) return r.data.error ?? 'Something went wrong';
      const np: Profile = { name: r.data.user.name, avatar: profile.avatar, token: profile.token, season: profile.season };
      store.saveProfile(np);
      profileRef.current = np;
      setProfileState(np);
      setMustRename(false);
      schedulePush.current(300);
      return null;
    } catch {
      return 'Cannot reach the server';
    }
  }, [profile, store, wipe]);

  /** Marks the site owner's notice as seen. */
  const ackNotice = useCallback(() => {
    setNotice(null);
    if (profile) post('/api/notice', { name: apiName(profile), token: profile.token }).catch(() => { /* retried next load */ });
  }, [profile]);

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
  const reset = useCallback(() => { resetPending.current = true; setState((s) => ({ ...initialState(), settings: s.settings })); }, []);

  return { state, ready, update, newBadges, dismissBadge, reset, profile, auth, register, linkDevice, createLink, rename, notice, mustRename, ackNotice, setAvatar, achievements };
}

export type Game = ReturnType<typeof useGame>;
