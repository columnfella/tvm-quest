// Tiny storage layer. The whole "database" is one hash per weekly season:
//
//   key   <courseId>:<seasonId>    e.g. fin3301:2026-11-23   (courseId comes from content/course.json)
//   field <lowercase username>
//   value JSON UserRecord
//
// A new week means a new key, so everything starts empty. Old keys expire on their own (TTL).
// Production: Upstash Redis over its REST API (set UPSTASH_REDIS_REST_URL/TOKEN or Vercel's KV_REST_API_URL/TOKEN).
// Local dev with no env vars: a JSON file in .data/ that is wiped when the season changes.
import { promises as fs } from 'fs';
import path from 'path';
import { courseId } from './content';
import { seasonEnd, seasonId } from './season';

export type UserRecord = {
  name: string; // display name, original casing
  avatar: string;
  token: string; // secret kept in the player's browser; required to save progress
  xp: number;
  level: number;
  streak: number;
  state: unknown; // the player's game state blob
  joinedAt: number;
  updatedAt: number;
};

interface Store {
  get(name: string): Promise<UserRecord | null>;
  /** Creates the user only if the name is free. Returns false when taken. */
  create(name: string, rec: UserRecord): Promise<boolean>;
  put(name: string, rec: UserRecord): Promise<void>;
  all(): Promise<UserRecord[]>;
}

const COURSE = courseId();
const key = () => `${COURSE}:${seasonId()}`;

// ---------- Upstash Redis (REST) ----------
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis<T = unknown>(...cmd: (string | number)[]): Promise<T> {
  const res = await fetch(REDIS_URL!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
    cache: 'no-store',
  });
  const json = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || json.error) throw new Error(`Redis: ${json.error ?? res.status}`);
  return json.result as T;
}

const redisStore: Store = {
  async get(name) {
    const v = await redis<string | null>('HGET', key(), name);
    return v ? (JSON.parse(v) as UserRecord) : null;
  },
  async create(name, rec) {
    const k = key();
    const ok = await redis<number>('HSETNX', k, name, JSON.stringify(rec));
    // keep the data one extra day after the season ends, then Redis deletes it
    await redis('EXPIREAT', k, Math.floor(seasonEnd() / 1000) + 86400);
    return ok === 1;
  },
  async put(name, rec) {
    await redis('HSET', key(), name, JSON.stringify(rec));
  },
  async all() {
    const flat = await redis<string[]>('HGETALL', key());
    const out: UserRecord[] = [];
    for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]) as UserRecord);
    return out;
  },
};

// ---------- local JSON file (dev) ----------
type FileDb = { season: string; users: Record<string, UserRecord> };
const FILE = path.join(process.cwd(), '.data', 'db.json');
let memory: FileDb | null = null; // fallback when the disk is read-only

async function readFile(): Promise<FileDb> {
  let db: FileDb = memory ?? { season: seasonId(), users: {} };
  try {
    db = JSON.parse(await fs.readFile(FILE, 'utf8')) as FileDb;
  } catch { /* no file yet */ }
  if (db.season !== seasonId()) db = { season: seasonId(), users: {} }; // weekly wipe
  return db;
}

async function writeFile(db: FileDb) {
  memory = db;
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(db, null, 1));
  } catch { /* read-only host: keep it in memory */ }
}

let chain: Promise<unknown> = Promise.resolve(); // serialise file writes
const locked = <T>(fn: () => Promise<T>): Promise<T> => {
  const p = chain.then(fn, fn);
  chain = p.catch(() => undefined);
  return p;
};

const fileStore: Store = {
  get: async (name) => (await readFile()).users[name] ?? null,
  create: (name, rec) =>
    locked(async () => {
      const db = await readFile();
      if (db.users[name]) return false;
      db.users[name] = rec;
      await writeFile(db);
      return true;
    }),
  put: (name, rec) =>
    locked(async () => {
      const db = await readFile();
      db.users[name] = rec;
      await writeFile(db);
    }),
  all: async () => Object.values((await readFile()).users),
};

if (!(REDIS_URL && REDIS_TOKEN) && process.env.VERCEL) {
  console.error('[db] No Upstash Redis env vars found. On Vercel the file store is NOT persistent: connect "Upstash for Redis" in Storage and redeploy.');
}
export const db: Store = REDIS_URL && REDIS_TOKEN ? redisStore : fileStore;
export const dbKind = REDIS_URL && REDIS_TOKEN ? 'redis' : 'file';

// ---------- device link codes (short-lived, single use) ----------
// key <courseId>:link:<CODE> → lowercase username, expires after LINK_TTL seconds.
// Claims are rate-limited per IP so codes can't be guessed by brute force.
export const LINK_TTL = 600;
const linkKey = (code: string) => `${COURSE}:link:${code}`;
const memLinks = new Map<string, { name: string; exp: number }>(); // file-store mode (dev)
const memHits = new Map<string, { n: number; exp: number }>();

/** Stores a code for `name`. Returns false if the code already exists (caller picks another). */
export async function putLink(code: string, name: string): Promise<boolean> {
  if (dbKind === 'redis') return (await redis<string | null>('SET', linkKey(code), name, 'NX', 'EX', LINK_TTL)) === 'OK';
  if (memLinks.has(code) && memLinks.get(code)!.exp > Date.now()) return false;
  memLinks.set(code, { name, exp: Date.now() + LINK_TTL * 1000 });
  return true;
}

/** Reads and deletes a code in one step (a code works once). */
export async function takeLink(code: string): Promise<string | null> {
  if (dbKind === 'redis') return redis<string | null>('GETDEL', linkKey(code));
  const v = memLinks.get(code);
  memLinks.delete(code);
  return v && v.exp > Date.now() ? v.name : null;
}

// Only FAILED attempts count, so many students behind one campus IP can all link their devices.
/** True when `who` already has `limit` or more failed attempts in the current window. */
export async function tooManyFailures(who: string, limit: number): Promise<boolean> {
  const k = `${COURSE}:rl:${who}`;
  if (dbKind === 'redis') return Number((await redis<string | null>('GET', k)) ?? 0) >= limit;
  const h = memHits.get(k);
  return !!h && h.exp > Date.now() && h.n >= limit;
}

/** Records one failed attempt; the window starts at the first failure. */
export async function recordFailure(who: string, windowSec: number): Promise<void> {
  const k = `${COURSE}:rl:${who}`;
  if (dbKind === 'redis') {
    if ((await redis<number>('INCR', k)) === 1) await redis('EXPIRE', k, windowSec);
    return;
  }
  const now = Date.now();
  const h = memHits.get(k);
  if (!h || h.exp < now) memHits.set(k, { n: 1, exp: now + windowSec * 1000 });
  else h.n++;
}
