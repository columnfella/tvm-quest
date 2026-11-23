// Loads /content/course.json and every /content/chapters/*.json into one validated Course.
// It's forgiving on purpose: a bad question or chapter is skipped and reported in `course.issues`
// (shown in Settings and in the server log) instead of crashing the app.
// See content/README.md for the file format.
import fs from 'fs';
import path from 'path';
import type { Chapter, Coach, Course, Difficulty, Hint, Lesson, Pair, Question, Section } from './course';

const ROOT = path.join(process.cwd(), 'content');
const ASSETS = path.join(process.cwd(), 'public', 'assets');

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, d = '') => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : d);
const num = (v: unknown, d: number) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : d);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';

const DEFAULT_DIFFS: Record<string, Difficulty> = {
  easy: { label: 'Easy', xp: 10, color: '#3ddc4a' },
  medium: { label: 'Medium', xp: 15, color: '#2fb8ff' },
  hard: { label: 'Hard', xp: 25, color: '#ff5a3c' },
};
const DIFF_ALIASES: Record<string, string> = { e: 'easy', '1': 'easy', m: 'medium', '2': 'medium', med: 'medium', t: 'hard', h: 'hard', tough: 'hard', '3': 'hard' };
const PALETTE = ['#a855f7', '#14b8a6', '#f59e0b', '#3b82f6', '#ec4899', '#22c55e', '#ef4444', '#06b6d4'];

function readJson(file: string, issues: string[]): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    issues.push(`${path.relative(process.cwd(), file)}: ${(e as Error).message}`);
    return null;
  }
}

const assetCache = new Map<string, boolean>();
function asset(name: string, fallback: string, where: string, issues: string[]) {
  if (!name) return fallback;
  if (!assetCache.has(name)) assetCache.set(name, fs.existsSync(path.join(ASSETS, name)));
  if (assetCache.get(name)) return name;
  issues.push(`${where}: icon "${name}" not found in public/assets, using ${fallback}`);
  return fallback;
}

function parseHint(v: unknown): Hint | null {
  if (typeof v === 'string' && v.trim()) return { title: 'Hint', lines: [v.trim()], topics: [] };
  if (!isObj(v)) return null;
  const lines = Array.isArray(v.lines) ? v.lines.map((l) => str(l)).filter(Boolean) : str(v.text) ? [str(v.text)] : [];
  if (!lines.length) return null;
  const topics = Array.isArray(v.topics) ? v.topics.map((t) => str(t)).filter(Boolean) : v.default ? ['*'] : [];
  return { title: str(v.title, 'Hint'), lines, topics };
}

/** Answer may be a letter ("B"), a 0-based index (1), or the exact text of the right choice. */
function parseAnswer(v: unknown, choices: string[]): number {
  if (typeof v === 'number' && Number.isInteger(v)) return v >= 0 && v < choices.length ? v : -1;
  const s = str(v);
  if (/^[A-Za-z]$/.test(s)) {
    const i = s.toUpperCase().charCodeAt(0) - 65;
    return i < choices.length ? i : -1;
  }
  return choices.findIndex((c) => c.toLowerCase() === s.toLowerCase());
}

/** Question text: a string, or the legacy [{k:'p'|'pre', t}] block list. */
function parseText(v: unknown): string {
  if (Array.isArray(v)) return v.map((b) => (isObj(b) ? (b.k === 'pre' ? '```\n' + str(b.t) + '\n```' : str(b.t)) : str(b))).filter(Boolean).join('\n\n');
  return str(v);
}

function titleFor(qs: Question[]) {
  const counts = new Map<string, number>();
  for (const q of qs) counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (sorted.length > 1 && sorted[1][1] >= 2 && sorted[0][0].length + sorted[1][0].length < 34) return `${sorted[0][0]} & ${sorted[1][0]}`;
  return sorted[0][0];
}

function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  if (out.length > 1 && out[out.length - 1].length < Math.min(3, size)) out[out.length - 2].push(...out.pop()!);
  return out;
}

function majority(keys: string[]) {
  const c = new Map<string, number>();
  for (const k of keys) c.set(k, (c.get(k) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function loadCourse(): Course {
  const issues: string[] = [];
  const raw = (fs.existsSync(path.join(ROOT, 'course.json')) ? readJson(path.join(ROOT, 'course.json'), issues) : null) ?? {};
  const c = isObj(raw) ? raw : {};

  const difficulties: Record<string, Difficulty> = {};
  if (isObj(c.difficulties)) {
    for (const [k, v] of Object.entries(c.difficulties)) {
      if (!isObj(v)) continue;
      const d = DEFAULT_DIFFS[k];
      difficulties[k] = { label: str(v.label, d?.label ?? k), xp: num(v.xp, d?.xp ?? 10), color: str(v.color, d?.color ?? '#2fb8ff') };
    }
  }
  if (!Object.keys(difficulties).length) Object.assign(difficulties, DEFAULT_DIFFS);
  const diffKeys = Object.keys(difficulties);
  const normDiff = (v: unknown, where: string) => {
    const s = str(v).toLowerCase();
    if (!s) return diffKeys[Math.min(1, diffKeys.length - 1)];
    if (difficulties[s]) return s;
    if (DIFF_ALIASES[s] && difficulties[DIFF_ALIASES[s]]) return DIFF_ALIASES[s];
    issues.push(`${where}: unknown difficulty "${s}", using "${diffKeys[0]}"`);
    return diffKeys[0];
  };

  const lessonSize = Math.round(num(c.lessonSize, 5));
  let coach: Coach | null = null;
  if (isObj(c.coach)) {
    const lines = Array.isArray(c.coach.lines) ? c.coach.lines.map((l) => str(l)).filter(Boolean) : [];
    if (lines.length) coach = { name: str(c.coach.name, 'Coach'), image: asset(str(c.coach.image), 'star-struck_3d.png', 'course.json coach', issues), lines, photo: c.coach.photo === true };
    else issues.push('course.json: coach needs at least one line');
  }
  const mascot = asset(str(c.mascot), 'pig_face_3d.png', 'course.json', issues);
  const questions: Record<string, Question> = {};
  const chapters: Chapter[] = [];
  const usedIds = new Set<string>();

  const dir = path.join(ROOT, 'chapters');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  if (!files.length) issues.push('No chapter files found in content/chapters/');

  files.forEach((file, fileIdx) => {
    const where = `chapters/${file}`;
    const ch = readJson(path.join(dir, file), issues);
    if (!isObj(ch)) {
      if (ch !== null) issues.push(`${where}: must be a JSON object`);
      return;
    }
    let id = slug(str(ch.id) || file.replace(/\.json$/, ''));
    while (usedIds.has(id)) id += '-2';
    usedIds.add(id);

    const number = typeof ch.number === 'number' ? ch.number : null;
    const chSize = Math.round(num(ch.lessonSize, lessonSize));
    const hints = (Array.isArray(ch.hints) ? ch.hints : []).map(parseHint).filter((h): h is Hint => !!h);
    const pairs: Pair[] = (Array.isArray(ch.pairs) ? ch.pairs : [])
      .map((p) => (isObj(p) ? { left: str(p.left ?? p.name ?? p.term), right: str(p.right ?? p.formula ?? p.definition) } : Array.isArray(p) ? { left: str(p[0]), right: str(p[1]) } : null))
      .filter((p): p is Pair => !!p && !!p.left && !!p.right);

    // questions
    const qs: Question[] = [];
    const seen = new Set<string>();
    (Array.isArray(ch.questions) ? ch.questions : []).forEach((rq, i) => {
      const qWhere = `${where} question #${i + 1}`;
      if (!isObj(rq)) return issues.push(`${qWhere}: not an object, skipped`);
      const text = parseText(rq.question ?? rq.stem ?? rq.text);
      const choices = (Array.isArray(rq.choices ?? rq.options ?? rq.opts) ? ((rq.choices ?? rq.options ?? rq.opts) as unknown[]) : []).map((x) => str(x)).filter(Boolean);
      if (!text) return issues.push(`${qWhere}: missing "question" text, skipped`);
      if (choices.length < 2) return issues.push(`${qWhere}: needs at least 2 "choices", skipped`);
      const answer = parseAnswer(rq.answer ?? rq.ans, choices);
      if (answer < 0) return issues.push(`${qWhere}: "answer" ${JSON.stringify(rq.answer ?? rq.ans)} doesn't match a choice, skipped`);
      let qid = str(rq.id) || String(i + 1);
      while (seen.has(qid)) qid += '_';
      seen.add(qid);
      const q: Question = {
        key: `${id}/${qid}`,
        id: qid,
        chapterId: id,
        section: str(rq.section),
        difficulty: normDiff(rq.difficulty ?? rq.diff, qWhere),
        topic: str(rq.topic) || str(rq.section) || str(ch.title, 'General'),
        question: text,
        choices,
        answer,
        explanation: str(rq.explanation ?? rq.solution ?? rq.sol),
        source: str(rq.source),
        hint: parseHint(rq.hint),
        shuffle: rq.shuffle !== false && c.shuffleChoices !== false,
      };
      qs.push(q);
      questions[q.key] = q;
    });

    // sections: listed ones first (in order), then any named in questions, then difficulty groups
    const meta = new Map<string, string>();
    for (const s of Array.isArray(ch.sections) ? ch.sections : []) {
      const name = isObj(s) ? str(s.name) : str(s);
      if (name) meta.set(name, isObj(s) ? str(s.blurb) : '');
    }
    const groups = new Map<string, Question[]>([...meta.keys()].map((n) => [n, []]));
    for (const q of qs) {
      const name = q.section || `${difficulties[q.difficulty].label}`;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(q);
    }
    const sections: Section[] = [];
    for (const [name, list] of groups) {
      if (!list.length) continue;
      const sid = slug(name);
      sections.push({
        id: sid,
        name,
        blurb: meta.get(name) ?? '',
        lessons: chunk(list, chSize).map((group, n) => ({
          id: `${id}/${sid}-${n + 1}`,
          chapterId: id,
          title: titleFor(group),
          kind: 'quiz',
          questionKeys: group.map((q) => q.key),
          difficulty: majority(group.map((q) => q.difficulty)),
        })),
      });
    }
    const pairsTitle = str(ch.pairsTitle, 'Match');
    if (pairs.length >= 4) {
      const lessons: Lesson[] = [{ id: `${id}/match-1`, chapterId: id, title: pairsTitle, kind: 'match', questionKeys: [], difficulty: diffKeys[0], pairCount: Math.min(6, pairs.length) }];
      if (pairs.length >= 7) lessons.push({ id: `${id}/match-2`, chapterId: id, title: `${pairsTitle}: Speed Run`, kind: 'match', questionKeys: [], difficulty: diffKeys[diffKeys.length - 1], pairCount: Math.min(8, pairs.length) });
      sections.push({ id: 'match', name: 'Match Games', blurb: 'Pair each item with its match, fast. Under 30 seconds earns a speed bonus.', lessons });
    } else if (pairs.length) {
      issues.push(`${where}: "pairs" needs at least 4 entries for a match game`);
    }
    if (!qs.length && !pairs.length) {
      issues.push(`${where}: no valid questions, chapter hidden`);
      return;
    }

    chapters.push({
      id,
      number,
      title: str(ch.title, file.replace(/\.json$/, '')),
      tagline: str(ch.tagline),
      icon: asset(str(ch.icon), 'books_3d.png', where, issues),
      color: str(ch.color, PALETTE[fileIdx % PALETTE.length]),
      calculator: ch.calculator === true,
      pairs,
      pairsTitle,
      pairsMono: ch.pairsMono === true,
      hints,
      sections,
      questionKeys: qs.map((q) => q.key),
    });
  });

  chapters.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
  if (issues.length) console.warn(`[content] ${issues.length} issue(s):\n  - ${issues.join('\n  - ')}`);

  return {
    id: slug(str(c.id, 'course')),
    title: str(c.title, 'Quest'),
    subtitle: str(c.subtitle),
    tagline: str(c.tagline),
    mascot,
    lessonSize,
    quickPracticeSize: Math.round(num(c.quickPracticeSize, 10)),
    calculator: c.calculator === true,
    difficulties,
    credits: str(c.credits),
    coach,
    chapters,
    questions,
    issues,
  };
}

/** Just the course id (used to namespace the leaderboard database). */
export function courseId(): string {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'course.json'), 'utf8'));
    return slug(str(c?.id, 'course'));
  } catch {
    return 'course';
  }
}
