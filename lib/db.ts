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
