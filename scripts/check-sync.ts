// Checks the cross-device sync algorithm (lib/state.ts) with simulated devices and a simulated server.
// Run: npm run test:math
import assert from 'node:assert/strict';
import { apply, cleanDelta, dayCmp, diff, hydrate, initialState, isEmpty, merge, type GameState } from '../lib/state.ts';

let n = 0;
const eq = (a: unknown, b: unknown, label: string) => { n++; assert.deepEqual(a, b, label); };
const ok = (c: boolean, label: string) => { n++; assert.ok(c, label); };

/** A server and devices that talk to it exactly like lib/store.ts and app/api/sync do. */
class Server {
  state = initialState();
  sync(delta: unknown) { const d = cleanDelta(JSON.parse(JSON.stringify(delta)), 1500)!; this.state = apply(this.state, d); return structuredClone(this.state); }
}
class Device {
  srv: Server; local: GameState; base: GameState | null;
  constructor(srv: Server, local = initialState(), base: GameState | null = null) { this.srv = srv; this.local = local; this.base = base; }
  play(fn: (s: GameState) => GameState) { this.local = fn(structuredClone(this.local)); }
  pull() {
    const remote = structuredClone(this.srv.state);
    this.local = this.base ? apply(remote, diff(this.base, this.local)) : merge(remote, this.local);
    this.base = remote;
  }
  push() {
    if (!this.base) this.pull();
    const sent = structuredClone(this.local);
    const d = diff(this.base!, sent);
    if (isEmpty(d)) return;
    const merged = this.srv.sync(d);
    this.local = apply(merged, diff(sent, this.local)); // nothing changed in flight here
    this.base = merged;
  }
}
const finish = (id: string, xp: number, stars = 3) => (s: GameState): GameState => ({
  ...s, xp: s.xp + xp, todayXp: s.todayXp + xp, gems: s.gems + 15,
  lessons: { ...s.lessons, [id]: { done: true, stars, bestAcc: 1, plays: (s.lessons[id]?.plays ?? 0) + 1 } },
  stats: { ...s.stats, correct: s.stats.correct + 5, answered: s.stats.answered + 5 },
});

// 1. the reported bug: laptop finishes a lesson, phone (stale) saves something unrelated → lesson must survive
{
  const srv = new Server();
  const laptop = new Device(srv), phone = new Device(srv);
  laptop.pull(); phone.pull();
  laptop.play(finish('learn:07/zero-growth', 60)); laptop.push();
  phone.play((s) => ({ ...s, gems: s.gems - 5 })); phone.push(); // bought a hint with an old copy
  ok(!!srv.state.lessons['learn:07/zero-growth']?.done, 'lesson kept after a stale device saves');
  eq(srv.state.xp, 60, 'XP kept');
  eq(srv.state.gems, 50 + 15 - 5, 'coins: earned on one device, spent on the other');
  phone.pull();
  ok(!!phone.local.lessons['learn:07/zero-growth']?.done, 'phone shows the lesson after pulling');
  eq(phone.local, srv.state, 'phone equals server after pull');
}
// 2. both devices play at the same time (offline), then sync → both lessons and the sum of XP
{
  const srv = new Server();
  const a = new Device(srv), b = new Device(srv);
  a.pull(); b.pull();
  a.play(finish('L1', 40)); b.play(finish('L2', 70));
  a.push(); b.push(); a.pull();
  eq(srv.state.xp, 110, 'concurrent XP adds up');
  eq(Object.keys(srv.state.lessons).sort(), ['L1', 'L2'], 'both lessons');
  eq(srv.state.stats.answered, 10, 'answered adds up');
  eq(a.local, b.local, 'devices converge');
  eq(srv.state.todayXp, 110, 'today XP adds up');
}
// 3. changes made while a save is in flight are not lost
{
  const srv = new Server();
  const a = new Device(srv); a.pull();
  a.play(finish('L1', 40));
  const sent = structuredClone(a.local);
  const merged = srv.sync(diff(a.base!, sent));
  a.play(finish('L2', 20)); // during the request
  a.local = apply(merged, diff(sent, a.local)); a.base = merged;
  ok(!!a.local.lessons.L2 && a.local.xp === 60, 'in-flight change kept locally');
  a.push();
  eq(srv.state.xp, 60, 'and saved next time');
}
// 4. replaying a lesson: best stars win, plays and accuracy never go down
{
  const srv = new Server();
  const a = new Device(srv), b = new Device(srv); a.pull(); b.pull();
  a.play(finish('L1', 60, 3)); a.push();
  b.play(finish('L1', 40, 1)); b.push();
  eq(srv.state.lessons.L1.stars, 3, 'best stars kept');
  ok(srv.state.lessons.L1.done, 'done stays done');
}
// 5. missed questions: added on one device, fixed on another
{
  const srv = new Server();
  const a = new Device(srv), b = new Device(srv); a.pull(); b.pull();
  a.play((s) => ({ ...s, missed: [...s.missed, 'q1', 'q2'] })); a.push(); b.pull();
  b.play((s) => ({ ...s, missed: s.missed.filter((q) => q !== 'q1') })); b.push();
  a.play((s) => ({ ...s, missed: [...s.missed, 'q3'] })); a.push();
  eq(srv.state.missed.sort(), ['q2', 'q3'], 'missed: removals and additions both applied');
}
// 6. first sync after the update: no base on the device → join, nothing lost on either side
{
  const srv = new Server();
  srv.state = { ...initialState(), xp: 100, lessons: { L1: { done: true, stars: 2, bestAcc: 0.8, plays: 1 } }, achievements: ['first'] };
  const old = new Device(srv, { ...initialState(), xp: 90, lessons: { L2: { done: true, stars: 3, bestAcc: 1, plays: 2 } }, achievements: ['combo5'] });
  old.push();
  eq(Object.keys(srv.state.lessons).sort(), ['L1', 'L2'], 'join keeps both devices\' lessons');
  eq(srv.state.achievements.sort(), ['combo5', 'first'], 'join keeps badges');
  eq(srv.state.xp, 100, 'join keeps the higher XP');
}
// 7. day roll-over and streaks
{
  const srv = new Server();
  srv.state = { ...initialState(), today: '2026-11-23', todayXp: 80, streak: 4, lastDay: '2026-11-23' };
  const a = new Device(srv); a.pull();
  a.play((s) => ({ ...s, today: '2026-11-24', todayXp: 30, xp: s.xp + 30, streak: 5, lastDay: '2026-11-24' })); a.push();
  eq([srv.state.today, srv.state.todayXp, srv.state.streak], ['2026-11-24', 30, 5], 'new day resets today XP and extends the streak');
  // a device still on yesterday syncs late: does not touch today's counter or the streak
  const late = new Device(srv, { ...srv.state, today: '2026-11-23', todayXp: 0, streak: 4, lastDay: '2026-11-23' }, { ...srv.state, today: '2026-11-23', todayXp: 0, streak: 4, lastDay: '2026-11-23' });
  late.play((s) => ({ ...s, todayXp: 10, xp: s.xp + 10 })); late.push();
  eq([srv.state.today, srv.state.todayXp, srv.state.streak, srv.state.xp], ['2026-11-24', 30, 5, 40], 'late device: XP counted, today and streak untouched');
  ok(dayCmp('2026-11-10', '2026-11-9') > 0, 'day keys compare as dates, not strings');
}
// 8. settings and goal: last change wins; reset replaces everything
{
  const srv = new Server();
  const a = new Device(srv); a.pull();
  a.play((s) => ({ ...s, dailyGoal: 100, settings: { sound: false } })); a.push();
  eq([srv.state.dailyGoal, srv.state.settings.sound], [100, false], 'settings synced');
  a.play(finish('L1', 50)); a.push();
  srv.sync({ reset: initialState() });
  eq(srv.state.xp, 0, 'reset replaces');
}
// 9. hostile input
{
  const d = cleanDelta({ xp: 1e9, gems: 'x', lessons: { a: { done: true, stars: 99 } }, missedAdd: [1, 'q'], day: { today: 'nope' } }, 1500)!;
  eq(d.xp, 1500, 'XP per save capped');
  eq(d.gems, undefined, 'bad numbers dropped');
  eq(d.lessons?.a.stars, 3, 'stars clamped');
  eq(d.missedAdd, ['q'], 'non-strings dropped');
  eq(d.day, undefined, 'bad day dropped');
  eq(cleanDelta({ xp: -500 }, 1500)?.xp, undefined, 'XP never goes down through a sync');
  eq(cleanDelta('x', 1500), null, 'non-object rejected');
  eq(hydrate({ xp: -3, lessons: [], stats: { matchBest: 'fast' } }).xp, 0, 'hydrate cleans');
  eq(isEmpty(diff(initialState(), initialState())), true, 'no change, empty delta');
}

console.log(`sync: ${n} checks passed`);
